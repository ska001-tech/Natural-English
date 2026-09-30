import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
const index = await json('dist/data/index.json');
for (const file of new Set([index.default, ...Object.values(index.days)])) {
 const data = await json(`dist/data/${file}`);
 assert.equal(data.expressions.length, 5);
 assert.equal(new Set(data.expressions.map(e => e.id)).size, 5);
 const text = data.reading.sentences.map(s => s.en).join(' ');
 const words = text.split(/\s+/).length;
 assert.ok(words >= 300 && words <= 400, `Reading has ${words} words`);
 assert.ok(data.reading.sentences.every(s => s.ko && s.en));
 for (const v of data.vocabulary) for (const match of v.matches) assert.ok(text.toLowerCase().includes(match.toLowerCase()), `Missing vocabulary: ${match}`);
 assert.ok(data.expressions.filter(e => /Young|Slang/.test(e.category)).every(e => e.explanation.recommendation.includes('알아듣는 정도면 충분')));
 console.log(`${file}: 5 expressions, ${words} reading words, ${data.vocabulary.length} vocabulary entries, translations OK`);
}
const manifest = await json('dist/manifest.webmanifest');
for (const icon of manifest.icons) { const buffer = await readFile(`dist/${icon.src}`); const expected = Number(icon.sizes.split('x')[0]); assert.equal(buffer.readUInt32BE(16), expected); assert.equal(buffer.readUInt32BE(20), expected); }
console.log('PWA manifest icons OK');
