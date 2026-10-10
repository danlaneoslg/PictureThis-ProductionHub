import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mediaResponse } from '../electron/media-response.mjs';
test('media streaming supports seeking, suffix ranges and invalid ranges without changing source',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hub-media-'));
 const file=path.join(folder,'test.mp4');await fs.writeFile(file,'0123456789');
 try {
  const request=range=>new Request('https://local/video',{headers:{range}});
  const partial=await mediaResponse(file,request('bytes=3-5'));
  assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),'bytes 3-5/10');assert.equal(await partial.text(),'345');
  assert.equal(await (await mediaResponse(file,request('bytes=-2'))).text(),'89');
  assert.equal((await mediaResponse(file,request('bytes=100-'))).status,416);
  assert.equal(await fs.readFile(file,'utf8'),'0123456789');
 }finally{await fs.unlink(file);await fs.rmdir(folder);}
});

test('thumbnail response advertises JPEG and supports HEAD without reading body', async () => {
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hub-image-'));
 const file=path.join(folder,'thumb.jpg');await fs.writeFile(file,Buffer.from([255,216,255,217]));
 try {
  const response=await mediaResponse(file,new Request('https://local/image',{method:'HEAD'}));
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/jpeg');
  assert.equal(response.headers.get('content-length'),'4');assert.equal(await response.text(),'');
 } finally {await fs.unlink(file);await fs.rmdir(folder);}
});
