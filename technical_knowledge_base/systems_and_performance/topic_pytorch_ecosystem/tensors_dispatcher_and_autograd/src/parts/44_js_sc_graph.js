// ---- Scene, Fig. 4 (2026-11-12, renderer v2): the autograd graph of one block, built in forward and walked backwards. Steps: #sx-graph.
// Every node, edge, sequence number, saved tensor (with its bytes and storage id) and the backward order is the CPU record of
// src/exp/autograd_graph.py (window.TDA.eng.cpu_plain): block 0 of the running example on a leaf x of (8, 64, 256) float32, loss = mean(block(x)^2).
// Op nodes stand in forward order from left to right in two rows, attention's half behind (q, k and v's views side by side) and the MLP's half
// in front; AccumulateGrad nodes (green) stand just in front of the node that consumes their leaf. Saved activations are stacked on the node that frees them last, height proportional to bytes (weights are not drawn:
// they stay in memory anyway). "Held" is derived from the record as in 3.2's explorer: a storage is held while any node that saved it exists
// and has not run.
(function(){
  if(!document.getElementById('stg-graph')||!window.S3||!window.TDA)return;const {at,off,lerp,mix}=S3;
  const G=window.TDA.eng.cpu_plain,N=G.nodes,O=G.order,isAcc=n=>n.name==='AccumulateGrad',act=s=>!s.is_param||s.is_param==='x (input)';
  const posOf={};O.forEach((i,p)=>posOf[i]=p);
  // layout
  const ZA=-1.5,ZB=1.3,XS=.55,col=s=>s<=5?s:[6,8,10].includes(s)?6:[7,9,11].includes(s)?7:s<=19?s-4:s-20;
  const lane=s=>[6,7].includes(s)?-.6:[10,11].includes(s)?.6:0,P3={};
  N.forEach((n,i)=>{if(isAcc(n))return;const A=n.seq<=19;P3[i]=[(col(n.seq)-(A?7.5:6))*XS,0,(A?ZA:ZB)+lane(n.seq)]});
  const cons={};N.forEach((n,i)=>{if(isAcc(n))return;n.next.forEach(j=>{if(isAcc(N[j])&&(cons[j]===undefined||n.seq<N[cons[j]].seq))cons[j]=i})});
  const byCons={};Object.entries(cons).forEach(([j,i])=>(byCons[i]=byCons[i]||[]).push(+j));
  Object.entries(byCons).forEach(([i,js])=>js.forEach((j,q)=>{P3[j]=[P3[i][0]+(q-(js.length-1)/2)*.3,0,(N[i].seq<=19?ZA:ZB)+1.05]}));
  // saved activations: one box per storage, on the holder that runs last (the storage is freed then)
  const sids={};N.forEach((n,i)=>n.saved.forEach(s=>{if(!act(s))return;const o=sids[s.sid]||(sids[s.sid]={bytes:s.bytes,holders:[]});if(!o.holders.includes(i))o.holders.push(i)}));
  Object.values(sids).forEach(o=>{o.owner=o.holders.reduce((a,b)=>posOf[a]>posOf[b]?a:b);o.first=o.holders.reduce((a,b)=>N[a].seq<N[b].seq?a:b)});
  const stack={};Object.values(sids).forEach(o=>(stack[o.owner]=stack[o.owner]||[]).push(o));
  const fwd=N.map((n,i)=>i).filter(i=>!isAcc(N[i])).sort((a,b)=>N[a].seq-N[b].seq),F0=fwd.filter(i=>N[i].seq<=12).length;
  // backward stretches over the recorded order: to the weight's AccumulateGrad of the MLP output; the MLP and ln2; attention; the leaves
  const BS=[[0,posOf[6]+1],[posOf[6]+1,posOf[25]],[posOf[25],posOf[33]],[posOf[33],O.length]];
  const NAME={34:'ln1',30:'qkv',28:'split',25:'attention',19:'attn proj',17:'+ x',14:'ln2',10:'fc',8:'GELU',4:'mlp proj',2:'+',1:'pow',0:'mean: loss'};
  const LROW={30:1,25:1,17:1,10:1,4:1,1:1};const FMB=b=>(b/1e6).toFixed(2)+' MB';
  function stateAt(k,e){ // revealed nodes, nodes run, the node running now
    let nf=fwd.length,nb=0;if(k===0)nf=Math.ceil(e*F0);else if(k===1)nf=F0+Math.ceil(e*(fwd.length-F0));
    if(k>=3){const [a,b]=BS[k-3];nb=a+Math.min(b-a,Math.floor(e*(b-a)+1e-6))}
    const rev=new Set(fwd.slice(0,nf));[...rev].forEach(i=>N[i].next.forEach(j=>{if(isAcc(N[j]))rev.add(j)}));
    return {rev,ran:new Set(O.slice(0,nb)),nf,nb,cur:nb>0?O[nb-1]:(k<=1&&nf>0?fwd[nf-1]:-1)}}
  function held(s){let t=0;Object.values(sids).forEach(o=>{if(o.holders.some(i=>s.rev.has(i))&&!o.holders.every(i=>s.ran.has(i)))t+=o.bytes});return t}
  const HMAX=2097152;
  function draw(R,k,e){const P=R.P,s=stateAt(k,e),narrow=R.W<520,focus=k===2?25:null;R.grid(-5,5,-3,3,.5);
    const A=i=>focus!==null?(i===focus||N[focus].next.includes(i)?1:.22):1;
    // edges: a node points at the nodes that made its inputs (next_functions)
    N.forEach((n,i)=>n.next.forEach(j=>{if(!s.rev.has(i)||!s.rev.has(j))return;const a=P3[i],b=P3[j];
      R.line([[a[0],.17,a[2]],[b[0],.17,b[2]]],{c:P.mute,w:1,a:.45*Math.min(A(i),A(j))+(focus===i?.4:0)})}));
    // nodes
    N.forEach((n,i)=>{if(!s.rev.has(i))return;const acc=isAcc(n),p=P3[i],ran=s.ran.has(i),cur=i===s.cur,a=A(i)*(ran&&!cur?.45:1);
      const fill=cur?mix(P.paper,k>=3?P.acc:P.c2,.6):ran?mix(P.paper,P.mute,.25):acc?mix(P.paper,P.c3,.3):P.paper;
      R.box(p,acc?[.24,.2,.24]:[.34,.3,.34],{fill,a,ec:acc?P.c3:undefined,lw:acc?1.3:undefined,shadow:!acc});
      // saved activations on this node
      let y=.3;(stack[i]||[]).forEach(o=>{const born=s.rev.has(o.first),gone=o.holders.every(h=>s.ran.has(h));if(!born||gone)return;
        const h=Math.max(.03,o.bytes/HMAX*.85);R.box([p[0],y,p[2]],[.28,h,.28],{fill:mix(P.paper,P.c5,.55),a:A(i),shadow:false,lw:.7});y+=h+.015});
      if(NAME[i]!==undefined&&!(focus!==null&&A(i)<1))R.label([p[0],0,p[2]-.2],NAME[i],{mono:true,fs:12,dy:-12-14*(LROW[i]||0),c:cur?P.ink:P.mute,b:cur,a:Math.max(.55,a),wide:1})});
    // data and gradients moving
    if(k<=1&&s.cur>=0){N[s.cur].next.forEach(j=>{if(s.rev.has(j)&&!isAcc(N[j]))R.flowArc([P3[j][0],.32,P3[j][2]],[P3[s.cur][0],.32,P3[s.cur][2]],.25,{c:P.c2,r:.05,n:4,speed:1.1,a:.85})})}
    if(k>=3){O.slice(Math.max(0,s.nb-3),s.nb).forEach(i=>N[i].next.forEach(j=>R.flowArc([P3[i][0],.32,P3[i][2]],[P3[j][0],.3,P3[j][2]],.3,{c:P.acc,r:.055,n:5,speed:1.2,a:.9})))}
    if(k===2){const p=P3[25];N[25].next.forEach(j=>R.flowArc([p[0],.32,p[2]],[P3[j][0],.32,P3[j][2]],.35,{c:P.mute,r:.045,n:4,speed:.8,a:.7}));
      R.label([p[0],1.6,p[2]],'q, k, v: one (8, 64, 768) storage, 1,572,864 B',{mono:true,fs:12,b:1,c:P.c5,a:e,dy:-8,wide:1});
      R.label([p[0],1.6,p[2]],'+ output 524,288 B · log-sum-exp 8,192 B',{mono:true,fs:12,c:P.c5,a:e,dy:8,wide:1})}
    // readouts: what is held, how far the pass is
    const hb=held(s),rd=[-4.6,1.5,-3.1];
    if(k!==2)R.label(rd,'saved activations held: '+FMB(hb),{al:'left',mono:true,fs:12.5,b:1,c:P.c5,dy:-9});
    if(k!==2)R.label(rd,k<=1?'forward: '+s.nf+' of 33 operator nodes':k===2?'forward done: 46 nodes':'backward: '+s.nb+' of 46 nodes run',{al:'left',mono:true,fs:12,c:k>=3?P.acc:P.ink,dy:9});
    if(k>=3&&s.cur>=0&&!narrow){const n=N[s.cur];R.label([P3[s.cur][0],.35,P3[s.cur][2]],n.name+(n.param?' '+n.param:''),{mono:true,fs:12,b:1,c:P.acc,dy:-48,wide:1})}
  }
  const full={cam:[-.1,.72],bounds:[[-4.6,0,-3.1],[4.6,1.5,2.6]]};
  S3.stage({id:'stg-graph',list:'sx-graph',fig:'Fig. 4 · the autograd graph of one block',cam:full.cam,bounds:full.bounds,aspect:.62,dur:3200,hold:4200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,16,14,16],
    // step 3 moves in close on attention's node and what it saved
    view:k=>k===2?{cam:[-.2,.55],bounds:[[-1.6,0,-2.5],[1.6,1.6,-.3]]}:full});
})();
