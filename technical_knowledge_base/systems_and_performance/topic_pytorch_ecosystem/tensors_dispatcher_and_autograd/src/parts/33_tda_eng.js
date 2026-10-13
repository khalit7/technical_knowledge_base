// ---- Autograd engine tab (t-tda-eng): recorded graph and order, the engine's rule re-run for the queue ----
(function(){
const G=window.TDA.eng, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
let V='cpu_plain';
const short=n=>n.name==='AccumulateGrad'?'acc '+(n.param||'').replace('.weight','.w').replace('.bias','.b').replace('x (input)','x'):n.name.replace('Backward0','').replace('Backward1','').replace('ScaledDotProductFlashAttentionForCpu','SDPA(cpu)').replace('NativeLayerNorm','LayerNorm').replace('SafeSoftmax','Softmax');
function prep(v){const g=G[v], N=g.nodes;
  const dep=N.map(()=>0);N.forEach(n=>n.next.forEach(j=>dep[j]++));
  // layers: longest path from the root
  const depth=N.map(()=>0);g.order.forEach(i=>N[i].next.forEach(j=>{depth[j]=Math.max(depth[j],depth[i]+1)}));
  // replay the engine to get queue contents at each step (and check it against the record)
  const d=dep.slice(), q=[0], states=[];let cnt=0;const pushed={0:0};
  for(let s=0;s<g.order.length;s++){q.sort((a,b)=>(N[b].seq-N[a].seq)||(pushed[a]-pushed[b]));states.push({queue:q.slice(),deps:d.slice()});
    const i=q.shift();if(i!==g.order[s])states[s].mismatch=true;N[i].next.forEach(j=>{d[j]--;if(d[j]===0){q.push(j);pushed[j]=++cnt}})}
  states.push({queue:[],deps:d.slice()});
  // ops per node and recompute marks (checkpoint: calls not in the plain run's list for that node)
  const ops={};(g.ops||[]).forEach(([o,t])=>{(ops[t]=ops[t]||[]).push(o)});
  let rc={};if(v==='cpu_checkpoint'){const po={};(G.cpu_plain.ops||[]).forEach(([o,t])=>{const k=t+'|'+o;po[k]=(po[k]||0)+1});
    Object.entries(ops).forEach(([t,l])=>{const seen={};rc[t]=l.map(o=>{const k=t+'|'+o;seen[k]=(seen[k]||0)+1;return seen[k]>(po[k]||0)})})}
  // first node that unpacks a saved tensor in the checkpointed run = the node whose calls include recompute
  const rcNode=Object.keys(rc).find(t=>rc[t].some(Boolean));
  return {g,N,depth,states,ops,rc,rcNode:rcNode!==undefined?+rcNode:null};
}
const P={};['cpu_plain','cpu_checkpoint','mps_plain','mps_offload'].forEach(v=>P[v]=prep(v));
function held(p,k){ // unique activation storages saved by nodes not yet run (derived)
  const ran=new Set(p.g.order.slice(0,k));const m=new Map();
  p.N.forEach((n,i)=>{if(ran.has(i))return;n.saved.forEach(s=>{if(!s.is_param||s.is_param==='x (input)')m.set(s.sid,s.bytes)})});
  return [...m.values()].reduce((a,b)=>a+b,0)}
function draw(k){const p=P[V], N=p.N, st=p.states[Math.min(k,p.states.length-1)], ran=new Set(p.g.order.slice(0,k)), cur=k>0?p.g.order[k-1]:-1, q=new Set(st.queue);
  const W=RD.width($('tda-e-svg')), L=Math.max(...p.depth)+1, rows={};N.forEach((n,i)=>{(rows[p.depth[i]]=rows[p.depth[i]]||[]).push(i)});
  const maxr=Math.max(...Object.values(rows).map(r=>r.length)), bw=Math.min(118,(W-8)/maxr-6), rh=24, H=L*rh+6, pos={};
  Object.entries(rows).forEach(([d,r])=>{const tot=r.length*(bw+6);r.forEach((i,j)=>{pos[i]=[(W-tot)/2+j*(bw+6)+3,+d*rh+4]})});
  let s='';N.forEach((n,i)=>n.next.forEach(j=>{const a=pos[i],b=pos[j];s+='<line x1="'+(a[0]+bw/2)+'" y1="'+(a[1]+16)+'" x2="'+(b[0]+bw/2)+'" y2="'+b[1]+'" stroke="var(--line)" stroke-width="1"/>'}));
  N.forEach((n,i)=>{const [x,y]=pos[i], acc=n.name==='AccumulateGrad';const fill=i===cur?'var(--acc)':ran.has(i)?'var(--dim)':q.has(i)?'var(--hl)':'var(--bg)';
    const sb=n.saved.filter(z=>!z.is_param||z.is_param==='x (input)').reduce((a,z)=>a+z.bytes,0);
    s+='<g><title>'+E(n.name+(n.param?' '+n.param:'')+' seq '+(acc?'max':n.seq)+(sb?', saves '+U.fmt(sb)+' B':''))+'</title><rect x="'+x+'" y="'+y+'" width="'+bw+'" height="16" rx="4" fill="'+fill+'" stroke="'+(acc?'var(--good)':sb?'var(--c2)':'var(--mute)')+'" stroke-width="'+(sb?2:1)+'"/>'+
      '<text x="'+(x+bw/2)+'" y="'+(y+11.5)+'" text-anchor="middle"'+(i===cur?' fill="var(--bg)"':'')+'>'+E(short(n)).slice(0,Math.max(4,Math.floor(bw/5.6)))+'</text></g>'});
  $('tda-e-svg').innerHTML=RD.svg(W,H,s,'Autograd graph of one block');
  $('tda-e-q').innerHTML=st.queue.length?st.queue.map((i,j)=>'<div'+(j===0?' class="top"':'')+'><span>'+E(short(N[i]))+'</span><span>'+(N[i].name==='AccumulateGrad'?'seq max':'seq '+N[i].seq)+'</span></div>').join(''):'<span class="mute">empty</span>';
  const ops=p.ops[cur]||[], rc=p.rc[cur]||[];
  $('tda-e-opl').textContent=p.g.ops?'aten calls made while this node ran'+(rc.some(Boolean)?' (red: the block rerun by checkpointing)':''):'aten calls per node: recorded on the CPU only';
  $('tda-e-ops').innerHTML=ops.map((o,j)=>'<span'+(rc[j]?' class="rc"':'')+'>'+E(o)+'</span>').join('')||'<span class="mute">'+(cur<0?'press play':'none')+'</span>';
  const n=cur>=0?N[cur]:null;
  $('tda-e-cap').innerHTML=!n?'<div class="t">Before backward</div><p>'+N.length+' nodes; the root (MeanBackward0) is the only ready node. '+(V==='cpu_checkpoint'?'Checkpointed: forward kept only the block input and output.':V==='mps_offload'?'Every saved tensor was copied to host memory by the pack hook during forward.':'')+'</p>':
    '<div class="t">'+k+'. '+E(n.name)+(n.param?' for '+E(n.param):'')+'</div><p>'+(n.name==='AccumulateGrad'?'Adds the arriving gradient into .grad. Runs as soon as ready: its sequence number is the maximum.':'Sequence number '+n.seq+'. '+(n.saved.length?'Unpacks '+n.saved.map(z=>z.name).join(', ')+(p.rc[cur]&&p.rc[cur].some(Boolean)?': not kept by checkpointing, so the block is rerun first.':V==='mps_offload'?': copied back from host memory.':'.'):'Saves nothing: its gradient needs no inputs.')+' Then sends gradients to '+n.next.length+' node'+(n.next.length===1?'':'s')+'.')+'</p>';
  const opsSoFar=p.g.ops?p.g.ops.filter(([,t])=>t==='start'||p.g.order.slice(0,k).includes(t)).length:null;
  let h=V==='cpu_checkpoint'&&(p.rcNode===null||!ran.has(p.rcNode))?0:held(p,k);
  const after=V.startsWith('cpu')?U.fmt(p.g.live)+' B live':U.fmt(p.g.dev)+' B on MPS';
  $('tda-e-cnt').innerHTML=RD.stat('node',k+' / '+N.length)+RD.stat('after forward (measured)',after)+RD.stat(V==='mps_offload'?'saved bytes held on the host':'saved bytes still held',U.fmt(V==='mps_offload'?held(p,k):h),'<span class="der">derived</span>')+(opsSoFar!==null?RD.stat('aten calls so far',opsSoFar+' / '+p.g.ops.length):RD.stat('engine thread',p.g.caller?'caller':'MPS worker thread','measured'))+RD.stat('replayed queue matches record',p.states.some(z=>z.mismatch)?'no':'yes');
}
const an=RD.anim({card:'tda-e-card',ctl:'tda-e-ctl',n:P[V].N.length+1,draw,ms:800,label:'Node'});
RD.seg($('tda-e-seg'),m=>{V=m;an.reset(P[V].N.length+1);an.play()});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-tda-eng']=[()=>an.redraw()];
addEventListener('resize',()=>{const t=$('t-tda-eng');if(t&&!t.hidden)an.redraw()});
})();
