// ---- CI and test lab (data: SD.grid from sims.py) ----
(function(){
  const G=SD.grid,card=document.getElementById('lab-card');if(!card)return;
  const M={z:['z','var(--c4)'],t:['t','var(--c1)'],pct:['percentile','var(--c2)'],bca:['BCa','var(--c3)']};
  const DESC={normal:'Normal: bell-shaped, the case the t-interval is exact for.',tiny:"The tiny model's loss: three values (0.408, 1.408, 2.408 with probabilities 0.665, 0.245, 0.090); mean 0.832, sd 0.651, skewness 1.26.",
    exponential:'Exponential: skewness 2, a light right tail.',lognormal:'Lognormal (log is standard normal): skewness 6.2, a long right tail; mean 1.649, sd 2.161.',t3:"Student's t with 3 degrees of freedom: symmetric, heavy tails (finite variance 3, infinite fourth moment).",pareto25:'Pareto with tail index 2.5: a heavy right tail; mean 1.667, sd 1.491, infinite skewness.'};
  let dist='normal',n='30';
  const meths=()=>[...document.querySelectorAll('#lab-meth input')].filter(c=>c.checked).map(c=>c.value);
  function chart(el,xs,series,o){
    const W=RD.width(el),H=200,L=40,R=12,T=10,B=30,pw=W-L-R,ph=H-T-B;
    const X=o.X(L,pw),Y=v=>T+(o.y1-Math.max(o.y0,Math.min(o.y1,v)))/(o.y1-o.y0)*ph;
    let s='';o.yt.forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--line)"/>'+RD.t(L-4,Y(v)+3,o.yf(v),{fs:9.5,a:'end',fill:'var(--mute)'})});
    if(o.ref!=null)s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(o.ref)+'" y2="'+Y(o.ref)+'" style="stroke:var(--ink);stroke-dasharray:4 3"/>';
    if(o.mark!=null)s+='<line x1="'+X(o.mark)+'" x2="'+X(o.mark)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--mute);stroke-dasharray:3 3"/>';
    series.forEach(([vals,c])=>{s+='<path d="'+vals.map((v,i)=>(i?'L':'M')+X(xs[i]).toFixed(1)+' '+Y(v).toFixed(1)).join('')+'" style="fill:none;stroke:'+c+';stroke-width:2"/>';vals.forEach((v,i)=>{s+='<circle cx="'+X(xs[i]).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="2.2" style="fill:'+c+'"/>'})});
    o.xt.forEach(v=>{s+=RD.t(X(v),T+ph+13,String(v),{fs:10,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(L+pw/2,H-3,o.xlab,{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,o.label)+'<div class="leg">'+meths().map(m=>'<span style="--sw:'+M[m][1]+'">'+M[m][0]+'</span>').join('')+(o.ref!=null?'<span style="--sw:var(--ink)">'+o.refl+'</span>':'')+'</div>';
  }
  function draw(){
    const d=G.dists[dist],ms=meths(),ns=G.n;
    document.getElementById('lab-desc').textContent=DESC[dist];
    chart(document.getElementById('lab-cov'),ns,ms.map(m=>[ns.map(k=>d.by_n[String(k)][m].cov),M[m][1]]),
      {X:(L,pw)=>v=>L+Math.log(v/5)/Math.log(40)*pw,y0:0.6,y1:1,yt:[0.6,0.7,0.8,0.9,1],yf:v=>Math.round(v*100)+'%',ref:0.95,refl:'95% target',mark:+n,xt:ns,xlab:'sample size n (log scale)',label:'Coverage against sample size'});
    const c=d.by_n[n],hs=G.h;
    chart(document.getElementById('lab-pow'),hs,ms.map(m=>[c[m].oc.map(v=>1-v),M[m][1]]),
      {X:(L,pw)=>v=>L+(v+1)/2*pw,y0:0,y1:1,yt:[0,0.25,0.5,0.75,1],yf:v=>Math.round(v*100)+'%',ref:0.05,refl:'5% at h = 0',xt:[-1,-0.5,0,0.5,1],xlab:'shift h of the tested value, in standard deviations (n = '+n+')',label:'Power curve'});
    const i5=hs.indexOf(0.5),im5=hs.indexOf(-0.5);
    document.getElementById('lab-tab').innerHTML='<tr><th>Method</th><th class="num">Coverage</th><th class="num">Missed below</th><th class="num">Missed above</th><th class="num">Mean width / sd</th><th class="num">Power, h = -0.5</th><th class="num">Power, h = +0.5</th></tr>'+
      ['z','t','pct','bca'].map(m=>{const r=c[m];return '<tr><td>'+M[m][0]+'</td><td class="num"><b>'+ST.pct(r.cov)+'</b></td><td class="num">'+ST.pct(r.miss_lo)+'</td><td class="num">'+ST.pct(r.miss_hi)+'</td><td class="num">'+r.width.toFixed(3)+'</td><td class="num">'+ST.pct(1-r.oc[im5])+'</td><td class="num">'+ST.pct(1-r.oc[i5])+'</td></tr>'}).join('');
    document.getElementById('lab-repro').textContent='Checks: on the normal population the t-interval should cover exactly 95% (simulated: '+ST.pct(G.dists.normal.by_n[n].t.cov)+' at n = '+n+'), and the two-sided z-test power at h = 0.5 with n = 30 is 78.2% in theory with known sd (t-interval here: '+ST.pct(1-G.dists.normal.by_n['30'].t.oc[i5])+', slightly lower because sd is estimated).';
  }
  RD.seg(document.getElementById('lab-dist'),m=>{dist=m;draw()});
  RD.seg(document.getElementById('lab-n'),m=>{n=m;draw()});
  document.getElementById('lab-meth').addEventListener('change',draw);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(draw);
  addEventListener('resize',()=>{if(!document.getElementById('t-lab').hidden)draw()});
})();
