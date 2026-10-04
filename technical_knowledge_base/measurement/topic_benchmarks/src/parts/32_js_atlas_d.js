// ---- Benchmark atlas (t-atlas), part d: one training cutoff against five test sets (animation) ----
(function(){
  const A=window.BENCH_ATLAS,AT=window.AT;if(!A||!AT||!A.anim)return;
  const N=A.anim,esc=AT.esc,$=id=>document.getElementById(id);
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mlab=m=>MON[m%12]+' '+Math.floor(m/12);
  const steps=[];for(let m=N.start;m<=N.end;m+=N.step)steps.push(m);
  const ax0=2013*12,ax1=2026*12+11;
  let mode='all',i=0,timer=null,playing=false;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrub=$('at-scrub');scrub.max=steps.length-1;
  $('at-an-mode').innerHTML='<button data-m="all" class="on">All five</button><button data-m="two">Before and after: static against refreshed</button>';
  $('at-an-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('at-an-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('at-an-src').innerHTML='Data: '+N.lanes.map(l=>esc(l.n)+' from '+AT.sa(l.s)).join('; ')+'. FrontierMath\'s count is approximate (about 300). The cutoff path is illustrative; every item count and date is from the sources. "Could be in training data" means public before the cutoff, nothing more.';
  function lane(l,cut){
    const tot=l.items.reduce((a,b)=>a+b[1],0);
    const pub=l.kind!=='private'&&l.kind!=='licensed';
    let seen=0,scored=tot,after=0;
    if(pub){l.items.forEach(([m,c])=>{if(m<cut)seen+=c;else after+=c})}
    if(l.kind==='rolling'){scored=after;seen=0}
    if(!pub)seen=0;
    const half=scored?1.96*Math.sqrt(0.25/scored)*100:null;
    return {tot,scored,seen,after,half,pub}}
  function draw(){
    const cut=steps[i];scrub.value=i;
    const W=Math.max(280,Math.min($('at-lanes').clientWidth||600,900))-18;
    const x=m=>(m-ax0)/(ax1-ax0)*W;
    const ls=N.lanes.filter(l=>mode==='all'||l.id==='swebench_verified'||l.id==='livecodebench');
    const st=ls.map(l=>[l,lane(l,cut)]);
    $('at-lanes').innerHTML=st.map(([l,s])=>{
      const maxc=Math.max(...l.items.map(b=>b[1]));
      let bars='';
      l.items.forEach(([m,c])=>{if(m<ax0||m>ax1+12)return;const h=Math.max(2,Math.sqrt(c/maxc)*19);const before=m<cut;
        const fill=!s.pub?'url(#at-hatch)':(l.kind==='rolling'?(before?'var(--dim)':'var(--c1)'):(before?'var(--c2)':'var(--c1)'));
        const wcol=Math.max(1.6,(l.kind==='artifact'?3:1)/(ax1-ax0)*W);
        bars+='<rect x="'+Math.min(W-wcol,x(m)).toFixed(1)+'" y="'+(30-h).toFixed(1)+'" width="'+wcol.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+fill+'"/>'});
      if(l.kind==='licensed'&&l.items[0][0]>ax1)bars+='<text x="'+(W-2)+'" y="20" text-anchor="end" fill="var(--mute)">published Sep 2026, never public</text>';
      if(l.released){bars+='<line x1="'+x(l.released).toFixed(1)+'" x2="'+x(l.released).toFixed(1)+'" y1="2" y2="30" stroke="var(--mute)" stroke-dasharray="2 2"/><text x="'+(x(l.released)-3).toFixed(1)+'" y="8" text-anchor="end" font-size="10" fill="var(--mute)">benchmark published</text>'}
      const cx=x(cut);
      const share=s.tot?s.scored/s.tot:0,sw=W*share,seenw=s.scored?sw*s.seen/s.scored:0;
      const bar='<rect x="0" y="36" width="'+W+'" height="12" fill="var(--soft)" stroke="var(--line)"/>'
        +(s.pub?'<rect x="0" y="36" width="'+seenw.toFixed(1)+'" height="12" fill="var(--c2)"/><rect x="'+seenw.toFixed(1)+'" y="36" width="'+Math.max(0,sw-seenw).toFixed(1)+'" height="12" fill="var(--c1)"/>':'<rect x="0" y="36" width="'+sw.toFixed(1)+'" height="12" fill="url(#at-hatch)"/>');
      const pc=s.scored?Math.round(100*s.seen/s.scored):0;
      return '<div class="lane"><div class="lh"><span><b>'+esc(l.n)+'</b> <span class="pill">'+esc(A.enums.cd[l.cd][0])+'</span></span><span class="cn">scored <b>'+s.scored.toLocaleString('en-US')+'</b> of '+s.tot.toLocaleString('en-US')+(l.approx?' (approx.)':'')+' | public before cutoff <b>'+(s.pub?pc+'%':'never public')+'</b> | 95% error bar <b>'+(s.half==null?'none':'&#177;'+s.half.toFixed(1)+' pts')+'</b></span></div>'
        +'<svg viewBox="-2 0 '+(W+4)+' 52" width="'+(W+4)+'" height="52" role="img" aria-label="'+esc(l.n)+' items by date against the cutoff">'+bars
        +'<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="0" y2="31" stroke="var(--ink)" stroke-width="2"/>'+bar+'</svg>'
        +'<div class="ln">'+esc(l.note)+'</div></div>'}).join('')
      +'<svg width="0" height="0" style="position:absolute"><defs><pattern id="at-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--soft)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--mute)" stroke-width="2"/></pattern></defs></svg>'
      +'<div class="leg"><span><i class="sw" style="background:var(--c2)"></i>public before the cutoff (could be in training data)</span><span><i class="sw" style="background:var(--c1)"></i>public after the cutoff</span><span><i class="sw" style="background:var(--dim)"></i>older than the cutoff, so a rolling set stops scoring it</span><span><i class="sw" style="background:repeating-linear-gradient(45deg,var(--mute) 0 2px,var(--soft) 2px 4px)"></i>never public</span><span>Top strip: items by date (height grows with the square root of the count). Bottom bar: the scored set, width to scale.</span><span>Axis: Jan 2013 to Dec 2026.</span></div>';
    // caption
    const g=st.find(z=>z[0].id==='swebench_verified'),lc=st.find(z=>z[0].id==='livecodebench');
    let c='<b>Training cutoff '+mlab(cut)+'.</b> ';
    if(g)c+='SWE-bench Verified: '+g[1].seen+' of 500 issues were already public on GitHub'+(cut<g[0].released?', although the benchmark itself would not appear until Aug 2024':'')+'. ';
    if(lc){const s=lc[1];c+=cut>lc[0].data_end?'LiveCodeBench release_v6 has no problem newer than this cutoff: a refreshed set needs a new release to score this model at all. ':(s.scored<1055?'LiveCodeBench scores only the '+s.scored+' problems released after the cutoff, none seen, with an error bar of &#177;'+s.half.toFixed(1)+' points against &#177;4.4 for all 500 SWE-bench Verified items. ':'LiveCodeBench: every problem is newer than this cutoff. ')}
    if(mode==='all')c+='GSM8K is '+(cut>2021*12+9?'entirely public before the cutoff':'not yet published')+'; FrontierMath and Real-SWE never publish their items, so the calendar does not touch them.';
    $('at-acap').innerHTML=c;
    $('at-play').textContent=playing?'Pause':'Play'}
  function stepTo(k){i=Math.max(0,Math.min(steps.length-1,k));draw()}
  function vis(){const t=$('t-atlas');if(!t||t.hidden||document.hidden)return false;const r=$('at-lanes').getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}
  function tick(){if(!playing)return;if(vis()){if(i>=steps.length-1){playing=false;draw();return}stepTo(i+1)}timer=setTimeout(tick,+$('at-speed').value)}
  $('at-play').addEventListener('click',()=>{playing=!playing;if(playing){if(i>=steps.length-1)i=0;clearTimeout(timer);timer=setTimeout(tick,200)}draw()});
  $('at-prev').addEventListener('click',()=>{playing=false;stepTo(i-1)});
  $('at-next').addEventListener('click',()=>{playing=false;stepTo(i+1)});
  scrub.addEventListener('input',()=>{playing=false;stepTo(+scrub.value)});
  // start at a telling step: mid-2024 (Verified about to be published, LiveCodeBench mid-stream)
  i=steps.indexOf(2024*12+3);if(i<0)i=0;
  if(!reduce){/* autoplay only when the reader scrolls it into view */
    if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&!playing&&!draw.started){draw.started=1;i=0;playing=true;timer=setTimeout(tick,600);draw()}})},{threshold:.3});io.observe($('at-lanes'))}}
  window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-atlas']=window.TAB_RENDER['t-atlas']||[]).push(draw);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-atlas').hidden)draw()},120)});
  draw();
})();
