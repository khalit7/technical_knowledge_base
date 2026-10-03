// ---- Reading: one training step, nine ways (Llama 3 8B on 4 GPUs). Numbers mirror src/recompute.py (anim block); check_calc.mjs compares them. ----
window.ANIM=(function(){
  const GB=1e9, n=4;
  const P=8030261248, L=32, h=4096, hkv=1024, mlpL=3*4096*14336*32, nonFFN=P-mlpL;
  const x8=8192*h*2;                       // one 8,192-token sequence's hidden states in bf16
  const X=4*x8;                            // the whole batch: 32,768 tokens in both batch options
  const seqA=34*8192*h*L;                  // activations of one 8K sequence through the model (Korthikanti 34sbh)
  const totA=4*seqA;                       // the whole batch's activations, 146 GB
  const ar=k=>2*(k-1)/k, rs=k=>(k-1)/k;
  const ATT=15/34, FFN=19/34;              // share of the 34 sbh held by attention and norms, and by the MLP (Korthikanti's split)
  // per mode: states per GPU (bytes), activations per GPU [4], bytes sent per GPU (busiest) by link, collectives, idle
  function numbers(mode,B){
    const one=B===1, r={};
    const evenA=[totA/4,totA/4,totA/4,totA/4], dpA=one?[totA,0,0,0]:evenA;
    const S={DP:16*P,'ZeRO-1':(4+12/n)*P,'ZeRO-2':(2+14/n)*P,'ZeRO-3':16*P/n,HSDP:16*P/2,TP:16*P/n,PP:16*P/n,CP:16*P,EP:16*(nonFFN+mlpL)};
    r.states=S[mode];
    const dpAR=ar(n)*2*P;
    if(mode==='DP'||mode==='ZeRO-1'||mode==='ZeRO-2'){r.A=dpA;r.nv=dpAR;r.ib=0;r.coll=mode==='DP'?1:2;}
    else if(mode==='ZeRO-3'){r.A=dpA;r.nv=3*rs(n)*2*P;r.ib=0;r.coll=3*L;}
    else if(mode==='HSDP'){r.A=dpA;r.nv=3*rs(2)*2*P;r.ib=ar(2)*(2*P/2);r.coll=3*L+1;}
    else if(mode==='TP'){r.A=evenA;r.nv=4*L*ar(n)*X;r.ib=0;r.coll=4*L;}
    else if(mode==='PP'){const m=one?1:4,mb=X/m;r.A=one?evenA:[0,1,2,3].map(i=>(n-i)*seqA/4);r.nv=2*m*mb;r.ib=0;r.coll=2*(n-1)*m;}
    else if(mode==='CP'){r.A=evenA;r.nv=2*L*rs(n)*(2*32768*hkv*2)+dpAR;r.ib=0;r.coll=2*L+1;}
    else if(mode==='EP'){
      const own=one?X:x8;                  // tokens whose attention runs on the busiest GPU
      r.A=one?[totA*ATT+totA*FFN/4,totA*FFN/4,totA*FFN/4,totA*FFN/4]:evenA;
      r.nv=(one?2*L*rs(n)*own:4*L*rs(n)*own)+ar(n)*2*nonFFN;r.ib=0;r.coll=4*L+1;}
    if(mode==='DP'||mode.startsWith('ZeRO')||mode==='HSDP')r.idle=one?0.75:0;
    else if(mode==='PP'){const m=one?1:4;r.idle=(n-1)/(m+n-1);r.bubble=(n-1)/m}
    else r.idle=0;
    r.peak=Math.max(...r.A.map(a=>r.states+a));
    return r;
  }
  return {numbers,P,L,h,seqA,totA,x8,X,nonFFN,mlpL,GB,moeP:nonFFN+4*mlpL};
})();
(function(){
  const $=id=>document.getElementById(id);
  if(!$('an'))return;
  const A=window.ANIM,GB=1e9,n=4;
  const MODES=['DP','ZeRO-1','ZeRO-2','ZeRO-3','HSDP','TP','PP','EP','CP'];
  let mode='DP',B=4;
  const gb=v=>(v/GB>=100?(v/GB).toFixed(0):(v/GB).toFixed(1))+' GB';
  const gb1=v=>(v/GB).toFixed(v/GB<1?2:1)+' GB';
  // ---------- 1F1B schedule for the PP mode (F = 1, B = 2 time units), list-scheduled ----------
  function sched(p,m){const F=1,Bt=2,ops=[];
    for(let i=0;i<p;i++){const w=Math.min(p-i-1,m),seq=[];let f=0,b=0;
      for(let k=0;k<w;k++)seq.push(['F',f++]);while(f<m){seq.push(['F',f++]);seq.push(['B',b++])}while(b<m)seq.push(['B',b++]);ops.push(seq)}
    const end={},st=[];for(let i=0;i<p;i++)st.push([]);
    let free=Array(p).fill(0),idx=Array(p).fill(0),left=p*2*m,guard=0;
    while(left>0&&guard++<1e4){for(let i=0;i<p;i++){if(idx[i]>=ops[i].length)continue;const [k,j]=ops[i][idx[i]];
      let dep=k==='F'?(i===0?0:end['F'+(i-1)+'_'+j]):(i===p-1?end['F'+i+'_'+j]:end['B'+(i+1)+'_'+j]);
      if(dep===undefined)continue;const s=Math.max(free[i],dep),d=k==='F'?F:Bt;end[k+i+'_'+j]=s+d;st[i].push({k,j,s,d});free[i]=s+d;idx[i]++;left--}}
    const T=Math.max(...free);return {st,T,busy:m*(F+Bt)};
  }
  // ---------- steps per mode ----------
  function steps(){const one=B===1,N=A.numbers(mode,B),L=A.L;
    const own=one?'one 32,768-token sequence':'four 8,192-token sequences';
    const S=[];const add=(t,p,o)=>S.push(Object.assign({t,p,ph:null,row:null,coll:null,nv:0,ib:0,cn:0,act:0},o||{}));
    if(mode==='DP'){
      add('Setup: four full copies',one?'Every GPU holds the whole model, its gradients and its optimizer state: 16 bytes per parameter, 128.5 GB, more than an 80 GB H100 holds. With one sequence there is nothing to give GPUs 1 to 3: data parallelism cannot cut a sequence.':'Every GPU holds the whole model, its gradients and its optimizer state: 16 bytes per parameter, 128.5 GB, more than an 80 GB H100 holds; this is the memory ceiling the other splits remove. Each GPU gets its own sequence.');
      add('Forward','Each GPU runs its own data through all 32 layers and keeps the activations for backward. No communication.',{ph:'f',row:'all',act:1});
      add('Backward, with the all-reduce starting','Gradients appear from the last layer back. DDP groups them into buckets of 25 MiB and starts an all-reduce on each bucket as soon as it is ready, overlapping communication with the rest of backward.',{ph:'b',row:'all',coll:'ar',nv:N.nv/2,act:0.5});
      add('All-reduce finishes','Every GPU now holds the average gradient. A ring all-reduce sends 2(n − 1)/n of the buffer per GPU: 1.5 × 16.1 GB = 24.1 GB each, whatever the number of GPUs.',{coll:'ar',nv:N.nv/2,cn:1});
      add('Optimizer step','Every GPU applies the same update to its own copy, so the four copies stay identical. Four times the optimizer work and memory for one result: the redundancy ZeRO removes.',{ph:'o'});
    } else if(mode==='ZeRO-1'||mode==='ZeRO-2'){const z2=mode==='ZeRO-2';
      add('Setup: '+(z2?'optimizer state and gradients sharded':'optimizer state sharded'),(z2?'Weights stay whole; each GPU keeps a quarter of the gradients and of the optimizer state: 2 + 14/4 = 5.5 bytes per parameter, 44.2 GB.':'Weights and gradients stay whole; each GPU keeps a quarter of the 12 bytes of fp32 master weights and Adam moments: 2 + 2 + 12/4 = 7 bytes per parameter, 56.2 GB.')+(one?' With one sequence, GPUs 1 to 3 still idle.':''));
      add('Forward','As in DP: each GPU runs its own data through the whole model.',{ph:'f',row:'all',act:1});
      if(z2)add('Backward with reduce-scatter','Each bucket is reduce-scattered as soon as it is ready: GPU i receives the summed gradients for its quarter only and frees the rest. (n − 1)/n × 16.1 GB = 12.0 GB sent per GPU.',{ph:'b',row:'all',coll:'rs',nv:N.nv/2,cn:1,act:0.5});
      else{add('Backward','Full gradients are computed and held on every GPU.',{ph:'b',row:'all',act:0.5});
        add('Reduce-scatter of the gradients','Instead of an all-reduce, each GPU receives the sum only for its own quarter: (n − 1)/n × 16.1 GB = 12.0 GB sent per GPU, half an all-reduce.',{coll:'rs',nv:N.nv/2,cn:1});}
      add('Optimizer step on a quarter','Each GPU updates only its quarter of the fp32 master weights with its quarter of the Adam state.',{ph:'o'});
      add('All-gather of the updated weights','Each GPU broadcasts its updated bf16 quarter; another 12.0 GB. Reduce-scatter plus all-gather is exactly an all-reduce, so ZeRO-1 and 2 cost the same 24.1 GB as DP while holding 56.2 or 44.2 GB instead of 128.5.',{coll:'ag',nv:N.nv/2,cn:1});
    } else if(mode==='ZeRO-3'){
      add('Setup: everything sharded','Each GPU holds a quarter of every layer\'s weights, gradients and optimizer state: 16/4 = 4 bytes per parameter, 32.1 GB. This is FSDP\'s default (FULL_SHARD).'+(one?' The sharding works with one sequence, but GPUs 1 to 3 still have no data to compute on.':''));
      add('Forward, layer by layer','Before each layer runs, its quarters are all-gathered into a full copy (dashed, shown on one row), used, and freed. One layer\'s full weights exist at a time. 32 all-gathers, (n − 1)/n × 16.1 GB = 12.0 GB sent per GPU.',{ph:'f',row:'all',coll:'ag',nv:N.nv/3,cn:32,act:1,gather:2});
      add('Backward: gather again, then reduce-scatter','Each layer is all-gathered again for backward (12.0 GB), and its gradients are reduce-scattered straight away so each GPU keeps only its quarter (12.0 GB).',{ph:'b',row:'all',coll:'rs',nv:2*N.nv/3,cn:64,act:0.5,gather:5});
      add('Optimizer step, no final gather','Each GPU updates its own quarter. The weights stay sharded until the next forward gathers them. Total 36.1 GB per GPU: 1.5 times DP, the price of holding a quarter of the weights.',{ph:'o'});
    } else if(mode==='HSDP'){
      add('Setup: shard inside the server, replicate across','Two servers of two GPUs. Inside each server the model is sharded in halves (8 bytes per parameter, 64.2 GB); the two servers are replicas of each other. A 2-D device mesh: shard on one axis, replicate on the other.'+(one?' With one sequence, only server A has data.':''));
      add('Forward: all-gather over NVLink','Each layer is gathered from its two halves inside the server (dashed, one row shown): (2 − 1)/2 × 16.1 GB = 8.0 GB per GPU, all on NVLink.',{ph:'f',row:'all',coll:'ring2',nv:N.nv/3,cn:32,act:1,gather:2});
      add('Backward: gather and reduce-scatter over NVLink','Gather again for backward, then reduce-scatter the gradients inside the server: 16.1 GB more on NVLink.',{ph:'b',row:'all',coll:'ring2',nv:2*N.nv/3,cn:64,act:0.5,gather:5});
      add('All-reduce across servers','Only now does traffic cross InfiniBand: each GPU all-reduces its half of the gradients with its twin in the other server, 8.0 GB. Plain ZeRO-3 over all four GPUs would push its whole 36.1 GB through a ring that crosses the servers.',{coll:'pair',ib:N.ib,cn:1});
      add('Optimizer step','Each GPU updates its half; the twins stay identical. A failed server leaves a complete replica behind, which is what fault-tolerant HSDP (torchft) builds on.',{ph:'o'});
    } else if(mode==='TP'){
      add('Setup: every matrix cut in four','Each GPU holds a quarter of every weight matrix: query, key and value heads and the first feed-forward matrices by columns, the attention output and second feed-forward matrix by rows. 4 bytes per parameter, 32.1 GB. The four GPUs act as one model replica, so the whole batch, '+own+', goes through all four.');
      add('Layer 1, attention','Column-parallel QKV gives each GPU 8 of the 32 heads, so attention runs locally. The row-parallel output projection leaves a partial sum on each GPU: one all-reduce of the batch\'s hidden states, '+gb1(2*3/4*A.X)+' per GPU. With sequence parallelism this is a reduce-scatter plus an all-gather of the same size, and LayerNorm activations are split by tokens.',{ph:'f',row:0,coll:'ar',nv:2*3/4*A.X,cn:1,act:0.03});
      add('Layer 1, feed-forward','Column-parallel W1 and W3, the SwiGLU applied locally (the reason for the column-then-row pairing: no sync in between), row-parallel W2, then the second all-reduce.',{ph:'f',row:0,coll:'ar',nv:2*3/4*A.X,cn:1,act:0.06});
      add('Layers 2 to 32','Two all-reduces per layer: 64 in the forward pass, 25.8 GB per GPU.',{ph:'f',row:'all',coll:'ar',nv:62*1.5*A.X,cn:62,act:1});
      add('Backward','The mirror image: two all-reduces of input gradients per layer, 64 more, 25.8 GB. Each GPU computes the weight gradients for its own slices only.',{ph:'b',row:'all',coll:'ar',nv:64*1.5*A.X,cn:64,act:0.5});
      add('Optimizer step, no gradient sync','There is one replica, so nothing to average. Total 51.5 GB per GPU, more than any other mode, in 128 small, latency-bound pieces inside every layer: tensor parallelism only works on NVLink.',{ph:'o'});
    } else if(mode==='PP'){const m=one?1:4,G=sched(n,m),T=G.T,mb=A.X/m;
      const cut=[0,G.st[n-1][0].s+1,one?T*0.6:G.st[0].filter(o=>o.k==='F').slice(-1)[0].s+1,T];
      const sent=t=>{let s=0;for(let i=0;i<n;i++)for(const o of G.st[i]){if(o.s+o.d>t)continue;if((o.k==='F'&&i<n-1)||(o.k==='B'&&i>0))s+=mb}return s/(2*(n-1))*2};
      add('Setup: eight layers per GPU','GPU 0 holds layers 1 to 8 with the embedding, GPU 3 layers 25 to 32 with the output head: 4 bytes per parameter of the whole model each, 32.1 GB (the end stages a little more). The batch is cut into '+(one?'one micro-batch: a single sequence cannot be cut along the batch.':'four micro-batches, one sequence each.'),{gantt:0});
      add('Warm-up','Micro-batch 1 enters stage 1, then its activations are sent to stage 2, and so on. The later stages wait: the start of the bubble.',{ph:'f',coll:'p2p',nv:sent(cut[1]),cn:n-1,gantt:cut[1],act:0.5});
      add(one?'Forward reaches the end, backward starts':'Steady state: one forward, one backward','1F1B: once the last stage starts backward, each stage alternates a forward and a backward, so it never holds more than p micro-batches of activations (GPipe holds all m). Gradients flow back by send and receive.',{ph:'b',coll:'p2p',nv:sent(cut[2])-sent(cut[1]),cn:one?2:8,gantt:cut[2],act:1});
      add('Cool-down','The pipeline drains; the first stage waits for the last gradients. Idle share of the timeline: (p − 1)/(m + p − 1) = '+(100*N.idle).toFixed(0)+'%; in Megatron\'s terms the bubble is (p − 1)/m = '+(100*N.bubble).toFixed(0)+'% of the ideal time.',{ph:'b',coll:'p2p',nv:sent(cut[3])-sent(cut[2]),cn:(2*(n-1)*m)-(n-1)-(one?2:8),gantt:cut[3],act:0});
      add('Optimizer step','Each stage updates its own layers; nothing to average. The traffic was tiny, '+gb1(N.nv)+' per GPU at most, one activation per micro-batch per boundary: pipeline parallelism is the split to put on slow links.',{ph:'o',gantt:cut[3]});
    } else if(mode==='EP'){const one1=one;
      add('Setup: the MoE twin, one expert per GPU','Every feed-forward block is now four experts; GPU i holds expert i of every layer and a full copy of attention, embeddings and norms. 128.5 GB per GPU, the same as dense DP, while the model holds 24.9B parameters: experts add parameters without adding memory per GPU. '+(one1?'The one sequence sits on GPU 0.':'Each GPU holds its own sequence.'));
      add('Layer 1: attention and the router','Attention runs where the tokens are. The router picks one expert per token; with balanced routing three quarters of each GPU\'s tokens belong to experts on other GPUs.',{ph:'f',row:0,act:0.03});
      add('All-to-all dispatch','Every GPU sends each token to the GPU holding its expert: '+(one1?'GPU 0 sends 3/4 of 32,768 tokens, '+gb1(0.75*A.X)+', and the others send nothing: a hot spot.':'3/4 × 8,192 tokens × 4,096 × 2 bytes = '+gb1(0.75*A.x8)+' per GPU.'),{ph:'f',row:0,coll:'a2a',nv:0.75*(one1?A.X:A.x8),cn:1,act:0.04});
      add('Experts, then all-to-all combine','Each expert processes the tokens it received, then a second all-to-all returns the outputs to where their tokens live.',{ph:'f',row:0,coll:'a2a',nv:one1?0:0.75*A.x8,cn:1,act:0.06});
      add('Layers 2 to 32','Two all-to-alls per MoE layer: 64 in the forward pass.',{ph:'f',row:'all',coll:'a2a',nv:(one1?31:62)*0.75*(one1?A.X:A.x8),cn:62,act:1});
      add('Backward','The same route in reverse: 64 more all-to-alls carry gradients to the experts and back.',{ph:'b',row:'all',coll:'a2a',nv:(one1?32:64)*0.75*(one1?A.X:A.x8),cn:64,act:0.5});
      add('All-reduce of the shared parts','Attention, embeddings and norms are replicated, so their gradients (2.39B parameters) are all-reduced as in DP: 7.2 GB per GPU. Expert gradients stay where their expert lives.',{coll:'ar',nv:2*3/4*2*A.nonFFN,cn:1});
      add('Optimizer step','Each GPU updates its experts and its copy of the shared parts. Total '+gb1(N.nv)+' per GPU; at DeepSeek-V3\'s scale the all-to-alls cross servers, which is why it limits each token to 4 nodes.',{ph:'o'});
    } else if(mode==='CP'){
      add('Setup: every sequence cut in eight','Each sequence is cut into 2 × 4 = 8 chunks and GPU i keeps chunks i and 7 − i, so every GPU gets one early and one late chunk and the causal mask gives each the same work (Llama 3\'s load balancing). Weights are whole on every GPU: 128.5 GB. Context parallelism cuts activations, not weights; in practice it is combined with FSDP or TP.');
      add('Layer 1: gather keys and values','Each GPU computes Q, K, V for its own tokens, then all-gathers K and V (Llama 3\'s variant; Ring Attention passes the blocks round a ring instead). With grouped-query attention K and V are 4 times smaller than Q: '+gb1(3/4*2*32768*1024*2)+' per GPU per layer.',{ph:'f',row:0,coll:'ag',nv:3/4*2*32768*1024*2,cn:1,act:0.03});
      add('Attention for local queries, then the feed-forward','Each GPU computes attention for its own query chunks against all keys; the feed-forward block works token by token and needs nothing from the others.',{ph:'f',row:0,act:0.06});
      add('Layers 2 to 32','One all-gather per layer.',{ph:'f',row:'all',coll:'ag',nv:31*3/4*2*32768*1024*2,cn:31,act:1});
      add('Backward','Gradients of K and V are reduce-scattered back to the GPUs that own those tokens: 32 reduce-scatters, '+gb1(32*3/4*2*32768*1024*2)+'.',{ph:'b',row:'all',coll:'rs',nv:32*3/4*2*32768*1024*2,cn:32,act:0.5});
      add('All-reduce of the weight gradients','Every GPU computed gradients for all weights from its own tokens, so they are averaged as in DP: 24.1 GB. Total '+gb1(N.nv)+'.',{coll:'ar',nv:2*3/4*2*A.P,cn:1});
      add('Optimizer step','Identical update everywhere. Each GPU held a quarter of the activations, '+gb(A.totA/4)+', whether the batch was four sequences or one.',{ph:'o'});
    }
    return S;
  }
  // ---------- drawing ----------
  const card=$('an');let ST=steps(),ctl;
  const C={w:'var(--c1)',g:'var(--c5)',o:'var(--c4)',a:'var(--c3)',f:'var(--acc)',b:'var(--c2)',nv:'var(--c6)',ib:'var(--ib)'};
  const SEQC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function holds(g,r,blk,q){ // weight slice state: 1 held, 0 not held
    if(mode==='DP'||mode==='ZeRO-1'||mode==='ZeRO-2'||mode==='CP')return 1;
    if(mode==='ZeRO-3'||mode==='TP')return q===g?1:0;
    if(mode==='HSDP')return (q>>1)===(g&1)?1:0;
    if(mode==='PP')return r>>1===g?1:0;
    if(mode==='EP')return blk==='A'?1:(q===g?1:0);
    return 1}
  function data(g,row,c){ // data grid cell: 0 none, 1 own, 2 replicated
    const one=B===1;
    if(mode==='TP')return 2;
    if(mode==='CP'){const ch=one?(row*2+(c>>2)):(c);const k=one?ch:c;const want=[g,7-g];if(one)return want.includes(row*2+(c>>2))?1:0;return want.includes(c)?1:0}
    if(mode==='PP')return g===0?1:0;
    if(one)return g===0?1:0;
    if(mode==='HSDP')return row===g?1:0;
    return row===g?1:0}
  function draw(i){const s=ST[i],N=A.numbers(mode,B),Wd=RD.width($('anSvg'));
    const gap=Math.max(6,Math.min(14,Wd*0.02)),cw=(Wd-3*gap)/4,pad=4;
    let y0=16,svg='';const cs=Math.max(4,Math.min(10,(cw-2*pad)/8-1.2));
    const dH=4*(cs+1.2),rh=Math.max(6,Math.min(10,cs)),gH=8*(rh+2);
    const yD=y0+4,yG=yD+dH+8,yM=yG+gH+8,yC=yM+30;
    // accumulate counters to step i
    let nv=0,ib=0,cn=0;for(let k=0;k<=i;k++){nv+=ST[k].nv;ib+=ST[k].ib;cn+=ST[k].cn}
    const scale=280e9;
    if(mode==='HSDP')[0,2].forEach(g=>{const x=g*(cw+gap)-3;svg+='<rect x="'+Math.max(0,x).toFixed(1)+'" y="0" width="'+(2*cw+gap+6-(x<0?-x:0)).toFixed(1)+'" height="'+(yM+28)+'" rx="8" fill="none" stroke="var(--ib)" stroke-dasharray="4 3"/>'});
    for(let g=0;g<4;g++){const x=g*(cw+gap);
      const node=mode==='HSDP'?(g<2?' · server A':' · server B'):'';
      const busy=(B===1&&(mode==='DP'||mode.startsWith('ZeRO')||mode==='HSDP')&&g>0);
      svg+='<rect x="'+x+'" y="2" width="'+cw+'" height="'+(yM+24)+'" rx="6" fill="var(--soft)" stroke="var(--line)"'+(busy?' opacity="0.55"':'')+'/>';
      svg+='<text x="'+(x+pad+2)+'" y="'+(y0-2)+'" font-size="10.5" font-weight="600">GPU '+g+(cw>110?node:'')+'</text>';
      // data grid
      for(let row=0;row<4;row++)for(let c=0;c<8;c++){const d=data(g,row,c),cx=x+pad+c*(cs+1.2),cy=yD+row*(cs+1.2);
        const col=B===1?SEQC[0]:SEQC[row];
        svg+='<rect x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" width="'+cs.toFixed(1)+'" height="'+cs.toFixed(1)+'" rx="1" fill="'+(d?col:'none')+'" fill-opacity="'+(d===2?0.3:d?0.85:0)+'" stroke="var(--dim)" stroke-width="0.6"/>'}
      // model grid: 8 rows x (A,F) x 4 slices
      const bw=(cw-2*pad-4)/2,sw=bw/4;
      for(let r=0;r<8;r++){const ry=yG+r*(rh+2);
        const act=s.row==='all'||s.row===r;const pc=s.ph==='f'?C.f:s.ph==='b'?C.b:null;
        ['A','F'].forEach((blk,bi)=>{for(let q=0;q<4;q++){const hd=holds(g,r,blk,q),bx=x+pad+bi*(bw+4)+q*sw;
          const tmp=!hd&&s.gather!=null&&s.gather===r&&(mode==='ZeRO-3'||(mode==='HSDP'&&(q>>1)!==(g&1)));
          svg+='<rect x="'+bx.toFixed(1)+'" y="'+ry.toFixed(1)+'" width="'+(sw-0.8).toFixed(1)+'" height="'+rh+'" fill="'+(hd||tmp?C.w:'none')+'" fill-opacity="'+(hd?0.8:tmp?0.25:0)+'" stroke="'+(tmp?C.w:'var(--dim)')+'" stroke-width="0.6"'+(tmp?' stroke-dasharray="2 1.5"':'')+'/>'}
          if(act&&pc&&mode!=='PP')svg+='<rect x="'+(x+pad+bi*(bw+4)-1).toFixed(1)+'" y="'+(ry-1)+'" width="'+(bw+1.2).toFixed(1)+'" height="'+(rh+2)+'" fill="none" stroke="'+pc+'" stroke-width="1.4" rx="1.5"/>'});
      }
      // memory bar (states + activations at this step), to scale against 280 GB, with the 80 GB line
      const st=N.states,ac=N.A[g]*(s.act||0),bwid=cw-2*pad;
      const parts=mode==='DP'||mode==='CP'||mode==='EP'?[[2,C.w],[2,C.g],[12,C.o]]:mode==='ZeRO-1'?[[2,C.w],[2,C.g],[3,C.o]]:mode==='ZeRO-2'?[[2,C.w],[0.5,C.g],[3,C.o]]:mode==='HSDP'?[[1,C.w],[1,C.g],[6,C.o]]:[[0.5,C.w],[0.5,C.g],[3,C.o]];
      const bpp=parts.reduce((a,b)=>a+b[0],0);let bx=x+pad;
      parts.forEach(([v,c])=>{const w=bwid*(st*v/bpp)/scale;svg+='<rect x="'+bx.toFixed(1)+'" y="'+yM+'" width="'+Math.max(0,w).toFixed(1)+'" height="10" fill="'+c+'"/>';bx+=w});
      const aw=bwid*ac/scale;svg+='<rect x="'+bx.toFixed(1)+'" y="'+yM+'" width="'+Math.min(aw,x+pad+bwid-bx).toFixed(1)+'" height="10" fill="'+C.a+'"/>';
      svg+='<rect x="'+(x+pad)+'" y="'+yM+'" width="'+bwid.toFixed(1)+'" height="10" fill="none" stroke="var(--line)"/>';
      const lx=x+pad+bwid*80e9/scale;svg+='<line x1="'+lx.toFixed(1)+'" x2="'+lx.toFixed(1)+'" y1="'+(yM-3)+'" y2="'+(yM+13)+'" stroke="var(--bad)" stroke-width="1.4"/>';
      svg+='<text x="'+(x+pad)+'" y="'+(yM+22)+'" font-size="10" fill="var(--mute)">'+gb(st+ac)+'</text>';
    }
    // collectives band
    const cy=yC+8,mid=g=>g*(cw+gap)+cw/2;let band='';const k=s.coll;
    if(k){const col=k==='pair'?C.ib:C.nv;const mk='url(#anah)';
      const arr=(x1,x2,yy,curve,c)=>'<path d="M'+x1.toFixed(1)+','+yy+' Q'+((x1+x2)/2).toFixed(1)+','+(yy+curve)+' '+x2.toFixed(1)+','+yy+'" fill="none" stroke="'+(c||col)+'" stroke-width="1.6" marker-end="'+mk+'"/>';
      if(k==='ar'||k==='rs'||k==='ag'){for(let g=0;g<3;g++)band+=arr(mid(g)+6,mid(g+1)-6,cy,-10);band+=arr(mid(3)-4,mid(0)+4,cy+6,22)}
      else if(k==='ring2'){band+=arr(mid(0)+6,mid(1)-6,cy,-10)+arr(mid(1)-6,mid(0)+6,cy+6,10)+arr(mid(2)+6,mid(3)-6,cy,-10)+arr(mid(3)-6,mid(2)+6,cy+6,10)}
      else if(k==='pair'){band+=arr(mid(0),mid(2),cy+2,26,C.ib)+arr(mid(1),mid(3),cy+2,18,C.ib)}
      else if(k==='a2a'){const src=B===1&&mode==='EP'&&(s.t.indexOf('dispatch')>=0)?[0]:[0,1,2,3];src.forEach(a=>{for(let b=0;b<4;b++)if(a!==b)band+=arr(mid(a)+(b>a?4:-4),mid(b)+(b>a?-4:4),cy+(a+b)%3*3,(b>a?-1:1)*(6+4*Math.abs(a-b)))})}
      else if(k==='p2p'){const back=s.ph==='b';for(let g=0;g<3;g++)band+=back?arr(mid(g+1)-6,mid(g)+6,cy,10,C.b):arr(mid(g)+6,mid(g+1)-6,cy,-10,C.f)}
      const nm={ar:'all-reduce',rs:'reduce-scatter',ag:'all-gather',ring2:'all-gather and reduce-scatter in each server',pair:'all-reduce across servers (InfiniBand)',a2a:'all-to-all',p2p:'send / receive'}[k];
      band+='<text x="2" y="'+(yC+44)+'" font-size="10.5" fill="var(--mute)">'+nm+'</text>';
    }
    // PP gantt
    let gy=yC+52,gH2=0;
    if(mode==='PP'){const m=B===1?1:4,G=sched(4,m),tw=Wd-40,u=tw/G.T,lim=s.gantt||0;
      for(let g=0;g<4;g++){const yy=gy+g*13;svg+='<text x="0" y="'+(yy+9)+'" font-size="10" fill="var(--mute)">'+g+'</text><rect x="14" y="'+yy+'" width="'+tw.toFixed(1)+'" height="11" fill="var(--soft)" stroke="var(--line)"/>';
        G.st[g].forEach(o=>{if(o.s>=lim)return;const w=Math.min(o.d,lim-o.s)*u;svg+='<rect x="'+(14+o.s*u).toFixed(1)+'" y="'+yy+'" width="'+(w-0.6).toFixed(1)+'" height="11" fill="'+(o.k==='F'?C.f:C.b)+'" fill-opacity="0.75"/>';if(w>12)svg+='<text x="'+(14+o.s*u+w/2).toFixed(1)+'" y="'+(yy+9)+'" font-size="8.5" text-anchor="middle" fill="var(--bg)">'+(o.j+1)+'</text>'})}
      gH2=4*13+4;svg+='<text x="14" y="'+(gy+gH2+8)+'" font-size="10" fill="var(--mute)">time (forward 1 unit, backward 2); grey is idle</text>';gH2+=12}
    const H=(mode==='PP'?gy+gH2:yC+50)+4;
    $('anSvg').innerHTML='<svg viewBox="0 0 '+Wd+' '+H+'" width="100%" role="img" aria-label="Four GPUs under '+mode+', step '+(i+1)+'"><defs><marker id="anah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+svg+band+'</svg>';
    $('anCap').innerHTML='<div class="t">'+mode+' · step '+(i+1)+' of '+ST.length+': '+s.t+'</div><p>'+s.p+'</p>';
    // counters with the comparison mode's totals
    const cm=$('anCmp').value,K=A.numbers(cm,B);
    const actMax=Math.max(...N.A),kAct=Math.max(...K.A);
    $('anCnt').innerHTML=RD.stat('Model states per GPU',gb(N.states),(mode==='EP'?(N.states/A.moeP).toFixed(1)+' bytes per parameter of the 24.9B twin':(N.states/A.P).toFixed(1)+' bytes per parameter')+' · '+cm+' '+gb(K.states))+
      RD.stat('Activations, busiest GPU',gb(actMax),'at the end of forward · '+cm+' '+gb(kAct))+
      RD.stat('Sent per GPU so far',gb1(nv+ib),(ib?'NVLink '+gb1(nv)+', InfiniBand '+gb1(ib):'NVLink')+' · whole step '+gb1(N.nv+N.ib)+' · '+cm+' '+gb1(K.nv+K.ib))+
      RD.stat('Collectives so far',String(cn),'whole step '+N.coll+' · '+cm+' '+K.coll)+
      RD.stat('Idle',(N.idle?(100*N.idle).toFixed(0)+'%':'0%')+(mode==='EP'&&B===1?' (uneven)':''),mode==='PP'?'share of the timeline · bubble (p − 1)/m = '+(100*N.bubble).toFixed(0)+'%':(N.idle?'GPUs with no data':'every GPU busy')+' · '+cm+' '+(100*K.idle).toFixed(0)+'%');
  }
  const note=()=>{$('anNote').innerHTML='<i class="nl d">derived</i> All counts for Llama 3 8B in bf16 with fp32 Adam (16 bytes per parameter), 4 GPUs on NVLink (HSDP: two servers joined by InfiniBand). Bytes are per GPU and sent, not received, from the ring formulas; activations use Korthikanti et al.\'s 34<i>sbh</i> per layer, a GPT-style estimate, and in EP mode its 15 : 19 split between attention and MLP <i class="nl i">illustrative</i>. Bars are to scale with a full bar = 280 GB. Recomputed in <code>src/recompute.py</code>.'};
  function build(){const b=$('anM');b.innerHTML=MODES.map(m=>'<button data-m="'+m+'" class="'+(m===mode?'on':'')+'">'+m+'</button>').join('');
    b.querySelectorAll('button').forEach(x=>x.addEventListener('click',()=>{const keep=ctl.i;mode=x.dataset.m;b.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===x));ST=steps();ctl.reset(ST.length);ctl.go(Math.min(keep,ST.length-1))}))}
  build();note();
  ctl=RD.anim({card:'an',ctl:'anC',n:ST.length,draw:i=>draw(Math.min(i,ST.length-1)),ms:2600,label:'Step of the training step'});
  $('anB').addEventListener('change',e=>{B=+e.target.value;ST=steps();const k=ctl.i;ctl.reset(ST.length);ctl.go(Math.min(k,ST.length-1))});
  $('anCmp').addEventListener('change',()=>ctl.redraw());
  let rw=0;addEventListener('resize',()=>{clearTimeout(rw);rw=setTimeout(()=>{if(card.offsetParent)ctl.redraw()},120)});
})();
