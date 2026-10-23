// ---- TPU and Pallas lab (t-tpu): helpers, step-animation controller, static fills from window.TPD ----
window.TP=(function(){
  const D=window.TPD,TAB='t-tpu';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  const tabVisible=()=>{const t=$(TAB);return t&&!t.hidden&&t.offsetParent!==null};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(t);t=setTimeout(f,60)})};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const fmtB=b=>{if(b==null)return '';if(b<1000)return Math.round(b)+' B';if(b<1e6)return (b/1e3).toFixed(b<1e4?2:1)+' kB';if(b<1e9)return (b/1e6).toFixed(b<1e7?2:1)+' MB';return (b/1e9).toFixed(2)+' GB'};
  const fmtMiB=b=>{const m=b/1048576;return (m<10?m.toFixed(2):m.toFixed(1))+' MiB'};
  const fmtN=n=>Number(n).toLocaleString('en-US');
  const fmtT=s=>{if(s<1e-3)return (s*1e6).toFixed(s<1e-5?2:1)+' µs';if(s<1)return (s*1e3).toFixed(s<1e-2?2:1)+' ms';return s.toFixed(2)+' s'};
  const fmtE=x=>{if(x===0)return '0';const e=Math.floor(Math.log10(Math.abs(x)));return (x/Math.pow(10,e)).toFixed(1)+'e'+e};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const seg=(el,items,cur,f)=>{el.insertAdjacentHTML('beforeend',items.map(it=>'<button data-m="'+esc(it[0])+'"'+(it[0]===cur?' class="on"':'')+'>'+it[1]+'</button>').join(''));
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':' fill="var(--ink)"')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'"'+(o.rx?' rx="'+o.rx+'"':'')+' fill="'+(o.fill||'none')+'"'+(o.st?' stroke="'+o.st+'" stroke-width="'+(o.sw||1)+'"':'')+(o.op!=null?' fill-opacity="'+o.op+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const GEN=Object.fromEntries(D.gens.map(g=>[g.gen,g]));
  const GLAB={'v4':'v4','v5e':'v5e','v5p':'v5p','v6e':'v6e','7x':'TPU7x'};
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'"><label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1300)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1300)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&card.offsetParent){st.started=true;/* never autoplays (2026-10-23) */}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // predict-then-reveal blocks
  document.querySelectorAll('#'+TAB+' .tp-pr').forEach(pr=>{pr.querySelectorAll('.tp-opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.querySelectorAll('.tp-opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.r==='1')x.classList.add('right')});
    if(b.dataset.r!=='1')b.classList.add('wrong');pr.querySelector('.tp-ans').hidden=false}))});

  // ---- section 1: generation table, notes, TensorCore drawing
  const GT=$('tp-gen-t').querySelector('tbody');
  GT.innerHTML=D.gens.map(g=>{const s=g.src;const dev=s.megacore?s.tc_per_chip+' (1 device, megacore)':(s.tc_per_chip===2?'2 (2 devices)':'1 (1 device)');
    return '<tr><td>'+esc(g.name)+'</td><td class="num">'+dev+'</td><td class="num">'+s.mxus_per_tc+' &times; '+s.mxu+'&sup2;</td><td class="num">'+s.vmem_mib+' MiB</td><td class="num">'+esc(g.hbm_txt)+'</td><td class="num">'+fmtN(Math.round(g.bw/1e9))+'</td><td class="num">'+(g.ici?fmtN(g.ici/1e9):'not listed')+'</td><td class="num">'+Math.round(g.ridge)+'</td></tr>'}).join('');
  $('tp-notes-l').innerHTML=D.notes.map(n=>'<li>'+esc(n.t)+'</li>').join('');
  let coreGen='v5e';
  function drawCore(){
    const el=$('tp-core-svg');const W=Math.min(640,width(el));const g=GEN[coreGen],s=g.src;const narrow=W<460;
    let b='';const fs=narrow?10:11;
    const hb={x:6,y:8,w:W-12,h:34};b+=rect(hb.x,hb.y,hb.w,hb.h,{rx:6,fill:'var(--c4)',op:.15,st:'var(--c4)'});
    b+=tx(W/2,hb.y+15,'HBM '+esc(g.hbm_txt)+' per chip',{a:'middle',fs:fs+1,w:600})+tx(W/2,hb.y+29,fmtN(Math.round(g.bw/1e9))+' GB/s, shared by '+s.tc_per_chip+' TensorCore'+(s.tc_per_chip>1?'s':''),{a:'middle',fs:fs,fill:'var(--mute)'});
    const cy=hb.y+hb.h+22;b+=tx(14,cy+14,'one TensorCore',{fs:fs,fill:'var(--mute)'});
    b+='<line x1="'+(W/2)+'" y1="'+(hb.y+hb.h)+'" x2="'+(W/2)+'" y2="'+(cy+24)+'" stroke="var(--acc)" stroke-width="2"/>'+tx(W/2+6,cy-4,'DMA',{fs:fs,fill:'var(--acc)'});
    const vx=20,vy=cy+24,vw=W-40,vh=40;b+=rect(vx,vy,vw,vh,{rx:5,fill:'var(--c1)',op:.15,st:'var(--c1)'});
    b+=tx(W/2,vy+16,'VMEM '+s.vmem_mib+' MiB',{a:'middle',fs:fs+1,w:600})+tx(W/2,vy+31,'software-managed scratchpad: Pallas refs live here',{a:'middle',fs:fs,fill:'var(--mute)'});
    const ry=vy+vh+14,boxes=[];const nm=s.mxus_per_tc;
    boxes.push({t:'vregs 8 x 128',d:'sublanes x lanes',c:'var(--c3)'});boxes.push({t:'VPU',d:'elementwise',c:'var(--c3)'});
    for(let i=0;i<nm;i++)boxes.push({t:'MXU',d:s.mxu+' x '+s.mxu,c:'var(--c2)'});
    boxes.push({t:'scalar + SMEM',d:s.smem_kib>=1024?(s.smem_kib/1024)+' MiB':s.smem_kib+' KiB',c:'var(--c5)'});
    const per=narrow?4:boxes.length;const rows=Math.ceil(boxes.length/per);const bw=(W-40-(per-1)*6)/per,bh=narrow?40:46;
    boxes.forEach((bx,i)=>{const r=Math.floor(i/per),c=i%per;const x=20+c*(bw+6),y=ry+r*(bh+6);b+=rect(x,y,bw,bh,{rx:5,fill:bx.c,op:.15,st:bx.c});
      b+=tx(x+bw/2,y+18,bx.t,{a:'middle',fs:fs,w:600})+tx(x+bw/2,y+33,bx.d,{a:'middle',fs:fs-1,fill:'var(--mute)'})});
    const by=ry+rows*(bh+6)+4;
    b=rect(6,cy,W-12,by+18-cy,{rx:8,st:'var(--line)',sw:1.5})+b;
    b+=tx(W/2,by+12,'ICI to neighbours: '+(g.ici?fmtN(g.ici/1e9)+' GB/s per chip, ':'')+esc(g.topo.split(' (')[0]),{a:'middle',fs:fs,fill:'var(--mute)'});
    el.innerHTML=svg(W,by+24,b,'Schematic of one TensorCore of '+g.name);
  }
  if($('tp-core-svg')){seg($('tp-core-gen'),D.gens.map(g=>[g.gen,GLAB[g.gen]]),coreGen,m=>{coreGen=m;drawCore()});
  onRender(drawCore);onResize(drawCore);}

  // ---- section 6: code, results, bugs, Mosaic
  $('tp-code-mm').textContent=D.code.matmul;$('tp-code-fa').textContent=D.code.flash;
  const P=D.pal,TM=P.timing;
  $('tp-res-t').querySelector('tbody').innerHTML=
    '<tr><td>matmul, A [4,096 &times; 512] @ W2 [512 &times; 128], float32</td><td>(8, 1, 4), 512 &times; 128 &times; 128</td><td class="num">'+fmtE(P.matmul.err_f32)+'</td><td class="num">'+TM.mm_xla_ms.toFixed(1)+' ms</td><td class="num">'+TM.mm_interp_ms.toFixed(1)+' ms (TPU interpreter '+Math.round(TM.mm_tpu_interp_ms)+' ms)</td></tr>'+
    '<tr><td>same, bf16 inputs, float32 accumulation</td><td>same</td><td class="num">'+fmtE(P.matmul.err_bf16_inputs)+'</td><td class="num"></td><td class="num"></td></tr>'+
    '<tr><td>flash attention, q, k, v [128 heads &times; 128 &times; 32], causal</td><td>(128, 2, 2), 64 &times; 64</td><td class="num">'+fmtE(P.flash.err)+'</td><td class="num">'+TM.att_xla_ms.toFixed(1)+' ms</td><td class="num">'+TM.att_interp_ms.toFixed(0)+' ms</td></tr>';
  const B=Object.fromEntries(P.bugs.map(b=>[b.k,b]));
  const cell=o=>{if(o.raised)return '<span class="tp-ok">raises</span>: <code>'+esc(o.msg)+'</code>';if(o.nan)return '<span class="tp-ok">output full of NaN</span> (uninitialised buffer shows)';if(o.err!=null)return o.err>1e-3?'<span class="tp-bad">wrong answer</span>, max error '+o.err.toFixed(2)+(o.races===false?' (no race reported)':''):'<span class="tp-bad">right answer, bug hidden</span> (error '+fmtE(o.err)+')';return ''};
  $('tp-bug-t').querySelector('tbody').innerHTML=
    '<tr><td>1. never zeroes the accumulator</td><td>'+cell(B.nozero.plain)+'</td><td>'+cell(B.nozero.tpu)+'</td></tr>'+
    '<tr><td>2. K axis marked <code>"parallel"</code> (2 cores)</td><td>'+cell(B.kparallel.plain)+'</td><td>'+cell(B.kparallel.tpu)+'</td></tr>'+
    '<tr><td>3. index map reads tile k + 1</td><td>'+(B.oob.plain.raised?cell(B.oob.plain):'<span class="tp-bad">silently wrong</span>, max error '+B.oob.plain.err.toFixed(2))+'</td><td>'+cell(B.oob.tpu)+'</td></tr>';
  $('tp-mosaic').textContent=P.mosaic.text;$('tp-badblock').textContent=P.bad_block.msg;
  // ---- section 9: free access; section 10: source table
  $('tp-free').innerHTML='<div class="tw"><table class="tp-t"><thead><tr><th>Route</th><th>Status</th><th>What the provider says</th></tr></thead><tbody>'+
    D.free.map(f=>'<tr><td>'+({trc:'TPU Research Cloud',colab:'Google Colab',kaggle:'Kaggle notebooks'}[f.k])+'</td><td>'+(f.status==='unconfirmed'?'<span class="unc">unconfirmed</span>':esc(f.status))+'</td><td>'+esc(f.t)+' '+f.src.map(u=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">source</a>').join(', ')+'</td></tr>').join('')+'</tbody></table></div>';
  $('tp-src-t').querySelector('tbody').innerHTML=Object.values(D.src).map(s=>'<tr><td><a href="https://github.com/jax-ml/jax/blob/jax-v0.11.2/'+s.file+'#L'+s.line+'" target="_blank" rel="noopener noreferrer"><code>'+esc(s.file.replace('jax/_src/',''))+':'+s.line+'</code></a></td><td>'+esc(s.what)+'</td></tr>').join('');
  return {D,RM,$,esc,onRender,onResize,width,fmtB,fmtMiB,fmtN,fmtT,fmtE,stat,seg,svg,tx,rect,anim,tabVisible,GEN,GLAB};
})();
