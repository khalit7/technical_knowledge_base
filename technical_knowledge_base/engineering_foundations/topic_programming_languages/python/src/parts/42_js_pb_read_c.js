// ---- Part 2 Reading (t-pb-read), 3 of 4: lazy imports, the same CLI's imports stepped to scale ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc,L=PB.lazy,IT=L.importtime;
  const MODES={cli_eager:'Eager imports',cli_lazy:'lazy import',cli_all:'Eager file, -X lazy_imports=all'};
  const tot=k=>IT[k].top.reduce((a,r)=>a+r.cum_us,0);
  const MAXT=Math.max(...Object.keys(IT).map(tot));
  const COL={site:'var(--c6)',argparse:'var(--c5)',httpx:'var(--c2)',pydantic:'var(--c4)','rich.console':'var(--c1)'};
  const col=n=>COL[n]||'var(--dim)';
  let mode='cli_eager',A=null;
  function cap(r,mode){
    const base='<code>'+E(r.name)+'</code>: '+PBU.fmt(r.cum_us/1000,1)+' ms, '+r.n_mods+' module'+(r.n_mods>1?'s':'')+'. ';
    if(['_frozen_importlib_external','zipimport','encodings','encodings.utf_8','_signal'].includes(r.name))return base+'Start-up machinery every Python process imports before your first line; the same in all three runs.';
    if(r.name==='site')return base+'<code>site</code> sets up <code>sys.path</code> and the environment\'s site-packages; also the same in every run.';
    if(r.name==='argparse')return base+(mode==='cli_all'?'With every import lazy, even argparse\'s own imports wait until it uses them, so argparse itself is one module here.':'Your first line of code: <code>import argparse</code>, eager in all versions of the file.');
    if(r.name==='httpx')return base+'The HTTP client and everything it imports at start-up (among them http.client, ssl, socket, email, idna, zstandard), loaded although <code>count</code> never uses it.';
    if(r.name==='pydantic')return base+'Loaded although unused.';
    if(r.name==='rich.console')return base+'Loaded although unused. Three unused imports cost most of the start-up.';
    if(['locale','shutil','re','gettext'].includes(r.name))return base+'Loaded only when argparse first needs it while parsing the command line. (In the eager run an earlier import had already brought it in, so it never appeared on its own.)';
    return base;
  }
  function draw(i){
    const top=IT[mode].top,n=top.length,last=i>=n;
    const w=PBU.width($('pb-lz-plot')),pad=4,H=58,X=t=>pad+(w-2*pad)*t/MAXT;
    let s='',t=0;
    top.forEach((r,k)=>{if(k>i)return;const x0=X(t),x1=X(t+r.cum_us);t+=r.cum_us;const cur=k===i;
      s+='<rect x="'+x0.toFixed(1)+'" y="8" width="'+Math.max(1,x1-x0).toFixed(1)+'" height="26" fill="'+col(r.name)+'" opacity="'+(cur?1:0.75)+'" stroke="var(--bg)" stroke-width="1"></rect>';
      if(x1-x0>46)s+='<text x="'+((x0+x1)/2).toFixed(1)+'" y="25" text-anchor="middle" font-size="11" fill="var(--bg)">'+E(r.name)+'</text>'});
    // axis
    const step=MAXT>60000?20000:10000;
    for(let v=0;v<=MAXT;v+=step){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="36" y2="40" stroke="var(--mute)"></line><text x="'+x+'" y="52" font-size="10.5" text-anchor="'+(v===0?'start':'middle')+'" fill="var(--mute)">'+(v/1000)+' ms</text>'}
    $('pb-lz-plot').innerHTML=RD.svg(w,H,s,'Top-level imports of the CLI, to scale');
    const done=top.slice(0,Math.min(i+1,n)),ms=done.reduce((a,r)=>a+r.cum_us,0)/1000,mods=done.reduce((a,r)=>a+r.n_mods,0);
    $('pb-lz-cnt').innerHTML='<span>import time so far <b>'+PBU.fmt(ms,1)+' ms</b></span><span>modules imported <b>'+mods+'</b> of '+IT[mode].modules+'</span><span>top-level imports <b>'+Math.min(i+1,n)+'</b> of '+n+'</span>';
    const hf=L.hyperfine,wall={cli_eager:hf[0],cli_lazy:hf[1],cli_all:hf[2]}[mode];
    $('pb-lz-cap').innerHTML=last?'<b>Done.</b> The program printed <code>'+E(L.outputs[mode==='cli_lazy'?'cli_lazy':'cli_eager'])+'</code>. Imports took '+PBU.fmt(tot(mode)/1000,1)+' ms of import time for '+IT[mode].modules+' modules; measured without <code>-X importtime</code>, the whole run took '+PBU.fmt(wall.median_ms,0)+' ms (median of 30).'+(mode!=='cli_eager'?' httpx, pydantic and rich were never loaded: the <code>count</code> path never touched the names.':''):
      '<b>'+(i+1)+'.</b> '+cap(top[i],mode);
  }
  function setMode(m){mode=m;const n=IT[m].top.length+1;if(A){A.reset(n);A.play()}}
  RD.seg($('pb-lz-seg'),setMode);
  A=RD.anim({card:'pb-lz-card',ctl:'pb-lz-ctl',n:IT.cli_eager.top.length+1,draw:draw,ms:1500,label:'Import step'});
  $('pb-lz-src').innerHTML='Recorded with <code>python -X importtime</code> on '+E(L.versions.split(' ')[0])+' (httpx '+E(L.versions.split(' ')[1])+', pydantic '+E(L.versions.split(' ')[2])+', rich 15.0.0); top-level imports in the order Python ran them, each bar its cumulative import time including the modules it pulled in. <code>-X importtime</code> itself adds overhead, so wall times come from the separate hyperfine runs below.';
  // wall-time bars
  const hf=L.hyperfine,lab=['Eager imports','lazy import','-X lazy_imports=all','python -c pass (empty)'],cols=['var(--c2)','var(--c3)','var(--c1)','var(--dim)'];
  PBU.bars($('pb-lz-bars'),hf.map((h,k)=>({name:lab[k],v:h.median_ms,label:PBU.fmt(h.median_ms,1)+' ms',col:cols[k]})));
  $('pb-lz-note').textContent='Wall time of the whole run, hyperfine, 30 runs after 3 warm-ups, median (standard deviations '+hf.map(h=>PBU.fmt(h.stddev_ms,1)).join(', ')+' ms); load average '+PBU.la(L.loadavg)+'. The empty interpreter is the floor: most of what remains above it is site and argparse.';
  $('pb-lz-take').textContent=IT.cli_lazy.modules+' of the eager file\'s '+IT.cli_eager.modules+' modules and the whole run takes '+PBU.fmt(hf[1].median_ms,0)+' ms instead of '+PBU.fmt(hf[0].median_ms,0)+' ms';
  $('pb-lz-none').innerHTML=L.none_mode.trim().split('\n\n').map(b=>{const ls=b.split('\n');return PBU.block({cmd:ls[0].replace(/^\$ /,''),out:ls.slice(1,-1).join('\n'),rc:+(ls[ls.length-1].match(/\d+/)||[0])[0]})}).join('\n\n');
  let rz=0;addEventListener('resize',()=>{const r=$('t-pb-read');if(!r||r.hidden||!A)return;clearTimeout(rz);rz=setTimeout(()=>A.redraw(),60)});
  PBU.onTab('t-pb-read',()=>{A&&A.redraw()});
})();
