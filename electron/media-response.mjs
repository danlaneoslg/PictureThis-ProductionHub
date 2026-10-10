import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
export async function mediaResponse(file, request) {
  const {size} = await stat(file);
  const range = request.headers.get('range');
  let start=0,end=size-1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1]&&!match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
    if (!match[1]) start=Math.max(0,size-Number(match[2]));
    else { start=Number(match[1]); if(match[2])end=Math.min(end,Number(match[2])); }
    if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  }
  const mime={'.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.mkv':'video/x-matroska','.avi':'video/x-msvideo'}[path.extname(file).toLowerCase()]||'application/octet-stream';
  const headers={'Content-Type':mime,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'};
  if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  return new Response(request.method==='HEAD'?null:Readable.toWeb(createReadStream(file,{start,end})),{status:range?206:200,headers});
}
