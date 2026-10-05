// ---- Summation lab tab ----
(function(){
  const $=id=>document.getElementById(id),S=FP.show;
  const COL={naive:'var(--bad)',pairwise:'var(--c1)',kahan:'var(--c3)',acc32:'var(--c4)'},LAB={naive:'naive',pairwise:'pairwise',kahan:'Kahan',acc32:'fp32 accumulator'};
  function data(kind,n,seed,f){const r=FP.rng(seed),xs=new Array(n);
    for(let i=0;i<n;i++){let v;
      if(kind==='u')v=r();else if(kind==='m')v=2*r()-1;else if(kind==='b')v=i===0?10000:0.1*r();else if(kind==='h')v=1/(i+1);
      else{const u1=Math.max(r(),1e-300),u2=r();v=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)}
      xs[i]=FP.rnd(v,f)}return xs}
  // the four algorithms, every operation rounded to f
  const R=(x,f)=>f.id==='fp32'?Math.fround(x):FP.rnd(x,f);
  function naive(xs,f){let s=0;for(const x of xs)s=R(s+x,f);return s}
  function pairwise(xs,f){let a=xs.slice();while(a.length>1){const b=[];for(let i=0;i+1<a.length;i+=2)b.push(R(a[i]+a[i+1],f));if(a.length%2)b.push(a[a.length-1]);a=b}return a.length?a[0]:0}
  function kahan(xs,f){let s=0,c=0;for(const x of xs){const y=R(x-c,f),t=R(s+y,f);c=R(R(t-s,f)-y,f);s=t}return s}
  function acc32(xs){let s=0;for(const x of xs)s=Math.fround(s+x);return s}
  const M={naive,pairwise,kahan,acc32};
  const rel=(v,ex)=>!isFinite(v)?Infinity:(ex===0?Math.abs(v):Math.abs(v-ex)/Math.abs(ex));
  function run(kind,n,seed,fid){const f=FP.F[fid],xs=data(kind,n,seed,f),ex=FP.fsum(xs),o={exact:ex,best:FP.rnd(ex,f),sumabs:FP.fsum(xs.map(Math.abs))};
    for(const k in M){if(k==='acc32'&&fid==='fp32')continue;o[k]=M[k](xs,f)}return o}
  const N=()=>Math.round(10**+$('sl-n').value);
  function draw(){
    const fid=$('sl-fmt').value,kind=$('sl-data').value,n=N(),seed=Math.max(1,+$('sl-seed').value||1),f=FP.F[fid];
    $('sl-nv').textContent=n.toLocaleString('en');
    const o=run(kind,n,seed,fid);
    const pct=v=>v===Infinity?'<span class="bad">inf</span>':(v>=0.01?'<span class="bad">'+(v>=0.1?(100*v).toFixed(1):(100*v).toPrecision(3))+'%</span>':S(v,3));
    let h=RD.stat('Exact sum',S(o.exact,10),'of the stored inputs (fsum)')+RD.stat('Best possible in '+f.name,S(o.best,10),'relative error '+pct(rel(o.best,o.exact)));
    for(const k of ['naive','pairwise','kahan','acc32']){if(o[k]===undefined)continue;h+=RD.stat(LAB[k],S(o[k],10),'relative error '+pct(rel(o[k],o.exact)))}
    $('sl-res').innerHTML=h;
    // error against N on log-log axes
    const el=$('sl-fig'),W=Math.min(860,RD.width(el)),H=230,L=48,Rr=W-22,T=10,B=H-32;
    const Ns=[];for(let e=1;e<=+$('sl-n').value+1e-9;e+=0.25)Ns.push(Math.round(10**e));
    const xsAll=data(kind,n,seed,f),ks=['naive','pairwise','kahan'].concat(fid==='fp32'?[]:['acc32']),pts={};ks.forEach(k=>pts[k]=[]);pts.best=[];
    Ns.forEach(m=>{const xs=xsAll.slice(0,m),ex=FP.fsum(xs);ks.forEach(k=>pts[k].push([m,rel(M[k](xs,f),ex)]));pts.best.push([m,rel(FP.rnd(ex,f),ex)])});
    const fl=v=>Math.log10(Math.max(v,1e-12));let ymin=-12,ymax=1;
    const all=[].concat(...Object.values(pts)).map(p=>p[1]).filter(v=>isFinite(v)&&v>0);if(all.length){ymin=Math.max(-12,Math.floor(Math.min(...all.map(fl))));ymax=Math.max(0,Math.ceil(Math.max(...all.map(fl))))}
    const X=m=>L+(Rr-L)*(Math.log10(m)-1)/Math.max(0.25,Math.log10(Ns[Ns.length-1])-1||1),Y=v=>B-(B-T)*(Math.min(Math.max(fl(v),ymin),ymax)-ymin)/(ymax-ymin||1);
    let b='<line x1="'+L+'" y1="'+B+'" x2="'+Rr+'" y2="'+B+'" stroke="var(--mute)"/><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+B+'" stroke="var(--mute)"/>';
    for(let e=ymin;e<=ymax;e++)b+='<line x1="'+L+'" y1="'+Y(10**e).toFixed(1)+'" x2="'+Rr+'" y2="'+Y(10**e).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(L-4,(Y(10**e)+4).toFixed(1),'10<tspan dy="-5" font-size="8">'+e+'</tspan>',{a:'end',fs:10.5});
    [10,100,1000,10000,100000].filter(m=>m<=Ns[Ns.length-1]).forEach(m=>{b+=RD.t(X(m).toFixed(1),B+14,m.toLocaleString('en'),{a:'middle',fs:10.5})});
    b+=RD.t((L+Rr)/2,H-3,'N (log scale) against relative error (log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const line=(arr,col,dash)=>{let d='';arr.forEach((p,i)=>{const v=p[1],y=v===Infinity?T:Y(v===0?1e-12:v);d+=(i?' L':'M')+X(p[0]).toFixed(1)+','+y.toFixed(1)});b+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="4 3"':'')+'/>'};
    line(pts.best,'var(--mute)',true);ks.forEach(k=>line(pts[k],COL[k]));
    el.innerHTML=RD.svg(W,H,b,'Relative error of each summation method against N');
    $('sl-leg').innerHTML=ks.map(k=>'<span style="--sw:'+COL[k]+'">'+LAB[k]+'</span>').join('')+'<span style="--sw:var(--mute)">best possible (exact sum rounded once)</span>';
    $('sl-shufOut').innerHTML='';
  }
  function shuffle(){
    const fid=$('sl-fmt').value,kind=$('sl-data').value,n=N(),seed=Math.max(1,+$('sl-seed').value||1),f=FP.F[fid],xs=data(kind,n,seed,f),ex=FP.fsum(xs),res=[];
    for(let k=0;k<20;k++){const r=FP.rng(1000+k),a=xs.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}res.push(naive(a,f))}
    const u=[...new Set(res)].sort((a,b)=>a-b);
    $('sl-shufOut').innerHTML='Same '+n.toLocaleString('en')+' numbers in 20 random orders, naive '+f.name+' sum: <b>'+u.length+' distinct results</b>, from '+S(u[0],10)+' to '+S(u[u.length-1],10)+' (exact '+S(ex,10)+'). Pairwise and Kahan results also depend on the order, by much less. <br><code>'+u.slice(0,12).map(v=>S(v,10)).join(', ')+(u.length>12?', …':'')+'</code>';
  }
  ['sl-fmt','sl-data','sl-seed'].forEach(id=>$(id).addEventListener('change',draw));let tm=0;$('sl-n').addEventListener('input',()=>{$('sl-nv').textContent=N().toLocaleString('en');clearTimeout(tm);tm=setTimeout(draw,120)});$('sl-shuf').addEventListener('click',shuffle);
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sum']=[draw];
  window.SL={run,data};
})();
