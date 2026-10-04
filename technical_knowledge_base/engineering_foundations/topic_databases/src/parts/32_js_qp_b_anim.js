// ---- Query plans tab: "pages being read" animation. One square per page (or per 10, 100, ... pages when a lane is huge),
// every lane on the same clock taken from the measured times. Plays only on screen in the visible tab; paused under reduced motion. ----
window.QPA=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const N=61;
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  const f=n=>Math.round(n).toLocaleString('en-US');
  const fms=v=>v>=100?f(v):v>=10?v.toFixed(1):v>=1?v.toFixed(2):v.toFixed(3);
  function create(o){
    const card=document.getElementById(o.card),lanesEl=document.getElementById(o.lanes),cap=document.getElementById(o.cap),ctl=document.getElementById(o.ctl),unitEl=document.getElementById(o.unit);
    const st={i:N-1,play:false,timer:0,vis:false,started:false,spd:1,lanes:[],unit:1,max:1};
    ctl.innerHTML='<button data-a="b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button data-a="p" aria-label="Play">&#9654; Play</button><button data-a="f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" min="0" max="'+(N-1)+'" value="0" aria-label="Moment in the query"><label class="small">Speed <select aria-label="Speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const pb=ctl.querySelector('[data-a=p]'),sc=ctl.querySelector('input'),sp=ctl.querySelector('select');
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function layout(){
      const W=Math.max(200,lanesEl.clientWidth||300),s=W<480?5:7,cols=Math.floor((W+1)/(s+1)),capN=cols*(W<480?24:16);
      const maxP=Math.max(1,...st.lanes.map(l=>l.hit+l.rd));let u=1;while(maxP/u>capN)u*=10;
      st.unit=u;st.W=W;st.s=s;st.cols=cols;
      unitEl.textContent='(one square = '+(u===1?'1 page':f(u)+' pages')+' of 8 KB'+(st.lanes.some(l=>l.col)?'; DuckDB in 8 KB units of column data':'')+')';
      lanesEl.innerHTML=st.lanes.map((l,k)=>'<div class="qp-lane"><div class="hd"><b>'+l.label+'</b><span class="ct" id="qpa-c'+k+'"></span></div><canvas id="qpa-v'+k+'" role="img" aria-label="'+l.label+': '+f(l.hit+l.rd)+' pages in '+fms(l.ms)+' ms"></canvas></div>').join('');
      st.lanes.forEach((l,k)=>{const n=(l.hit+l.rd)/u,rows=Math.max(1,Math.ceil(n/cols)),cv=document.getElementById('qpa-v'+k),dpr=window.devicePixelRatio||1;
        cv.width=Math.round(W*dpr);cv.height=Math.round(rows*(s+1)*dpr);cv.style.height=(rows*(s+1))+'px';l.cv=cv;l.n=n;l.dpr=dpr});
    }
    function draw(){
      const t=st.max*st.i/(N-1),hitC=css('--c1'),rdC=css('--c2'),colC=css('--c3'),emC=css('--dim');
      const parts=[];
      st.lanes.forEach((l,k)=>{
        const cx=l.cv.getContext('2d'),s=st.s,cols=st.cols,dpr=l.dpr;cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,st.W,l.cv.height);
        const fr=Math.min(1,l.ms>0?t/l.ms:1),filled=l.n*fr,whole=Math.ceil(l.n),rf=(l.hit+l.rd)>0?l.rd/(l.hit+l.rd):0;
        for(let q=0;q<whole;q++){const x=(q%cols)*(s+1),y=Math.floor(q/cols)*(s+1),cap=Math.min(1,l.n-q);
          cx.fillStyle=emC;cx.fillRect(x,y,s*cap,s);
          const g=Math.min(cap,Math.max(0,filled-q));if(g>0){const isRd=Math.floor((q+1)*rf)>Math.floor(q*rf);cx.fillStyle=l.col?colC:(isRd?rdC:hitC);cx.fillRect(x,y,s*g,s)}}
        const done=fr>=1,pg=(l.hit+l.rd)*fr;
        document.getElementById('qpa-c'+k).textContent=f(pg)+' of '+f(l.hit+l.rd)+' pages · '+(done?'done at '+fms(l.ms)+' ms':fms(t)+' ms');
        parts.push(l.short+(done?' finished at '+fms(l.ms)+' ms':' has read '+f(pg)+' pages ('+Math.round(fr*100)+'%)'));
      });
      cap.textContent=(st.i===0?'Start. ':'At '+fms(t)+' ms: ')+parts.join('; ')+'.'+(st.i===N-1&&st.lanes.length>1?' Squares are drawn to scale: '+(st.unit===1?'each one is a page.':'each one is '+f(st.unit)+' pages, so a lane with fewer pages shows a sliver of one square.'):'');
      sc.value=st.i;
    }
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=N-1){setPlay(false);return}st.i++;draw();if(st.i>=N-1){setPlay(false);return}st.timer=setTimeout(tick,90/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,90/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;pb.innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';pb.setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=N-1){st.i=0;draw()}kick()}
    ctl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
      if(a==='p')setPlay(!st.play);else{setPlay(false);st.i=Math.max(0,Math.min(N-1,st.i+(a==='f'?1:-1)));draw()}});
    sc.addEventListener('input',()=>{setPlay(false);st.i=+sc.value;draw()});
    sp.addEventListener('change',()=>{st.spd=+sp.value});
    if('IntersectionObserver' in window)new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;draw();setPlay(true)}}kick()},{threshold:.2}).observe(card);else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    let rt=0;addEventListener('resize',()=>{if(!card.offsetParent||!st.lanes.length)return;clearTimeout(rt);rt=setTimeout(()=>{layout();draw()},80)});
    return {
      set(lanes){setPlay(false);st.lanes=lanes;st.max=Math.max(...lanes.map(l=>l.ms));layout();
        if(RM||!st.started){st.i=N-1;draw()}else{st.i=0;draw();if(live())setPlay(true)}},
      redraw(){if(st.lanes.length){layout();draw()}}
    };
  }
  return {create,RM};
})();
