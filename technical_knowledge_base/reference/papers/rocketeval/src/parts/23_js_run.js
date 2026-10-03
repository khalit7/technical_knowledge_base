// ---- Re-rank the leaderboard: GPT-4o's released WildBench grades, resampled and noised ----
(function(){
  const T=REL.test,NM=T.length,NQ=REL.nq,ELO=T.map(t=>t.elo);
  const Gr=T.map(t=>{const a=new Float32Array(NQ);for(let j=0;j<NQ;j++){const c=t.g[j];a[j]=c==='A'?10:+c}return a});
  const sdw=Gr.map(a=>{let m=0;for(const v of a)m+=v;m/=a.length;let s=0;for(const v of a)s+=(v-m)**2;return Math.sqrt(s/a.length)}).reduce((x,y)=>x+y,0)/NM;
  const NQS=[10,20,50,100,200,300,500,NQ];
  const PRE=[[0,0],[0.469,0],[0.414,0],[0.287,0],[0.414,0.2]];
  const sigFor=r=>sdw*Math.sqrt(1/(r*r)-1);
  let st={n:NQ,sig:0,tau:0,run:null,many:null,stat:'sp',seed:1};
  function ranks(x){const o=[...x.keys()].sort((a,b)=>x[a]-x[b]),r=new Array(x.length);let i=0;while(i<o.length){let j=i;while(j+1<o.length&&x[o[j+1]]===x[o[i]])j++;for(let k=i;k<=j;k++)r[o[k]]=(i+j)/2+1;i=j+1}return r}
  function spear(a,b){const ra=ranks(a),rb=ranks(b),n=a.length,ma=(n+1)/2;let c=0,va=0,vb=0;for(let i=0;i<n;i++){c+=(ra[i]-ma)*(rb[i]-ma);va+=(ra[i]-ma)**2;vb+=(rb[i]-ma)**2}return c/Math.sqrt(va*vb)}
  function kend(a,b){let c=0,d=0,ta=0,tb=0;const D=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const x=a[i]-a[j],y=b[i]-b[j];if(x===0)ta++;if(y===0)tb++;if(x*y>0)c++;else if(x*y<0){d++;D.push([i,j])}}const P=a.length*(a.length-1)/2;return {t:(c-d)/Math.sqrt((P-ta)*(P-tb)),d,D}}
  function gauss(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  // one run: exact (all queries in order, no noise) or a bootstrap draw with noise
  function run(exact,rnd){const n=st.n,idx=new Int32Array(n);for(let j=0;j<n;j++)idx[j]=exact?j:Math.floor(rnd()*NQ);
    const means=[],rs=[];for(let i=0;i<NM;i++){const b=st.tau?st.tau*gauss(rnd):0;let s=0,sx=0,sy=0,sxx=0,syy=0,sxy=0;
      for(let j=0;j<n;j++){const g=Gr[i][idx[j]],v=g+(st.sig?st.sig*gauss(rnd):0)+b;s+=v;sx+=v;sy+=g;sxx+=v*v;syy+=g*g;sxy+=v*g}
      means.push(s/n);const cv=sxy/n-sx*sy/n/n,vx=sxx/n-(sx/n)**2,vy=syy/n-(sy/n)**2;if(vx>0&&vy>0)rs.push(cv/Math.sqrt(vx*vy))}
    const k=kend(means,ELO);return {means,sp:spear(means,ELO),kt:k.t,d:k.d,D:k.D,r:rs.reduce((a,b)=>a+b,0)/rs.length}}
  const exactNow=()=>st.n===NQ&&st.sig===0&&st.tau===0;
  function labels(){const ni=+$('rqN').value;st.n=NQS[ni];$('rqNv').textContent=st.n===NQ?fmt(NQ)+' (all)':fmt(st.n);
    st.sig=+$('rqS').value/10;$('rqSv').textContent=fmt(st.sig,1);st.tau=+$('rqT').value*0.05;$('rqTv').textContent=fmt(st.tau,2)}
  function drawOne(){const R=st.run;
    $('rqOut').innerHTML=stat('Spearman with Arena Elo',fmt(R.sp,3),exactNow()?'Table 3 prints 0.979 for GPT-4o':'this run')+stat('Kendall',fmt(R.kt,3),exactNow()?'Table 3 prints 0.909':'this run')+stat('Discordant pairs',R.d+' of 66','crossing lines below')+stat('Single-response agreement with GPT-4o',st.sig||st.tau?fmt(R.r,2):'1.00','correlation of this judge\'s grade with GPT-4o\'s, per model, averaged');
    const el=$('rqBump');fit(el,w=>{const H=12*24+40,lw=Math.min(118,w*.3),xL=lw+6,xR=w-lw-6,y=i=>30+i*24;let s='';
      const order=R.means.map((m,i)=>i).sort((a,b)=>R.means[b]-R.means[a]),pos=new Array(NM);order.forEach((i,r)=>pos[i]=r);
      const bad=new Set();R.D.forEach(([i,j])=>{bad.add(i);bad.add(j)});
      s+=tx(xL,14,'Arena Elo order',{fs:11,a:'end',c:'var(--mute)'})+tx(xR,14,'order by mean grade',{fs:11,c:'var(--mute)'});
      for(let i=0;i<NM;i++){const c=bad.has(i)?'var(--c2)':'var(--c1)';s+=ln2(xL+4,y(i),xR-4,y(pos[i]),c,{sw:bad.has(i)?2.2:1.4,op:bad.has(i)?1:.6});
        s+=tx(xL,y(i)+4,T[i].short+' '+Math.round(T[i].elo),{fs:11,a:'end'});
        s+=tx(xR,y(pos[i])+4,T[i].short+' '+fmt(R.means[i],2),{fs:11,c:bad.has(i)?'var(--c2)':'var(--ink)'})}
      el.innerHTML=svgW(w,H,s,'bump chart of the ranking')});
    $('rqNote').innerHTML=exactNow()?'All 1,013 queries, no noise: GPT-4o\'s released grades reproduce Table 3\'s GPT-4o row independently. Its three discordant pairs are neighbours in Arena\'s order.':'One draw: '+fmt(st.n)+' queries resampled with replacement'+(st.sig?', noise σ = '+fmt(st.sig,1):'')+(st.tau?', per-model bias τ = '+fmt(st.tau,2):'')+' (seed '+st.seed+'). Within-model spread of GPT-4o\'s grades: '+fmt(sdw,2)+' points.';
    drawGrid()}
  function many(){const rnd=mulberry32(1000+st.seed);const out=[],cnt=new Float32Array(NM*NM);let rr=0;for(let b=0;b<200;b++){const R=run(false,rnd);out.push(R);R.D.forEach(([i,j])=>cnt[i*NM+j]++);rr+=R.r}
    st.many={sp:out.map(x=>x.sp),kt:out.map(x=>x.kt),cnt,r:rr/200};drawHist();drawGrid()}
  function q(a,p){const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.floor(p*s.length)))]}
  function drawHist(){const M=st.many,el=$('rqHist');if(!M){el.innerHTML='<p class="small mute">Press "Run 200 draws".</p>';$('rqHistOut').innerHTML='';return}
    const v=M[st.stat],lo=q(v,.025),hi=q(v,.975),mean=v.reduce((a,b)=>a+b,0)/v.length;
    fit(el,w=>{const H=220,pl=36,pr=10,pt=44,pb=34,xr=st.stat==='sp'?[0.5,1]:[0.2,1],bins=40,h=new Array(bins).fill(0);
      v.forEach(x=>{const i=Math.min(bins-1,Math.max(0,Math.floor((x-xr[0])/(xr[1]-xr[0])*bins)));h[i]++});const mx=Math.max(...h,1);
      const X=x=>pl+(w-pl-pr)*(Math.max(xr[0],x)-xr[0])/(xr[1]-xr[0]),Y=c=>pt+(H-pt-pb)*(1-c/mx);let s='';
      s+=rc(X(lo),pt,X(hi)-X(lo),H-pt-pb,'var(--acc2)',{r:0,op:.6});
      h.forEach((c,i)=>{if(c)s+=rc(X(xr[0]+(xr[1]-xr[0])*i/bins)+.5,Y(c),(w-pl-pr)/bins-1,Y(0)-Y(c),'var(--c1)',{r:1})});
      const tk=st.stat==='sp'?[0.5,0.6,0.7,0.8,0.9,1]:[0.2,0.4,0.6,0.8,1];tk.forEach(t=>{s+=tx(X(t),H-pb+14,fmt(t,1),{fs:11,a:'middle',c:'var(--mute)'})});
      const refs=st.stat==='sp'?[[0.979,'GPT-4o'],[0.965,'Gemma'],[0.986,'Nemo']]:[[0.909,'GPT-4o'],[0.879,'Gemma'],[0.939,'Nemo']];
      refs.forEach(([x,t],i)=>{s+=ln2(X(x),pt-6-12*i,X(x),H-pb,'var(--c2)',{da:'3 3'})+tx(X(x)-3,pt-8-12*i,t,{fs:11,a:'end',c:'var(--c2)'})});
      s+=tx((pl+w-pr)/2,H-4,(st.stat==='sp'?'Spearman':'Kendall')+' with Arena Elo, 200 draws',{fs:11,a:'middle',c:'var(--mute)'});el.innerHTML=svgW(w,H,s,'histogram')});
    $('rqHistOut').innerHTML=stat('Mean '+(st.stat==='sp'?'Spearman':'Kendall')+', 200 draws',fmt(mean,3),'')+stat('Middle 95%',fmt(lo,3)+' to '+fmt(hi,3),'bootstrap band')+stat('Single-response agreement',st.sig||st.tau?fmt(M.r,2):'1.00','with GPT-4o, as above')+stat('Settings',fmt(st.n)+' queries','σ '+fmt(st.sig,1)+', τ '+fmt(st.tau,2))}
  function drawGrid(){const el=$('rqGrid');fit(el,w=>{const cs=Math.min(26,(w-130)/12),x0=Math.min(124,w-12*cs-4),H=12*cs+10;let s='';const M=st.many,R=st.run,cur=new Set(R.D.map(([i,j])=>i*NM+j));
    for(let i=0;i<NM;i++){s+=tx(x0-4,4+i*cs+cs/2+4,T[i].short,{fs:11,a:'end'});for(let j=0;j<i;j++){const k=j*NM+i;let f;
      if(M){const p=M.cnt[k]/200;s+=rc(x0+j*cs,4+i*cs,cs-2,cs-2,'var(--soft)',{r:2})+(p>0?rc(x0+j*cs,4+i*cs,cs-2,cs-2,'var(--c2)',{r:2,op:(0.15+0.85*p).toFixed(2)}):'')+(cur.has(k)?rc(x0+j*cs,4+i*cs,cs-2,cs-2,'none',{r:2,s:'var(--ink)',sw:1.5}):'')+'<title>'+T[j].short+' / '+T[i].short+': discordant in '+Math.round(p*100)+'% of draws</title>'}
      else{s+=rc(x0+j*cs,4+i*cs,cs-2,cs-2,cur.has(k)?'var(--c2)':'var(--soft)',{r:2})}}}
    el.innerHTML=svgW(w,H,s,'pair grid')})}
  function fresh(){labels();st.seed++;const rnd=mulberry32(st.seed);st.run=run(exactNow(),rnd);drawOne()}
  ['rqN','rqS','rqT'].forEach(id=>$(id).addEventListener('input',()=>{fresh();st.many=null;drawHist()}));
  $('rqDraw').addEventListener('click',()=>{labels();st.seed++;st.run=run(false,mulberry32(st.seed));drawOne()});
  $('rqMany').addEventListener('click',()=>{many()});
  document.querySelectorAll('#rqPre button').forEach(b=>b.addEventListener('click',()=>{const [r,t]=PRE[+b.dataset.p];$('rqS').value=r?Math.round(sigFor(r)*10):0;$('rqT').value=Math.round(t/0.05);
    document.querySelectorAll('#rqPre button').forEach(x=>x.classList.toggle('on',x===b));fresh();many()}));
  seg2('rqK',m=>{st.stat=m;drawHist()});
  let started=false;onTab('t-run',()=>{if(!started){started=true;labels();st.run=run(true,mulberry32(1));drawOne();drawHist()}else{refit($('rqBump'));refit($('rqHist'));refit($('rqGrid'))}});
})();
