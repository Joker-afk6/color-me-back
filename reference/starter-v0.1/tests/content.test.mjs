import test from 'node:test';
import assert from 'node:assert/strict';
import {COLORS, MIXES, CHAPTERS, STORAGE_KEY, INTRO, ENDING} from '../src/content.js';

test('all required colors have well-formed hexadecimal palettes', () => {
 assert.deepEqual(Object.keys(COLORS).sort(), ['blue','green','orange','purple','red','yellow']);
 for(const [name,hex] of Object.entries(COLORS)) assert.match(hex,/^#[0-9a-fA-F]{6}$/,'bad hex: '+name);
});

test('all primary paint combinations produce distinct permitted secondary colors', () => {
 const expected=new Map([['blue+red','purple'],['red+yellow','orange'],['blue+yellow','green']]);
 for (const {a,b,result} of MIXES){
  const key=[a,b].sort().join('+');
  assert.equal(result,expected.get(key),`Unexpected paint combination ${key}`);
  expected.delete(key);
 }
 assert.equal(expected.size,0,'missing required mix');
});

test('chapters are in story order with no duplicate level IDs',()=>{
 assert.deepEqual(CHAPTERS.map(c=>c.id),['village','red','blue','yellow','prism']);
 assert.equal(new Set(CHAPTERS.map(c=>c.id)).size,CHAPTERS.length);
 for(const c of CHAPTERS){assert.ok(c.goal>0);assert.ok(c.objective);assert.ok(c.lines.entry);}
});

test('main color guardians are unique and in correct order',()=>{
 assert.deepEqual(CHAPTERS.filter(c=>c.primary).map(c=>c.primary),['red','blue','yellow']);
});

test('dialogue and storage key are defined',()=>{
 assert.ok(Array.isArray(INTRO)&&INTRO.length>=2);
 assert.ok(Array.isArray(ENDING)&&ENDING.length>=2);
 assert.match(STORAGE_KEY,/color-me-back/);
});
