// ---- Engine bench: one request alone vs under load, replayed from recorded token arrival times ----
(function(){
  const B=window.BCH,D=B.D,$=B.$;
  if(!$('bch-str-card'))return;
  const S=[D.stream.alone,D.stream.loaded];
  // arrival time of every token, seconds after the request was sent
  const times=S.map(s=>{const t=[s.ttft];s.gaps.forEach(g=>t.push(t[t.length-1]+g));return t});
  const tEnd=Math.max(times[0][times[0].length-1],times[1][times[1].length-1])+0.1;
  const DT=0.05; // one frame is 50 ms of request time, played at 50 ms per frame at 1x: real speed
  const n=Math.ceil(tEnd/DT)+1;
  const lanes=[$('bch-str-l1'),$('bch-str-l2')];
  const med=B.med;
  const gapMed=S.map(s=>med(s.gaps));
  function caption(t){
    const a=times[0],b=times[1];
    if(t<a[0])return 'Both requests have been sent. Each server is reading its prompt (prefill); nothing is on screen yet. The lone request has the GPU to itself.';
    if(t<b[0])return 'The lone request is streaming: its first token came after '+B.f(a[0]*1000)+' ms and new tokens arrive about every '+B.f(gapMed[0]*1000,1)+' ms. The loaded request is still waiting behind other users\' prompts.';
    if(t<a[a.length-1])return 'Both are streaming. Under load each decode step carries up to 16 sequences, so tokens arrive every '+B.f(gapMed[1]*1000,1)+' ms or so instead of '+B.f(gapMed[0]*1000,1)+'; long red gaps are steps that also processed another user\'s new prompt.';
    if(t<b[b.length-1])return 'The lone request finished in '+B.f(a[a.length-1],2)+' s. The loaded one is still going: the server is producing more tokens in total, but each user gets them more slowly.';
    return 'Done. Same prompt length, same 128 tokens, same model and server: '+B.f(a[a.length-1],2)+' s alone against '+B.f(b[b.length-1],2)+' s under load. Throughput for the server went up; latency for each user went up too.';
  }
  function draw(i){
    const t=i*DT;
    $('bch-str-t').textContent=B.f(Math.min(t,tEnd),2);
    [0,1].forEach(k=>{
      const tt=times[k];let c=0;while(c<tt.length&&tt[c]<=t)c++;
      const lim=gapMed[k]*3;
      let h='';for(let j=0;j<c;j++){const late=j>0&&(tt[j]-tt[j-1])>Math.max(lim,0.03);h+='<i'+(late?' class="late" title="gap '+B.f((tt[j]-tt[j-1])*1000)+' ms"':'')+'></i>'}
      if(!c)h='<span class="wait">waiting for the first token...</span>';
      lanes[k].innerHTML=h;
      $(k?'bch-str-n2':'bch-str-n1').textContent=c;
      $(k?'bch-str-ttft2':'bch-str-ttft1').textContent=c?B.f(tt[0]*1000)+' ms':'waiting';
    });
    plot(t);
    $('bch-str-cap').textContent=caption(t);
  }
  function plot(t){
    const el=$('bch-str-plot');const W=B.width(el),H=96,L=70,R=12;
    const sx=v=>L+v/tEnd*(W-L-R);
    let g='';
    B.ticks(0,tEnd,W<480?4:8).forEach(v=>{g+='<line x1="'+sx(v).toFixed(1)+'" x2="'+sx(v).toFixed(1)+'" y1="6" y2="'+(H-22)+'" stroke="var(--line)"/>'+B.T(sx(v),H-8,B.f(v,v<1&&v>0?1:0)+' s',{a:'middle',fs:10,fill:'var(--mute)'})});
    [['alone','var(--c1)',24],['under load','var(--c2)',54]].forEach((r,k)=>{
      g+=B.T(L-6,r[2]+4,r[0],{a:'end',fs:11,fill:r[1]});
      g+='<rect x="'+sx(0).toFixed(1)+'" y="'+(r[2]-8)+'" width="'+(sx(times[k][0])-sx(0)).toFixed(1)+'" height="16" fill="'+r[1]+'" opacity=".14"><title>waiting for the first token: '+B.f(times[k][0]*1000)+' ms</title></rect>';
      times[k].forEach(v=>{if(v<=t)g+='<line x1="'+sx(v).toFixed(1)+'" x2="'+sx(v).toFixed(1)+'" y1="'+(r[2]-8)+'" y2="'+(r[2]+8)+'" stroke="'+r[1]+'" stroke-width="1.2"/>'});
    });
    g+='<line x1="'+sx(Math.min(t,tEnd)).toFixed(1)+'" x2="'+sx(Math.min(t,tEnd)).toFixed(1)+'" y1="4" y2="'+(H-20)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    el.innerHTML=B.svg(W,H,g,'Token arrival times, alone and under load');
  }
  const A=B.anim({card:'bch-str-card',ctl:'bch-str-ctl',n:n,ms:50,jump:4,draw:draw,label:'Time since the request was sent'});
  B.onRender(()=>A.redraw());
})();
