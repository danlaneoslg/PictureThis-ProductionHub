import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { validateExportTarget } from '../electron/export-target.mjs';
test('new export in source folder is allowed; source and existing files are protected',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hub-export-'));
 const source=path.join(folder,'source.mp4'),existing=path.join(folder,'existing.mp4'),fresh=path.join(folder,'new-edit.mp4');
 await fs.writeFile(source,'original');await fs.writeFile(existing,'finished');
 try{
  assert.equal(await validateExportTarget(fresh,[{path:source}]),fresh);
  await assert.rejects(validateExportTarget(source,[{path:source}]),/original recording/);
  await assert.rejects(validateExportTarget(existing,[{path:source}]),/already exists/);
  await assert.rejects(validateExportTarget(path.join(folder,'bad.txt'),[{path:source}]),/MP4/);
  assert.equal(await fs.readFile(source,'utf8'),'original');assert.equal(await fs.readFile(existing,'utf8'),'finished');
 }finally{await fs.unlink(source);await fs.unlink(existing);await fs.rmdir(folder);}
});
