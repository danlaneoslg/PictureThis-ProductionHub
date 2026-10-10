import { spawn } from 'node:child_process';
import os from 'node:os';
export function startMediaJob(exe,args,{env,onProgress=()=>{},onLog=()=>{}}={}) {
  let processHandle, cancelled=false;
  const promise=new Promise((resolve,reject)=>{
    let output='',errors='',lastProgress=0;
    processHandle=spawn(exe,args,{shell:false,windowsHide:true,env});
    processHandle.on('spawn',()=>{try{os.setPriority(processHandle.pid,os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}});
    processHandle.stdout.on('data',data=>{output=(output+data).slice(-8*1024*1024);});
    processHandle.stderr.on('data',data=>{errors=(errors+data).slice(-8000);onLog(String(data));if(Date.now()-lastProgress>=500){lastProgress=Date.now();onProgress(errors.slice(-240));}});
    processHandle.on('error',reject);
    processHandle.on('close',(code,signal)=>{if(cancelled)reject(new Error('Media job cancelled. Saved edits and original recordings are preserved.'));else if(code===0)resolve(output);else reject(new Error(`Media job failed (exit ${code}, signal ${signal||'none'}): ${errors||'No error output'}`));});
  });
  const cancel=()=>{cancelled=true;if(!processHandle?.pid)return;if(process.platform==='win32'){const killer=spawn('taskkill.exe',['/PID',String(processHandle.pid),'/T','/F'],{windowsHide:true,shell:false});killer.on('error',()=>processHandle.kill());killer.on('close',code=>{if(code!==0)processHandle.kill();});}else processHandle.kill();};
  return {promise,cancel};
}
