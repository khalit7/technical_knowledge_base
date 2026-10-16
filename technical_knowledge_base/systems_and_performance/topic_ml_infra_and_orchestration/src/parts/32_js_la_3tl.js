// ---- Launch lab: section 1 rank picture, section 3 launch timeline (animated) and per-run stage bars ----
(function(){
  const H=window.LA_H,D=window.LA;if(!H||!D)return;const {$,esc,svg,t,rect,line}=H;
  const SYS={slurm:'Slurm',k8s:'Kubernetes',ray:'Ray'};
  const CAT=[['sched','scheduler: queue, admission, start',/queue|admit|srun|ray\.init|controller|placement/i,'var(--c1)'],
    ['imp','Python start and imports',/import|training function/i,'var(--c5)'],
    ['rdzv','rendezvous',/rendezvous|actors ready/i,'var(--c2)'],
    ['pg','init_process_group',/init_process_group/i,'var(--c6)'],
    ['model','data, model, DDP wrapper',/model/i,'var(--c3)'],
    ['step','first step',/first step/i,'var(--c4)']];
  const cat=n=>{for(const c of CAT)if(c[2].test(n))return c;return CAT[1]};
  const f1=x=>H.fmt(x,1),f2=x=>H.fmt(x,2);
  // ---------- section 1: ranks picture ----------
  function ranks(){
    const el=$('la-ranks');if(!el)return;const R=D.rankpic;if(!R)return;
    const W=Math.min(H.width(el),760),narrow=W<520,nodes=R.nodes,nw=narrow?W-20:(W-30)/2,nh=narrow?132:150;
    let b='',y0=8;
    nodes.forEach((n,i)=>{const x=narrow?10:10+i*(nw+10),y=narrow?y0+i*(nh+12):y0;
      b+=rect(x,y,nw,nh,'var(--soft)',{stroke:'var(--line)',rx:8});
      b+=t(x+10,y+18,'node '+n.group_rank+' (pod '+esc(n.host)+')',{fs:12,w:600});
      b+=t(x+10,y+34,'torchrun agent: GROUP_RANK='+n.group_rank+(n.group_rank==0?', hosts the store':''),{fs:11,fill:'var(--mute)'});
      n.ranks.forEach((r,j)=>{const rx=x+10+j*((nw-30)/2+10),rw=(nw-30)/2,ry=y+46;
        b+=rect(rx,ry,rw,nh-56,'var(--bg)',{stroke:r.rank==0?'var(--acc)':'var(--line)',sw:r.rank==0?2:1,rx:6});
        b+=t(rx+8,ry+18,'process (pid '+r.pid+')',{fs:11,fill:'var(--mute)'});
        b+=t(rx+8,ry+36,'RANK='+r.rank,{fs:13,w:600});
        b+=t(rx+8,ry+52,'LOCAL_RANK='+r.local_rank,{fs:11});
        b+=t(rx+8,ry+67,'WORLD_SIZE='+r.world,{fs:11});})});
    const hh=narrow?y0+nodes.length*(nh+12)+46:y0+nh+40;
    if(narrow){b+=t(10,hh-30,'MASTER_ADDR:MASTER_PORT =',{fs:11.5,w:600});b+=t(10,hh-14,esc(R.master)+' (pod 0)',{fs:11.5,w:600})}
    else b+=t(10,hh-14,'MASTER_ADDR:MASTER_PORT = '+esc(R.master)+' (pod 0, through the headless Service)',{fs:11.5,w:600});
    el.innerHTML=svg(W,hh,b,'Two nodes with two ranks each, with their environment variables');
  }
  // ---------- section 3: timeline ----------
  const tl={mode:'all',run:{slurm:0,k8s:0,ray:0}};
  const runsOf=s=>(D.times[s]&&D.times[s].runs)||[];
  function lanes(){
    // returns [{label, segs:[{t0,t1,name,col}], kind}] in seconds from submit
    const L=[];
    const job=(s)=>{const r=runsOf(s)[tl.run[s]];if(!r)return null;let acc=0;
      const segs=r.stages.map(st=>{const a=acc;acc+=st.s;const c=cat(st.stage);return {t0:a,t1:acc,name:st.stage,col:c[3]}});
      return {label:SYS[s]+(tl.mode==='all'?'':' (job)'),segs,kind:'job',total:r.total_s}};
    if(tl.mode==='all'){['slurm','k8s','ray'].forEach(s=>{const j=job(s);if(j)L.push(j)});return L}
    const s=tl.mode,r=runsOf(s)[tl.run[s]];if(!r)return L;L.push(job(s));const T0=r.t_submit;
    if(r.nodes)r.nodes.forEach(n=>{L.push({label:'node '+esc(n.host),kind:'node',segs:[
      {t0:n.task-T0,t1:n.agent_import-T0,name:'torchrun imports',col:'var(--c5)'},
      {t0:n.rdzv0-T0,t1:n.rdzv1-T0,name:'rendezvous: waiting for the other agents',col:'var(--c2)'}]})});
    if(r.ranks)r.ranks.slice().sort((a,b)=>a.rank-b.rank).forEach(k=>{L.push({label:'rank '+k.rank,kind:'rank',segs:[
      {t0:k.t0-T0,t1:k.import-T0,name:'import torch, train.py',col:'var(--c5)'},
      {t0:k.pg0-T0,t1:k.pg1-T0,name:'init_process_group',col:'var(--c6)'}]})});
    if(r.workers)r.workers.forEach((w,i)=>{L.push({label:'worker '+(i+1),kind:'rank',segs:[
      {t0:w.setup-T0,t1:w.pg0-T0,name:'waiting for the group',col:'var(--dim)'},
      {t0:w.pg0-T0,t1:w.pg1-T0,name:'init_process_group',col:'var(--c6)'}]})});
    return L;
  }
  const NF=60;let A;
  function draw(i){
    const el=$('la-tl-svg');if(!el)return;const L=lanes();if(!L.length){el.innerHTML='';return}
    const W=H.width(el),lw=W<520?78:120,pad=12,x0=lw,x1=W-pad;
    const Tmax=tl.mode==='all'?Math.max(...['slurm','k8s','ray'].map(s=>{const r=runsOf(s)[tl.run[s]];return r?r.total_s:0})):L[0].total;
    const T=Math.max(1,Math.ceil(Tmax));const now=Tmax*i/(NF-1);const sx=v=>x0+(x1-x0)*Math.max(0,Math.min(v,T))/T;
    const rh=tl.mode==='all'?26:18,gap=tl.mode==='all'?14:6;let y=22,b='';
    const step=T>40?10:T>16?4:T>8?2:1;for(let s=0;s<=T;s+=step){const x=sx(s);b+=line(x,16,x,16+L.length*(rh+gap),'var(--line)');b+=t(x,12,s+' s',{fs:10,a:'middle',fill:'var(--mute)'})}
    const cur=[];
    L.forEach(l=>{b+=t(4,y+rh*0.68,l.label,{fs:l.kind==='job'?12:10.5,w:l.kind==='job'?600:400});
      l.segs.forEach(sg=>{if(!(sg.t1>sg.t0))return;const a=Math.min(sg.t1,now);if(a<=sg.t0)return;
        b+=rect(sx(sg.t0),y,Math.max(1,sx(a)-sx(sg.t0)),rh,sg.col,{op:l.kind==='job'?0.95:0.8});
        if(l.kind==='job'&&now>=sg.t0&&now<sg.t1)cur.push('<b>'+esc(l.label)+'</b>: '+esc(sg.name)+' ('+f2(sg.t1-sg.t0)+' s)')});
      if(l.kind==='job'&&now>=l.total)cur.push('<b>'+esc(l.label)+'</b>: first step done at '+f1(l.total)+' s');
      y+=rh+gap});
    b+=line(sx(now),16,sx(now),y,'var(--ink)',{sw:1.5});
    el.innerHTML=svg(W,y+6,b,'Launch timeline');
    $('la-tl-cap').innerHTML='<b>t = '+f1(now)+' s after submit.</b> '+(cur.join('; ')||'')+(tl.mode!=='all'&&i===NF-1?'<br>'+esc(D.tlnotes[tl.mode]||''):'');
  }
  function fillRuns(){const s=tl.mode==='all'?null:tl.mode,sel=$('la-tl-run');
    if(!s){sel.innerHTML=[0,1,2,3,4].filter(i=>i<Math.min(...['slurm','k8s','ray'].map(x=>runsOf(x).length))).map(i=>'<option value="'+i+'">'+(i+1)+'</option>').join('');sel.value=tl.run.slurm;
      $('la-tl-runnote').textContent='run n of each system';return}
    sel.innerHTML=runsOf(s).map((r,i)=>'<option value="'+i+'">'+(i+1)+' ('+f1(r.total_s)+' s)</option>').join('');sel.value=tl.run[s];$('la-tl-runnote').textContent=''}
  function legend(){$('la-tl-leg').innerHTML=CAT.map(c=>'<span><i style="background:'+c[3]+'"></i>'+c[1]+'</span>').join('')+(tl.mode==='ray'?'<span><i style="background:var(--dim)"></i>worker started, waiting for the others</span>':'')}
  // ---------- per-run stage bars ----------
  function stages(){
    const el=$('la-st-svg');if(!el)return;const W=H.width(el),lw=W<520?86:124,x1=W-54;
    const rows=[];['slurm','k8s','ray'].forEach(s=>runsOf(s).forEach((r,i)=>rows.push({s,i,r})));
    const T=Math.ceil(Math.max(...rows.map(o=>o.r.total_s)));const sx=v=>lw+(x1-lw)*v/T;
    let y=18,b='',last='';const rh=13;
    for(let s=0;s<=T;s+=T>40?10:T>16?4:2){b+=line(sx(s),12,sx(s),12+rows.length*(rh+4)+30,'var(--line)');b+=t(sx(s),10,s+' s',{fs:10,a:'middle',fill:'var(--mute)'})}
    rows.forEach(o=>{if(o.s!==last){y+=last?8:0;last=o.s}let a=0;b+=t(4,y+rh-2,SYS[o.s]+' run '+(o.i+1),{fs:10.5});
      o.r.stages.forEach(st=>{b+=rect(sx(a),y,Math.max(0.5,sx(a+st.s)-sx(a)),rh,cat(st.stage)[3],{rx:1});a+=st.s});
      b+=t(sx(a)+4,y+rh-2,f1(o.r.total_s)+' s',{fs:10,fill:'var(--mute)'});y+=rh+4});
    el.innerHTML=svg(W,y+4,b,'Stage times of every run');
    $('la-st-out').innerHTML=['slurm','k8s','ray'].filter(s=>D.times[s]).map(s=>{const m=D.times[s].summary.total;
      return '<div class="stat"><div class="k">'+SYS[s]+', submit to first step</div><div class="v">'+f1(m.median)+' s</div><div class="d">median of '+D.times[s].summary.n+' runs; range '+f1(m.min)+' to '+f1(m.max)+' s</div></div>'}).join('');
  }
  function init(){
    if(!$('la-tl-card'))return;
    H.seg($('la-tl-mode'),m=>{tl.mode=m;fillRuns();legend();A.redraw()});
    $('la-tl-run').addEventListener('change',e=>{const v=+e.target.value;if(tl.mode==='all'){tl.run={slurm:v,k8s:v,ray:v}}else tl.run[tl.mode]=v;A.redraw()});
    fillRuns();legend();
    A=H.anim({card:'la-tl-card',ctl:'la-tl-ctl',n:NF,draw,ms:140,label:'Time since submit'});
    H.onRender(()=>{ranks();stages()});ranks();stages();
    if($('la-tl-text')&&D.tltext)$('la-tl-text').innerHTML=D.tltext;
    if($('la-st-note')&&D.stnote)$('la-st-note').innerHTML=D.stnote;
    if($('la-pull-card')&&D.pullhtml)$('la-pull-card').innerHTML=D.pullhtml;else if($('la-pull-card'))$('la-pull-card').remove();
    if(D.code){if($('la-code-sbatch'))$('la-code-sbatch').textContent=D.code.sbatch;if($('la-code-jobset'))$('la-code-jobset').textContent=D.code.jobset}
  }
  init();
})();
