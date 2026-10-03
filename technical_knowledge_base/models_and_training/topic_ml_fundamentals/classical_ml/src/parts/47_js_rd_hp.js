// ---- Reading 10: grid, random and Bayesian search on a real response surface (card rd-hp) ----
// Surface: 5-fold CV accuracy of an RBF SVM on the digits data over log2 C in [-5, 15], log2 gamma in [-15, 3] (data/svm_surface.py).
(function(){
  const S=CD.surf,A=S.acc,n1=A.length,n2=A[0].length,flat=A.flat(),$=id=>document.getElementById(id);
  const PTS=[];for(let i=0;i<n1;i++)for(let j=0;j<n2;j++)PTS.push([i/(n1-1),j/(n2-1)]);
  const SC=[{B:9,idle:0,t:'2 hyperparameters, 9 trials'},{B:25,idle:0,t:'2 hyperparameters, 25 trials'},{B:27,idle:1,t:'plus 1 that does nothing, 27 trials'},{B:81,idle:2,t:'plus 2 that do nothing, 81 trials'}];
  let sc=0,mode='grid',seed=1,trials=null;
  $('rd-hpS').innerHTML=SC.map((s,i)=>'<option value="'+i+'">'+s.t+'</option>').join('');
  $('rd-hpM').innerHTML=[['grid','Grid search'],['random','Random search'],['bo','Bayesian optimisation (GP, expected improvement)']].map(([a,b])=>'<button data-m="'+a+'"'+(a===mode?' class="on"':'')+'>'+b+'</button>').join('');
  function gridIdx(k){return [...Array(k)].map((_,t)=>k>1?Math.round(t*(n1-1)/(k-1)):20)}
  function plan(){const s=SC[sc],out=[];
    if(mode==='grid'){const D=2+s.idle,k=Math.round(Math.pow(s.B,1/D)),gi=gridIdx(k),gj=[...Array(k)].map((_,t)=>Math.round(t*(n2-1)/(k-1)));
      const reps=Math.pow(k,s.idle);for(const i of gi)for(const j of gj)for(let r=0;r<reps;r++)out.push(i*n2+j)}
    else if(mode==='random'){const r=ML.rng(500+seed);for(let t=0;t<s.B;t++)out.push(Math.floor(r()*flat.length))}
    else{const r=ML.rng(seed);while(out.length<3){const c=Math.floor(r()*flat.length);if(!out.includes(c))out.push(c)}
      while(out.length<s.B){const g=ML.gpEI(PTS,out,out.map(c=>flat[c]),0.15,0.01);out.push(g.next)}}
    return out}
  function draw(i){if(!trials)trials=plan();const el=$('rd-hpV'),w=RD.width(el),h=Math.round(Math.min(360,w*0.66)),ctx=PL.cv(el,w,h),F=PL.frame([-5.25,15.25,-15.25,3.25],w,h,{l:44,r:8,t:8,b:34});
    const bg=PL.hex(PL.css('--bg')),c3=PL.hex(PL.css('--c3')),lo=0.9,hi=0.9911;
    for(let a=0;a<n1;a++)for(let b=0;b<n2;b++){const v=A[a][b],t=v<lo?0.06*v/lo:0.15+0.85*(v-lo)/(hi-lo);ctx.fillStyle='rgb('+[0,1,2].map(q=>Math.round(bg[q]+(c3[q]-bg[q])*Math.min(1,t))).join(',')+')';
      const x=F.X(S.lc[a]-0.25),y=F.Y(S.lg[b]+0.25);ctx.fillRect(x,y,F.X(S.lc[a]+0.25)-x+0.5,F.Y(S.lg[b]-0.25)-y+0.5)}
    PL.axes(ctx,F,{xt:[-5,0,5,10,15],xf:v=>'2^'+v,yt:[-15,-10,-5,0],yf:v=>'2^'+v,xl:'C (log scale)',yl:'gamma'});
    const done=trials.slice(0,i),seen={};let best=-1,bc=-1;done.forEach(c=>{seen[c]=(seen[c]||0)+1;if(flat[c]>best){best=flat[c];bc=c}});
    Object.keys(seen).forEach(c=>{const a=Math.floor(c/n2),b=c%n2,x=F.X(S.lc[a]),y=F.Y(S.lg[b]);PL.dot(ctx,x,y,4.2,PL.css('--c2'),PL.css('--ink'),1);if(seen[c]>1)PL.text(ctx,'×'+seen[c],x+6,y-5,{c:PL.css('--ink'),s:10})});
    if(i>0){const c=trials[i-1],a=Math.floor(c/n2),b=c%n2;PL.dot(ctx,F.X(S.lc[a]),F.Y(S.lg[b]),8,null,PL.css('--ink'),2)}
    if(bc>=0){const a=Math.floor(bc/n2),b=bc%n2;ctx.strokeStyle=PL.css('--c1');ctx.lineWidth=2;ctx.strokeRect(F.X(S.lc[a])-7,F.Y(S.lg[b])-7,14,14)}
    const dc=new Set(done.map(c=>Math.floor(c/n2))).size,dg=new Set(done.map(c=>c%n2)).size,dp=Object.keys(seen).length;
    const s=SC[sc];$('rd-hpT').innerHTML=i===0?'Budget: '+s.B+' trials':i<trials.length?'Trial '+i+' of '+s.B:'All '+s.B+' trials used';
    $('rd-hpP').innerHTML=mode==='grid'?(s.idle?'Each extra hyperparameter that does nothing multiplies the grid, so the same '+s.B+' trials buy only '+dp+' distinct (C, gamma) pairs, each tried '+Math.round(s.B/dp)+' times. Bergstra and Bengio\'s argument in one picture.':'The grid tries every combination of a few values of each axis: '+Math.round(Math.sqrt(s.B))+' values of C and '+Math.round(Math.sqrt(s.B))+' of gamma. Whether a row of the grid lands on the bright ridge is luck of alignment.'):
      mode==='random'?'Every random trial is a new value of C and of gamma, however many idle hyperparameters there are. Its chance of hitting the top 21% of the box (accuracy at least 98.5%) at least once is 1 &minus; 0.79<sup>n</sup>.':
      (s.idle?'Bayesian optimisation here searches only the two hyperparameters that matter (the idle ones would need a kernel with one length-scale per dimension to be learned away).':'')+'After 3 random trials, each next trial maximises expected improvement under a Gaussian process fitted to the results so far: it goes where the predicted accuracy is high or the uncertainty is large.';
    $('rd-hpN').innerHTML=RD.stat('trials',String(i))+RD.stat('best accuracy so far',best>=0?RD.pct(best,2):'&ndash;',bc>=0?'C = 2^'+S.lc[Math.floor(bc/n2)]+', gamma = 2^'+S.lg[bc%n2]:'')+RD.stat('distinct values tried','C: '+dc+', gamma: '+dg,dp+' distinct pairs')}
  function summary(){const s=SC[sc],rs=[];for(let t=0;t<500;t++){const r=ML.rng(9000+t);let b=0;for(let q=0;q<s.B;q++)b=Math.max(b,flat[Math.floor(r()*flat.length)]);rs.push(b)}rs.sort((a,b)=>a-b);
    const k=Math.round(Math.pow(s.B,1/(2+s.idle))),gi=gridIdx(k),gj=[...Array(k)].map((_,t)=>Math.round(t*(n2-1)/(k-1)));let gb=0;gi.forEach(i=>gj.forEach(j=>gb=Math.max(gb,A[i][j])));
    const bo=CD.bo[String(s.B)];
    $('rd-hpR').innerHTML='<b>Same budget, many runs:</b> grid '+RD.pct(gb,2)+' (always the same); random search median '+RD.pct(rs[250],2)+', 1 run in 10 below '+RD.pct(rs[50],2)+' (500 runs)'+(bo?'; Bayesian optimisation median '+RD.pct(bo[Math.floor(bo.length/2)],2)+', worst '+RD.pct(bo[0],2)+' (40 runs)':'')+'. Best cell on the surface: '+RD.pct(Math.max(...flat),2)+'. The cross-validation estimate itself has a standard error of about 0.2 points (&radic;(0.99 &times; 0.01 / 1,797)), so differences smaller than that are noise.'}
  const An=RD.anim({card:'rd-hp',ctl:'rd-hpC',n:SC[0].B+1,draw,ms:650,label:'Trial'});
  function restart(play){trials=null;trials=plan();An.reset(SC[sc].B+1);summary();if(play)An.play()}
  $('rd-hpM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('rd-hpM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));restart(true)});
  $('rd-hpS').addEventListener('change',e=>{sc=+e.target.value;restart(true)});
  $('rd-hpNew').addEventListener('click',()=>{seed++;restart(true)});
  restart(false);
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!document.getElementById('t-read').hidden)An.redraw()},200)});
})();
