// ---- Sampling maths shared by the Reading widgets and the Sampling lab ----
const TM=(function(){
  const F=[1];for(let i=1;i<=400;i++)F[i]=F[i-1]*i;
  const lnF=[0];for(let i=1;i<=4000;i++)lnF[i]=lnF[i-1]+Math.log(i);
  const comb=(n,k)=>k<0||k>n?0:Math.exp(lnF[n]-lnF[k]-lnF[n-k]);
  const passk=(p,k)=>1-Math.pow(1-p,k);
  // unbiased estimator of Chen et al. (2021): 1 - C(n-c,k)/C(n,k)
  const chen=(n,c,k)=>n-c<k?1:1-Math.exp(lnF[n-c]-lnF[k]-lnF[n-c-k]-(lnF[n]-lnF[k]-lnF[n-k]));
  // plurality vote: correct answer with probability p, m wrong answers each (1-p)/m, ties broken uniformly. Exact.
  const memo=new Map();
  function plurality(p,n,m){const key=p.toFixed(4)+'|'+n+'|'+m;if(memo.has(key))return memo.get(key);let tot=0;
    for(let c=1;c<=n;c++){const pc=comb(n,c)*Math.pow(p,c)*Math.pow(1-p,n-c);if(pc<1e-13)continue;const r=n-c;
      // f[s][t] = sum over fillings of the first j wrong answers with s samples (each at most c), t of them exactly c, of prod 1/k!
      let f=[];for(let s=0;s<=r;s++){f[s]=new Float64Array(m+1)}f[0][0]=1;
      for(let j=0;j<m;j++){const g=[];for(let s=0;s<=r;s++)g[s]=new Float64Array(m+1);
        for(let s=0;s<=r;s++)for(let t=0;t<=j;t++){const v=f[s][t];if(!v)continue;for(let k=0;k<=Math.min(c,r-s);k++)g[s+k][t+(k===c?1:0)]+=v/F[k]}f=g}
      let s2=0;for(let t=0;t<=m;t++)s2+=f[r][t]*F[r]/Math.pow(m,r)/(1+t);tot+=pc*s2}
    memo.set(key,tot);return tot}
  const klBon=n=>Math.log(n)-(n-1)/n;
  const rBon=(n,a,b)=>{const d=Math.sqrt(klBon(n));return d*(a-b*d)};
  return {comb,passk,chen,plurality,klBon,rBon};
})();

// Minimal SVG line chart. o: {W,H,x:[min,max],y:[min,max],logx,series:[{name,pts:[[x,y]],c,dash,dots}],xt:[[v,l]],yt:[[v,l]],xl,yl,marks:[{x,l}],pts:[{x,y,c,l}]}
function lineChart(o){const W=o.W||640,H=o.H||260,pl=o.pl||44,pr=o.pr||12,pt=o.pt||14,pb=o.pb||38,lg=Math.log10;
  const sx=o.logx?(v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0]))):(v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0]));
  const sy=v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));
  let s='';(o.yt||[]).forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(sy(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
  (o.xt||[]).forEach(([v,l])=>{s+='<line x1="'+sx(v)+'" x2="'+sx(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+sx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
  s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(H-pb)+'" y2="'+(H-pb)+'" stroke="var(--mute)"/>';
  if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
  if(o.yl)s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  (o.marks||[]).forEach(m=>{const x=sx(m.x);s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(x+4)+'" y="'+(pt+10)+'" font-size="10.5" fill="var(--mute)">'+m.l+'</text>'});
  o.series.forEach(se=>{const d=se.pts.filter(p=>isFinite(p[1])).map((p,i)=>(i?'L':'M')+sx(p[0]).toFixed(1)+' '+sy(Math.max(o.y[0],Math.min(o.y[1],p[1]))).toFixed(1)).join('');
    s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="2"'+(se.dash?' stroke-dasharray="5 4"':'')+'><title>'+se.name+'</title></path>';
    if(se.dots)se.pts.forEach(p=>{s+='<circle cx="'+sx(p[0])+'" cy="'+sy(p[1])+'" r="2.6" fill="'+se.c+'"/>'})});
  (o.pts||[]).forEach(p=>{s+='<circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="4" fill="var(--bg)" stroke="'+p.c+'" stroke-width="2"><title>'+(p.l||'')+'</title></circle>'});
  return svgEl(W,H,s,o.label||'chart')}
const legend=ser=>'<div class="leg">'+ser.map(s=>'<span><i style="background:'+s.c+(s.dash?';background:repeating-linear-gradient(90deg,'+s.c+' 0 5px,transparent 5px 8px)':'')+'"></i>'+s.name+'</span>').join('')+'</div>';
const n3=(v,d)=>(+v).toFixed(d==null?3:d);
const pc1=v=>(100*v).toFixed(1)+'%';
