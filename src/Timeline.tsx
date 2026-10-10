import { useEffect, useRef, useState } from 'react';
import type { DragEvent, PointerEvent, KeyboardEvent } from 'react';
import './timeline.css';

export type Clip = { id: string; mediaId: string; start: number; end: number; effects?: any };
type Media = { id: string; name: string; duration: number; thumbnails?: string[]; waveform?: number[] };
type Props = {
 clips: Clip[]; media: Media[]; disabled: boolean; selectedId: string;
 onSelect: (id: string) => void; onChange: (clips: Clip[]) => void;
 playhead: number; onSeek: (time: number) => void; onSplit: () => void;
};
const MIN = 1 / 30;
const stamp = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
export function Timeline({ clips, media, disabled, selectedId, onSelect, onChange, playhead, onSeek, onSplit }: Props) {
 const [scale, setScale] = useState(1);
 const [snap, setSnap] = useState(true);
 const [viewport, setViewport] = useState(640);
 const [draft, setDraft] = useState<Clip>();
 const scroll = useRef<HTMLDivElement>(null);
 useEffect(() => { const el = scroll.current; if (!el) return; const observer = new ResizeObserver(() => setViewport(el.clientWidth)); observer.observe(el); return () => observer.disconnect(); }, []);
 const [dragId, setDragId] = useState('');
 const [dropIndex, setDropIndex] = useState<number>();
 const canvas = useRef<HTMLDivElement>(null);
 const latest = useRef(clips); latest.current = clips;
 const displayed = clips.map(clip => draft?.id === clip.id ? draft : clip);
 const total = displayed.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0);
 const width = Math.max(viewport, total * scale + 40);
 const fit = () => { setScale(Math.max(.01, Math.min(40, (viewport - 40) / Math.max(total, 1)))); if (scroll.current) scroll.current.scrollLeft = 0; };
 const selected = clips.find(clip => clip.id === selectedId);
 const duplicate = () => { if (!selected) return; const copy = { ...selected, id: crypto.randomUUID() }; const list = [...clips]; list.splice(list.indexOf(selected) + 1, 0, copy); onChange(list); onSelect(copy.id); };
 const seekPointer = (event: PointerEvent<HTMLElement>) => {
  if (disabled || !canvas.current) return; event.preventDefault(); const el = event.currentTarget; el.setPointerCapture(event.pointerId);
  const seek = (x: number) => onSeek(Math.max(0, Math.min(total, (x - canvas.current!.getBoundingClientRect().left) / scale)));
  const update = (pointer: globalThis.PointerEvent) => seek(pointer.clientX);
  const finish = () => { el.removeEventListener('pointermove', update); el.removeEventListener('pointerup', finish); el.removeEventListener('pointercancel', finish); };
  seek(event.clientX); el.addEventListener('pointermove', update); el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
 };
 const step = [1, 5, 10, 30, 60, 120, 300, 600].find(value => value * scale >= 70) || 600;
 const move = (id: string, target: number) => {
  const list = [...clips], from = list.findIndex(clip => clip.id === id);
  if (from < 0) return;
  const [clip] = list.splice(from, 1);
  list.splice(Math.max(0, Math.min(list.length, target > from ? target - 1 : target)), 0, clip);
  onChange(list);
 };
 const drop = (event: DragEvent, index: number) => {
  event.preventDefault(); event.stopPropagation(); setDropIndex(undefined); setDragId('');
  if (disabled) return;
  const sourceId = event.dataTransfer.getData('application/x-hub-media');
  const clipId = event.dataTransfer.getData('application/x-hub-clip');
  if (clipId) { move(clipId, index); return; }
  let range: { mediaId: string; start: number; end: number } | undefined;
  try { const payload = event.dataTransfer.getData('application/x-hub-range'); if (payload) range = JSON.parse(payload); } catch { return; }
  const source = media.find(item => item.id === (range?.mediaId || sourceId));
  if (!source || !Number.isFinite(source.duration) || source.duration < MIN) return;
  const start = range ? Math.max(0, Math.min(source.duration, range.start)) : 0;
  const end = range ? Math.max(start, Math.min(source.duration, range.end)) : source.duration;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < MIN) return;
  const clip: Clip = { id: crypto.randomUUID(), mediaId: source.id, start, end };
  const list = [...clips]; list.splice(index, 0, clip); onChange(list); onSelect(clip.id);
 };
 const trim = (event: PointerEvent<HTMLButtonElement>, clip: Clip, edge: 'start' | 'end') => {
  event.stopPropagation(); event.preventDefault(); if (disabled) return;
  onSelect(clip.id);
  const source = media.find(item => item.id === clip.mediaId);
  if (!source) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  const initialX = event.clientX, button = event.currentTarget;
  let next = clip;
  const update = (pointer: globalThis.PointerEvent) => {
   const delta = (pointer.clientX - initialX) / scale;
   const offset = clips.slice(0, clips.findIndex(item => item.id === clip.id)).reduce((sum, item) => sum + item.end - item.start, 0);
   let value = (edge === 'start' ? clip.start : clip.end) + delta;
   if (snap && !pointer.altKey) { const targets = [0, source.duration, clip.start + playhead - offset]; const nearest = targets.reduce((best, target) => Math.abs(target - value) < Math.abs(best - value) ? target : best); if (Math.abs(nearest - value) <= Math.min(.25, 8 / scale)) value = nearest; }
   next = edge === 'start' ? { ...clip, start: Math.max(0, Math.min(clip.end - MIN, value)) }
    : { ...clip, end: Math.min(source.duration, Math.max(clip.start + MIN, value)) };
   setDraft(next); setTrimLabel(`Source ${next.start.toFixed(2)}–${next.end.toFixed(2)}s · duration ${(next.end - next.start).toFixed(2)}s`);
  };
  const finish = () => {
   button.removeEventListener('pointermove', update); button.removeEventListener('pointerup', finish); button.removeEventListener('pointercancel', cancel);
   setTrimLabel(''); setDraft(undefined); if (next.start !== clip.start || next.end !== clip.end) onChange(latest.current.map(item => item.id === clip.id ? next : item));
  };
  const cancel = () => { button.removeEventListener('pointermove', update); button.removeEventListener('pointerup', finish); button.removeEventListener('pointercancel', cancel); setTrimLabel(''); setDraft(undefined); };
  button.addEventListener('pointermove', update); button.addEventListener('pointerup', finish); button.addEventListener('pointercancel', cancel);
 };
 const [trimLabel, setTrimLabel] = useState('');
 const key = (event: KeyboardEvent, clip: Clip, index: number) => {
  if (disabled || event.target !== event.currentTarget) return;
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); onChange(clips.filter(item => item.id !== clip.id)); }
  if (event.altKey && event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); move(clip.id, index - 1); }
  if (event.altKey && event.key === 'ArrowRight' && index < clips.length - 1) { event.preventDefault(); move(clip.id, index + 2); }
 };
 let position = 0;
 return <section className="hub-timeline" aria-label="Video editing timeline">
  <div className="hub-timeline-toolbar"><strong>Timeline <small>{clips.length} clips · {stamp(total)}</small></strong><div><button onClick={fit}>Fit timeline</button><label><input type="checkbox" checked={snap} onChange={event => setSnap(event.target.checked)}/>Snap</label><button disabled={disabled || !selected} onClick={duplicate}>Duplicate</button><button disabled={disabled || !selected} onClick={() => onChange(clips.filter(clip => clip.id !== selectedId))}>Ripple delete</button><button disabled={disabled || !clips.length} onClick={onSplit}>Split at playhead</button><label>Zoom <input aria-label="Timeline zoom" type="range" min="0.01" max="40" step="0.01" value={scale} onChange={event => setScale(Number(event.target.value))}/></label></div></div>
  <div className="hub-timeline-scroll" ref={scroll}><div className="hub-timeline-canvas" ref={canvas} style={{ width }}>
   <div className="hub-timeline-ruler" onPointerDown={seekPointer} aria-label="Drag time ruler to seek">
    {Array.from({ length: Math.floor(width / (step * scale)) + 1 }, (_, index) => <span key={index} style={{ left: index * step * scale }}>{stamp(index * step)}</span>)}
   </div>
   <div className="hub-timeline-track" onDragOver={event => { if (!disabled) { event.preventDefault(); setDropIndex(clips.length); } }} onDrop={event => drop(event, clips.length)}>
    {displayed.map((clip, index) => {
     const start = position; position += Math.max(0, clip.end - clip.start);
     const source = media.find(item => item.id === clip.mediaId);
     const thumbnails = source?.thumbnails?.filter((_, i, images) => { const t = (i + .5) / images.length * source.duration; return t >= clip.start && t <= clip.end; });
     if (source?.thumbnails?.length && !thumbnails?.length) thumbnails?.push(source.thumbnails[Math.min(source.thumbnails.length - 1, Math.floor((clip.start + clip.end) / 2 / source.duration * source.thumbnails.length))]);
     const waveform = source?.waveform?.slice(Math.floor(clip.start / source.duration * source.waveform.length), Math.max(Math.floor(clip.start / source.duration * source.waveform.length) + 1, Math.ceil(clip.end / source.duration * source.waveform.length)));
     return <div key={clip.id} tabIndex={0} role="group" aria-label={`Clip ${index + 1}: ${source?.name || 'Missing source'}. Alt left or right to reorder, Delete to remove.`}
      className={`hub-timeline-clip ${selectedId === clip.id ? 'selected' : ''} ${dragId === clip.id ? 'dragging' : ''} ${dropIndex === index ? 'drop-before' : ''}`}
      style={{ left: start * scale, width: Math.max(2, (clip.end - clip.start) * scale) }} draggable={!disabled}
      onClick={() => onSelect(clip.id)} onFocus={() => onSelect(clip.id)} onKeyDown={event => key(event, clip, index)}
      onDragStart={event => { event.dataTransfer.setData('application/x-hub-clip', clip.id); event.dataTransfer.effectAllowed = 'move'; setDragId(clip.id); }}
      onDragEnd={() => { setDragId(''); setDropIndex(undefined); }}
      onDragOver={event => { if (!disabled) { event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setDropIndex(index + (event.clientX > rect.left + rect.width / 2 ? 1 : 0)); } }}
      onDrop={event => { const rect = event.currentTarget.getBoundingClientRect(); drop(event, index + (event.clientX > rect.left + rect.width / 2 ? 1 : 0)); }}>
      <button className="hub-trim start" disabled={disabled} aria-label={`Trim start of ${source?.name || 'clip'}`} onPointerDown={event => trim(event, clip, 'start')} onClick={event => event.stopPropagation()}>│</button>
      {thumbnails?.length ? <div className="hub-clip-thumbnails" aria-hidden="true">{thumbnails.map((url, i) => <img key={i} src={url} draggable={false}/>)}</div> : null}
      {waveform?.length ? <svg className="hub-clip-waveform" viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true">{waveform.map((peak, i) => <line key={i} x1={i * 200 / waveform.length} x2={i * 200 / waveform.length} y1={15 - Math.max(0, Math.min(1, peak)) * 14} y2={15 + Math.max(0, Math.min(1, peak)) * 14}/>)}</svg> : null}
      <div className="hub-clip-label"><b>{source?.name || 'Missing source'}</b><small>{clip.start.toFixed(1)}–{clip.end.toFixed(1)}s</small></div>
      <button className="hub-trim end" disabled={disabled} aria-label={`Trim end of ${source?.name || 'clip'}`} onPointerDown={event => trim(event, clip, 'end')} onClick={event => event.stopPropagation()}>│</button>
     </div>;
    })}
    {!clips.length && <p className="hub-timeline-empty">Drag footage here to start your edit.</p>}
    {dropIndex !== undefined && <div className="hub-drop-end" style={{ left: displayed.slice(0, dropIndex).reduce((sum, clip) => sum + clip.end - clip.start, 0) * scale }}><span>Insert here</span></div>} 
   </div>
   <div className="hub-playhead" style={{ left: Math.max(0, Math.min(total, playhead)) * scale }} ><button disabled={disabled} aria-label="Drag playhead to seek" onPointerDown={seekPointer}>▼</button></div>
  </div></div>
  <p className="hub-timeline-help" role="status">{trimLabel || 'Drag footage between clips to insert · Drag edges to trim (Alt bypasses snapping) · Drag ruler or playhead to seek · Delete closes the gap'}</p>
 </section>;
}
export default Timeline;
