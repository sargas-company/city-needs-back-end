import { Injectable, Logger } from '@nestjs/common';
import { Vercel } from '@vercel/sdk';

@Injectable()
export class VercelService {
  private readonly log = new Logger(VercelService.name);
  private readonly vercel = new Vercel({
    bearerToken: process.env.VERCEL_API_TOKEN,
  });
  private readonly teamId = process.env.VERCEL_TEAM_ID || undefined;
  private readonly teamSlug = process.env.VERCEL_TEAM_SLUG || undefined;

  private async ensureProjectByName(projectName: string) {
    let list: { projects?: any[] } = { projects: [] };
    try {
      list = await this.vercel.projects.getProjects({
        teamId: this.teamId,
        slug: this.teamSlug,
        limit: '100',
        search: projectName,
      });
    } catch (error: any) {
      if (error?.body && typeof error.body === 'string') {
        try {
          const parsed = JSON.parse(error.body);
          if (parsed.projects || Array.isArray(parsed)) {
            list = { projects: parsed.projects || parsed };
          } else {
            list = { projects: [parsed] };
          }
        } catch (parseError) {
          this.log.error('Failed to parse error body in getProjects', {
            error: parseError,
            method: 'ensureProjectByName',
            service: 'vercel',
          });
          throw error;
        }
      } else {
        throw error;
      }
    }

    const found = list.projects?.find((p: any) => p.name === projectName);
    if (found) return found;

    let created: any;
    try {
      created = await this.vercel.projects.createProject({
        teamId: this.teamId,
        slug: this.teamSlug,
        requestBody: {
          name: projectName,
          framework: 'nextjs',
          ssoProtection: null,
        },
      });
    } catch (error: any) {
      if (error?.body && typeof error.body === 'string') {
        try {
          const parsed = JSON.parse(error.body);
          created = parsed;
        } catch (parseError) {
          this.log.error('Failed to parse error body in createProject', {
            error: parseError,
            method: 'ensureProjectByName',
            service: 'vercel',
          });
          throw error;
        }
      } else {
        throw error;
      }
    }

    return created;
  }

  async createAndCheckDeployment(
    projectId: string,
    projectName: string,
    repositoryName: string,
    branch: string,
    repositoryOwner: string,
    target = 'production',
    is_cloned = false,
  ) {
    try {
      await this.ensureProjectByName(projectId);

      const created = await this.vercel.deployments.createDeployment({
        teamId: this.teamId,
        slug: this.teamSlug,
        requestBody: {
          name: projectId,
          project: projectId,
          target,
          gitSource: {
            type: 'github',
            repo: repositoryName,
            ref: branch,
            org: repositoryOwner,
          },
          projectSettings: {
            framework: is_cloned ? 'create-react-app' : 'nextjs',
            installCommand: 'npm install',
            buildCommand: is_cloned ? 'react-scripts build' : 'next build',
          },
        },
      });

      const immediateUrl = created.url ? `https://${created.url}` : undefined;
      this.log.log(`Vercel deployment created: ${immediateUrl ?? created.id}`);

      const ready = await this.waitForDeploymentReady(created.id, 10 * 60_000);
      const finalUrl = ready.url ? `https://${ready.url}` : immediateUrl;

      let url;
      if (!is_cloned) {
        url = await this.useAlias(ready.id, projectName, projectId);
      }
      this.log.log(`Vercel deployment ready: ${url ?? finalUrl}`);

      return { id: ready.id, url: url ?? finalUrl, projectId: ready?.project?.id };
    } catch (error) {
      this.log.log('error', error);
    }
  }

