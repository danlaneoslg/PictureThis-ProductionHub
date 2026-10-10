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

test('independent audio fades leave source video unchanged',()=>{
 const filters=clipFilters({start:10,end:14,effects:{audioFadeIn:1,audioFadeOut:2}},640,360);
 assert.doesNotMatch(filters.video,/fade=/);
 assert.equal(filters.audio,'asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1,afade=t=out:st=2:d=2');
});
test('audio fades combine with linked fades and transitions once per boundary',()=>{
 const filters=clipFilters({start:0,end:4,effects:{fadeIn:1,audioFadeIn:2,audioFadeOut:.5},transition:{type:'fade-black',duration:1.5}},640,360);
 assert.match(filters.video,/fade=t=in:st=0:d=1/);
 assert.match(filters.audio,/afade=t=in:st=0:d=2/);
 assert.match(filters.audio,/afade=t=out:st=2.5:d=1.5/);
 assert.equal((filters.audio.match(/afade=/g)||[]).length,2);
});
test('independent audio durations reject invalid values and allow exact clip length',()=>{
 for(const key of ['audioFadeIn','audioFadeOut']){
  for(const value of [-1,4.01,Infinity,NaN,'1'])assert.throws(()=>validateEffects({start:5,end:9,effects:{[key]:value}}));
  assert.doesNotThrow(()=>validateEffects({start:5,end:9,effects:{[key]:4}}));
 }
});
