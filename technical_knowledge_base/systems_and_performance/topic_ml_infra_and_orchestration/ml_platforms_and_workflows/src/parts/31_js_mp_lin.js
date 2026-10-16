// ---- Lineage graph tab: nodes and edges built from the recorded ids and hashes ----
(function(){
const M=window.MP,U=window.MPU,$=id=>document.getElementById(id),esc=U.esc;
const N=[],E=[];const node=(id,col,label,sub,info,cls)=>{N.push({id,col,label,sub,info,cls});};
const edge=(a,b,k)=>E.push({a,b,k:k||'rec'});
// inputs
const r0=M.runs.find(r=>r.data);
node('data',0,'TinyShakespeare','sha '+r0.data.slice(0,8),'<b>Input text</b>, karpathy/char-rnn, 1,115,394 characters; SHA-256 '+r0.data+'... (checked by <code>start</code> in every run against the pinned value).','in');
const splits=[...new Set(M.runs.map(r=>r.split))].sort((a,b)=>b-a);
splits.forEach(s=>{const r=M.runs.find(x=>x.split===s);node('sp'+s,0,'split '+s,'train '+r.train.slice(0,6),'<b>Data split '+s+'</b>: first '+(s*100)+'% of the characters for training, the rest held out. train_sha '+r.train+'..., val_sha '+r.val+'... Every run with this split recorded these hashes.','in');edge('data','sp'+s)});
const codes=[];M.runs.forEach(r=>{if(r.code&&!codes.includes(r.code))codes.push(r.code)});
const codeNote={0:'first version: torchrun --standalone (hung on macOS)',1:'static rendezvous on 127.0.0.1; register without an input example (failed)',2:'adds the input example to log_model: the final code in src/lab/'};
codes.forEach((c,i)=>node('c'+c,0,'code '+c.slice(0,6),['hung','failed','final'][i]||'','<b>Code version</b> code_sha '+c+'... (SHA-256 over flow.py, common.py, train.py): '+(codeNote[i]||''),'in'));
// metaflow runs
M.metaflow.forEach((m,i)=>{const st=m.ok?(m.origin?'resumed':'ok'):(m.tasks.some(t=>t.dur==null)?'hung':'failed');
  const tasks='<table class="small"><thead><tr><th>step</th><th>s</th><th>artifacts (name: sha1 prefix, bytes)</th></tr></thead><tbody>'+m.tasks.map(t=>'<tr><td>'+t.step+(t.cloned?' (cloned)':'')+(t.ok?'':' <span class="mp-no">failed</span>')+'</td><td class="num">'+(t.dur==null?'none':t.dur.toFixed(2))+'</td><td style="word-break:break-word">'+t.arts.filter(a=>!['name','work'].includes(a[0])).map(a=>a[0]+': '+a[1].slice(0,8)+', '+U.n0(a[2])).join('; ')+'</td></tr>').join('')+'</tbody></table>';
  node('mf'+i,1,'mf '+m.id.slice(-5),st,'<b>Metaflow run '+m.id+'</b> ('+st+(m.origin?', resumed from '+m.origin:'')+'). Tasks, durations and the content address of every artifact:'+'<div class="tw">'+tasks+'</div>',st);
  m._n='mf'+i});
const mfById=id=>M.metaflow.find(m=>m.id===id);
// mlflow runs
M.runs.forEach((r,i)=>{node('ml'+r.id,2,'ml '+r.id.slice(0,6),r.val_loss==null?'no metrics':'val '+r.val_loss.toFixed(3),
  '<b>MLflow run '+r.id+'...</b>, status '+r.status+'. params lr '+r.lr+', steps '+r.steps+', seed '+r.seed+', split '+r.split+'. metrics: '+(r.val_loss==null?'<b>none</b> (the workflow hung in train; start had closed the run cleanly, so it says FINISHED)':'val_loss '+r.val_loss+', train_loss '+r.train_loss+', train_secs '+r.train_secs)+'. tags: metaflow.run '+r.mf+', code_sha '+r.code+'..., ckpt_sha '+(r.ckpt||'none')+(r.ckpt?'...':'')+', platform '+r.platform+', torch '+r.torch+'.',r.val_loss==null?'failed':'ok');
  const m=mfById(r.mf);edge(m._n,'ml'+r.id);edge('sp'+r.split,m._n);edge('c'+r.code,m._n);});
M.metaflow.forEach(m=>{if(m.origin){const o=mfById(m.origin);edge(o._n,m._n,'clone');edge(o._n.replace('mf','mf'),m._n,'clone');
  edge('c'+codes[codes.length-1],m._n,'rec');const mr=M.runs.find(r=>r.mf===m.origin);if(mr)edge(m._n,'ml'+mr.id)}});
// versions
M.versions.forEach(v=>{const h=M.alias_hist.find(x=>x.v===v.v),r=M.runs.find(x=>x.id===v.run);
  node('v'+v.v,3,'version '+v.v,'val '+v.val_loss.toFixed(3),'<b>Registry version '+v.v+'</b> of mi-tiny-gpt: source models:/'+v.model+'..., run '+v.run+'..., tags val_loss '+v.val_loss+', code_sha '+v.code+'..., ckpt_sha '+v.ckpt+'..., metaflow_run '+v.mf+'. Gate: '+(h.promoted?'promoted to champion':'not promoted')+'.'+(v.code!==codes[codes.length-1]?' <b>Its code_sha is the pre-fix hash</b>: the start step was cloned on resume, while register ran the fixed code.':'')+(r.split!==0.9?' <b>Evaluated on different held-out text</b> (val_sha '+r.val+'...).':''),h.promoted?'ok':'kept');
  edge('ml'+v.run,'v'+v.v);const mf=mfById(v.mf);if(mf&&mf._n)edge(mf._n,'v'+v.v,'tag')});
for(let i=0;i<M.versions.length;i++)for(let j=i+1;j<M.versions.length;j++)if(M.versions[i].ckpt===M.versions[j].ckpt)E.push({a:'v'+M.versions[i].v,b:'v'+M.versions[j].v,k:'same'});
node('alias',4,'@champion','version '+M.champion,'<b>Alias champion</b> on version '+M.champion+': what <code>models:/mi-tiny-gpt@champion</code> loads. Moved three times (versions 1, 2, 3); never moved by versions 4, 5, 6.','al');
edge('v'+M.champion,'alias');
// dedupe edges
const seen={};for(let i=E.length-1;i>=0;i--){const k=E[i].a+'>'+E[i].b+E[i].k;if(seen[k])E.splice(i,1);else seen[k]=1}
let sel='';
function related(id){if(!id)return null;const s=new Set([id]);const dir=E.filter(e=>e.k!=='same');
  let q=[id];while(q.length){const x=q.pop();dir.forEach(e=>{if(e.b===x&&!s.has(e.a)){s.add(e.a);q.push(e.a)}})}
  q=[id];const fw=new Set();while(q.length){const x=q.pop();dir.forEach(e=>{if(e.a===x&&!fw.has(e.b)&&!s.has(e.b)){fw.add(e.b);q.push(e.b)}})}
  fw.forEach(x=>s.add(x));E.filter(e=>e.k==='same'&&(e.a===id||e.b===id)).forEach(e=>{s.add(e.a);s.add(e.b)});return s}
const colC={in:'var(--c1)',ok:'var(--good)',resumed:'var(--c5)',failed:'var(--bad)',hung:'var(--bad)',kept:'var(--mute)',al:'var(--c2)'};
function draw(){const el=$('ln-svg');const W=Math.max(320,el.clientWidth||700);const cols=5,gap=W<500?6:14,cw=(W-gap*(cols-1))/cols;
  const heads=['inputs','Metaflow runs','MLflow runs','registry','alias'];const bh=W<500?30:34,vg=6;
  const byc=[0,1,2,3,4].map(c=>N.filter(n=>n.col===c));const H=Math.max(...byc.map(a=>a.length))*(bh+vg)+30;
  const pos={};byc.forEach((a,c)=>{const off=(H-30-a.length*(bh+vg))/2;a.forEach((n,i)=>{pos[n.id]={x:c*(cw+gap),y:24+off+i*(bh+vg)}})});
  const R=related(sel);const fs=W<500?9:10.5;
  let g='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Lineage graph of the recorded runs">';
  heads.forEach((h,c)=>g+='<text x="'+(c*(cw+gap)+cw/2)+'" y="13" text-anchor="middle" font-size="'+fs+'" fill="var(--mute)">'+h+'</text>');
  E.forEach(e=>{const a=pos[e.a],b=pos[e.b];if(!a||!b)return;const on=!R||(R.has(e.a)&&R.has(e.b));
    if(e.k==='same'){g+='<path d="M'+(a.x+cw)+' '+(a.y+bh/2)+' C'+(a.x+cw+gap+18)+' '+(a.y+bh/2)+' '+(b.x+cw+gap+18)+' '+(b.y+bh/2)+' '+(b.x+cw)+' '+(b.y+bh/2)+'" fill="none" stroke="var(--c4)" stroke-dasharray="2 3" stroke-width="1.6" opacity="'+(on?1:0.12)+'"/>';return}
    let x1=a.x+cw,y1=a.y+bh/2,x2=b.x,y2=b.y+bh/2;
    if(a.x===b.x){x1=a.x+cw-6;x2=b.x+cw-6;y1=a.y+bh;y2=b.y;g+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--c5)" stroke-dasharray="5 3" stroke-width="1.6" opacity="'+(on?1:0.12)+'"/>';return}
    const mx=(x1+x2)/2;g+='<path d="M'+x1+' '+y1+' C'+mx+' '+y1+' '+mx+' '+y2+' '+x2+' '+y2+'" fill="none" stroke="'+(e.k==='tag'?'var(--c4)':'var(--dim)')+'" stroke-width="'+(on&&R?1.8:1.1)+'" opacity="'+(on?(R?1:0.8):0.1)+'"'+(e.k==='tag'?' stroke-dasharray="1 0"':'')+'/>'});
  N.forEach(n=>{const p=pos[n.id],on=!R||R.has(n.id);
    g+='<g data-n="'+n.id+'" style="cursor:pointer" opacity="'+(on?1:0.25)+'"><rect x="'+p.x+'" y="'+p.y+'" width="'+cw+'" height="'+bh+'" rx="5" fill="var(--bg)" stroke="'+colC[n.cls]+'" stroke-width="'+(n.id===sel?2.6:1.3)+'"/>'+
      '<text x="'+(p.x+5)+'" y="'+(p.y+bh/2-2)+'" font-size="'+fs+'" fill="var(--ink)" font-weight="600">'+esc(n.label)+'</text>'+
      '<text x="'+(p.x+5)+'" y="'+(p.y+bh/2+fs)+'" font-size="'+(fs-0.5)+'" fill="var(--mute)">'+esc(n.sub)+'</text><title>'+esc(n.label)+'</title></g>'});
  g+='</svg>';el.innerHTML=g;
  el.querySelectorAll('g[data-n]').forEach(x=>x.addEventListener('click',()=>pick(x.dataset.n)));
  // clip text to box width
  el.querySelectorAll('g[data-n] text').forEach(t=>{let s=t.textContent;while(s.length>3&&t.getComputedTextLength&&t.getComputedTextLength()>cw-8){s=s.slice(0,-1);t.textContent=s+'.'}});
}
function pick(id){sel=id;const n=N.find(x=>x.id===id);$('ln-det').innerHTML=n?n.info:'Click a box.';
  [...$('ln-btns').children].forEach(b=>b.classList.toggle('on',!!id&&b.dataset.n===id));draw()}
$('ln-btns').addEventListener('click',e=>{const b=e.target.closest('button');if(b)pick(b.dataset.n)});
// alias history
const AH=M.alias_hist;
function drawA(f){let champ=null;$('ln-chips').innerHTML=M.versions.map(v=>{const h=AH.find(x=>x.v===v.v);const reg=v.v<=f;if(reg)champ=h.champion;
  return '<div class="ln-chip'+(reg?'':' gone')+(v.v===f?' new':'')+'">v'+v.v+'<br><span class="small">'+v.val_loss.toFixed(4)+'</span></div>'}).join('')+'<div class="ln-chip ch">@champion<br><span class="small">'+(champ?'v'+champ:'none')+'</span></div>';
  if(f===0){$('ln-al-cap').innerHTML='Before the first registration: no versions, no alias. <code>get_model_version_by_alias</code> raises, so the gate treats the champion loss as infinity.';return}
  const h=AH[f-1],v=M.versions[f-1],r=M.runs.find(x=>x.id===v.run);
  $('ln-al-cap').innerHTML='Version '+v.v+' registered (lr '+r.lr+', split '+r.split+', held-out loss '+v.val_loss+'). '+(h.promoted?(h.prev?'Lower than version '+h.prev+': the alias moves from v'+h.prev+' to v'+v.v+'.':'No champion yet: the alias goes to v'+v.v+'.'):'Not lower than version '+h.prev+': the alias stays.'+(r.split!==0.9?' The comparison itself is invalid: different held-out text.':(v.val_loss===M.versions.find(x=>x.v===h.prev).val_loss?' Exactly equal: this is the reproduction.':'')))}
RD.anim({card:'ln-al-card',ctl:'ln-al-ctl',n:AH.length+1,draw:drawA,ms:1500,label:'Registration'});
(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lin']=window.TAB_RENDER['t-lin']||[]).push(()=>{draw();drawA(+$('ln-al-ctl-s').value)});
addEventListener('resize',()=>{if(!$('t-lin').hidden)draw()});
})();
