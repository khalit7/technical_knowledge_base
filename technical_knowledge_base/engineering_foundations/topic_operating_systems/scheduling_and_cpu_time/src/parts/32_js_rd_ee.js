// ---- Section 5: the same three threads under CFS (5.10), EEVDF (6.12) and EEVDF with a short loader slice ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc-ee-card'))return;
  const F=window.FAIR,V=window.FAIRVIEW,f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const runs={cfs:F.simulate('cfs',F.SCEN.loader.tasks,F.SCEN.loader.horizon),eevdf:F.simulate('eevdf',F.SCEN.loader.tasks,F.SCEN.loader.horizon),
    short:F.simulate('eevdf',F.SCEN.loader_short.tasks,F.SCEN.loader_short.horizon)};
  const der={};Object.keys(runs).forEach(k=>der[k]=V.derive(runs[k]));
  let mode='cfs';
  function draw(i){const r=runs[mode];i=Math.min(i,r.snaps.length-1);V.draw($('sc-ee-svg'),r,i,{derived:der[mode],horizon:40000});
    $('sc-ee-cap').innerHTML=V.caption(r,i);$('sc-ee-cnt').innerHTML=V.counters(r,i,der[mode])}
  const an=RD.anim({card:'sc-ee-card',ctl:'sc-ee-ctl',n:runs.cfs.snaps.length,draw,ms:900,label:'Scheduling step'});
  RD.seg($('sc-ee-mode'),m=>{mode=m;an.reset(runs[m].snaps.length);an.play()});
  RD.onResize(()=>an.redraw());
  const name={cfs:'CFS (5.10)',eevdf:'EEVDF (6.12)',short:'EEVDF, loader slice 0.1 ms'};
  const rows=Object.keys(runs).map(k=>{const r=runs[k],w=r.waits.loader;
    return '<tr><td>'+name[k]+'</td><td class="num">'+f(r.cpu.trainer/1000,1)+'</td><td class="num">'+f(r.cpu.preproc/1000,1)+'</td><td class="num">'+f(r.cpu.loader/1000,1)+'</td><td class="num">'+w.length+'</td><td class="num">'+f(w.reduce((a,b)=>a+b,0)/w.length/1000,2)+'</td><td class="num">'+f(Math.max(...w)/1000,2)+'</td><td class="num">'+r.switches+'</td></tr>'});
  $('sc-ee-sum').innerHTML='<table class="tbl-sm"><thead><tr><th>40 ms of one CPU</th><th class="num">trainer CPU, ms</th><th class="num">preproc CPU, ms</th><th class="num">loader CPU, ms</th><th class="num">loader wake-ups served</th><th class="num">mean wait, ms</th><th class="num">max wait, ms</th><th class="num">involuntary switches</th></tr></thead><tbody>'+rows.join('')+
    '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">Computed by parts/30_js_fair_core.js, identical to src/simref.py on every scenario (src/check_sim.mjs). <span class="ill">model</span></caption></table>';
})();
