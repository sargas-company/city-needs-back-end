import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';

import { Logger } from '@nestjs/common';
import JSZip from 'jszip';
import unzipper from 'unzipper';

const binaryFileExtensions = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.avif',
  '.webp',
  '.ico',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.bin',
  '.exe',
  '.dll',
  '.so',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.wav',
];

export async function unzipProject(zipPath = 'example.zip', outputDir: string) {
  const absZip = path.resolve(process.cwd(), zipPath);
  const absOut = path.resolve(outputDir);
  await fs.promises.mkdir(absOut, { recursive: true });

  const directory = await unzipper.Open.file(absZip);

  for (const entry of directory.files) {
    const entryPathPOSIX = entry.path
      .replace(/\\/g, '/')
      .replace(/^\.\/+/, '')
      .toLowerCase();

    if (
      entryPathPOSIX.endsWith('claude.md') ||
      entryPathPOSIX.includes('src/app/components') ||
      entryPathPOSIX.includes('src/app/demo') ||
      entryPathPOSIX.startsWith('main/src/app/components/') ||
      entryPathPOSIX.startsWith('__macosx/') ||
      entryPathPOSIX.startsWith('main/.git/') ||
      entryPathPOSIX.startsWith('main/.idea/') ||
      entryPathPOSIX.includes('.ds_store')
    )
      continue;

    const outPath = path.normalize(path.join(absOut, entry.path));
    if (!outPath.startsWith(absOut)) {
      continue;
    }

    if (entry.type === 'Directory') {
      await fs.promises.mkdir(outPath, { recursive: true });
      continue;
    }

    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });

    const read = entry.stream();
    const write = fs.createWriteStream(outPath, {
      mode: entry.externalFileAttributes >>> 16 || 0o644,
    });
    await pipeline(read, write);
  }
}

export async function readZipTextFileBySuffix(
  zipPath: string,
  suffix: string,
): Promise<string | null> {
  const JSZip = (await import('jszip')).default;
  const buf = await fs.promises.readFile(zipPath);
  const zip = await JSZip.loadAsync(buf);

  const entry = Object.values(zip.files).find(
    (f) => !f.dir && f.name.toLowerCase().endsWith(suffix.toLowerCase()),
  );
  if (!entry) return null;
  return await entry.async('string');
}

export async function readManyBySuffixes(
  zipPath: string,
  suffixes: string[],
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  for (const s of suffixes) {
    results[s] = await readZipTextFileBySuffix(zipPath, s);
  }
  return results;
}

export async function buildImageManifestFromZip(
  zipPath: string,
  {
    baseDir = 'public/images',
    limit = 200,
    allowed = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'],
  } = {},
): Promise<{ images: string[] }> {
  const JSZip = (await import('jszip')).default;
  const buf = await fs.promises.readFile(zipPath);
  const zip = await JSZip.loadAsync(buf);

  const out: string[] = [];
  const baseLc = baseDir.toLowerCase().replace(/\\/g, '/');
  const allowedSet = new Set(allowed.map((s) => s.toLowerCase()));

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const n = name.replace(/\\/g, '/');
    const lc = n.toLowerCase();

    if (!lc.includes(baseLc + '/')) continue;

    const ext = path.extname(lc);
    if (!allowedSet.has(ext)) continue;

    const afterPublic = n.split(/public\//i)[1];
    if (!afterPublic) continue;
    const publicUrl = '/' + afterPublic.replace(/^\/*/, '');

    out.push(publicUrl);
    if (out.length >= limit) break;
  }

  out.sort((a, b) => a.length - b.length || a.localeCompare(b));

  return { images: out };
}

export function isTextFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return !binaryFileExtensions.includes(ext);
}

export async function listZipFilePaths(zipFilePath: string): Promise<string[]> {
  try {
    const zipData = await readFile(zipFilePath);
    const zip = await JSZip.loadAsync(zipData);

    const paths: string[] = [];
    zip.forEach((relativePath, file) => {
      if (!file.dir && relativePath.startsWith('main/src/components')) {
        const normalizedPath = relativePath.replace(/^main\//, '');
        paths.push(normalizedPath);
      }
    });

    return paths;
  } catch (e) {
    const logger = new Logger('file-utils');
    logger.error('Error while listing zip file paths:', {
      error: e,
      method: 'listZipFilePaths',
      utils: 'file-utils',
      params: { zipFilePath },
    });
    throw new Error(`Failed to list paths in zip file: ${zipFilePath}`);
  }
}
