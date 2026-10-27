// ---- FlashAttention core, shared by every tab ----
// 1. The cost model: HBM elements read or written, counted line by line from Algorithms 0 to 4
//    (the same counts as recompute.py, which the check script compares against).
// 2. A real tiled-attention run on a small random input, recording every step of Algorithm 0,
//    Algorithm 1 (K, V outer) or FlashAttention-2's order (Q outer) for the Run the kernel tab.
const FA={};
FA.stdF=(N,d,md)=>4*N*d+4*N*N+(md?4*N*N:0);            // Algorithm 0 (+ a mask pass and a dropout pass)
FA.stdB=(N,d,md)=>7*N*N+8*N*d+(md?4*N*N:0);            // Algorithm 3 (+ their backward passes)
FA.faF=(N,d,Bc,s)=>N*d+2*N+2*N*d+Math.ceil(N/Bc)*(s==null?1:s)*(3*N*d+4*N); // Algorithm 1; s = block density (Algorithm 5)
FA.faB=(N,d,Bc,s)=>7*N*d+Math.ceil(N/Bc)*(s==null?1:s)*(5*N*d+2*N);         // Algorithm 4
FA.fa2F=(N,d,Br)=>2*N*d+N+Math.ceil(N/Br)*2*N*d;       // FlashAttention-2 order: Q_i once, K_j, V_j once per row block
FA.rule=(M,d)=>{const b=Math.ceil(M/(4*d));return {Bc:b,Br:Math.min(b,d)}};
FA.mm=(N,d)=>2*N*N*d;                                  // FLOPs of one N x N x d matrix multiply

// Gaussian random matrix from a seed (Box-Muller on mulberry32)
FA.mat=(rng,r,c,sc)=>{const a=[];for(let i=0;i<r;i++){const row=[];for(let j=0;j<c;j++){const u=Math.max(1e-12,rng()),v=rng();row.push(sc*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v))}a.push(row)}return a};
FA.dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};
FA.standard=(Q,K,V)=>Q.map(q=>{const s=K.map(k=>FA.dot(q,k)),m=Math.max(...s),e=s.map(x=>Math.exp(x-m)),l=e.reduce((a,b)=>a+b,0);return V[0].map((_,c)=>e.reduce((acc,w,j)=>acc+w*V[j][c],0)/l)});

