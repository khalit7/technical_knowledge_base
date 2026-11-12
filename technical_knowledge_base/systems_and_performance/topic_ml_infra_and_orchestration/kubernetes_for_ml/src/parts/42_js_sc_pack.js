// ---- Scene: the scheduler's cycle on the same six pods under two profiles (section 3). Data: window.KM.scores, the per-plugin scores the
// scheduler logged at --vmodule=schedule_one=10 (all recomputed by src/recompute.py). One step per pod: the pod waits above the workers,
// Filter tints the workers that lack free GPUs, Score raises one bar per feasible worker (height = its NodeResourcesFit score, the one plugin
// that differs between nodes here), Bind drops the pod onto the winner's free slots. ----
(function(){
  if(!document.getElementById('stg-pack')||!window.KMG||!window.KM)return;const {mix,lerp}=S3,G=KMG,SC=KM.scores;
  const ZB=-1.05,Q=[0,1.9,-1.7];
  let tag='e6spread';
  // the slots each bound pod holds, in binding order (a worker fills from slot 0)
  function layout(t){const used=[0,0,0];return SC[t].steps.map((s,i)=>{if(!s.bound)return null;const w=G.WN[s.bound],from=used[w];used[w]+=s.gpus;return {w,from,n:s.gpus,i}})}
  const L={e6spread:layout('e6spread'),e6pack:layout('e6pack')};
  window.KM_PACK=L;
  // pod colours avoid the page's orange, which marks a filtered node or a Pending pod
  const col=(P,i)=>[P.c1,P.c6,P.c5,P.c3,P.c4,mix(P.ink,P.paper,.35)][i];
  function draw(R,k,e){const P=R.P,S=SC[tag].steps,s=S[k],lay=L[tag],ph1=Math.min(1,e/.3),ph2=Math.max(0,Math.min(1,(e-.3)/.35)),ph3=Math.max(0,(e-.65)/.35);
    R.grid(-4.4,4.4,-2.6,1.6,.5);
    // workers: tinted red once Filter has rejected them for this pod
    G.WX.forEach((x,i)=>{const row=s.rows[i],bad=!row.fits;G.worker(R,[x,0,0],{tint:bad?mix(P.bad,P.paper,1-ph1):null,a:1});
      R.label([x,0,.55],G.NAMES[i],{fs:12.5,dy:14,b:1});
      const fr=row.gpuFree-(lay[k]&&lay[k].w===i&&ph3>.9?S[k].gpus:0);R.label([x,0,.55],fr+' of 4 GPUs free',{fs:12,dy:30,c:bad&&ph1>.5?P.bad:P.mute,mono:true})});
    // pods placed by earlier steps
    lay.forEach((p,i)=>{if(!p||i>=k)return;const c=G.podAt([G.WX[p.w],0,0],p.from,p.n);G.pod(R,c,p.n,{c:col(P,i),a:.92});R.label([c[0],c[1]+.34,c[2]],'p'+(i+1),{fs:12,dy:-8,mono:true,c:P.ink})});
    // Score: one bar per feasible worker behind it
    if(s.scored)s.rows.forEach((r,i)=>{if(!r.fits)return;const v=(r.logged||r).fit,h=Math.max(.02,v/100*1.5*ph2),win=s.bound===r.node,x=G.WX[i];
      R.box([x,0,ZB],[.55,h,.35],{fill:win&&ph3>0?mix(P.paper,P.acc,.75):mix(P.paper,P.c3,.55),a:Math.max(.05,ph2),lw:.7});
      if(ph2>.4)R.label([x,h,ZB],'fit '+v,{mono:true,fs:12.5,dy:-11,b:win,c:win&&ph3>0?P.acc:P.ink,a:ph2})});
    // the pod of this step: waits, then drops onto its slots (Bind), or stays Pending
    const p=lay[k],here=p?G.podAt([G.WX[p.w],0,0],p.from,p.n):null,pos=p&&ph3>0?[lerp(Q[0],here[0],ph3),lerp(Q[1],here[1],ph3)+Math.sin(Math.PI*ph3)*.5,lerp(Q[2],here[2],ph3)]:Q;
    G.pod(R,pos,s.gpus,{c:col(P,k),a:Math.max(.2,ph1),shadow:false});
    R.label([pos[0],pos[1]+.34,pos[2]],'p'+(k+1)+(p&&ph3>=.99?'':' · '+s.gpus+' GPU'+(s.gpus>1?'s':'')),{fs:12.5,dy:-9,b:1,mono:true,a:Math.max(.3,ph1)});
    if(p&&ph3>0&&ph3<1)R.flowArc(Q,here,.5,{c:col(P,k),a:1-ph3*.6,r:.07,speed:1.5});
    if(!p&&ph2>0)R.label([Q[0],Q[1],Q[2]],'Pending: no worker has '+s.gpus+' free',{fs:12.5,dy:26,b:1,c:P.bad,a:ph2});
    if(p&&!s.scored&&ph2>0)R.label([Q[0],Q[1],Q[2]],'one feasible node: no scoring',{fs:12.5,dy:26,c:P.mute,a:ph2});
  }
  const st=S3.stage({id:'stg-pack',list:'sx-pack-e6spread',fig:'Filter, score, bind · six pods, recorded',cam:[.22,.62],bounds:[[-3.6,0,-1.9],[3.6,2.5,.9]],aspect:.58,dur:2600,hold:4400,draw,
    margin:w=>w<520?[18,10,16,10]:[26,18,20,18]});
  (window.KMSTG=window.KMSTG||{})['stg-pack']=st;
  const seg=document.getElementById('km-pack-mode');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===tag)return;tag=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['e6spread','e6pack'].forEach(m=>document.getElementById('sx-pack-'+m).hidden=m!==tag);st.list('sx-pack-'+tag)}));
})();
