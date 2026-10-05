// ---- Reading s5: 100 repetitions of one experiment, each with its 95% interval (data: SD.anim, seeded draws from sims.py) ----
ST.ivals=function(key,meth){
  const sc=SD.anim[key],n=sc.n,c=meth==='t'?SD.tcrit[String(n)]:1.96;
  return sc.x.map(r=>{let m=0;r.forEach(v=>m+=v);m/=n;let ss=0;r.forEach(v=>ss+=(v-m)*(v-m));const s=Math.sqrt(ss/(n-1)),h=c*s/Math.sqrt(n);
    return {m:m,s:s,lo:m-h,hi:m+h,cov:m-h<=sc.mu&&sc.mu<=m+h,low:m+h<sc.mu}});
};
ST.ivalCount=(key,meth)=>{const iv=ST.ivals(key,meth);return {cov:iv.filter(v=>v.cov).length,low:iv.filter(v=>v.low).length,high:iv.filter(v=>!v.cov&&!v.low).length}};
(function(){
  const card=document.getElementById('rd-ci-card');if(!card)return;
  const GK={normal30:['normal','30'],tiny30:['tiny','30'],lognormal5:['lognormal','5']};
  const LAB={normal30:'bell-shaped data (mean 0.832, sd 0.651)',tiny30:"the tiny model's sampled loss",lognormal5:'a lognormal (mean 1.649)'};
  let key='normal30',meth='t',iv=ST.ivals(key,meth);
  // fixed axis per population (intervals running past it are cut at the edge)
  const RANGE={normal30:[0.3,1.4],tiny30:[0.3,1.4],lognormal5:[-1,5]};
  function range(){return RANGE[key]}
  function draw(k){
    const sc=SD.anim[key],el=document.getElementById('rd-ci-svg'),W=RD.width(el),L=10,R=10,T=34,rowH=2.6,H=T+100*rowH+26,pw=W-L-R;
    const [lo,hi]=range(),X=x=>L+(Math.min(hi,Math.max(lo,x))-lo)/(hi-lo)*pw;
    let s='';
    // the current sample's draws
    if(k>0){const r=sc.x[k-1],v=iv[k-1];r.forEach(x=>{if(x<lo||x>hi)return;s+='<circle cx="'+X(x).toFixed(1)+'" cy="14" r="3" style="fill:var(--c1);opacity:.55"/>'});
      s+='<line x1="'+X(v.m)+'" x2="'+X(v.m)+'" y1="5" y2="23" style="stroke:var(--ink);stroke-width:2"/>'+RD.t(L,31,'experiment '+k+': '+sc.n+' draws (dots, those on the axis), their mean (bar)',{fs:10,fill:'var(--mute)'})}
    else s+=RD.t(L,18,'Press play: each step runs the experiment once more',{fs:11,fill:'var(--mute)'});
    for(let i=0;i<k;i++){const v=iv[i],y=T+i*rowH+1;s+='<line x1="'+X(v.lo).toFixed(1)+'" x2="'+X(v.hi).toFixed(1)+'" y1="'+y+'" y2="'+y+'" style="stroke:'+(v.cov?'var(--dim)':'var(--bad)')+';stroke-width:'+(i===k-1?2.4:1.6)+'"/>'+
      '<circle cx="'+X(v.m).toFixed(1)+'" cy="'+y+'" r="'+(i===k-1?2.4:1.3)+'" style="fill:'+(v.cov?'var(--mute)':'var(--bad)')+'"/>'}
    s+='<line x1="'+X(sc.mu)+'" x2="'+X(sc.mu)+'" y1="'+(T-4)+'" y2="'+(T+100*rowH)+'" style="stroke:var(--good);stroke-width:1.5"/>'+RD.t(X(sc.mu)+3,H-14,'true mean '+sc.mu.toFixed(3),{fs:10.5,fill:'var(--good)'});
    s+=RD.t(L,H-2,ST.fmt(lo,1),{fs:10,fill:'var(--mute)'})+RD.t(W-R,H-2,ST.fmt(hi,1),{fs:10,fill:'var(--mute)',a:'end'});
    el.innerHTML=RD.svg(W,H,s,'Confidence intervals from repeated experiments');
    const sh=iv.slice(0,k),cov=sh.filter(v=>v.cov).length,low=sh.filter(v=>v.low).length,high=k-cov-low;
    const g=SD.grid.dists[GK[key][0]].by_n[GK[key][1]][meth].cov;
    let t;
    if(k===0)t='Population: '+LAB[key]+'. Each experiment draws n = '+sc.n+' values and builds the '+(meth==='t'?'t-interval (multiplier '+SD.tcrit[String(sc.n)].toFixed(3)+')':'interval with 1.96 and s')+'.';
    else if(k<100)t='After '+k+' experiment'+(k>1?'s':'')+': '+cov+' interval'+(cov===1?'':'s')+' caught the true mean, '+(k-cov)+' missed'+(k-cov?' ('+low+' wholly below, '+high+' wholly above)':'')+'. The truth never moves; the intervals do.';
    else t='All 100: '+cov+' caught the truth. Over 5,000 repetitions this procedure covers '+ST.pct(g)+'. '+(key==='lognormal5'?'The misses all sit below the truth: skewed small samples rarely contain the large values.':key==='tiny30'?'100 intervals is itself a small sample: this run looks better than the long-run rate.':'This is what "95% confident" promises: about 95 in 100, with the misses split evenly between the two sides in the long run.');
    document.getElementById('rd-ci-cap').innerHTML='<div class="t">'+(k===0?'Ready':'Experiment '+k+' of 100')+'</div><p>'+t+'</p>';
    document.getElementById('rd-ci-cnt').innerHTML=RD.stat('intervals drawn',k,'')+RD.stat('caught the truth',cov,k?ST.pct(cov/k,0):'')+RD.stat('missed below / above',low+' / '+high,'')+RD.stat('long-run coverage',ST.pct(g),'5,000 repetitions');
  }
  const A=RD.anim({card:'rd-ci-card',ctl:'rd-ci-ctl',n:101,draw:draw,ms:300,label:'Experiment'});
  RD.seg(document.getElementById('rd-ci-seg'),m=>{key=m;iv=ST.ivals(key,meth);A.reset(101);A.play()});
  RD.seg(document.getElementById('rd-ci-meth'),m=>{meth=m;iv=ST.ivals(key,meth);A.redraw()});
  RD.onResize(()=>A.redraw());
})();
