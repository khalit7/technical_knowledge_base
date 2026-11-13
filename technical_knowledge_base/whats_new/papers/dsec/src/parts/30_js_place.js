// ---- Place a burst: DSec's placement algorithm (§3.2, §7) and three alternatives, simulated exactly ----
// Pure core first (also run by check_place.mjs), then the tab's drawing.
const PB={B:[4096,8192,16384,32768,49152,65536],R:[500,1000,2500,5000,10000],N:[40,80,160,320],P:[0.1,0.25,0.5,1,2,3,5],
  L:[0,.1,.2,.3,.4,.5,.6,.7,.8],S:[0,.1,.2,.3,.4,.5],CAP:3200,STEPS:8,TRIES:8};
// o: {B,R,N,k,E,P,L,S,seed,mode}; mode in pko | pk | rnd | least. Returns loads at every step and totals.
function placeSim(o){
  const rnd=mulberry32(o.seed),N=o.N,CAP=PB.CAP;
  const init=new Float64Array(N),load=new Float64Array(N);
  for(let i=0;i<N;i++){init[i]=Math.round(CAP*o.L*(1+o.S*(2*rnd()-1)));load[i]=init[i]}
  const prng=mulberry32(o.seed*7919+13); // the placement draws: same stream for every policy
  let snap=Float64Array.from(load),snapT=0;
  const own=[];for(let e=0;e<o.E;e++)own.push(new Float64Array(N));
  const T=o.B/o.R,frames=[Float64Array.from(load)],stepAt=[],rejAt=[0];
  for(let s=1;s<=PB.STEPS;s++)stepAt.push(Math.round(o.B*s/PB.STEPS));
  let rej=0,fail=0,si=0,refreshes=0;const ex=new Uint8Array(N);
  const view=(e,i)=>snap[i]+(o.mode==='pko'?own[e][i]:0);
  for(let r=0;r<o.B;r++){
    const t=r/o.R;
    if(t-snapT>=o.P-1e-12){snapT=Math.floor(t/o.P)*o.P;snap=Float64Array.from(load);for(const a of own)a.fill(0);refreshes++}
    const e=r%o.E;let placed=false,tries=0;const tried=[];
    while(!placed&&tries<PB.TRIES){
      tries++;let pick=-1;
      if(o.mode==='least'){let best=1e18;for(let i=0;i<N;i++){if(ex[i])continue;const v=view(e,i);if(v<best){best=v;pick=i}}}
      else{const k=o.mode==='rnd'?1:o.k;let best=1e18;
        for(let j=0;j<k;j++){let i,g=0;do{i=Math.floor(prng()*N);g++}while(ex[i]&&g<50);if(ex[i])continue;const v=view(e,i);if(v<best){best=v;pick=i}}}
      if(pick<0)break;
      if(load[pick]+1>CAP){rej++;ex[pick]=1;tried.push(pick);continue}
      load[pick]++;if(o.mode==='pko')own[e][pick]++;placed=true}
    for(const i of tried)ex[i]=0;
    if(!placed)fail++;
    while(si<stepAt.length&&r+1>=stepAt[si]){frames.push(Float64Array.from(load));rejAt.push(rej);si++}
  }
  let mx=0,mn=1e18,sum=0,ss=0;const add=[];
  for(let i=0;i<N;i++){mx=Math.max(mx,load[i]);mn=Math.min(mn,load[i]);const a=load[i]-init[i];add.push(a);sum+=a}
  const mean=sum/N;let fm=0,fs=0;for(let i=0;i<N;i++)fm+=load[i]/N;for(let i=0;i<N;i++)fs+=(load[i]-fm)**2;
  return {init,frames,rejAt,max:mx,min:mn,addMean:mean,sd:Math.sqrt(fs/N),rej,fail,T,refreshes}
}
if(typeof module!=='undefined')module.exports={placeSim,PB};

// The tab's 3D stage, step lists, counters and table are in 32_js_sc_burst.js.
