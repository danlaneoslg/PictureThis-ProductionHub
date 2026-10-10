import test from 'node:test';
import assert from 'node:assert/strict';
import {clipFilters,validateEffects} from '../electron/effects.mjs';
test('legacy clips preserve neutral video and audio',()=>{
 const filters=clipFilters({start:3,end:7},640,360);
 assert.equal(filters.audio,'asetpts=PTS-STARTPTS');
 assert.doesNotMatch(filters.video,/eq=|fade=/);
});
test('rejects unsupported and out-of-range effects before rendering',()=>{
 for(const effects of [{volume:3},{brightness:NaN},{contrast:0},{fadeIn:5},{speed:2},null])assert.throws(()=>validateEffects({start:0,end:4,effects}));
 assert.throws(()=>validateEffects({start:0,end:4,transition:{type:'dissolve',duration:1}}));
});
test('fade-black applies both sides without changing timing and caps short clips',()=>{
 const clip={start:2,end:4,effects:{brightness:.1,volume:.5},transition:{type:'fade-black',duration:2}};
 const filters=clipFilters(clip,640,360,{type:'fade-black',duration:5});
 assert.match(filters.video,/fade=t=in:st=0:d=1/);
 assert.match(filters.video,/fade=t=out:st=1:d=1/);
 assert.match(filters.audio,/volume=0.5,afade=t=in/);
 assert.doesNotMatch(filters.video,/trim|setpts=.*[*/]/);
});

