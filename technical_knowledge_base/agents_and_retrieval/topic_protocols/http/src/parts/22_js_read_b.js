// ---- Reading: head-of-line blocking at the HTTP layer (measured), and HTTP/2 flow control (measured frame log) ----
(function(){
  const D=window.HD,esc=RD.esc,T=RD.t;
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  const f1=v=>(Math.round(v*10)/10).toLocaleString('en-US');

  // ---------- HOL ----------
  const LAB={h1_pipelined:'HTTP/1.1, one connection, B pipelined behind A',h1_two_conns:'HTTP/1.1, one connection each',h2_one_conn:'HTTP/2, A on stream 1 and B on stream 3'};
  const M={};Object.keys(D.hol.runs).forEach(k=>{const r=D.hol.runs[k];M[k]={};['A_first','A_last','B_first','B_last'].forEach(x=>M[k][x]=med(r.map(o=>o[x])))});
  let mode='h1_pipelined';
  function events(){const m=M[mode];return [
    {t:0,c:'<b>A is sent.</b> A generation whose first token comes after a 1 s wait (the model thinking).'},
    {t:10,c:'<b>B is sent, 10 ms later.</b> A health check that the server can answer at once.'+(mode==='h1_pipelined'?' It goes on the same connection, right behind A.':mode==='h1_two_conns'?' It goes on its own, second connection.':' It goes on the same connection as stream 3.')},
    {t:m.A_first,c:'<b>A\'s response head arrives</b> at '+f1(m.A_first)+' ms (the 200 and the first SSE event); its tokens are still a second away.'},
    {t:m.B_last,c:mode==='h1_pipelined'?'<b>B finally arrives</b> at '+f1(m.B_last)+' ms. Its answer was ready long ago, but HTTP/1.1 must return responses in request order, so it waited behind all of A.':'<b>B is answered</b> at '+f1(m.B_last)+' ms, while A is still thinking.'},
    {t:m.A_last,c:'<b>A completes</b> at '+f1(m.A_last)+' ms. '+(mode==='h1_pipelined'?'B waited '+f1(m.B_last-10)+' ms for a 1 ms job: head-of-line blocking.':'B waited '+f1(m.B_last-10)+' ms; A\'s slowness cost it nothing.')}
  ].sort((a,b)=>a.t-b.t)}
  const svgEl=document.getElementById('rd-hol-svg');
  function drawHol(i){
    const ev=events(),now=ev[i].t,m=M[mode],w=RD.width(svgEl),L=46,R=12,X0=L,X1=w-R,tmax=1300;
    const x=t=>X0+(X1-X0)*Math.min(t,tmax)/tmax;let b='';
    [0,250,500,750,1000,1250].forEach(t=>{b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="14" y2="86" stroke="var(--line)"/>'+T(x(t),100,t+' ms',{a:'middle',fs:10,fill:'var(--mute)'})});
    const lane=(y,lab,s,e,first,col)=>{b+=T(4,y+13,lab,{fs:12,w:600});if(now>=s){const end=Math.min(now,e);
      b+='<rect x="'+x(s)+'" y="'+y+'" width="'+Math.max(2,x(end)-x(s))+'" height="18" rx="3" fill="'+col+'" opacity="'+(now>=e?0.9:0.45)+'"/>';
      if(now>=e)b+='<circle cx="'+x(e)+'" cy="'+(y+9)+'" r="5" fill="'+col+'" stroke="var(--bg)"/>'}};
    lane(22,'A',0,m.A_last,m.A_first,'var(--c1)');lane(56,'B',10,m.B_last,m.B_first,'var(--c2)');
    b+='<line x1="'+x(now)+'" x2="'+x(now)+'" y1="14" y2="86" stroke="var(--bad)" stroke-dasharray="3 3"/>';
    svgEl.innerHTML=RD.svg(w,106,b,'Timeline of requests A and B');
    document.getElementById('rd-hol-cap').innerHTML='<div class="t">'+LAB[mode]+'</div><p>'+ev[i].c+'</p>';
    const bw=now>=m.B_last?f1(m.B_last-10)+' ms':'waiting';
    document.getElementById('rd-hol-cnt').innerHTML=RD.stat('Time',f1(now)+' ms','since A was sent')+RD.stat('B, time to answer',bw,'median of 3 runs')+RD.stat('Connections used',mode==='h1_two_conns'?'2':'1','');
  }
  const holA=RD.anim({card:'rd-hol',ctl:'rd-hol-ctl',n:5,draw:drawHol,ms:1700,label:'HOL step'});
  RD.seg(document.getElementById('rd-hol-seg'),m=>{mode=m;holA.reset(5);holA.play()});
  RD.onResize(()=>holA.redraw());

  // ---------- flow control ----------
  const F=D.flow,fsvg=document.getElementById('rd-fc-svg');let run=0;
  function stepsFor(r){return r.frames}
  function drawFc(i){
    const r=F.runs[run],fr=stepsFor(r),W=r.window,connW=W>65535?W:65535,cap=Math.min(W,connW);
    let credit=cap,got=0,wu=0;for(let k=0;k<=i;k++){const f=fr[k];if(f.type==='DATA'){credit-=f.bytes;got+=f.bytes}else{credit+=f.bytes;wu++}}
    const f=fr[i],w=RD.width(fsvg),L=10,R=10,tmax=Math.max(F.runs[0].total_ms,10),x=t=>L+(w-L-R)*t/tmax;let b='';
    b+=T(L,12,'Credit left: '+Math.max(0,credit).toLocaleString('en-US')+' of '+cap.toLocaleString('en-US')+' B',{fs:11.5,w:600});
    b+='<rect x="'+L+'" y="18" width="'+(w-L-R)+'" height="14" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
    b+='<rect x="'+L+'" y="18" width="'+Math.max(0,(w-L-R)*Math.max(0,credit)/cap)+'" height="14" rx="3" fill="var(--c3)"/>';
    b+=T(L,52,'DATA frames (server to client)',{fs:11,fill:'var(--mute)'})+T(L,94,'WINDOW_UPDATE (client to server)',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<=i;k++){const g=fr[k];const cx=x(g.t);
      if(g.type==='DATA'){const h=Math.max(2,26*g.bytes/16384);b+='<rect x="'+(cx-2)+'" y="'+(84-h)+'" width="4" height="'+h+'" fill="var(--c1)"'+(k===i?' stroke="var(--ink)"':'')+'/>'}
      else b+='<rect x="'+(cx-2)+'" y="98" width="4" height="12" fill="var(--c2)"'+(k===i?' stroke="var(--ink)"':'')+'/>'}
    [0,0.25,0.5,0.75,1].forEach(p=>{const t=Math.round(tmax*p);b+=T(x(t),126,t+' ms',{a:p===0?'start':p===1?'end':'middle',fs:10,fill:'var(--mute)'})});
    fsvg.innerHTML=RD.svg(w,132,b,'HTTP/2 flow control frames over time');
    const exp=Math.ceil(F.bytes/cap)-1;
    document.getElementById('rd-fc-cap').innerHTML='<div class="t">'+(f.type==='DATA'?'DATA, '+f.bytes.toLocaleString('en-US')+' bytes at '+f1(f.t)+' ms':'WINDOW_UPDATE +'+f.bytes.toLocaleString('en-US')+' at '+f1(f.t)+' ms')+'</div><p>'+
      (f.type==='DATA'?(credit<=0&&i<fr.length-1?'The window is used up: the server must stop and wait for credit, however fast the link is.':(f.bytes===0?'An empty DATA frame with END_STREAM: the response is complete.':'The server sends while it has credit; each DATA frame spends its size.')):'The client returns credit for data it has consumed (held 50 ms here, standing in for a round trip). Only now can the server send more.')+'</p>';
    document.getElementById('rd-fc-cnt').innerHTML=RD.stat('Received',got.toLocaleString('en-US')+' B','of '+F.bytes.toLocaleString('en-US'))+RD.stat('Time',f1(f.t)+' ms','measured; total '+f1(r.total_ms)+' ms')+
      RD.stat('Stalls for credit',String(exp),'derived: ceil(200,000 / '+cap.toLocaleString('en-US')+') &#8722; 1')+RD.stat('Expected time','&#8776; '+(exp*50)+' ms','derived: stalls &#215; 50 ms');
  }
  const fcA=RD.anim({card:'rd-fc',ctl:'rd-fc-ctl',n:F.runs[0].frames.length,draw:drawFc,ms:700,label:'Frame'});
  RD.seg(document.getElementById('rd-fc-seg'),m=>{run=+m;fcA.reset(F.runs[run].frames.length);fcA.play()});
  RD.onResize(()=>fcA.redraw());
})();
