import test from 'node:test';
import assert from 'node:assert/strict';
import { CAP, quote, reserve, validateClip } from '../electron/core.mjs';
const config={model:'configured-model',inputRate:1,outputRate:5};
test('project cap includes previous calls and in-flight reservations',()=>{const project={ledger:[{cost:CAP-50}]};assert.throws(()=>reserve(project,{reserved:51}),/cap/);reserve(project,{reserved:50});assert.throws(()=>reserve(project,{reserved:1}),/cap/);});
test('restart retains uncertain charges',()=>{const p={ledger:[]};reserve(p,{reserved:600000});const reloaded=JSON.parse(JSON.stringify(p));assert.throws(()=>reserve(reloaded,{reserved:400001}),/cap/);});
test('quotes budget UTF-8 bytes, output limit and prompt overhead',()=>{const q=quote('你好',config);assert.equal(q.inputTokens,4102);assert.equal(q.outputTokens,4096);assert.equal(q.reserved,24582);assert.equal(q.key,quote('你好',config).key);assert.notEqual(q.key,quote('你好',{...config,model:'other'}).key);});
test('bad pricing and clip boundaries fail closed',()=>{assert.throws(()=>quote('text',{...config,inputRate:0}));assert.throws(()=>validateClip({start:0,end:11},{duration:10}));assert.throws(()=>validateClip({start:3,end:2},{duration:10}));assert.throws(()=>reserve({ledger:[]},{reserved:NaN}));});
