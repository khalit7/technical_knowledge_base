// ---- Heavy: parallel agents against one longer chain, same tokens, same time scale ----
(function(){
  const card=$('hv');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const A=8,S=2,MS=120; // tokens per attempt and synthesis, in thousands (illustrative); ms per 1,000 tokens at 1x
  const st={m:'par',n:4,t:RM?0:0,play:!RM,spd:1,vis:false,raf:0,last:0,lp:-1};
  const T=()=>st.m==='par'?A+S:st.n*A+S;
  const phases=()=>st.m==='par'?[0,A,A+S]:[0,st.n*A,st.n*A+S];
  const phaseOf=t=>{const p=phases();return t<=0?0:t<p[1]?1:t<p[2]?2:3};
  function cap(ph){const n=st.n;
    if(st.m==='par')return [['Step 1 of 4: the query goes to '+n+' agents','Each agent starts its own attempt at the same moment. Nothing is shared yet, so their mistakes are only partly correlated.'],
      ['Step 2 of 4: '+n+' attempts in parallel','Every agent writes its reasoning at the same time. The tokens billed grow '+n+' times as fast as one chain\'s, but the clock moves as if there were one.'],
      ['Step 3 of 4: the leader synthesises','A designated leader agent reconciles the attempts into one answer. Only its output and tool calls come back to you; the sub-agents\' work is billed but hidden.'],
      ['Step 4 of 4: answer','Done in '+(A+S)+' units of time, with '+fmt((n*A+S)*1000)+' tokens billed. The same tokens spent as one chain would take '+(n*A+S)+' units.']][ph];
    return [['Step 1 of 4: one chain of thought','The same budget, spent serially: one model thinks for longer before answering.'],
      ['Step 2 of 4: thinking longer','Each token waits for the one before it, so time grows with the tokens. A chain that goes wrong early carries the error forward unless it notices and backtracks.'],
      ['Step 3 of 4: the final answer','The chain writes its answer, the same 2,000 tokens the leader writes in the parallel run.'],
      ['Step 4 of 4: answer','Done in '+(n*A+S)+' units of time, with '+fmt((n*A+S)*1000)+' tokens billed: the same bill as '+n+' parallel agents, '+((n*A+S)/(A+S)).toFixed(1)+' times the wait.']][ph]}
  function draw(){const n=st.n,narrow=card.clientWidth<560,W=narrow?360:680,pl=narrow?56:78,maxT=n*A+S,pitch=(W-pl-10)/maxT,rows=st.m==='par'?n+1:1,rowH=Math.max(6,Math.min(18,(narrow?150:190)/(n+1))),gap=Math.max(2,rowH*0.25);
    const t=st.t,top=34,Hrows=(st.m==='par'?n+1:2)*(rowH+gap),H=top+Math.max(Hrows,(n+1)*(Math.max(6,Math.min(18,(narrow?150:190)/(n+1)))+gap))+40;let s='';
    s+='<text x="'+pl+'" y="14" font-size="11" fill="var(--mute)">'+(narrow?'1 square = 1,000 tokens = 1 unit of time':'Time runs left to right; one square = 1,000 tokens = one unit of time, the same scale in both modes')+'</text>';
    const cell=(x,y,f)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,pitch-1).toFixed(1)+'" height="'+rowH.toFixed(1)+'" rx="1.5" fill="'+f+'"/>';
    const lab=(y,tx)=>'<text x="'+(pl-6)+'" y="'+(y+rowH/2+4)+'" font-size="'+(rowH<10?9:10.5)+'" text-anchor="end" fill="var(--mute)">'+tx+'</text>';
    if(st.m==='par'){for(let a=0;a<n;a++){const y=top+a*(rowH+gap);if(n<=4||a%4===0||a===n-1)s+=lab(y,'Agent '+(a+1));for(let k=0;k<A;k++){s+=cell(pl+k*pitch,y,t>k?'var(--c1)':'var(--soft)')}}
      const y=top+n*(rowH+gap);s+=lab(y,'Leader');for(let k=0;k<S;k++)s+=cell(pl+(A+k)*pitch,y,t>A+k?'var(--c2)':'var(--soft)')}
    else{const y=top;s+=lab(y,'One chain');for(let k=0;k<n*A;k++)s+=cell(pl+k*pitch,y,t>k?'var(--c1)':'var(--soft)');for(let k=0;k<S;k++)s+=cell(pl+(n*A+k)*pitch,y,t>n*A+k?'var(--c2)':'var(--soft)')}
    const px=pl+Math.min(t,maxT)*pitch,yb=H-30;s+='<line x1="'+px+'" x2="'+px+'" y1="'+(top-6)+'" y2="'+(yb+4)+'" stroke="var(--ink)" stroke-width="1.2"/>';
    s+='<line x1="'+pl+'" x2="'+(pl+maxT*pitch)+'" y1="'+yb+'" y2="'+yb+'" stroke="var(--mute)"/>';
    [0,A+S,maxT].filter((v,i,a)=>a.indexOf(v)===i).forEach(v=>{s+='<line x1="'+(pl+v*pitch)+'" x2="'+(pl+v*pitch)+'" y1="'+yb+'" y2="'+(yb+4)+'" stroke="var(--mute)"/><text x="'+(pl+v*pitch)+'" y="'+(yb+16)+'" font-size="10.5" text-anchor="'+(v===0?'start':v===maxT?'end':'middle')+'" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+(pl-6)+'" y="'+(yb+16)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">time</text>';
    $('hvSvg').innerHTML=svgEl(W,H,s,'Tokens and time for '+(st.m==='par'?n+' parallel agents':'one chain'));
    const ph=phaseOf(t);if(ph!==st.lp){const c=cap(ph);$('hvStep').textContent=c[0];$('hvCap').textContent=c[1];st.lp=ph}
    const tok=st.m==='par'?Math.min(t,A)*n+Math.max(0,Math.min(t-A,S)):Math.min(t,n*A+S);
    $('hvCnt').innerHTML=stat('Tokens billed so far',fmt(Math.round(tok*1000)),'of '+fmt((n*A+S)*1000)+' (all agents count)')+stat('Elapsed',(Math.min(t,T())).toFixed(1)+' units','finishes at '+T())+stat('Attempts',st.m==='par'?n+' at once':'1, serial',st.m==='par'?'plus a leader':'')+stat('Other mode','time '+(st.m==='par'?n*A+S:A+S),'same '+fmt((n*A+S)*1000)+' tokens');
    $('hvScrub').value=Math.round(400*Math.min(1,t/T()));
    const pb=$('hvPlay'),end=t>=T();pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play')}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;st.t+=dt*st.spd/MS;if(st.t>=T()){st.t=T();st.play=false}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('hvPlay').addEventListener('click',()=>{if(st.play)pause();else{if(st.t>=T())st.t=0;st.play=true;kick()}draw()});
  $('hvFwd').addEventListener('click',()=>{pause();const p=phases();st.t=p.find(v=>v>st.t+1e-9)??T();draw()});
  $('hvBack').addEventListener('click',()=>{pause();const p=phases();const b=p.filter(v=>v<st.t-1e-9);st.t=b.length?b[b.length-1]:0;draw()});
  $('hvScrub').addEventListener('input',e=>{pause();st.t=T()*(+e.target.value)/400;draw()});
  $('hvSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('hvN').addEventListener('change',e=>{st.n=+e.target.value;st.t=0;st.lp=-1;if(!RM)st.play=true;draw();kick()});
  const seg=$('hvM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});st.m=b.dataset.m;st.t=0;st.lp=-1;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
