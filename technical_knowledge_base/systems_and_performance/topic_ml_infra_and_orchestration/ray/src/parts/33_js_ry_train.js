// ---- Ray child page: Train failure replay (t-train) ----
(function(){
const Y=window.RY,E=RD.esc,$=id=>document.getElementById(id),U=window.RYU,f1=U.f1,f2=U.f2;
const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-train']=window.TAB_RENDER['t-train']||[]).push(f)};
const vis=()=>{const t=$('t-train');return t&&!t.hidden};
const RUNS=Y.train.runs;let ri=0,view='real';
function info(r){
  const R=r.ranks;const crash=R[3].find(e=>e.ev==='crash');
  const starts=R.map(x=>x.filter(e=>e.ev==='start'));const st2=Math.min(...starts.map(s=>s[1].t));const st1=Math.min(...starts.map(s=>s[0].t));
  const end=Math.max(...R.map(x=>x.find(e=>e.ev==='end').t));const exc=r.ctl.find(c=>c.ev==='exception').t;
  const from=starts[0][1].step;const per=(end-st2)/(200-from);
  return {crash,st1,st2,end,exc,from,per};}
function events(r){const I=info(r);const ev=[{t:0,w:'trainer.fit() called; the controller requests a placement group of 4 bundles'},{t:I.st1,w:'worker group of 4 started; every rank starts at step 0'}];
  r.ranks[0].filter(e=>e.ev==='report').forEach(e=>ev.push({t:e.t,w:'workers call ray.train.report for step '+e.step+' (rank 0 uploads the checkpoint)'}));
  r.ctl.filter(c=>c.ev==='report').forEach(c=>ev.push({t:c.t,w:'controller registers the step '+c.step+' checkpoint (all 4 reports collected)',reg:c.step}));
  ev.push({t:I.crash.t,w:'rank 3 exits with code 13 at step 120 (its step-100 report dies with it)'});
  ev.push({t:I.exc,w:'controller poll finds the failure: [FailurePolicy] RETRY, error count 1 of 1'});
  ev.push({t:I.st2,w:'new worker group of 4 started; get_checkpoint() returns step '+I.from});
  ev.push({t:I.end,w:'all ranks reach step 200'});
  return ev.sort((a,b)=>a.t-b.t);}
let EV=events(RUNS[0]);
function draw(i){
  const el=$('ry-tr');if(!el)return;const r=RUNS[ri];const I=info(r);const w=RD.width(el);const now=EV[Math.min(i,EV.length-1)].t;
  const T=view==='naive'?Math.max(I.end, I.end-(I.from===50?50*I.per:0))+1.5:I.end+1.5;
  const L=Math.min(90,w*0.22),R=8,top=8,lh=30,H=top+5*lh+30;const sx=t=>L+(w-L-R)*t/T;
  let s='';for(let k=0;k<=T;k+=5){s+='<line x1="'+sx(k)+'" y1="'+top+'" x2="'+sx(k)+'" y2="'+(H-24)+'" stroke="var(--line)"/>'+RD.t(sx(k),H-10,k+' s',{fs:10,a:'middle',fill:'var(--mute)'})}
  ['rank 0 (w1)','rank 1 (w1)','rank 2 (w2)','rank 3 (w2)','controller'].forEach((n,k)=>{s+=RD.t(L-5,top+k*lh+19,n,{fs:10.5,a:'end',fill:'var(--mute)'})});
  r.ranks.forEach((rk,k)=>{const y=top+k*lh+5;const st=rk.filter(e=>e.ev==='start');
    const a1e=k===3?I.crash.t:I.exc;
    const seg=(t0,t1,col,op,dash)=>{if(now<t0)return;const e=Math.min(t1,now);s+='<rect x="'+sx(t0)+'" y="'+y+'" width="'+Math.max(1,sx(e)-sx(t0))+'" height="'+(lh-12)+'" rx="3" fill="'+col+'" opacity="'+op+'"'+(dash?' stroke="var(--ink)" stroke-dasharray="3 2"':'')+'/>'};
    seg(st[0].t,a1e,'var(--c1)',0.85);
    if(view==='real')seg(st[1].t,rk.find(e=>e.ev==='end').t,'var(--c1)',0.85);
    else{const t2=st[1].t,e2=t2+(200-100)*I.per;seg(t2,e2,'var(--c1)',0.35,true)}
    rk.filter(e=>e.ev==='report').forEach(e=>{if(e.t<=now&&(view==='real'||e.t<I.crash.t)){s+='<rect x="'+(sx(e.t)-1.5)+'" y="'+(y-3)+'" width="3" height="'+(lh-6)+'" fill="var(--c5)"/>'}});
    const c=rk.find(e=>e.ev==='crash');if(c&&c.t<=now)s+='<text x="'+sx(c.t)+'" y="'+(y+13)+'" font-size="15" text-anchor="middle" fill="var(--bad)" font-weight="700">x</text>';
  });
  const cy=top+4*lh+5;
  r.ctl.filter(c=>c.ev==='report').forEach(c=>{if(c.t<=now&&(view==='real'||c.t<I.crash.t))s+='<circle cx="'+sx(c.t)+'" cy="'+(cy+9)+'" r="5" fill="var(--good)"/>'+RD.t(sx(c.t),cy+26,''+c.step,{fs:9.5,a:'middle',fill:'var(--good)'})});
  if(view==='naive'){const t100=r.ranks[0].find(e=>e.ev==='report'&&e.step===100).t;if(now>=t100)s+='<circle cx="'+sx(t100)+'" cy="'+(cy+9)+'" r="5" fill="none" stroke="var(--good)" stroke-dasharray="2 2" stroke-width="2"/>'+RD.t(sx(t100)+8,cy+13,'100?',{fs:9.5,fill:'var(--good)'})}
  if(I.exc<=now)s+='<rect x="'+(sx(I.exc)-1.5)+'" y="'+(cy-3)+'" width="3" height="'+(lh-6)+'" fill="var(--bad)"/>';
  s+='<line x1="'+sx(now)+'" y1="'+top+'" x2="'+sx(now)+'" y2="'+(H-24)+'" stroke="var(--acc)" stroke-width="1.5"/>';
  el.innerHTML=RD.svg(w,H,s,'Ray Train ranks, reports and controller over time');
  let c='<b>t = '+f2(now)+' s.</b> '+E(EV[Math.min(i,EV.length-1)].w)+'.';
  if(view==='naive')c+=' <span class="ill">illustrative</span> If step 100 had been registered, the second attempt would start at step 100 and redo 20 steps instead of 70: the faded bars, at the measured '+(I.per*1000).toFixed(0)+' ms per step of the real second attempt. That is not what Ray did.';
  $('ry-tr-cap').innerHTML=c;
}
const anim=RD.anim({card:'ry-tr-card',ctl:'ry-tr-ctl',n:EV.length,draw:draw,ms:1500,label:'Event'});
function setRun(k){ri=k;EV=events(RUNS[ri]);$('ry-tr-title').innerHTML='Run '+(ri+1)+' of 3 <span class="ry-meas">measured</span>';anim.reset(EV.length);anim.play();tables()}
$('ry-tr-run').innerHTML=RUNS.map((r,k)=>'<button data-m="'+k+'"'+(k?'':' class="on"')+'>Run '+(k+1)+'</button>').join('');
RD.seg($('ry-tr-run'),m=>setRun(+m));
RD.seg($('ry-tr-view'),m=>{view=m;anim.redraw()});
function tables(){
  const r=RUNS[ri],I=info(r);
  $('ry-tr-title').innerHTML='Run '+(ri+1)+' of 3 <span class="ry-meas">measured</span>';
  const reg=r.ctl.filter(c=>c.ev==='report').map(c=>c.step);
  $('ry-tr-stats').innerHTML=RD.stat('Restarted from step',I.from,'registered: '+reg.join(', '))+RD.stat('Steps redone',120-I.from,'crash at 120; 20 if step 100 had counted')+
    RD.stat('Crash seen by the controller',f2(I.exc-I.crash.t)+' s after','polls every 2 s')+RD.stat('fit() total',f1(r.result.secs)+' s','final global loss '+r.result.metrics.gloss);
  const kept=r.result.checkpoint;
  $('ry-tr-store').querySelector('tbody').innerHTML=r.result.storage_listing.map(n=>{
    let what='';if(/^checkpoint_2/.test(n)){const isFinal=n===kept;const orphan=!isFinal&&n<r.result.storage_listing.filter(x=>/^checkpoint_2/.test(x))[1];
      what=isFinal?'step 200, the final checkpoint (result.checkpoint)':orphan?'<b>orphan</b>: the first attempt\'s step-100 upload, never registered, never deleted':'step 150, kept (num_to_keep=2)'}
    else if(n==='checkpoint_manager_snapshot.json')what='the controller\'s record of registered checkpoints';else what='Ray Train\'s storage check marker';
    return '<tr><td><code>'+E(n)+'</code></td><td class="num">'+(r.ckpt_bytes[n]!=null?r.ckpt_bytes[n].toLocaleString('en-US'):'')+'</td><td>'+what+'</td></tr>'}).join('');
  const ref=Y.train.ref_gloss;const st2=I.st2;
  $('ry-tr-loss').querySelector('tbody').innerHTML=r.ranks[0].filter(e=>e.ev==='step'&&e.t>=st2&&ref[e.step]!=null).map(e=>{const d=e.g-ref[e.step];
    return '<tr><td class="num">'+e.step+'</td><td class="num">'+e.g+'</td><td class="num">'+ref[e.step]+'</td><td class="num"'+(d?' style="color:var(--bad)"':'')+'>'+(d?d.toExponential(2):'0')+'</td></tr>'}).join('');
}
function all(){if(!vis())return;tables();draw(anim.i)}
reg(all);addEventListener('resize',()=>{clearTimeout(all.t);all.t=setTimeout(all,80)});
tables();
})();
