// ---- The paper tab: the Figure 1 animation, the predict reveals, the result charts ----
const RCX=PAPER.rc,TBX=PAPER.tables;
const zs=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length,s=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);return a.map(v=>s?(v-m)/s:0)};
const sgn=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2);
const CF='var(--c2)',CC='var(--c3)',CA='var(--c1)';
// Figure 1's group: format and correctness rewards out of 100, saturations 0.98 and 0.02
const F1={f:[97,99,100,98],c:[0,1,0,5],s:[0.98,0.02]};
F1.Af=zs(F1.f);F1.Ac=zs(F1.c);
function saAdv(g,norm){const wf=Math.pow(1-F1.s[0],g),wc=Math.pow(1-F1.s[1],g),a=F1.Af.map((x,j)=>wf*x+wc*F1.Ac[j]);return norm?zs(a):a}
(function(){
  const gEl=$('advG'),nEl=$('advN');
  const ST={
    grpo:[{t:'The rewards',c:'Four answers to one question. Format is nearly solved (97 to 100 out of 100); correctness is nearly unsolved (0 to 5).'},
      {t:'Sum the rewards',c:'GRPO with several objectives first adds them with fixed weights (here equal). Answers 2 and 3 both sum to 100: their different profiles are now invisible.'},
      {t:'Standardise the sum within the group',c:'Subtract the group mean (100) and divide by the group standard deviation (2.12). Answers 2 and 3 both get exactly 0: the resolution loss of §4.'}],
    gdpo:[{t:'The rewards',c:'The same four answers.'},
      {t:'Standardise format within the group',c:'Format spreads only from 97 to 100, but standardising stretches it to unit spread: answer 3 (100) gets +1.34, answer 1 (97) gets −1.34. A nearly solved objective speaks as loudly as an unsolved one.'},
      {t:'Standardise correctness within the group',c:'Correctness 0, 1, 0, 5 becomes −0.73, −0.24, −0.73, +1.70.'},
      {t:'Add them with the fixed weights',c:'GDPO sums the standardised terms. Answers 2 and 3 now differ, but answer 3, with zero correctness, ranks above answer 2: the format term decides it.'}],
    sa:[{t:'The rewards',c:'The same four answers.'},
      {t:'Standardise each objective (as GDPO)',c:'The same per-objective terms as GDPO: format ±1.34 and ±0.45, correctness −0.73 to +1.70.'},
      {t:'Discount by saturation',c:'Each weight becomes w(1 − s)<sup>γ</sup>. Format at s = 0.98 keeps a factor of 0.02<sup>γ</sup>; correctness at s = 0.02 keeps 0.98<sup>γ</sup>. The format bars shrink.'},
      {t:'Add them',c:'Now correctness decides: answer 3 turns negative (a sign reversal, not just a smaller step) and answer 4, the most correct, gets the largest advantage.'}]};
  const finalOf=m=>{const n=nEl.checked;if(m==='grpo')return zs(F1.f.map((v,j)=>v+F1.c[j]));if(m==='gdpo'){const a=F1.Af.map((x,j)=>x+F1.Ac[j]);return n?zs(a):a}return saAdv(+gEl.value,n)};
  function state(m,k){const g=+gEl.value,wf=Math.pow(1-F1.s[0],g),wc=Math.pow(1-F1.s[1],g);
    if(m==='grpo')return {f:null,c:null,a:k>=2?finalOf(m):null,sum:k>=1};
    if(m==='gdpo')return {f:k>=1&&k<3?F1.Af:null,c:k>=2&&k<3?F1.Ac:null,a:k>=3?finalOf(m):null};
    return {f:k>=1&&k<3?F1.Af.map(v=>k>=2?v*wf:v):null,c:k>=1&&k<3?F1.Ac.map(v=>k>=2?v*wc:v):null,a:k>=3?finalOf(m):null}}
  const lerp=(a,b,e)=>a==null&&b==null?null:(a||[0,0,0,0]).map((v,i)=>v+((b||[0,0,0,0])[i]-v)*e);
  function draw(m,k,e,W){const H=W<460?300:280,top=86,base=top+(H-top-26)/2,sc=(H-top-26)/2/2.3,cw=(W-58)/4,x0=50;
    const prev=state(m,Math.max(0,k-1)),cur=state(m,k),ee=k===0?1:e;
    const f=lerp(prev.f,cur.f,ee),c=lerp(prev.c,cur.c,ee),a=lerp(prev.a,cur.a,ee);
    let s='';
    s+=tx(4,30,'format',{fs:11.5,c:CF,w:'700'})+tx(4,50,'correct',{fs:11.5,c:CC,w:'700'});
    for(let j=0;j<4;j++){const cx=x0+cw*j+cw/2;s+=tx(cx,13,'answer '+(j+1),{fs:11.5,a:'middle',c:'var(--mute)'});
      s+=tx(cx,30,F1.f[j]+'/100',{fs:12,a:'middle'})+tx(cx,50,F1.c[j]+'/100',{fs:12,a:'middle'});
      if(m==='grpo'&&cur.sum)s+=tx(cx,70,'sum '+(F1.f[j]+F1.c[j]),{fs:11.5,a:'middle',c:'var(--mute)',op:k===1?ee:1})}
    // axis
    [-2,-1,0,1,2].forEach(v=>{const y=base-v*sc;s+=ln2(x0-4,y,W-6,y,v?'var(--line)':'var(--mute)',{sw:v?1:1.2})+tx(x0-8,y+4,(v>0?'+':v<0?'−':'')+Math.abs(v),{fs:11,a:'end',c:'var(--mute)'})});
    const bar=(cx,v,w,col,op)=>{if(v==null)return '';const y=v>=0?base-v*sc:base;return rc(cx-w/2,y,w,Math.abs(v)*sc,col,{r:2,op})};
    for(let j=0;j<4;j++){const cx=x0+cw*j+cw/2,bw=Math.min(22,cw/4.2);
      if(f)s+=bar(cx-bw*0.6,f[j],bw,CF,0.9);if(c)s+=bar(cx+bw*0.6,c[j],bw,CC,0.9);
      if(a){s+=bar(cx,a[j],bw*1.8,CA,0.95);const y=a[j]>=0?base-a[j]*sc-5:base-a[j]*sc+14;s+=tx(cx,y,sgn(a[j]),{fs:12,a:'middle',w:'700'})}}
    s+=tx(W-6,H-6,'advantage, one scale for all recipes',{fs:11,a:'end',c:'var(--mute)'});
    return svgW(W,H,s,'Advantages of four answers under '+m)}
  function counters(m,k){const g=+gEl.value,fa=finalOf(m),pr={grpo:[-1.41,0,0,1.41],gdpo:[-2.07,0.20,0.61,1.25],sa:[-0.74,-0.23,-0.69,1.65]}[m];
    let h='';if(m==='sa'){const fw=v=>v<0.01&&v>0?v.toExponential(1):v.toFixed(3);h+=stat('weights now','format '+fw(Math.pow(0.02,g))+' · correctness '+fw(Math.pow(0.98,g)),'ratio (0.02/0.98)<sup>γ</sup> = '+fw(Math.pow(0.02/0.98,g)))}
    h+=stat('final advantages',fa.map(sgn).join(', '),'printed in Figure 1: '+pr.map(sgn).join(', '));
    const rk=[0,1,2,3].sort((x,y)=>fa[y]-fa[x]).map(j=>j+1);h+=stat('ranking',rk.join(' > '),fa[1]===fa[2]?'answers 2 and 3 tie':'');return h}
  const an=makeAnim({id:'adv',mode:'sa',modes:ST,draw,counters,dur:2600});
  const lab=()=>{$('advGv').textContent=(+gEl.value).toFixed(2)};lab();
  gEl.addEventListener('input',()=>{lab();an&&an.draw()});nEl.addEventListener('change',()=>an&&an.draw());
})();
// predict: the sign flip against gamma
$('flipG').textContent=RCX.fig1.flip_gamma_r3.toFixed(2);
PRED_REVEAL['pr-flip']=function(){fit($('flipSvg'),W=>{const H=220,F=linFrame({W,H,pl:44,pr:74,pt:10,pb:32,x:[0,2],y:[-2.2,2],xl:'γ',yl:'advantage (before Eq. 1)',fy:v=>v>0?'+'+v:String(v).replace('-','−')});
  let s=F.s,ends=[];const cols=['var(--mute)','var(--c4)',CF,CC];
  for(let j=0;j<4;j++){const pts=[];for(let g=0;g<=2.0001;g+=0.02)pts.push([g,saAdv(g,false)[j]]);s+=lineS(pts,F.X,F.Y,cols[j],{sw:j===2?2.6:1.6});ends.push({y:F.Y(pts[pts.length-1][1]),n:'answer '+(j+1),c:cols[j],how:''})}
  s+=ln2(F.X(0),F.Y(0),F.X(2),F.Y(0),'var(--ink)',{sw:1});const fg=RCX.fig1.flip_gamma_r3;s+=ln2(F.X(fg),F.Y(-2.2),F.X(fg),F.Y(2),'var(--mute)',{da:'4 3'})+tx(F.X(fg)+4,F.Y(1.8),'flips at γ = '+fg.toFixed(2),{fs:11});
  s+=endLabels(ends,W-70);$('flipSvg').innerHTML=svgW(W,H,s,'Advantage of each answer against gamma')})};
