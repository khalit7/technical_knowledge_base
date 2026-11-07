// ---- Reading: HTTP/2 flow control (measured frame log), a widget. Head-of-line blocking at the HTTP layer is the stage in 32_js_sc_hol.js ----
(function(){
  const D=window.HD,esc=RD.esc,T=RD.t;
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  const f1=v=>(Math.round(v*10)/10).toLocaleString('en-US');

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
  // a widget (the long-replay rule, case b): the window is the reader's choice and the whole download is the point, so it never plays by itself
  // and opens on the last frame; play or the scrubber replay it frame by frame
  const fcA=RD.anim({card:'rd-fc',ctl:'rd-fc-ctl',n:F.runs[0].frames.length,draw:drawFc,ms:700,label:'Frame',auto:false,start:F.runs[0].frames.length-1});
  RD.seg(document.getElementById('rd-fc-seg'),m=>{run=+m;const n=F.runs[run].frames.length;fcA.reset(n);fcA.go(n-1,true)});
  RD.onResize(()=>fcA.redraw());
})();
