// IndexedDB is the source of truth for imported lessons and per-day progress.
let connection;
export function openDB() {
  if(connection) return connection;
  connection=new Promise((resolve,reject)=>{
    const request=indexedDB.open('natural-english-library',1);
    request.onupgradeneeded=()=>{ const db=request.result; db.createObjectStore('lessons',{keyPath:'date'}); const p=db.createObjectStore('progress',{keyPath:['date','expressionId']});p.createIndex('date','date');db.createObjectStore('meta',{keyPath:'key'}); };
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();connection=null;};resolve(request.result);};
    request.onerror=()=>{connection=null;reject(request.error);};
    request.onblocked=()=>{connection=null;reject(new Error('다른 앱 탭을 닫고 다시 시도하세요.'));};
  });
  return connection;
}
async function transaction(stores,mode,work) {
  const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;tx.oncomplete=()=>resolve(typeof result==='function'?result():result);tx.onabort=()=>reject(tx.error||new Error('저장을 완료하지 못했습니다.'));tx.onerror=()=>{};try{result=work(tx);}catch(error){tx.abort();reject(error);}});
}
export const snapshot=()=>transaction(['lessons','progress','meta'],'readonly',tx=>{const l=tx.objectStore('lessons').getAll(),p=tx.objectStore('progress').getAll(),m=tx.objectStore('meta').getAll();return ()=>({lessons:l.result,progress:p.result,meta:m.result});});
export const saveProgress=record=>transaction(['progress'],'readwrite',tx=>{tx.objectStore('progress').put(record);});
export const setMeta=(key,value)=>transaction(['meta'],'readwrite',tx=>{tx.objectStore('meta').put({key,value});});
export const deleteLesson=date=>transaction(['lessons','progress','meta'],'readwrite',tx=>{tx.objectStore('lessons').delete(date);const request=tx.objectStore('progress').index('date').openCursor(IDBKeyRange.only(date));request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();cursor.continue();}};tx.objectStore('meta').put({key:'initialized',value:true});});
export const clearLibrary=()=>transaction(['lessons','progress','meta'],'readwrite',tx=>{tx.objectStore('lessons').clear();tx.objectStore('progress').clear();tx.objectStore('meta').clear();tx.objectStore('meta').put({key:'initialized',value:true});});
export const importLessons=(lessons,progress=null)=>transaction(['lessons','progress','meta'],'readwrite',tx=>{
  const store=tx.objectStore('lessons'),states=tx.objectStore('progress');
  for(const lesson of lessons){
    const old=store.get(lesson.date);
    old.onsuccess=()=>{
      const allowed=new Set(lesson.expressions.filter(e=>old.result?.expressions.some(o=>o.id===e.id&&o.expression===e.expression)).map(e=>e.id));
      const cursorRequest=states.index('date').openCursor(IDBKeyRange.only(lesson.date));
      cursorRequest.onsuccess=()=>{const cursor=cursorRequest.result;if(cursor){if(progress!==null||!allowed.has(cursor.value.expressionId))cursor.delete();cursor.continue();}else if(progress!==null){for(const state of progress.filter(p=>p.date===lesson.date))states.put(state);}};
    };
    store.put(lesson);
  }
  tx.objectStore('meta').put({key:'initialized',value:true});
});
