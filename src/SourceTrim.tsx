import {useEffect,useRef,useState} from 'react';
import type {PointerEvent} from 'react';
import './source-trim.css';
type Range={start:number;end:number};
export type SourceTrimProps={media:{id:string;name:string;duration:number;thumbnails?:string[];waveform?:number[]};clip:Range&{id:string};sourceTime:number;disabled:boolean;onSeek:(time:number)=>void;onChange:(range:Range)=>void};
const FRAME=1/30;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const stamp=(n:number)=>Math.floor(n/60)+':'+(Math.max(0,n)%60).toFixed(2).padStart(5,'0');
export function SourceTrim({media,clip,sourceTime,disabled,onSeek,onChange}:SourceTrimProps){
 const [draft,setDraft]=useState<Range|null>(null),[windowRange,setWindowRange]=useState<Range|null>(null);
 const strip=useRef<HTMLDivElement>(null),disposeActive=useRef<(()=>void)|null>(null);
 useEffect(()=>{disposeActive.current?.();setDraft(null);setWindowRange(null);},[clip.id,media.id]);
 useEffect(()=>()=>disposeActive.current?.(),[]);
 const duration=Math.max(0,media.duration),minimum=Math.min(FRAME,duration),range=draft||clip,view=windowRange||{start:0,end:duration},span=Math.max(FRAME,view.end-view.start),available=!disabled&&duration>0;
 const position=(n:number)=>clamp((n-view.start)/span*100,0,100);
 const boundary=(edge:'start'|'end',time:number,base:Range)=>edge==='start'?{start:clamp(time,0,Math.max(0,base.end-minimum)),end:base.end}:{start:base.start,end:clamp(time,Math.min(duration,base.start+minimum),duration)};
 const commit=(edge:'start'|'end',time:number)=>{const next=boundary(edge,time,clip);onChange(next);onSeek(next[edge]);};
 const drag=(event:PointerEvent<HTMLButtonElement>,edge:'start'|'end')=>{
  if(!available)return;event.preventDefault();event.stopPropagation();disposeActive.current?.();
  const button=event.currentTarget,initial={start:clip.start,end:clip.end},initialTime=sourceTime,x=event.clientX,width=Math.max(1,strip.current?.getBoundingClientRect().width||1);
  let next=initial;button.setPointerCapture(event.pointerId);
  const move=(e:globalThis.PointerEvent)=>{next=boundary(edge,initial[edge]+(e.clientX-x)/width*span,initial);setDraft(next);onSeek(next[edge]);};
  const cleanup=()=>{button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',finish);button.removeEventListener('pointercancel',cancel);button.removeEventListener('lostpointercapture',cancel);disposeActive.current=null;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);};
  const cancel=()=>{cleanup();setDraft(null);onSeek(initialTime);};
  const finish=(e:globalThis.PointerEvent)=>{move(e);cleanup();setDraft(null);if(next.start!==initial.start||next.end!==initial.end)onChange(next);};
  disposeActive.current=cleanup;onSeek(initial[edge]);button.addEventListener('pointermove',move);button.addEventListener('pointerup',finish);button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);
 };
 return <section className="hub-source-trim" aria-label="Trim selected clip">
  <header><div><strong>Trim selected clip</strong><small>{media.name}</small></div><div><button disabled={!available} onClick={()=>setWindowRange(null)}>Fit whole source</button><button disabled={!available} onClick={()=>{const pad=Math.max(1,(range.end-range.start)*.15);setWindowRange({start:Math.max(0,range.start-pad),end:Math.min(duration,range.end+pad)});}}>Zoom to selected clip</button></div></header>
  <p>Gold is kept. Darkened footage is unused. Drag either gold handle to trim.</p>
  <div className="hub-source-trim-times"><span>{stamp(view.start)}</span><span>{stamp(view.end)}</span></div>
  <div ref={strip} className="hub-source-trim-strip" onPointerDown={e=>{if(!available)return;const rect=e.currentTarget.getBoundingClientRect();onSeek(clamp(view.start+(e.clientX-rect.left)/Math.max(1,rect.width)*span,0,duration));}}>
   <div className="hub-source-trim-images">{media.thumbnails?.length?media.thumbnails.map((src,i)=>{const start=i/media.thumbnails!.length*duration,end=(i+1)/media.thumbnails!.length*duration;return end<=view.start||start>=view.end?null:<img key={i} src={src} alt="" draggable={false} style={{left:((start-view.start)/span*100)+'%',width:((end-start)/span*100)+'%'}}/>;}):<span>Source thumbnails are loading or unavailable</span>}</div>
   {!!media.waveform?.length&&<svg className="hub-source-trim-wave" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-label="Source audio waveform">{media.waveform.map((value,i)=>{const time=i/Math.max(1,media.waveform!.length-1)*duration;if(time<view.start||time>view.end)return null;const x=(time-view.start)/span*1000,h=clamp(Math.abs(value),0,1)*27;return <line key={i} x1={x} x2={x} y1={30-h} y2={30+h}/>;})}</svg>}
   <div className="hub-source-trim-dark" style={{left:0,width:position(range.start)+'%'}}/><div className="hub-source-trim-dark" style={{left:position(range.end)+'%',right:0}}/><div className="hub-source-trim-kept" style={{left:position(range.start)+'%',width:(position(range.end)-position(range.start))+'%'}}/>
   {(['start','end'] as const).map(edge=><button className="hub-source-trim-handle" key={edge} style={{left:position(range[edge])+'%'}} disabled={!available} aria-label={'Trim '+edge} title={'Drag to trim '+edge+'; arrow keys move one frame'} onPointerDown={e=>drag(e,edge)} onKeyDown={e=>{if(!available||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();commit(edge,clip[edge]+(e.key==='ArrowRight'?1:-1)*FRAME*(e.shiftKey?30:1));}}>↔</button>)}
   {sourceTime>=view.start&&sourceTime<=view.end&&<div className="hub-source-trim-playhead" style={{left:position(sourceTime)+'%'}}/>}
  </div>
  <footer><output aria-live="polite">Start {stamp(range.start)} · End {stamp(range.end)} · Kept {stamp(range.end-range.start)}</output><div><button disabled={!available||sourceTime<0||sourceTime>clip.end-minimum} onClick={()=>commit('start',sourceTime)}>Trim start to playhead</button><button disabled={!available||sourceTime<clip.start+minimum||sourceTime>duration} onClick={()=>commit('end',sourceTime)}>Trim end to playhead</button></div></footer>
 </section>;
}

