// ---- Reading, Step 3: slow uploads inside the request against a queue and workers (illustrative; src/read/recompute.py a3) ----
window.RDSIM=window.RDSIM||{};
RDSIM.A3={THREADS:4,CHAT:3,UP_AT:[1,2,2,4,5],UP_LEN:4,WORKERS:2,T:12};
RDSIM.a3=function(queued){const C=RDSIM.A3;const th=new Array(C.THREADS).fill(null),wk=new Array(C.WORKERS).fill(null);
  const fifo=[],wq=[],rows=[],waits=[];let upId=0;
  for(let t=0;t<C.T;t++){
    if(t<10){for(let i=0;i<C.CHAT;i++)fifo.push({k:'chat',r:1,t});
      C.UP_AT.forEach(u=>{if(u===t){const j={k:'up',r:C.UP_LEN,t,id:++upId};if(queued)wq.push(j);else fifo.push(j)}})}
    for(let i=0;i<C.THREADS;i++)if(!th[i]&&fifo.length){const j=fifo.shift();th[i]=j;if(j.k==='chat')waits.push(t-j.t)}
    for(let i=0;i<C.WORKERS;i++)if(!wk[i]&&wq.length)wk[i]=wq.shift();
    rows.push({th:th.map(x=>x?{k:x.k,id:x.id,r:x.r}:null),wk:wk.map(x=>x?{id:x.id,r:x.r}:null),
      waiting_chat:fifo.filter(x=>x.k==='chat').length,waiting_up:fifo.filter(x=>x.k==='up').length,queue:wq.length,qids:wq.map(x=>x.id),
      threads_on_uploads:th.filter(x=>x&&x.k==='up').length,workers_busy:wk.filter(x=>x).length,maxwait:waits.length?Math.max(...waits):0});
    [th,wk].forEach(a=>a.forEach((x,i)=>{if(x){x.r--;if(x.r===0)a[i]=null}}));
  }
  const mean=Math.round(100*waits.reduce((s,x)=>s+x,0)/waits.length)/100;
  return {rows,mean,max:Math.max(...waits)}};
