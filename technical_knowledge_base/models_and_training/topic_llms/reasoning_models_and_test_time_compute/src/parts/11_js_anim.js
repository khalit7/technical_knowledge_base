// ---- Shared step-animation engine: play, pause, step, scrub, speed; animates only on screen and in the visible tab ----
// cfg: {card, pre (id prefix), n(mode) -> number of steps, draw(mode,k,e) where e in [0,1] is progress through step k, dur(mode,k) -> ms at 1x}
function makeAnim(cfg){
  const card=$(cfg.card);if(!card)return null;
  const P=cfg.pre,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const st={m:cfg.mode,k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0};
  const cl=v=>v<0?0:v>1?1:v;
  const N=()=>cfg.n(st.m);
  function draw(){const e=RM?1:cl(st.t);cfg.draw(st.m,st.k,e);
    const sc=$(P+'Scrub');sc.max=N()*100;sc.value=Math.round((st.k+cl(st.t))*100);
    const pb=$(P+'Play'),end=st.k===N()-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play')}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/cfg.dur(st.m,st.k);if(st.t>=1){if(st.k<N()-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $(P+'Play').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===N()-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<N()-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $(P+'Fwd').addEventListener('click',()=>{pause();if(st.t<1)st.t=1;else st.k=Math.min(N()-1,st.k+1),st.t=1;draw()});
  $(P+'Back').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $(P+'Scrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(N()-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=N()*100)st.t=1;draw()});
  $(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$(P+'M');if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab(cfg.tab||'t-read',()=>{draw();kick()});
  draw();
  return {st,draw,narrow:()=>card.clientWidth<560};
}

// ---- Animation 1: one problem, one long chain against five parallel samples (vote or verifier) ----
(function(){
  if(!$('sp'))return;
  // Illustrative model and budget, the page's own: 60 layers, 8 KV heads of 128 in BF16, 50 tokens a second.
  const L=60,KVB=2*60*8*128*2,TPS=50,U=250,BUD=10000; // one square = 250 tokens
  // serial trace: phases [from,to,label,colour]
  const SER=[[0,3500,'attempt 1','c1'],[3500,4500,'"Wait": re-check','c5'],[4500,8000,'attempt 2','c1'],[8000,9500,'verify','c3'],[9500,10000,'answer','c4']];
  const ANS=[384,412,384,97,384],LEN=2000; // five samples of 2,000 tokens each, answers illustrative
  const S={
    ser:[['The problem arrives','One prompt, one sequence. The model will spend the whole budget, 10,000 tokens, on a single chain. Each token is one full forward pass through all 60 layers, conditioned on everything written so far.',0,0],
      ['Attempt 1','The first 3,500 tokens work the problem and reach a candidate answer, 412. Every token adds 240 KiB of keys and values to the cache, because every later token must be able to attend to it.',0,3500],
      ['Re-check ("Wait")','The model rereads its own working, finds a step that contradicts an earlier one, and backs up. Only a sequential chain can do this: the later tokens see the earlier ones.',3500,4500],
      ['Attempt 2','A second line of attack from the corrected step, 3,500 more tokens. Nothing here can run in parallel: token 6,000 cannot start before token 5,999 exists.',4500,8000],
      ['Verify, then answer','The model substitutes its result back into the problem, then commits to 384. 10,000 tokens at an illustrative 50 tokens a second is 200 seconds before the answer starts. How likely the answer is to be right has no formula: it depends on how well the model revises.',8000,10000]],
    vote:[['The problem arrives, five times','The same prompt is sampled five times, independently and at a temperature above zero, so the five chains take different paths. The budget is the same 10,000 tokens, split 5 × 2,000.',0,0],
      ['Five chains at once','All five generate simultaneously. Wall-clock time follows the longest chain, not the total: 1,000 tokens each is 20 seconds, whatever the number of chains, given the hardware.',0,1000],
      ['Five answers','At 2,000 tokens (40 seconds) each chain commits: 384, 412, 384, 97, 384. No chain saw another, so chain 2\'s mistake was never corrected; it can only be outvoted.',1000,2000],
      ['Majority vote','The most common final answer wins: 384, three votes of five. Voting needs answers in a comparable form (a number, a choice), which is why it works for mathematics and not for essays.',2000,2000],
      ['What the vote is worth','If each chain is right with p = 0.6 and the wrong ones all agree on one answer, a five-vote is right 68.3% of the time; if wrong answers scatter over four values, 83.5%. With p below the strongest wrong answer, more votes make it worse (Sampling lab tab).',2000,2000]],
    ver:[['The problem arrives, five times','The same prompt is sampled five times, independently, with the same 10,000-token budget split 5 × 2,000. This time a checker exists: unit tests, a proof checker, or a reference answer.',0,0],
      ['Five chains at once','All five generate simultaneously: 1,000 tokens each after 20 seconds.',0,1000],
      ['Five answers','At 2,000 tokens each (40 seconds) the chains commit: 384, 412, 384, 97, 384.',1000,2000],
      ['The verifier checks each','Only answers the checker accepts survive (384, three times); the selector needs just one. It is correct by construction on the property it checks, so a larger sample can only help.',2000,2000],
      ['What the verifier is worth','The chance that at least one of five is right is pass@5 = 1 − (1 − 0.6)⁵ = 0.990 at p = 0.6. A learned reward model in the checker\'s place is weaker: a larger sample is also a larger search for its errors (Sampling lab tab).',2000,2000]]};
  const col={c1:'var(--c1)',c3:'var(--c3)',c4:'var(--c4)',c5:'var(--c5)'};
  function draw(m,k,e){
    const narrow=$('sp').clientWidth<560,steps=S[m],s=steps[k];
    const pitch=narrow?7.6:16,cs=pitch-2,x0=narrow?8:70,W=narrow?Math.max(340,x0+40*pitch+12):x0+40*pitch+170,laneH=narrow?14:22;
    const par=m!=='ser',lanes=par?5:1,top=34,H=top+lanes*(laneH+6)+(narrow?96:44);let g='';
    // time axis: 0 to 200 s, one square = 250 tokens = 5 s at 50 tokens a second
    for(let t=0;t<=200;t+=50){const x=x0+t/5*pitch;g+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(top+lanes*(laneH+6))+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top-10)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+t+' s</text>'}
    g+='<text x="'+x0+'" y="12" font-size="10.5" fill="var(--mute)">'+(narrow?'Wall-clock time; 1 square = 250 tokens':'Wall-clock time at 50 tokens a second (illustrative). One square = 250 tokens, to scale.')+'</text>';
    const upto=s[2]+(s[3]-s[2])*e; // tokens generated per chain so far
    let tok=0;
    if(!par){
      if(!narrow)g+='<text x="'+(x0-6)+'" y="'+(top+laneH/2+4)+'" font-size="11" text-anchor="end">1 chain</text>';
      for(let i=0;i<BUD/U;i++){const a=i*U;if(a>=upto)break;const ph=SER.find(p=>a>=p[0]&&a<p[1]);const fill=Math.min(1,(upto-a)/U);
        g+='<rect x="'+(x0+i*pitch+1)+'" y="'+(top+1)+'" width="'+(cs*fill).toFixed(2)+'" height="'+(laneH-2)+'" rx="2" fill="'+col[ph[3]]+'"/>'}
      tok=upto;
      // phase labels under the lane
      if(!narrow)SER.forEach(p=>{if(upto>p[0]){const xa=x0+p[0]/U*pitch,xb=x0+p[1]/U*pitch;g+='<text x="'+((xa+xb)/2)+'" y="'+(top+laneH+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+p[2]+'</text>'}});
      if(k===4&&e>=1){const x=x0+40*pitch+10;g+=narrow?'':'<rect x="'+x+'" y="'+(top-2)+'" width="140" height="'+(laneH+4)+'" rx="6" class="boxc"/><text x="'+(x+70)+'" y="'+(top+laneH/2+4)+'" font-size="12" text-anchor="middle">answer: 384</text>'}
    }else{
      for(let j=0;j<5;j++){const y=top+j*(laneH+6);if(!narrow)g+='<text x="'+(x0-6)+'" y="'+(y+laneH/2+4)+'" font-size="11" text-anchor="end">chain '+(j+1)+'</text>';
        for(let i=0;i<LEN/U;i++){const a=i*U;if(a>=upto)break;const fill=Math.min(1,(upto-a)/U);
          g+='<rect x="'+(x0+i*pitch+1)+'" y="'+(y+1)+'" width="'+(cs*fill).toFixed(2)+'" height="'+(laneH-2)+'" rx="2" fill="'+(i===LEN/U-1?'var(--c4)':'var(--c1)')+'"/>'}
        if(upto>=LEN){const ok=ANS[j]===384,xa=x0+LEN/U*pitch+6;let mark='';
          if(m==='ver'&&k>=3)mark=ok?' ✓':' ✗';
          g+='<text x="'+xa+'" y="'+(y+laneH/2+4)+'" font-size="'+(narrow?10:12)+'" fill="'+(m==='ver'&&k>=3?(ok?'var(--good)':'var(--bad)'):'var(--ink)')+'">'+ANS[j]+mark+'</text>'}}
      tok=5*upto;
      if(k>=3){const bx0=narrow?x0:x0+LEN/U*pitch+70,by=narrow?top+5*(laneH+6)+6:top,bw=narrow?W-x0-12:200,bh=narrow?40:5*(laneH+6)-6;
        g+='<rect x="'+bx0+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="8" class="'+(k>=3?'boxc':'box')+'"/>';
        if(m==='vote'){const t=['384: three votes','412: one','97: one'];if(narrow)g+='<text x="'+(bx0+bw/2)+'" y="'+(by+17)+'" font-size="11" text-anchor="middle">Vote: 384 ×3, 412 ×1, 97 ×1</text><text x="'+(bx0+bw/2)+'" y="'+(by+32)+'" font-size="11" text-anchor="middle" font-weight="600">returns 384</text>';
          else{g+='<text x="'+(bx0+14)+'" y="'+(by+22)+'" font-size="12" font-weight="600">Majority vote</text>';t.forEach((l,i)=>g+='<text x="'+(bx0+14)+'" y="'+(by+44+i*18)+'" font-size="12">'+l+'</text>');g+='<text x="'+(bx0+14)+'" y="'+(by+bh-12)+'" font-size="12" font-weight="600">returns 384</text>'}}
        else{if(narrow)g+='<text x="'+(bx0+bw/2)+'" y="'+(by+17)+'" font-size="11" text-anchor="middle">Verifier accepts chains 1, 3, 5</text><text x="'+(bx0+bw/2)+'" y="'+(by+32)+'" font-size="11" text-anchor="middle" font-weight="600">returns 384</text>';
          else{g+='<text x="'+(bx0+14)+'" y="'+(by+22)+'" font-size="12" font-weight="600">Verifier</text><text x="'+(bx0+14)+'" y="'+(by+44)+'" font-size="12">accepts chains 1, 3, 5</text><text x="'+(bx0+14)+'" y="'+(by+62)+'" font-size="12">rejects 2 and 4</text><text x="'+(bx0+14)+'" y="'+(by+bh-12)+'" font-size="12" font-weight="600">returns 384</text>'}}}
    }
    // legend
    const leg=par?[['c1','reasoning tokens'],['c4','final answer']]:[['c1','working'],['c5','re-check'],['c3','verify'],['c4','answer']];
    let lx=x0,ly=H-14;leg.forEach(([c,l])=>{const lw=l.length*5.8+26;if(lx+lw>W){lx=x0;ly+=14}g+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="'+col[c]+'"/><text x="'+(lx+14)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';lx+=lw});
    $('spSvg').innerHTML=svgEl(W,H,g,'Test-time compute spent '+(par?'as five parallel chains':'as one long chain'));
    $('spStep').textContent='Step '+(k+1)+' of '+steps.length+': '+s[0];$('spCap').textContent=s[1];
    const longest=upto,secs=longest/TPS;
    $('spCnt').innerHTML=stat('Tokens generated',fmt(tok),'of the 10,000 budget')+
      stat('Wall-clock so far',fmt(secs)+' s','longest chain ÷ 50 tokens a second')+
      stat('KV cache held',fmtBytes(tok*KVB),(par?'5 sequences, ':'1 sequence, ')+'240 KiB a token')+
      stat('Serial depth L × T',fmt(L*longest),'layer applications in the longest chain')+
      stat('Chance the answer is right',m==='ser'?'no formula':m==='vote'?(k>=4?'68.3% to 83.5%':'·'):(k>=4?'99.0%':'·'),m==='ser'?'depends on revision quality':m==='vote'?'p = 0.6, five votes':'pass@5 at p = 0.6');
  }
  makeAnim({card:'sp',pre:'sp',mode:'ser',n:m=>S[m].length,dur:(m,k)=>S[m][k][3]>S[m][k][2]?2600+(S[m][k][3]-S[m][k][2])*0.35:2600,draw});
})();
