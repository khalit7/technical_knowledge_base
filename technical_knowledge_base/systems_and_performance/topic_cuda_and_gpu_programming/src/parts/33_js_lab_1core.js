// ---- Kernel lab (t-lab): helpers, data access and every derived number. Data: window.LABD (33_js_lab_0data.js). ----
// The pure functions in LABX.calc are checked against src/lab/code/recompute.py (out/expected.json).
window.LABX=(function(){
  const D=window.LABD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-lab');
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(f)};
  const visible=()=>{const t=tab();return !!t&&!t.hidden&&t.offsetParent!==null};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  function onResize(f){let t=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(f,80)})}
  function seg(el,items,cur,f){
    el.innerHTML=items.map(([k,l])=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+l+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  }
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const fmt=(x,d)=>{if(x==null||!isFinite(x))return 'n/a';return x.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0})};
  const fms=x=>x>=100?fmt(x,0):x>=10?fmt(x,1):x>=1?fmt(x,2):fmt(x,3);
  const fbytes=b=>b>=2**40?fmt(b/2**40,1)+' TiB':b>=2**30?fmt(b/2**30,b>=10*2**30?0:2)+' GiB':b>=2**20?fmt(b/2**20,0)+' MiB':fmt(b/2**10,0)+' KiB';
  // ---- data access ----
  const cases=D.cases;
  const find=(g,step,N)=>cases.find(c=>c.group===g&&c.step===step&&(N==null||c.N===N));
  // ---- pure calculations (mirrored in recompute.py) ----
  const calc={
    gbs:(bytes,ms)=>bytes/(ms/1e3)/1e9,
    gflops:(flops,ms)=>flops/(ms/1e3)/1e9,
    smMinBytes:(R,C)=>8*R*C,                                   // read once, write once, fp32
    smReqBytes:(R,C,pr,pw)=>4*R*C*(pr+pw),                       // bytes the kernel asks for
    fusedBytes:(mode,N,d)=>{const s=4*N*N,v=4*N*d,o=4*N*d;       // minimum device-memory traffic by design (V counted once)
      return mode==='U'?s+s+s+v+o:mode==='F2'?2*s+v+o:s+v+o},
    attnFlops:(H,N,d)=>4*H*N*N*d,
    naiveAttnBytes:(H,N,el)=>H*N*N*el,                          // one N x N score matrix per head (MLX reuses it for P)
    attnInputs:(H,N,d,el)=>4*H*N*d*el,                          // Q, K, V, O
    floorMs:(bytes,tbs)=>bytes/(tbs*1e12)*1e3,
    // online softmax for one row: scores s[], values v[], tiles of size t. Returns per-tile state.
    online:(s,v,t)=>{let m=-Infinity,l=0,acc=0;const st=[];
      for(let k=0;k<s.length;k+=t){const tile=s.slice(k,k+t),vt=v.slice(k,k+t);const mt=Math.max(...tile),mn=Math.max(m,mt);
        const alpha=Math.exp(m-mn);let ps=0,pv=0;tile.forEach((x,i)=>{const p=Math.exp(x-mn);ps+=p;pv+=p*vt[i]});
        l=l*alpha+ps;acc=acc*alpha+pv;m=mn;st.push({k,mt,m,alpha,l,acc,out:acc/l})}
      return st},
    naive:(s,v)=>{const m=Math.max(...s);let l=0,acc=0;s.forEach((x,i)=>{const p=Math.exp(x-m);l+=p;acc+=p*v[i]});return {m,l,acc,out:acc/l}},
    // mulberry32, the same generator as recompute.py
    rng:seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296},
    demoRow:()=>{const r=calc.rng(7);const s=[],v=[];for(let i=0;i<32;i++){s.push(Math.round((r()*6-2+(i===13?3:0)+(i===27?4:0))*100)/100);v.push(Math.round((r()*2-1)*100)/100)}return {s,v}}
  };
  // ---- step-animation controller (play, pause, step, scrub, speed); animates only while on screen in the
  // visible tab; plays once when first scrolled into view; never autoplays under prefers-reduced-motion ----
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const p=o.ctl+'-';
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+p+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+p+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label>Speed <select id="'+p+'v" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option></select></label>';
    const g=s=>$(p+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&visible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1300)/st.spd)}
    function setPlay(v){st.play=v;const b=g('p');b.innerHTML=v?'&#10074;&#10074; Pause':'&#9654; Play';b.setAttribute('aria-label',v?'Pause':'Play');
      clearTimeout(st.timer);st.timer=0;if(v){if(st.i>=st.n-1){st.i=0;show()}st.timer=setTimeout(tick,(o.ms||1300)/st.spd)}}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{es.forEach(e=>{st.vis=e.isIntersecting;
      if(st.vis&&!st.started&&!RM&&visible()){st.started=true;setPlay(true)}else if(st.vis&&st.play&&!st.timer){st.timer=setTimeout(tick,400)}})},{threshold:.3}).observe(card)}
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&st.play&&!st.timer)st.timer=setTimeout(tick,400)});
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},show,setPlay,get i(){return st.i},get n(){return st.n}};
  }
  // ---- a small predict-then-reveal widget ----
  function quiz(el,q,opts,right,ans){
    el.innerHTML='<b>Predict first.</b> '+q+'<div class="opts">'+opts.map((x,i)=>'<button data-i="'+i+'">'+x+'</button>').join('')+'</div><div class="lab-ans" hidden></div>';
    el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      el.querySelectorAll('.opts button').forEach((x,i)=>{x.classList.toggle('lab-right',i===right);x.classList.toggle('lab-wrong',x===b&&i!==right)});
      const a=el.querySelector('.lab-ans');a.hidden=false;a.innerHTML=(+b.dataset.i===right?'<b>Right.</b> ':'<b>Not quite.</b> ')+ans});
  }
  // ---- horizontal bar chart in SVG, laid out from the measured width ----
  function hbars(el,rows,o){
    const W=width(el),lw=Math.min(W*0.42,o.lw||190),vw=W<480?58:70,bw=Math.max(60,W-lw-vw-8),rh=o.rh||22,H=rows.length*rh+(o.ref?18:6);
    const mx=o.max||Math.max(...rows.map(r=>r.v))*1.05;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.aria||'bar chart')+'">';
    rows.forEach((r,i)=>{const y=i*rh+3,w=Math.max(1,bw*Math.min(r.v,mx)/mx);
      const mc=Math.floor((lw-8)/6.1),lab=r.label.length>mc?r.label.slice(0,mc-1)+'\u2026':r.label;
      s+='<text x="'+(lw-6)+'" y="'+(y+rh*0.62)+'" text-anchor="end" font-weight="'+(r.on?700:400)+'"><title>'+esc(r.label)+'</title>'+esc(lab)+'</text>'+
        '<rect x="'+lw+'" y="'+(y+2)+'" width="'+w+'" height="'+(rh-7)+'" rx="2" fill="'+(r.col||'var(--c1)')+'" opacity="'+(r.on?1:0.62)+'"'+(r.on?' stroke="var(--ink)" stroke-width="1"':'')+'></rect>'+
        '<text x="'+(lw+w+4)+'" y="'+(y+rh*0.62)+'" font-size="11">'+esc(r.vt)+'</text>'});
    if(o.ref){const x=lw+bw*o.ref.v/mx;s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(H-14)+'" stroke="var(--bad)" stroke-dasharray="4 3"></line>'+
      '<text x="'+Math.min(x,W-4)+'" y="'+(H-3)+'" text-anchor="'+(x>W*0.6?'end':'middle')+'" fill="var(--bad)" font-size="10.5">'+esc(o.ref.label)+'</text>'}
    el.innerHTML=s+'</svg>';
  }
  // links to other tabs inserted after load (quiz answers): delegate, and stop the tab script's own handler doubling up
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('#t-lab a[data-tab]');if(!a)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b&&b.getAttribute('aria-selected')!=='true'){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}});
  return {D,RM,esc,$,onRender,visible,width,onResize,seg,stat,fmt,fms,fbytes,find,calc,anim,quiz,hbars};
})();
