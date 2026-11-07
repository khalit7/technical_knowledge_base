// ---- Section 7: lazy imports: the same CLI's imports to scale in explained stretches (Fig. 10, RD.anim with one step list per mode, 2026-11-07) and the wall times (Fig. 11). From the language page's 42_js_pb_read_c.js ----
(function(){
  if(!window.PB||!PB.lazy||!document.getElementById('ci-lz-card'))return;
  const $=id=>document.getElementById(id),E=CIU.esc,L=PB.lazy,IT=L.importtime;
  const tot=k=>IT[k].top.reduce((a,r)=>a+r.cum_us,0);
  const MAXT=Math.max(...Object.keys(IT).map(tot));
  const COL={site:'var(--c6)',argparse:'var(--c5)',httpx:'var(--c2)',pydantic:'var(--c4)','rich.console':'var(--c1)'};
  const col=n=>COL[n]||'var(--dim)';
  // the top-level imports grouped into the explained stretches of the step lists (sx-lz-<mode>); the last step is "done"
  const MACH=['_frozen_importlib_external','zipimport','encodings','encodings.utf_8','_signal'];
  const G={cli_eager:[MACH,['site'],['argparse'],['httpx'],['pydantic','rich.console']],
    cli_lazy:[MACH,['site'],['argparse'],['locale','shutil']],
    cli_all:[MACH,['site'],['argparse'],['re','gettext','locale','shutil']]};
  const grp=(m,name)=>G[m].findIndex(g=>g.includes(name));
  let mode='cli_eager',A=null;
  function draw(i){
    const top=IT[mode].top,ng=G[mode].length,last=i>=ng;
    const w=RD.width($('ci-lz-plot')),pad=4,H=58,X=t=>pad+(w-2*pad)*t/MAXT;
    let s='',t=0;
    // the stretches still to come are drawn as dashed outlines, so the whole run is visible from the first step
    top.forEach(r=>{const g=grp(mode,r.name),x0=X(t),x1=X(t+r.cum_us);t+=r.cum_us;const on=g<=i,cur=g===i;
      if(on)s+='<rect'+(cur?' class="rd-new"':'')+' x="'+x0.toFixed(1)+'" y="8" width="'+Math.max(1,x1-x0).toFixed(1)+'" height="26" fill="'+col(r.name)+'" opacity="'+(cur||last?1:0.7)+'" stroke="var(--bg)" stroke-width="1"></rect>';
      else s+='<rect x="'+x0.toFixed(1)+'" y="8.5" width="'+Math.max(1,x1-x0-1).toFixed(1)+'" height="25" fill="none" stroke="var(--line)" stroke-dasharray="3 3"></rect>';
      if(on&&x1-x0>46)s+='<text x="'+((x0+x1)/2).toFixed(1)+'" y="25" text-anchor="middle" font-size="11" fill="var(--bg)">'+E(r.name)+'</text>'});
    const step=MAXT>60000?20000:10000;
    for(let v=0;v<=MAXT;v+=step){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="36" y2="40" stroke="var(--mute)"></line><text x="'+x+'" y="52" font-size="11" text-anchor="'+(v===0?'start':x>w-30?'end':'middle')+'" fill="var(--mute)">'+(v/1000)+' ms</text>'}
    $('ci-lz-plot').innerHTML=RD.svg(w,H,s,'Top-level imports of the CLI, to scale');
    const done=top.filter(r=>grp(mode,r.name)<=i),ms=done.reduce((a,r)=>a+r.cum_us,0)/1000,mods=done.reduce((a,r)=>a+r.n_mods,0);
    $('ci-lz-cnt').innerHTML='<span>import time so far <b>'+CIU.fmt(ms,1)+' ms</b></span><span>modules imported <b>'+mods+'</b> of '+IT[mode].modules+'</span><span>top-level imports <b>'+done.length+'</b> of '+top.length+'</span>';
  }
  const lid=m=>'sx-lz-'+m;
  function setMode(m){mode=m;Object.keys(G).forEach(k=>{const l=$(lid(k));if(l)l.hidden=k!==m});if(A)A.reset(G[m].length+1,lid(m))}
  RD.seg($('ci-lz-seg'),setMode);
  A=RD.anim({card:'ci-lz-card',ctl:'ci-lz-ctl',n:G.cli_eager.length+1,draw:draw,ms:4200,label:'Import stretch',list:lid('cli_eager')});
  $('ci-lz-src').innerHTML='Recorded with <code>python -X importtime</code> on '+E(L.versions.split(' ')[0])+' (httpx '+E(L.versions.split(' ')[1])+', pydantic '+E(L.versions.split(' ')[2])+', rich 15.0.0); top-level imports in the order Python ran them, each bar its cumulative import time including the modules it pulled in. <code>-X importtime</code> itself adds overhead, so wall times come from the separate hyperfine runs below.';
  // wall-time bars
  const hf=L.hyperfine,lab=['Eager imports','lazy import','-X lazy_imports=all','python -c pass (empty)'],cols=['var(--c2)','var(--c3)','var(--c1)','var(--dim)'];
  CIU.bars($('ci-lz-bars'),hf.map((h,k)=>({name:lab[k],v:h.median_ms,label:CIU.fmt(h.median_ms,1)+' ms',col:cols[k]})),0,'Wall time of the whole run, hyperfine, 30 runs after 3 warm-ups, median (standard deviations '+hf.map(h=>CIU.fmt(h.stddev_ms,1)).join(', ')+' ms); load average '+CIU.la(L.loadavg)+'. The empty interpreter is the floor: most of what remains above it is site and argparse.');
  $('ci-lz-none').innerHTML=L.none_mode.trim().split('\n\n').map(b=>{const ls=b.split('\n');return CIU.block({cmd:ls[0].replace(/^\$ /,''),out:ls.slice(1,-1).join('\n'),rc:+(ls[ls.length-1].match(/\d+/)||[0])[0]})}).join('\n\n');
  RD.onResize(()=>A.redraw());RD.onRender(()=>A.redraw());
})();
