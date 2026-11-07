// ---- Section 5: the same three threads under CFS (5.10), EEVDF (6.12) and EEVDF with a short loader slice ----
// A long replay (41 to 72 simulator events) grouped into explained stretches (2026-11-06 rollout): one step per stretch, one ol.sx item per step,
// each stretch playing its events during its step (shown at once when the reader jumps, and under reduced motion).
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-ee-card'))return;
  const F=window.FAIR,V=window.FAIRVIEW,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const runs={cfs:F.simulate('cfs',F.SCEN.loader.tasks,F.SCEN.loader.horizon),eevdf:F.simulate('eevdf',F.SCEN.loader.tasks,F.SCEN.loader.horizon),
    short:F.simulate('eevdf',F.SCEN.loader_short.tasks,F.SCEN.loader_short.horizon)};
  const der={};Object.keys(runs).forEach(k=>der[k]=V.derive(runs[k]));
  // stretch ends in microseconds of simulated time, chosen at the events the step lists describe
  const ENDS={cfs:[1500,5500,21500,40000],eevdf:[1500,3400,15400,27400,40000],short:[1500,5900,10400,40000]};
  const idxAt=(r,t)=>{let j=0;r.snaps.forEach((s,i)=>{if(s.t<=t)j=i});return j};
  let mode='cfs',last=-1,timer=0;
  function paint(i){const r=runs[mode];V.draw($('sc-ee-svg'),r,i,{derived:der[mode],horizon:40000});$('sc-ee-cnt').innerHTML=V.counters(r,i,der[mode])}
  function draw(k){const r=runs[mode],E=ENDS[mode],j1=idxAt(r,E[k]),fwd=k===last+1&&k>0;clearTimeout(timer);timer=0;last=k;
    if(!fwd||RD.RM){paint(j1);return}
    // play the stretch's events one after another over about 2.4 s
    let j=idxAt(r,E[k-1]);const n=Math.max(1,j1-j),dt=Math.max(90,Math.min(400,2400/n));
    const step=()=>{j++;paint(Math.min(j,j1));if(j<j1)timer=setTimeout(step,dt)};paint(j);timer=setTimeout(step,dt)}
  const an=RD.anim({card:'sc-ee-card',ctl:'sc-ee-ctl',n:ENDS.cfs.length,draw,ms:5600,label:'Stretch',list:'sx-ee-cfs'});
  RD.seg($('sc-ee-mode'),m=>{mode=m;last=-1;['cfs','eevdf','short'].forEach(x=>$('sx-ee-'+x).hidden=x!==m);an.reset(ENDS[m].length,'sx-ee-'+m)});
  RD.onResize(()=>{last=-2;an.redraw()});
  const name={cfs:'CFS (5.10)',eevdf:'EEVDF (6.12)',short:'EEVDF, loader slice 0.1 ms'};
  const rows=Object.keys(runs).map(k=>{const r=runs[k],w=r.waits.loader;
    return '<tr><td>'+name[k]+'</td><td class="num">'+f(r.cpu.trainer/1000,1)+'</td><td class="num">'+f(r.cpu.preproc/1000,1)+'</td><td class="num">'+f(r.cpu.loader/1000,1)+'</td><td class="num">'+w.length+'</td><td class="num">'+f(w.reduce((a,b)=>a+b,0)/w.length/1000,2)+'</td><td class="num">'+f(Math.max(...w)/1000,2)+'</td><td class="num">'+r.switches+'</td></tr>'});
  $('sc-ee-sum').innerHTML='<table class="tbl-sm"><thead><tr><th>40 ms of one CPU</th><th class="num">trainer CPU, ms</th><th class="num">preproc CPU, ms</th><th class="num">loader CPU, ms</th><th class="num">loader wake-ups served</th><th class="num">mean wait, ms</th><th class="num">max wait, ms</th><th class="num">involuntary switches</th></tr></thead><tbody>'+rows.join('')+
    '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">Computed by parts/30_js_fair_core.js, identical to src/simref.py on every scenario (src/check_sim.mjs). <span class="ill">model</span></caption></table>';
  window.SC_EE={runs,ENDS};
})();
