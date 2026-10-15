// ---- Mixing-law fitter tab (t-fit): linear and exponential mixing laws fitted in the browser on RegMix's released runs ----
(function(){
  const D=window.MX2.regmix, $=id=>document.getElementById(id), esc=RD.esc, DOM=D.domains, J=DOM.length;
  const NICE={pile_cc:'Pile-CC',github:'GitHub',arxiv:'ArXiv',wikipedia_en:'Wikipedia',stackexchange:'StackExchange',freelaw:'FreeLaw',pubmed_central:'PubMed Central',nih_exporter:'NIH ExPorter',dm_mathematics:'DM Mathematics',philpapers:'PhilPapers',enron_emails:'Enron Emails',gutenberg_pg_19:'Gutenberg',ubuntu_irc:'Ubuntu IRC',europarl:'EuroParl',hackernews:'HackerNews',pubmed_abstracts:'PubMed Abstracts',uspto_backgrounds:'USPTO'};
  const nice=d=>NICE[d]||d;
  $('mx2-fit-tgt').innerHTML=Object.keys(D.train.Y).map(t=>'<option value="'+t+'">'+nice(t)+'</option>').join('');
  [...$('mx2-fit-model').options].forEach(o=>o.textContent=o.textContent.replace(/\s+/g,' '));
  // --- linear algebra
  function solve(A,b){const n=b.length,M=A.map((r,i)=>r.concat([b[i]]));
    for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
      const v=M[c][c]||1e-12;for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/v;if(f)for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
    return M.map((r,i)=>r[n]/(r[i]||1e-12))}
  function fitLin(X,y){const n=J+1,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
    X.forEach((x,i)=>{const z=[1].concat(x);for(let p=0;p<n;p++){b[p]+=z[p]*y[i];for(let q=0;q<n;q++)A[p][q]+=z[p]*z[q]}});
    for(let p=1;p<n;p++)A[p][p]+=1e-6;const w=solve(A,b);return {w,pred:x=>w[0]+x.reduce((s,v,j)=>s+v*w[j+1],0)}}
  // exponential mixing law (Ye et al. Eq. 7 for one target): L = c + exp(b + sum t_j r_j), Levenberg-Marquardt
  function fitExp(X,y){const n=J+2,ym=Math.min(...y);let p=[ym-0.5,Math.log(y.reduce((a,v)=>a+v,0)/y.length-ym+0.5)].concat(Array(J).fill(0));
    const f=(p,x)=>p[0]+Math.exp(p[1]+x.reduce((s,v,j)=>s+v*p[j+2],0));
    const sse=p=>X.reduce((s,x,i)=>{const r=f(p,x)-y[i];return s+r*r},0);let lam=1e-3,cur=sse(p);
    for(let it=0;it<200;it++){const A=Array.from({length:n},()=>Array(n).fill(0)),g=Array(n).fill(0);
      X.forEach((x,i)=>{const e=Math.exp(p[1]+x.reduce((s,v,j)=>s+v*p[j+2],0)),r=p[0]+e-y[i],jr=[1,e].concat(x.map(v=>v*e));
        for(let a=0;a<n;a++){g[a]+=jr[a]*r;for(let b2=0;b2<n;b2++)A[a][b2]+=jr[a]*jr[b2]}});
      let ok=false;for(let tries=0;tries<10&&!ok;tries++){const M=A.map((r,a)=>r.map((v,b2)=>a===b2?v*(1+lam)+1e-9:v)),d=solve(M,g.map(v=>-v)),q=p.map((v,a)=>v+d[a]),s=sse(q);
        if(isFinite(s)&&s<cur){ok=true;const rel=(cur-s)/cur;p=q;cur=s;lam=Math.max(lam/3,1e-9);if(rel<1e-10)it=1e9}else lam*=4}
      if(!ok)break}
    return {w:p,pred:x=>f(p,x)}}
  function ranks(a){const o=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]),r=Array(a.length);for(let i=0;i<o.length;){let j=i;while(j+1<o.length&&o[j+1][0]===o[i][0])j++;for(let k=i;k<=j;k++)r[o[k][1]]=(i+j)/2;i=j+1}return r}
  function spearman(a,b){const ra=ranks(a),rb=ranks(b),n=a.length,ma=(n-1)/2;let num=0,da=0,db=0;for(let i=0;i<n;i++){num+=(ra[i]-ma)*(rb[i]-ma);da+=(ra[i]-ma)**2;db+=(rb[i]-ma)**2}return num/Math.sqrt(da*db)}
  RD.mx2fit={fitLin,fitExp,spearman};
  // Dirichlet sampling (Marsaglia-Tsang gamma), seeded
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function gamma(k,r){if(k<1){return gamma(k+1,r)*Math.pow(r()||1e-12,1/k)}const d=k-1/3,c=1/Math.sqrt(9*d);for(;;){let x,v;do{const u1=r()||1e-12,u2=r();x=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);v=1+c*x}while(v<=0);v=v*v*v;const u=r();if(u<1-0.0331*x**4||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v}}
  let SAMPLES=null;
  function samples(){if(SAMPLES)return SAMPLES;const r=mulberry32(42);SAMPLES=[];for(let s=0;s<20000;s++){const g=D.prior.map(a=>gamma(a,r)),z=g.reduce((x,y)=>x+y,0)||1;SAMPLES.push(g.map(v=>v/z))}return SAMPLES}
  let test='1B',cache={};
  function current(){const tgt=$('mx2-fit-tgt').value,mdl=$('mx2-fit-model').value,n=+$('mx2-fit-n').value;$('mx2-fit-nv').textContent=n;
    const key=tgt+'|'+mdl+'|'+n;if(!cache[key]&&mdl!=='lgb'){const X=D.train.X.slice(0,n),y=D.train.Y[tgt].slice(0,n);cache[key]=(mdl==='lin'?fitLin:fitExp)(X,y)}
    return {tgt,mdl,n,m:cache[key]}}
  function draw(){
    let {tgt,mdl,n,m}=current();
    if(mdl==='lgb'&&tgt!=='pile_cc'){$('mx2-fit-note').textContent='LightGBM predictions are precomputed for the Pile-CC target only (scripts/regmix_fit.py); showing Pile-CC.';tgt='pile_cc'}else $('mx2-fit-note').textContent='';
    const T=D.test[test],yt=T.Y[tgt],pr=mdl==='lgb'?D.lgb_pred[test]:T.X.map(x=>m.pred(x)),rho=spearman(pr,yt),mse=pr.reduce((s,p,i)=>s+(p-yt[i])**2,0)/pr.length;
    const paper=D.fit.paper_table2[mdl==='lin'?'linear':'lightgbm'];
    $('mx2-fit-out').innerHTML=RD.stat('Spearman ρ on '+test+' test runs',(100*rho).toFixed(2),tgt==='pile_cc'&&mdl!=='exp'&&n===512?'paper Table 2: '+paper[test].toFixed(2):(mdl==='exp'?'no published value: RegMix did not fit this form':'paper reports Pile-CC with 512 runs only'))+
      RD.stat('Mean squared error',mse.toFixed(4),test==='1M'?'same scale as training':'different model size: absolute losses shift')+RD.stat('Fitted on',(mdl==='lgb'?512:n)+' runs × '+J+' weights',mdl==='lin'?'18 parameters':mdl==='exp'?'19 parameters':'gradient-boosted trees');
    const W=RD.width($('mx2-fit-plot')),H=Math.min(320,Math.max(220,W*0.6)),L=46,R=10,Tp=10,B=34,same=test==='1M';
    const rng=a=>{const lo=Math.min(...a),hi=Math.max(...a),pd=(hi-lo)*0.05||0.1;return [lo-pd,hi+pd]};
    let [xl,xh]=rng(same?pr.concat(yt):pr),[yl,yh]=same?[xl,xh]:rng(yt);
    const X=v=>L+(v-xl)/(xh-xl)*(W-L-R),Y=v=>Tp+(1-(v-yl)/(yh-yl))*(H-Tp-B);let g='';
    for(let k=0;k<=4;k++){const vy=yl+k*(yh-yl)/4,vx=xl+k*(xh-xl)/4;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(vy)+'" y2="'+Y(vy)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(vy)+4,vy.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(X(vx),H-B+14,vx.toFixed(2),{a:'middle',fs:10,fill:'var(--mute)'})}
    if(same)g+='<line x1="'+X(xl)+'" y1="'+Y(xl)+'" x2="'+X(xh)+'" y2="'+Y(xh)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    pr.forEach((p,i)=>g+='<circle cx="'+X(p).toFixed(1)+'" cy="'+Y(yt[i]).toFixed(1)+'" r="3.5" fill="var(--c1)" opacity=".7"/>');
    g+=RD.t((L+W-R)/2,H-4,'predicted loss (1M-scale fit)',{a:'middle',fs:10,fill:'var(--mute)'})+RD.t(L+4,Tp+10,'true loss at '+test+' ('+nice(tgt)+')',{fs:10,fill:'var(--mute)'});
    if(!same)$('mx2-fit-note').textContent+=(($('mx2-fit-note').textContent)?' ':'')+'Axes differ: the fit predicts 1M-scale losses, the '+test+' models have lower losses; what should transfer is the order (a rising cloud), measured by ρ.';
    $('mx2-fit-plot').innerHTML=RD.svg(W,H,g,'Predicted against true validation loss');
    drawRec(tgt,mdl,m);drawCoef(tgt,mdl,m)}
  function drawRec(tgt,mdl,m){
    const sets=[];
    if(mdl!=='lgb'){const S=samples(),sc=S.map(x=>m.pred(x)),idx=sc.map((v,i)=>i).sort((a,b)=>sc[a]-sc[b]).slice(0,128),avg=Array(J).fill(0);idx.forEach(i=>S[i].forEach((v,j)=>avg[j]+=v/128));sets.push(['This fit (top 128 of 20,000)',avg,'var(--c1)'])}
    const M=D.mixtures_1b,g=k=>DOM.map(d=>M[k]['train_the_pile_'+d]||0);
    sets.push(['RegMix, trained at 1B',g('regmix'),'var(--c3)'],['DoReMi, trained at 1B',g('doremi'),'var(--c4)'],['"Human", trained at 1B',g('human'),'var(--dim)']);
    $('mx2-rec-leg').innerHTML=sets.map(s=>'<span><i style="background:'+s[2]+'"></i>'+s[0]+'</span>').join('');
    const order=DOM.map((d,j)=>j).sort((a,b)=>Math.max(...sets.map(s=>s[1][b]))-Math.max(...sets.map(s=>s[1][a]))).slice(0,10);
    const W=RD.width($('mx2-rec-plot')),nmW=Math.min(120,Math.max(86,W*0.25)),bw=W-nmW-46,bh=7,rh=sets.length*(bh+1)+8,H=order.length*rh;let gg='';
    order.forEach((j,r)=>{const y=r*rh;gg+=RD.t(nmW-6,y+rh/2+3,nice(DOM[j]),{a:'end',fs:11});sets.forEach((s,k)=>{const w=s[1][j]*bw;gg+='<rect x="'+nmW+'" y="'+(y+2+k*(bh+1))+'" width="'+w.toFixed(1)+'" height="'+bh+'" fill="'+s[2]+'"/>'+(s[1][j]>0.02?RD.t(nmW+w+3,y+8+k*(bh+1),(100*s[1][j]).toFixed(0)+'%',{fs:9,fill:'var(--mute)'}):'')})});
    $('mx2-rec-plot').innerHTML=RD.svg(W,H,gg,'Recommended mixtures');
    $('mx2-rec-note').textContent=(mdl==='lgb'?'LightGBM cannot run in the page; its recommendation is RegMix\'s own (green), which came from LightGBM on the Pile-CC target. ':'Target: '+nice(tgt)+'. ')+'Ten domains with the largest weight in any set. Table 4 at 1B on 25B tokens: RegMix 47.3, DoReMi 46.8, Pile-CC only 46.8, Human 45.1 (average of 14 tasks).'}
  function drawCoef(tgt,mdl,m){
    if(mdl==='lgb'){$('mx2-coef-plot').innerHTML='';$('mx2-coef-note').textContent='Trees have no per-domain coefficient; pick the linear or exponential model.';return}
    const co=DOM.map((d,j)=>mdl==='lin'?m.w[j+1]:m.w[j+2]),ref=mdl==='exp'?Math.max(...co):0,v=co.map(c=>c-(mdl==='exp'?ref:0));
    const order=DOM.map((d,j)=>j).sort((a,b)=>v[a]-v[b]),W=RD.width($('mx2-coef-plot')),nmW=Math.min(120,Math.max(86,W*0.25)),bw=W-nmW-50,rh=17,H=J*rh+4,mx=Math.max(...v.map(Math.abs))||1;let g='';
    order.forEach((j,r)=>{const y=r*rh+2,w=Math.abs(v[j])/mx*bw;g+=RD.t(nmW-6,y+11,nice(DOM[j]),{a:'end',fs:10.5})+'<rect x="'+nmW+'" y="'+(y+2)+'" width="'+w.toFixed(1)+'" height="11" fill="'+(DOM[j]===tgt?'var(--c2)':'var(--c1)')+'"/>'+RD.t(nmW+w+3,y+11,v[j].toFixed(2),{fs:9.5,fill:'var(--mute)'})});
    $('mx2-coef-plot').innerHTML=RD.svg(W,H,g,'Fitted effect of each training domain');
    $('mx2-coef-note').textContent=mdl==='lin'?'Linear coefficients β (loss change per unit of weight; more negative = training on it lowers the target loss more). Weights sum to 1, so only differences between coefficients are meaningful.':'Exponent coefficients t, shown relative to the largest (the domain that helps least) because the weights sum to 1; more negative = lowers the target loss more. Orange: the target domain itself. Tiny domains (Enron Emails, PhilPapers) get large coefficients from few runs that gave them weight: treat them as poorly determined.'}
  $('mx2-fit-tgt').addEventListener('change',draw);$('mx2-fit-model').addEventListener('change',draw);$('mx2-fit-n').addEventListener('change',draw);
  $('mx2-fit-n').addEventListener('input',()=>{$('mx2-fit-nv').textContent=$('mx2-fit-n').value});
  RD.seg($('mx2-fit-test'),m=>{test=m;draw()});
  let drawn=false;RD.onRender(()=>{drawn=true;draw()},'t-fit');RD.onResize(draw,'t-fit');
})();
