import { useRef, useState } from 'react';
import type { DragEvent, PointerEvent, KeyboardEvent } from 'react';
import './timeline.css';

export type Clip = { id: string; mediaId: string; start: number; end: number; effects?: any };
type Media = { id: string; name: string; duration: number };
type Props = {
 clips: Clip[]; media: Media[]; disabled: boolean; selectedId: string;
 onSelect: (id: string) => void; onChange: (clips: Clip[]) => void;
 playhead: number; onSeek: (time: number) => void; onSplit: () => void;
};
const MIN = 1 / 30;
const stamp = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
export function Timeline({ clips, media, disabled, selectedId, onSelect, onChange, playhead, onSeek, onSplit }: Props) {
 const [scale, setScale] = useState(6);
 const [dragId, setDragId] = useState('');
 const [dropIndex, setDropIndex] = useState<number>();
 const canvas = useRef<HTMLDivElement>(null);
 const latest = useRef(clips); latest.current = clips;
 const total = clips.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0);
 const width = Math.max(640, total * scale + 100);
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
  const source = media.find(item => item.id === sourceId);
  if (!source || !Number.isFinite(source.duration) || source.duration < MIN) return;
  const clip: Clip = { id: crypto.randomUUID(), mediaId: source.id, start: 0, end: source.duration };
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
   next = edge === 'start' ? { ...clip, start: Math.max(0, Math.min(clip.end - MIN, clip.start + delta)) }
    : { ...clip, end: Math.min(source.duration, Math.max(clip.start + MIN, clip.end + delta)) };
   setTrimLabel(`${next.start.toFixed(2)}–${next.end.toFixed(2)}s`);
  };
  const finish = () => {
   button.removeEventListener('pointermove', update); button.removeEventListener('pointerup', finish); button.removeEventListener('pointercancel', cancel);
   setTrimLabel(''); if (next.start !== clip.start || next.end !== clip.end) onChange(latest.current.map(item => item.id === clip.id ? next : item));
  };
  const cancel = () => { button.removeEventListener('pointermove', update); button.removeEventListener('pointerup', finish); button.removeEventListener('pointercancel', cancel); setTrimLabel(''); };
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
  <div className="hub-timeline-toolbar"><strong>Timeline <small>{clips.length} clips · {stamp(total)}</small></strong><div><button disabled={disabled || !clips.length} onClick={onSplit}>Split at playhead</button><label>Zoom <input aria-label="Timeline zoom" type="range" min="0.5" max="40" step="0.5" value={scale} onChange={event => setScale(Number(event.target.value))}/></label></div></div>
  <div className="hub-timeline-scroll"><div className="hub-timeline-canvas" ref={canvas} style={{ width }}>
   <div className="hub-timeline-ruler" onClick={event => { if (!disabled && canvas.current) onSeek(Math.max(0, Math.min(total, (event.clientX - canvas.current.getBoundingClientRect().left) / scale))); }} aria-label="Click time ruler to seek">
    {Array.from({ length: Math.floor(width / (step * scale)) + 1 }, (_, index) => <span key={index} style={{ left: index * step * scale }}>{stamp(index * step)}</span>)}
   </div>
   <div className="hub-timeline-track" onDragOver={event => { if (!disabled) { event.preventDefault(); setDropIndex(clips.length); } }} onDrop={event => drop(event, clips.length)}>
    {clips.map((clip, index) => {
     const start = position; position += Math.max(0, clip.end - clip.start);
     const source = media.find(item => item.id === clip.mediaId);
     return <div key={clip.id} tabIndex={0} role="group" aria-label={`Clip ${index + 1}: ${source?.name || 'Missing source'}. Alt left or right to reorder, Delete to remove.`}
      className={`hub-timeline-clip ${selectedId === clip.id ? 'selected' : ''} ${dragId === clip.id ? 'dragging' : ''} ${dropIndex === index ? 'drop-before' : ''}`}
      style={{ left: start * scale, width: Math.max(2, (clip.end - clip.start) * scale) }} draggable={!disabled}
      onClick={() => onSelect(clip.id)} onFocus={() => onSelect(clip.id)} onKeyDown={event => key(event, clip, index)}
      onDragStart={event => { event.dataTransfer.setData('application/x-hub-clip', clip.id); event.dataTransfer.effectAllowed = 'move'; setDragId(clip.id); }}
      onDragEnd={() => { setDragId(''); setDropIndex(undefined); }}
      onDragOver={event => { if (!disabled) { event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setDropIndex(index + (event.clientX > rect.left + rect.width / 2 ? 1 : 0)); } }}
      onDrop={event => { const rect = event.currentTarget.getBoundingClientRect(); drop(event, index + (event.clientX > rect.left + rect.width / 2 ? 1 : 0)); }}>
      <button className="hub-trim start" disabled={disabled} aria-label={`Trim start of ${source?.name || 'clip'}`} onPointerDown={event => trim(event, clip, 'start')} onClick={event => event.stopPropagation()}>│</button>
      <div className="hub-clip-label"><b>{source?.name || 'Missing source'}</b><small>{clip.start.toFixed(1)}–{clip.end.toFixed(1)}s</small></div>
      <button className="hub-trim end" disabled={disabled} aria-label={`Trim end of ${source?.name || 'clip'}`} onPointerDown={event => trim(event, clip, 'end')} onClick={event => event.stopPropagation()}>│</button>
     </div>;
    })}
    {!clips.length && <p className="hub-timeline-empty">Drag footage here to start your edit.</p>}
    {dropIndex === clips.length && <div className="hub-drop-end" style={{ left: total * scale }}/>} 
   </div>
   <div className="hub-playhead" style={{ left: Math.max(0, Math.min(total, playhead)) * scale }} aria-hidden="true"><span>▼</span></div>
  </div></div>
  <p className="hub-timeline-help" role="status">{trimLabel || 'Drag clips to reorder · Drag edges to trim · Click ruler to seek · Alt + ← / → to reorder · Delete to remove'}</p>
 </section>;
}
export default Timeline;
