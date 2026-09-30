import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/ska00/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve('test-results');await fs.mkdir(output,{recursive:true});
const results=[];
for(const channel of ['chrome','msedge']){
 const profile=await fs.mkdtemp(path.join(output,'browser-profile-'));
 let context;
 const options={channel,headless:true,acceptDownloads:true};
 try{
  context=await chromium.launchPersistentContext(profile,options);
  let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=pathToFileURL(path.resolve('dist/index.html')).href;
  await page.goto(url);await page.locator('.card').first().waitFor();
  const chooser=page.waitForEvent('filechooser');await page.locator('#import-lesson').click();
  await (await chooser).setFiles(path.resolve('Natural-English-Sample.json'));
  await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('2026년 9월 13일 교재를 불러왔습니다.'));
  assert.equal(await page.locator('.card').count(),5);
  await page.locator('.favorite').first().click();await page.waitForFunction(()=>document.querySelector('.favorite').getAttribute('aria-pressed')==='true');
  await page.locator('.practice-button').first().click();await page.locator('#manual').click();await page.waitForFunction(()=>document.querySelector('#practice-count').textContent.startsWith('1 /'));await page.locator('#close-practice').click();
  await page.locator('#settings-button').click();
  const restoreChooser=page.waitForEvent('filechooser');await page.locator('#restore-library').click();await (await restoreChooser).setFiles([]);
  await page.locator('#close-settings').click();
  await context.close();context=await chromium.launchPersistentContext(profile,options);page=await context.newPage();await page.goto(url);await page.locator('.card').first().waitFor();
  assert.equal(await page.locator('#library-button').textContent(),'2026-09-13 ▼');assert.equal(await page.locator('.favorite').first().getAttribute('aria-pressed'),'true');
  await page.locator('.practice-button').first().click();assert.match(await page.locator('#practice-count').textContent(),/^1 \/ 5/);
  assert.deepEqual(errors,[]);
  results.push({browser:channel,status:'PASS',checks:['file:// startup','button click opens file chooser','sample selected through chooser and imported','Settings restore chooser','favorites and practice survive full browser restart']});console.log('PASS '+channel+' direct index.html + chooser + Import + restart');
 }finally{await context?.close();await fs.writeFile(path.join(output,'file-import-results.json'),JSON.stringify(results,null,2));}
}