// predict: one failure in a group of 8
(function(){const n=$('loudN');function d(){const k=+n.value,g=[];for(let j=0;j<8;j++)g.push(j<k?1:0);const a=zs(g);$('loudV').textContent=k;
  fit($('loudSvg'),W=>{const H=150,F=linFrame({W,H,pl:40,pr:8,pt:10,pb:24,x:[0,8],y:[-3,1.2],xt:[],yt:[-3,-2,-1,0,1],fy:v=>v>0?'+'+v:String(v).replace('-','−')});let s=F.s;const bw=(W-60)/8*0.6;
    a.forEach((v,j)=>{const x=F.X(j+0.5);s+=rc(x-bw/2,v>=0?F.Y(v):F.Y(0),bw,Math.abs(F.Y(v)-F.Y(0)),j<k?CC:CF,{r:2})+tx(x,v>=0?F.Y(v)-4:F.Y(v)+13,sgn(v),{fs:11,a:'middle'})});
    $('loudSvg').innerHTML=svgW(W,H,s,'Length advantages in a group of 8')})}
  n.addEventListener('input',d);PRED_REVEAL['pr-loud']=d;
  $('loudS1').textContent=(100*RCX.share['mixed_len_at_0.2pct']).toFixed(1)+'%';$('loudS2').textContent=(100*RCX.share['share_at_0.2pct_mixedc_0.6']).toFixed(1)+'%'})();
