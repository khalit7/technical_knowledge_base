// ---- Reading 3: the autograd graph built in forward, then run by the engine in backward (moved from the old Autograd engine tab) ----
// Recorded graph and backward order (engine.json); the ready queue is the engine's rule re-run on that graph and checked against the record.
(function(){
const G=window.TDA.eng, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
if(!$('tda-e-card'))return;
let V='cpu_plain';
const isAcc=n=>n.name==='AccumulateGrad';
const short=n=>isAcc(n)?'acc '+(n.param||'').replace('.weight','.w').replace('.bias','.b').replace('x (input)','x'):n.name.replace('Backward0','').replace('Backward1','').replace('ScaledDotProductFlashAttentionForCpu','SDPA(cpu)').replace('NativeLayerNorm','LayerNorm').replace('SafeSoftmax','Softmax');
const act=s=>!s.is_param||s.is_param==='x (input)';
function prep(v){const g=G[v], N=g.nodes;
  const dep=N.map(()=>0);N.forEach(n=>n.next.forEach(j=>dep[j]++));
  const depth=N.map(()=>0);g.order.forEach(i=>N[i].next.forEach(j=>{depth[j]=Math.max(depth[j],depth[i]+1)}));
  const d=dep.slice(), q=[0], states=[];let cnt=0;const pushed={0:0};
  for(let s=0;s<g.order.length;s++){q.sort((a,b)=>(N[b].seq-N[a].seq)||(pushed[a]-pushed[b]));states.push({queue:q.slice()});
    const i=q.shift();if(i!==g.order[s])states[s].mismatch=true;N[i].next.forEach(j=>{d[j]--;if(d[j]===0){q.push(j);pushed[j]=++cnt}})}
  states.push({queue:[]});
  const ops={};(g.ops||[]).forEach(([o,t])=>{(ops[t]=ops[t]||[]).push(o)});
  let rc={};if(v==='cpu_checkpoint'){const po={};(G.cpu_plain.ops||[]).forEach(([o,t])=>{const k=t+'|'+o;po[k]=(po[k]||0)+1});
    Object.entries(ops).forEach(([t,l])=>{const seen={};rc[t]=l.map(o=>{const k=t+'|'+o;seen[k]=(seen[k]||0)+1;return seen[k]>(po[k]||0)})})}
  const rcNode=Object.keys(rc).find(t=>rc[t].some(Boolean));
  const fwd=N.map((n,i)=>i).filter(i=>!isAcc(N[i])).sort((a,b)=>N[a].seq-N[b].seq);
  const p={v,g,N,depth,states,ops,rc,rcNode:rcNode!==undefined?+rcNode:null,fwd,F:fwd.length,B:g.order.length};
  p.series=[];for(let k=0;k<=p.F+p.B;k++)p.series.push(held(p,k));
  return p}
function revealed(p,k){const r=new Set(p.fwd.slice(0,Math.min(k,p.F)));if(k>=p.F)p.N.forEach((n,i)=>r.add(i));else [...r].forEach(i=>p.N[i].next.forEach(j=>{if(isAcc(p.N[j]))r.add(j)}));return r}
function held(p,k){ // unique activation storages saved by nodes that exist and have not run (derived)
  const fw=k<=p.F, b=Math.max(0,k-p.F);
  if(p.v==='cpu_checkpoint'&&(fw||p.rcNode===null||!p.g.order.slice(0,b).includes(p.rcNode)))return 0;
  const ex=revealed(p,k), ran=new Set(p.g.order.slice(0,b)), m=new Map();
  p.N.forEach((n,i)=>{if(!ex.has(i)||ran.has(i))return;n.saved.forEach(s=>{if(act(s))m.set(s.sid,s.bytes)})});
  return [...m.values()].reduce((a,c)=>a+c,0)}
const P={};['cpu_plain','cpu_checkpoint','mps_plain','mps_offload'].forEach(v=>P[v]=prep(v));
function drawMem(p,k){const el=$('tda-e-mem'), W=RD.width(el), H=96, L=4, R=W-4, T=22, Bt=H-18, n=p.series.length-1, mx=Math.max(1,...p.series);
  const X=i=>L+(R-L)*i/n, Y=v=>Bt-(Bt-T)*v/mx;let s='';
  s+='<rect x="'+L+'" y="'+T+'" width="'+(X(p.F)-L)+'" height="'+(Bt-T)+'" fill="var(--soft)"/>';
  s+='<path d="'+p.series.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ')+'" stroke="var(--c2)" stroke-width="2" fill="none"/>';
  s+='<line x1="'+X(k)+'" y1="'+(T-4)+'" x2="'+X(k)+'" y2="'+Bt+'" stroke="var(--acc)" stroke-width="2"/>';
  s+='<text x="'+L+'" y="12" class="b">'+(V==='mps_offload'?'saved activations held on the host':'saved activations held')+': '+U.mb(p.series[k])+'</text>';
  s+='<text x="'+(L+4)+'" y="'+(H-4)+'" class="m">forward</text><text x="'+(X(p.F)+4)+'" y="'+(H-4)+'" class="m">backward</text>';
  el.innerHTML=RD.svg(W,H,s,'Saved activation bytes over forward and backward')}
function draw(k){const p=P[V], N=p.N, F=p.F, fw=k<=F, b=Math.max(0,k-F), st=p.states[Math.min(b,p.states.length-1)];
  const ex=revealed(p,k), ran=new Set(p.g.order.slice(0,b)), cur=fw?(k>0?p.fwd[k-1]:-1):(b>0?p.g.order[b-1]:-1), q=new Set(fw?[]:st.queue);
  const el=$('tda-e-svg'), W=RD.width(el), rows={};N.forEach((n,i)=>{(rows[p.depth[i]]=rows[p.depth[i]]||[]).push(i)});
  const L=Math.max(...p.depth)+1, maxr=Math.max(...Object.values(rows).map(r=>r.length)), bw=Math.min(130,(W-8)/maxr-6), rh=23, H=L*rh+6, pos={};
  Object.entries(rows).forEach(([d,r])=>{const tot=r.length*(bw+6);r.forEach((i,j)=>{pos[i]=[(W-tot)/2+j*(bw+6)+3,+d*rh+4]})});
  let s='';N.forEach((n,i)=>n.next.forEach(j=>{if(!ex.has(i)||!ex.has(j))return;const a=pos[i],c=pos[j];s+='<line x1="'+(a[0]+bw/2)+'" y1="'+(a[1]+17)+'" x2="'+(c[0]+bw/2)+'" y2="'+c[1]+'" stroke="var(--mute)" stroke-opacity=".55" stroke-width="1"/>'}));
  const chars=Math.max(4,Math.floor((bw-6)/6.4));
  N.forEach((n,i)=>{const [x,y]=pos[i], acc=isAcc(n), here=ex.has(i);
    const fill=i===cur?'var(--acc)':ran.has(i)?'var(--dim)':q.has(i)?'var(--hl)':'var(--bg)';
    const sb=n.saved.filter(act).reduce((a,z)=>a+z.bytes,0);
    s+='<g'+(here?'':' opacity=".18"')+'><title>'+E(n.name+(n.param?' '+n.param:'')+' seq '+(acc?'max':n.seq)+(sb?', saves '+U.fmt(sb)+' B':''))+'</title><rect x="'+x+'" y="'+y+'" width="'+bw+'" height="17" rx="4" fill="'+fill+'" stroke="'+(acc?'var(--good)':sb?'var(--c2)':'var(--mute)')+'" stroke-width="'+(sb||acc?2:1)+'"'+(here?'':' stroke-dasharray="3 3"')+'/>'+
      '<text x="'+(x+bw/2)+'" y="'+(y+12.5)+'" text-anchor="middle"'+(i===cur?' class="on"':'')+'>'+E(short(n).slice(0,chars))+'</text></g>'});
  el.innerHTML=RD.svg(W,H,s,'Autograd graph of one block');
  drawMem(p,k);
  $('tda-e-q').innerHTML=fw?'<span class="mute">empty: the queue exists only during backward</span>':st.queue.length?st.queue.map((i,j)=>'<div'+(j===0?' class="top"':'')+'><span>'+E(short(N[i]))+'</span><span>'+(isAcc(N[i])?'seq max':'seq '+N[i].seq)+'</span></div>').join(''):'<span class="mute">empty</span>';
  const ops=fw?[]:(p.ops[cur]||[]), rc=fw?[]:(p.rc[cur]||[]);
  $('tda-e-opl').textContent=fw?'aten calls per node: recorded in backward':p.g.ops?'aten calls made while this node ran'+(rc.some(Boolean)?' (red: the block rerun by checkpointing)':''):'aten calls per node: recorded on the CPU only';
  $('tda-e-ops').innerHTML=ops.map((o,j)=>'<span'+(rc[j]?' class="rc"':'')+'>'+E(o)+'</span>').join('')||'<span class="mute">'+(fw?'none yet':cur<0?'step to begin':'none')+'</span>';
  const n=cur>=0?N[cur]:null;
  let cap;
  if(k===0)cap='<div class="t">Before forward</div><p>No graph yet. Step through forward: each operator with an input that requires grad creates one node, in sequence-number order. '+(V==='cpu_checkpoint'?'Checkpointed: the nodes are created, but saved tensors are only placeholders.':V==='mps_offload'?'Here a pack hook copies every saved tensor to host memory as it is saved.':'')+'</p>';
  else if(fw)cap='<div class="t">Forward '+k+' of '+F+': '+E(n.name)+' created, sequence number '+n.seq+'</div><p>'+(n.saved.length?'Saves '+n.saved.map(z=>z.name+(act(z)?'':' (a weight, no extra memory)')).join(', ')+'.':'Saves nothing: its gradient needs no inputs.')+' Edges to '+n.next.length+' earlier node'+(n.next.length===1?'':'s')+(n.next.some(j=>isAcc(N[j]))?', including the AccumulateGrad of a leaf':'')+'.'+(k===F?' Forward done: the loss\'s grad_fn is the root, and backward() starts there.':'')+'</p>';
  else cap='<div class="t">Backward '+b+' of '+p.B+': '+E(n.name)+(n.param?' for '+E(n.param):'')+'</div><p>'+(isAcc(n)?'Adds the arriving gradient into .grad. Runs as soon as ready: its sequence number is the maximum.':'Sequence number '+n.seq+'. '+(n.saved.length?'Unpacks '+n.saved.map(z=>z.name).join(', ')+(p.rc[cur]&&p.rc[cur].some(Boolean)?': not kept by checkpointing, so the block is rerun first.':V==='mps_offload'?': copied back from host memory.':', then frees it.'):'Saves nothing.')+' Sends gradients to '+n.next.length+' node'+(n.next.length===1?'':'s')+'.')+'</p>';
  $('tda-e-cap').innerHTML=cap;
  const opsSoFar=p.g.ops&&!fw?p.g.ops.filter(([,t])=>t==='start'||p.g.order.slice(0,b).includes(t)).length:null;
  const after=V.startsWith('cpu')?U.fmt(p.g.live)+' B live':U.fmt(p.g.dev)+' B on MPS';
  $('tda-e-cnt').innerHTML=RD.stat('phase',fw?'forward':'backward',fw?k+' / '+F+' nodes created':b+' / '+p.B+' nodes run')+RD.stat('after forward (measured)',after)+RD.stat(V==='mps_offload'?'saved bytes on the host':'saved bytes still held',U.fmt(p.series[k]),'<span class="der">derived</span>')+(p.g.ops?RD.stat('aten calls in backward',opsSoFar===null?'0 / '+p.g.ops.length:opsSoFar+' / '+p.g.ops.length):RD.stat('engine thread',p.g.caller?'caller':'MPS worker thread','measured'))+RD.stat('replayed queue matches record',p.states.some(z=>z.mismatch)?'no':'yes');
}
const steps=()=>P[V].F+P[V].B+1;
const an=RD.anim({card:'tda-e-card',ctl:'tda-e-ctl',n:steps(),draw,ms:700,label:'Step'});
RD.seg($('tda-e-seg'),m=>{V=m;an.reset(steps())});
RD.onResize(()=>an.redraw());
})();
