// ---- Profiler trace tab: two real traces (before and after the hunt), same clock, animated playhead ----
(function(){
  const D=window.FST,U=window.FU,$=U.$,esc=RD.esc;
  const TR=D.hunt_trace&&D.hunt_trace.traces;if(!TR)return;
  const keys=Object.keys(TR);
  const pair=dev=>{const b=TR[dev+':s0'];const a=keys.filter(k=>k.startsWith(dev+':')&&k!==dev+':s0').map(k=>TR[k])[0];return [b,a]};
  const STG={s1:'+ DataLoader workers',s2:'+ fused AdamW',s3:'+ SDPA',s4:'+ no per-step sync',s5:'+ bfloat16',s6:'+ torch.compile',s7:'+ compile and bfloat16'};
  const RCOL={'data':'var(--c5)','forward':'var(--c1)','backward':'var(--c4)','optimizer':'var(--c3)','log loss (.item)':'var(--c2)'};
  let dev='mps',zoom=1,pan=0,A=null,sel=null;const N=60;
  function lanesOf(tr){ // rows: lane 0 depth 0..4, lane 1 depth 0..3
    const maxd=[0,0,0,0];tr.events.forEach(e=>{if(e[0]<4)maxd[e[0]]=Math.max(maxd[e[0]],Math.min(e[4],4))});return maxd}
  function rangeAt(tr,t){let r=null;tr.events.forEach(e=>{const n=tr.names[e[3]];if(e[5]&&RCOL[n]&&e[1]<=t&&t<=e[1]+e[2])r=n});return r}
  function panel(tr,y0,w,X,lab,tcut,rowH,pi){
    let s='';const maxd=lanesOf(tr);let y=y0+14;
    s+=RD.t(2,y0+10,lab,{fs:11,w:600});
    const laneY=[];tr.lanes.forEach((ln,li)=>{if(li>3)return;laneY[li]=y;y+=(maxd[li]+1)*rowH+6});
    tr.lanes.forEach((ln,li)=>{if(li>3)return;s+='<line x1="0" x2="'+w+'" y1="'+(laneY[li]-2)+'" y2="'+(laneY[li]-2)+'" stroke="var(--line)"/>'});
    tr.events.forEach((e,i)=>{if(e[0]>3)return;const d=Math.min(e[4],4);const x=X(e[1]),x2=X(e[1]+e[2]);if(x2<0||x>w)return;
      const nm=tr.names[e[3]];const col=e[5]?(RCOL[nm]||'var(--c6)'):(/local_scalar_dense|aten::item/.test(nm)?'var(--c2)':e[0]===0?'var(--acc)':'var(--c4)');
      const xx=Math.max(0,x),ww=Math.max(0.6,Math.min(w,x2)-xx);
      s+='<rect data-p="'+pi+'" data-i="'+i+'" x="'+xx.toFixed(1)+'" y="'+(laneY[e[0]]+d*rowH)+'" width="'+ww.toFixed(1)+'" height="'+(rowH-1)+'" fill="'+col+'" opacity="'+(e[5]?0.9:0.7)+'" style="cursor:pointer"/>';
      if(e[5]&&RCOL[nm]&&ww>46)s+='<text x="'+(xx+3)+'" y="'+(laneY[e[0]]+rowH-2)+'" font-size="9.5" fill="var(--bg)" pointer-events="none">'+esc(nm)+'</text>'});
    const xe=X(tr.step_us);if(xe>=0&&xe<=w)s+='<line x1="'+xe+'" x2="'+xe+'" y1="'+y0+'" y2="'+y+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    if(tcut!=null){const xc=X(Math.min(tcut,tr.step_us));if(xc>=0&&xc<=w){s+='<rect x="'+xc+'" y="'+(y0+12)+'" width="'+Math.max(0,Math.min(w,X(tr.step_us))-xc)+'" height="'+(y-y0-12)+'" fill="var(--bg)" opacity="0.6" pointer-events="none"/><line x1="'+xc+'" x2="'+xc+'" y1="'+(y0+12)+'" y2="'+y+'" stroke="var(--ink)" stroke-width="1.5"/>'}}
    return [s,y+8];
  }
  function draw(i){
    const [b,a]=pair(dev);const el=$('tr-svg'),w=RD.width(el)-4,tmax=Math.max(b.step_us,a.step_us);
    const span=tmax/zoom,x0=(tmax-span)*pan;const X=t=>(t-x0)/span*w;const rowH=w<500?8:10;
    const tcut=tmax*i/(N-1);
    const narrow=w<620;
    let [s1,y1]=panel(b,0,w,X,(narrow?'Before':'Before: as first written')+' ('+(b.step_us/1e3).toFixed(1)+' ms)',tcut,rowH,0);
    let [s2,y2]=panel(a,y1,w,X,narrow?'After: '+(STG[a.stage]||a.stage)+' ('+(a.step_us/1e3).toFixed(1)+' ms)':'After: '+(STG[a.stage]||a.stage)+' and the fixes before it'+(a.stage==='s6'?', bfloat16 reverted':'')+' ('+(a.step_us/1e3).toFixed(1)+' ms)',tcut,rowH,1);
    // time axis
    let ax='';const tick=[1,2,5,10,20,50,100].map(v=>v*1e3).find(v=>span/v<=8)||2e5;
    for(let t=Math.ceil(x0/tick)*tick;t<=x0+span;t+=tick)ax+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+y2+'" y2="'+(y2+4)+'" stroke="var(--mute)"/>'+RD.t(X(t),y2+15,(t/1e3)+' ms',{a:'middle',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y2+20,s1+s2+ax,'Two profiler traces on one time axis');
    const rb=rangeAt(b,tcut),ra=tcut>a.step_us?null:rangeAt(a,tcut);
    const CAPS={'data':'The main thread is fetching the batch: with num_workers=0 the Dataset\'s Python work runs right here, and nothing else happens.',
      'forward':'The CPU walks the model\'s Python code and launches one operator after another.','backward':'Autograd walks the graph backwards; on MPS the engine runs it on its own device thread (second lane).',
      'optimizer':'AdamW updates every parameter: in the for-loop version, several small ops per tensor; fused, one kernel for all.',
      'log loss (.item)':'.item() copies one number to Python. On MPS it must wait until every queued GPU kernel has finished, so this bar is the GPU\'s backlog showing up on the CPU.'};
    $('tr-cap').innerHTML='<div class="t">'+(tcut>=b.step_us?'Before: step finished':'Before: '+(rb||'between ranges'))+'</div><p>'+(tcut>=b.step_us?'Both steps are done; the gap between the dashed lines is what the fixes saved.':(CAPS[rb]||''))+'</p>';
    $('tr-cnt').innerHTML=RD.stat('Clock',(tcut/1e3).toFixed(1)+' ms')+RD.stat('Before',rb||(tcut>=b.step_us?'done':'...'),'step '+(b.step_us/1e3).toFixed(1)+' ms')+RD.stat('After',ra||(tcut>=a.step_us?'done':'...'),'step '+(a.step_us/1e3).toFixed(1)+' ms')+RD.stat('Saved per step',((b.step_us-a.step_us)/1e3).toFixed(1)+' ms',(100*(1-a.step_us/b.step_us)).toFixed(0)+'% of the traced step');
  }
  function table(which){
    const [b,a]=pair(dev);const tr=which==='b'?b:a;const tot=tr.step_us;
    let h='<table class="rd-tbl"><thead><tr><th>ATen op</th><th class="num">Self time</th><th class="num">Share of step</th><th class="num">Calls</th></tr></thead><tbody>';
    tr.top_self.forEach(r=>{h+='<tr><td><code>'+esc(r[0])+'</code></td><td class="num">'+(r[1]/1e3).toFixed(2)+' ms</td><td class="num">'+(100*r[1]/tot).toFixed(1)+'%</td><td class="num">'+r[2]+'</td></tr>'});
    $('tr-top').innerHTML=h+'</tbody></table>';
  }
  let which='b';
  $('tr-svg').addEventListener('click',e=>{const r=e.target.closest('rect[data-i]');if(!r)return;const [b,a]=pair(dev);const tr=+r.dataset.p?a:b;const ev=tr.events[+r.dataset.i];
    $('tr-info').innerHTML='<b>'+esc(tr.names[ev[3]])+'</b> ('+(+r.dataset.p?'after':'before')+', '+(ev[0]?'second thread':'main thread')+', depth '+ev[4]+'): starts at '+(ev[1]/1e3).toFixed(2)+' ms, lasts '+(ev[2]/1e3).toFixed(3)+' ms.'});
  $('tr-leg').innerHTML=[['data','var(--c5)'],['forward','var(--c1)'],['backward','var(--c4)'],['optimizer','var(--c3)'],['.item() wait','var(--c2)'],['ops, main thread','var(--acc)']].map(c=>'<span style="--sw:'+c[1]+'">'+c[0]+'</span>').join('');
  A=RD.anim({card:'tr-anim-card',ctl:'tr-ctl',n:N,ms:180,draw,label:'Clock'});
  (window.TAB_RENDER['t-trace']=window.TAB_RENDER['t-trace']||[]).push(()=>{A.redraw();table(which)});
  U.seg($('tr-dev'),[['mps','MPS (Apple GPU)'],['cpu','CPU, 4 threads']],d=>{dev=d;if(A){A.reset(N)}table(which);note()},'mps');
  U.seg($('tr-which'),[['b','Before'],['a','After']],w=>{which=w;table(w)},'b');
  $('tr-zoom').addEventListener('change',e=>{zoom=+e.target.value;A.redraw()});
  $('tr-pan').addEventListener('input',e=>{pan=+e.target.value/1000;A.redraw()});
  addEventListener('resize',()=>{const t=$('t-trace');if(t&&!t.hidden)A.redraw()});
  (function(){const a=TR['mps:s6'];if(!a)return;const c=a.top_self.find(r=>r[0]==='aten::copy_');const b=TR['mps:s0'];const it=b.top_self.find(r=>r[0]==='aten::_local_scalar_dense');
    if(c&&it)$('tr-moved').innerHTML='<b>The wait moves; it does not vanish.</b> In the MPS "before" trace the CPU waits '+(it[1]/1e3).toFixed(1)+' ms in <code>.item()</code>. In the "after" trace the loss is no longer read every step, so the CPU runs ahead until the next thing that needs the GPU: copying the next batch to the device (<code>aten::copy_</code> inside the <code>data</code> range, '+(c[1]/1e3).toFixed(1)+' ms). The step is GPU-bound either way; what shrank is the GPU work itself (compiled kernels, fused AdamW) and the serial data loading in front of it.'})();
  function note(){const [b,a]=pair(dev);
    $('tr-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, PyTorch 2.14.1, '+(dev==='cpu'?'CPU, 4 threads':'MPS')+'. <code>torch.profiler.profile(activities=[CPU], schedule=schedule(wait=4, warmup=2, active=2), record_shapes=True)</code>, the last active step of each run, exported with <code>export_chrome_trace</code> and compacted (src/exp/compact_trace.py): bars shorter than '+D.hunt_trace.min_us+' &micro;s are not drawn ('+U.comma(b.dropped_short)+' of '+U.comma(b.total_events)+' events before, '+U.comma(a.dropped_short)+' of '+U.comma(a.total_events)+' after) but count in the table. The profiler adds overhead per event, so traced steps run longer than the timed ones in the Reading tab; compare shapes, not absolute times. Recorded under the bench lock, in the same sessions as the hunt\'s timings (load averages there).'}
})();
