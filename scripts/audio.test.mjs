import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/ska00/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.calls=[];window.currentSpeech=null;window.voiceList=[{name:'Korean',voiceURI:'ko',lang:'ko-KR',localService:true},{name:'English A',voiceURI:'en-a',lang:'en-US',localService:true},{name:'English B',voiceURI:'en-b',lang:'en-US',localService:true}];
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  speechSynthesis.getVoices=()=>window.voiceList;
  speechSynthesis.speak=u=>{window.currentSpeech=u;window.calls.push({text:u.text,lang:u.lang,voice:u.voice?.voiceURI,rate:u.rate});};
  speechSynthesis.cancel=()=>{};
  window.finish=()=>{const old=window.currentSpeech;window.currentSpeech=null;old?.onend?.();};
 });
 await page.goto(pathToFileURL(path.resolve('dist/index.html')).href);await page.locator('.card').first().waitFor();
 assert.equal(await page.locator('.lecture-button').count(),5);
 await page.locator('#lecture-all').click();await page.evaluate(()=>{for(let i=0;i<1000&&window.currentSpeech;i++)window.finish();});
 const lectures=await page.evaluate(()=>window.calls);assert.ok(lectures.some(c=>c.lang==='ko-KR'));assert.ok(lectures.some(c=>c.lang==='en-US'));
 const sample=JSON.parse(await fs.readFile('dist/data/starter.json','utf8'));for(const e of sample.expressions)assert.ok(lectures.some(c=>c.text===e.expression));
 assert.equal(await page.locator('#audio-stop').isDisabled(),true);
 await page.locator('.explain-button').first().click();await page.locator('.example-listen').first().click();assert.equal(await page.evaluate(()=>window.calls.at(-1).text),sample.expressions[0].examples[0].en);
 await page.locator('#speed').selectOption('0.75');await page.locator('#reading-listen').click();await page.evaluate(()=>window.finish());const last=await page.evaluate(()=>window.calls.slice(-2));assert.equal(last[0].voice,'en-a');assert.equal(last[1].voice,'en-b');assert.equal(last[1].rate,0.75);assert.equal(await page.locator('.audio-current').count(),1);
 await page.evaluate(()=>window.oldSpeech=window.currentSpeech);await page.locator('#reading-stop').click();const before=await page.evaluate(()=>window.calls.length);await page.evaluate(()=>window.oldSpeech.onend());assert.equal(await page.evaluate(()=>window.calls.length),before);assert.equal(await page.locator('.audio-current').count(),0);
 await page.locator('.lecture-button').first().click();await page.locator('.practice-button').first().click();assert.equal(await page.locator('#audio-stop').isDisabled(),true);await page.locator('#close-practice').click();
 await page.evaluate(()=>window.voiceList=window.voiceList.slice(0,2));await page.locator('#reading-listen').click();assert.match(await page.locator('#notice').textContent(),/같은 목소리/);await page.locator('#reading-stop').click();
 assert.deepEqual(errors,[]);console.log('PASS: 5 lectures bilingual queue, English examples, two speaker voices, slow rate, highlighting, stop cancels queue, Practice interrupts, single-voice fallback. Audio is mocked; real device playback remains device-dependent.');
}finally{await browser.close();}
