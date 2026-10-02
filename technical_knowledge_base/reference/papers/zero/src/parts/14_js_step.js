// ---- Step through a training step: the same 8-layer step under two methods, to scale ----
(function(){
const L=8, NB=4; // layers, gradient buckets of two layers
const PAIRS={dp_3:['dp','os_g_p'],dp_1:['dp','os'],z12:['os','os_g'],z23:['os_g','os_g_p']};
const own=(l,nd)=>Math.floor(l*nd/L); // owner of layer l (0-based)
const bucketOf=k=>k>=1&&k<=4?k-1:k>=5&&k<=8?8-k:-1; // which two-layer bucket step k works on
const phase=k=>k===0?'rest':k<=4?'fwd':k<=8?'bwd':k===9?'opt':'end';
// state of rank r after (or during) step k: per layer, P/G/O in {1 resident, 2 transient (gathered or fresh, freed after), 0 absent}
function cells(st,nd,k,r){const b=bucketOf(k),ph=phase(k),P=[],G=[],O=[];
  for(let l=0;l<L;l++){const mine=own(l,nd)===r,inB=b>=0&&(l>>1)===b;
    P.push(st==='os_g_p'?(mine?1:(inB&&(ph==='fwd'||ph==='bwd'))?2:0):1);
    if(st==='dp'||st==='os')G.push(1);else G.push(mine?1:(inB&&ph==='bwd')?2:0);
    O.push(st==='dp'||mine?1:0)}
  return {P,G,O}}
// collectives at step k: [{kind, part:'p'|'g', layers:[...], vol}] with vol in units of psi elements per GPU
function comms(st,k){const b=bucketOf(k),ph=phase(k),ls=b>=0?[2*b,2*b+1]:[],f=2/L,out=[];
  if(ph==='fwd'&&st==='os_g_p')out.push({kind:'all-gather',part:'p',layers:ls,vol:f});
  if(ph==='bwd'){if(st==='os_g_p')out.push({kind:'all-gather',part:'p',layers:ls,vol:f});
    if(st==='dp')out.push({kind:'all-reduce',part:'g',layers:ls,vol:2*f});else out.push({kind:'reduce-scatter',part:'g',layers:ls,vol:f})}
  if(ph==='end'&&(st==='os'||st==='os_g'))out.push({kind:'all-gather',part:'p',layers:[...Array(L).keys()],vol:1});
  return out}
const commTo=(st,k)=>{let s=0;for(let j=0;j<=k;j++)comms(st,j).forEach(c=>s+=c.vol);return s};
// GPU 0's model-state bytes per parameter at step k
function memAt(st,nd,k){const c=cells(st,nd,k,0);let m=0;for(let l=0;l<L;l++){m+=(c.P[l]?2:0)/L+(c.G[l]?2:0)/L+(c.O[l]?12:0)/L}return m}
const peakTo=(st,nd,k)=>{let p=0;for(let j=0;j<=k;j++)p=Math.max(p,memAt(st,nd,j));return p};
const TITLES=['Start of the step','Forward, layers 1 and 2','Forward, layers 3 and 4','Forward, layers 5 and 6','Forward, layers 7 and 8','Backward, layers 8 and 7','Backward, layers 6 and 5','Backward, layers 4 and 3','Backward, layers 2 and 1','Optimizer step','End of the step'];
function say(st,k){const ph=phase(k),n=SSHORT[st];
  if(st==='dp')return ph==='rest'?'every GPU holds everything: all parameters, gradients and optimizer states, 16 bytes per parameter.':ph==='fwd'?'computes these layers with its own full copy; no communication.':ph==='bwd'?'computes these layers\' gradients, then all-reduces them across GPUs (bucketed): 2 × 1/4 of Ψ per GPU.':ph==='opt'?'every GPU runs the same full Adam update on its own copy, redundantly.':'nothing left to do; total moved: 2Ψ.';
  if(st==='os')return ph==='rest'?'like DDP, but each GPU keeps only its own 1/N<sub>d</sub> of the optimizer states.':ph==='fwd'?'same as DDP: full parameters, no communication.':ph==='bwd'?'reduces these gradients onto the GPU that owns them (a reduce-scatter, 1/4 of Ψ); the full gradient buffer stays allocated.':ph==='opt'?'each GPU updates only the fp32 master parameters it owns, 1/N<sub>d</sub> of the work.':'all-gathers the updated fp16 parameters (Ψ) so every GPU is in sync: total 2Ψ, DDP\'s volume.';
  if(st==='os_g')return ph==='rest'?'also keeps only its own gradients: 2 + 14/N<sub>d</sub> bytes per parameter.':ph==='fwd'?'full parameters, no communication.':ph==='bwd'?'computes these gradients, reduce-scatters them to their owner (1/4 of Ψ) and frees every gradient it does not own at once.':ph==='opt'?'each GPU updates its own slice.':'all-gathers the updated parameters (Ψ): total 2Ψ, still DDP\'s volume.';
  return ph==='rest'?'keeps only its own 1/N<sub>d</sub> of everything, parameters included: 16/N<sub>d</sub> bytes per parameter.':ph==='fwd'?'the owner broadcasts these layers\' weights (an all-gather, 1/4 of Ψ); every GPU computes them and discards the weights it does not own.':ph==='bwd'?'gathers these weights again (1/4 of Ψ), computes their gradients, reduce-scatters them to the owner (1/4 of Ψ), and frees both.':ph==='opt'?'each GPU updates its own slice, which is all it stores.':'nothing to gather: the next forward fetches weights on demand. Total 3Ψ, 1.5× DDP.'}
const modes={};Object.keys(PAIRS).forEach(m=>{const [a,b]=PAIRS[m];modes[m]=TITLES.map((t,k)=>({t,c:'<b>'+SSHORT[a]+':</b> '+say(a,k)+'<br><b>'+SSHORT[b]+':</b> '+say(b,k)}))});
const ndOf=()=>+(($('stxN')||{}).value||4);
function panel(st,nd,k,e,w,y0){const lw=50,gp=6,sw=w-lw-2*gp-4,u=sw/16,rh=15,rs=nd>4?19:22,cw={p:2*u/L,g:2*u/L,o:12*u/L};
  const X={p:lw,g:lw+2*u+gp,o:lw+4*u+2*gp};let s=tx(0,y0+12,SVGN[st],{fs:12,w:600});
  const top=y0+22,cs=comms(st,k),b=bucketOf(k),ph=phase(k);
  for(let r=0;r<nd;r++){const y=top+r*rs,c=cells(st,nd,k,r);s+=tx(0,y+11,'GPU '+r,{fs:11,c:'var(--mute)'});
    ['p','g','o'].forEach(part=>{const arr=part==='p'?c.P:part==='g'?c.G:c.O;
      for(let l=0;l<L;l++){const x=X[part]+l*cw[part],v=arr[l];
        // transient cells: gathered weights fade in as they arrive; non-owned fresh gradients fade out as they are reduced away
        const op=v===1?1:v===2?(part==='p'?0.3+0.7*e:1-0.75*e):0;
        if(v)s+=rc(x+.4,y,cw[part]-.8,rh,COL[part],{r:1,op});else s+=rc(x+.6,y+.6,cw[part]-1.2,rh-1.2,'none',{r:1,s:'var(--dim)',sw:1})}})}
  if(b>=0)['p','g'].forEach(part=>{const x=X[part]+2*b*cw[part];s+=rc(x-1,top-3,2*cw[part]+2,nd*rs+2,'none',{r:2,s:'var(--ink)',sw:1,op:.55})});
  if(ph==='opt')s+=rc(X.o-1,top-3,12*u+2,nd*rs+2,'var(--c3)',{r:2,op:.10+.15*e});
  const dot=(x,y)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.6" fill="var(--ink)"/>';
  cs.forEach(cm=>{const part=cm.part;
    if(cm.layers.length===L){s+=rc(X.p-1,top-3,2*u+2,nd*rs+2,'var(--c1)',{r:2,op:.12+.2*e});return}
    if(cm.kind==='all-reduce'){const xm=X[part]+(cm.layers[0]+1)*cw[part];for(let r=0;r<nd;r++){const yr=top+r*rs+rh/2,yn=top+((r+1)%nd)*rs+rh/2,xx=xm+(r%2?3:-3);s+=ln2(xx,yr,xx,yn,'var(--ink)',{sw:1.1,op:.5})+dot(xx,yr+(yn-yr)*e)}return}
    // one owner per layer: its weights go out to everyone (all-gather), its gradients come in from everyone (reduce-scatter)
    cm.layers.forEach(l=>{const xm=X[part]+(l+.5)*cw[part],ow=own(l,nd),yo=top+ow*rs+rh/2;
      for(let r=0;r<nd;r++){if(r===ow)continue;const yr=top+r*rs+rh/2,from=cm.kind==='reduce-scatter'?yr:yo,to=cm.kind==='reduce-scatter'?yo:yr;
        s+=ln2(xm,from,xm,to,'var(--ink)',{sw:1,op:.45})+dot(xm,from+(to-from)*e)}})});
  const labs=cs.length?cs.map(c=>c.kind+(c.layers.length===L?' of all parameters':' of layers '+(c.layers[0]+1)+' and '+(c.layers[1]+1))+': '+fmtPsi(c.vol)+' per GPU'):[ph==='opt'?'local update, no communication':'no communication'];
  labs.forEach((t,i)=>s+=tx(0,top+nd*rs+12+i*14,t,{fs:11,c:'var(--mute)'}));
  return {s,h:nd*rs+22+20+14}}
const fmtPsi=v=>{if(v===0)return '0';const w=Math.floor(v+1e-9),f=Math.round((v-w)*4),fr=['','¼','½','¾'][f];return (w?w:'')+fr+'Ψ'};
const SVGN={dp:'Baseline DP (DDP): nothing partitioned',os:'ZeRO-1: optimizer states partitioned',os_g:'ZeRO-2: optimizer states and gradients partitioned',os_g_p:'ZeRO-3: parameters partitioned too'};
function draw(m,k,e,w){const [a,b]=PAIRS[m],nd=ndOf();const lw=50,gp=6,sw=w-lw-2*gp-4,u=sw/16;
  let s='',y=0;
  // column headers
  const X={p:lw,g:lw+2*u+gp,o:lw+4*u+2*gp};
  s+=tx(X.p,10,'P',{fs:11,c:'var(--c1)',w:600})+tx(X.g,10,'G',{fs:11,c:'var(--c2)',w:600})+tx(X.o,10,'optimizer states (fp32)',{fs:11,c:'var(--c3)',w:600});y=16;
  const A=panel(a,nd,k,e,w,y);s+=A.s;y+=A.h+6;const B=panel(b,nd,k,e,w,y);s+=B.s;y+=B.h;
  return svgW(w,y,s,'One training step under '+SSHORT[a]+' and '+SSHORT[b])}
function counters(m,k){const [a,b]=PAIRS[m],nd=ndOf();
  const one=st=>'<div class="stat"><div class="k">'+SNAME[st]+'</div><div class="v">'+fmt(memAt(st,nd,k),2)+' <span class="u">bytes/param on GPU 0</span></div><div class="d">peak so far '+fmt(peakTo(st,nd,k),2)+'; moved so far '+fmtPsi(commTo(st,k))+' of '+zComm(st)+'Ψ per GPU</div></div>';
  return '<div class="cnt2">'+one(a)+one(b)+'</div>'}
const anim=makeAnim({id:'stx',modes,mode:'dp_3',draw,counters,dur:2600});
$('stxN').addEventListener('change',()=>anim&&anim.draw());
// sanity: the schedule reproduces the paper's totals and Figure 1's per-GPU formulas
window.__zeroCheck=()=>{const r={};['dp','os','os_g','os_g_p'].forEach(st=>{r[st]={comm:commTo(st,10),rest_matches_formula:[2,4,8].every(nd=>Math.abs(memAt(st,nd,0)-zStates(1,nd,st))<1e-9)}});return r};
// the same counters at the paper's scale
function scale(){const psi=+$('stsM').value*1e9,nd=ND_STEPS[+$('stsN').value];$('stsNv').textContent=nd;
  let h='<thead><tr><th>Method</th><th class="num">Model states per GPU</th><th class="num">vs baseline</th><th class="num">Moved per GPU per step</th><th class="num">in fp16 bytes</th></tr></thead><tbody>';
  STAGES.forEach(st=>{const m=zStates(psi,nd,st);h+='<tr><td>'+SNAME[st]+'</td><td class="num">'+gb(m)+' GB</td><td class="num">'+fmt(zStates(psi,nd,'dp')/m,1)+'×</td><td class="num">'+zComm(st)+'Ψ</td><td class="num">'+gb(zComm(st)*psi*2)+' GB</td></tr>'});
  $('stsT').innerHTML=h+'</tbody>';
  $('stsRep').innerHTML=(+$('stsM').value===7.5&&nd===64?'Defaults reproduce Figure 1 independently: 120, 31.4, 16.6 and 1.9 GB (the paper\'s '+A(PAPER.meta.ax+'#S1.F1','Figure 1')+', '+A(PAPER.meta.ax+'#S5','§5')+').':'Figure 1\'s example is 7.5B at N<sub>d</sub> = 64.')+' "Moved" is the paper\'s per-process volume; one step is one gradient update, however many micro-batches it accumulates.'}
['stsM','stsN'].forEach(id=>$(id).addEventListener('input',scale));$('stsM').addEventListener('change',scale);
onTab('t-step',()=>{scale();anim&&anim.draw()});
})();
