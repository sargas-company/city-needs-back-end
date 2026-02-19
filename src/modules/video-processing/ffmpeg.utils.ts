import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const MAX_DURATION_SECONDS = 60;
export const FFMPEG_TIMEOUT_MS = 2 * 60 * 1000;

export type ProbeResult = {
  duration: number;
  width: number;
  height: number;
};

export async function probe(filePath: string): Promise<ProbeResult | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    const data = JSON.parse(stdout);
    const stream = (data.streams ?? []).find(
      (s: { codec_type?: string }) => s.codec_type === 'video',
    );

    if (!stream) return null;

    const width = Number(stream.width);
    const height = Number(stream.height);
    const duration = Number(data.format?.duration);

    if (!width || !height || !Number.isFinite(duration) || duration <= 0) return null;

    return { duration, width, height };
  } catch {
    return null;
  }
}

export async function transcode(input: string, output: string): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    [
      '-i',
      input,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-profile:v',
      'high',
      '-level',
      '4.0',
      '-crf',
      '23',
      '-vf',
      'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      '-y',
      output,
    ],
    { timeout: FFMPEG_TIMEOUT_MS },
  );
}

export async function generateThumbnail(
  input: string,
  output: string,
  seek: number,
): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    ['-i', input, '-ss', String(seek), '-vframes', '1', '-q:v', '2', '-y', output],
    { timeout: FFMPEG_TIMEOUT_MS },
  );
}
