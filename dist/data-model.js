// Standard lesson format, version 1. No runtime dependencies.
export const CATEGORIES = ['general','casual','idiom','phrasal-verb','young-generation','slang','sns','natural-chunk','collocation'];
export const RECOMMENDATIONS = ['actively-use','casual-use','understand-only'];
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const object = (v,p) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p,'객체가 필요합니다.'); return v; };
const string = (v,p,max=12000) => { if (typeof v !== 'string' || !v.trim() || v.length>max) fail(p,`비어 있지 않은 문자열(최대 ${max}자)이 필요합니다.`); return v.trim(); };
const array = (v,p,min,max) => { if (!Array.isArray(v) || v.length<min || v.length>max) fail(p,`${min}~${max}개 항목이 필요합니다.`); return v; };
const enumeration = (v,p,values) => { if (!values.includes(v)) fail(p,`허용 값: ${values.join(', ')}`); return v; };
function category(value,path) {
  const raw=string(value,path,100);
  const key=raw.toLowerCase().replace(/[\s_]+/g,'-');
  const aliases={'phrasal-verbs':'phrasal-verb','natural-chunks':'natural-chunk','collocations':'collocation','slang-/-sns':'slang'};
  const result=aliases[key]||key;
  if(!CATEGORIES.includes(result)) fail(path,'지원하지 않는 분류 "'+raw+'"입니다. 허용 값: '+CATEGORIES.join(', '));
  return result;
}
export function validDate(v) { return typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0,4))>=1900 && !Number.isNaN(Date.parse(v)) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v; }
const identity = text => text.trim().toLowerCase().replace(/\s+/g,' ');
export function validateLesson(input) {
  const d=object(input,'교재');
  if(d.schemaVersion!==undefined && d.schemaVersion!==1) fail('schemaVersion','지원 버전은 1입니다.');
  if(!validDate(d.date)) fail('date','실제 날짜를 YYYY-MM-DD 형식으로 입력하세요.');
  const expressions=array(d.expressions,'expressions',5,5).map((item,i)=>{
    const p=`expressions[${i}]`; object(item,p);
    const result={};
    for(const key of ['expression','meaningKo','usageLevel','explanationKo','nuanceKo','whenToUseKo','ageGroup','formality']) result[key]=string(item[key],`${p}.${key}`);
    result.id=item.id===undefined?identity(result.expression):string(item.id,`${p}.id`,200);
    result.category=category(item.category,`${i+1}번째 표현 (${item.expression})의 category`);
    result.recommendation=enumeration(item.recommendation,`${p}.recommendation`,RECOMMENDATIONS);
    if(item.recommendationKo!==undefined) result.recommendationKo=string(item.recommendationKo,`${p}.recommendationKo`);
    if(item.practiceSentence!==undefined) result.practiceSentence=string(item.practiceSentence,`${p}.practiceSentence`);
    result.examples=array(item.examples,`${p}.examples`,1,10).map((e,j)=>{object(e,`${p}.examples[${j}]`);return {en:string(e.en,`${p}.examples[${j}].en`),ko:string(e.ko,`${p}.examples[${j}].ko`)};});
    return result;
  });
  if(new Set(expressions.map(e=>e.id)).size!==5) fail('expressions.id','표현 ID가 중복됩니다.');
  if(new Set(expressions.map(e=>identity(e.expression))).size!==5) fail('expressions','서로 다른 표현 5개가 필요합니다.');
  object(d.reading,'reading');
  const reading={title:string(d.reading.title,'reading.title'),introductionKo:string(d.reading.introductionKo,'reading.introductionKo'),paragraphs:array(d.reading.paragraphs,'reading.paragraphs',1,100).map((item,i)=>{
    const p=`reading.paragraphs[${i}]`;object(item,p);
    const result={en:string(item.en,`${p}.en`),ko:string(item.ko,`${p}.ko`)};
    if(item.speaker!==undefined) result.speaker=string(item.speaker,`${p}.speaker`,100);
    return result;
  })};
  const vocabulary=array(d.vocabulary,'vocabulary',1,100).map((item,i)=>{
    const p=`vocabulary[${i}]`;object(item,p);
    if(item.word!==undefined && item.phrase!==undefined) fail(p,'word 또는 phrase 중 하나만 사용하세요.');
    const termKey=item.phrase!==undefined?'phrase':'word';
    const result={[termKey]:string(item[termKey],`${p}.${termKey}`,200)};
    for(const key of ['pronunciation','meaningKo','contextualMeaningKo','example','exampleKo']) result[key]=string(item[key],`${p}.${key}`);
    result.id=item.id===undefined?identity(result[termKey]):string(item.id,`${p}.id`,200);
    result.matches=item.matches===undefined?[result[termKey]]:array(item.matches,`${p}.matches`,1,20).map((m,j)=>string(m,`${p}.matches[${j}]`,200));
    return result;
  });
  if(new Set(vocabulary.map(v=>v.id)).size!==vocabulary.length) fail('vocabulary.id','ID가 중복됩니다.');
  return {schemaVersion:1,date:d.date,title:string(d.title,'title',300),expressions,reading,vocabulary};
}
export const recommendationLabels={'actively-use':'적극 사용 추천','casual-use':'편한 대화에서 사용','understand-only':'알아듣는 정도면 충분'};
export const categoryLabels={'natural-chunk':'Natural chunk',collocation:'Collocation',general:'General',casual:'Casual',idiom:'Idiom','phrasal-verb':'Phrasal verb','young-generation':'Young generation',slang:'Slang / SNS',sns:'Slang / SNS'};
export function normalize(d) {
  return {date:d.date,id:d.date,label:d.title,source:d,expressions:d.expressions.map(e=>({id:e.id,date:d.date,expression:e.expression,meaning:e.meaningKo,category:categoryLabels[e.category],recommendation:e.recommendation,usageLevel:e.usageLevel,practice:e.practiceSentence||e.examples[0].en,explanation:{meaning:e.explanationKo,nuance:e.nuanceKo,situation:e.whenToUseKo,age:e.ageGroup,formality:e.formality,recommendation:[recommendationLabels[e.recommendation],e.recommendationKo].filter(Boolean).join(' · ')},examples:e.examples,example:e.examples[0].en})),reading:{title:d.reading.title,description:d.reading.introductionKo,sentences:d.reading.paragraphs},vocabulary:d.vocabulary.map(v=>({id:v.id,term:v.word||v.phrase,pronunciation:v.pronunciation,meaning:v.meaningKo,context:v.contextualMeaningKo,example:v.example,exampleKo:v.exampleKo,matches:v.matches}))};
}
export function validateBackup(input) {
  object(input,'백업');
  if(input.type!=='natural-english-backup'||input.version!==1) fail('백업','지원되지 않는 백업 형식입니다.');
  const lessons=array(input.lessons,'lessons',0,2000).map(validateLesson);
  if(new Set(lessons.map(l=>l.date)).size!==lessons.length) fail('lessons','날짜가 중복됩니다.');
  const lookup=new Map(lessons.map(l=>[l.date,new Set(l.expressions.map(e=>e.id))]));
  const progress=array(input.progress,'progress',0,10000).map((r,i)=>{
    object(r,`progress[${i}]`);
    if(!lookup.get(r.date)?.has(r.expressionId)) fail(`progress[${i}]`,'교재에 없는 표현입니다.');
    if(!Number.isInteger(r.practiceCount)||r.practiceCount<0||r.practiceCount>5||typeof r.favorite!=='boolean'||typeof r.completed!=='boolean') fail(`progress[${i}]`,'진도, 즐겨찾기, 완료 값이 올바르지 않습니다.');
    return {date:r.date,expressionId:r.expressionId,practiceCount:r.practiceCount,favorite:r.favorite,completed:r.completed};
  });
  if(new Set(progress.map(p=>JSON.stringify([p.date,p.expressionId]))).size!==progress.length) fail('progress','진도가 중복됩니다.');
  return {lessons,progress};
}
export function parseImport(text) {
  let data;try {data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('JSON 문법이 올바르지 않습니다. 쉼표, 따옴표, 괄호를 확인하세요.');}
  return data?.type==='natural-english-backup'?{type:'backup',...validateBackup(data)}:{type:'lesson',lesson:validateLesson(data)};
}
