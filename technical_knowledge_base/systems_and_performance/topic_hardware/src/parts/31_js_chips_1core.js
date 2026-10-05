// ---- Chip atlas (t-chips): helpers, the table, row detail, compare (formulas checked against src/chips/recompute.py) ----
window.CHIPX=(function(){
  const D=window.CHIPD,S=D.src,L=D.chips,BY={};L.forEach(c=>BY[c.id]=c);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-chips']=window.TAB_RENDER['t-chips']||[]).push(f)};
  const sig=(x,n)=>{if(x==null||!isFinite(x))return '';if(x===0)return '0';n=n||3;const d=Math.max(0,n-1-Math.floor(Math.log10(Math.abs(x))));return (+x.toFixed(Math.min(d,4))).toLocaleString('en-US',{maximumFractionDigits:Math.min(d,4)})};
  // TFLOPS in, readable unit out
  const fF=t=>t==null?'':t>=1e6?sig(t/1e6)+' EFLOPS':t>=1e3?sig(t/1e3)+' PFLOPS':sig(t)+' TFLOPS';
  const fGB=g=>g==null?'':g>=1e3?sig(g/1e3)+' TB':sig(g)+' GB';
  const fBW=t=>t==null?'':t>=1e3?sig(t/1e3)+' PB/s':t<1?sig(t*1e3)+' GB/s':sig(t)+' TB/s';
  const FN={bf16:'BF16',fp8:'FP8',fp4:'FP4',fp6:'FP6',tf32:'TF32',fp32:'FP32',int8:'INT8',fp16:'FP16'};
  // the lowest-precision dense rate the chip publishes
  function low(c){const p=c.peaks;for(const f of ['fp4','fp6','fp8','bf16','fp32'])if(p[f]!=null)return [p[f],f];return [null,null]}
  function peak(c,f){if(f==='low')return low(c)[0];return c.peaks[f]!=null?c.peaks[f]:null}
  function ridge(c,f){const p=peak(c,f);return p!=null&&c.bw?p/c.bw:null} // TFLOP/s over TB/s = FLOPs per byte
  const scaleN=(c,sc)=>sc==='node'?c.node[1]:sc==='dom'?c.dom[1]:1;
  const scaleName=(c,sc)=>sc==='node'?c.node[0]:sc==='dom'?c.dom[0]:'one chip';
  function srcA(k,txt){if(!k||!S[k])return txt?esc(txt):'';const s=S[k];
    if(s.u.charAt(0)==='#')return '<a href="#" data-tab="'+s.u.slice(1)+'">'+esc(txt||s.t)+'</a>';
    return '<a href="'+esc(s.u)+'" target="_blank" rel="noopener noreferrer">'+esc(txt||s.t)+'</a>'}
  const VC={NVIDIA:'var(--c3)',AMD:'var(--c2)',Google:'var(--c1)',AWS:'var(--c5)',Cerebras:'var(--c4)',Groq:'var(--c6)',Apple:'var(--mute)'};
  const inGroup=(c,g)=>g==='all'||(g==='nvdc'&&c.vendor==='NVIDIA'&&c.kind==='dc')||(g==='desk'&&(c.kind==='consumer'||c.kind==='laptop'))||(g==='amd'&&c.vendor==='AMD')||(g==='tpu'&&c.kind==='tpu')||(g==='other'&&['AWS','Cerebras','Groq'].indexOf(c.vendor)>=0);
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-50))};
  // step-animation controller: play, pause, step, scrub, speed; only runs on screen in the visible tab; paused under reduced motion
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl),pid=o.ctl+'-';
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1800)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1800)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.3}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  // tween numbers for smooth redraws (skipped under reduced motion)
  function tween(from,to,ms,f){if(RM||!from){f(to);return}const t0=performance.now();let raf;
    (function step(t){const k=Math.min(1,(t-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;f(to.map((v,i)=>from[i]+(v-from[i])*e));if(k<1)raf=requestAnimationFrame(step)})(t0);}
  function tabLinks(el){el.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}})}
  return {D,S,L,BY,RM,esc,sig,fF,fGB,fBW,FN,low,peak,ridge,scaleN,scaleName,srcA,VC,inGroup,width,anim,tween,onRender,tabLinks};
})();

