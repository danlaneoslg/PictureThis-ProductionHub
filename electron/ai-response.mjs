import { validateClip } from './core.mjs';
export function parseHighlights(result,media) {
  let text=(result.content||[]).filter(block=>block.type==='text').map(block=>block.text).join('').trim();
  const fenced=/^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  if(fenced)text=fenced[1];
  if(result.stop_reason==='max_tokens') {
    text=text.replace(/^```(?:json)?\s*/i,'');
    const complete=completeObjects(text);
    if(!complete.length)throw new Error('AI response was cut short before any complete highlights. Preview the revised cost before retrying.');
    text=JSON.stringify(complete);
  }
  let parsed;
  try{parsed=JSON.parse(text);}catch{throw new Error('AI returned an unreadable highlight list. Your edit is unchanged.');}
  if(!Array.isArray(parsed)||parsed.length>8)throw new Error('AI returned an invalid highlight list. Your edit is unchanged.');
  return parsed.map(s=>{
    if(!s||typeof s!=='object'||typeof s.mediaId!=='string'||typeof s.text!=='string'||typeof s.reason!=='string'||!Number.isFinite(s.score)||s.score<0||s.score>100)throw new Error('AI returned an invalid highlight. Your edit is unchanged.');
    validateClip(s,media.find(item=>item.id===s.mediaId));
    return {mediaId:s.mediaId,start:s.start,end:s.end,text:s.text,reason:s.reason,score:s.score};
  });
}
function completeObjects(text) {
  const items=[];
  let index=0;
  while(/\s/.test(text[index]||'')&&index<text.length)index++;
  if(text[index++]!=='[')return items;
  while(index<text.length&&items.length<8) {
    while(index<text.length&&/[\s,]/.test(text[index]))index++;
    if(text[index]!=='{')break;
    const start=index;
    let depth=0,string=false,escaped=false,closed=false;
    for(;index<text.length;index++){
      const character=text[index];
      if(string){if(escaped)escaped=false;else if(character==='\\')escaped=true;else if(character==='"')string=false;continue;}
      if(character==='"')string=true;
      else if(character==='{')depth++;
      else if(character==='}'&&--depth===0){index++;closed=true;break;}
    }
    if(!closed)break;
    try{items.push(JSON.parse(text.slice(start,index)));}catch{break;}
  }
  return items;
}
