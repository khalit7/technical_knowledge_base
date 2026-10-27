// ---- Hero (2026-10-25): the loop, and the four prompts made from one set of trajectories by deletion; static ----
(function(){const host=$('heroSvg');if(!host)return;
  const T1=PAPER.tables.t1.rows,em=m=>T1.find(r=>r.m===m).hq;
  const wrap=(t,fs,maxw)=>{const n=Math.max(6,Math.floor(maxw/(fs*.56))),out=[];let cur='';t.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
  const lines=(x,y,arr,o)=>arr.map((t,i)=>tx(x,y+i*((o.fs||12)+3),t,o)).join('');
  const box=(x,y,w,h,txt,o)=>{o=o||{};const L=wrap(txt,o.fs||12,w-14),lh=(o.fs||12)+3;let s=rc(x,y,w,h,o.f||'var(--soft)',{s:o.s||'var(--line)',sw:o.sw||1,r:7});
    s+=lines(x+w/2,y+h/2-(L.length-1)*lh/2+4,L,{fs:o.fs||12,a:'middle',w:o.w,c:o.c});return s};
  const path=(d,c,da)=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="1.6"'+(da?' stroke-dasharray="4 3"':'')+' marker-end="MARK"/>';
  function loop(x0,y0,pw){let s='';const g=26,bh=pw<420?50:40,hw=(pw-g-24)/2,L=x0+12,R=x0+12+hw+g;
    const t1=wrap('1. The loop: a thought is an action that touches nothing',13,pw);s+=lines(x0,y0+12,t1,{fs:13,w:600});
    const yc=y0+26+(t1.length-1)*16,yl=yc+bh+22,yt=yl+bh+22,ye=yt+bh+22,yo=ye+bh+22;
    s+=box(L,yc,pw-24,bh,'Context: the task, then every thought, action and observation so far');
    s+=box(L,yl,pw-24,bh,'Language model (PaLM-540B, few-shot prompt)',{w:600});
    s+=ar(L+hw/2,yl+bh,L+hw/2,yt-2)+ar(R+hw/2,yl+bh,R+hw/2,yt-2);
    s+=box(L,yt,hw,bh,'Thought (free text)',{s:'var(--rt)',sw:2,w:600});
    s+=box(R,yt,hw,bh,'Action: search, lookup, finish',{s:'var(--ra)',sw:2,w:600});
    s+=ar(R+hw/2,yt+bh,R+hw/2,ye-2);
    s+=box(R,ye,hw,bh,'Environment (Wikipedia, ALFWorld, WebShop)');
    s+=ar(R+hw/2,ye+bh,R+hw/2,yo-2);
    s+=box(R,yo,hw,bh,'Observation',{s:'var(--ro)',sw:2,w:600});
    s+=lines(L+hw/2,ye+12,wrap('no observation: the thought is appended as it is',11,hw),{fs:11,a:'middle',c:'var(--mute)'});
    // return arrows: thought and observation are appended to the context
    s+=path('M'+L+','+(yt+bh/2)+' H'+(x0+4)+' V'+(yc+bh/2)+' H'+(L-2),'var(--rt)');
    s+=path('M'+(R+hw)+','+(yo+bh/2)+' H'+(x0+pw-4)+' V'+(yc+bh/2)+' H'+(x0+pw-10),'var(--ro)');
    return {s,h:yo+bh-y0+4}}
  function grid(x0,y0,pw){let s='';const hl=58,cw=(pw-hl)/2;
    s+=tx(x0,y0+12,'2. Four prompts, one set of trajectories',{fs:13,w:600});
    const sub=wrap('baselines delete parts of the ReAct exemplars; answers to Figure 1\'s question',11,pw);s+=lines(x0,y0+30,sub,{fs:11,c:'var(--mute)'});
    const yh=y0+48+(sub.length-1)*14;s+=tx(x0+hl+cw/2,yh,'no actions',{fs:11,a:'middle',c:'var(--mute)'})+tx(x0+hl+cw*1.5,yh,'actions',{fs:11,a:'middle',c:'var(--ra)',w:600});
    const C=[[['Standard','answers "iPod" ✗',em('Standard')],['Act','finds Front Row, answers "yes" ✗',em('Act')]],
             [['CoT','"iPhone, iPad, iPod Touch" ✗ (from memory)',em('CoT')],['ReAct','"keyboard function keys" ✓',em('ReAct')]]];
    const fs=11,ch=Math.max(84,Math.max(...C.flat().map(c=>wrap(c[1],fs,cw-16).length))*14+50);
    C.forEach((row,ri)=>{const y=yh+8+ri*(ch+6);
      s+=tx(x0+hl-6,y+ch/2-2,ri?'thoughts':'no',{fs:11,a:'end',c:ri?'var(--rt)':'var(--mute)',w:ri?600:400})+tx(x0+hl-6,y+ch/2+12,ri?'':'thoughts',{fs:11,a:'end',c:'var(--mute)'});
      row.forEach((c,ci)=>{const x=x0+hl+ci*cw+3,on=ri&&ci,w=cw-6;
        s+=rc(x,y,w,ch,on?'var(--acc2)':'var(--soft)',{s:on?'var(--acc)':'var(--line)',sw:on?2:1,r:7});
        s+=tx(x+8,y+17,c[0],{fs:13,w:600});
        const L=wrap(c[1],fs,w-16);s+=lines(x+8,y+34,L,{fs});
        s+=tx(x+8,y+ch-8,'HotpotQA EM '+c[2],{fs:11,c:'var(--mute)'})})});
    return {s,h:yh+8+2*(ch+6)-y0}}
  function draw(W){const wide=W>=640,pw=wide?(W-28)/2:W;let o,H;
    const a=loop(0,0,pw);if(wide){const b=grid(pw+28,0,pw);o=a.s+b.s;H=Math.max(a.h,b.h)}else{const b=grid(0,a.h+16,pw);o=a.s+b.s;H=a.h+16+b.h}
    host.innerHTML=svgEl(W,H+4,o,'Left: the ReAct loop; the model emits either a thought, appended to its context with no observation, or an action, which the environment answers with an observation that is appended too. Right: a two by two grid of prompts by whether they contain thoughts and actions: Standard, Act, CoT and ReAct, with their answers to the Apple Remote question and their HotpotQA exact match')}
  fit(host,draw)})();
