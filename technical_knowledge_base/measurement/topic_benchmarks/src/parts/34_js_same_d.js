// ---- Same model, many numbers: add one condition at a time (animation) ----
(function(){
  const D=window.SM_DATA,U=window.SMU;if(!D||!U)return;
  const {$,esc,srcs}=U;
  const host=$('sm-anv'),conds=$('sm-conds'),cap=$('sm-cap'),cnt=$('sm-cnt'),scrub=$('sm-scrub'),play=$('sm-play');
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st={t:0,i:0,mode:'step',playing:false,speed:1,onScreen:true,shownV:null,anim:null,timer:null};
  const LBL={who:'Who ran it',version:'Version',harness:'Harness',effort:'Effort',split:'Split',sampling:'Sampling',cost:'Cost'};
  const trBar=$('sm-an-tr');
  D.tracks.forEach((t,i)=>{const b=document.createElement('button');b.textContent=t.title;b.dataset.i=i;b.addEventListener('click',()=>{st.t=i;st.i=0;st.shownV=null;stop();draw(false)});trBar.appendChild(b)});
  const steps=()=>{const s=D.tracks[st.t].steps;return st.mode==='ba'?[s[0],s[s.length-1]]:s};
  function svg(v){
    const S=steps(),W=Math.max(280,Math.round(host.clientWidth||600)),narrow=W<520,l=14,r=14,top=narrow?54:58,H=top+58;
    const sx=x=>l+x/100*(W-l-r);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Score on a 0 to 100% scale, step '+(st.i+1)+'">';
    s+='<rect x="'+l+'" y="'+top+'" width="'+(W-l-r)+'" height="14" rx="4" fill="var(--soft)" stroke="var(--line)"/>';
    s+='<rect x="'+l+'" y="'+top+'" width="'+Math.max(0,sx(v)-l).toFixed(1)+'" height="14" rx="4" fill="var(--acc)" opacity="0.85"/>';
    [0,25,50,75,100].forEach(x=>{const X=sx(x);s+='<line x1="'+X+'" x2="'+X+'" y1="'+(top+14)+'" y2="'+(top+19)+'" stroke="var(--mute)"/><text x="'+X+'" y="'+(top+31)+'" font-size="10.5" text-anchor="'+(x===0?'start':x===100?'end':'middle')+'" fill="var(--mute)">'+x+(x===0||x===100?'%':'')+'</text>'});
    // earlier steps: separate ticks, numbered, never joined
    for(let j=0;j<st.i;j++){const X=sx(S[j].v);s+='<line x1="'+X+'" x2="'+X+'" y1="'+(top-8)+'" y2="'+(top+22)+'" stroke="var(--c2)" stroke-width="2" opacity="0.8"/><circle cx="'+X+'" cy="'+(top-13)+'" r="7" fill="var(--bg)" stroke="var(--c2)"/><text x="'+X+'" y="'+(top-9.5)+'" font-size="10" text-anchor="middle" fill="var(--c2)">'+(j+1)+'</text>'}
    const X=sx(v),lab=v.toFixed(1)+'%';const tw=lab.length*(narrow?13:15);const tx=Math.max(l+tw/2,Math.min(W-r-tw/2,X));
    s+='<text x="'+tx+'" y="'+(top-24)+'" font-size="'+(narrow?22:26)+'" font-weight="700" text-anchor="middle" fill="var(--ink)">'+lab+'</text>';
    s+='<path d="M'+X+' '+(top-2)+' l-6 -9 h12 z" fill="var(--ink)"/>';
    s+='<text x="'+l+'" y="'+(H-4)+'" font-size="11" fill="var(--mute)">step '+(st.i+1)+' of '+S.length+'</text>';
    return s+'</svg>';
  }
  function info(){
    const S=steps(),p=S[st.i],prev=st.i>0?S[st.i-1]:null;
    const ch=st.mode==='ba'&&st.i===1?Object.keys(p.c).filter(k=>S[0].c[k]!==p.c[k]):(prev?Object.keys(p.c).filter(k=>prev.c[k]!==p.c[k]):[]);
    conds.innerHTML=Object.keys(p.c).map(k=>'<div class="'+(ch.includes(k)?'chg':'')+'"><b>'+esc(LBL[k]||k)+'</b>'+esc(p.c[k])+'</div>').join('');
    const nCh=ch.filter(k=>k!=='cost').length;
    cap.innerHTML='<b>'+esc(st.mode==='ba'&&st.i===1?'After every change':p.what)+'.</b> '+(st.mode==='ba'&&st.i===1?'All the conditions highlighted changed between the first and the last published reading. ':esc(p.cap)+' ')+(st.i>0&&nCh>1&&st.mode==='step'?'<span class="flag">'+nCh+' conditions at once</span> ':'')+'<span class="small">Source: '+srcs(p.src)+'</span>';
    const seen=S.slice(0,st.i+1).map(x=>x.v),mn=Math.min(...seen),mx=Math.max(...seen);
    const all=new Set();for(let j=1;j<=st.i;j++){Object.keys(S[j].c).forEach(k=>{if(k!=='cost'&&S[j].c[k]!==S[j-1].c[k])all.add(k)})}
    cnt.textContent='Conditions changed so far: '+all.size+(all.size?' ('+[...all].map(k=>(LBL[k]||k).toLowerCase()).join(', ')+')':'')+'. Range so far: '+mn.toFixed(1)+'% to '+mx.toFixed(1)+'%, a spread of '+(mx-mn).toFixed(1)+' points for one model.';
    scrub.max=S.length-1;scrub.value=st.i;
  }
  function draw(animate){
    [...trBar.children].forEach((b,i)=>b.classList.toggle('on',i===st.t));
    const S=steps();if(st.i>S.length-1)st.i=S.length-1;
    const to=S[st.i].v,from=st.shownV==null?to:st.shownV;
    info();
    if(st.anim)cancelAnimationFrame(st.anim);
    if(!animate||reduce||from===to){st.shownV=to;host.innerHTML=svg(to);return}
    const dur=900/st.speed,t0=performance.now();
    const f=now=>{const k=Math.min(1,(now-t0)/dur),e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2,v=from+(to-from)*e;st.shownV=v;host.innerHTML=svg(v);if(k<1)st.anim=requestAnimationFrame(f)};
    st.anim=requestAnimationFrame(f);
  }
  function go(i,anim){const S=steps();st.i=Math.max(0,Math.min(S.length-1,i));draw(anim)}
  function visible(){const t=$('t-same');return st.onScreen&&t&&!t.hidden&&!document.hidden}
  function tick(){if(!st.playing)return;if(visible()){const S=steps();if(st.i>=S.length-1){stop();return}go(st.i+1,true)}st.timer=setTimeout(tick,2800/st.speed)}
  function start(){const S=steps();if(st.i>=S.length-1){st.i=0;st.shownV=null;draw(false)}st.playing=true;play.innerHTML='&#10074;&#10074; Pause';play.setAttribute('aria-label','Pause');clearTimeout(st.timer);st.timer=setTimeout(tick,1200/st.speed)}
  function stop(){st.playing=false;clearTimeout(st.timer);play.innerHTML='&#9654; Play';play.setAttribute('aria-label','Play')}
  play.addEventListener('click',()=>st.playing?stop():start());
  $('sm-first').addEventListener('click',()=>{stop();go(0,true)});
  $('sm-prev').addEventListener('click',()=>{stop();go(st.i-1,true)});
  $('sm-next').addEventListener('click',()=>{stop();go(st.i+1,true)});
  scrub.addEventListener('input',()=>{stop();go(+scrub.value,true)});
  $('sm-speed').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.speed=+b.dataset.s;$('sm-speed').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))}));
  $('sm-an-mode').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.mode=b.dataset.m;$('sm-an-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));stop();st.i=0;st.shownV=null;draw(false)}));
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>{st.onScreen=e.isIntersecting})).observe(host);
  draw(false);
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-same']=(window.TAB_RENDER['t-same']||[]).concat([()=>{draw(false);if(!reduce&&!st.playing&&st.i===0&&!st.started){st.started=1;start()}}]);
  addEventListener('resize',()=>{const t=$('t-same');if(t&&!t.hidden)draw(false)});
})();
