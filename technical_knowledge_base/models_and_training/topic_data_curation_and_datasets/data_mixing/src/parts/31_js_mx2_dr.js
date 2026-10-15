// ---- DoReMi step by step tab (t-dr): the toy of recompute.py section 7, ported; Algorithm 1 of arXiv 2305.10429 ----
(function(){
  const D=window.MX2, $=id=>document.getElementById(id), P0=D.toy.params, K=P0.names.length, COL=['var(--c1)','var(--c6)','var(--c3)','var(--c2)','var(--c4)'];
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const loss=(P,i,n)=>{const ne=n[i]+(i?P.tr_web*n[0]:0);return P.E[i]+P.A[i]*Math.pow(ne+P.n0,-P.a[i])};
  const main=(P,w)=>{const n=w.map(x=>x*P.b*K*P.T);return w.map((x,i)=>loss(P,i,n))};
  function run(P){
    const u=Array(K).fill(1/K),rnd=mulberry32(P.seed),ref=main(P,P.ref);let al=u.slice(),n=Array(K).fill(0);const steps=[],avg=Array(K).fill(0);
    for(let t=1;t<=P.T;t++){
      const lp=n.map((_,i)=>loss(P,i,n)),noise=n.map(()=>P.noise*(2*rnd()-1)),ex=lp.map((l,i)=>Math.max(l-ref[i]+noise[i],0));
      const prev=al.slice(),al2=al.map((a,i)=>a*Math.exp(P.eta*ex[i])),z=al2.reduce((a,b)=>a+b,0);
      al=al2.map((a,i)=>(1-P.c)*a/z+P.c*u[i]);
      for(let i=0;i<K;i++)n[i]+=al[i]*P.b*K;
      for(let i=0;i<K;i++)avg[i]+=al[i]/P.T;
      steps.push({t,lp,ex,al:al.slice(),prev,avg:avg.map(x=>x*P.T/t)})}
    return {ref,steps,avg,main_ref:main(P,P.ref),main_dr:main(P,avg)}}
  RD.mx2toy=run;
  let P=Object.assign({},P0),R=run(P);
  const f2=x=>x.toFixed(2),f3=x=>x.toFixed(3);
  function draw(i){
    const W=RD.width($('mx2-dr-plot')),nmW=58,cw=(W-nmW-8)/3,rh=40,H=K*rh+34;let g='';
    const narrow=W<560;['loss','excess λ','weight α'].concat(narrow?[]:[]).forEach((h,c)=>g+=RD.t(nmW+c*cw+2,12,narrow?h:['loss: proxy (bar), reference (tick)','excess λ = max(proxy − ref, 0)','weight α now, average (outline)'][c],{fs:10,fill:'var(--mute)'}));
    if(i===0){$('mx2-dr-plot').innerHTML='<p class="small">Step 0: the proxy is untrained and every weight is 1/5 = 0.20. Press Play or step forward.</p>';$('mx2-dr-out').innerHTML=RD.stat('Step','0 of '+P.T,'')+RD.stat('Weights','0.20 each','uniform start');$('mx2-dr-cap').textContent='';return}
    const s=R.steps[i-1],lmx=Math.max(...R.steps[0].lp,...R.ref),exmx=Math.max(0.5,...s.ex),amx=Math.max(0.5,...s.al,...s.avg);
    for(let k=0;k<K;k++){const y=20+k*rh;g+=RD.t(nmW-6,y+20,P.names[k],{a:'end',fs:12,w:600,fill:COL[k]});
      const w0=cw-44;
      g+='<rect x="'+nmW+'" y="'+(y+6)+'" width="'+(s.lp[k]/lmx*w0).toFixed(1)+'" height="16" fill="'+COL[k]+'" opacity=".55"/>';
      const rx=nmW+R.ref[k]/lmx*w0;g+='<line x1="'+rx.toFixed(1)+'" x2="'+rx.toFixed(1)+'" y1="'+(y+2)+'" y2="'+(y+26)+'" stroke="var(--ink)" stroke-width="2"/>';
      g+=RD.t(nmW+w0+3,y+18,f2(s.lp[k]),{fs:10,fill:'var(--mute)'});
      const x2=nmW+cw;g+='<rect x="'+x2+'" y="'+(y+6)+'" width="'+(s.ex[k]/exmx*(cw-44)).toFixed(1)+'" height="16" fill="var(--bad)"/>'+RD.t(x2+(s.ex[k]/exmx*(cw-44))+3,y+18,f3(s.ex[k]),{fs:10,fill:'var(--mute)'});
      const x3=nmW+2*cw,ww=cw-44;g+='<rect x="'+x3+'" y="'+(y+8)+'" width="'+(s.al[k]/amx*ww).toFixed(1)+'" height="12" fill="'+COL[k]+'"/>';
      g+='<rect x="'+x3+'" y="'+(y+4)+'" width="'+(s.avg[k]/amx*ww).toFixed(1)+'" height="20" fill="none" stroke="var(--ink)" stroke-dasharray="3 2"/>'+RD.t(x3+ww+3,y+18,f3(s.avg[k]),{fs:10,fill:'var(--mute)'})}
    $('mx2-dr-plot').innerHTML=RD.svg(W,H,g,'DoReMi state at step '+i);
    const top=s.ex.indexOf(Math.max(...s.ex)),mult=s.ex.map(e=>Math.exp(P.eta*e));
    $('mx2-dr-out').innerHTML=RD.stat('Step',i+' of '+P.T,'')+RD.stat('Largest excess',P.names[top]+' '+f3(s.ex[top]),'its weight × e^'+f3(s.ex[top])+' = ×'+f3(mult[top]))+
      RD.stat('Weights now',s.al.map(f2).join(' / '),P.names.join(' / '))+RD.stat('Running average (the answer)',s.avg.map(f2).join(' / '),'');
    $('mx2-dr-cap').textContent='Step '+i+': each weight is multiplied by e^(η·λ): '+P.names.map((n,k)=>n+' ×'+f3(mult[k])).join(', ')+'; renormalised to sum 1, then 0.1% uniform mixed in. '+
      (i<6?'Early on the proxy is far behind the reference everywhere, so excess is large and the weights swing.':i>P.T-5?'By the end the proxy has caught up where it was upweighted; excess is near zero and noise dominates the instantaneous weights, which is why the answer is the average.':'Weight flows to the domains where the proxy still lags; the upweighted domains then get more effective gradient and catch up.')}
  const A=RD.anim({card:'mx2-dr-card',ctl:'mx2-dr-ctl',n:P.T+1,ms:220,label:'Step',draw,tab:'t-dr'});
  function drawBA(){
    const W=RD.width($('mx2-dr-baplot')),nmW=58,bw=W-nmW-44,rh=34,H=K*rh+10,mx=Math.max(...R.main_ref,...R.main_dr);let g='';
    for(let k=0;k<K;k++){const y=4+k*rh;g+=RD.t(nmW-6,y+17,P.names[k],{a:'end',fs:12,w:600,fill:COL[k]});
      g+='<rect x="'+nmW+'" y="'+(y+2)+'" width="'+(R.main_ref[k]/mx*bw).toFixed(1)+'" height="12" fill="var(--dim)"/>'+RD.t(nmW+R.main_ref[k]/mx*bw+3,y+12,f3(R.main_ref[k]),{fs:10,fill:'var(--mute)'});
      g+='<rect x="'+nmW+'" y="'+(y+16)+'" width="'+(R.main_dr[k]/mx*bw).toFixed(1)+'" height="12" fill="'+COL[k]+'"/>'+RD.t(nmW+R.main_dr[k]/mx*bw+3,y+26,f3(R.main_dr[k]),{fs:10,fill:'var(--mute)'})}
    $('mx2-dr-baplot').innerHTML=RD.svg(W,H,g,'Final loss per domain with reference and DoReMi weights');
    const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,ex=(a)=>Math.max(...a.map((v,k)=>v-R.ref[k]));
    $('mx2-dr-baout').innerHTML=RD.stat('Average loss, reference mix',f3(mean(R.main_ref)),'')+RD.stat('Average loss, DoReMi mix',f3(mean(R.main_dr)),(mean(R.main_dr)-mean(R.main_ref)>0?'+':'')+f3(mean(R.main_dr)-mean(R.main_ref)))+
      RD.stat('Weights: reference / DoReMi',P.ref.map(f2).join(' ')+' / '+R.avg.map(f2).join(' '),P.names.join(' '))+RD.stat('Domains improved',R.main_dr.filter((v,k)=>v<R.main_ref[k]).length+' of '+K,'lower final loss')}
  function rerun(){R=run(P);A.reset(P.T+1);drawBA()}
  RD.seg($('mx2-dr-ref'),m=>{P.ref=m==='uni'?Array(K).fill(1/K):P0.ref.slice();rerun()});
  RD.seg($('mx2-dr-tr'),m=>{P.tr_web=+m;rerun()});
  RD.onRender(()=>{A.redraw();drawBA()},'t-dr'); RD.onResize(()=>{A.redraw();drawBA()},'t-dr'); drawBA();
})();
