// ---- Same model, many numbers: is the gap noise? (binomial and paired-difference calculator) ----
(function(){
  const D=window.SM_DATA,U=window.SMU,M=window.SMC;if(!D||!U||!M)return;
  const {$,esc,link}=U;
  const st={level:0.95,disc:null};
  const pre=$('sm-pre'),na=$('sm-na'),nb=$('sm-nb'),pa=$('sm-pa'),pb=$('sm-pb'),same=$('sm-same'),nbl=$('sm-nbl'),out=$('sm-cout');
  pre.innerHTML='<option value="">Choose a benchmark size</option>'+D.presets.map((p,i)=>'<option value="'+i+'">'+esc(p.name)+'</option>').join('');
  const f1=x=>(x*100).toFixed(1);
  const pfmt=p=>p<0.0001?'below 0.0001':p<0.001?p.toFixed(4):p.toFixed(3);
  function track(items){ // items: [label, lo, hi, point, colour]
    return '<div class="sm-iv">'+items.map(([l,lo,hi,pt,col])=>'<div class="sm-ivr"><span>'+esc(l)+'</span><div class="sm-trk"><span class="bar" style="left:'+(lo*100).toFixed(2)+'%;width:'+Math.max(0.3,(hi-lo)*100).toFixed(2)+'%;background:'+col+'"></span><span class="pt" style="left:'+(pt*100).toFixed(2)+'%;background:'+col+'"></span></div></div>').join('')+
      '<div class="sm-ivr"><span></span><div style="position:relative;height:14px;font-size:10.5px;color:var(--mute)"><span style="position:absolute;left:0">0%</span><span style="position:absolute;left:50%;transform:translateX(-50%)">50%</span><span style="position:absolute;right:0">100%</span></div></div></div>';
  }
  function pcurve(ka,kb,n,lo,hi,cur){ // McNemar p-value against the number of discordant items
    const W=Math.max(260,Math.round(out.clientWidth||600)),H=150,l=44,r=12,t=10,b=34;
    const ds=[];for(let d=lo;d<=hi;d+=2)ds.push(d);if(!ds.length)return '';
    const sx=d=>l+(hi===lo?0.5:(d-lo)/(hi-lo))*(W-l-r),sy=p=>t+(1-p)*(H-t-b);
    const pts=ds.map(d=>{const bb=(d+(ka-kb))/2,cc=(d-(ka-kb))/2;return [d,M.mcnemar(bb,cc)]});
    const a=1-st.level;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Paired test p-value against the number of items on which A and B disagree">';
    [0,0.5,1].forEach(p=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+sy(p)+'" y2="'+sy(p)+'" stroke="var(--line)"/><text x="'+(l-5)+'" y="'+(sy(p)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+p+'</text>'});
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+sy(a)+'" y2="'+sy(a)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+(W-r)+'" y="'+(sy(a)-4)+'" font-size="10.5" text-anchor="end" fill="var(--bad)">p = '+a.toFixed(2)+'</text>';
    s+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+pts.map(([d,p])=>sx(d).toFixed(1)+','+sy(p).toFixed(1)).join(' ')+'"/>';
    const cp=pts.find(q=>q[0]===cur);if(cp)s+='<circle cx="'+sx(cur)+'" cy="'+sy(cp[1])+'" r="5" fill="var(--acc)" stroke="var(--bg)" stroke-width="2"/>';
    s+='<text x="'+l+'" y="'+(H-18)+'" font-size="10.5" fill="var(--mute)">'+lo+'</text><text x="'+(W-r)+'" y="'+(H-18)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+hi+'</text>';
    s+='<text x="'+((l+W-r)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">items on which A and B disagree</text></svg>';
    return s;
  }
  function calc(){
    const nA=Math.max(1,Math.min(100000,Math.round(+na.value||1)));const paired=same.checked;
    const nB=paired?nA:Math.max(1,Math.min(100000,Math.round(+nb.value||1)));
    nbl.hidden=paired;
    const PA=Math.max(0,Math.min(100,+pa.value||0)),PB=Math.max(0,Math.min(100,+pb.value||0));
    const ka=Math.round(PA/100*nA),kb=Math.round(PB/100*nB),z=M.Z[st.level],al=1-st.level;
    const A=M.cp(ka,nA,al),B=M.cp(kb,nB,al),wa=M.wilson(ka,nA,z),wb=M.wilson(kb,nB,z);
    const seA=Math.sqrt((PA/100)*(1-PA/100)/nA);
    const rnd=(P,k,n)=>Math.abs(P/100*n-k)>0.05?' (the score is '+(P/100*n).toFixed(1)+' items, rounded to '+k+')':'';
    let s='<div class="out">'+
      '<div class="stat"><div class="k">A: '+ka+' of '+nA.toLocaleString('en-GB')+'</div><div class="v">'+f1(ka/nA)+'%</div><div class="d">'+Math.round(st.level*100)+'% exact interval '+f1(A[0])+' to '+f1(A[1])+'; Wilson '+f1(wa[0])+' to '+f1(wa[1])+esc(rnd(PA,ka,nA))+'</div></div>'+
      '<div class="stat"><div class="k">B: '+kb+' of '+nB.toLocaleString('en-GB')+'</div><div class="v">'+f1(kb/nB)+'%</div><div class="d">'+Math.round(st.level*100)+'% exact interval '+f1(B[0])+' to '+f1(B[1])+'; Wilson '+f1(wb[0])+' to '+f1(wb[1])+esc(rnd(PB,kb,nB))+'</div></div>'+
      '<div class="stat"><div class="k">Standard error of A (normal approximation)</div><div class="v">&#177;'+(seA*100).toFixed(1)+' pts</div><div class="d">sqrt(p(1 &#8722; p)/n); &#177;'+(1.96*seA*100).toFixed(1)+' points at 1.96 standard errors</div></div></div>';
    s+=track([['A',A[0],A[1],ka/nA,'var(--c1)'],['B',B[0],B[1],kb/nB,'var(--c2)']]);
    const pf=M.fisher(ka,nA,kb,nB),nc=M.newcombe(kb,nB,ka,nA,z),gap=(kb/nB-ka/nA)*100;
    const noiseU=pf>=al;
    s+='<h4 style="margin:12px 0 2px;font-size:14px">If A and B are independent samples</h4><p class="small">Gap B &#8722; A: <b>'+(gap>=0?'+':'')+gap.toFixed(1)+' points</b>, '+Math.round(st.level*100)+'% interval '+(nc[0]*100).toFixed(1)+' to '+(nc[1]*100).toFixed(1)+' (Newcombe). Fisher\'s exact test: p = '+pfmt(pf)+'.</p>';
    if(paired){
      const [lo,hi]=M.discRange(ka,kb,nA);
      const indep=nA*((ka/nA)*(1-kb/nA)+(kb/nA)*(1-ka/nA));
      let d0=Math.round(indep);if((d0-lo)%2)d0+=1;d0=Math.max(lo,Math.min(hi,d0));let d=st.disc;if(d==null||d<lo||d>hi||(d-lo)%2)d=d0;
      st.disc=d;
      const b=(d+(ka-kb))/2,c=(d-(ka-kb))/2,pm=M.mcnemar(b,c),pw=M.pairedWald(c,b,nA,z);
      s+='<h4 style="margin:12px 0 2px;font-size:14px">If A and B ran on the same items (paired)</h4>';
      s+='<p class="small">Two scores alone do not say how many items the two runs disagree on; the paired test needs it. It can be anything from '+lo+' to '+hi+'. The default, '+d0+', is what independent errors would give ('+indep.toFixed(1)+', rounded to a count the two scores allow); models that fail the same hard items disagree less, and then the same gap is clearer.</p>';
      s+='<label class="small" style="display:block">Items on which A and B disagree: <b id="sm-dv">'+d+'</b> (A right and B wrong: '+b+'; B right and A wrong: '+c+')<input type="range" id="sm-disc" min="'+lo+'" max="'+hi+'" step="2" value="'+d+'" aria-label="Items on which A and B disagree"'+(hi===lo?' disabled':'')+'></label>';
      s+='<p class="small">Exact McNemar test: p = <b>'+pfmt(pm)+'</b>; paired gap '+(gap>=0?'+':'')+gap.toFixed(1)+' points, '+Math.round(st.level*100)+'% interval '+(pw[0]*100).toFixed(1)+' to '+(pw[1]*100).toFixed(1)+' (Wald, paired).</p>';
      s+='<div class="sm-pc">'+pcurve(ka,kb,nA,lo,hi,d)+'</div>';
      const v=pm<al;
      s+='<div class="sm-verdict '+(v?'real':'noise')+'">'+(v?'Unlikely to be noise if the runs disagree on '+d+' items: the paired test rejects "no difference" at '+Math.round(st.level*100)+'%.':'Could be noise at '+Math.round(st.level*100)+'% if the runs disagree on '+d+' items.')+' Unpaired, the same gap is '+(noiseU?'within noise':'beyond noise')+' (p = '+pfmt(pf)+').</div>';
    }else{
      s+='<div class="sm-verdict '+(noiseU?'noise':'real')+'">'+(noiseU?'Within noise at '+Math.round(st.level*100)+'%: these two scores are compatible with no real difference.':'Unlikely to be noise at '+Math.round(st.level*100)+'%: Fisher\'s exact test rejects "no difference".')+'</div>';
    }
    // smallest score for B that would clear noise, unpaired, on A's item count
    // start near the normal-approximation answer, then walk to the exact boundary
    let kmin=null;{const p0=Math.min(0.99,Math.max(0.01,ka/nA)),g=Math.floor(ka+0.8*z*Math.sqrt(2*p0*(1-p0)*nA));
      let k=Math.max(ka+1,Math.min(nA,g));const sig=k=>M.fisher(ka,nA,k,nA)<al;
      if(k<=nA&&sig(k)){while(k-1>ka&&sig(k-1))k--;kmin=k}else{for(let it=0;it<2000&&k<nA;it++){k++;if(sig(k)){kmin=k;break}}}}
    s+='<p class="small mute">On '+nA.toLocaleString('en-GB')+' items with A at '+f1(ka/nA)+'%, an independent run B needs '+(kmin==null?'more than any possible score':'at least '+kmin+' items ('+f1(kmin/nA)+'%, +'+((kmin-ka)/nA*100).toFixed(1)+' points)')+' before Fisher\'s test calls the gap real at '+Math.round(st.level*100)+'%.</p>';
    const pi=pre.value!==''?D.presets[+pre.value]:null;
    if(pi&&pi.n===nA)s+='<p class="small">Item count: '+link(pi.src[0],pi.src[1])+(pi.note?' ('+esc(pi.note)+')':'')+'.</p>';
    out.innerHTML=s;
    const dr=$('sm-disc');if(dr)dr.addEventListener('input',()=>{st.disc=+dr.value;calc()});
  }
  pre.addEventListener('change',()=>{if(pre.value==='')return;const p=D.presets[+pre.value];na.value=p.n;nb.value=p.n;st.disc=null;calc()});
  [na,nb,pa,pb].forEach(el=>el.addEventListener('input',()=>{st.disc=null;if(el===na&&pre.value!==''&&+na.value!==D.presets[+pre.value].n)pre.value='';calc()}));
  same.addEventListener('change',()=>{st.disc=null;calc()});
  $('sm-cl').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.level=+b.dataset.c;$('sm-cl').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));calc()}));
  window.SMCALC={set(o){na.value=o.na;nb.value=o.nb;pa.value=o.pa;pb.value=o.pb;same.checked=!!o.paired&&o.na===o.nb;pre.value='';const i=D.presets.findIndex(p=>p.n===o.na);if(i>=0)pre.value=i;st.disc=null;calc()}};
  const i30=D.presets.findIndex(p=>p.n===30);if(i30>=0)pre.value=i30;
  calc();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-same']=(window.TAB_RENDER['t-same']||[]).concat([calc]);
  addEventListener('resize',()=>{const t=$('t-same');if(t&&!t.hidden)calc()});
})();
