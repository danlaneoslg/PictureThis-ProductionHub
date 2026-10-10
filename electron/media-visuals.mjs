import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export function waveformPeaks(pcm, count = 160) {
  const samples = Math.floor(pcm.length / 2);
  if (!samples) return [];
  const peaks = Array(count).fill(0);
  for (let i = 0; i < samples; i++) {
    const bin = Math.min(count - 1, Math.floor(i * count / samples));
    peaks[bin] = Math.max(peaks[bin], Math.abs(pcm.readInt16LE(i * 2)) / 32768);
  }
  return peaks;
}
function run(exe, args, limit = 65536, onChunk) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let size = 0, error = '', failure; const chunks = [];
    const timer = setTimeout(() => { failure = new Error('Media visualization timed out.'); child.kill(); }, 120000);
    child.stdout.on('data', chunk => { size += chunk.length; if (size > limit) { failure = new Error('Media visualization exceeded output limit.'); child.kill(); } else if (onChunk) onChunk(chunk); else chunks.push(chunk); });
    child.stderr.on('data', chunk => { error = (error + chunk.toString()).slice(-8192); });
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('close', code => { clearTimeout(timer); if (failure) reject(failure); else if (code !== 0) reject(new Error(`Media visualization failed: ${error || code}`)); else resolve(Buffer.concat(chunks)); });
  });
}
export async function generateMediaVisuals(media, { ffmpeg, cacheDir }) {
  if (!Number.isFinite(media.duration) || media.duration <= 0 || media.duration > 21600) throw new Error('Visual timeline supports videos up to six hours.');
  const stat = await fs.stat(media.path);
  const key = crypto.createHash('sha256').update(JSON.stringify(['visuals-v1', path.resolve(media.path), stat.size, stat.mtimeMs, media.duration, media.audio])).digest('hex');
  const dir = path.resolve(cacheDir, key), manifest = path.join(dir, 'manifest.json');
  const thumbnails = Array.from({ length: 6 }, (_, i) => path.join(dir, `thumb-${i}.jpg`));
  try {
    const cached = JSON.parse(await fs.readFile(manifest, 'utf8'));
    if (cached.thumbnails?.length === 6 && Array.isArray(cached.waveform)) { await Promise.all(thumbnails.map(file => fs.access(file))); return { thumbnails, waveform: cached.waveform }; }
  } catch { /* Regenerate incomplete caches. */ }
  await fs.mkdir(dir, { recursive: true });
  const attempt = crypto.randomUUID(), temporary = [];
  try {
    for (let i = 0; i < 6; i++) {
      const temp = path.join(dir, `${attempt}-${i}.jpg`); temporary.push(temp);
      await run(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-ss', String(media.duration * (i + 0.5) / 6), '-i', media.path, '-frames:v', '1', '-vf', 'scale=160:-2', temp]);
      await fs.access(temp); await fs.rename(temp, thumbnails[i]);
    }
    const waveform = Array(160).fill(0); let sampleIndex = 0, carry = Buffer.alloc(0);
    const consume = chunk => { const pcm = Buffer.concat([carry, chunk]); const length = pcm.length - pcm.length % 2; for (let i = 0; i < length; i += 2) { const bin = Math.min(159, Math.floor(sampleIndex++ * 160 / (media.duration * 8000))); waveform[bin] = Math.max(waveform[bin], Math.abs(pcm.readInt16LE(i)) / 32768); } carry = pcm.subarray(length); };
    if (media.audio !== false) await run(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-i', media.path, '-t', String(media.duration), '-map', '0:a:0?', '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', 'pipe:1'], Math.ceil(media.duration * 16000) + 65536, consume).catch(err => {
      if (/does not contain any stream|matches no streams/i.test(err.message)) return Buffer.alloc(0);
      throw err;
    });
    if (!sampleIndex) waveform.length = 0;
    const pending = path.join(dir, `${attempt}.json`); temporary.push(pending);
    await fs.writeFile(pending, JSON.stringify({ thumbnails, waveform })); await fs.rename(pending, manifest);
    return { thumbnails, waveform };
  } finally { await Promise.all(temporary.map(file => fs.rm(file, { force: true }).catch(() => {}))); }
}

