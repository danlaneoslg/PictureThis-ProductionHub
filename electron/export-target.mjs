import fs from 'node:fs/promises';
import path from 'node:path';
export async function validateExportTarget(target, media) {
  if (path.extname(target).toLowerCase()!=='.mp4') throw new Error('Choose an MP4 filename.');
  const parent=await fs.realpath(path.dirname(target));
  const resolved=path.join(parent,path.basename(target)).toLowerCase();
  for(const source of media) {
    const original=(await fs.realpath(source.path)).toLowerCase();
    if(resolved===original) throw new Error('This is an original recording. Choose a different filename.');
  }
  try { await fs.lstat(target); } catch(error) { if(error.code==='ENOENT')return target;throw error; }
  throw new Error('That file already exists. Choose a new filename; existing files are preserved.');
}
