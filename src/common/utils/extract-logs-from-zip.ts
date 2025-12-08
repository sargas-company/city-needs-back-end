import * as zlib from 'zlib';

import * as unzipper from 'unzipper';

import type { OctokitResponse } from '@octokit/types';

type OctokitABResponse = OctokitResponse<ArrayBuffer, number>;

function isOctokitABResponse(x: unknown): x is OctokitABResponse {
  return (
    typeof x === 'object' && x !== null && 'data' in x && (x as any).data instanceof ArrayBuffer
  );
}

export async function extractLogFromZip(zipBuffer: Buffer): Promise<string> {
  const dir = await unzipper.Open.buffer(zipBuffer);
  if (!dir.files.length) throw new Error('Artifact ZIP is empty');

  const entry =
    dir.files.find((f) => /build\.(log|txt|gz)$/i.test(f.path)) ??
    dir.files.find((f) => /\.(log|txt|gz)$/i.test(f.path)) ??
    dir.files[0];

  const fileBuf = await entry.buffer();
  return /\.gz$/i.test(entry.path)
    ? zlib.gunzipSync(fileBuf).toString('utf8')
    : fileBuf.toString('utf8');
}

export async function bufferFromDownloadArtifact(res: any): Promise<Buffer> {
  if (Buffer.isBuffer(res)) return res;
  if (res instanceof ArrayBuffer) return Buffer.from(res);
  if (typeof res === 'string') {
    const r = await fetch(res);
    return Buffer.from(await r.arrayBuffer());
  }
  if (isOctokitABResponse(res)) {
    return Buffer.from(res.data);
  }
  throw new TypeError('Unsupported downloadArtifact response shape');
}
