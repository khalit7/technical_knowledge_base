// ---- Scaling calculator: one budget, three allocations (Kaplan, Chinchilla, over-trained), a step animation ----
(function(){
const X=window.SC;if(!X||!X.$('sc-an'))return;
const {D0,S,animMode,chinLoss,$,fmt,sci,cnt,pct,tpp,stat,svgEl,onTab,lg,supd}=X;
const FITS=D0.FITS,B=D0.ANIM_BUDGETS;
$('sc-anB').innerHTML=B.map(b=>'<option value="'+b[0]+'">'+b[2]+'</option>').join('');
const NAME={kap:'Kaplan 2020',chin:'Chinchilla 2022',over:'Over-trained'};
const COL={kap:'var(--c4)',chin:'var(--c1)',over:'var(--c3)'};
const cl=v=>v<0?0:v>1?1:v,ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function model(){const b=B.find(x=>x[0]===$('sc-anB').value)||B[0],C=b[1],f=FITS[S.fit];
  const M={kap:animMode(f,C,'kap'),chin:animMode(f,C,'chin'),over:animMode(f,C,'over')};return {C,f,M,bk:b[0]}}
const fitName=()=>S.fit==='besi'?'Besiroglu et al.\'s refit':'Hoffmann et al.\'s Approach 3';
// captions: [title, text] for mode m, step k
function caps(m,k,Q){const {C,f,M}=Q,x=M[m],c=M.chin,a=(f.be/(f.al+f.be)).toFixed(3);
  const lossTxt='L = E + A/N<sup>α</sup> + B/D<sup>β</sup> = '+f.E.toFixed(2)+' + '+x.mterm.toFixed(3)+' (model term) + '+x.dterm.toFixed(3)+' (data term) = '+x.loss.toFixed(3)+'.';
  const T0=['The budget','C = '+sci(C)+' FLOPs, fixed. Every split of it into N parameters and D = C/6N tokens lies on this curve of predicted loss, the IsoFLOP curve of '+fitName()+'. Its lowest point is the compute-optimal split.'];
  if(m==='kap')return [T0,
    ['Kaplan picks the size','Kaplan et al. (2020) found the best size growing as C<sup>0.73</sup>: at this budget '+cnt(x.N)+' parameters, '+(x.N/c.N).toFixed(1)+'× the size Chinchilla\'s fit picks. Hoffmann et al. trace much of the difference to Kaplan\'s runs sharing one learning-rate schedule length, which made small models trained for longer look worse than they are.'],
    ['Tokens follow','D = C / 6N = '+cnt(x.D)+' tokens, '+tpp(x.tpp)+' per parameter. Most of the budget went into parameters that see too little data to be used well.'],
    ['Predicted loss',lossTxt+' That is '+(x.loss-c.loss).toFixed(3)+' nats above the optimum; the data term dominates.'],
    ['Serving it','Each generated token costs 2N = '+sci(x.inf)+' FLOPs, '+(x.N/c.N).toFixed(1)+'× the Chinchilla model\'s. A compute-optimal model of the same loss would be '+cnt(x.cN)+' and need '+(x.extra+1).toFixed(1)+'× less training compute: Kaplan\'s split loses on every count.']];
  if(m==='chin')return [T0,
    ['Chinchilla picks the size','The fit\'s optimum, N = G (C/6)<sup>a</sup> with a = β/(α + β) = '+a+': '+cnt(x.N)+' parameters. (The 20-tokens-per-parameter rule would give '+cnt(Math.sqrt(C/120))+'.)'],
    ['Tokens follow','D = C / 6N = '+cnt(x.D)+' tokens, '+tpp(x.tpp)+' per parameter. Parameters and data now grow together with compute.'],
    ['Predicted loss',lossTxt+' The lowest loss this budget can buy under the fit: the split where moving compute between parameters and tokens no longer lowers the loss.'],
    ['Serving it','Each generated token costs 2N = '+sci(x.inf)+' FLOPs. This is the cheapest <i>training</i> run for its loss, by definition; it is not the cheapest model to <i>serve</i>, and nothing in the fit knows how many tokens the model will generate.']];
  return [T0,
    ['Over-trained, Llama 3 style','Llama 3.1 8B saw 1,868 tokens per parameter. At this budget that ratio means N = √(C / (6 × 1,868)) = '+cnt(x.N)+', '+(c.N/x.N).toFixed(1)+'× smaller than the optimum.'],
    ['Tokens follow','D = C / 6N = '+cnt(x.D)+' tokens: '+(x.D/c.D).toFixed(1)+'× the optimum\'s data. Whether that much good data exists is its own question.'],
    ['Predicted loss',lossTxt+' Only '+(x.loss-c.loss).toFixed(3)+' nats above the optimum, for a far smaller model.'],
    ['Serving it','Each generated token costs 2N = '+sci(x.inf)+' FLOPs, '+(c.N/x.N).toFixed(1)+'× less than the Chinchilla model. A compute-optimal model of the same loss would be '+cnt(x.cN)+', trained on '+(1/(1+x.extra)).toFixed(2)+' of this budget; the extra training ('+pct(x.extra,0)+' more) pays for itself after (C − C<sub>opt</sub>) / 2(N<sub>opt</sub> − N) = '+sci(x.breakeven)+' generated tokens.']]}
function draw(m,k,e){
  const Q=model(),{C,f,M}=Q,x=M[m],card=$('sc-an'),W=Math.max(300,card.clientWidth-28),nar=W<620;
  const Ns=[M.kap.N,M.chin.N,M.over.N],n0=Math.min(...Ns)/3,n1=Math.max(...Ns)*3;
  const Lc=N=>chinLoss(f,N,C/6/N),ylo=M.chin.loss-0.01,yhi=Math.max(M.kap.loss,M.over.loss)+0.05;
  // panel geometry
  const pw=nar?W:Math.round(W*.5),ph=nar?210:250,bx=nar?0:pw+16,by=nar?ph+14:0,bw=nar?W:W-pw-16,H=nar?ph+14+222:ph+8;
  const pl=46,pr=10,pt=14,pb=34,sx=N=>pl+(pw-pl-pr)*(lg(N)-lg(n0))/(lg(n1)-lg(n0)),sy=v=>pt+(ph-pt-pb)*(1-(Math.min(yhi,v)-ylo)/(yhi-ylo));
  let s='';
  // axes
  for(let e2=Math.ceil(lg(n0));e2<=Math.floor(lg(n1));e2++){const X0=sx(10**e2);s+='<line x1="'+X0.toFixed(1)+'" x2="'+X0.toFixed(1)+'" y1="'+pt+'" y2="'+(ph-pb)+'" stroke="var(--line)"/><text x="'+X0.toFixed(1)+'" y="'+(ph-pb+14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+cnt(10**e2,0)+'</text>'}
  const step=(yhi-ylo)>0.12?0.05:0.02;for(let v=Math.ceil(ylo/step)*step;v<=yhi+1e-9;v+=step){s+='<text x="'+(pl-5)+'" y="'+(sy(v)+4).toFixed(1)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(2)+'</text><line x1="'+pl+'" x2="'+(pw-pr)+'" y1="'+sy(v).toFixed(1)+'" y2="'+sy(v).toFixed(1)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'}
  s+='<line x1="'+pl+'" x2="'+(pw-pr)+'" y1="'+(ph-pb)+'" y2="'+(ph-pb)+'" stroke="var(--mute)"/><text x="'+((pl+pw-pr)/2)+'" y="'+(ph-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">Parameters N (D = C/6N)</text>';
  s+='<text x="11" y="'+((pt+ph-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+ph-pb)/2)+')">Predicted loss</text>';
  // the IsoFLOP curve, drawn in during step 0
  const frac=k===0?ease(e):1,np=80;let d='',pen=false;for(let i=0;i<=Math.round(np*frac);i++){const N=n0*Math.pow(n1/n0,i/np),v=Lc(N);if(v>yhi){pen=false;continue}d+=(pen?'L':'M')+sx(N).toFixed(1)+' '+sy(v).toFixed(1);pen=true}
  if(d)s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="2"/>';
  // the other allocations, faint, once the curve is drawn
  if(k>0)['kap','chin','over'].filter(q=>q!==m).forEach(q=>{const y=M[q];s+='<circle cx="'+sx(y.N).toFixed(1)+'" cy="'+sy(y.loss).toFixed(1)+'" r="4.5" fill="none" stroke="'+COL[q]+'" stroke-width="1.5" opacity=".7"><title>'+NAME[q]+'</title></circle>'+(nar?'':'<text x="'+sx(y.N).toFixed(1)+'" y="'+(sy(y.loss)-8).toFixed(1)+'" font-size="10" text-anchor="middle" fill="'+COL[q]+'" opacity=".8">'+NAME[q].split(' ')[0]+'</text>')});
  // the moving point: slides along the curve in step 1
  if(k>=1){const t=k===1?ease(e):1,N=n0*Math.pow(x.N/n0,t);s+='<circle cx="'+sx(N).toFixed(1)+'" cy="'+sy(Lc(N)).toFixed(1)+'" r="6.5" fill="'+COL[m]+'" stroke="var(--bg)" stroke-width="2"/>';
    if(k>=2)s+='<text x="'+sx(N).toFixed(1)+'" y="'+(sy(Lc(N))-11).toFixed(1)+'" font-size="11" font-weight="600" text-anchor="middle" fill="'+COL[m]+'">'+NAME[m].split(' ')[0]+'</text>'}
  // bars panel
  const lx0=bx+(nar?8:4),lab=nar?0:122,ax0=lx0+lab,ax1=bx+bw-(nar?50:54),bl=v=>ax0+(ax1-ax0)*cl((lg(v)-9)/(lg(2e14)-9));
  const rows=[['Parameters N','N',x.N,1],['Tokens D','D',x.D,2],['Loss above E','L',0,3],['Serving FLOPs/token','I',x.inf,4]];
  const rh=nar?50:56;let yy=by+(nar?18:22),dy=nar?14:0;
  s+='<text x="'+lx0+'" y="'+(by+(nar?8:10))+'" font-size="10.5" fill="var(--mute)">'+(nar?'Bars to scale; log axis from 10⁹ (losses linear)':'Bars to scale: log axis from 10⁹ to 2 × 10¹⁴; loss linear')+'</text>';
  const maxRed=Math.max(...['kap','chin','over'].map(q=>M[q].mterm+M[q].dterm))*1.08,ll=v=>ax0+(ax1-ax0)*cl(v/maxRed);
  rows.forEach(([nm,key,v,stepAt])=>{
    s+='<text x="'+lx0+'" y="'+(nar?yy+9:yy+14)+'" font-size="11.5">'+nm+'</text>';const Y=yy+dy;
    s+='<rect x="'+ax0+'" y="'+(Y+3)+'" width="'+(ax1-ax0)+'" height="15" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
    // ticks for the other allocations
    ['kap','chin','over'].filter(q=>q!==m).forEach(q=>{const y=M[q];const tv=key==='N'?bl(y.N):key==='D'?bl(y.D):key==='I'?bl(y.inf):ll(y.mterm+y.dterm);
      if(k>=stepAt)s+='<line x1="'+tv.toFixed(1)+'" x2="'+tv.toFixed(1)+'" y1="'+(Y)+'" y2="'+(Y+21)+'" stroke="'+COL[q]+'" stroke-width="2" opacity=".75"><title>'+NAME[q]+'</title></line>'});
    const g=k>stepAt?1:k===stepAt?ease(e):0;
    if(key==='L'){if(g>0){const m1=ll(x.mterm*Math.min(1,g*2)),m2=ll(x.mterm+x.dterm*cl(g*2-1));
        s+='<rect x="'+ax0+'" y="'+(Y+3)+'" width="'+(m1-ax0).toFixed(1)+'" height="15" rx="2" fill="var(--c1)"><title>model term A/N^α</title></rect>';
        if(g>.5)s+='<rect x="'+m1.toFixed(1)+'" y="'+(Y+3)+'" width="'+Math.max(0,m2-m1).toFixed(1)+'" height="15" rx="2" fill="var(--c2)"><title>data term B/D^β</title></rect>';
        s+='<text x="'+(ax1+4)+'" y="'+(Y+15)+'" font-size="11" fill="var(--ink)">'+(x.mterm+x.dterm*cl(g*2-1)).toFixed(3)+'</text>'}
      s+='<text x="'+ax0+'" y="'+(Y+30)+'" font-size="9.5" fill="var(--mute)">'+'blue: model term, orange: data term'+'</text>'}
    else if(g>0){const xe=ax0+(bl(v)-ax0)*g;s+='<rect x="'+ax0+'" y="'+(Y+3)+'" width="'+(xe-ax0).toFixed(1)+'" height="15" rx="3" fill="'+COL[m]+'"/><text x="'+(ax1+4)+'" y="'+(Y+15)+'" font-size="11">'+(g>=1?cnt(v):'')+'</text>'}
    yy+=nar?54:rh*.84});
  $('sc-anSvg').innerHTML=svgEl(W,H,s,'One compute budget allocated three ways');
  const cp=caps(m,k,Q)[k];$('sc-anStep').textContent='Step '+(k+1)+' of 5: '+cp[0];$('sc-anCap').innerHTML=cp[1];
  const show=(st,v)=>k>=st?v:'…';
  $('sc-anCnt').innerHTML=stat('Budget C',sci(C),'fixed','aC',C)+stat('Parameters N',show(1,cnt(x.N)),NAME[m],'aN',x.N)+stat('Tokens D',show(2,cnt(x.D)),show(2,tpp(x.tpp)+' per parameter'),'aD',x.D)+
    stat('Predicted loss',show(3,x.loss.toFixed(3)),show(3,(x.loss-M.chin.loss>=0.0005?'+'+(x.loss-M.chin.loss).toFixed(3)+' against the optimum':'the optimum')),'aL',x.loss)+
    stat('Serving, FLOPs per token',show(4,sci(x.inf)),'2N','aI',x.inf)+
    stat('Training compute against a same-loss optimum',show(4,x.extra<0.0005?'equal':'+'+pct(x.extra,0)),show(4,m==='over'?'pays back after '+sci(x.breakeven)+' tokens':m==='kap'?'and costlier to serve: dominated':'by definition'),'aX',x.extra);
}
// ---- step-animation engine (the Topic: llms pattern): play, pause, step, scrub, speed; runs only on screen in the visible tab ----
const card=$('sc-an'),P='sc-an',RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const st={m:'chin',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0},N=5,dur=k=>[2600,3000,2400,3200,3600][k];
function paint(){const e=RM?1:cl(st.t);try{draw(st.m,st.k,e)}catch(err){window.__jsErr&&window.__jsErr('t-scale anim: '+err.message)}
  const sc=$(P+'Scrub');sc.max=N*100;sc.value=Math.round((st.k+cl(st.t))*100);
  const pb=$(P+'Play'),end=st.k===N-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play')}
const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
  st.t+=dt*st.spd/dur(st.k);if(st.t>=1){if(st.k<N-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
  card.dataset.frames=(+card.dataset.frames||0)+1;paint();if(st.play)st.raf=requestAnimationFrame(tick)}
function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
$(P+'Play').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===N-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<N-1){st.k++;st.t=0}st.play=true;kick()}paint()});
$(P+'Fwd').addEventListener('click',()=>{pause();if(st.t<1)st.t=1;else{st.k=Math.min(N-1,st.k+1);st.t=1}paint()});
$(P+'Back').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;paint()});
$(P+'Scrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(N-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=N*100)st.t=1;paint()});
$(P+'Spd').addEventListener('change',e=>{st.spd=+e.target.value});
const seg=$(P+'M');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
  st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;paint();kick()}));
$(P+'B').addEventListener('change',()=>{paint()});
if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
document.addEventListener('visibilitychange',kick);
X.onChange(()=>{if(!$('t-scale').hidden)paint()});
onTab(()=>{paint();kick()});
X.anim={st,paint,draw};
})();
