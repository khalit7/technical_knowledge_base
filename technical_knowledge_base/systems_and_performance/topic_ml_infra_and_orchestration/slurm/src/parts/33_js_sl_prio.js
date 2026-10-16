// ---- Priority calculator tab: multifactor priority as Slurm 24.11.5 computes it, checked against the recorded sprio rows ----
(function(){
const S=window.SL, esc=RD.esc, $=id=>document.getElementById(id);
if(!$('t-prio'))return;
const W0=S.weights;
const PART={batch:1,sllow:0.5,urgent:0.5}, QOSF={normal:0,'sl-small':0.2,'sl-high':1};
// the 22 measured rows
const ROWS=[];S.snaps.forEach((s,k)=>Object.keys(s.sprio).forEach(id=>{const j=S.jobs[id],n=s.norm[id],t={};j.ReqTRES.split(',').forEach(x=>{const p=x.split('=');t[p[0]]=p[1]});
  const q=s.q.find(x=>x.id===id||x.id.indexOf(id+'_')===0)||{};
  ROWS.push({snap:s.at,id:id,name:j.JobName,user:q.user||'',sprio:s.sprio[id].prio,in:{age_s:+(n.age*W0.maxage).toFixed(3),fs:n.fs,nodes:+t.node,cpus:+t.cpu,gpus:+(t['gres/gpu']||0),part:j.Partition,qos:j.QOS,nice:+j.Nice}})}));
// the calculation, in the order of _get_priority_internal (assoc and site factors are 0 on this cluster)
function calc(x,w,cl){const age=Math.min(1,x.age_s/w.maxage),js=Math.min(1,(x.nodes/cl.nodes+x.cpus/cl.cpus)/2),tres=x.gpus/cl.gpus;
  const parts={age:w.age*age,fs:w.fs*x.fs,js:w.js*js,part:w.part*PART[x.part],qos:w.qos*QOSF[x.qos],tres:w.gpu*tres};
  let p=parts.age;p+=0;p+=parts.fs;p+=parts.js;p+=parts.part;p+=parts.qos;p+=parts.tres;p+=0;p-=x.nice;
  return {prio:Math.max(1,Math.trunc(p)),raw:p,parts:parts,f:{age:age,fs:x.fs,js:js,part:PART[x.part],qos:QOSF[x.qos],tres:tres}}}
window.SL_PRIO={calc:calc,ROWS:ROWS};
const CL={nodes:3,cpus:12,gpus:12};
const F=[['w','age','weight: age',1000],['w','fs','weight: fairshare',10000],['w','js','weight: job size',1000],['w','part','weight: partition',1000],['w','qos','weight: QOS',2000],['w','gpu','weight: GPU TRES',500],['w','maxage','PriorityMaxAge (s)',600],
 ['x','age_s','eligible for (s)',0],['x','fs','fairshare factor (0 to 1)',0.5],['x','nodes','nodes requested',1],['x','cpus','CPUs requested',4],['x','gpus','GPUs requested',4],['x','nice','nice',0]];
$('pc-in').innerHTML=F.map(f=>'<label>'+f[2]+' <input type="number" step="any" min="0" id="pc-'+f[0]+'-'+f[1]+'" value="'+f[3]+'"></label>').join('')+
  '<label>partition <select id="pc-x-part"><option value="batch">batch (PriorityJobFactor 2: factor 1.0)</option><option value="sllow">sllow (1: 0.5)</option><option value="urgent">urgent (1: 0.5)</option></select></label>'+
  '<label>QOS <select id="pc-x-qos"><option value="normal">normal (priority 0: 0)</option><option value="sl-small">sl-small (20: 0.2)</option><option value="sl-high">sl-high (100: 1.0)</option></select></label>';
$('pc-pre').innerHTML='<option value="-1">(your own inputs)</option>'+ROWS.map((r,i)=>'<option value="'+i+'">'+r.snap+' job '+r.id+' '+esc(r.name)+' ('+esc(r.user)+'), sprio '+r.sprio+'</option>').join('');
function read(){const w={},x={};F.forEach(f=>{const v=parseFloat($('pc-'+f[0]+'-'+f[1]).value);(f[0]==='w'?w:x)[f[1]]=isFinite(v)?v:0});x.part=$('pc-x-part').value;x.qos=$('pc-x-qos').value;if(!(w.maxage>0))w.maxage=1;x.fs=Math.max(0,Math.min(1,x.fs));return {w,x}}
let cur=-1;
function load(i){cur=i;const r=ROWS[i];if(!r)return;F.forEach(f=>{if(f[0]==='w')$('pc-w-'+f[1]).value=W0[f[1]];else $('pc-x-'+f[1]).value=r.in[f[1]]});$('pc-x-part').value=r.in.part;$('pc-x-qos').value=r.in.qos;$('pc-pre').value=String(i);run()}
const COL={fs:'var(--c1)',age:'var(--c3)',js:'var(--c5)',part:'var(--c6)',qos:'var(--c4)',tres:'var(--c2)'},NM={fs:'fairshare',age:'age',js:'job size',part:'partition',qos:'QOS',tres:'GPU TRES'};
function run(){const {w,x}=read(),c=calc(x,w,CL);
  $('pc-out').innerHTML=RD.stat('priority',c.prio.toLocaleString('en-US'),'sum before truncation '+c.raw.toFixed(6))+
    Object.keys(NM).map(k=>RD.stat(NM[k],c.parts[k].toFixed(2),'factor '+c.f[k].toFixed(4))).join('')+(x.nice?RD.stat('nice','&minus;'+x.nice,''):'');
  const el=$('pc-bars'),Wd=Math.min(RD.width(el),860),tot=Object.values(c.parts).reduce((a,b)=>a+b,0)||1;let xx=0,b='';
  Object.keys(NM).forEach(k=>{const v=c.parts[k];if(v<=0)return;const ww=(Wd-2)*v/tot;b+='<rect x="'+xx+'" y="4" width="'+ww+'" height="20" fill="'+COL[k]+'"/>';if(ww>60)b+=RD.t(xx+4,18,NM[k],{fs:11,fill:'var(--bg)',w:600});xx+=ww});
  el.innerHTML=RD.svg(Wd,28,b,'Share of each factor in the priority');
  const r=ROWS[cur];
  $('pc-res').innerHTML=r&&cur>=0?'<b>Job '+r.id+' at '+r.snap+':</b> sprio printed '+r.sprio.toLocaleString('en-US')+', the calculator gives '+c.prio.toLocaleString('en-US')+(c.prio===r.sprio?' <span class="sl-meas">reproduces</span>':' <span class="ill">differs by '+(c.prio-r.sprio)+'</span>')+(c.prio===r.sprio?'':' (you changed an input).'):'Your own inputs: no measured row to compare with.'}
$('pc-in').addEventListener('input',()=>{cur=-1;$('pc-pre').value='-1';run()});$('pc-in').addEventListener('change',()=>{cur=-1;$('pc-pre').value='-1';run()});
$('pc-pre').addEventListener('change',e=>{const i=+e.target.value;if(i>=0)load(i);else{cur=-1;run()}});
// the check table
let ok=0;$('pc-tab').innerHTML=ROWS.map((r,i)=>{const c=calc(r.in,W0,CL);const good=c.prio===r.sprio;if(good)ok++;
  return '<tr data-i="'+i+'"><td>'+r.snap+'</td><td>'+r.id+' '+esc(r.name.replace('sl-g-',''))+'</td><td>'+esc(r.user)+'</td><td class="small">age '+r.in.age_s+' s, fs '+r.in.fs+', '+r.in.nodes+'N/'+r.in.cpus+'C/'+r.in.gpus+'G, '+r.in.part+', '+r.in.qos+(r.in.nice?', nice '+r.in.nice:'')+'</td><td class="num">'+c.prio+'</td><td class="num">'+r.sprio+'</td><td class="'+(good?'ok':'no')+'">'+(good?'=':'&ne;')+'</td></tr>'}).join('');
$('pc-tab').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;load(+tr.dataset.i);$('pc-tab').querySelectorAll('tr').forEach(t=>t.classList.toggle('sel',t===tr));$('pc-pre').scrollIntoView({block:'nearest'})});
// the truncation case
(function(){const i=ROWS.findIndex(r=>r.id==='90'&&r.snap===S.snaps[1].at);if(i<0)return;const r=ROWS[i],c=calc(r.in,W0,CL);
  $('pc-trunc').innerHTML='Job '+r.id+' at '+r.snap+': its parts are '+Object.keys(NM).map(k=>c.parts[k].toFixed(3)).join(' + ')+', which is 8,585 in exact arithmetic. Added as doubles in the source\'s order the sum is '+c.raw.toFixed(9)+' (the thirds are not exact in binary), and truncation gives '+c.prio.toLocaleString('en-US')+', which is what <code>sprio</code> printed. Rounding instead of truncating would miss it by one. '+ok+' of '+ROWS.length+' rows reproduce.'})();
load(0);
})();
