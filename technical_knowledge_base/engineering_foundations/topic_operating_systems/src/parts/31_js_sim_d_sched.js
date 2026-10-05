// ---- OS simulators, 1: CPU scheduling (Gantt animation, compare two policies, every policy on one mix, CFS vruntime, real nice split) ----
(function(){
const SC=window.SIMCORE,A=window.SIMA,D=window.SIMDATA;if(!document.getElementById('sim-sch-card'))return;
const $=id=>document.getElementById(id);
// checks and environment (top of the tab)
$('sim-checks').textContent=D.checks.ostep.concat([''],D.checks.js.map(l=>'page JavaScript against the Python reference, '+l)).join('\n');
$('sim-env').textContent=D.raw.env.join('\n');
const PRESETS={
  book:{names:['A','B','C'],jobs:[{arrive:0,run:100,io:0,nice:0},{arrive:10,run:10,io:0,nice:0},{arrive:10,run:10,io:0,nice:0}]},
  node:{names:['Trainer','Worker 1','Worker 2','Shell'],jobs:[{arrive:0,run:60,io:0,nice:0},{arrive:4,run:24,io:4,nice:0},{arrive:8,run:24,io:4,nice:0},{arrive:20,run:6,io:2,nice:0}]},
  rr:{names:['A','B','C'],jobs:[{arrive:0,run:30,io:0,nice:0},{arrive:0,run:30,io:0,nice:0},{arrive:0,run:30,io:0,nice:0}]}};
const MLP=[{q:[10,10,10],a:[1,1,1],b:0},{q:[2,4,8],a:[1,1,2],b:0},{q:[2,4,8],a:[1,1,2],b:40}];
const S={preset:'book',names:[],jobs:[],pol:'STCF',cmp:'SJF',q:4,io:5,ml:1};
function load(p){S.preset=p;$('sim-sch-seedl').hidden=p!=='rand';
  if(p==='rand'){const js=SC.randJobs(+$('sim-sch-seed').value||0,4,30,20,true);S.names=['A','B','C','D'];S.jobs=js.map(j=>({arrive:j.arrive,run:j.run,io:j.io,nice:0}))}
  else{S.names=PRESETS[p].names.slice();S.jobs=PRESETS[p].jobs.map(j=>Object.assign({},j))}table()}
function table(){const t=$('sim-sch-jobs');
  t.innerHTML='<tr><th>Job</th><th class="num">Arrives at</th><th class="num">Needs (ticks)</th><th class="num">I/O every<br><span class="mute">(0 = none)</span></th><th class="num">nice<br><span class="mute">(CFS)</span></th></tr>'+
    S.jobs.map((j,i)=>'<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+A.JOBCOL[i]+';margin-right:5px"></i>'+A.esc(S.names[i])+'</td>'+
    ['arrive','run','io','nice'].map(k=>'<td class="num"><input type="number" data-i="'+i+'" data-k="'+k+'" value="'+j[k]+'" min="'+(k==='nice'?-20:k==='run'?1:0)+'" max="'+(k==='nice'?19:k==='arrive'?200:k==='io'?50:300)+'" aria-label="'+A.esc(S.names[i])+' '+k+'"></td>').join('')+'</tr>').join('')}
$('sim-sch-jobs').addEventListener('change',e=>{const x=e.target;if(!x.dataset.k)return;let v=Math.round(+x.value);if(!isFinite(v))v=0;
  const lim={arrive:[0,200],run:[1,300],io:[0,50],nice:[-20,19]}[x.dataset.k];v=Math.max(lim[0],Math.min(lim[1],v));x.value=v;S.jobs[+x.dataset.i][x.dataset.k]=v;compute()});
function jobsFor(){return S.jobs.map((j,i)=>({id:i,arrive:j.arrive,run:j.run,io:j.io,nice:j.nice}))}
function runPol(p){const jobs=jobsFor();if(p==='MLFQ'){const m=MLP[S.ml];return SC.mlfq(jobs,m.q,m.a,m.b,S.io)}return SC.schedule(jobs,p,{q:S.q,io_time:S.io})}
let res={},an=null,N=1;
function compute(){res.a=runPol(S.pol);res.b=S.cmp?runPol(S.cmp):null;N=Math.max(res.a.timeline.length,res.b?res.b.timeline.length:0);
  if(an)an.reset(N+1,an?Math.min(an.i,N):0);all();rows();legend()}
function legend(){$('sim-sch-leg').innerHTML=S.names.map((n,i)=>'<span><i style="background:'+A.JOBCOL[i]+'"></i>'+A.esc(n)+'</span>').join('')+
  '<span><i style="background:var(--dim)"></i>waiting (ready)</span><span><i style="background:repeating-linear-gradient(45deg,var(--mute) 0 2px,transparent 2px 4px)"></i>blocked on I/O</span>'+(S.pol==='MLFQ'||S.cmp==='MLFQ'?'<span>MLFQ: the number in a block is the queue it ran from (highest = top priority)</span>':'')}
function gantt(i){const el=$('sim-sch-svg'),W=Math.max(300,A.width(el)),lab=Math.min(86,Math.max(56,W*0.14)),x0=lab,pw=W-x0-8,n=S.jobs.length,rh=n>4?13:16,gap=3;
  const tick=pw/Math.max(N,1),sets=[[S.pol,res.a]].concat(res.b?[[S.cmp,res.b]]:[]);let y=4,b='';
  sets.forEach(([pname,r],si)=>{b+=A.T(0,y+11,pname+(pname==='RR'?' (q '+S.q+')':''),{fs:12,w:600});y+=16;
    for(let j=0;j<n;j++){b+=A.T(0,y+rh-4,A.esc(S.names[j]).slice(0,11),{fs:10.5,fill:'var(--mute)'});
      b+=A.R(x0,y,pw,rh,'var(--soft)');
      let t=0;const L=Math.min(i,r.timeline.length);
      while(t<L){const s=r.states[t][j];let e=t;while(e<L&&r.states[e][j]===s)e++;
        const xa=x0+t*tick,w=(e-t)*tick;
        if(s==='R')b+=A.R(xa,y,w,rh,A.JOBCOL[j]);
        else if(s==='W')b+=A.R(xa,y+rh/2-1.5,w,3,'var(--dim)');
        else if(s==='B')b+=A.R(xa,y+2,w,rh-4,'url(#sim-hatch)');
        if(s==='R'&&r.levels&&tick>=7)for(let k=t;k<e;k++)b+=A.T(x0+(k+0.5)*tick,y+rh-4,String(r.levels[k]),{a:'middle',fs:9,fill:'var(--bg)'});
        t=e}
      y+=rh+gap}
    y+=si===0&&res.b?10:4});
  // axis
  const step=N>150?50:N>60?20:10;for(let t=0;t<=N;t+=step){const x=x0+t*tick;b+='<line x1="'+x+'" x2="'+x+'" y1="18" y2="'+y+'" stroke="var(--line)"/>'+A.T(x,y+11,String(t),{a:'middle',fs:10,fill:'var(--mute)'})}
  const cx=x0+Math.min(i,N)*tick;b+='<line x1="'+cx+'" x2="'+cx+'" y1="16" y2="'+y+'" stroke="var(--ink)" stroke-width="1.5"/>';
  const defs='<defs><pattern id="sim-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="4" fill="var(--mute)"/></pattern></defs>';
  el.innerHTML=A.svg(W,y+16,defs+b,'Gantt chart of the schedule up to tick '+i);
  // caption
  const cap=[];sets.forEach(([pname,r])=>{const t=Math.min(i,r.timeline.length)-1;if(t<0){cap.push('<b>'+pname+'</b>: not started');return}
    const who=r.timeline[t],prev=t>0?r.timeline[t-1]:-1;let s='<b>'+pname+'</b>, tick '+t+': '+(who<0?'CPU idle':A.esc(S.names[who])+' runs'+(r.levels?' (queue '+r.levels[t]+')':''));
    if(who>=0&&prev>=0&&prev!==who&&r.states[t][prev]==='W')s+=', preempting '+A.esc(S.names[prev]);
    const fin=r.jobs.filter((x,k)=>x.turnaround+S.jobs[k].arrive===t+1).map(x=>S.names[x.id]);if(fin.length)s+='; '+fin.map(A.esc).join(', ')+' finishes';
    const done=r.jobs.filter((x,k)=>x.turnaround+S.jobs[k].arrive<=t+1).length;s+=' <span class="mute">('+done+' of '+n+' done)</span>';cap.push(s)});
  $('sim-sch-cap').innerHTML=cap.join('<br>');
  const st=r=>A.fmt(r.avg.turnaround,1)+' / '+A.fmt(r.avg.response,1);
  $('sim-sch-stats').innerHTML=sets.map(([p,r])=>'<div class="stat"><div class="k">'+p+': average turnaround / response</div><div class="v">'+st(r)+'</div><div class="d">ticks, over '+n+' jobs, when all finish</div></div>').join('');
  vr(i)}
function rows(){const sets=[[S.pol,res.a]].concat(res.b?[[S.cmp,res.b]]:[]);
  $('sim-sch-rows').innerHTML='<table class="sim-t"><tr><th>Job</th>'+sets.map(([p])=>'<th class="num">'+p+' turnaround</th><th class="num">'+p+' response</th>').join('')+'</tr>'+
    S.jobs.map((j,k)=>'<tr><td>'+A.esc(S.names[k])+'</td>'+sets.map(([p,r])=>'<td class="num">'+r.jobs[k].turnaround+'</td><td class="num">'+r.jobs[k].response+'</td>').join('')+'</tr>').join('')+'</table>'}
function all(){const P=['FIFO','SJF','STCF','RR','MLFQ','CFS'],R=P.map(runPol),mt=Math.max(...R.map(r=>r.avg.turnaround),1);
  let h='<div class="bars">';P.forEach((p,k)=>{const r=R[k];h+='<div class="row'+(p===S.pol?' hl':'')+'"><span class="nm">'+p+' turnaround</span><span class="track"><span class="fill" style="width:'+(100*r.avg.turnaround/mt)+'%;background:var(--c1)"></span></span><span class="val">'+A.fmt(r.avg.turnaround,1)+'</span></div>'+
    '<div class="row'+(p===S.pol?' hl':'')+'"><span class="nm">'+p+' response</span><span class="track"><span class="fill" style="width:'+(100*r.avg.response/mt)+'%;background:var(--c2)"></span></span><span class="val">'+A.fmt(r.avg.response,1)+'</span></div>'});
  $('sim-sch-all').innerHTML=h+'</div><p class="sim-note">Averages in ticks; RR uses the quantum above, MLFQ the setting above. Same scale for both bars.</p>'}
function vr(i){const el=$('sim-sch-vr');const r=S.pol==='CFS'?res.a:S.cmp==='CFS'?res.b:null;if(!r||!r.vr||!r.vr.length){el.innerHTML='';return}
  const W=Math.max(300,A.width(el)),H=150,x0=40,pw=W-x0-10,ph=H-34,n=S.jobs.length,L=r.vr.length;let mx=0;r.vr.forEach(v=>v.forEach(x=>{if(x>mx)mx=x}));mx=Math.max(mx,1);
  const X=t=>x0+t*pw/Math.max(L,1),Y=v=>8+ph-v/mx*ph;let b='';
  for(let k=0;k<=4;k++){const v=mx*k/4,y=Y(v);b+='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+A.T(x0-4,y+3,A.fmt(v,0),{a:'end',fs:10,fill:'var(--mute)'})}
  const lim=Math.min(i,L);for(let j=0;j<n;j++){let d='';for(let t=0;t<lim;t++){if(r.states[t][j]==='-'||r.states[t][j]==='D')continue;d+=(d?'L':'M')+X(t+1).toFixed(1)+' '+Y(r.vr[t][j]).toFixed(1)}
    if(d)b+='<path d="'+d+'" fill="none" stroke="'+A.JOBCOL[j]+'" stroke-width="1.8"/>'}
  el.innerHTML='<div class="sim-svg">'+A.svg(W,H-20,b,'Virtual runtime per job over time')+'</div><p class="sim-note">Virtual runtime of each job over time (CFS, '+(S.pol==='CFS'?'first':'compared')+' schedule). CFS always runs the job with the lowest line; a line is flat while its job waits and absent before it arrives and after it finishes. Steeper lines are jobs with a lower weight (higher nice).</p>'}
// controls
A.seg($('sim-sch-preset'),m=>{load(m);compute();if(an)an.go(N)});
$('sim-sch-seed').addEventListener('change',()=>{load('rand');compute()});
A.seg($('sim-sch-pol'),m=>{S.pol=m;compute()});
$('sim-sch-cmp').addEventListener('change',e=>{S.cmp=e.target.value;compute()});
$('sim-sch-q').addEventListener('input',e=>{S.q=+e.target.value;$('sim-sch-qv').textContent=S.q;compute()});
$('sim-sch-io').addEventListener('input',e=>{S.io=+e.target.value;$('sim-sch-iov').textContent=S.io;compute()});
$('sim-sch-ml').addEventListener('change',e=>{S.ml=+e.target.value;compute()});
load('book');compute();
an=A.anim({card:'sim-sch-card',ctl:'sim-sch-ctl',n:N+1,draw:gantt,ms:110,label:'Tick'});an.go(N);
A.onResize(()=>an.redraw());
// real: nice split
(function(){const rows=D.raw.nice_share.map(l=>{const m=l.match(/nice 0 vs nice (\d+).*share_nice0 ([\d.]+)/);return m?{n:+m[1],s:+m[2]}:null}).filter(Boolean);
  let h='<div class="bars">';rows.forEach(r=>{const w0=1024,w1=SC.weight(r.n),pred=w0/(w0+w1);
    h+='<div class="row"><span class="nm">nice '+r.n+' formula</span><span class="track"><span class="fill" style="width:'+(100*pred)+'%;background:var(--sim-sim)"></span></span><span class="val">'+(100*pred).toFixed(2)+'%</span></div>'+
    '<div class="row hl"><span class="nm">nice '+r.n+' measured</span><span class="track"><span class="fill" style="width:'+(100*r.s)+'%;background:var(--sim-real)"></span></span><span class="val">'+(100*r.s).toFixed(2)+'%</span></div>'});
  $('sim-nice').innerHTML=h+'</div><p class="sim-note">Share of the CPU that went to the nice 0 loop when the other loop had the nice value named. Predicted = 1024 / (1024 + weight(nice)), from the kernel table; measured = its CPU seconds over both loops\' CPU seconds.</p>';
  $('sim-nice-raw').textContent=D.raw.nice_share.join('\n');
  const same=D.raw.ctxsw.filter(l=>/^cpus (\d+),\1 /.test(l)).map(l=>+l.match(/per_switch_us ([\d.]+)/)[1]).sort((a,b)=>a-b);
  const cross=D.raw.ctxsw.filter(l=>!/^cpus (\d+),\1 /.test(l)).map(l=>+l.match(/round_trip_us ([\d.]+)/)[1]).sort((a,b)=>a-b);
  $('sim-ctx-med').textContent=A.fmt(same[same.length>>1],2)+' µs (median of '+same.length+' runs, range '+A.fmt(same[0],2)+' to '+A.fmt(same[same.length-1],2)+')';
  $('sim-ctx-x').textContent=Math.round(cross[0])+' to '+Math.round(cross[cross.length-1])+' µs';
  $('sim-ctx-raw').textContent=D.raw.ctxsw.join('\n')})();
A.drills(document.getElementById('t-sim'));
})();
