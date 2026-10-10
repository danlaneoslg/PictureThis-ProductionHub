import test from 'node:test';
import assert from 'node:assert/strict';
import { startMediaJob } from '../electron/media-job.mjs';
test('noisy child output is throttled and does not block the event loop',async()=>{
 let progress=0,ticks=0;
 const timer=setInterval(()=>ticks++,10);
 try{
  const job=startMediaJob(process.execPath,['-e',"let n=0;const t=setInterval(()=>{process.stderr.write('progress '+n+'\\n');if(++n===100)clearInterval(t);},2)"],{onProgress:()=>progress++});
  await job.promise;assert.ok(ticks>5);assert.ok(progress<5);
 }finally{clearInterval(timer);}
});
test('subprocess errors reject without terminating the application',async()=>{
 const failed=startMediaJob(process.execPath,['-e',"process.stderr.write('transcription error');process.exit(3)"]);
 await assert.rejects(failed.promise,/exit 3.*transcription error/s);
});
test('cancel stops the media subprocess and reports cancellation',async()=>{
 const job=startMediaJob(process.execPath,['-e','setInterval(()=>{},1000)']);
 setTimeout(job.cancel,100);
 await assert.rejects(job.promise,/cancelled/);
});
