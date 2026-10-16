// ---- Reading tab: tables and drills filled from window.MP (recorded runs), the resume animation, the cross-platform chart ----
(function(){
const M=window.MP,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kb=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':(b/1024).toFixed(0)+' KB';
const n0=x=>x.toLocaleString('en-US');
const med=a=>{const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
window.MPU={esc,kb,n0,med};

// flow excerpt and run log (real)
$('mp-flowsrc').innerHTML=M.flow_excerpt.map(l=>{const e=esc(l);return /^\s*@/.test(l)?'<b>'+e+'</b>':(/^\s*\.\.\.$/.test(l)?'<span class="c">'+e+'</span>':e)}).join('\n');
$('mp-runlog').textContent=M.runlog.join('\n');

// step table: median task time over complete runs that were not resumed
const full=M.metaflow.filter(r=>r.ok&&!r.origin);
const T={start:['input.txt (sha checked)','data_sha, train_sha, val_sha, code_sha, env, work','opens the run: params, tags'],
 train:['the split files','curve, final_gloss, ckpt (1.4 MB), ckpt_sha','train_loss series (21 points), ckpt_sha, train_secs'],
 evaluate:['ckpt, val.txt','val_loss, ckpt_step','val_loss'],
 register:['ckpt','model_id, version, promoted, prev_champion','LoggedModel, registry version, version tags, alias'],
 end:['everything','(prints a summary)','']};
$('mp-steptab').innerHTML=['start','train','evaluate','register','end'].map(s=>{
  const d=full.map(r=>r.tasks.find(t=>t.step===s)).filter(t=>t&&t.dur!=null).map(t=>t.dur);
  return '<tr><td><code>'+s+'</code></td><td>'+T[s][0]+'</td><td class="small">'+T[s][1]+'</td><td class="small">'+T[s][2]+'</td><td class="num">'+med(d).toFixed(2)+' s</td></tr>'}).join('');

// drill 1: datastore size
$('mp-pr1a').innerHTML='Measured: <b>'+kb(M.storage.metaflow_datastore)+'</b> ('+n0(M.storage.metaflow_datastore)+' bytes). Content addressing stores each distinct object once: the resumed run reused the failed run\'s checkpoint, and the exact reproduction stored a byte-identical checkpoint (same SHA-256), so it cost nothing; every other run that trained wrote its own 1,386,058-byte checkpoint. Deduplication helps only when bytes are identical, which for checkpoints is rare outside resumes and exact reruns.';

// run record of the champion
const champRun=M.runs.find(r=>r.id===M.versions.find(v=>v.v===M.champion).run);
const rr=[['run id (MLflow)',champRun.id+'...'],['run name / Metaflow run','mf-'+champRun.mf],['status',champRun.status],
 ['params','lr '+champRun.lr+', steps '+champRun.steps+', seed '+champRun.seed+', split '+champRun.split+' (plus world 2, batch 32, ctx 64, d_model 64, 2 layers, 2 heads)'],
 ['metrics','val_loss '+champRun.val_loss+'; train_loss (last of '+champRun.curve.length+' points) '+champRun.train_loss+'; train_secs '+champRun.train_secs],
 ['tags: code, data','code_sha '+champRun.code+'..., data_sha '+champRun.data+'..., train_sha '+champRun.train+'..., val_sha '+champRun.val+'...'],
 ['tags: output, environment','ckpt_sha '+champRun.ckpt+'...; torch '+champRun.torch+', '+champRun.platform],
 ['tags filled by MLflow','mlflow.user '+champRun.user+' (set by the lab), mlflow.source.name flow.py (set by the lab)']];
$('mp-runrec').innerHTML=rr.map(r=>'<tr><th>'+r[0]+'</th><td class="small" style="word-break:break-word">'+esc(r[1])+'</td></tr>').join('');
$('mp-st-db').textContent=kb(M.storage.mlflow_db);$('mp-st-art').textContent=kb(M.storage.mlflow_artifacts);$('mp-st-mf').textContent=kb(M.storage.metaflow_datastore);

// registry: files, MLmodel, gate table, REST
$('mp-mfiles').innerHTML=M.model_files.map(f=>'<tr><td><code>'+esc(f[0])+'</code></td><td class="num">'+n0(f[1])+'</td></tr>').join('');
$('mp-mlmodel').textContent=M.mlmodel.trim();
const runOf=v=>M.runs.find(r=>r.id===v.run);
$('mp-gatetab').innerHTML=M.alias_hist.map(h=>{const v=M.versions.find(x=>x.v===h.v),r=runOf(v);
  const why=h.promoted?(h.prev==null?'first version':'lower than v'+h.prev):(v.val_loss===M.versions.find(x=>x.v===h.prev).val_loss?'equal to v'+h.prev+' (a reproduction): not lower':'not lower than v'+h.prev+(r.split!==0.9?' (but on different held-out text)':''));
  return '<tr><td class="num">'+h.v+'</td><td class="mp-r">'+r.mf.slice(-6)+'</td><td>'+r.lr+'</td><td>'+r.split+'</td><td class="num">'+v.val_loss.toFixed(4)+'</td><td class="'+(h.promoted?'mp-ok':'mp-no')+'">'+(h.promoted?'promoted':'kept')+'</td><td class="small">v'+h.champion+'; '+why+'</td></tr>'}).join('');
$('mp-rest').textContent='$ curl "http://127.0.0.1:5077/api/2.0/mlflow/registered-models/alias?name=mi-tiny-gpt&alias=champion"\n'+JSON.stringify(M.rest,null,1);

// reproduction table
const R=M.repro,rows=[['held-out loss',R.recorded.val_loss,R.rerun.val_loss,R.bit_identical.val_loss],['last train loss (step 200)',R.recorded.train_loss_last,R.rerun.train_loss_last,R.bit_identical.train_loss_last],['checkpoint SHA-256',R.recorded.ckpt_sha+'...',R.rerun.ckpt_sha+'...',R.bit_identical.ckpt_sha]];
$('mp-reptab').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td class="mp-r">'+r[1]+'</td><td class="mp-r">'+r[2]+'</td><td class="'+(r[3]?'mp-ok':'mp-no')+'">'+(r[3]?'yes':'no')+'</td></tr>').join('');

// drills
document.querySelectorAll('.mp-pr').forEach(box=>box.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
  box.querySelectorAll('button[data-a]').forEach(x=>{x.classList.toggle('right',x.dataset.a==='1');x.classList.toggle('wrong',x===b&&x.dataset.a!=='1')});box.classList.add('done')}));

// ---- cross-platform chart ----
const X=M.xplat;
const ev=X.every; // [step, loss_native, loss_container, gloss_native, gloss_container]
const firstG=ev.find(r=>r[3]!==r[4])[0],firstL=ev.find(r=>r[1]!==r[2])[0];
const sameG=ev.filter(r=>r[3]===r[4]).length,sameL=ev.filter(r=>r[1]===r[2]).length;
const last=X.logged[X.logged.length-1],d200=Math.abs(last[2]-last[1]);
const maxG=Math.max(...ev.map(r=>Math.abs(r[4]-r[3])));
$('mp-pr5a').innerHTML='Measured, logging every step for 70 steps: step 1 is identical (same initial weights, same batch); rank 0\'s own loss differs in the last bits from step <b>'+firstL+'</b> (identical at '+sameL+' of '+ev.length+' steps), and the all-reduced loss first differs at step <b>'+firstG+'</b> (identical at '+sameG+' of '+ev.length+'). Logging only every 10th step hides it until step 60: logging granularity changes what you can see.';
let xk='g';
function drawX(){const el=$('mp-xp-svg');const W=Math.max(300,el.clientWidth||600),H=170,L=46,Rr=8,Tp=10,B=34;
  const lo=-8.5,hi=-5.5,y=v=>Tp+(hi-v)/(hi-lo)*(H-Tp-B),xs=s=>L+(s-0.5)/ev.length*(W-L-Rr);
  let g='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Absolute loss difference per step, native against container">';
  [-8,-7,-6].forEach(p=>{g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(p)+'" y2="'+y(p)+'" stroke="var(--line)"/><text x="'+(L-4)+'" y="'+(y(p)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">1e'+p+'</text>'});
  const bw=Math.max(1.5,(W-L-Rr)/ev.length*0.7);
  ev.forEach(r=>{const a=xk==='g'?r[3]:r[1],b=xk==='g'?r[4]:r[2],d=Math.abs(b-a),cx=xs(r[0]);
    if(d===0)g+='<circle cx="'+cx+'" cy="'+(H-B+8)+'" r="2.2" fill="var(--good)"><title>step '+r[0]+': identical</title></circle>';
    else{const v=Math.log10(d);g+='<rect x="'+(cx-bw/2)+'" y="'+y(v)+'" width="'+bw+'" height="'+(H-B-y(v))+'" fill="var(--c2)"><title>step '+r[0]+': |difference| '+d.toExponential(2)+'</title></rect>'}});
  [1,10,20,30,40,50,60,70].forEach(s=>{g+='<text x="'+xs(s)+'" y="'+(H-6)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+s+'</text>'});
  g+='<text x="'+L+'" y="'+(H-B+21)+'" font-size="10" fill="var(--good)"></text></svg>';el.innerHTML=g;
  $('mp-xp-cap').innerHTML='Each bar is |container - native| of the '+(xk==='g'?'all-reduced loss':'rank 0 loss')+' at one step (log scale); a green dot under the axis means bit-identical. Steps 1 to 70, logged every step. Over 200 steps (logged every 10): step 200 global loss '+last[1]+' native against '+last[2]+' in the container (difference '+d200.toExponential(2)+'); held-out loss '+M.repro.recorded.val_loss+' against '+X.cval+'; checkpoint SHA-256 '+X.nck+'... against '+X.cck+'.... Largest global difference in the first 70 steps: '+maxG.toExponential(2)+'. Native: '+esc(X.native)+'. Container: '+esc(X.container)+'.'}
$('mp-xp-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;xk=b.dataset.k;[...$('mp-xp-seg').children].forEach(x=>x.classList.toggle('on',x===b));drawX()});
RD.onRender(drawX);addEventListener('resize',()=>{if(!$('t-read').hidden)drawX()});drawX();

// ---- resume animation: the same failed run, rerun all against resume ----
const fail=M.metaflow.find(r=>!r.ok&&r.tasks.length===4),res=M.metaflow.find(r=>r.origin===fail.id);
const dur=(run,s)=>{const t=run.tasks.find(x=>x.step===s);return t?t.dur:0};
const STEPS=['start','train','evaluate','register','end'];
const lanes=[
 {name:'Original run (failed)',tasks:STEPS.slice(0,4).map(s=>({s,d:dur(fail,s),x:s==='register'}))},
 {name:'Fix, then rerun everything',tasks:STEPS.map(s=>({s,d:['register','end'].includes(s)?dur(res,s):dur(fail,s)}))},
 {name:'Fix, then resume',tasks:STEPS.map(s=>({s,d:dur(res,s),c:res.tasks.find(x=>x.step===s).cloned}))}];
lanes.forEach(l=>{let t=0;l.tasks.forEach(k=>{k.t0=t;t+=k.d;k.t1=t});l.total=t});
const tot=lanes[1].total,NF=Math.ceil(tot)+1;
const col={start:'var(--c1)',train:'var(--c3)',evaluate:'var(--c4)',register:'var(--c2)',end:'var(--mute)'};
function drawR(f){const el=$('mp-rs-svg'),W=Math.max(300,el.clientWidth||600),L=Math.min(150,W*0.3),Rr=10,lh=34,H=lanes.length*lh+34,tc=Math.min(f,tot);
  const xs=t=>L+t/tot*(W-L-Rr);let g='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Task timelines: failed run, rerun everything, resume">';
  for(let s=0;s<=tot;s+=5)g+='<line x1="'+xs(s)+'" x2="'+xs(s)+'" y1="4" y2="'+(H-24)+'" stroke="var(--line)"/><text x="'+xs(s)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+s+' s</text>';
  lanes.forEach((l,i)=>{const yy=8+i*lh;g+='<text x="4" y="'+(yy+16)+'" font-size="11.5" fill="var(--ink)">'+(W<460?l.name.replace('Fix, then ',''):l.name)+'</text>';
    l.tasks.forEach(k=>{const a=i===0?k.t1:Math.min(k.t1,tc);if(i>0&&tc<=k.t0)return;const w=Math.max(i>0&&k.c?2:1,xs(i===0?k.t1:a)-xs(k.t0));
      g+='<rect x="'+xs(k.t0)+'" y="'+yy+'" width="'+w+'" height="22" rx="3" fill="'+col[k.s]+'" opacity="'+(i===0?0.45:(k.c?0.35:0.9))+'"><title>'+k.s+(k.c?' (cloned)':'')+': '+k.d.toFixed(2)+' s</title></rect>';
      if(w>34)g+='<text x="'+(xs(k.t0)+4)+'" y="'+(yy+15)+'" font-size="10.5" fill="var(--bg)">'+k.s+'</text>';
      if(k.x)g+='<text x="'+(xs(k.t1)+3)+'" y="'+(yy+16)+'" font-size="13" font-weight="700" fill="var(--bad)">&#10007;</text>'})});
  if(f>0)g+='<line x1="'+xs(tc)+'" x2="'+xs(tc)+'" y1="'+(8+lh-4)+'" y2="'+(H-24)+'" stroke="var(--acc)" stroke-width="1.5"/>';
  g+='</svg>';el.innerHTML=g;
  const sp=l=>l.tasks.reduce((a,k)=>a+Math.max(0,Math.min(k.t1,tc)-k.t0),0),done=l=>l.tasks.filter(k=>k.t1<=tc+1e-9).length;
  const cur=l=>{const k=l.tasks.find(k=>tc>=k.t0&&tc<k.t1);return k?k.s:(tc>=l.total?'finished':'')};
  let cap;
  if(f===0)cap='The failed run: <code>start</code>, <code>train</code> and <code>evaluate</code> finished, <code>register</code> raised after '+dur(fail,'register').toFixed(1)+' s. Fix the one line, then press play: both lanes start at 0 with the fixed code.';
  else if(tc>=tot)cap='Rerunning everything took '+lanes[1].total.toFixed(1)+' s of task time and repeated training; resume took '+lanes[2].total.toFixed(1)+' s, of which the three cloned steps took '+(dur(res,'start')+dur(res,'train')+dur(res,'evaluate')).toFixed(2)+' s. Measured wall clock including Metaflow\'s own start-up: resume '+M.wall.r1_resume+' s; complete runs from scratch '+Math.min(M.wall.r2,M.wall.r3,M.wall.r4,M.wall.r6)+' to '+Math.max(M.wall.r2,M.wall.r3,M.wall.r4,M.wall.r6)+' s.';
  else cap='At '+tc.toFixed(0)+' s. Rerun everything: <b>'+cur(lanes[1])+'</b>'+(cur(lanes[1])==='train'?' (torchrun again, the expensive step on a real run)':'')+'. Resume: <b>'+cur(lanes[2])+'</b>'+(tc<0.05?'':(cur(lanes[2])==='register'?' (the cloned steps were copied from the original run\'s datastore in milliseconds; only the fixed step runs)':''))+'.';
  $('mp-rs-cap').innerHTML=cap;
  $('mp-rs-stats').innerHTML=RDstat('Rerun all: task seconds',sp(lanes[1]).toFixed(1),done(lanes[1])+' of 5 steps done')+RDstat('Resume: task seconds',sp(lanes[2]).toFixed(1),done(lanes[2])+' of 5 steps done')+RDstat('Training reruns','rerun all: '+(tc>lanes[1].tasks[1].t0?1:0)+'; resume: 0','');
}
function RDstat(k,v,d){return '<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>'}
RD.anim({card:'mp-rs-card',ctl:'mp-rs-ctl',n:NF,draw:drawR,ms:700,label:'Second'});
addEventListener('resize',()=>{if(!$('t-read').hidden)drawR(+$('mp-rs-ctl-s').value)});
})();
