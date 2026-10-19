// ---- Moved from the root Failure lab (2026-10-19): the same crash with and without checkpoints (animated), and the bit-for-bit tables ----
(function(){
  const H=window.FLH&&window.FLH('t-read'),D=window.FL_DATA;if(!H||!D)return;const $=H.$,esc=H.esc;
  const C=D.ckpt;let mode='without';const N=60;
  const segs=run=>{const out=[];let cur=[];run.pts.forEach(p=>{if(cur.length&&p[1]<cur[cur.length-1][1]){out.push(cur);cur=[]}cur.push(p)});if(cur.length)out.push(cur);return out};
  function draw(i){
    const el=$('fl-ck-svg');if(!el)return;const run=C[mode],base=C.base;
    const tmax=Math.max(C['with'].end_t,C['without'].end_t)*1.03;const W=H.width(el),h=230,L=40,R=12,T=12,B=30;
    const X=t=>L+(W-L-R)*t/tmax,Y=s=>T+(h-T-B)*(1-s/200);
    const tnow=tmax*i/(N-1);
    let b='';
    [0,50,100,150,200].forEach(s=>{b+=H.line(L,Y(s),W-R,Y(s),'var(--line)');b+=H.t(L-6,Y(s)+4,String(s),{a:'end',fs:10,fill:'var(--mute)'})});
    for(let t=0;t<=tmax;t+=10){const x=X(t);b+=H.t(x,h-12,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    b+=H.t(L,T-2+0,'step',{fs:10,fill:'var(--mute)'});
    const poly=(pts,col,o)=>pts.length>1?'<polyline fill="none" stroke="'+col+'" stroke-width="'+((o&&o.sw)||2)+'"'+(o&&o.dash?' stroke-dasharray="'+o.dash+'"':'')+' points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>':'';
    b+=poly(base.pts,'var(--mute)',{dash:'4 3',sw:1.5});
    b+=H.t(X(base.end_t)-4,Y(200)-4,'no failure',{a:'end',fs:10,fill:'var(--mute)'});
    const sg=segs(run);let done=0,lastStep=0,redone=0;
    sg.forEach((s,k)=>{const vis=s.filter(p=>p[0]<=tnow);if(vis.length){b+=poly(vis,k===0?'var(--acc)':'var(--good)',{sw:2.5});lastStep=vis[vis.length-1][1]}});
    if(run.crash_t!=null&&tnow>=run.crash_t){const cy=Y(120);b+='<circle cx="'+X(run.crash_t).toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="6" fill="var(--bad)"/>';b+=H.t(X(run.crash_t),cy-10,'crash',{a:'middle',fs:11,w:600,fill:'var(--bad)'})}
    if(sg.length>1&&tnow>=sg[1][0][0]){const r=sg[1][0];b+=H.line(X(run.crash_t),Y(120),X(r[0]),Y(r[1]),'var(--bad)',{dash:'3 3'});redone=120-r[1]}
    if(tnow>=run.end_t){b+='<circle cx="'+X(run.end_t).toFixed(1)+'" cy="'+Y(200).toFixed(1)+'" r="5" fill="var(--good)"/>'}
    b+=H.line(X(tnow),T,X(tnow),h-B,'var(--acc)',{op:.35});
    el.innerHTML=H.svg(W,h,b,'Training progress against time, '+(mode==='with'?'with':'without')+' checkpoints');
    let cap;
    if(tnow<run.crash_t)cap='Attempt 1 runs normally: 4 ranks on c1 and c2'+(mode==='with'?', writing a checkpoint at steps 50 and 100.':', no checkpoints.');
    else if(sg.length>1&&tnow<sg[1][0][0])cap='Rank 3 exits with code 13 after step 120; the job fails within a second, and it is resubmitted by hand.';
    else if(tnow<run.end_t)cap=mode==='with'?'Attempt 2 loads step_000100.pt: only steps 100 to 120 are redone.':'Attempt 2 finds no checkpoint and starts again from step 0: all 120 steps are redone.';
    else cap='Done. '+(mode==='with'?'Finished '+(run.end_t-base.end_t).toFixed(1)+' s after the uninterrupted run.':'Finished '+(run.end_t-base.end_t).toFixed(1)+' s after the uninterrupted run; the gap grows with how long the run had gone before the crash.');
    $('fl-ck-cap').textContent=cap;
    $('fl-ck-out').innerHTML=[['Wall-clock',tnow.toFixed(1)+' s'],['Step reached',String(lastStep)],['Steps redone',String(redone)],['Total time',tnow>=run.end_t?run.end_t.toFixed(1)+' s':'running']].map(([k,v])=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>').join('');
  }
  const A=H.anim({card:'fl-ck-card',ctl:'fl-ck-ctl',n:N,draw,ms:220,label:'Time'});
  H.seg($('fl-ck-mode'),m=>{mode=m;A.go(0)});
  // bit-for-bit tables
  const sysName={slurm:'Slurm',k8s:'Kubernetes',ray:'Ray Train'};
  const bx=$('fl-bx-tbl');
  if(bx){let h='<thead><tr><th>Run</th><th>System</th><th class="num">Resumed from</th><th class="num">Steps compared</th><th class="num">Identical</th><th>Differ at</th><th class="num">Max difference</th></tr></thead><tbody>';
    D.scen.filter(s=>s.cont).forEach(s=>{const c=s.cont;h+='<tr><td>'+esc(s.title.replace(/^[^:]*: /,''))+'</td><td>'+sysName[s.sys]+'</td><td class="num">'+c.resumed_from+'</td><td class="num">'+c.compared+'</td><td class="num">'+c.identical+'</td><td>'+(c.differ_at.length?'steps '+c.differ_at.join(', '):'none')+'</td><td class="num">'+(c.max_abs_diff?c.max_abs_diff.toExponential(1):'0')+'</td></tr>'});
    bx.innerHTML=h+'</tbody>'}
  const ex=$('fl-ex-tbl');
  if(ex){let h='<thead><tr><th>4 or 2 ranks, uninterrupted against 100 + 100 steps</th><th class="num">Steps compared</th><th>Differ at</th><th>Exact?</th></tr></thead><tbody>';
    D.exact.forEach(e=>{const ok=!e.differ_at.length;h+='<tr><td>'+esc(e.label)+'</td><td class="num">'+e.compared+'</td><td>'+(ok?'none':'steps '+e.differ_at.join(', '))+'</td><td class="'+(ok?'ok':'bad')+'">'+(ok?'yes':'no')+'</td></tr>'});
    ex.innerHTML=h+'</tbody>'}
})();
