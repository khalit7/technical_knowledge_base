// ---- Reading, section 5: the same run through the same failures, with and without checkpoints; MTBF and Young calculator ----
(function(){
  // Llama 3 405B: 419 unexpected interruptions in 54 days on 16,384 GPUs (paper section 3.3.4)
  const L3={n:16384,mtbfH:54*24/419};
  window.RD_FAIL={L3};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('rd-l3m',L3.mtbfH.toFixed(1));
  set('rd-m1k',Math.round(L3.mtbfH*L3.n/1000));
  set('rd-m100k',Math.round(L3.mtbfH*L3.n/100000*60));
  // checkpoint size at 14 bytes per parameter
  set('rd-ck70',(14*70e9/1e12).toFixed(2));set('rd-ck405',(14*405e9/1e12).toFixed(1));

  // --- timeline simulation (illustrative inputs, rechecked in recompute.py) ---
  const W=20,FAILS=[9,17],RST=0.5,CI=4,CW=0.1;
  function run(ck){
    let wall=0,prog=0,last=0,lost=0,writing=0,restarts=0;const pts=[[0,0]],marks=[];const fq=FAILS.slice();
    for(let g=0;g<100;g++){
      const f=fq.length?fq[0]:Infinity;
      const tFin=wall+(W-prog);
      const tCk=ck&&last+CI<W?wall+(last+CI-prog):Infinity;
      if(f<Math.min(tFin,tCk)){const p=prog+(f-wall);pts.push([f,p]);lost+=p-last;marks.push(['fail',f,p]);
        pts.push([f,last]);pts.push([f+RST,last]);wall=f+RST;prog=last;restarts++;fq.shift();continue}
      if(tCk<tFin){pts.push([tCk,last+CI]);prog=last+CI;wall=tCk;
        if(f<wall+CW){pts.push([f,prog]);lost+=prog-last;marks.push(['fail',f,prog]);pts.push([f,last]);pts.push([f+RST,last]);wall=f+RST;prog=last;restarts++;fq.shift();continue}
        wall+=CW;writing+=CW;pts.push([wall,prog]);last=prog;marks.push(['ck',wall,prog]);continue}
      pts.push([tFin,W]);wall=tFin;prog=W;break}
    return {pts,marks,end:wall,lost,writing,restarts,goodput:W/wall};
  }
  const R={none:run(false),ckpt:run(true)};window.RD_CK=R;
  const el=document.getElementById('rd-ck-svg');if(!el)return;
  let mode='none';const TM=Math.ceil(Math.max(R.none.end,R.ckpt.end));const STEP=0.5;
  const progAt=(r,t)=>{let p=0;for(let k=1;k<r.pts.length;k++){const [a,pa]=r.pts[k-1],[b,pb]=r.pts[k];if(t<a)break;if(t>=b){p=pb;continue}p=b>a?pa+(pb-pa)*(t-a)/(b-a):pb;break}return p};
  function draw(i){
    const r=R[mode],t=Math.min(i*STEP,r.end);
    const w=Math.max(300,Math.min(860,RD.width(el)));
    const L=34,rw=w-L-10,top=10,ph=150,H=top+ph+36;
    const xs=v=>L+v/TM*rw,ys=v=>top+ph-v/W*ph;let b='';
    for(let v=0;v<=W;v+=5)b+='<line x1="'+L+'" y1="'+ys(v)+'" x2="'+(L+rw)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-5,ys(v)+3,v,{a:'end',fs:10,fill:'var(--mute)'});
    for(let v=0;v<=TM;v+=w<480?10:5)b+=RD.t(xs(v),top+ph+13,v,{a:'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t(L+rw/2,top+ph+28,w<620?'wall-clock hours; height = work done':'wall-clock hours (height: hours of training work done, 20 needed)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    // ghost of the other mode, full
    const other=R[mode==='none'?'ckpt':'none'];
    b+='<polyline fill="none" stroke="var(--dim)" stroke-width="1.5" points="'+other.pts.map(p=>xs(p[0])+','+ys(p[1])).join(' ')+'"/>';
    // this mode up to t
    const pts=r.pts.filter(p=>p[0]<=t);pts.push([t,progAt(r,t)]);
    b+='<polyline fill="none" stroke="var(--acc)" stroke-width="2.5" points="'+pts.map(p=>xs(p[0])+','+ys(p[1])).join(' ')+'"/>';
    r.marks.filter(m=>m[1]<=t).forEach(m=>{if(m[0]==='fail')b+='<line x1="'+xs(m[1])+'" y1="'+top+'" x2="'+xs(m[1])+'" y2="'+(top+ph)+'" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 2"/>'+RD.t(xs(m[1])+3,top+10,'failure',{fs:10,fill:'var(--bad)'});
      else b+='<circle cx="'+xs(m[1])+'" cy="'+ys(m[2])+'" r="3.5" fill="var(--c3)"/>'});
    el.innerHTML=RD.svg(w,H,b,'Training progress against wall-clock time through two failures');
    // counters and caption
    const fails=r.marks.filter(m=>m[0]==='fail'&&m[1]<=t),cks=r.marks.filter(m=>m[0]==='ck'&&m[1]<=t);
    const lostNow=fails.reduce((a,m)=>a+(m[2]-(r.marks.filter(c=>c[0]==='ck'&&c[1]<m[1]).slice(-1)[0]||[0,0,0])[2]),0);
    const done=t>=r.end;
    let cap;
    if(done)cap=['Finished at hour '+r.end.toFixed(1),'20 hours of work took '+r.end.toFixed(1)+' hours: goodput '+Math.round(r.goodput*100)+'%. Grey line: the other mode, for comparison.'];
    else if(fails.length&&t-fails[fails.length-1][1]<=RST+0.01)cap=['Failure at hour '+fails[fails.length-1][1],mode==='none'?'With no checkpoint the job restarts from step 0: all '+fails[fails.length-1][2].toFixed(1)+' hours of work are lost, plus the restart.':'The job restarts from the last checkpoint; only the work since it is lost, plus the restart.'];
    else cap=['Hour '+t.toFixed(1),mode==='none'?'Training, with nothing saved.':'Training; a checkpoint every 4 hours of work costs 0.1 hours of writing (green dots).'];
    document.getElementById('rd-ck-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    document.getElementById('rd-ck-cnt').innerHTML=RD.stat('Work done',progAt(r,t).toFixed(1)+' of 20 h')+RD.stat('Work lost to failures',lostNow.toFixed(1)+' h')+RD.stat('Time writing checkpoints',(cks.length*CW).toFixed(1)+' h')+RD.stat('Goodput so far',t?Math.round(progAt(r,t)/t*100)+'%':'n/a');
  }
  const nSteps=r=>Math.ceil(r.end/STEP)+1;
  const an=RD.anim({card:'rd-ck-card',ctl:'rd-ck-ctl',n:nSteps(R.none),draw,ms:260,label:'Hour'});
  RD.seg(document.getElementById('rd-ck-mode'),m=>{mode=m;an.reset(nSteps(R[m]));an.play()});
  RD.onResize(()=>an.redraw());

  // --- MTBF and Young calculator ---
  const nS=document.getElementById('rd-mt-n'),cS=document.getElementById('rd-mt-c'),rS=document.getElementById('rd-mt-r'),out=document.getElementById('rd-mt-out');
  function calc(){
    const N=+nS.value,C=+cS.value,Rr=+rS.value;
    const M=L3.mtbfH*L3.n/N*3600;const tau=Math.sqrt(2*C*M);const loss=C/tau+(tau/2+Rr)/M;
    const fmtT=s=>s>=7200?(s/3600).toFixed(1)+' h':s>=120?(s/60).toFixed(0)+' min':s.toFixed(0)+' s';
    out.innerHTML=RD.stat('Job MTBF',fmtT(M),'one interruption every')+RD.stat('Young interval',fmtT(tau),'&radic;(2CM)')+RD.stat('Interruptions per day',(86400/M).toFixed(1))+
      RD.stat('Expected time lost',loss>=0.5?'over 50%':(loss*100).toFixed(1)+'%',loss>0.25?'first-order formula unreliable here':'writing + redone work + restarts');
  }
  [nS,cS,rS].forEach(s=>s.addEventListener('change',calc));calc();
})();