// Run one input through a mode and record the steps.
// mode: 'std' (Algorithm 0), 'fa' (Algorithm 1), 'fa2' (FlashAttention-2 loop order)
FA.simulate=function(mode,N,d,B,md,seed){
  const rng=mulberry32(seed),Q=FA.mat(rng,N,d,1.5),K=FA.mat(rng,N,d,1.5),V=FA.mat(rng,N,d,1);
  const Oref=FA.standard(Q,K,V),T=Math.ceil(N/B);
  // the row to follow: the one whose running maximum rises most often across key blocks
  let row=0,best=-1;for(let r=0;r<N;r++){let m=-Infinity,n=0;for(let j=0;j<T;j++){let bm=-Infinity;for(let c=j*B;c<Math.min(N,(j+1)*B);c++)bm=Math.max(bm,FA.dot(Q[r],K[c]));if(bm>m){if(j>0)n++;m=bm}}if(n>best){best=n;row=r}}
  const steps=[];let rd=0,wr=0,big=0,flops=0;
  const st=(o)=>{o.rd=rd;o.wr=wr;o.big=big;o.flops=flops;steps.push(o)};
  const full=(m)=>({m,r0:0,r1:N,c0:0,c1:m==='S'||m==='P'?N:d});
  if(mode==='std'){
    st({t:'Start: Q, K and V sit in HBM',c:'Each is N × d = '+N+' × '+d+' values. Standard attention (Algorithm 0) runs three separate kernels, and each one writes its whole result back to HBM before the next can start.',ev:[],sram:[],have:{},extra:0});
    rd+=2*N*d;wr+=N*N;big+=N*N;flops+=FA.mm(N,d);
    st({t:'Kernel 1: S = QKᵀ, written to HBM',c:'Load Q and K by blocks, multiply, and write the full N × N score matrix S to HBM: '+fmt(N*N)+' values, '+(N/d)+' times the size of Q. This is the matrix FlashAttention never writes.',ev:[{m:'Q',k:'r'},{m:'K',k:'r'},{m:'S',k:'w'}],sram:[['Q block',B,d,'Q'],['K block',B,d,'K'],['S block',B,B,'S']],have:{S:1},extra:N*N});
    if(md){rd+=N*N;wr+=N*N;big+=2*N*N;st({t:'Masking: read S, write S again',c:'A padding or causal mask is another elementwise kernel: it reads all of S from HBM and writes it back. In PyTorch each elementwise step is a round trip like this one (§2.2).',ev:[{m:'S',k:'r'},{m:'S',k:'w'}],sram:[['S block',B,B,'S']],have:{S:1},extra:N*N})}
    rd+=N*N;wr+=N*N;big+=2*N*N;
    st({t:'Kernel 2: P = softmax(S), written to HBM',c:'Softmax is memory-bound: it does a few operations per value but must read all of S and write all of P. Each row needs its own maximum and sum before any of its outputs can be final, which is why S had to be complete first.',ev:[{m:'S',k:'r'},{m:'P',k:'w'}],sram:[['S block',B,B,'S'],['P block',B,B,'P']],have:{S:1,P:1},extra:2*N*N});
    if(md){rd+=N*N;wr+=N*N;big+=2*N*N;st({t:'Dropout: read P, write P again',c:'Dropout is one more pass over the N × N matrix (and training also keeps its mask for the backward pass). FlashAttention fuses masking and dropout into its single kernel at no extra HBM cost.',ev:[{m:'P',k:'r'},{m:'P',k:'w'}],sram:[['P block',B,B,'P']],have:{S:1,P:1},extra:2*N*N})}
    rd+=N*N+N*d;wr+=N*d;big+=N*N;flops+=FA.mm(N,d);
    st({t:'Kernel 3: O = PV, written to HBM',c:'Read P and V by blocks, multiply, write O. The output is exact, but the N × N matrix crossed the HBM boundary '+(md?'eight':'four')+' times on the way.',ev:[{m:'P',k:'r'},{m:'V',k:'r'},{m:'O',k:'w'}],sram:[['P block',B,B,'P'],['V block',B,d,'V'],['O block',B,d,'O']],have:{S:1,P:1,O:1},extra:2*N*N});
    st({t:'Saved for the backward pass: P stays in HBM',c:'Training keeps P (N × N'+(md?', plus the dropout mask':'')+') in HBM because Algorithm 3 reads it to compute the gradients. That is the O(N²) memory that limits context length.',ev:[{m:'P',k:'k'}],sram:[],have:{S:1,P:1,O:1},extra:2*N*N,end:1});
    const err=0;steps.forEach(s=>s.err=err);return {steps,row,Q,K,V,Oref,mode,N,d,B,T};
  }
  // FlashAttention, with real arithmetic
  const O=[],l=[],m=[];for(let i=0;i<N;i++){O.push(new Array(d).fill(0));l.push(0);m.push(-Infinity)}
  const tiles=[];const trk=()=>({m:m[row],l:l[row],o:O[row].slice()});
  const blk=(i,j)=>{let mt=-Infinity,fac=null,ri=null;const r0=i*B,r1=Math.min(N,r0+B),c0=j*B,c1=Math.min(N,c0+B);
    for(let r=r0;r<r1;r++){const s=[];for(let c=c0;c<c1;c++)s.push(FA.dot(Q[r],K[c]));const bm=Math.max(...s),p=s.map(x=>Math.exp(x-bm)),bl=p.reduce((a,b)=>a+b,0);
      const mn=Math.max(m[r],bm),a=Math.exp(m[r]-mn),b=Math.exp(bm-mn),ln=a*l[r]+b*bl;
      const pv=new Array(d).fill(0);for(let t=0;t<p.length;t++)for(let c=0;c<d;c++)pv[c]+=p[t]*V[c0+t][c];
      if(mode==='fa'){for(let c=0;c<d;c++)O[r][c]=(l[r]*a*O[r][c]+b*pv[c])/ln}else{for(let c=0;c<d;c++)O[r][c]=a*O[r][c]+b*pv[c]}
      if(r===row){ri={mo:m[r],bm,mn,fac:a,lo:l[r]}}
      l[r]=ln;m[r]=mn}
    flops+=2*(r1-r0)*(c1-c0)*d*2;tiles.push([i,j]);return ri};
  if(mode==='fa'){
    wr+=N*d+2*N;
    st({t:'Start: initialise O = 0, ℓ = 0, m = −∞ in HBM',c:'Algorithm 1, line 2. The blocks are B = '+B+' rows (B_c = B_r = '+B+'), so K and V split into T_c = '+T+' blocks and Q into T_r = '+T+'. The extra state in HBM is two numbers per row, ℓ and m: '+fmt(2*N)+' values against standard attention\'s '+fmt(2*N*N)+'.',ev:[{m:'O',k:'w'},{m:'l',k:'w'}],sram:[],have:{O:1,l:1},tiles:[],extra:2*N,tr:trk()});
    for(let j=0;j<T;j++)for(let i=0;i<T;i++){
      const ev=[];if(i===0){rd+=2*B*d;ev.push({m:'K',k:'r',r0:j*B,r1:(j+1)*B},{m:'V',k:'r',r0:j*B,r1:(j+1)*B})}
      rd+=2*B*d+2*B;ev.push({m:'Q',k:'r',r0:i*B,r1:(i+1)*B},{m:'O',k:'r',r0:i*B,r1:(i+1)*B},{m:'l',k:'r',r0:i*B,r1:(i+1)*B});
      const ri=blk(i,j);wr+=B*d+2*B;ev.push({m:'O',k:'w',r0:i*B,r1:(i+1)*B},{m:'l',k:'w',r0:i*B,r1:(i+1)*B});
      const first=j===0&&i===0;
      st({t:'Outer j = '+(j+1)+' of '+T+', inner i = '+(i+1)+' of '+T+(i===0?': load K'+(j+1)+', V'+(j+1)+', then Q'+(i+1):': load Q'+(i+1)+', O'+(i+1)+', ℓ, m'),
        c:(i===0?'K_'+(j+1)+' and V_'+(j+1)+' come on chip once and stay for the whole inner loop (line 6). ':'')+'Q_'+(i+1)+', O_'+(i+1)+' and its ℓ, m come in (line 8); the tile S_'+(i+1)+(j+1)+' = Q_'+(i+1)+'K_'+(j+1)+'ᵀ exists only in SRAM (line 9). Each row\'s maximum and sum are updated, the old output is rescaled by e^(m_old − m_new), and O_'+(i+1)+' goes back to HBM (lines 10 to 13).'+(first?' Watch the counters: no N × N matrix is ever written.':''),
        ev,sram:[['K'+(j+1),B,d,'K'],['V'+(j+1),B,d,'V'],['Q'+(i+1),B,d,'Q'],['O'+(i+1),B,d,'O'],['S'+(i+1)+(j+1),B,B,'S'],['ℓ, m',B,2,'l']],tiles:tiles.slice(),cur:[i,j],have:{O:1,l:1},extra:2*N,ri:(Math.floor(row/B)===i?ri:null),tr:trk(),rowb:Math.floor(row/B)===i})}
    st({t:'Saved for the backward pass: O, ℓ and m',c:'Only O and the two statistics per row stay in HBM (plus the random-number state for dropout). Algorithm 4 recomputes each S and P tile on chip from Q, K, V and these statistics instead of reading a stored P. This O is identical to standard attention\'s up to rounding: the maximum difference is shown in the counters.',ev:[{m:'O',k:'k'},{m:'l',k:'k'}],sram:[],tiles:tiles.slice(),have:{O:1,l:1},extra:2*N,tr:trk(),end:1});
  }else{
    st({t:'Start: FlashAttention-2 order, Q blocks outside',c:'FlashAttention-2 swaps the loops: each Q block is loaded once and stays on chip while every K, V block streams past it. The running output, maximum and sum live in SRAM, so nothing needs initialising in HBM. Blocks: B = '+B+', '+T+' × '+T+' tiles.',ev:[],sram:[],have:{},tiles:[],extra:0,tr:trk()});
    for(let i=0;i<T;i++)for(let j=0;j<T;j++){
      const ev=[];if(j===0){rd+=B*d;ev.push({m:'Q',k:'r',r0:i*B,r1:(i+1)*B})}
      rd+=2*B*d;ev.push({m:'K',k:'r',r0:j*B,r1:(j+1)*B},{m:'V',k:'r',r0:j*B,r1:(j+1)*B});
      const ri=blk(i,j);let fin='';
      if(j===T-1){for(let r=i*B;r<Math.min(N,(i+1)*B);r++)for(let c=0;c<d;c++)O[r][c]/=l[r];wr+=B*d+B;ev.push({m:'O',k:'w',r0:i*B,r1:(i+1)*B},{m:'l',k:'w',r0:i*B,r1:(i+1)*B});fin=' Last K block: divide by ℓ once, write O_'+(i+1)+' and its logsumexp L = m + log ℓ to HBM, once.'}
      st({t:'Outer i = '+(i+1)+' of '+T+', inner j = '+(j+1)+' of '+T+(j===0?': load Q'+(i+1)+', then K'+(j+1)+', V'+(j+1):': load K'+(j+1)+', V'+(j+1)),
        c:(j===0?'Q_'+(i+1)+' comes on chip and stays. ':'')+'K_'+(j+1)+' and V_'+(j+1)+' stream in; the tile S_'+(i+1)+(j+1)+' lives only in SRAM. The unnormalised output is rescaled by e^(m_old − m_new) but not divided by ℓ until the end (fewer non-matmul operations).'+fin,
        ev,sram:[['Q'+(i+1),B,d,'Q'],['K'+(j+1),B,d,'K'],['V'+(j+1),B,d,'V'],['Õ'+(i+1),B,d,'O'],['S'+(i+1)+(j+1),B,B,'S'],['ℓ, m',B,2,'l']],tiles:tiles.slice(),cur:[i,j],have:{O:i>0||j===T-1?1:0,l:i>0||j===T-1?1:0},oRows:(j===T-1?(i+1)*B:i*B),extra:N,ri:(Math.floor(row/B)===i?ri:null),tr:trk(),rowb:Math.floor(row/B)===i,fin:j===T-1})}
    st({t:'Saved for the backward pass: O and one logsumexp per row',c:'FlashAttention-2 stores a single number per row, L = m + log ℓ, instead of the pair (m, ℓ). Each O_i was written exactly once. The output again matches standard attention up to rounding.',ev:[{m:'O',k:'k'},{m:'l',k:'k'}],sram:[],tiles:tiles.slice(),have:{O:1,l:1},oRows:N,extra:N,tr:trk(),end:1});
  }
  let err=0;for(let r=0;r<N;r++)for(let c=0;c<d;c++)err=Math.max(err,Math.abs(O[r][c]-Oref[r][c]));
  steps.forEach(s=>s.err=err);
  return {steps,row,Q,K,V,Oref,mode,N,d,B,T,err};
};
// Self-check hook for check_page.mjs: the toy totals and the Figure 2 reconstruction
window.__faCheck=function(){const out={};[4,8,16].forEach(B=>{const g=m=>FA.simulate(m,32,4,B,false,7).steps.slice(-1)[0];const s=g('std'),f=g('fa'),f2=g('fa2'),smd=FA.simulate('std',32,4,B,true,7).steps.slice(-1)[0];
  out[B]={std:s.rd+s.wr,std_md:smd.rd+smd.wr,fa:f.rd+f.wr,fa2:f2.rd+f2.wr,fa_err:FA.simulate('fa',32,4,B,false,7).err,fa2_err:FA.simulate('fa2',32,4,B,false,7).err,model_fa:FA.faF(32,4,B),model_fa2:FA.fa2F(32,4,B),model_std:FA.stdF(32,4)}});
  const N=1024,d=64,BH=1024,r=FA.rule(98304,d);out.fig2={std:(FA.stdF(N,d)+FA.stdB(N,d))*BH*2/1e9,fa:(FA.faF(N,d,r.Bc)+FA.faB(N,d,r.Bc))*BH*2/1e9,Bc:r.Bc};return out};