// Table 1 differences with the evaluation-noise band
(function(){let mode='acc';const BM=TBX.bench,T1=TBX.T1.rows,pc=s=>parseFloat(s),SETS=[['7B, 3 obj',1,2],['3B, 2 obj',4,5],['3B, 3 obj',6,7]],cols=['var(--c1)','var(--c2)','var(--c4)'];
  function draw(W){const pl0=W<460?70:84,LG=legendW(SETS.map(([n],k)=>[n,cols[k],'l']).concat(mode==='acc'?[['±2 SE, eval sampling','var(--line)','l']]:[]),pl0,14,W-pl0-10),H=(W<460?270:220)+LG.h,rows=BM.length,F={pl:pl0,pr:10,pt:LG.h+18,pb:30};const lim=mode==='acc'?6:1;
    const X=v=>F.pl+(W-F.pl-F.pr)*(v+lim)/(2*lim),rh=(H-F.pt-F.pb)/rows;let s='';
    for(let v=-lim;v<=lim+1e-9;v+=mode==='acc'?2:0.5){s+=ln2(X(v),F.pt-4,X(v),H-F.pb,v?'var(--line)':'var(--mute)')+tx(X(v),H-F.pb+14,(v>0?'+':v<0?'−':'')+Math.abs(v),{fs:11,a:'middle',c:'var(--mute)'})}
    s+=tx((F.pl+W-F.pr)/2,H-3,mode==='acc'?'accuracy difference, points (SA-MRPO − GDPO)':'Exceed difference, points (lower is better)',{fs:11,a:'middle',c:'var(--mute)'});
    BM.forEach((b,i)=>{const y0=F.pt+rh*i;s+=tx(F.pl-6,y0+rh/2+4,b,{fs:11.5,a:'end'});
      if(mode==='acc'){const se=RCX.se_eval_upper[b].se_diff;s+=rc(X(-2*se),y0+2,X(2*se)-X(-2*se),rh-4,'var(--soft)',{r:2,s:'var(--line)'})}
      SETS.forEach(([n,gi,si],k)=>{const d=pc(T1[b][mode==='acc'?0:1][si])-pc(T1[b][mode==='acc'?0:1][gi]),y=y0+rh*(k+1)/4;
        s+=ln2(X(0),y,X(d),y,cols[k],{sw:4})+dotS(X(d),y,3.5,cols[k],{t:n+': '+(d>0?'+':'')+d.toFixed(1)})})});
    s+=LG.s;
    $('t1Svg').innerHTML=svgW(W,H,s,'Table 1 differences')}
  segBind('t1M',m=>{mode=m;refit($('t1Svg'))});onTab('t-read',()=>fit($('t1Svg'),draw))})();
