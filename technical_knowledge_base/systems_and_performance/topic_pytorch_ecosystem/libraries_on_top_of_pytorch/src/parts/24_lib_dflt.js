// ---- Defaults lab (Reading, section 2; was its own tab): curves of the 11 recorded runs, before/after animation against the plain loop ----
(function(){
  if(!document.getElementById('dl-card'))return;
  const D=window.LIB.dl, R=D.runs, $=id=>document.getElementById(id);
  const NAMES={plain:'Plain loop',hf_matched:'Trainer, matched to plain',pl_default:'Lightning, defaults',acc_default:'Accelerate',hf_clip:'Trainer + clipping 1.0',pl_clip:'Lightning + gradient_clip_val 1.0',hf_shuffle:'Trainer + random sampler',hf_sched:'Trainer + linear decay',hf_optim:'Trainer + its optimizer',hf_all:'Trainer, all defaults',hf_all_lr:'Trainer, all defaults, lr 6e-4'};
  const COL={plain:'var(--ink)',hf_matched:'var(--c3)',pl_default:'var(--c3)',acc_default:'var(--c3)',hf_clip:'var(--c1)',pl_clip:'var(--c6)',hf_shuffle:'var(--c5)',hf_sched:'var(--c4)',hf_optim:'var(--c2)',hf_all:'var(--bad)',hf_all_lr:'var(--acc)'};
  const KS=Object.keys(NAMES);
  let focus='hf_clip',metric='probe',on=new Set(['plain','hf_clip']),frame=D.steps;
  $('dl-focus').innerHTML=KS.filter(k=>k!=='plain').map(k=>'<option value="'+k+'"'+(k===focus?' selected':'')+'>'+NAMES[k]+'</option>').join('');
  $('dl-chips').innerHTML=KS.map(k=>'<button data-k="'+k+'" style="--sw:'+COL[k]+'"'+(on.has(k)?' class="on"':'')+'>'+NAMES[k]+'</button>').join('');
  const ma=(a,n)=>a.map((_,i)=>{const s=a.slice(Math.max(0,i-n+1),i+1);return s.reduce((x,y)=>x+y,0)/s.length});
  function series(k){const r=R[k];
    if(metric==='probe')return r.probe.map(p=>[p[0],p[1]]);
    if(metric==='loss')return ma(r.loss,10).map((v,i)=>[i+1,v]);
    if(metric==='lr')return r.lr.map((v,i)=>[i+1,v]);
    return r.gn.map((v,i)=>[i+1,v])}
  const fmt=v=>metric==='lr'?v.toExponential(2):v.toFixed(3);
  function draw(i){frame=i;const el=$('dl-svg');const w=RD.width(el),h=Math.min(320,Math.max(220,w*0.45)),l=48,r=10,t=10,b=26;
    const keys=[...new Set([...on,'plain',focus])];
    const all=keys.map(k=>series(k));let lo=Infinity,hi=-Infinity;all.forEach(s=>s.forEach(p=>{lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1])}));
    if(metric==='gn'){lo=0;hi=Math.min(hi,6)}if(metric==='lr')lo=0;
    const pad=(hi-lo)*0.05||0.1;lo-=metric==='lr'||metric==='gn'?0:pad;hi+=pad;
    const X=s=>l+(w-l-r)*(s-1)/(D.steps-1),Y=v=>t+(h-t-b)*(1-(Math.min(v,hi)-lo)/(hi-lo));
    let s='';for(let g=0;g<=4;g++){const v=lo+(hi-lo)*g/4;s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,metric==='lr'?v.toExponential(1):v.toFixed(2),{a:'end',fill:'var(--mute)',fs:10})}
    [1,50,100,150].forEach(x=>s+=RD.t(X(x),h-8,x,{a:'middle',fill:'var(--mute)',fs:10}));
    if(metric==='gn')s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(1)+'" y2="'+Y(1)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    keys.forEach((k,j)=>{const pts=all[j].filter(p=>(k==='plain'||k===focus)?p[0]<=i:true);if(!pts.length)return;
      const bold=k==='plain'||k===focus;
      s+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="'+(bold?2.2:1.2)+'"'+(bold?'':' opacity=".6"')+' points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      if(metric==='probe')pts.forEach(p=>s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="'+(bold?2.6:1.6)+'" fill="'+COL[k]+'"/>')});
    s+='<line x1="'+X(Math.max(1,i))+'" x2="'+X(Math.max(1,i))+'" y1="'+t+'" y2="'+(h-b)+'" stroke="var(--acc)" stroke-dasharray="2 3"/>';
    el.innerHTML=RD.svg(w,h,s,'Defaults lab chart');
    const st=Math.max(1,i),A=R.plain,B=R[focus],ix=st-1;
    const pv=r=>{let v=null;r.probe.forEach(p=>{if(p[0]<=st)v=p[1]});return v};
    const clipOn=focus==='hf_clip'||focus==='pl_clip'||focus==='hf_all'||focus==='hf_all_lr';
    $('dl-cap').innerHTML='<b>Step '+st+'.</b> '+NAMES[focus]+': learning rate '+B.lr[ix].toExponential(2)+' (plain '+A.lr[ix].toExponential(2)+'), gradient norm '+B.gn[ix].toFixed(2)+(clipOn?(B.gn[ix]>1?', clipped to 1.0':', below 1.0: not clipped'):', no clipping')+'. Loss of this step\'s batch '+B.loss[ix].toFixed(4)+' against '+A.loss[ix].toFixed(4)+'.';
    const pa=pv(A),pb=pv(B);
    $('dl-cnt').innerHTML=RD.stat('Step',st+' / '+D.steps)+RD.stat('Probe loss, plain',pa==null?'...':pa.toFixed(3))+RD.stat('Probe loss, '+(focus.startsWith('pl')?'Lightning':focus.startsWith('acc')?'Accelerate':'Trainer'),pb==null?'...':pb.toFixed(3))+RD.stat('Difference',pa==null||pb==null?'...':(pb-pa>=0?'+':'')+(pb-pa).toFixed(3));
  }
  const an=RD.anim({card:'dl-card',ctl:'dl-ctl',n:D.steps+1,start:D.steps,ms:110,draw,label:'Step'});
  $('dl-focus').addEventListener('change',e=>{focus=e.target.value;on.add(focus);syncChips();an.go(D.steps)});
  RD.seg($('dl-metric'),m=>{metric=m;an.redraw()});
  function syncChips(){$('dl-chips').querySelectorAll('button').forEach(b=>b.classList.toggle('on',on.has(b.dataset.k)))}
  $('dl-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;if(k==='plain'||k===focus)return;on.has(k)?on.delete(k):on.add(k);syncChips();an.redraw()});
  // table
  const O=D.opt||{},S=D.sampler||{};
  const optTxt=k=>{const o=O[k];if(!o)return 'AdamW lr 6e-4, betas (0.9, 0.95), wd 0.1 on matrices (plain)';return 'AdamW lr '+o.lr+', betas ('+o.betas.join(', ')+'), wd '+o.groups_weight_decay[0]+(o.fused?', fused':'')};
  const sched=k=>/sched|hf_all/.test(k)?'linear to 0':'constant';
  const clip=k=>/clip|hf_all/.test(k)?'1.0':'off';
  const order=k=>S[k]?(S[k]==='RandomSampler'?'random (seed 42)':'in order'):'in order';
  const last=r=>r.probe[r.probe.length-1][1];
  $('dl-tbl').innerHTML=KS.map(k=>'<tr><td>'+NAMES[k]+'</td><td>'+order(k)+'</td><td>'+optTxt(k)+'</td><td>'+sched(k)+'</td><td>'+clip(k)+'</td><td>'+last(R[k]).toFixed(5)+'</td><td>'+(D.diff[k]===0?'<b>0 (identical)</b>':D.diff[k].toFixed(5))+'</td></tr>').join('');
  RD.onResize(()=>an.redraw());
})();