(function(){
  const svg=document.getElementById('rd-q-svg');if(!svg)return;
  const cap=document.getElementById('rd-q-cap'),cnt=document.getElementById('rd-q-cnt'),leg=document.getElementById('rd-q-leg');
  let mode='inline';const R={inline:RDSIM.a3(false),queue:RDSIM.a3(true)};
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  leg.innerHTML=L('--c1','chat message (1 s of work)')+L('--c3','document upload (4 s of work)')+L('--bad','chat message waiting')+L('--dim','free slot');
  function slot(x,y,w,h,j,lab){const f=!j?'var(--dim)':j.k==='chat'?'var(--c1)':'var(--c3)';
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5" fill="'+f+'" opacity="'+(j?1:.5)+'"/>'+(j&&j.k!=='chat'?RD.t(x+w/2,y+h/2+4,'doc '+j.id+(j.r>1?' ('+j.r+'s)':''),{fs:10,a:'middle',fill:'var(--bg)',w:600}):j?RD.t(x+w/2,y+h/2+4,'chat',{fs:10,a:'middle',fill:'var(--bg)'}):'')}
  function draw(i){
    const S=R[mode],r=i>0?S.rows[i-1]:null;
    const W=Math.max(280,Math.min(820,RD.width(svg)));
    const narrow=W<480;let b='';
    // left: waiting line
    const lw=narrow?W:W*0.32,D=10,G=3;
    b+=RD.t(0,12,'Waiting for a slot',{fs:11,fill:'var(--mute)'});
    const wc=r?r.waiting_chat:0,wu=r?r.waiting_up:0;
    for(let k=0;k<wc+wu;k++){const x=(k%Math.floor((lw-10)/(D+G)))*(D+G),y=20+Math.floor(k/Math.floor((lw-10)/(D+G)))*(D+G);
      b+='<rect x="'+x+'" y="'+y+'" width="'+D+'" height="'+D+'" rx="2" fill="'+(k<wu?'var(--c3)':'var(--bad)')+'"/>'}
    if(!wc&&!wu)b+=RD.t(0,32,r?'nobody':'',{fs:11,fill:'var(--good)'});
    // server slots
    const sx=narrow?0:lw+14,sy=narrow?52:0,sw=narrow?W:W-sx;const n=RDSIM.A3.THREADS,g=6,w=(sw-g*(n-1))/n;
    b+=RD.t(sx,sy+12,'App server: 4 request slots',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<n;k++)b+=slot(sx+k*(w+g),sy+20,w,30,r?r.th[k]:null);
    let yb=sy+64;
    if(mode==='queue'){
      b+=RD.t(sx,yb+12,'Queue (uploads waiting)',{fs:11,fill:'var(--mute)'});
      const q=r?r.qids:[];q.forEach((id,k)=>{b+='<rect x="'+(sx+k*52)+'" y="'+(yb+20)+'" width="46" height="24" rx="4" fill="var(--c3)" opacity=".55"/>'+RD.t(sx+k*52+23,yb+36,'doc '+id,{fs:10,a:'middle'})});
      if(!q.length)b+=RD.t(sx,yb+36,'empty',{fs:11,fill:'var(--mute)'});
      yb+=54;b+=RD.t(sx,yb+12,'Background workers: 2',{fs:11,fill:'var(--mute)'});
      const ww=(sw-g)/2;for(let k=0;k<2;k++)b+=slot(sx+k*(ww+g),yb+20,ww,30,r&&r.wk[k]?{k:'up',id:r.wk[k].id,r:r.wk[k].r}:null);
      yb+=56;
    }
    svg.innerHTML=RD.svg(W,yb+4,b,mode==='inline'?'Uploads processed inside requests occupy the server slots while chat messages wait':'Uploads go to a queue served by two background workers while chat messages use the server slots');
    cnt.innerHTML=RD.stat('Second',i+' of 12','')+RD.stat('Chat messages waiting',r?r.waiting_chat:0,'for a free slot')+RD.stat('Slots held by uploads',r?r.threads_on_uploads+' of 4':'0 of 4','')+RD.stat(mode==='queue'?'Uploads in queue':'Longest chat wait so far',mode==='queue'?(r?r.queue:0):(r?r.maxwait+' s':'0 s'),mode==='queue'?'workers busy: '+(r?r.workers_busy:0):'');
    let t,p;
    if(i===0){t='Chat messages and a few uploads';p=mode==='inline'?'Three chat messages a second and five document uploads, all handled inside the request by the same 4 slots.':'Same traffic. The upload request now only puts a job on the queue and answers 202 Accepted; two background workers do the 4 seconds of work.'}
    else if(mode==='inline'){t='Second '+i;
      p=r.threads_on_uploads>=2?'Uploads hold '+r.threads_on_uploads+' of the 4 slots for 4 seconds each. '+(r.waiting_chat?r.waiting_chat+' chat messages are waiting behind them.':'Chat messages squeeze into what is left.'):r.waiting_chat?'The uploads have finished, but '+r.waiting_chat+' chat messages are still queued behind the backlog they left.':'Slots are free; chat messages are served at once.';
      if(i===12)p='Done. On average a chat message waited '+S.mean.toFixed(2)+' s for a slot and the unluckiest waited '+S.max+' s, for work that takes a fraction of a second, because 5 uploads borrowed the slots.'}
    else{t='Second '+i;
      p=r.queue?r.queue+' upload'+(r.queue>1?'s wait':' waits')+' in the queue; the workers are busy and the chat slots are untouched.':r.workers_busy?'The workers finish the last uploads; their users see a spinner, then "ready".':'Queue empty, workers idle.';
      if(i===12)p='Done. No chat message waited at all (mean '+S.mean.toFixed(2)+' s). Uploads still take their 4 seconds, plus any time spent in the queue, and their users wait for a "ready" signal: slow work waits so that fast work does not.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const an=RD.anim({card:'rd-q-card',ctl:'rd-q-ctl',n:13,ms:1200,draw,label:'Second'});
  RD.seg(document.getElementById('rd-q-seg'),m=>{mode=m;an.reset(13);an.play()});
  RD.onResize(()=>an.redraw());
})();
