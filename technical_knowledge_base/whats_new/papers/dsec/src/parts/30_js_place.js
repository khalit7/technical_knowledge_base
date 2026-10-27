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
  const T=o.B/o.R,frames=[Float64Array.from(load)],stepAt=[];
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
    while(si<stepAt.length&&r+1>=stepAt[si]){frames.push(Float64Array.from(load));si++}
  }
  let mx=0,mn=1e18,sum=0,ss=0;const add=[];
  for(let i=0;i<N;i++){mx=Math.max(mx,load[i]);mn=Math.min(mn,load[i]);const a=load[i]-init[i];add.push(a);sum+=a}
  const mean=sum/N;let fm=0,fs=0;for(let i=0;i<N;i++)fm+=load[i]/N;for(let i=0;i<N;i++)fs+=(load[i]-fm)**2;
  return {init,frames,max:mx,min:mn,addMean:mean,sd:Math.sqrt(fs/N),rej,fail,T,refreshes}
}
if(typeof module!=='undefined')module.exports={placeSim,PB};

(function(){if(typeof document==='undefined'||!$('pb'))return;
  const MODES={pko:'Power of k + overlay (DSec)',pk:'Power of k, no overlay',rnd:'Random',least:'Least loaded'};
  const ids=['B','R','N','K','E','P','L','S'];let seed=1;let RES={};
  const par=()=>({B:PB.B[+$('pbB').value],R:PB.R[+$('pbR').value],N:PB.N[+$('pbN').value],k:+$('pbK').value,E:+$('pbE').value,
    P:PB.P[+$('pbP').value],L:PB.L[+$('pbL').value],S:PB.S[+$('pbS').value],seed});
  function labels(o){$('pbBv').textContent=fmt(o.B);$('pbRv').textContent=fmt(o.R);$('pbNv').textContent=o.N;$('pbKv').textContent=o.k;$('pbEv').textContent=o.E;
    $('pbPv').textContent=o.P+' s';$('pbLv').textContent=Math.round(o.L*100)+'%';$('pbSv').textContent=Math.round(o.S*100)+'%';$('pbSeedV').textContent='draw '+seed}
  const col={pko:'var(--c3)',pk:'var(--c1)',rnd:'var(--c4)',least:'var(--c2)'};
  function caps(m,o,r){const steps=[];const per=o.B/PB.STEPS,dt=r.T/PB.STEPS;
    for(let s=0;s<=PB.STEPS;s++){const L=r.frames[s];let mx=0,full=0;for(let i=0;i<o.N;i++){mx=Math.max(mx,L[i]);if(L[i]>=PB.CAP)full++}
      if(s===0)steps.push({t:'before the burst',c:'Each of the '+o.N+' nodes already runs about '+fmt(PB.CAP*o.L)+' sandboxes (± '+Math.round(o.S*100)+'%). A burst of '+fmt(o.B)+' requests arrives at '+fmt(o.R)+' a second, so it lasts '+r.T.toFixed(1)+' s; the watcher refreshes the engines\' view every '+o.P+' s.'});
      else steps.push({t:'t = '+(s*dt).toFixed(2)+' s, '+fmt(Math.round(per*s))+' requests',
        c:(m==='least'?'Every engine sends its requests to the node its snapshot says is emptiest, so between refreshes they all land on the same node until its edge refuses them. ':m==='rnd'?'Each request goes to one node drawn at random: no herding, but the starting unevenness and chance fluctuations stay. ':m==='pk'?'Each request samples '+o.k+' nodes and takes the less loaded in the snapshot: requests spread out even though the view is stale. ':'As power of k, but each engine also counts its own placements since the snapshot, so it stops favouring a node it has just filled. ')+
          'Fullest node now '+fmt(mx)+' of '+fmt(PB.CAP)+(full?'; '+full+' node'+(full>1?'s':'')+' at capacity':'')+'.'})}
    return steps}
  const STEPS={pko:[{t:'',c:''}],pk:[{t:'',c:''}],rnd:[{t:'',c:''}],least:[{t:'',c:''}]};
  const A=makeAnim({id:'pb',mode:'pko',dur:1600,modes:STEPS,
    draw(m,k,e,w){const r=RES[m];if(!r)return '';const o=RES.o,N=o.N,H=Math.max(170,Math.min(260,w*.42)),pl=46,pr=8,pt=12,pb=26;
      const W=w,bw=(W-pl-pr)/N,y=v=>pt+(H-pt-pb)*(1-v/PB.CAP*0.92);const prev=r.frames[Math.max(0,k-1)],cur=r.frames[k];
      let s='';[0,800,1600,2400,3200].forEach(v=>{s+=ln2(pl,y(v),W-pr,y(v),'var(--line)')+tx(pl-5,y(v)+4,fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
      for(let i=0;i<N;i++){const a=r.init[i],L=prev[i]+(cur[i]-prev[i])*e,x=pl+i*bw;
        s+=rc(x,y(a),Math.max(.6,bw-(bw>3?1:0)),y(0)-y(a),'var(--dim)',{r:0})+rc(x,y(L),Math.max(.6,bw-(bw>3?1:0)),y(a)-y(L),col[m],{r:0})}
      s+=ln2(pl,y(PB.CAP),W-pr,y(PB.CAP),'var(--bad)',{sw:1.6,da:'5 3'})+tx(W-pr,y(PB.CAP)-4,'capacity 3,200',{fs:11,a:'end',c:'var(--bad)'});
      s+=tx((pl+W-pr)/2,H-6,o.N+' nodes, by node',{fs:11,a:'middle',c:'var(--mute)'});
      return svgW(W,H,s,'Sandboxes per node during the burst')},
    counters(m,k,e){const r=RES[m];if(!r)return '';const o=RES.o,s=k,L=r.frames[s];let mx=0;for(const v of L)mx=Math.max(mx,v);
      return stat('Placed so far',fmt(Math.round(o.B*s/PB.STEPS)))+stat('Fullest node',fmt(mx),'capacity '+fmt(PB.CAP))+stat('Refusals by edges (whole burst)',fmt(r.rej),r.rej?'each one a retry':'none needed')+stat('Watcher refreshes',fmt(r.refreshes),'one every '+o.P+' s')}});
  function run(){const o=par();labels(o);RES={o};const rows=[];
    for(const m of Object.keys(MODES)){const r=placeSim(Object.assign({mode:m},o));RES[m]=r;
      rows.push('<tr><td>'+MODES[m]+'</td><td class="num">'+fmt(r.max)+'</td><td class="num">'+fmt(r.min)+'</td><td class="num">'+fmt(r.max-r.min)+'</td><td class="num">'+r.sd.toFixed(1)+'</td><td class="num">'+fmt(r.rej)+'</td><td class="num">'+fmt(r.fail)+'</td></tr>')}
    $('pbTab').innerHTML=rows.join('');
    const mu=o.B/o.N;$('pbTheory').innerHTML='Each node gets '+mu.toFixed(1)+' sandboxes from this burst on average. For comparison, if requests were placed independently and uniformly, the added load per node would have a standard deviation of about √(B/N) = '+Math.sqrt(mu).toFixed(1)+' (a binomial count); balanced-allocation theory says sampling two nodes with fresh information keeps the fullest node within about ln ln N / ln 2 = '+(Math.log(Math.log(o.N))/Math.log(2)).toFixed(1)+', plus a constant, above the average. Random placement cannot correct the starting unevenness; the load-aware policies fill the emptier nodes first, which is why their final spread can be smaller than the burst\'s own randomness.';
    for(const m of Object.keys(MODES)){const arr=STEPS[m];arr.length=0;caps(m,o,RES[m]).forEach(x=>arr.push(x))}
    if(A){A.st.k=Math.min(A.st.k,PB.STEPS);A.st.lk=-1;A.draw()}}
  ids.forEach(i=>$('pb'+i).addEventListener('input',run));
  $('pbSeed').addEventListener('click',()=>{seed++;run()});
  window.__pbRun=run;
  onTab('t-run',()=>{if(!RES.o)run();else if(A)A.draw()});
})();
