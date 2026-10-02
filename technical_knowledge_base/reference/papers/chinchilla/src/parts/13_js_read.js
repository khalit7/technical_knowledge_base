// ---- The paper tab: tables, the schedule slider, Approach 2 on the extracted points, the same-budget animation, per-task results ----
const lg10=Math.log10;
const sciT=(v,d)=>{if(!isFinite(v))return '?';const e=Math.floor(lg10(Math.abs(v))+1e-9),m=v/10**e;return (Math.abs(m-1)<1e-9?'':(m.toFixed(d==null?1:d)+' × '))+'10'+sup(e)};
const decTicks=(a,b,step)=>{const t=[];for(let e=Math.ceil(lg10(a)-1e-9);e<=Math.floor(lg10(b)+1e-9);e+=(step||1))t.push([10**e,'10'+sup(e)]);return t};
const pathOf=(pts)=>pts.filter(p=>isFinite(p[0])&&isFinite(p[1])).map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('');
const pth=(d,c,o)=>{o=o||{};return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(o.sw||2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
const dot=(x,y,r,c,o)=>{o=o||{};return '<circle cx="'+(+x).toFixed(1)+'" cy="'+(+y).toFixed(1)+'" r="'+r+'" fill="'+(o.f||c)+'" stroke="'+c+'" stroke-width="'+(o.sw||1.5)+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+(o.t?'<title>'+o.t+'</title>':'')+'</circle>'};
const geo=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a*Math.pow(b/a,i/n));return r};
const hum=v=>(v>=1e12?(v/1e12).toFixed(v>=1e13?0:2)+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?0:v>=1e10?1:2)+'B':(v/1e6).toFixed(0)+'M').replace(/\.0+([MBT])$/,'$1').replace(/(\.\d)0([MBT])$/,'$1$2');
// the fits used across the page
const FITS={hoff:{nm:'this paper, rounded (Eq. 10)',E:1.69,A:406.4,B:410.7,alpha:0.34,beta:0.28},
  hoffU:{nm:'this paper, unrounded (TeX source)',E:Math.exp(0.5267228),A:Math.exp(6.0073404),B:Math.exp(6.0179186),alpha:0.33917084,beta:0.2849083},
  epoch:{nm:'Besiroglu et al. 2024',E:1.8172,A:482.01,B:2085.43,alpha:0.3478,beta:0.3658}};
const CG=5.76e23;
const lossOf=(f,N,D)=>f.E+f.A/Math.pow(N,f.alpha)+f.B/Math.pow(D,f.beta);
// least squares polynomial of degree 1 or 2: returns coefficients [c0, c1, (c2)]
function polyfit(x,y,deg){const n=deg+1,M=[],v=[];for(let i=0;i<n;i++){M.push(new Array(n).fill(0));v.push(0)}
  for(let k=0;k<x.length;k++){const p=[];for(let i=0;i<n;i++)p.push(Math.pow(x[k],i));for(let i=0;i<n;i++){v[i]+=p[i]*y[k];for(let j=0;j<n;j++)M[i][j]+=p[i]*p[j]}}
  for(let i=0;i<n;i++){let mx=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[mx][i]))mx=r;[M[i],M[mx]]=[M[mx],M[i]];[v[i],v[mx]]=[v[mx],v[i]];
    for(let r=i+1;r<n;r++){const f=M[r][i]/M[i][i];for(let c=i;c<n;c++)M[r][c]-=f*M[i][c];v[r]-=f*v[i]}}
  const c=new Array(n);for(let i=n-1;i>=0;i--){let s=v[i];for(let j=i+1;j<n;j++)s-=M[i][j]*c[j];c[i]=s/M[i][i]}return c}
