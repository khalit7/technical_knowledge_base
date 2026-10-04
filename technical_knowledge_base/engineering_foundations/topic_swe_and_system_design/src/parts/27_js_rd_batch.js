// ---- Reading, Step 5: static against continuous batching on one GPU with 4 slots (illustrative; src/read/recompute.py a5) ----
window.RDSIM=window.RDSIM||{};
RDSIM.A5_LEN=[3,8,2,5,4,7,2,3,6,2];RDSIM.A5_SLOTS=4;
RDSIM.a5=function(continuous){const Ln=RDSIM.A5_LEN,n=Ln.length,S=RDSIM.A5_SLOTS,start=[],end=[],slot=[];let total;
  if(!continuous){let t=0;for(let b=0;b<n;b+=S){const batch=[];for(let i=b;i<Math.min(n,b+S);i++)batch.push(i);
      batch.forEach((i,k)=>{start[i]=t;end[i]=t+Ln[i];slot[i]=k});t+=Math.max(...batch.map(i=>Ln[i]))}total=t}
  else{const free=new Array(S).fill(0);for(let i=0;i<n;i++){let s=0;for(let j=1;j<S;j++)if(free[j]<free[s])s=j;start[i]=free[s];end[i]=free[s]+Ln[i];slot[i]=s;free[s]=end[i]}total=Math.max(...end)}
  const busy=Ln.reduce((a,b)=>a+b,0);
  return {total_ticks:total,util_pct:Math.round(1000*busy/(total*S))/10,mean_done:Math.round(100*end.reduce((a,b)=>a+b,0)/n)/100,start,end,slot}};
(function(){
  const svg=document.getElementById('rd-bt-svg');if(!svg)return;
  const cap=document.getElementById('rd-bt-cap'),cnt=document.getElementById('rd-bt-cnt'),leg=document.getElementById('rd-bt-leg');
  let mode='static';const R={static:RDSIM.a5(false),cont:RDSIM.a5(true)};
  const COL=['--c1','--c2','--c3','--c4','--c5','--c6','--c1','--c2','--c3','--c4'];
  leg.innerHTML='<span style="--sw:var(--c1)">a request generating (one colour each; the letter names it)</span><span style="--sw:var(--dim)">slot idle</span>';
  const name=k=>String.fromCharCode(65+k);
  function draw(i){
    const r=R[mode],S=RDSIM.A5_SLOTS,T=R.static.total_ticks,Ln=RDSIM.A5_LEN;
    const W=Math.max(280,Math.min(820,RD.width(svg)));const x0=44,cw=(W-x0-4)/T,ch=24,g=4;let b='';
    for(let s=0;s<S;s++){const y=8+s*(ch+g);b+=RD.t(0,y+ch/2+4,'slot '+(s+1),{fs:10,fill:'var(--mute)'});
      for(let t=0;t<Math.min(i,r.total_ticks);t++){let who=-1;for(let k=0;k<Ln.length;k++)if(r.slot[k]===s&&r.start[k]<=t&&t<r.end[k])who=k;
        b+='<rect x="'+(x0+t*cw+.5)+'" y="'+y+'" width="'+Math.max(1,cw-1)+'" height="'+ch+'" fill="var('+(who<0?'--dim':COL[who])+')" opacity="'+(who<0?.5:1)+'"/>';
        if(who>=0&&r.start[who]===t&&cw>9)b+=RD.t(x0+t*cw+cw/2,y+ch/2+4,name(who),{fs:10.5,a:'middle',fill:'var(--bg)',w:600})}}
    const yA=8+S*(ch+g)+4;
    for(let t=0;t<=T;t+=(cw<14?5:2))b+=RD.t(x0+t*cw,yA+10,String(t),{fs:9.5,a:'middle',fill:'var(--mute)'});
    b+=RD.t(x0,yA+24,'decode steps →',{fs:10,fill:'var(--mute)'});
    if(i>0&&i<=r.total_ticks)b+='<line x1="'+(x0+i*cw)+'" x2="'+(x0+i*cw)+'" y1="4" y2="'+(yA)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    // waiting requests
    const now=Math.min(i,r.total_ticks),wait=Ln.map((_,k)=>k).filter(k=>r.start[k]>=now&&now<r.total_ticks);
    b+=RD.t(0,yA+44,'Waiting: '+(wait.length?wait.map(name).join(' '):'none'),{fs:11});
    svg.innerHTML=RD.svg(W,yA+50,b,'Four GPU batch slots over time, showing which request occupies each slot and idle slots');
    const done=Ln.filter((_,k)=>r.end[k]<=now).length,busy=Ln.reduce((s,l,k)=>s+Math.max(0,Math.min(now,r.end[k])-r.start[k]),0);
    cnt.innerHTML=RD.stat('Decode step',now+' of '+r.total_ticks,'')+RD.stat('Requests finished',done+' of 10','')+RD.stat('Slots in use',now?Math.round(100*busy/(now*S))+'%':'n/a','so far')+RD.stat('Mean finish time',now>=r.total_ticks?r.mean_done+' steps':'...','over 10 requests');
    let t,p;
    if(i===0){t='Ten requests waiting for one GPU';p='A ('+Ln[0]+' steps), B ('+Ln[1]+'), C ('+Ln[2]+'), D ('+Ln[3]+') and six more. Each decode step produces one token for every request in a slot. '+(mode==='static'?'Static batching: take 4, run until all 4 are done, then take the next 4.':'Continuous batching: whenever a slot frees up, the next request takes it at the very next step.')}
    else if(now>=r.total_ticks){t='All done after '+r.total_ticks+' steps';p=mode==='static'?'Slots were in use '+r.util_pct+'% of the time: each batch waited for its longest request (B, F, I) while finished slots sat idle. Mean finish time '+r.mean_done+' steps.':'Slots were in use '+r.util_pct+'% of the time, and all ten finished in '+r.total_ticks+' steps instead of '+R.static.total_ticks+'; mean finish time '+r.mean_done+' steps instead of '+R.static.mean_done+'. Same GPU, same requests, more done per second. The only idle cells are at the end, when no work is left.'}
    else{const fin=Ln.map((_,k)=>k).filter(k=>r.end[k]===now),st=Ln.map((_,k)=>k).filter(k=>r.start[k]===now);
      t='Step '+now;p=(fin.length?fin.map(name).join(', ')+' finished. ':'')+(st.length?st.map(name).join(', ')+(st.length>1?' start':' starts')+' now. ':'')+(mode==='static'&&!st.length&&fin.length?'Their slots stay empty until the whole batch is done.':'')+(!fin.length&&!st.length?'Every running request gets one more token.':'')}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const n=()=>R[mode].total_ticks+1;
  const an=RD.anim({card:'rd-bt-card',ctl:'rd-bt-ctl',n:n(),ms:800,draw,label:'Decode step'});
  RD.seg(document.getElementById('rd-bt-seg'),m=>{mode=m;an.reset(n());an.play()});
  RD.onResize(()=>an.redraw());
})();
