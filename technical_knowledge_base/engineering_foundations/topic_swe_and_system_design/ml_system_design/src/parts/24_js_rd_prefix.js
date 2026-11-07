// ---- Reading, Caching: one conversation, prompt laid out two ways (prefix caching before/after) ----
window.MSD_PREFIX=(function(){
  // tokens (illustrative): system prompt and tool definitions, one user turn (incl. a 30-token line with the time and user context), one reply
  const SYS=2000,USER=130,REPLY=400,TURNS=6;
  // Claude Sonnet 5.5 prices, USD per million tokens (KB shared snapshot, 2026-10-01): input, cache write (5-minute), cache read, output
  const PIN=2,PWRITE=2.5,PREAD=0.2,POUT=10;
  function turns(mode){const out=[];let cum=0,cumTok=0;
    for(let k=1;k<=TURNS;k++){const input=SYS+(k-1)*(USER+REPLY)+USER;
      // before: the time line sits at the top of the system prompt, so no request shares a prefix with the last one
      // after: static first, append-only: each request starts with the whole previous request
      const prev=k===1?0:SYS+(k-2)*(USER+REPLY)+USER;
      const cached=mode==='after'?prev:0,fresh=input-cached;
      const cost=mode==='after'?(cached*PREAD+fresh*PWRITE+REPLY*POUT)/1e6:(input*PIN+REPLY*POUT)/1e6;
      cum+=cost;cumTok+=fresh;out.push({k,input,cached,fresh,cost,cum,cumTok})}
    return out}
  return {turns,SYS,USER,REPLY,TURNS,PIN,PWRITE,PREAD,POUT};
})();
(function(){
  const card=document.getElementById('rd-pc-card');if(!card)return;
  const M=window.MSD_PREFIX,el=document.getElementById('rd-pc-svg'),cnt=document.getElementById('rd-pc-cnt');
  let mode='before';
  function draw(i){const T=M.turns(mode),W=Math.max(280,Math.min(860,RD.width(el))),fs=W<420?10:11,L=W<420?44:54,R=6,bh=16,gap=10;
    const max=T[T.length-1].input,x=v=>L+(W-L-R)*v/max;let b='',y=6;
    T.forEach((t,j)=>{const on=j<=i,op=on?1:.18;
      b+=RD.t(L-6,y+bh-4,'Turn '+t.k,{fs:fs,a:'end',fill:on?'var(--ink)':'var(--mute)'});
      // segments: [time line][system] or [system][history][new turn]
      let segs=[];
      if(mode==='before'){segs.push([0,30,'var(--c2)']);segs.push([30,M.SYS,'var(--c1)']);segs.push([M.SYS,t.input-M.USER+30,'var(--dim)']);segs.push([t.input-M.USER+30,t.input,'var(--c5)'])}
      else{segs.push([0,M.SYS,'var(--c1)']);segs.push([M.SYS,t.input-M.USER,'var(--dim)']);segs.push([t.input-M.USER,t.input-M.USER+30,'var(--c2)']);segs.push([t.input-M.USER+30,t.input,'var(--c5)'])}
      segs.forEach(s=>{if(s[1]>s[0])b+='<rect x="'+x(s[0])+'" y="'+y+'" width="'+Math.max(1,x(s[1])-x(s[0]))+'" height="'+bh+'" fill="'+s[2]+'" opacity="'+op+'"/>'});
      if(on&&t.cached>0)b+='<rect x="'+x(0)+'" y="'+(y-2)+'" width="'+(x(t.cached)-x(0))+'" height="'+(bh+4)+'" fill="none" stroke="var(--good)" stroke-width="2" rx="2"/>';
      if(on)b+=RD.t(Math.min(W-R,x(t.input)+4),y+bh-4,'',{fs:fs});
      y+=bh+gap});
    el.innerHTML=RD.svg(W,y,b,'Six turns of one conversation; the green outline marks the part of each prompt served from the prefix cache');
    const t=T[i];   // the explanation of each turn is the step list on the left (ol#sx-pc-before, ol#sx-pc-after)
    cnt.innerHTML=RD.stat('Tokens the model processes this turn',t.fresh.toLocaleString('en-US'),'')+
      RD.stat('Cost this turn','$'+t.cost.toFixed(4),'input and 400 output tokens')+
      RD.stat('Conversation so far','$'+t.cum.toFixed(4),t.cumTok.toLocaleString('en-US')+' tokens processed')}
  const A=RD.anim({card:'rd-pc-card',ctl:'rd-pc-ctl',n:M.TURNS,draw,ms:4200,label:'Turn',list:'sx-pc-before'});
  // a mode switch swaps the step list and replays (the one exception to "stops for good")
  RD.seg(document.getElementById('rd-pc-seg'),m=>{mode=m;['before','after'].forEach(x=>document.getElementById('sx-pc-'+x).hidden=x!==m);A.reset(M.TURNS,'sx-pc-'+m)});
  RD.onResize(()=>A.redraw());
})();
