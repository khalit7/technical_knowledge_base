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
// ---- The steps of one training step under each split (four 8,192-token sequences on four GPUs), for the 3D stages in 32_js_sc_gpu.js.
// Pure data, no DOM: src/mk_lists.mjs writes each mode's titles and texts into its step list (ol.sx) as static text, and check_stages.mjs
// confirms the lists still equal what this function returns. Per step: t title, p text, ph phase (f forward, b backward, o optimiser),
// row the model rows working ('all' or a row), coll the collective drawn, nv/ib bytes sent on NVLink/InfiniBand, cn collectives, act the share
// of activations held, gather (ZeRO-3/HSDP: a layer gathered just in time), gantt (PP: time drawn so far).
window.DTSTEP=(function(){
  const A=window.ANIM,n=4,gb=v=>(v/1e9>=100?(v/1e9).toFixed(0):(v/1e9).toFixed(1))+' GB',gb1=v=>(v/1e9).toFixed(v/1e9<1?2:1)+' GB';
  // 1F1B for p stages and m micro-batches (F = 1, B = 2 time units), list-scheduled
  function sched(p,m){const F=1,Bt=2,ops=[];
    for(let i=0;i<p;i++){const w=Math.min(p-i-1,m),seq=[];let f=0,b=0;
      for(let k=0;k<w;k++)seq.push(['F',f++]);while(f<m){seq.push(['F',f++]);seq.push(['B',b++])}while(b<m)seq.push(['B',b++]);ops.push(seq)}
    const end={},st=[];for(let i=0;i<p;i++)st.push([]);
    let free=Array(p).fill(0),idx=Array(p).fill(0),left=p*2*m,guard=0;
    while(left>0&&guard++<1e4){for(let i=0;i<p;i++){if(idx[i]>=ops[i].length)continue;const [k,j]=ops[i][idx[i]];
      let dep=k==='F'?(i===0?0:end['F'+(i-1)+'_'+j]):(i===p-1?end['F'+i+'_'+j]:end['B'+(i+1)+'_'+j]);
      if(dep===undefined)continue;const s=Math.max(free[i],dep),d=k==='F'?F:Bt;end[k+i+'_'+j]=s+d;st[i].push({k,j,s,d});free[i]=s+d;idx[i]++;left--}}
    const T=Math.max(...free);return {st,T,busy:m*(F+Bt)}}
  function steps(mode){const N=A.numbers(mode,4),S=[];
    const add=(t,p,o)=>S.push(Object.assign({t,p,ph:null,row:null,coll:null,nv:0,ib:0,cn:0,act:0},o||{}));
    if(mode==='DP'){
      add('Setup: four full copies','Every GPU holds the whole model, its gradients and its optimiser state: 16 bytes per parameter, 128.5 GB, past the 80 GB line of an H100. This is the memory ceiling the other splits remove. Each GPU gets its own sequence.');
      add('Forward','Each GPU runs its own sequence through all 32 layers and keeps the activations for backward, so the green slab grows. No communication.',{ph:'f',row:'all',act:1});
      add('Backward, with the all-reduce starting','Gradients appear from the last layer back. DDP groups them into buckets of 25 MiB and starts an all-reduce on each bucket as soon as it is ready, so the dots start flowing round the ring while backward is still running.',{ph:'b',row:'all',coll:'ar',nv:N.nv/2,act:.5});
      add('All-reduce finishes','Every GPU now holds the average gradient. A ring all-reduce sends 2(n − 1)/n of the buffer per GPU: 1.5 × 16.1 GB = 24.1 GB each, whatever the number of GPUs.',{coll:'ar',nv:N.nv/2,cn:1});
      add('Optimiser step','Every GPU applies the same update to its own copy, so the four copies stay identical. Four times the optimiser work and memory for one result: the redundancy ZeRO removes.',{ph:'o'});
    } else if(mode==='ZeRO-1'||mode==='ZeRO-2'){const z2=mode==='ZeRO-2';
      add('Setup: '+(z2?'optimiser state and gradients sharded':'optimiser state sharded'),z2?'Weights stay whole; each GPU keeps a quarter of the gradients and of the optimiser state: 2 + 14/4 = 5.5 bytes per parameter, 44.2 GB.':'Weights and gradients stay whole; each GPU keeps a quarter of the 12 bytes of fp32 master weights and Adam moments: 2 + 2 + 12/4 = 7 bytes per parameter, 56.2 GB. The purple slab is a quarter of DP\'s.');
      add('Forward','As in DP: each GPU runs its own sequence through the whole model.',{ph:'f',row:'all',act:1});
      if(z2)add('Backward with reduce-scatter','Each bucket is reduce-scattered as soon as it is ready: GPU i receives the summed gradients for its quarter only and frees the rest. (n − 1)/n × 16.1 GB = 12.0 GB sent per GPU.',{ph:'b',row:'all',coll:'rs',nv:N.nv/2,cn:1,act:.5});
      else{add('Backward','Full gradients are computed and held on every GPU.',{ph:'b',row:'all',act:.5});
        add('Reduce-scatter of the gradients','Instead of an all-reduce, each GPU receives the sum only for its own quarter: (n − 1)/n × 16.1 GB = 12.0 GB sent per GPU, half an all-reduce.',{coll:'rs',nv:N.nv/2,cn:1});}
      add('Optimiser step on a quarter','Each GPU updates only its quarter of the fp32 master weights with its quarter of the Adam state.',{ph:'o'});
      add('All-gather of the updated weights','Each GPU broadcasts its updated bf16 quarter; another 12.0 GB. Reduce-scatter plus all-gather is exactly an all-reduce, so ZeRO-1 and 2 cost the same 24.1 GB as DP while holding 56.2 or 44.2 GB instead of 128.5.',{coll:'ag',nv:N.nv/2,cn:1});
    } else if(mode==='ZeRO-3'){
      add('Setup: everything sharded','Each GPU holds a quarter of every layer\'s weights, gradients and optimiser state: 16/4 = 4 bytes per parameter, 32.1 GB. This is FSDP\'s default (FULL_SHARD).');
      add('Forward, layer by layer','Before each layer runs, its quarters are all-gathered into a full copy (the pale layer climbing the stack), used, and freed. One layer\'s full weights exist at a time. 32 all-gathers, (n − 1)/n × 16.1 GB = 12.0 GB sent per GPU.',{ph:'f',row:'all',coll:'ag',nv:N.nv/3,cn:32,act:1,gather:1});
      add('Backward: gather again, then reduce-scatter','Each layer is all-gathered again for backward (12.0 GB), and its gradients are reduce-scattered straight away so each GPU keeps only its quarter (12.0 GB).',{ph:'b',row:'all',coll:'rs',nv:2*N.nv/3,cn:64,act:.5,gather:1});
      add('Optimiser step, no final gather','Each GPU updates its own quarter. The weights stay sharded until the next forward gathers them. Total 36.1 GB per GPU: 1.5 times DP, the price of holding a quarter of the weights.',{ph:'o'});
    } else if(mode==='HSDP'){
      add('Setup: shard inside the server, replicate across','Two servers of two GPUs. Inside each server the model is sharded in halves (8 bytes per parameter, 64.2 GB); the two servers are replicas of each other. A 2-D device mesh: shard on one axis, replicate on the other.');
      add('Forward: all-gather over NVLink','Each layer is gathered from its two halves inside the server, just in time: (2 − 1)/2 × 16.1 GB = 8.0 GB per GPU, all on NVLink.',{ph:'f',row:'all',coll:'ring2',nv:N.nv/3,cn:32,act:1,gather:1});
      add('Backward: gather and reduce-scatter over NVLink','Gather again for backward, then reduce-scatter the gradients inside the server: 16.1 GB more on NVLink.',{ph:'b',row:'all',coll:'ring2',nv:2*N.nv/3,cn:64,act:.5,gather:1});
      add('All-reduce across servers','Only now does traffic cross InfiniBand: each GPU all-reduces its half of the gradients with its twin in the other server, 8.0 GB. Plain ZeRO-3 over all four GPUs would push its whole 36.1 GB through a ring that crosses the servers.',{coll:'pair',ib:N.ib,cn:1});
      add('Optimiser step','Each GPU updates its half; the twins stay identical. A failed server leaves a complete replica behind, which is what fault-tolerant HSDP (torchft) builds on.',{ph:'o'});
    } else if(mode==='TP'){
      add('Setup: every matrix cut in four','Each GPU holds a quarter of every weight matrix: query, key and value heads and the first feed-forward matrices by columns, the attention output and second feed-forward matrix by rows. 4 bytes per parameter, 32.1 GB. The four GPUs act as one model replica, so the whole batch, four 8,192-token sequences, goes through all four.');
      add('Layer 1, attention','Column-parallel QKV gives each GPU 8 of the 32 heads, so attention runs locally. The row-parallel output projection leaves a partial sum on each GPU: one all-reduce of the batch\'s hidden states, '+gb1(2*3/4*A.X)+' per GPU. With sequence parallelism this is a reduce-scatter plus an all-gather of the same size, and LayerNorm activations are split by tokens.',{ph:'f',row:0,coll:'ar',nv:2*3/4*A.X,cn:1,act:.03});
      add('Layer 1, feed-forward','Column-parallel W1 and W3, the SwiGLU applied locally (the reason for the column-then-row pairing: no sync in between), row-parallel W2, then the second all-reduce.',{ph:'f',row:0,coll:'ar',nv:2*3/4*A.X,cn:1,act:.06});
      add('Layers 2 to 32','Two all-reduces per layer: 64 in the forward pass, 25.8 GB per GPU.',{ph:'f',row:'all',coll:'ar',nv:62*1.5*A.X,cn:62,act:1});
      add('Backward','The mirror image: two all-reduces of input gradients per layer, 64 more, 25.8 GB. Each GPU computes the weight gradients for its own slices only.',{ph:'b',row:'all',coll:'ar',nv:64*1.5*A.X,cn:64,act:.5});
      add('Optimiser step, no gradient sync','There is one replica, so nothing to average. Total 51.5 GB per GPU, more than any other split, in 128 small, latency-bound pieces inside every layer: tensor parallelism only works on NVLink.',{ph:'o'});
    } else if(mode==='PP'){const m=4,G=sched(n,m),T=G.T,mb=A.X/m;
      const cut=[0,G.st[n-1][0].s+1,G.st[0].filter(o=>o.k==='F').slice(-1)[0].s+1,T];
      const sent=t=>{let s=0;for(let i=0;i<n;i++)for(const o of G.st[i]){if(o.s+o.d>t)continue;if((o.k==='F'&&i<n-1)||(o.k==='B'&&i>0))s+=mb}return s/(2*(n-1))*2};
      add('Setup: eight layers per GPU','GPU 0 holds layers 1 to 8 with the embedding, GPU 3 layers 25 to 32 with the output head: 4 bytes per parameter of the whole model each, 32.1 GB (the end stages a little more). The batch is cut into four micro-batches, one sequence each; the timeline on the floor fills as the step runs.',{gantt:0});
      add('Warm-up','Micro-batch 1 enters stage 1, then its activations are sent to stage 2, and so on. The later stages wait: the start of the bubble.',{ph:'f',coll:'p2p',nv:sent(cut[1]),cn:n-1,gantt:cut[1],act:.5});
      add('Steady state: one forward, one backward','1F1B: once the last stage starts backward, each stage alternates a forward and a backward, so it never holds more than p micro-batches of activations (GPipe holds all m). Gradients flow back by send and receive.',{ph:'b',coll:'p2p',nv:sent(cut[2])-sent(cut[1]),cn:8,gantt:cut[2],act:1});
      add('Cool-down','The pipeline drains; the first stage waits for the last gradients. Idle share of the timeline: (p − 1)/(m + p − 1) = '+(100*N.idle).toFixed(0)+'%; in Megatron\'s terms the bubble is (p − 1)/m = '+(100*N.bubble).toFixed(0)+'% of the ideal time.',{ph:'b',coll:'p2p',nv:sent(cut[3])-sent(cut[2]),cn:(2*(n-1)*m)-(n-1)-8,gantt:cut[3],act:0});
      add('Optimiser step','Each stage updates its own layers; nothing to average. The traffic was tiny, '+gb1(N.nv)+' per GPU at most, one activation per micro-batch per boundary: pipeline parallelism is the split to put on slow links.',{ph:'o',gantt:cut[3]});
    } else if(mode==='EP'){
      add('Setup: the MoE twin, one expert per GPU','Every feed-forward block is now four experts; GPU i holds expert i of every layer (orange, the back half of its stack) and a full copy of attention, embeddings and norms (the front half). 128.5 GB per GPU, the same as dense DP, while the model holds 24.9B parameters: experts add parameters without adding memory per GPU. Each GPU holds its own sequence.');
      add('Layer 1: attention and the router','Attention runs where the tokens are. The router picks one expert per token; with balanced routing three quarters of each GPU\'s tokens belong to experts on other GPUs.',{ph:'f',row:0,act:.03});
      add('All-to-all dispatch','Every GPU sends each token to the GPU holding its expert: 3/4 × 8,192 tokens × 4,096 × 2 bytes = '+gb1(.75*A.x8)+' per GPU.',{ph:'f',row:0,coll:'a2a',nv:.75*A.x8,cn:1,act:.04});
      add('Experts, then all-to-all combine','Each expert processes the tokens it received, then a second all-to-all returns the outputs to where their tokens live.',{ph:'f',row:0,coll:'a2a',nv:.75*A.x8,cn:1,act:.06});
      add('Layers 2 to 32','Two all-to-alls per MoE layer: 64 in the forward pass.',{ph:'f',row:'all',coll:'a2a',nv:62*.75*A.x8,cn:62,act:1});
      add('Backward','The same route in reverse: 64 more all-to-alls carry gradients to the experts and back.',{ph:'b',row:'all',coll:'a2a',nv:64*.75*A.x8,cn:64,act:.5});
      add('All-reduce of the shared parts','Attention, embeddings and norms are replicated, so their gradients (2.39B parameters) are all-reduced as in DP: 7.2 GB per GPU. Expert gradients stay where their expert lives.',{coll:'ar',nv:2*3/4*2*A.nonFFN,cn:1});
      add('Optimiser step','Each GPU updates its experts and its copy of the shared parts. Total '+gb1(N.nv)+' per GPU; at DeepSeek-V3\'s scale the all-to-alls cross servers, which is why it limits each token to 4 nodes.',{ph:'o'});
    } else if(mode==='CP'){const kv=3/4*2*32768*1024*2;
      add('Setup: every sequence cut in eight','Each sequence is cut into 2 × 4 = 8 chunks and GPU i keeps chunks i and 7 − i (the two lit chunks in each of its four rows), so every GPU gets one early and one late chunk and the causal mask gives each the same work (Llama 3\'s load balancing). Weights are whole on every GPU: 128.5 GB. Context parallelism cuts activations, not weights; in practice it is combined with FSDP or TP.');
      add('Layer 1: gather keys and values','Each GPU computes Q, K, V for its own tokens, then all-gathers K and V (Llama 3\'s variant; Ring Attention passes the blocks round a ring instead). With grouped-query attention K and V are 4 times smaller than Q: '+gb1(kv)+' per GPU per layer.',{ph:'f',row:0,coll:'ag',nv:kv,cn:1,act:.03});
      add('Attention for local queries, then the feed-forward','Each GPU computes attention for its own query chunks against all keys; the feed-forward block works token by token and needs nothing from the others.',{ph:'f',row:0,act:.06});
      add('Layers 2 to 32','One all-gather per layer.',{ph:'f',row:'all',coll:'ag',nv:31*kv,cn:31,act:1});
      add('Backward','Gradients of K and V are reduce-scattered back to the GPUs that own those tokens: 32 reduce-scatters, '+gb1(32*kv)+'.',{ph:'b',row:'all',coll:'rs',nv:32*kv,cn:32,act:.5});
      add('All-reduce of the weight gradients','Every GPU computed gradients for all weights from its own tokens, so they are averaged as in DP: 24.1 GB. Total '+gb1(N.nv)+'.',{coll:'ar',nv:2*3/4*2*A.P,cn:1});
      add('Optimiser step','Identical update everywhere. Each GPU held a quarter of the activations, '+gb(A.totA/4)+', whether the batch was four sequences or one.',{ph:'o'});
    }
    return S}
  return {steps,sched,gb,gb1}})();
