import test from 'node:test';
import assert from 'node:assert/strict';
import { waveformPeaks, generateMediaVisuals } from '../electron/media-visuals.mjs';
test('waveform bins preserve normalized peaks', () => {
 const pcm = Buffer.alloc(8); [0,16384,-32768,8192].forEach((v,i)=>pcm.writeInt16LE(v,i*2));
 assert.deepEqual(waveformPeaks(pcm,2),[0.5,1]); assert.deepEqual(waveformPeaks(Buffer.alloc(0)),[]);
});
test('invalid durations are rejected before spawning', async()=>{
 for(const duration of [0,NaN,21601]) await assert.rejects(generateMediaVisuals({duration},{}),/six hours/);
});
