import crypto from 'node:crypto';
export const CAP = 1_000_000; // integer millionths of a dollar
export function quote(text, config) {
  if (!text.trim()) throw new Error('Add a transcript first.');
  for (const key of ['inputRate', 'outputRate']) if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error('Configure verified provider rates first.');
  if (!/^[a-zA-Z0-9._-]+$/.test(config.model || '')) throw new Error('Configure a model ID.');
  const inputTokens = Buffer.byteLength(text, 'utf8') + 4096;
  const outputTokens = 4096;
  const reserved = Math.ceil(inputTokens * config.inputRate + outputTokens * config.outputRate);
  return { inputTokens, outputTokens, reserved, key: crypto.createHash('sha256').update(JSON.stringify([text, config, 'highlights-v2'])).digest('hex') };
}
export function reserve(project, estimate) {
  const used = project.ledger.reduce((sum, row) => sum + row.cost, 0);
  if (!Number.isSafeInteger(estimate.reserved) || estimate.reserved <= 0 || used + estimate.reserved > CAP) throw new Error('This analysis would exceed the $1 project AI cap.');
  const row = { id: crypto.randomUUID(), cost: estimate.reserved, status: 'reserved', date: new Date().toISOString() };
  project.ledger.push(row);
  return row;
}
export function validateClip(clip, media) {
  if (!media || !Number.isFinite(clip.start) || !Number.isFinite(clip.end) || clip.start < 0 || clip.end > media.duration || clip.end <= clip.start) throw new Error('Invalid clip boundaries.');
}
export function candidates(segments) {
  return segments.filter(s => s.text.trim()).map(s => ({ ...s, score: Math.min(99, 45 + (/[?!]/.test(s.text) ? 20 : 0) + (/best|why|secret|surpris|learn|mistake/i.test(s.text) ? 20 : 0)), reason: 'Local transcript heuristic — review before adding.' })).sort((a,b) => b.score-a.score).slice(0,12);
}