// ---- the table, the row detail and the compare panel share one state ----
(function(){
  const X=window.CHIPX,{L,BY,esc,sig,fF,fGB,fBW,FN}=X;
  const st={g:'all',fmt:'bf16',sc:'chip',sort:'rel',dir:1,sel:'h100',cmp:['h100','b200','mi355x']};
  window.CHIPSTATE=st;
  const tab=document.getElementById('chip-tab'),det=document.getElementById('chip-det'),cmp=document.getElementById('chip-cmp');
  X.tabLinks(det);X.tabLinks(document.getElementById('t-chips'));
  const derivedFields=c=>c.d?Object.keys(c.d):[];
  const COLS=[
    {k:'name',t:'Chip',cls:'nm'},
    {k:'rel',t:'Released'},
    {k:'peak',t:'Peak',num:1},
    {k:'mem',t:'Memory',num:1},
    {k:'bw',t:'Bandwidth',num:1},
    {k:'ridge',t:'FLOPs/byte',num:1},
    {k:'link',t:'Link/chip',num:1},
    {k:'tdp',t:'Power',num:1},
    {k:'cmp',t:'Compare',nosort:1}];
  function sortVal(c,k){const n=X.scaleN(c,st.sc);
    if(k==='name')return c.short;if(k==='rel')return c.rel||'9999';if(k==='peak'){const p=X.peak(c,st.fmt);return p==null?-1:p*n}
    if(k==='mem')return c.mem*n;if(k==='bw')return c.bw*n;if(k==='ridge'){const r=X.ridge(c,st.fmt);return r==null?-1:r}
    if(k==='link')return c.link==null?-1:c.link;if(k==='tdp')return c.tdp==null?-1:c.tdp*n;return 0}
  function head(){const fl=st.fmt==='low'?'lowest format':FN[st.fmt];
    tab.tHead.innerHTML='<tr>'+COLS.map(o=>'<th class="'+(o.cls||'')+(o.num?' num':'')+(o.nosort?' nosort':'')+(st.sort===o.k?' on':'')+'" data-k="'+o.k+'">'+
      (o.k==='peak'?'Peak, '+esc(fl)+' dense':o.t)+(st.sort===o.k?(st.dir>0?' &#9650;':' &#9660;'):'')+'</th>').join('')+'</tr>'}
  function rows(){
    const list=L.filter(c=>X.inGroup(c,st.g)).slice().sort((a,b)=>{const x=sortVal(a,st.sort),y=sortVal(b,st.sort);return (x<y?-1:x>y?1:0)*st.dir});
    tab.tBodies[0].innerHTML=list.map(c=>{const n=X.scaleN(c,st.sc),p=X.peak(c,st.fmt),lw=X.low(c);
      const fs=st.fmt==='low'?lw[1]:st.fmt,spv=fs&&c.sp[fs]!=null?c.sp[fs]*n:null;
      const r=X.ridge(c,st.fmt),dv=derivedFields(c).length;
      return '<tr data-id="'+c.id+'"'+(st.sel===c.id?' class="sel"':'')+'><td class="nm"><b>'+esc(c.short)+'</b>'+(c.status==='announced'?'<span class="chip-tag an">announced</span>':'')+(dv?'<span class="chip-tag dv">derived</span>':'')+'<small>'+esc(c.vendor)+', '+esc(c.arch)+'</small></td>'+
      '<td>'+(c.rel?c.rel.slice(0,7):'')+'</td>'+
      '<td class="num">'+(p==null?'<span class="mute">not published</span>':fF(p*n))+(st.fmt==='low'&&lw[1]?'<small>'+FN[lw[1]]+'</small>':'')+(spv!=null?'<small>sparse: '+fF(spv)+'</small>':'')+(st.fmt==='bf16'&&c.kind==='consumer'&&p!=null?'<small>FP32 accumulate</small>':'')+'</td>'+
      '<td class="num">'+fGB(c.mem*n)+(n>1?'<small>'+n+' x '+fGB(c.mem)+'</small>':'')+'</td>'+
      '<td class="num">'+fBW(c.bw*n)+'</td>'+
      '<td class="num">'+(r==null?'':sig(r))+'</td>'+
      '<td class="num">'+(c.link==null?'':c.link>=1000?sig(c.link/1000)+' TB/s':sig(c.link)+' GB/s')+'</td>'+
      '<td class="num">'+(c.tdp==null?'':(c.tdp*n>=1e4?sig(c.tdp*n/1e3)+' kW':sig(c.tdp*n)+' W'))+'</td>'+
      '<td><input type="checkbox" aria-label="Compare '+esc(c.short)+'" data-c="'+c.id+'"'+(st.cmp.indexOf(c.id)>=0?' checked':'')+'></td></tr>'}).join('');
  }
  function note(){const el=document.getElementById('chip-scalenote');
    el.textContent=st.sc==='chip'?'Per chip: one GPU, one TPU chip, one wafer. "Link/chip" is always the per-chip scale-up link (bidirectional total, as vendors print it). FLOPs/byte does not change with scale.':
      st.sc==='node'?'Per server: the unit a vendor sells as one machine (8-GPU HGX board, AMD 8-GPU platform, TPU host or VM, Trainium instance, a 2-GPU superchip for NVL72 racks). Multiplied from the per-chip figures; the detail of each row names the server.':
      'Per scale-up domain: all the chips one fast fabric joins (NVLink on an 8-GPU board or a 72-GPU rack, a TPU pod, a Trainium UltraServer). Multiplied from per-chip figures and checked against the vendor’s own rack or pod totals where published (row detail). Gaming cards have no scale-up link: one chip.'}
  function detail(){const c=BY[st.sel];if(!c){det.innerHTML='';return}
    const fmts=['fp32','tf32','bf16','fp8','fp6','fp4','int8','fp16'].filter(f=>c.peaks[f]!=null||c.sp[f]!=null);
    const pk='<div class="tw"><table><thead><tr><th>Format</th><th class="num">Dense</th><th class="num">Sparse (as printed)</th></tr></thead><tbody>'+fmts.map(f=>'<tr><td>'+FN[f]+(f==='int8'?' (TOPS)':'')+'</td><td class="num">'+(c.peaks[f]!=null?sig(c.peaks[f],4):'<span class="mute">not published</span>')+'</td><td class="num">'+(c.sp[f]!=null?sig(c.sp[f],4):'')+'</td></tr>').join('')+'</tbody></table></div>';
    const dv=c.d?'<p class="small"><span class="chip-tag dv">derived</span> '+Object.keys(c.d).map(k=>'<b>'+esc(k)+'</b>: '+esc(c.d[k])).join('; ')+'</p>':'';
    const me=(c.meas||[]).map(m=>'<li><span class="chip-tag me">measured</span> '+esc(m.what)+': '+esc(m.txt)+' ('+X.srcA(m.src)+')</li>').join('');
    const pr=(c.price||[]).map(p=>'<li>$'+sig(p.usd,4)+' per '+esc(p.unit)+', '+esc(p.what)+', '+esc(p.date)+' ('+X.srcA(p.src)+')</li>').join('');
    const sk=c.src,srcs=Object.keys(sk).filter(k=>sk[k]).map(k=>'<b>'+({peaks:'peaks',mem:'memory',arch:'architecture',rel:'date',link:'link',tdp:'power'}[k]||k)+'</b>: '+X.srcA(sk[k])).join('<br>');
    det.innerHTML='<div class="chip-det"><h3>'+esc(c.name)+(c.status==='announced'?' <span class="chip-tag an">announced</span>':'')+'</h3>'+
      '<dl class="chip-kv"><dt>Architecture</dt><dd>'+esc(c.arch)+'</dd><dt>Process</dt><dd>'+esc(c.proc)+'</dd><dt>Dies</dt><dd>'+esc(c.dies)+'</dd><dt>Compute units</dt><dd>'+esc(c.units)+'</dd><dt>Matrix units</dt><dd>'+esc(c.tc)+'</dd>'+
      '<dt>Memory</dt><dd>'+esc(c.memt)+', '+fGB(c.mem)+', '+fBW(c.bw)+'</dd><dt>On-chip SRAM</dt><dd>'+esc(c.sram)+'</dd><dt>Power</dt><dd>'+esc(c.tdptxt||(c.tdp?sig(c.tdp)+' W':'not published'))+'</dd>'+
      '<dt>Link</dt><dd>'+esc(c.linkname)+'</dd><dt>Server</dt><dd>'+esc(c.node[0])+' ('+c.node[1]+')</dd><dt>Scale-up domain</dt><dd>'+esc(c.dom[0])+' ('+c.dom[1].toLocaleString('en-US')+')</dd><dt>Date</dt><dd>'+esc(c.reltxt)+'</dd></dl>'+
      (c.acc?'<p class="small"><b>Accumulate:</b> '+esc(c.acc)+'</p>':'')+pk+dv+(me?'<ul class="tight">'+me+'</ul>':'')+(pr?'<p class="small" style="margin-bottom:0"><b>Prices</b></p><ul class="tight">'+pr+'</ul>':'')+
      '<p class="small">'+esc(c.note||'')+'</p><p class="chip-src">'+srcs+'</p>'+rackCheck(c)+'</div>'}
  function rackCheck(c){if(!c.rack)return '';const n=c.dom[1];
    const lab={bf16:'BF16 dense',fp8:'FP8',fp4:'FP4 dense',mem:'memory',bw:'bandwidth',link:'link total'};
    const rows=Object.keys(c.rack).map(k=>{const per=k==='mem'?c.mem:k==='bw'?c.bw:k==='link'?c.link:c.peaks[k];const mine=per*n,v=c.rack[k],r=mine/v;
      const f=k==='mem'?fGB:k==='bw'?fBW:k==='link'?(x=>x>=1000?sig(x/1000)+' TB/s':sig(x)+' GB/s'):fF;
      return '<tr><td>'+lab[k]+'</td><td class="num">'+f(mine)+'</td><td class="num">'+f(v)+'</td><td class="num"'+(Math.abs(r-1)>.02?' style="color:var(--bad);font-weight:600"':'')+'>'+(r>=1?'+':'')+sig((r-1)*100,2)+'%</td></tr>'}).join('');
    return '<p class="small" style="margin:8px 0 2px"><b>Check:</b> per-chip figure x '+n.toLocaleString('en-US')+' against the vendor’s own '+esc(c.dom[0])+' figure.</p><div class="tw"><table><thead><tr><th></th><th class="num">x '+n+'</th><th class="num">Vendor total</th><th class="num">Gap</th></tr></thead><tbody>'+rows+'</tbody></table></div>'}
  function compare(){
    const cs=st.cmp.map(id=>BY[id]).filter(Boolean);
    if(cs.length<2){cmp.innerHTML='<p class="small mute">Tick two or three chips in the table.</p>';return}
    const ms=[
      ['BF16 dense',c=>c.peaks.bf16,fF,1],['FP8 dense',c=>c.peaks.fp8,fF,1],['Lowest format, dense',c=>X.low(c)[0],fF,1,c=>FN[X.low(c)[1]]||''],
      ['Memory',c=>c.mem,fGB,1],['Bandwidth',c=>c.bw,fBW,1],['FLOPs per byte, BF16',c=>X.ridge(c,'bf16'),v=>sig(v),0],
      ['Link per chip',c=>c.link,v=>v>=1000?sig(v/1000)+' TB/s':sig(v)+' GB/s',0],['Power',c=>c.tdp,v=>v>=1e4?sig(v/1e3)+' kW':sig(v)+' W',1],
      ['BF16 dense TFLOPS per kW',c=>c.peaks.bf16&&c.tdp?c.peaks.bf16/c.tdp*1000:null,v=>sig(v),0]];
    const col=['var(--c1)','var(--c2)','var(--c3)'];
    let h='<p class="small mute">At '+(st.sc==='chip'?'chip':st.sc==='node'?'server':'scale-up domain')+' scale (the toggle above). Bars are relative to the largest of the chips compared.</p>';
    ms.forEach(m=>{const mult=c=>m[3]?X.scaleN(c,st.sc):1;const vals=cs.map(c=>{const v=m[1](c);return v==null?null:v*mult(c)});if(vals.every(v=>v==null))return;const mx=Math.max.apply(null,vals.filter(v=>v!=null));
      h+='<div class="m">'+m[0]+'</div>'+cs.map((c,i)=>'<div class="r"><span class="nm">'+esc(c.short)+'</span><span class="tr">'+(vals[i]!=null?'<span class="fl" style="width:'+(100*vals[i]/mx).toFixed(1)+'%;background:'+col[i]+'"></span>':'')+'</span><span class="v">'+(vals[i]!=null?m[2](vals[i])+(m[4]?' '+m[4](c):''):'n/p')+'</span></div>').join('');
      if(vals[0]!=null&&vals[1]!=null)h+='<div class="x">'+esc(cs[1].short)+' / '+esc(cs[0].short)+' = '+sig(vals[1]/vals[0])+'x'+(cs[2]&&vals[2]!=null?'; '+esc(cs[2].short)+' / '+esc(cs[0].short)+' = '+sig(vals[2]/vals[0])+'x':'')+'</div>'});
    cmp.innerHTML=h+'<p class="small mute">n/p = not published. Power for TPUs, Trainium and Rubin is not published, so their per-kW row is empty.</p>'}
  function all(){head();rows();note();detail();compare();if(window.CHIPVIZ)window.CHIPVIZ.redraw()}
  tab.tHead.addEventListener('click',e=>{const th=e.target.closest('th');if(!th||th.classList.contains('nosort'))return;const k=th.dataset.k;
    if(st.sort===k)st.dir=-st.dir;else{st.sort=k;st.dir=(k==='name'||k==='rel')?1:-1}head();rows()});
  tab.tBodies[0].addEventListener('click',e=>{const cb=e.target.closest('input[data-c]');
    if(cb){const id=cb.dataset.c,i=st.cmp.indexOf(id);if(cb.checked){if(i<0)st.cmp.push(id);if(st.cmp.length>3){st.cmp.shift()}}else if(i>=0)st.cmp.splice(i,1);rows();compare();return}
    const tr=e.target.closest('tr[data-id]');if(!tr)return;st.sel=tr.dataset.id;rows();detail()});
  document.getElementById('chip-flt').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.g=b.dataset.g;
    document.querySelectorAll('#chip-flt button').forEach(x=>x.classList.toggle('on',x===b));rows()});
  document.getElementById('chip-fmt').addEventListener('change',e=>{st.fmt=e.target.value;head();rows()});
  document.getElementById('chip-scale').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.sc=b.dataset.m;
    document.querySelectorAll('#chip-scale button').forEach(x=>x.classList.toggle('on',x===b));all()});
  window.CHIPTAB={all,rows,detail,compare};
  all();
})();
