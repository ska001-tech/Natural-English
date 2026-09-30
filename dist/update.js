const status = document.getElementById('status');
const retry = document.getElementById('retry');
const back = document.getElementById('return');
async function update() {
 retry.hidden = true; back.hidden = true;
 if(location.protocol === 'file:') {status.textContent='로컬 파일 모드입니다. 최신 앱 폴더의 index.html을 다시 열어주세요.';back.hidden=false;return;}
 const deadline = Date.now() + 30000;
 try {
  if(!('serviceWorker' in navigator)) throw new Error('이 브라우저는 앱 업데이트를 지원하지 않습니다.');
  const registration = await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  await registration.update();
  while(Date.now() < deadline) {
   const worker=registration.active;
   if(worker && worker.state==='activated') {
    const version=await new Promise(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve(null);},1000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage('VERSION',[channel.port2]);});
    if(version && !registration.installing && !registration.waiting){status.textContent='최신 앱 준비 완료 ('+version+'). 아래 버튼으로 돌아간 뒤 JSON을 다시 불러오세요.';back.hidden=false;return;}
   }
   await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw new Error('업데이트 대기 시간이 지났습니다. 인터넷 연결을 확인하고 다시 시도하세요.');
 } catch(error) {status.textContent=error.message;retry.hidden=false;}
}
retry.onclick=update;update();