// Table 2 paired bars, with the released model's two published scores
(function(){const BM=TBX.bench,T2=TBX.T2.rows,ref=RCX.T2.r1_distill_7b;
  onTab('t-read',()=>fit($('t2Svg'),W=>{const pl=W<460?70:84,LG=legendW([['GDPO','var(--dim)','l'],['SA-MRPO',CA,'l'],['released R1-Distill-Qwen-7B','var(--ink)','da']],pl,12,W-pl-10),H=(W<460?250:210)+LG.h,pr=40,pt=LG.h+16,pb=26,X=v=>pl+(W-pl-pr)*v/100,rh=(H-pt-pb)/BM.length;let s='';
    [0,20,40,60,80,100].forEach(v=>{s+=ln2(X(v),pt-4,X(v),H-pb,'var(--line)')+tx(X(v),H-pb+14,v+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    BM.forEach((b,i)=>{const y=pt+rh*i,g=+T2[b][2],a=+T2[b][0];s+=tx(pl-6,y+rh/2+4,b,{fs:11.5,a:'end'});
      s+=rc(X(0),y+3,X(g)-X(0),rh/2-4,'var(--dim)',{r:2})+tx(X(g)+3,y+rh/2-3,g.toFixed(1),{fs:11});
      s+=rc(X(0),y+rh/2,X(a)-X(0),rh/2-4,CA,{r:2})+tx(X(a)+3,y+rh-6,a.toFixed(1),{fs:11});
      if(ref[b]!=null){s+=ln2(X(ref[b]),y+1,X(ref[b]),y+rh-2,'var(--ink)',{sw:1.6,da:'3 2'})+tx(X(ref[b])-3,y+10,'released '+ref[b],{fs:11,a:'end',c:'var(--mute)'})}});
    s+=LG.s;
    $('t2Svg').innerHTML=svgW(W,H,s,'Table 2 accuracy')}))})();
// Table 4 averages against gamma
(function(){onTab('t-read',()=>fit($('t4Svg'),W=>{const g=[0,0.25,0.5,0.75,1],acc=RCX.T4.avg_acc.slice(1),ex=RCX.T4.avg_exceed.slice(1),two=W>=560,w=two?(W-16)/2:W,H=190;
  const one=(vals,yl,yr,fy,c,lab)=>{const F=linFrame({W:w,H,pl:46,pr:12,pt:22,pb:32,x:[-0.05,1.05],y:yr,xt:g,xl:'γ',yl,fx:v=>String(v),fy});let s=F.s+lineS(g.map((x,i)=>[x,vals[i]]),F.X,F.Y,c,{sw:2});
    g.forEach((x,i)=>{s+=dotS(F.X(x),F.Y(vals[i]),3.5,c,{t:'γ = '+x+': '+vals[i]})+tx(F.X(x),F.Y(vals[i])-7,vals[i].toFixed(2),{fs:11,a:'middle'})});s+=tx(46,13,lab,{fs:11.5,w:'700'});return svgW(w,H,s,lab)};
  $('t4Svg').innerHTML='<div style="display:flex;flex-wrap:wrap;gap:16px">'+one(acc,'accuracy, %',[26,28.5],v=>v.toFixed(1),CA,'Average accuracy (5 benchmarks)')+one(ex,'Exceed, %',[0,0.6],v=>v.toFixed(1),CF,'Average Exceed')+'</div>'}))})();
// predict: the length objective was saturated from the start
PRED_REVEAL['pr-start']=function(){fit($('startSvg'),W=>{const ps=[0.0005,0.001,0.002,0.005,0.01,0.02,0.05],H=170,pl=56,pr=10,pt=10,pb=30,bw=(W-pl-pr)/ps.length,Y=v=>pt+(H-pt-pb)*(1-v/40);let s='';
  [0,10,20,30,40].forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
  ps.forEach((p,i)=>{const v=100*(1-Math.pow(1-p,8)-Math.pow(p,8)),x=pl+bw*i+bw*0.2;s+=rc(x,Y(v),bw*0.6,Y(0)-Y(v),p<=0.001?CF:'var(--dim)',{r:2})+tx(x+bw*0.3,Y(v)-4,v.toFixed(1)+'%',{fs:11,a:'middle'})+tx(x+bw*0.3,H-pb+14,(100*p)+'%',{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+W-pr)/2,H-3,'failure rate per answer (orange: Table 1 GDPO 3B Exceed range)',{fs:11,a:'middle',c:'var(--mute)'});
  $('startSvg').innerHTML=svgW(W,H,s,'Share of groups where a binary objective varies')})};
