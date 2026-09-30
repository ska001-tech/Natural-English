import {parseImport, validateLesson, normalize, recommendationLabels} from './data-model.js';
import * as db from './library-db.js';
const $ = (id) => document.getElementById(id);
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { notify('저장 공간을 사용할 수 없어 이번 변경은 유지되지 않습니다.'); } }
};
let library = [], progressMap = new Map(), dbAvailable = false, writeBusy = false;
let settings = storage.get('ne-settings', {});
if (!settings || typeof settings !== 'object') settings = {};
let lesson, selectedWord, favoritesOnly = false, currentExpression, repetitions = 0, recognition = null, noticeTimer;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function notify(message) { $('notice').textContent = message; $('notice').hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').hidden = true, 6500); }
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function button(text, handler, className) { const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', handler); return node; }
function saveSettings() { storage.set('ne-settings', settings); }
$('speed').value = settings.speed === '0.75' ? '0.75' : '1';
$('speed').onchange = () => { settings.speed = $('speed').value; saveSettings(); };
function speak(text) {
  if (!('speechSynthesis' in window)) return notify('이 브라우저는 음성 읽기를 지원하지 않습니다.');
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  speech.voice = voices.find(v => /^en-US$/i.test(v.lang) && v.localService) || voices.find(v => /^en-US$/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
  speech.lang = 'en-US'; speech.rate = Number($('speed').value);
  speech.onerror = (event) => { if (!['interrupted', 'canceled'].includes(event.error)) notify('음성을 재생할 수 없습니다. 기기의 영어 음성 설정과 연결을 확인하세요.'); };
  window.speechSynthesis.speak(speech);
}
if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
function keyFor(expression) { return JSON.stringify([expression.date,expression.id]); }
function stateFor(expression) { return progressMap.get(keyFor(expression)) || {date:expression.date,expressionId:expression.id,practiceCount:0,favorite:false,completed:false}; }
let progressWrites=Promise.resolve();
function persistProgress(expression, changes) {
  const pending=progressWrites.then(()=>commitProgress(expression,changes));progressWrites=pending.catch(()=>{});return pending;
}
async function commitProgress(expression, changes) {
  if (!dbAvailable) {notify('기기 저장소를 사용할 수 없습니다. 진도가 저장되지 않았습니다.');return false;}
  const state={...stateFor(expression),...changes};
  try { await db.saveProgress(state);progressMap.set(keyFor(expression),state);$('save-status').textContent='기기에 저장됨';return true; }
  catch {notify('진도 저장에 실패했습니다. 저장 공간을 확인하고 다시 시도하세요.');$('save-status').textContent='저장 실패';return false;}
}
function renderCards() {
  if(!lesson)return;
  const container = $('expressions'); container.replaceChildren();
  const entries = favoritesOnly ? library.flatMap(d => normalize(d).expressions).filter(e => stateFor(e).favorite) : lesson.expressions;
  $('favorite-count').textContent = [...progressMap.values()].filter(p => p.favorite).length;
  $('favorites').setAttribute('aria-pressed', favoritesOnly);
  $('favorite-empty').hidden = entries.length > 0;
  $('expressions-title').firstChild.textContent = favoritesOnly ? 'Favorite Expressions ' : "Today's Expressions ";
  $('expressions-title').querySelector('.count').textContent = entries.length;
  entries.forEach((expression, index) => {
    const card = el('article', undefined, 'card');
    const content = el('div', undefined, 'card-content');
    const top = el('div', undefined, 'card-top');
    const favorite = button(stateFor(expression).favorite ? '★' : '☆', async () => {
      favorite.disabled=true;
      if(await persistProgress(expression,{favorite:!stateFor(expression).favorite})) {
        favorite.textContent=stateFor(expression).favorite?'★':'☆';favorite.setAttribute('aria-pressed',stateFor(expression).favorite);
        $('favorite-count').textContent=[...progressMap.values()].filter(p=>p.favorite).length;
        if(favoritesOnly){renderCards();$('favorites').focus();}
      }
      favorite.disabled=false;
    }, 'favorite');
    favorite.setAttribute('aria-label', expression.expression+' 즐겨찾기'); favorite.setAttribute('aria-pressed', stateFor(expression).favorite);
    top.append(el('span', String(index + 1).padStart(2, '0'), 'card-number'), favorite);
    const badge = el('span', expression.category, `badge ${/Young|Slang/.test(expression.category) ? 'slang' : expression.category === 'Casual' ? 'casual' : ''}`);
    const title = el('h3', expression.expression); title.lang = 'en';
    const actions = el('div', undefined, 'card-actions');
    actions.append(button('▶ Listen', () => speak(expression.expression)), button('◉ Practice', () => openPractice(expression), 'practice-button'));
    const recommendation=el('p',recommendationLabels[expression.recommendation],'recommendation');
    const mini=el('p', '● '.repeat(stateFor(expression).practiceCount)+'○ '.repeat(5-stateFor(expression).practiceCount)+' '+stateFor(expression).practiceCount+' / 5', 'card-progress');
    const completed=button(stateFor(expression).completed?'✓ 학습 완료':'학습 완료로 표시',async()=>{completed.disabled=true;if(await persistProgress(expression,{completed:!stateFor(expression).completed})){completed.textContent=stateFor(expression).completed?'✓ 학습 완료':'학습 완료로 표시';completed.setAttribute('aria-pressed',stateFor(expression).completed);}completed.disabled=false;},'complete-button');
    completed.setAttribute('aria-pressed',stateFor(expression).completed);
    content.append(top,badge,title,el('p',expression.meaning,'meaning'),recommendation,actions,mini,completed);
    if(favoritesOnly) content.append(el('p',expression.date,'muted'));
    const explanation = el('div', undefined, 'explanation'); explanation.id = `explanation-${index}`; explanation.hidden = true;
    const details = el('dl');
    const labels = { meaning: '실제 의미', nuance: '뉘앙스', situation: '사용 상황', age: '연령대', formality: '격식 수준', recommendation: '직접 사용해도 될까요?' };
    for (const [key, label] of Object.entries(labels)) details.append(el('dt', label), el('dd', expression.explanation[key]));
    details.append(el('dt','사용 성격'),el('dd',expression.usageLevel));explanation.append(details);
    for(const item of expression.examples){const example=el('blockquote',item.en);example.lang='en';explanation.append(example,el('p',item.ko,'muted'));}
    const explain = button('Explain ＋', () => { explanation.hidden = !explanation.hidden; explain.setAttribute('aria-expanded', !explanation.hidden); explain.textContent = explanation.hidden ? 'Explain ＋' : 'Explain −'; }, 'explain-button');
    explain.setAttribute('aria-expanded', false); explain.setAttribute('aria-controls', explanation.id);
    card.append(content, explain, explanation); container.append(card);
  });
}
$('favorites').onclick = () => { if (!lesson) return; favoritesOnly = !favoritesOnly; renderCards(); };
function highlight(text, container) {
  const candidates = lesson.vocabulary.flatMap(v => v.matches.map(match => ({ match, id: v.id })));
  let offset = 0;
  while (offset < text.length) {
    let found;
    for (const candidate of candidates) {
      const index = text.toLowerCase().indexOf(candidate.match.toLowerCase(), offset);
      if (index >= 0 && (!found || index < found.index || (index === found.index && candidate.match.length > found.match.length))) found = { ...candidate, index };
    }
    if (!found) { container.append(document.createTextNode(text.slice(offset))); break; }
    container.append(document.createTextNode(text.slice(offset, found.index)));
    const word = button(text.slice(found.index, found.index + found.match.length), () => showVocabulary(found.id, true), 'word');
    word.dataset.word = found.id; word.setAttribute('aria-pressed', found.id === selectedWord); word.setAttribute('aria-controls', 'vocabulary');
    container.append(word); offset = found.index + found.match.length;
  }
}
function renderReading() {
  $('story-title').textContent = lesson.reading.title; $('story-title').lang = 'en';
  const words = lesson.reading.sentences.map(s => s.en).join(' ').split(/\s+/).length;
  $('story-description').textContent = `${lesson.reading.description} · ${words} words`;
  const container = $('reading'); container.replaceChildren();
  lesson.reading.sentences.forEach(sentence => {
    const passage = el('div', undefined, 'passage');
    const english = el('p', undefined, 'english'); english.lang = 'en'; highlight(sentence.en, english);
    const korean = el('p', sentence.ko, 'korean'); korean.lang = 'ko'; korean.hidden = !settings.bilingual;
    passage.append(el('div', sentence.speaker, 'speaker'), english, korean); container.append(passage);
  });
  updateTranslation();
}
function updateTranslation() { $('english-only').setAttribute('aria-pressed', !settings.bilingual); $('bilingual').setAttribute('aria-pressed', !!settings.bilingual); document.querySelectorAll('.korean').forEach(n => n.hidden = !settings.bilingual); }
$('english-only').onclick = () => { settings.bilingual = false; saveSettings(); updateTranslation(); };
$('bilingual').onclick = () => { settings.bilingual = true; saveSettings(); updateTranslation(); };
function showVocabulary(id, scroll = false) {
  const item = lesson.vocabulary.find(v => v.id === id); if (!item) return;
  selectedWord = id; const panel = $('vocabulary'); panel.replaceChildren();
  const title = el('h3', item.term); title.lang = 'en';
  const example = el('p', item.example, 'example'); example.lang = 'en';
  panel.append(el('p', 'EXPRESSION NOTES', 'eyebrow'), title, el('p', item.pronunciation, 'phonetic'), el('p', item.meaning, 'vocab-meaning'), button('▶ Listen', () => speak(item.term)), el('hr'), el('h4', '이 문장에서는'), el('p', item.context), el('h4', 'ANOTHER EXAMPLE'), example, el('p', item.exampleKo, 'muted'), el('p', '이야기 속 다른 표현도 눌러보세요.', 'vocab-tip'));
  document.querySelectorAll('.word').forEach(n => n.setAttribute('aria-pressed', n.dataset.word === id));
  if (scroll) { panel.tabIndex = -1; panel.focus({ preventScroll: true }); panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function stopRecognition() { if (recognition) { const previous = recognition; recognition = null; previous.abort(); } $('recognize').textContent = '마이크로 말하기'; $('manual').disabled = repetitions >= 5 || writeBusy; }
function updateProgress() {
  $('progress').replaceChildren(...Array.from({ length: 5 }, (_, i) => el('span', undefined, i < repetitions ? 'done' : '')));
  $('progress').setAttribute('aria-label', `5회 중 ${repetitions}회 완료`);
  $('practice-count').textContent = repetitions === 5 ? '5 / 5 · 오늘도 한 문장을 내 것으로 만들었어요.' : `${repetitions} / 5회 완료`;
  $('manual').disabled = repetitions >= 5 || !!recognition || writeBusy; $('recognize').disabled = !Recognition || repetitions >= 5 || writeBusy;
}
function openPractice(expression) {
  stopRecognition(); window.speechSynthesis?.cancel(); currentExpression = expression; repetitions = stateFor(expression).practiceCount;
  $('practice-sentence').textContent = expression.practice; $('practice-meaning').textContent = expression.meaning;
  $('transcript').textContent = '말한 내용이 여기에 표시됩니다.';
  $('recognition-note').textContent = Recognition ? '마이크로 한 번 말하면 1회가 기록됩니다. 음성인식은 인터넷이 필요할 수 있으며 음성이 브라우저 제공업체로 전송될 수 있습니다. 인식 결과는 발음 점수가 아닙니다.' : '이 브라우저는 음성인식을 지원하지 않습니다. 소리 내어 읽은 뒤 “한 번 말했어요”를 누르세요.';
  updateProgress(); $('practice').showModal(); $('practice').scrollTop=0;
}
$('close-practice').onclick = $('finish-practice').onclick = () => $('practice').close();
$('practice').addEventListener('close', () => { stopRecognition(); window.speechSynthesis?.cancel(); renderCards(); });
$('practice-listen').onclick = () => { stopRecognition(); speak(currentExpression.practice); };
async function recordPractice(count){
  if(writeBusy)return;const expression=currentExpression;writeBusy=true;updateProgress();$('reset-practice').disabled=true;
  try {if(await persistProgress(expression,{practiceCount:count,completed:count===5}) && currentExpression===expression)repetitions=count;}
  finally{writeBusy=false;updateProgress();$('reset-practice').disabled=false;if(!$('practice').open)renderCards();}
}
$('manual').onclick = () => { if(!recognition&&repetitions<5)recordPractice(repetitions+1); };
$('reset-practice').onclick = () => { stopRecognition(); recordPractice(0); $('transcript').textContent = '말한 내용이 여기에 표시됩니다.'; };
$('recognize').onclick = () => {
  if (recognition) { stopRecognition(); return; }
  if (!Recognition || repetitions >= 5) return;
  window.speechSynthesis?.cancel();
  const session = new Recognition(); recognition = session;
  session.lang = 'en-US'; session.interimResults = true; session.continuous = false;
  let counted = false;
  $('recognize').textContent = '말하기 중지'; $('manual').disabled = true; $('transcript').textContent = '듣고 있어요…';
  session.onresult = event => {
    if (recognition !== session) return;
    $('transcript').textContent = Array.from(event.results).map(r => r[0].transcript).join(' ');
    if (!counted && Array.from(event.results).some(r => r.isFinal && r[0].transcript.trim())) { counted = true; recordPractice(Math.min(5,repetitions+1)); }
  };
  session.onerror = event => {
    if (recognition !== session) return;
    const messages = { 'not-allowed': '마이크 권한이 허용되지 않았습니다.', 'audio-capture': '사용 가능한 마이크가 없습니다.', 'network': '음성인식 서비스에 연결할 수 없습니다.', 'no-speech': '음성이 들리지 않았습니다.', 'language-not-supported': '영어 음성인식을 사용할 수 없습니다.' };
    $('transcript').textContent = `${messages[event.error] || '음성인식을 완료하지 못했습니다.'} 수동으로 연습을 기록할 수 있습니다.`;
  };
  session.onend = () => { if (recognition !== session) return; recognition = null; $('recognize').textContent = '마이크로 말하기'; updateProgress(); };
  try { session.start(); } catch { stopRecognition(); $('transcript').textContent = '마이크를 시작할 수 없습니다. 수동 연습을 이용하세요.'; }
};
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
async function getJSON(path) { const response = await fetch(path, { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }
// Library initialization and navigation are below.
function connection() { $('connection').textContent = navigator.onLine ? '온라인' : '오프라인'; }
window.addEventListener('online', connection); window.addEventListener('offline', connection); connection();
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install').hidden = false; });
$('install').onclick = async () => { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('install').hidden = true; };
window.addEventListener('appinstalled', () => { $('install').hidden = true; notify('홈 화면에 Natural English가 설치되었습니다.'); });
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}).then(() => navigator.serviceWorker.ready).then(() => { $('offline-status').textContent = '오프라인 읽기 준비 완료'; }).catch(() => { $('offline-status').textContent = '오프라인 저장 불가'; });
} else { $('offline-status').textContent = 'PWA 설치는 HTTPS 또는 localhost에서 가능'; }
initialize();
async function refreshLibrary() {
  const data=await db.snapshot();
  library=data.lessons.sort((a,b)=>a.date.localeCompare(b.date));
  progressMap=new Map(data.progress.map(p=>[JSON.stringify([p.date,p.expressionId]),p]));
  return data;
}
function renderNavigation() {
  const index=library.findIndex(d=>d.date===lesson?.date);
  $('library-button').textContent=lesson?`${lesson.date} ▼`:'교재 Library ▼';
  $('previous-day').disabled=index<=0;
  $('next-day').disabled=index<0||index>=library.length-1;
  $('favorite-count').textContent=[...progressMap.values()].filter(p=>p.favorite).length;
}
async function selectLesson(date) {
  const selected=library.find(d=>d.date===date);
  if(!selected){showEmpty();return;}
  stopRecognition();window.speechSynthesis?.cancel();
  lesson=normalize(selected);favoritesOnly=false;
  $('date').textContent=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(date+'T12:00:00'));
  $('lesson-label').textContent=lesson.label;
  selectedWord=lesson.vocabulary[0].id;renderCards();renderReading();showVocabulary(selectedWord);renderNavigation();
  try {await db.setMeta('selectedDate',date);}catch{notify('마지막 선택 날짜를 저장하지 못했습니다.');}
}
function showEmpty() {
  lesson=null;favoritesOnly=false;
  $('expressions').replaceChildren(el('p','저장된 교재가 없습니다. “오늘 교재 불러오기”로 JSON 파일을 선택하세요.'));
  $('favorite-empty').hidden=true;$('reading').replaceChildren();$('vocabulary').replaceChildren(el('p','교재를 불러오면 표현을 확인할 수 있어요.'));
  $('story-title').textContent='나의 영어 교재';$('story-description').textContent='Settings에서 표준 샘플 파일을 내려받을 수 있습니다.';
  $('date').textContent='';$('lesson-label').textContent='';$('expressions-title').firstChild.textContent="Today's Expressions ";$('expressions-title').querySelector('.count').textContent='0';$('favorites').setAttribute('aria-pressed',false);renderNavigation();
}
$('previous-day').onclick=()=>{const i=library.findIndex(d=>d.date===lesson?.date);if(i>0)selectLesson(library[i-1].date);};
$('next-day').onclick=()=>{const i=library.findIndex(d=>d.date===lesson?.date);if(i>=0&&i<library.length-1)selectLesson(library[i+1].date);};
function renderLibrary() {
  const list=$('library-list');list.replaceChildren();
  if(!library.length)list.append(el('p','아직 보관한 교재가 없습니다.'));
  for(const item of [...library].reverse()) {
    const row=el('div',undefined,'library-row');
    const choose=button(`${item.date} · ${item.title}`,()=>{selectLesson(item.date);$('library-dialog').close();},'library-choose');
    choose.setAttribute('aria-current',item.date===lesson?.date?'date':'false');
    const completed=item.expressions.filter(e=>progressMap.get(JSON.stringify([item.date,e.id]))?.completed).length;
    const remove=button('삭제',async()=>{
      if(!confirm('이 교재를 삭제하시겠습니까?\n'+item.date+'\n교재와 해당 날짜의 진도·즐겨찾기가 삭제됩니다.'))return;
      remove.disabled=true;
      try{const selected=lesson?.date;await db.deleteLesson(item.date);await refreshLibrary();await selectLesson(library.some(l=>l.date===selected)?selected:library.at(-1)?.date);renderLibrary();notify('교재를 삭제했습니다.');}
      catch{notify('교재 삭제에 실패했습니다. 다시 시도하세요.');remove.disabled=false;}
    },'danger');remove.setAttribute('aria-label',item.date+' 교재 삭제');
    row.append(choose,el('span',`완료 ${completed} / 5`,'muted'),remove);list.append(row);
  }
}
$('library-button').onclick=()=>{renderLibrary();$('library-dialog').showModal();};
$('close-library').onclick=()=>$('library-dialog').close();
$('settings-button').onclick=()=>{$('settings-dialog').showModal();storageStatus();};
$('close-settings').onclick=()=>$('settings-dialog').close();
async function storageStatus(){
  try {const persisted=await navigator.storage?.persisted?.();$('storage-status').textContent=persisted?'기기 저장 보호가 허용되었습니다. 데이터 직접 삭제에 대비한 백업은 필요합니다.':'기기에 저장 중입니다. 저장 보호를 요청하고 정기적으로 백업하세요.';}
  catch{$('storage-status').textContent='이 브라우저에서는 저장 보호 상태를 확인할 수 없습니다.';}
}
$('persist-storage').onclick=async()=>{
  try{const protectedStorage=await navigator.storage?.persist?.();notify(protectedStorage?'기기 저장 보호가 허용되었습니다.':'브라우저가 저장 보호를 허용하지 않았습니다. 백업 파일을 보관하세요.');await storageStatus();}
  catch{notify('이 브라우저에서는 저장 보호를 요청할 수 없습니다.');}
};
$('import-lesson').onclick=()=>$('import-file').click();
$('restore-library').onclick=()=>$('restore-file').click();
$('import-file').onchange=$('restore-file').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  $('import-lesson').disabled=true;$('restore-library').disabled=true;
  try {
    if(!dbAvailable)throw new Error('기기 저장소를 사용할 수 없습니다. 일반 브라우저 모드에서 다시 열어주세요.');
    if(file.size>20*1024*1024)throw new Error('파일은 20MB 이하여야 합니다.');
    const parsed=parseImport(await file.text());
    await refreshLibrary();
    let selectedDate,message;
    if(parsed.type==='lesson'){
      const material=parsed.lesson;
      if(library.some(l=>l.date===material.date)&&!confirm(`${material.date} 교재가 이미 있습니다. 새 교재로 교체하시겠습니까?\n동일한 표현의 진도는 유지됩니다.`))return;
      await db.importLessons([material]);selectedDate=material.date;
      message=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(material.date+'T12:00:00'))+' 교재를 불러왔습니다.';
    }else{
      if(!parsed.lessons.length)throw new Error('복원할 교재가 없는 백업입니다.');
      if(!confirm(`${parsed.lessons.length}개 교재와 진도를 복원하시겠습니까?\n겹치는 날짜의 교재·진도는 백업 내용으로 교체됩니다. 다른 날짜는 유지됩니다.`))return;
      await db.importLessons(parsed.lessons,parsed.progress);selectedDate=parsed.lessons.map(l=>l.date).sort().at(-1);message=`${parsed.lessons.length}개 교재와 학습 진행상황을 복원했습니다.`;
    }
    await refreshLibrary();await selectLesson(selectedDate);
    $('settings-dialog').close();$('import-status').textContent=message;$('import-status').hidden=false;$('import-status').className='success';notify(message);
    // Request storage persistence on an explicit file import gesture; no permission is assumed.
    navigator.storage?.persist?.().catch(()=>{});
  }catch(error){const message='불러오기 실패: '+error.message;$('import-status').textContent=message;$('import-status').hidden=false;$('import-status').className='error';notify(message);}
  finally{event.target.value='';$('import-lesson').disabled=false;$('restore-library').disabled=false;}
};
$('export-library').onclick=async()=>{
  $('export-library').disabled=true;
  try{
    const data=await db.snapshot();
    const backup={type:'natural-english-backup',version:1,exportedAt:new Date().toISOString(),lessons:data.lessons,progress:data.progress};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=el('a');link.href=url;link.download=`Natural-English-Backup-${localDate()}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    notify(`${data.lessons.length}개 교재와 진도 백업 다운로드를 요청했습니다.`);
  }catch{notify('백업을 만들지 못했습니다. 저장소 상태를 확인하세요.');}
  finally{$('export-library').disabled=false;}
};
$('delete-all').onclick=async()=>{
  if(!confirm('모든 교재와 학습 진행상황을 삭제하시겠습니까?\n먼저 학습자료 백업을 권장합니다.'))return;
  if(prompt('최종 확인: 아래에 “전체 삭제”를 입력하세요.')!=='전체 삭제')return;
  $('delete-all').disabled=true;
  try{await db.clearLibrary();await refreshLibrary();showEmpty();$('settings-dialog').close();notify('모든 교재와 학습 진행상황을 삭제했습니다.');}
  catch{notify('전체 삭제에 실패했습니다. 다시 시도하세요.');}
  finally{$('delete-all').disabled=false;}
};
async function initialize(){
  $('import-lesson').disabled=true;
  try{
    let data=await refreshLibrary();dbAvailable=true;
    if(!data.meta.some(m=>m.key==='initialized')){
      const starter=validateLesson(await getJSON('./data/starter.json'));
      await db.importLessons([starter]);
      const oldFavorites=storage.get('ne-favorites',{});
      for(const e of starter.expressions){if(oldFavorites?.[e.id])await db.saveProgress({date:starter.date,expressionId:e.id,practiceCount:0,favorite:true,completed:false});}
      data=await refreshLibrary();
    }
    const previous=data.meta.find(m=>m.key==='selectedDate')?.value;
    await selectLesson(library.some(l=>l.date===previous)?previous:library.at(-1)?.date);
  }catch(error){
    showEmpty();notify('저장된 교재를 준비하지 못했습니다. JSON을 불러오거나 저장소 권한을 확인하세요.');
    $('save-status').textContent=dbAvailable?'샘플을 불러오지 못했습니다.':'기기 저장소 사용 불가';
  }finally{$('import-lesson').disabled=false;}
}
