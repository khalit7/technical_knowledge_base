// ---- Reading s4: the sampling distribution of the mean, n stepped from 1 to 1000 (data: SD.clt from sims.py) ----
// shared histogram helper used by the Reading charts and the tabs
window.ST=window.ST||{};
ST.fmt=(v,d)=>v==null||!isFinite(v)?'n/a':(+v).toFixed(d==null?3:d);
ST.pct=(v,d)=>v==null?'n/a':(100*v).toFixed(d==null?1:d)+'%';
ST.npdf=(x,m,s)=>Math.exp(-0.5*((x-m)/s)*((x-m)/s))/(s*Math.sqrt(2*Math.PI));
// hist: {lo,hi,cnt[]}; opts: {w,h,fill,curve:[[x,y]...] in count units, vline:{x,label}, xlab}
ST.hist=function(o){
  const W=o.w,H=o.h||200,L=34,R=10,T=14,B=30,pw=W-L-R,ph=H-T-B;
  const k=o.cnt.length,bw=(o.hi-o.lo)/k;
  let ymax=Math.max(...o.cnt,...(o.cnt2||[0]));if(o.curve)ymax=Math.max(ymax,...o.curve.map(c=>c[1]));ymax=ymax||1;
  const X=x=>L+(x-o.lo)/(o.hi-o.lo)*pw,Y=y=>T+ph-y/ymax*ph;
  let s='';
  o.cnt.forEach((c,i)=>{const x0=X(o.lo+i*bw),x1=X(o.lo+(i+1)*bw);s+='<rect x="'+x0.toFixed(1)+'" y="'+Y(c).toFixed(1)+'" width="'+Math.max(0.5,x1-x0-0.6).toFixed(1)+'" height="'+(T+ph-Y(c)).toFixed(1)+'" style="fill:'+(o.fill||'var(--c1)')+';opacity:'+(o.cnt2?0.55:0.8)+'"/>'});
  if(o.cnt2){let d='';o.cnt2.forEach((c,i)=>{const x0=X(o.lo+i*bw),x1=X(o.lo+(i+1)*bw);d+=(i?'L':'M')+x0.toFixed(1)+' '+Y(c).toFixed(1)+'L'+x1.toFixed(1)+' '+Y(c).toFixed(1)});s+='<path d="'+d+'" style="fill:none;stroke:'+(o.stroke2||'var(--c2)')+';stroke-width:2"/>'}
  if(o.curve){s+='<path d="'+o.curve.map((c,i)=>(i?'L':'M')+X(c[0]).toFixed(1)+' '+Y(c[1]).toFixed(1)).join('')+'" style="fill:none;stroke:var(--ink);stroke-width:1.6"/>'}
  (o.vlines||[]).forEach(v=>{if(v.x<o.lo||v.x>o.hi)return;s+='<line x1="'+X(v.x)+'" x2="'+X(v.x)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:'+(v.c||'var(--good)')+';stroke-width:1.5;stroke-dasharray:'+(v.dash||'4 3')+'"/>'+RD.t(Math.min(W-R-2,Math.max(L+2,X(v.x)+3)),T+9+(v.dy||0),v.label,{fs:10.5,fill:v.c||'var(--good)',a:X(v.x)>W*0.7?'end':'start'})});
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'" style="stroke:var(--mute)"/>';
  for(let i=0;i<=4;i++){const x=o.lo+i*(o.hi-o.lo)/4;s+=RD.t(X(x),T+ph+13,ST.fmt(x,Math.abs(o.hi-o.lo)<0.5?3:2),{fs:10,a:i===0?'start':i===4?'end':'middle',fill:'var(--mute)'})}
  if(o.xlab)s+=RD.t(L+pw/2,H-3,o.xlab,{fs:10.5,a:'middle',fill:'var(--mute)'});
  return RD.svg(W,H,s,o.label||'histogram');
};
(function(){
  const D=SD.clt,NS=D.n,card=document.getElementById('rd-clt-card');if(!card)return;
    let dist='tiny';
  function draw(i){
    const n=NS[i],dd=D.dists[dist],c=dd.by_n[String(n)],el=document.getElementById('rd-clt-svg');
    let curve=null;
    if(dd.sd){const se=dd.sd/Math.sqrt(n),bw=(c.hi-c.lo)/c.cnt.length;curve=[];for(let j=0;j<=120;j++){const x=c.lo+(c.hi-c.lo)*j/120;curve.push([x,D.R*bw*ST.npdf(x,dd.mean,se)])}}
    el.innerHTML=ST.hist({w:RD.width(el),h:210,lo:c.lo,hi:c.hi,cnt:c.cnt,curve:curve,vlines:[{x:dd.mean,label:'true mean '+ST.fmt(dd.mean,3)}],xlab:'sample mean of n = '+n+' draws',label:'Distribution of the sample mean'});
    document.getElementById('rd-clt-cnt').innerHTML=RD.stat('draws averaged',n,'')+RD.stat('skewness of the mean',ST.fmt(c.skew,2),'0 for a bell')+
      RD.stat('within ±1.96 SE',c.within196==null?'n/a':ST.pct(c.within196),'CLT promises 95%')+RD.stat('t-interval coverage',c.tcov==null?'n/a':ST.pct(c.tcov),'using s from the sample');
  }
  // the step list on the left changes with the population: one list per population, one item per n
  const LIST={tiny:'sx-clt-tiny',exponential:'sx-clt-exponential',lognormal:'sx-clt-lognormal',pareto15:'sx-clt-pareto15'};
  const A=RD.anim({card:'rd-clt-card',ctl:'rd-clt-ctl',n:NS.length,draw:draw,ms:4200,label:'Sample size step',list:LIST.tiny});
  RD.seg(document.getElementById('rd-clt-seg'),m=>{dist=m;Object.keys(LIST).forEach(k=>{const l=document.getElementById(LIST[k]);if(l)l.hidden=k!==m});A.reset(NS.length,LIST[m])});
  RD.onResize(()=>A.redraw());
})();
