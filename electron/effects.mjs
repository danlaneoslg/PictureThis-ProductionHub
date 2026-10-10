const ranges = { brightness:[-0.5,0.5], contrast:[0.5,2], saturation:[0,2], volume:[0,2] };
export function validateEffects(clip) {
  const duration=clip.end-clip.start;
  if(clip.effects!==undefined) {
    if(!clip.effects || typeof clip.effects!=='object' || Array.isArray(clip.effects))throw new Error('Invalid clip effects.');
    for(const [key,value] of Object.entries(clip.effects)) {
      const range=ranges[key] || (['fadeIn','fadeOut','audioFadeIn','audioFadeOut'].includes(key)?[0,duration]:null);
      if(range && value===undefined)continue;
      if(!range || !Number.isFinite(value) || value<range[0] || value>range[1])throw new Error(`Invalid ${key} effect.`);
    }
  }
  if(clip.transition!==undefined) {
    const transition=clip.transition;
    if(!transition || !['none','fade-black'].includes(transition.type) || !Number.isFinite(transition.duration) || transition.duration<0 || transition.duration>duration || Object.keys(transition).some(key=>!['type','duration'].includes(key)))throw new Error('Invalid clip transition.');
  }
}
export function clipFilters(clip,width,height,previousTransition) {
  validateEffects(clip);
  const effects=clip.effects||{}, duration=clip.end-clip.start;
  const incoming=previousTransition?.type==='fade-black'?Math.min(previousTransition.duration,duration/2):0;
  const outgoing=clip.transition?.type==='fade-black'?Math.min(clip.transition.duration,duration/2):0;
  const fadeIn=Math.max(effects.fadeIn||0,incoming),fadeOut=Math.max(effects.fadeOut||0,outgoing);
  const audioFadeIn=Math.max(fadeIn,effects.audioFadeIn||0),audioFadeOut=Math.max(fadeOut,effects.audioFadeOut||0);
  const video=[`scale=${width}:${height}:force_original_aspect_ratio=decrease`,`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,'setsar=1','fps=30','setpts=PTS-STARTPTS'];
  const audio=['asetpts=PTS-STARTPTS'];
  if(effects.brightness!==undefined || effects.contrast!==undefined || effects.saturation!==undefined)video.push(`eq=brightness=${effects.brightness??0}:contrast=${effects.contrast??1}:saturation=${effects.saturation??1}`);
  if(effects.volume!==undefined)audio.push(`volume=${effects.volume}`);
  for(const [direction,amount,start] of [['in',fadeIn,0],['out',fadeOut,duration-fadeOut]])if(amount>0)video.push(`fade=t=${direction}:st=${start}:d=${amount}`);
  for(const [direction,amount,start] of [['in',audioFadeIn,0],['out',audioFadeOut,duration-audioFadeOut]])if(amount>0)audio.push(`afade=t=${direction}:st=${start}:d=${amount}`);
  return {video:video.join(','),audio:audio.join(',')};
}



