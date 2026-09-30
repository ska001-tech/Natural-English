import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/ska00/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:900,height:500}});
 await page.addInitScript(()=>{window.stops={mic:0,tts:0};window.SpeechRecognition=class{start(){}abort(){window.stops.mic++;}};speechSynthesis.cancel=()=>window.stops.tts++;});
 await page.goto(pathToFileURL(path.resolve('dist/index.html')).href);
 await page.locator('.practice-button').first().click();
 await page.locator('#close-practice').click();assert.equal(await page.locator('#practice').isVisible(),false);
 await page.locator('.practice-button').first().click();
 for(let count=1;count<=3;count++){await page.locator('#manual').click();await page.waitForFunction(n=>document.getElementById('practice-count').textContent.startsWith(n+' /'),count);}
 await page.locator('#practice').evaluate(dialog=>dialog.scrollTop=dialog.scrollHeight);
 const bounds=await page.locator('#close-practice').boundingBox();assert.ok(bounds.y>=0 && bounds.y+bounds.height<=500);
 await page.locator('#close-practice').click();assert.equal(await page.locator('#practice').isVisible(),false);
 await page.locator('.practice-button').first().click();assert.match(await page.locator('#practice-count').textContent(),/^3 \/ 5/);
 for(let count=4;count<=5;count++){await page.locator('#manual').click();await page.waitForFunction(n=>document.getElementById('practice-count').textContent.startsWith(n+' /'),count);}
 await page.locator('#finish-practice').click();assert.equal(await page.locator('#practice').isVisible(),false);
 await page.locator('.practice-button').first().click();await page.locator('#reset-practice').click();await page.waitForFunction(()=>document.getElementById('practice-count').textContent.startsWith('0 /'));
 await page.locator('#recognize').click();const before=await page.evaluate(()=>({...window.stops}));await page.locator('#close-practice').click();await page.waitForFunction(n=>window.stops.mic>n,before.mic);assert.ok(await page.evaluate(n=>window.stops.tts>n,before.tts));
 await page.locator('.practice-button').first().click();await page.keyboard.press('Escape');assert.equal(await page.locator('#practice').isVisible(),false);
 console.log('PASS: X closes at 0/5 and 3/5; progress preserved; sticky close visible after scroll; finish closes at 5/5; microphone and TTS stop; Escape closes.');
}finally{await browser.close();}