const tbl=(id,head,rows,cls)=>{const el=$(id);if(!el)return;el.innerHTML='<thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(cls&&cls(r)?' class="'+cls(r)+'"':'')+'>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>'};
// Approach 2 on the extracted points; also used by the Tables and Then tabs
const BUDGETS=[6e18,1e19,3e19,6e19,1e20,3e20,6e20,1e21,3e21];
const OUT5=(()=>{const L=PAPER.pts.map(p=>p[2]).slice().sort((a,b)=>a-b);return L[L.length-5]})();
function approach2(drop){const iso=[];BUDGETS.forEach(C=>{const P=PAPER.pts.filter(p=>Math.abs(lg10(p[1])-lg10(C))<0.08&&!(drop&&p[2]>=OUT5));
    if(P.length<4)return;const c=polyfit(P.map(p=>lg10(p[0])),P.map(p=>p[2]),2),N=Math.pow(10,-c[1]/(2*c[2]));iso.push({C,P,c,N,D:C/6/N})});
  const l=polyfit(iso.map(q=>lg10(q.C)),iso.map(q=>lg10(q.N)),1),ld=polyfit(iso.map(q=>lg10(q.C)),iso.map(q=>lg10(q.D)),1);
  return {iso,a:l[1],k:l[0],b:ld[1],kd:ld[0],N:C=>Math.pow(10,l[0]+l[1]*lg10(C)),D:C=>Math.pow(10,ld[0]+ld[1]*lg10(C))}}
window.A2=approach2(false);

(function(){const T=PAPER.tables,F=PAPER.fit.fits;
  tbl('rdT1',['Model','Parameters','Training tokens','Tokens per parameter'],T.t1.rows.map(r=>{const n=parseFloat(r[1])*(/Trillion/.test(r[1])?1e12:1e9),d=parseFloat(r[2])*(/Trillion/.test(r[2])?1e12:1e9);return [r[0].replace(/ \(.*\)/,''),r[1].replace(' Billion','B'),r[2].replace(' Billion','B').replace(' Trillion','T'),(d/n).toFixed(1)]}),r=>/Chinchilla/.test(r[0])?'hl':'');
  tbl('rdT2',['Approach','a (N<sub>opt</sub> ∝ C<sup>a</sup>)','b (D<sub>opt</sub> ∝ C<sup>b</sup>)'],T.t2.rows.map(r=>[r[0],r[1],r[2]]));
  tbl('rdT4',T.t4.head,T.t4.rows);
  $('a3N').textContent=(FIT.frontier(FITS.hoffU,CG).N/1e9).toFixed(1)+'B';
  $('tr2').textContent=A2.a.toFixed(2);$('trM').textContent=F.mean.a_exp.toFixed(3);$('trS').textContent=F.sum.a_exp.toFixed(3);
  const a7=T.a7.rows,bc=a7.reduce((s,r)=>s+ +r[1],0)/a7.length,bg=a7.reduce((s,r)=>s+ +r[2],0)/a7.length;$('bbM').textContent=bc.toFixed(1)+' against '+bg.toFixed(1);
})();
PRED_REVEAL['pr-10x']=()=>{$('tenV').textContent=Math.sqrt(10).toFixed(2)};
PRED_REVEAL['pr-ci']=()=>{$('ciV').textContent=fmt(240*2500)};
PRED_REVEAL['pr-tpp']=()=>{$('tppV').textContent=fmt(15e12/8e9)};

// ---- Learning rate left at the end of the run, for Figure A1's cycle lengths ----
(function(){const K=[1,1.1,1.25,1.5,2,5],lr=(t,T)=>0.1+0.9*0.5*(1+Math.cos(Math.PI*Math.min(t,T)/T));
  function draw(w){const k=K[+$('lrK').value];$('lrKv').textContent=k;const H=Math.min(220,Math.max(170,w*.36)),pl=44,pr=14,pt=12,pb=34,X=v=>pl+(w-pl-pr)*v/1.0,Y=v=>pt+(H-pt-pb)*(1-v);
    let s='';[0,.25,.5,.75,1].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    [0,.25,.5,.75,1].forEach(v=>{s+=tx(X(v),H-pb+16,(v*100)+'%',{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-4,'fraction of the run\'s tokens',{fs:11,a:'middle',c:'var(--mute)'});
    const P=(T)=>pathOf(geo(1e-3,1,120).map(t=>[X(t),Y(lr(t,T))]).concat([[X(0),Y(lr(0,T))]]).sort((a,b)=>a[0]-b[0]));
    s+=pth(P(1),'var(--c1)',{sw:2})+pth(P(k),'var(--c2)',{sw:2.5,da:k===1?'5 4':null});
    const end=lr(1,k);s+=dot(X(1),Y(end),4,'var(--c2)')+dot(X(1),Y(0.1),4,'var(--c1)');
    const lg=legend([['cycle matched to the run','var(--c1)'],['cycle '+k+'× too long','var(--c2)']],pl+6,H-pb-8,w-pl-pr);s+=lg.s;
    $('lrSvg').innerHTML=svgW(w,H,s,'Learning rate against training progress');
    $('lrO').innerHTML=k===1?'Matched: the learning rate reaches 10% of its peak exactly when training ends, the schedule the paper assumes is optimal.':'At the end of training the learning rate is still <b>'+(end*100).toFixed(0)+'%</b> of its peak instead of 10%: the run stops before most of the decay, so its final loss is worse than a matched run of the same length'+(k<=1.25?' (Figure A1: overshooting by up to 25% costs little).':'. Kaplan\'s intermediate checkpoints of one 130B-token schedule are this case, which is why they overestimate the loss.')}
  $('lrK').addEventListener('input',()=>refit($('lrSvg')));
  fit($('lrSvg'),draw);
})();

// ---- Approach 2 rebuilt from the extracted points (Figure 3, left and centre) ----
(function(){const hue=i=>'hsl('+(205-i*20)+',62%,52%)';let drop=false;
  const sel=$('isoSel');BUDGETS.forEach((C,i)=>{const o=document.createElement('option');o.value=i;o.textContent=sciT(C,0);sel.appendChild(o)});sel.value=7;
  function draw(){const w=$('isoSvg').clientWidth;if(!w)return;const R=approach2(drop),hi=+sel.value,all=$('isoAll').checked;
    const H=Math.min(330,Math.max(250,w*.58)),YL=[2.15,3.3],X=[4e7,2e10];
    const F=logFrame({W:w,H,pl:44,pr:12,pt:12,pb:40,x:X,y:YL,xt:decTicks(X[0],X[1],1).map(t=>[t[0],hum(t[0])]),yt:[2.2,2.4,2.6,2.8,3.0,3.2].map(v=>[v,v.toFixed(1)]),xl:'parameters N (log)',yl:'final training loss (log)'});
    let s=F.s,over=0;
    R.iso.forEach((q,j)=>{const i=BUDGETS.indexOf(q.C),on=all||i===hi,op=on?1:.15,c=hue(i);
      const xs=q.P.map(p=>p[0]),lo=Math.min(...xs)/1.3,hi2=Math.max(...xs)*1.3;
      s+=G(op,pth(pathOf(geo(lo,hi2,40).map(n=>{const x=lg10(n);return [F.lx(n),F.ly(q.c[0]+q.c[1]*x+q.c[2]*x*x)]}).filter(p=>p[1]>=12&&p[1]<=H-40)),c,{sw:i===hi?2.6:1.6}));
      q.P.forEach(p=>{if(p[2]>YL[1]){over++;s+=G(op,'<path d="M'+(F.lx(p[0])-4).toFixed(1)+',16L'+(F.lx(p[0])+4).toFixed(1)+',16L'+F.lx(p[0]).toFixed(1)+',10z" fill="'+c+'"><title>loss '+p[2].toFixed(2)+', above the axis</title></path>');return}
        s+=G(op,dot(F.lx(p[0]),F.ly(p[2]),i===hi?3.4:2.6,c,{f:c,sw:.5,t:hum(p[0])+' parameters, loss '+p[2].toFixed(3)}))});
      const yv=q.c[0]+q.c[1]*lg10(q.N)+q.c[2]*lg10(q.N)**2;s+=G(op,'<path d="M'+(F.lx(q.N)-5)+','+(F.ly(yv)-5)+'l10,10m0,-10l-10,10" stroke="var(--ink)" stroke-width="2"/>')});
    const q=R.iso.find(x=>x.C===BUDGETS[hi]);
    $('isoSvg').innerHTML=svgW(w,H,s,'Final loss against parameters for nine compute budgets');
    // centre panel: minima against compute, the power law and its extrapolation
    const H2=Math.min(280,Math.max(220,w*.45)),CX=[3e18,1e25],NY=[1e8,3e11];
    const F2=logFrame({W:w,H:H2,pl:50,pr:12,pt:12,pb:40,x:CX,y:NY,xt:decTicks(CX[0],CX[1],w<500?2:1),yt:decTicks(NY[0],NY[1],1).map(t=>[t[0],hum(t[0])]),xl:'training FLOPs C',yl:'optimal N'});
    let s2=F2.s;s2+=pth(pathOf(geo(CX[0],CX[1],60).map(C=>[F2.lx(C),F2.ly(R.N(C))])),'var(--c1)',{sw:2,da:'6 4'});
    s2+=ln2(F2.lx(CG),F2.ly(NY[0]),F2.lx(CG),F2.ly(NY[1]),'var(--dim)',{da:'3 3'});
    R.iso.forEach(q=>{const i=BUDGETS.indexOf(q.C);s2+=dot(F2.lx(q.C),F2.ly(q.N),4,hue(i),{f:hue(i),t:sciT(q.C,0)+' FLOPs: '+hum(q.N)})});
    const ng=R.N(CG);s2+=dot(F2.lx(CG),F2.ly(70e9),5,'var(--c3)',{f:'var(--c3)'})+dot(F2.lx(CG),F2.ly(ng),6,'var(--c1)',{f:'none',sw:2})+dot(F2.lx(CG),F2.ly(280e9),5,'var(--c2)',{f:'var(--c2)'});
    const pts=placeLabels([{x:F2.lx(CG),y:F2.ly(ng),t:'fit '+hum(ng)+', Chinchilla 70B'},{x:F2.lx(CG),y:F2.ly(280e9),t:'Gopher 280B'}].map(p=>Object.assign(p,{fs:11})),w,H2);
    pts.forEach(p=>{s2+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--mute)'})});
    $('isoSvg2').innerHTML=svgW(w,H2,s2,'Optimal model size against compute');
    $('isoO').innerHTML=(q?'Highlighted: '+sciT(q.C,0)+' FLOPs, '+q.P.length+' points, valley at <b>'+hum(q.N)+'</b> on '+hum(q.D)+' tokens. ':'')+'Power law through the nine minima: <b>N<sub>opt</sub> ∝ C<sup>'+R.a.toFixed(3)+'</sup></b>, D<sub>opt</sub> ∝ C<sup>'+R.b.toFixed(3)+'</sup> (the paper: 0.49 and 0.51). Extrapolated to Gopher\'s 5.76 × 10²³ FLOPs: <b>'+hum(ng)+'</b> parameters on '+hum(R.D(CG))+' tokens, '+(R.D(CG)/ng).toFixed(0)+' per parameter; Chinchilla is 70B on 1.4T. At 10²¹ FLOPs the valley is at '+hum(R.iso.find(x=>x.C===1e21).N)+' (Approach 1 said 2.86B, §D.4).'+(over?' '+over+' points of the 10¹⁹ budget lie above the axis (triangles): large models given very few tokens.':'')+
      ' <label class="small"><input type="checkbox" id="isoDrop"'+(drop?' checked':'')+'> drop the five highest losses, as Besiroglu et al. do for Approach 3</label>';
    $('isoDrop').addEventListener('change',e=>{drop=e.target.checked;draw()})}
  sel.addEventListener('change',draw);$('isoAll').addEventListener('change',draw);
  fit($('isoSvg'),()=>draw());
})();

// ---- Same budget, two allocations: the animation ----
(function(){const C=CG,ALLOC={gop:{N:280e9,nm:'Gopher'},chin:{N:70e9,nm:'Chinchilla'}};
  const fitSel=()=>FITS[$('spxFit').value];
  const S=(m)=>{const a=ALLOC[m],o=ALLOC[m==='gop'?'chin':'gop'];return [
    {t:'One budget, a line of choices',c:'Every point on this curve spends 5.76 × 10²³ FLOPs: a model of <i>N</i> parameters trained on <i>D</i> = <i>C</i>/6<i>N</i> tokens. Bigger models see fewer tokens. The curve is the fitted loss along that line, an IsoFLOP profile like the ones above, extended to Gopher\'s scale.'},
    {t:'Pick the model size',c:a.nm+' chose <b>'+hum(a.N)+'</b> parameters.'+(m==='gop'?' Kaplan\'s rule would have gone bigger still.':' The paper\'s three approaches put the optimum between 40B and 70B.')},
    {t:'The budget fixes the tokens',c:'With <i>N</i> chosen, the budget leaves <i>D</i> = 5.76 × 10²³ / (6 × '+hum(a.N)+') tokens. Gopher was trained on 300B and Chinchilla on 1.4T (6<i>ND</i> gives 343B and 1.37T for this exact budget).'},
    {t:'The model-size term',c:'<i>A</i>/<i>N</i><sup>α</sup>: what a perfectly trained model of this size still loses. It falls as the model grows.'},
    {t:'The data term',c:'<i>B</i>/<i>D</i><sup>β</sup>: what a finite number of training tokens still loses. It falls as the data grows, so along the budget line it rises with <i>N</i>.'},
    {t:'The total, against the other choice',c:'Loss = <i>E</i> + the two terms. The valley of the curve is the compute-optimal size for this fit; the faint bar is '+o.nm+'\'s allocation of the same budget.'}]};
  const modes={gop:S('gop'),chin:S('chin')};
  function parts(f,N){const D=C/6/N;return {N,D,m:f.A/Math.pow(N,f.alpha),d:f.B/Math.pow(D,f.beta),L:lossOf(f,N,D)}}
  function draw(m,k,e,w){const f=fitSel(),a=ALLOC[m],o=ALLOC[m==='gop'?'chin':'gop'],X=[5e9,2e12];
    const curve=geo(X[0],X[1],80).map(N=>parts(f,N)),opt=FIT.frontier(f,C);
    const ys=curve.map(p=>p.L),ylo=f.E-0.01,yhi=Math.min(Math.max(...ys),f.E+0.45);
    const H1=Math.min(300,Math.max(230,w*.5));
    const F=logFrame({W:w,H:H1,pl:46,pr:14,pt:12,pb:40,x:X,y:[ylo,yhi],xt:decTicks(X[0],X[1],1).map(t=>[t[0],hum(t[0])]),yt:[1.7,1.8,1.9,2.0,2.1,2.2].filter(v=>v>ylo&&v<yhi).map(v=>[v,v.toFixed(1)]),xl:'parameters N (log); tokens D = C/6N',yl:'predicted loss'});
    let s=F.s;const cl=v=>Math.max(12,Math.min(H1-40,v));
    s+=ln2(F.lx(X[0]),F.ly(f.E),F.lx(X[1]),F.ly(f.E),'var(--mute)',{da:'2 3'})+tx(F.lx(X[1])-2,F.ly(f.E)-4,'E = '+f.E.toFixed(3),{fs:11,a:'end',c:'var(--mute)'});
    const showT=k>=3?1:0;
    s+=G(k>=3?(k===3?e:1):0.0,pth(pathOf(curve.map(p=>[F.lx(p.N),cl(F.ly(f.E+p.m))])),'var(--c4)',{sw:1.8,da:'5 3'}));
    s+=G(k>=4?(k===4?e:1):0.0,pth(pathOf(curve.map(p=>[F.lx(p.N),cl(F.ly(f.E+p.d))])),'var(--c6)',{sw:1.8,da:'5 3'}));
    s+=G(k===0?Math.max(.15,e):1,pth(pathOf(curve.map(p=>[F.lx(p.N),cl(F.ly(p.L))])),'var(--ink)',{sw:2.4}));
    if(k>=5){s+=G(e,dot(F.lx(opt.N),cl(F.ly(lossOf(f,opt.N,opt.D))),4,'var(--c3)',{f:'var(--c3)'})+tx(F.lx(opt.N),cl(F.ly(lossOf(f,opt.N,opt.D)))+16,'valley '+hum(opt.N),{fs:11,a:'middle',c:'var(--c3)'}))}
    if(k>=1){const N=k===1?Math.exp(Math.log(X[0])+(Math.log(a.N)-Math.log(X[0]))*e):a.N,p=parts(f,N),x=F.lx(N),c=m==='gop'?'var(--c2)':'var(--c1)';
      if(k>=2)s+=G(k===2?e:1,ln2(x,F.ly(yhi),x,H1-40,c,{da:'3 3'})+tx(x+(x>w*.7?-4:4),24,'D = '+hum(p.D),{fs:11,a:x>w*.7?'end':'start',c}));
      if(k>=3)s+=G(k===3?e:1,ln2(x-6,F.ly(f.E),x-6,cl(F.ly(f.E+p.m)),'var(--c4)',{sw:4}));
      if(k>=4)s+=G(k===4?e:1,ln2(x+6,F.ly(f.E),x+6,cl(F.ly(f.E+p.d)),'var(--c6)',{sw:4}));
      s+=dot(x,cl(F.ly(p.L)),6,c,{f:c})}
    
    // bars: the reducible loss, one scale for both allocations
    const pa=parts(f,a.N),po=parts(f,o.N),mx=Math.max(pa.m+pa.d,po.m+po.d)*1.08,bl=78,bw=w-bl-14,H2=96,y0=H1+8;
    const bar=(y,p,lab,op,c)=>{let r='';const sc=v=>bw*v/mx;const em=k>=3?(k===3?e:1):0,ed=k>=4?(k===4?e:1):0;
      r+=rc(bl,y,sc(p.m)*em,18,'var(--c4)',{op:op,r:2})+rc(bl+sc(p.m)*em,y,sc(p.d)*ed,18,'var(--c6)',{op:op,r:2});
      r+=tx(bl-6,y+13,lab,{fs:11,a:'end',c:'var(--mute)'});if(k>=4)r+=tx(Math.min(bl+sc(p.m+p.d)+6,w-60),y+13,(p.m+p.d).toFixed(3),{fs:11,c:'var(--ink)',op});return r};
    let b=tx(8,y0+10,'reducible loss above E (model term + data term)',{fs:11,c:'var(--mute)'});
    b+=bar(y0+18,pa,a.nm,1)+(k>=5?G(e,bar(y0+44,po,o.nm,.35)):'');const LG=legend([['total loss','var(--ink)'],['E + model term','var(--c4)','5 3'],['E + data term','var(--c6)','5 3']],8,y0+84,w-16);b+=LG.s;
    return svgW(w,H1+84+LG.h,s+b,'Loss along the Gopher compute budget, and its decomposition')}
  function counters(m,k){const f=fitSel(),a=ALLOC[m],o=ALLOC[m==='gop'?'chin':'gop'],p=parts(f,k>=1?a.N:FIT.frontier(f,C).N),q=parts(f,o.N);
    if(k===0){const op=FIT.frontier(f,C);return '<div class="cnt2">'+stat('Budget','5.76 × 10²³','FLOPs, Gopher\'s')+stat('Fit','E '+f.E.toFixed(3),'α '+f.alpha.toFixed(3)+', β '+f.beta.toFixed(3))+stat('This fit\'s optimum',hum(op.N),'on '+hum(op.D)+' tokens, '+op.tpp.toFixed(0)+' per parameter')+'</div>'}
    return '<div class="cnt2">'+stat('Parameters N',hum(a.N),a.nm)+stat('Tokens D',k>=2?hum(p.D):'…',k>=2?(p.D/p.N).toFixed(1)+' per parameter':'')+stat('Model term',k>=3?p.m.toFixed(3):'…','A/N<sup>α</sup>')+stat('Data term',k>=4?p.d.toFixed(3):'…','B/D<sup>β</sup>')+
      stat('Loss',k>=5?p.L.toFixed(3):'…',k>=5?o.nm+': '+q.L.toFixed(3)+' ('+(p.L<q.L?'':'+')+(p.L-q.L).toFixed(3)+' for '+a.nm+')':'')+'</div>'}
  window.SPX=makeAnim({id:'spx',modes,mode:'gop',draw,counters,dur:2600});
  $('spxFit').addEventListener('change',()=>{if(window.SPX){SPX.st.lk=-1;SPX.draw()}});
})();

// ---- Figures 6 and 7 rebuilt: per-task difference from Gopher ----
(function(){let m='mmlu';const sel=$('tskM');
  function draw(w){const rows=(m==='mmlu'?PAPER.tables.a6.rows:PAPER.tables.a7.rows).map(r=>({t:r[0],c:+r[1],g:+r[2],d:+r[1]-+r[2]})).sort((a,b)=>b.d-a.d);
    const H=Math.min(260,Math.max(200,w*.42)),pl=40,pr=10,pt=12,pb=26,mx=Math.max(...rows.map(r=>r.d)),mn=Math.min(...rows.map(r=>r.d)),Y=v=>pt+(H-pt-pb)*(mx-v)/(mx-mn),bw=(w-pl-pr)/rows.length;
    let s='';const step=m==='mmlu'?10:10;for(let v=Math.ceil(mn/step)*step;v<=mx;v+=step)s+=ln2(pl,Y(v),w-pr,Y(v),v===0?'var(--mute)':'var(--line)')+tx(pl-6,Y(v)+4,(v>0?'+':'')+v,{fs:11,a:'end',c:'var(--mute)'});
    rows.forEach((r,i)=>{const x=pl+i*bw,y=Math.min(Y(0),Y(r.d)),h=Math.abs(Y(r.d)-Y(0));s+='<rect class="tb" data-i="'+i+'" x="'+(x+.5).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+Math.max(1,h).toFixed(1)+'" fill="'+(r.d>0?'var(--c1)':r.d<0?'var(--c2)':'var(--mute)')+'"><title>'+r.t+': '+r.c+' against '+r.g+'</title></rect>'});
    s+=tx(pl,H-8,'tasks, sorted by the difference',{fs:11,c:'var(--mute)'})+tx(12,(pt+H-pb)/2,'points',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    $('tskSvg').innerHTML=svgW(w,H,s,'Chinchilla minus Gopher accuracy per task');
    const up=rows.filter(r=>r.d>0).length,eq=rows.filter(r=>r.d===0).length,dn=rows.filter(r=>r.d<0),mean=rows.reduce((a,r)=>a+r.d,0)/rows.length;
    const base='Chinchilla better on <b>'+up+'</b>, equal on '+eq+', worse on <b>'+dn.length+'</b> of '+rows.length+' tasks ('+dn.map(r=>r.t).join(', ')+'); mean difference +'+mean.toFixed(1)+' points. ';
    $('tskO').innerHTML=base+'<span id="tskPick" class="mute">Tap a bar for its task.</span>';
    $('tskSvg').querySelectorAll('rect.tb').forEach(b=>b.addEventListener('click',()=>{const r=rows[+b.dataset.i];$('tskPick').innerHTML='<b>'+r.t+'</b>: '+r.c+'% against Gopher\'s '+r.g+'% ('+(r.d>0?'+':'')+r.d.toFixed(1)+').'}))}
  sel.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sel.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});m=b.dataset.m;refit($('tskSvg'))}));
  fit($('tskSvg'),draw);
})();
