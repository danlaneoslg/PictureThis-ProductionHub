import test from 'node:test';
import assert from 'node:assert/strict';
import {correctTranscript} from '../electron/transcript-edit.mjs';
test('corrections retain timing and the first original text across repeated changes',()=>{
 const original=[{mediaId:'one',start:3,end:7,text:'Wrong text'},{mediaId:'two',start:1,end:2,text:'Keep'}];
 const corrected=correctTranscript(correctTranscript(original,0,'First fix'),0,' Final fix ');
 assert.deepEqual(corrected[0],{mediaId:'one',start:3,end:7,text:'Final fix',originalText:'Wrong text'});
 assert.deepEqual(corrected[1],original[1]);assert.equal(original[0].text,'Wrong text');
});
test('invalid corrections leave segments untouched',()=>{
 const segments=[{text:'Keep'}];
 for(const [index,text] of [[-1,'x'],[1,'x'],[0,' '],[0,'x'.repeat(10001)]])assert.throws(()=>correctTranscript(segments,index,text));
 assert.equal(segments[0].text,'Keep');
});
