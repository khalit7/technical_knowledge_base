// ---- Reading tab, section 9: round-robin against prefix-aware routing over three replicas (before/after animation) ----
(function(){
  const svgEl=document.getElementById('rd-rt-svg');if(!svgEl)return;
  const cap=document.getElementById('rd-rt-cap'),cnt=document.getElementById('rd-rt-cnt');
  const PT=window.RDD.life.t_pre_ms/2000,SYS=1000;
  const REQ=['A1','B1','C1','D1','A2','B2','C2','D2'],COL={A:'var(--c1)',B:'var(--c2)',C:'var(--c3)',D:'var(--c4)'};
  let mode='rr';
  // simulate: each replica caches the system prompt after its first request and each conversation's 2,300 tokens after its first turn
  function sim(){
    const rep=[0,1,2].map(()=>({sys:false,conv:{},n:0,list:[]}));const steps=[];
    REQ.forEach((r,i)=>{const c=r[0],turn=+r[1],total=turn===1?2000:2500;
      const cached=x=>turn===2&&x.conv[c]?2300:(x.sys?SYS:0);
      let k;
      if(mode==='rr')k=i%3;
      else{let best=-1e9;rep.forEach((x,j)=>{const sc=cached(x)-1000*x.n;if(sc>best){best=sc;k=j}})}
      const x=rep[k],hit=cached(x),comp=total-hit;x.sys=true;x.conv[c]=true;x.n++;x.list.push({r,hit,comp});
      steps.push({r,k,hit,comp})});
    return {rep,steps};
  }
  function draw(i){
    const S=sim(),w=RD.width(svgEl),cw=(w-16)/3,h=196;
    let s=RDX.T(8,13,'Arriving: ',{fs:11,w:600});
    const qx=72,qw=Math.min(34,(w-qx-8)/8);
    REQ.forEach((r,j)=>{const done=j<i;s+=RDX.R(qx+j*qw,3,qw-3,15,done?'var(--soft)':COL[r[0]],{op:done?1:.9});s+=RDX.T(qx+j*qw+(qw-3)/2,14,r,{a:'middle',fs:10,c:done?'var(--mute)':'var(--bg)',w:600})});
    for(let k=0;k<3;k++){const x=8+k*cw;s+=RDX.R(x+2,28,cw-6,h-34,'var(--bg)',{st:'var(--line)',rx:6});s+=RDX.T(x+8,43,'Replica '+(k+1),{fs:10.5,w:600})}
    const shown=S.steps.slice(0,i),per=[0,0,0];
    shown.forEach((st,j)=>{const x=8+st.k*cw,y=50+per[st.k]*34;per[st.k]++;const last=j===i-1;
      s+=RDX.R(x+8,y,cw-18,28,'var(--soft)',{st:last?'var(--ink)':COL[st.r[0]],sw:last?2:1,rx:4});
      s+=RDX.R(x+8,y,5,28,COL[st.r[0]],{rx:2});
      s+=RDX.T(x+17,y+12,st.r+(st.hit>SYS?' hit':st.hit?(cw>140?' system hit':' sys hit'):' miss'),{fs:10,w:600,c:st.hit>SYS?'var(--good)':(st.hit?'var(--ink)':'var(--bad)')});
      s+=RDX.T(x+17,y+24,RDX.nf(st.comp)+' tok'+(cw>160?', '+RDX.nf(st.comp*PT)+' ms':''),{fs:9.5,c:'var(--mute)'})});
    svgEl.innerHTML=RD.svg(w,h,s,'Eight requests routed to three replicas, '+(mode==='rr'?'round-robin':'prefix-aware'));
    const tot=shown.reduce((a,b)=>a+b.comp,0),t2=shown.filter(x=>x.r[1]==='2');
    let t,p;
    if(i===0){t=mode==='rr'?'Round-robin':'Prefix-aware';p=mode==='rr'?'Requests go to replicas 1, 2, 3, 1, 2, 3, ... whatever they carry.':'Each request goes where the most of its prefix is cached, minus a penalty of 1,000 tokens for every request already sent there (so one replica does not take everything).'}
    else{const st=S.steps[i-1];t=st.r+' goes to replica '+(st.k+1);
      p=(st.hit>SYS?'Its conversation\'s first turn is cached there: only the 200 new tokens are prefilled.':st.hit?'Only the shared system prompt is cached there: '+RDX.nf(st.comp)+' tokens are prefilled'+(st.r[1]==='2'?', including the whole earlier turn this conversation already paid for on another replica.':'.'):'Nothing useful is cached there: all '+RDX.nf(st.comp)+' prompt tokens are prefilled.')+(i===8?(mode==='rr'?' Total: 13,000 prompt tokens computed. Switch to prefix-aware.':' Total: 7,800 prompt tokens computed instead of 13,000; replica 1 carries four requests, the price of following the cache.'):'')}
    RDX.cap(cap,t,p);
    RDX.cnt(cnt,[['Prompt tokens computed',RDX.nf(tot)],['Second turns: mean prefill',t2.length?RDX.nf(t2.reduce((a,b)=>a+b.comp,0)/t2.length*PT)+' ms':'none yet'],['Cache hits beyond the system prompt',t2.filter(x=>x.hit>SYS).length+' of '+t2.length]]);
  }
  const A=RD.anim({card:'rd-rt-card',ctl:'rd-rt-ctl',n:9,draw,ms:1300,label:'Routing step'});
  RD.seg(document.getElementById('rd-rt-mode'),v=>{mode=v;A.reset(9);A.play()});
  RD.onResize(()=>A.redraw());
})();
