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
  const M=window.MSD_PREFIX,el=document.getElementById('rd-pc-svg'),cap=document.getElementById('rd-pc-cap'),cnt=document.getElementById('rd-pc-cnt');
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
    const t=T[i];
    cap.innerHTML='<div class="t">Turn '+t.k+': '+t.input.toLocaleString('en-US')+' input tokens, '+t.cached.toLocaleString('en-US')+' from the cache</div><p>'+
      (mode==='before'?(i===0?'The prompt starts with a line holding the current time to the second, then the 2,000-token system prompt. Nothing is cached yet.':
        'The time line changed, and it is the very first thing in the prompt. A prefix cache matches from the first token, so one changed token at the start makes everything after it a miss: the whole conversation is processed again, every turn.'):
       (i===0?'Same content, new order: the unchanging system prompt first, then the conversation, then the new message with its time line at the end. The first request writes the cache (at a 25% premium on Anthropic\'s 5-minute cache).':
        'The request is append-only: it begins with the whole previous request, byte for byte, so all of that comes from the cache at a tenth of the input price. The model processes only what is new since then, the previous reply and the new message: '+t.fresh.toLocaleString('en-US')+' tokens, written to the cache for the next turn.'))+'</p>';
    cnt.innerHTML=RD.stat('Tokens the model processes this turn',t.fresh.toLocaleString('en-US'),'')+
      RD.stat('Cost this turn','$'+t.cost.toFixed(4),'input and 400 output tokens')+
      RD.stat('Conversation so far','$'+t.cum.toFixed(4),t.cumTok.toLocaleString('en-US')+' tokens processed')}
  const A=RD.anim({card:'rd-pc-card',ctl:'rd-pc-ctl',n:M.TURNS,draw,ms:1500,label:'Turn'});
  RD.seg(document.getElementById('rd-pc-seg'),m=>{mode=m;A.reset(M.TURNS);A.play()});
  RD.onResize(()=>A.redraw());
})();
