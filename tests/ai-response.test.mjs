import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHighlights } from '../electron/ai-response.mjs';
const media=[{id:'source',duration:10}];
const item={mediaId:'source',start:1,end:3,text:'Moment',score:80,reason:'Good hook'};
const response=text=>({content:[{type:'text',text}],stop_reason:'end_turn'});
test('plain JSON and Markdown fenced JSON produce the same validated highlights',()=>{
 const json=JSON.stringify([item]);
 assert.deepEqual(parseHighlights(response(json),media),[item]);
 assert.deepEqual(parseHighlights(response('```json\n'+json+'\n```'),media),[item]);
 assert.deepEqual(parseHighlights(response('```\n'+json+'\n```'),media),[item]);
});
test('truncated and malformed replies fail without returning partial suggestions',()=>{
 assert.throws(()=>parseHighlights({...response('[]'),stop_reason:'max_tokens'},media),/cut short/);
 assert.throws(()=>parseHighlights(response('```json\n[{'),media),/unreadable/);
 assert.throws(()=>parseHighlights(response('{}'),media),/invalid/);
});
test('cut-short response recovers only complete validated objects including braces in quoted text',()=>{
 const first={...item,text:'A "quote" and a } brace'};
 const text='```json\n['+JSON.stringify(first)+', {"mediaId":"source","text":"unfinished';
 assert.deepEqual(parseHighlights({...response(text),stop_reason:'max_tokens'},media),[first]);
});
test('unknown sources, invalid boundaries and scores are rejected',()=>{
 for(const changes of [{mediaId:'other'},{end:11},{score:101},{score:'80'}])assert.throws(()=>parseHighlights(response(JSON.stringify([item,{...item,...changes}])),media));
});
