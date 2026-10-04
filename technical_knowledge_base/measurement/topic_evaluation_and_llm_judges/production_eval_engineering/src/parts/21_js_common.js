// Shared helpers: decoding the released MT-Bench grades, paired statistics, formatting. Checked by ../recompute.py.
(function(){
const D=window.PE;if(!D)return;
const C=window.PEC={};
C.CATS=['writing','roleplay','reasoning','math','coding','extraction','stem','humanities'];
C.CATN={writing:'Writing',roleplay:'Roleplay',reasoning:'Reasoning',math:'Math',coding:'Coding',extraction:'Extraction',stem:'STEM',humanities:'Humanities'};
// category of each of the 160 graded turns, in D.order
const qcat={};D.items.forEach(it=>{qcat[it.q]=it.c});
C.catOf=D.order.map(k=>qcat[k[0]]);
// one character per graded turn: 'a' = 1 ... 's' = 10 (half points on odd letters), '.' = judgment failed to parse
C.decode=s=>[...s].map(ch=>ch==='.'?null:(ch.charCodeAt(0)-97+2)/2);
C.models=D.models.map(m=>({name:m[0],s:C.decode(m[1])}));
C.byName={};C.models.forEach(m=>{C.byName[m.name]=m});
C.mean=a=>{const v=a.filter(x=>x!==null);return v.reduce((s,x)=>s+x,0)/v.length};
// two-sided Student t quantile by Cornish-Fisher expansion of the normal quantile (error under 0.002 for df >= 9)
C.zq=function(p){// Acklam's inverse normal
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
  b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],
  c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
  d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
  const pl=.02425;let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)};
C.tq=function(conf,df){const z=C.zq(1-(1-conf)/2),z3=z*z*z,z5=z3*z*z,z7=z5*z*z;
  return z+(z3+z)/(4*df)+(5*z5+16*z3+3*z)/(96*df*df)+(3*z7+19*z5+17*z3-15*z)/(384*df*df*df)};
// paired comparison of challenger against champion on the turns both have a grade for
C.paired=function(A,B,mask,conf){
  const d=[];for(let i=0;i<A.length;i++){if(mask&&!mask(i))continue;if(A[i]===null||B[i]===null)continue;d.push(B[i]-A[i])}
  const n=d.length,m=d.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(d.reduce((s,x)=>s+(x-m)*(x-m),0)/(n-1)),se=sd/Math.sqrt(n),t=C.tq(conf||.95,n-1);
  return{n,mean:m,sd,se,lo:m-t*se,hi:m+t*se,worse:d.filter(x=>x<0).length,better:d.filter(x=>x>0).length,same:d.filter(x=>x===0).length}};
// the gate: aggregate rule, then per-slice rule; tol values are in points of the 1 to 10 grade
C.gate=function(A,B,o){
  const agg=C.paired(A,B,null,o.conf);
  const aggFail=o.aggSig?(agg.mean<=-o.aggTol&&agg.hi<0):(agg.mean<=-o.aggTol);
  const slices=C.CATS.map(c=>{const r=C.paired(A,B,i=>C.catOf[i]===c,o.conf);r.cat=c;
    r.v=r.mean<=-o.sliceTol?(r.hi<0?'fail':(o.escalate?'escalate':'pass')):'pass';return r});
  return{agg,aggV:aggFail?'fail':'pass',slices}};
C.f=(x,k)=>(x>=0?'+':'−')+Math.abs(x).toFixed(k===undefined?2:k);
C.n=(x,k)=>(x<0?'−':'')+Math.abs(x).toFixed(k===undefined?2:k);
C.esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
// prices (US$ per million tokens), 2023: Anthropic July 2023 price sheet (Claude 1 at the Claude 2 price), OpenAI pricing page May 2023 (GPT-4 8K)
C.PRICE={'claude-v1':[11.02,32.68],'claude-instant-v1':[1.63,5.51],'gpt-4':[30,60]};
})();