  public async getAlias(alias: string) {
    try {
      const result = await this.vercel.aliases.getAlias({
        idOrAlias: alias,
      });

      return result;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.status === 404) {
        return null;
      }

      if (error?.body && typeof error.body === 'string') {
        try {
          const parsed = JSON.parse(error.body);
          return parsed;
        } catch (parseError) {
          this.log.error('Failed to parse error body', {
            error: parseError,
            method: 'getAlias',
            service: 'vercel',
            params: { alias },
          });
          throw error;
        }
      }

      this.log.error('getAlias error', {
        error,
        method: 'getAlias',
        service: 'vercel',
        params: { alias },
      });
      throw error;
    }
  }

  private async useAlias(deploymentId: string, projectName: string, projectId: string) {
    try {
      const updatedName = `${projectName
        .replaceAll(' ', '-')
        .replaceAll('.', '-')
        .replaceAll("'", '')
        .toLowerCase()}`;
      let aliasName = `${updatedName}.vercel.app`;
      const response = await this.getAlias(aliasName);
      if (response) {
        aliasName = `webuild-${updatedName}-${projectId.slice(-6)}.vercel.app`;
      }
      const result = await this.vercel.aliases.assignAlias({
        id: deploymentId,
        requestBody: {
          alias: aliasName,
          redirect: null,
        },
      });

      return result.alias;
    } catch (error: any) {
      this.log.error('useAlias error', {
        error,
        method: 'useAlias',
        service: 'vercel',
        params: { deploymentId, projectName, projectId },
      });
      throw error;
    }
  }

  async deleteDeployment(deploymentId: string) {
    try {
      await this.vercel.deployments.deleteDeployment({
        id: deploymentId,
      });
    } catch (error) {
      this.log.log('error', error);
    }
  }

  async promoteToProduction(projectName: string, deploymentId: string) {
    try {
      const promoted = await this.vercel.deployments.createDeployment({
        teamId: this.teamId,
        slug: this.teamSlug,
        requestBody: {
          name: projectName,
          project: projectName,
          target: 'production',
          deploymentId,
        },
      });

      const immediateUrl = promoted.url ? `https://${promoted.url}` : undefined;
      const ready = await this.waitForDeploymentReady(promoted.id, 10 * 60_000);
      const finalUrl = ready.url ? `https://${ready.url}` : immediateUrl;
      this.log.log(`Deployment promoted to production: ${finalUrl ?? promoted.id}`);
      return finalUrl;
    } catch (error) {
      this.log.error(
        error instanceof Error ? `Failed to promote deployment: ${error.message}` : String(error),
      );
      throw error;
    }
  }

  private async waitForDeploymentReady(id: string, timeoutMs: number) {
    const start = Date.now();
    for (;;) {
      const dep = await this.vercel.deployments.getDeployment({
        idOrUrl: id,
        teamId: this.teamId,
        slug: this.teamSlug,
      });

      if (dep.readyState === 'READY') return dep;
      if (dep.readyState === 'ERROR') {
        this.log.error(`Vercel deployment failed:`, dep);
        throw new Error(`Vercel deployment failed: ${dep.readyState}`);
      }
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timed out waiting for Vercel deployment to be READY');
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  async getProjectDomains(projectId: string) {
    try {
      const response = await this.vercel.projects.getProjectDomains({
        idOrName: projectId,
        teamId: this.teamId,
      });
      return response.domains || [];
    } catch (error) {
      this.log.error(`Failed to get domains for project ${projectId}:`, error);
      throw error;
    }
  }

  async addProjectDomain(projectId: string, domain: string) {
    try {
      const response = await this.vercel.projects.addProjectDomain({
        idOrName: projectId,
        teamId: this.teamId,
        requestBody: {
          name: domain,
        },
      });
      return response;
    } catch (error) {
      this.log.error(`Failed to add domain ${domain} to project ${projectId}:`, error);
      throw error;
    }
  }

  async getProjectDomainConfig(projectId: string, domain: string) {
    try {
      const response = await this.vercel.domains.getDomainConfig({
        domain,
        projectIdOrName: projectId,
        teamId: this.teamId,
      });
      return response;
    } catch (error) {
      this.log.error(`Failed to get domain config for ${domain} in project ${projectId}:`, error);
      throw error;
    }
  }

  async removeProjectDomain(projectId: string, domain: string) {
    try {
      await this.vercel.projects.removeProjectDomain({
        idOrName: projectId,
        domain,
        teamId: this.teamId,
      });
      return { success: true };
    } catch (error) {
      this.log.error(`Failed to remove domain ${domain} from project ${projectId}:`, error);
      throw error;
    }
  }

  async createProjectEnvironmentVariable(
    projectId: string,
    key: string,
    value: string,
    environments: ('production' | 'preview' | 'development')[] = [
      'production',
      'preview',
      'development',
    ],
  ) {
    try {
      const response = await this.vercel.projects.createProjectEnv({
        idOrName: projectId,
        teamId: this.teamId,
        requestBody: {
          key,
          value,
          type: 'encrypted',
          target: environments,
        },
      });
      return response;
    } catch (error) {
      this.log.error(
        `Failed to create environment variable ${key} for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  async updateProjectEnvironmentVariable(
    projectId: string,
    envId: string,
    key: string,
    value: string,
    environments: ('production' | 'preview' | 'development')[] = [
      'production',
      'preview',
      'development',
    ],
  ) {
    try {
      const response = await this.vercel.projects.editProjectEnv({
        idOrName: projectId,
        id: envId,
        teamId: this.teamId,
        requestBody: {
          key,
          value,
          type: 'encrypted',
          target: environments,
        },
      });
      return response;
    } catch (error) {
      this.log.error(
        `Failed to update environment variable ${key} for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  async getAllProjects() {
    try {
      const response = await this.vercel.projects.getProjects({
        teamId: this.teamId,
        slug: this.teamSlug,
        limit: '100',
      });
      return response.projects || [];
    } catch (error) {
      this.log.error('Failed to get all projects:', error);
      throw error;
    }
  }

  async deleteProject(projectIdOrName: string) {
    try {
      await this.vercel.projects.deleteProject({
        idOrName: projectIdOrName,
        teamId: this.teamId,
      });
      this.log.log(`Deleted Vercel project: ${projectIdOrName}`);
      return { success: true };
    } catch (error) {
      this.log.error(`Failed to delete project ${projectIdOrName}:`, error);
      throw error;
    }
  }

  async deleteAllProjects() {
    try {
      const projects = await this.getAllProjects();
      this.log.log(`Found ${projects.length} projects to delete`);

      const results = [];
      for (const project of projects) {
        try {
          await this.deleteProject(project.id);
          results.push({ id: project.id, name: project.name, success: true });
        } catch (error) {
          this.log.error(`Failed to delete project ${project.name}:`, error);
          results.push({
            id: project.id,
            name: project.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        totalProjects: projects.length,
        deleted: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      this.log.error('Failed to delete all projects:', error);
      throw error;
    }
  }
}
