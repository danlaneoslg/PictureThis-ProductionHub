export function correctTranscript(segments,index,text) {
  if(!Array.isArray(segments)||!Number.isInteger(index)||!segments[index]||typeof text!=='string'||!text.trim()||text.length>10000)throw new Error('Invalid transcript correction.');
  return segments.map((segment,i)=>i===index?{...segment,originalText:segment.originalText??segment.text,text:text.trim()}:segment);
}
