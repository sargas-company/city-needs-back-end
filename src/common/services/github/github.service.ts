import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

import {
  bufferFromDownloadArtifact,
  extractLogFromZip,
} from '../../../common/utils/extract-logs-from-zip';

export interface ITree {
  path?: string;
  mode?: '100644' | '100755' | '040000' | '160000' | '120000';
  type?: 'blob' | 'tree' | 'commit';
  sha?: string | null;
  content?: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  async createRepository(name: string, isPrivate = false) {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name,
        private: isPrivate,
        auto_init: true,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create repository:', {
        error,
        method: 'createRepository',
        service: 'github',
        params: { name, isPrivate },
      });
      throw new Error('Failed to create repository');
    }
  }

  async createBranch(owner: string, repo: string, newBranch: string, baseBranch = 'main') {
    try {
      const baseSha = await this.getBranchRef(owner, repo, baseBranch);

      return await this.createBranchRef(owner, repo, newBranch, baseSha);
    } catch (error) {
      this.logger.error('Failed to create branch:', {
        error,
        method: 'createBranch',
        service: 'github',
        params: { owner, repo, newBranch, baseBranch },
      });
      throw new Error('Failed to create branch');
    }
  }

  async deployToBranch(
    owner: string,
    repo: string,
    branch: string,
    filePath: string,
    base64Content: string,
    commitMessage: string,
  ): Promise<any> {
    try {
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch,
        });

        if (!Array.isArray(data)) {
          sha = data.sha;
        }
      } catch (error) {
        this.logger.error('Failed to get file contents:', {
          error,
          method: 'deployToBranch',
          service: 'github',
          params: {
            owner,
            repo,
            branch,
            filePath,
            base64Content,
            commitMessage,
          },
        });
      }

      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: base64Content,
        branch,
        sha,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to deploy to branch:', {
        error,
        method: 'deployToBranch',
        service: 'github',
        params: {
          owner,
          repo,
          branch,
          filePath,
          base64Content,
          commitMessage,
        },
      });
      throw new Error('Failed to deploy to branch');
    }
  }

  async pushProjectTree(
    owner: string,
    repo: string,
    branch: string,
    tree: ITree[],
    commitMessage: string = 'Update project files',
  ): Promise<void> {
    let latestCommitSha: string | undefined;
    let parentTreeSha: string | undefined;
    try {
      latestCommitSha = await this.getBranchRef(owner, repo, branch);

      try {
        parentTreeSha = await this.getCommit(owner, repo, latestCommitSha);
      } catch (error) {
        this.logger.log('Branch is empty', error);
        parentTreeSha = undefined;
      }
    } catch (error) {
      this.logger.log("Branch doesn't exist, we'll create it", {
        error,
        method: 'pushProjectTree',
        service: 'github',
        params: {
          owner,
          repo,
          branch,
          tree,
          commitMessage,
        },
      });
      try {
        await this.createBranch(owner, repo, branch);
        latestCommitSha = undefined;
        parentTreeSha = undefined;
      } catch (err) {
        this.logger.error('Failed to create branch:', {
          error: err,
          method: 'createBranch',
          service: 'github',
          params: { owner, repo, branch },
        });
        throw new Error('Failed to create branch');
      }
    }

    let treeSha: string;
    try {
      treeSha = await this.createTree(owner, repo, tree, parentTreeSha);
    } catch (error) {
      this.logger.error('Failed to create tree:', {
        error,
        method: 'createTree',
        service: 'github',
        params: { owner, repo, tree, parentTreeSha },
      });
      throw new Error('Failed to create tree');
    }

    let commitSha: string;
    try {
      commitSha = await this.createCommit(owner, repo, treeSha, commitMessage, latestCommitSha);
    } catch (error) {
      this.logger.error('Failed to create commit:', {
        error,
        method: 'createCommit',
        service: 'github',
        params: { owner, repo, treeSha, commitMessage, latestCommitSha },
      });
      throw new Error('Failed to create commit');
    }

    try {
      if (latestCommitSha) {
        await this.updateBranchRef(owner, repo, branch, commitSha);
      } else {
        await this.createBranchRef(owner, repo, branch, commitSha);
      }
    } catch (error) {
      this.logger.error('Failed to update/create branch:', {
        error,
        method: latestCommitSha ? 'updateBranchRef' : 'createBranchRef',
        service: 'github',
        params: { owner, repo, branch, commitSha },
      });
      throw new Error('Failed to update/create branch');
    }
  }

  async createTree(owner: string, repo: string, tree: ITree[], parentTreeSha?: string) {
    try {
      const { data } = await this.octokit.git.createTree({
        owner,
        repo,
        ...(parentTreeSha ? { base_tree: parentTreeSha } : {}),
        tree,
      });
      return data.sha;
    } catch (error) {
      this.logger.error('Failed to create tree:', {
        error,
        method: 'createTree',
        service: 'github',
        params: { owner, repo, tree, parentTreeSha },
      });
      throw new Error('Failed to create tree');
    }
  }

  async createCommit(
    owner: string,
    repo: string,
    treeSha: string,
    commitMessage: string,
    latestCommitSha?: string,
  ) {
    try {
      const { data } = await this.octokit.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeSha,
        parents: latestCommitSha ? [latestCommitSha] : [],
      });
      return data.sha;
    } catch (error) {
      this.logger.error('Failed to create commit:', {
        error,
        method: 'createCommit',
        service: 'github',
        params: { owner, repo, treeSha, commitMessage, latestCommitSha },
      });
      throw new Error('Failed to create commit');
    }
  }

  async getCommit(owner: string, repo: string, commit_sha: string) {
    try {
      const { data } = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha,
      });
      return data.tree.sha;
    } catch (error) {
      this.logger.error('Failed to get commit:', {
        error,
        method: 'getCommit',
        service: 'github',
        params: { owner, repo, commit_sha },
      });
      throw new Error('Failed to get commit');
    }
  }

  async getBranchRef(owner: string, repo: string, branch: string) {
    try {
      const { data } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return data.object.sha;
    } catch (error) {
      this.logger.error('Failed to get branch ref:', {
        error,
        method: 'getBranchRef',
        service: 'github',
        params: { owner, repo, branch },
      });
      throw new Error('Failed to get branch ref');
    }
  }

  async updateBranchRef(owner: string, repo: string, branch: string, sha: string) {
    try {
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha,
      });
    } catch (error) {
      this.logger.error('Failed to update branch ref:', {
        error,
        method: 'updateBranchRef',
        service: 'github',
        params: { owner, repo, branch, sha },
      });
      throw new Error('Failed to update branch ref');
    }
  }

  async createBranchRef(owner: string, repo: string, branch: string, sha: string) {
    try {
      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha,
      });
      return data;
    } catch (error) {
      this.logger.error('Failed to create branch ref:', {
        error,
        method: 'createBranchRef',
        service: 'github',
        params: { owner, repo, branch, sha },
      });
      throw new Error('Failed to create branch ref');
    }
  }

  async createBlob(owner: string, repo: string, content: string, path: string) {
    try {
      const { data } = await this.octokit.git.createBlob({
        owner,
        repo,
        content,
        encoding: 'base64',
      });

      return data.sha;
    } catch (error) {
      this.logger.error(`Failed to create blob: path- ${path}`, {
        error,
        method: 'createBlob',
        service: 'github',
        params: { owner, repo, content, path },
      });
      throw new Error('Failed to create blob');
    }
  }

  async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    branch: string,
    workflowFileName: string = 'build.yml',
  ) {
    try {
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowFileName,
        ref: branch,
        inputs: {
          branch: branch,
        },
      });
    } catch (error) {
      this.logger.error('Error triggering workflow:', {
        error,
        method: 'triggerWorkflowDispatch',
        service: 'github',
        params: { owner, repo, branch, workflowFileName },
      });
    }
  }

  async waitForWorkflowCompletion(owner: string, repo: string, branch: string) {
    let runId: number | undefined;

    while (!runId) {
      const runs = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        branch,
      });

      runId = runs.data.workflow_runs.find((run) => run.status !== 'completed')?.id;
      if (!runId) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      this.logger.log(`� Workflow run detected! Run ID: ${runId}`);
    }

    this.logger.log(`⏳ Waiting for run ${runId} to complete...`);

    while (true) {
      const run = await this.octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });

      const { status, conclusion } = run.data;
      this.logger.log(`Status: ${status}, Conclusion: ${conclusion || 'N/A'}`);

      if (status === 'completed') {
        if (conclusion === 'success') {
          this.logger.log('✅ Build succeeded!');
          return { success: true };
        } else {
          this.logger.error(`❌ Build failed with conclusion: ${conclusion}`, {
            method: 'waitForWorkflowCompletion',
            service: 'github',
            params: { owner, repo, branch },
          });
          const artifacts = await this.octokit.rest.actions.listWorkflowRunArtifacts({
            owner,
            repo,
            run_id: runId,
          });

          const logArtifact = artifacts.data.artifacts.find((a) => a.name === 'build-logs');
          if (!logArtifact) {
            return { success: false, error: 'Build failed but no log artifact found' };
          }

          const dl = await this.octokit.rest.actions.downloadArtifact({
            owner,
            repo,
            artifact_id: logArtifact.id,
            archive_format: 'zip',
          });

          const zipBuffer = await bufferFromDownloadArtifact(dl);
          let logContent = 'No log content found';
          try {
            logContent = await extractLogFromZip(zipBuffer);
          } catch (error) {
            this.logger.error('Error extracting log from zip:', {
              error,
              method: 'extractLogFromZip',
              params: { zipBuffer },
            });
            logContent = 'Error extracting log file';
          }

          return { success: false, error: logContent };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  async forcePushBranchTo(
    owner: string,
    repo: string,
    sourceBranch: string,
    targetBranch = 'main',
  ) {
    try {
      const { data: sourceBranchRef } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${sourceBranch}`,
      });
      const sourceCommitSha = sourceBranchRef.object.sha;

      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
        sha: sourceCommitSha,
        force: true,
      });

      this.logger.log(`Successfully force pushed '${sourceBranch}' to '${targetBranch}'.`);
    } catch (error) {
      this.logger.error('Error force pushing:', {
        error,
        method: 'forcePushBranchTo',
        service: 'github',
        params: { owner, repo, sourceBranch, targetBranch },
      });
    }
  }

  async ensureWorkflowIsIndexed(
    owner: string,
    repo: string,
    workflowFileName: string = 'build.yml',
  ) {
    let found = false;
    for (let attempt = 1; attempt <= 10; attempt++) {
      const workflows = await this.octokit.rest.actions.listRepoWorkflows({ owner, repo });
      found = workflows.data.workflows.some((wf) => wf.path.endsWith(workflowFileName));

      if (found) {
        this.logger.log(`✅ Workflow "${workflowFileName}" is now indexed by GitHub.`);
        return;
      }

      this.logger.log(`⏳ Workflow not found yet, retrying... (${attempt}/10)`);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // wait 5s
    }

    throw new Error(`Workflow "${workflowFileName}" not found after waiting.`);
  }
}
