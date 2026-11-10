// ---- Scene (which axes, Fig. 5): one activation tensor N x C x (H x W) as a block of cubes, each norm lighting the set that shares one mean and variance (renderer v2) ----
// Drawn from the page's own tensor and maths: NI.makeImage(3) (4 examples x 6 channels x 2 x 2 positions, seeded, illustrative) and NI.normalise
// (checked against torch.nn by checks/norms_ref.py). A cube's colour is its value (orange positive, blue negative, deeper further from 0);
// during a norm's step the lit set's numbers stream into its mean and spread, then every cube turns to that norm's output.
// The step list's numbers are static spans (data-ax) written from the same computation; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ax')||!window.S3||!window.NI||!NI.normalise)return;const {at,off,lerp,mix}=S3;
  const {N,C,H,W}=NI.IMG,HW=H*W,x0=NI.makeImage(3),x3=new Float64Array(x0);for(let i=0;i<C*HW;i++)x3[i]*=3;
  // per step: the norm, the set lit (a predicate on n, c), its name
  const ST=[null,['bn',(n,c)=>c===0,'one channel · the whole batch'],['ln',(n,c)=>n===0,'one example · every channel'],
    ['in',(n,c)=>n===0&&c===0,'one channel of one example'],['gn',(n,c)=>n===0&&c<2,'one example · a group of 2 channels'],['rms',(n,c)=>n===0,'one example · as LayerNorm, no mean'],['bn',(n,c)=>n===0,'example 1 multiplied by 3']];
  const R0={},R3={};['bn','ln','in','gn','rms'].forEach(k=>{R0[k]=NI.normalise(x0,'img',k,3);R3[k]=NI.normalise(x3,'img',k,3)});
  const changed=k=>{let c=0;for(let i=C*HW;i<x0.length;i++)if(Math.abs(R3[k].y[i]-R0[k].y[i])>1e-9)c++;return c};
  const idx=(n,c,k)=>(n*C+c)*HW+k;
  // static numbers: data-ax="bn.sets", "bn.size", "bn.mu", "bn.sd", "bn.chg" ...
  const sel0={bn:idx(0,0,0),ln:idx(0,0,0),in:idx(0,0,0),gn:idx(0,0,0),rms:idx(0,0,0)};
  const FMT={sets:k=>String(R0[k].ng),size:k=>String(R0[k].cnt[R0[k].gid[sel0[k]]]),mu:k=>R0[k].mu[R0[k].gid[sel0[k]]].toFixed(2),
    sd:k=>Math.sqrt(R0[k].v[R0[k].gid[sel0[k]]]).toFixed(2),chg:k=>String(changed(k))};
  document.querySelectorAll('[data-ax]').forEach(e=>{const [k,f]=e.dataset.ax.split('.');if(R0[k]&&FMT[f])e.textContent=FMT[f](k)});
  const PX=.66,PZ=.6,PY=.56,CS=.48;
  const pos=(n,c,k)=>[(n-(N-1)/2)*PX,.06+k*PY,((C-1)/2-c)*PZ];
  let MX=0;for(const v of x0)MX=Math.max(MX,Math.abs(v));
  const colOf=(P,v,m)=>{const a=Math.min(1,Math.sqrt(Math.abs(v)/m));return mix(P.paper,v>=0?P.c2:P.c1,.08+.8*a)};
  function draw(R,k,e){const P=R.P;R.grid(-2.4,2.4,-2.6,2.6,.5);
    const s=ST[k],kind=s&&s[0],lit=s?s[1]:null,chg=k===6;
    // inputs until the set's numbers have streamed into its statistics, then the norm's outputs
    const outT=k===0?0:chg?1:Math.min(1,Math.max(0,(e-.55)/.3));
    const X=chg?x3:x0,Rn=chg?R3.bn:kind?R0[kind]:null;
    for(let n=0;n<N;n++)for(let c=0;c<C;c++)for(let q=0;q<HW;q++){const i=idx(n,c,q),inSet=!lit||lit(n,c),p=pos(n,c,q);
      const vi=X[i]/MX*2.2,vo=Rn?Rn.y[i]:0,v=lerp(vi,vo,outT),moved=chg&&n>0&&Math.abs(R3.bn.y[i]-R0.bn.y[i])>1e-9;
      R.box(p,[CS,CS,CS],{fill:colOf(P,v,2.2),a:inSet||chg?1:k===0?1:.16,shadow:false,lw:moved?1.6:.7,ec:moved?P.ink:null,ea:moved?1:null})}
    // the axes of the tensor
    const fr=[(-(N-1)/2)*PX-CS/2,0,((C-1)/2)*PZ+CS/2+.15];
    const nar=R.W<520;R.label([0,0,fr[2]+.2],nar?'N':'N · 4 examples',{mono:true,fs:12,c:P.mute,dy:14});
    R.label([(N-1)/2*PX+CS/2+.15,0,0],nar?'C':'C · 6 channels',{mono:true,fs:12,c:P.mute,al:'left',dx:8,dy:10});
    R.label([fr[0]-.1,.06+1.5*PY+CS/2,fr[2]-.15],nar?'H×W':'H × W · 4 positions',{mono:true,fs:12,c:P.mute,al:'right',dx:-8});
    if(k===0)return;
    // the lit set's numbers stream into one mean and one spread, written above it
    let cx=0,cy=0,cz=0,m=0;const cells=[];for(let n=0;n<N;n++)for(let c=0;c<C;c++)if(lit(n,c))for(let q=0;q<HW;q++){const p=pos(n,c,q);cells.push(p);cx+=p[0];cz+=p[2];cy=Math.max(cy,p[1]);m++}
    cx/=m;cz/=m;const top=[cx,cy+CS+1.05,cz],flowA=chg?0:Math.min(1,e/.2)*(1-Math.max(0,(e-.75)/.25));
    if(!chg){cells.forEach(p=>R.flowArc([p[0],p[1]+CS,p[2]],top,.25,{c:P.c4,a:flowA*.8,r:.04,n:2,speed:1.5}));
      R.glow(top,.3,{c:P.c4,a:Math.min(1,e*3)});R.ball(top,.1,{c:P.c4,a:Math.min(1,e*3)});
      const g=R0[kind].gid[sel0[kind]],st=kind==='rms'?'rms = '+Math.sqrt(R0[kind].v[g]).toFixed(2)+' · no mean':'μ = '+R0[kind].mu[g].toFixed(2)+' · σ = '+Math.sqrt(R0[kind].v[g]).toFixed(2);
      R.label(top,st,{mono:true,fs:12.5,b:1,dy:-18,c:P.c4,a:Math.min(1,e*3)});
      R.label([fr[0]-.1,.06,fr[2]-.15],s[2],{fs:13,b:1,al:'right',dx:-8,dy:-26,c:P.ink,wide:1});
      R.label([fr[0]-.1,.06,fr[2]-.15],R0[kind].cnt[g]+' numbers per set · '+R0[kind].ng+' sets',{mono:true,fs:12,al:'right',dx:-8,dy:-8,c:P.mute,wide:1})}
    else{const lp=[fr[0]-.1,.06,fr[2]-.15];
      R.label(lp,'example 1 × 3 · BatchNorm',{fs:13,b:1,al:'right',dx:-8,dy:-26,c:P.ink,wide:1});
      R.label(lp,changed('bn')+' other outputs change',{mono:true,fs:12,al:'right',dx:-8,dy:-8,c:P.ink,wide:1});
      R.label(lp,'the other four norms: '+(changed('ln')+changed('in')+changed('gn')+changed('rms')),{mono:true,fs:12,al:'right',dx:-8,dy:10,c:P.mute,wide:1})}
  }
  const full={cam:[.62,.5],bounds:[[-1.6,0,-2],[1.6,3.6,2.2]]};
  S3.stage({id:'stg-ax',list:'sx-ax',fig:'Fig. 5 · one tensor, five choices of axes',cam:full.cam,bounds:full.bounds,aspect:.78,dur:3200,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[26,16,16,200]});
})();
