// ---- Distributed lab (t-dist), part 3: DTensor explorer, tensor parallel, pipelining, checkpoints, hangs, timing ----
(function(){
const J=window.DSTJS,D=J.D,$=J.$,MB=J.MB,fmt=J.fmt,esc=J.esc;

// ---------- 7. DTensor: local values derived from placements (checked against every recorded rank by src/dist/check_page.mjs) ----------
const G=[...Array(16).keys()],R=4,C=4;
// chunk ranges like torch.chunk
function chunk(lo,hi,n,k){const L=hi-lo,cs=Math.ceil(L/n),a=Math.min(hi,lo+k*cs),b=Math.min(hi,lo+(k+1)*cs);return [a,b]}
// the [row range, col range] a mesh coordinate holds for a list of placements (P and R keep the full extent)
function box(pl,coord,shape){let r=[0,R],c=[0,C];pl.forEach((p,i)=>{if(p==='S0')r=chunk(r[0],r[1],shape[i],coord[i]);else if(p==='S1')c=chunk(c[0],c[1],shape[i],coord[i])});return [r,c]}
// Partial source pieces: element kept on mesh coordinate c[i] if its flat index in the local tensor is c[i] mod n
function srcLocal(pl,coord,shape){const [r,c]=box(pl,coord,shape),w=c[1]-c[0];const out=[];
  for(let i=r[0];i<r[1];i++){const row=[];for(let j=c[0];j<c[1];j++){let v=G[i*C+j],flat=(i-r[0])*w+(j-c[0]);
    pl.forEach((p,k)=>{if(p==='P'&&flat%shape[k]!==coord[k])v=0});row.push(v)}out.push(row)}return out}
// value of global element (i,j) as held by a source rank at coordinate cc
function srcVal(spl,cc,shape,i,j){const [r,c]=box(spl,cc,shape);if(i<r[0]||i>=r[1]||j<c[0]||j>=c[1])return null;return srcLocal(spl,cc,shape)[i-r[0]][j-c[0]]}
function dstLocal(spl,dpl,coord,shape){
  // value of (i,j) on the destination rank = sum of what source ranks held for it, over: every source coordinate on a dim
  // that was Partial and is reduced, or Shard (one holder); this rank's own coordinate where the result stays Partial or the
  // source was Replicate. A Shard -> Partial dim keeps only what this rank held (zeros elsewhere).
  const [r,c]=box(dpl,coord,shape);const out=[];
  for(let i=r[0];i<r[1];i++){const row=[];for(let j=c[0];j<c[1];j++){let v=0;
    const rec=(d,cc)=>{if(d===shape.length){const sv=srcVal(spl,cc,shape,i,j);if(sv!=null)v+=sv;return}
      if(dpl[d]==='P'||spl[d]==='R'){cc[d]=coord[d];rec(d+1,cc)}else for(let q=0;q<shape[d];q++){cc[d]=q;rec(d+1,cc)}};
    rec(0,[]);row.push(v)}out.push(row)}return out}
window.DST_DERIVE={srcLocal,dstLocal};
(function(){
  const M=D.dtensor,PL=['S0','S1','R','P'],NM={S0:'Shard(0)',S1:'Shard(1)',R:'Replicate()',P:'Partial()'};
  let mi=1,src=['S0'],dst=['R'];
  const OWN=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function selects(){const m=M[mi],nd=m.shape.length;
    while(src.length<nd)src.push('R');while(dst.length<nd)dst.push('R');src=src.slice(0,nd);dst=dst.slice(0,nd);
    const sel=(id,v)=>'<select id="'+id+'">'+PL.map(p=>'<option value="'+p+'"'+(p===v?' selected':'')+'>'+NM[p]+'</option>').join('')+'</select>';
    let h='<label>Mesh <select id="dst-dt-m">'+M.map((x,i)=>'<option value="'+i+'"'+(i===mi?' selected':'')+'>'+x.mesh+'</option>').join('')+'</select></label>';
    for(let i=0;i<nd;i++)h+='<label>from'+(nd>1?' (mesh dim '+i+')':'')+' '+sel('dst-dt-s'+i,src[i])+'</label>';
    for(let i=0;i<nd;i++)h+='<label>to'+(nd>1?' (mesh dim '+i+')':'')+' '+sel('dst-dt-d'+i,dst[i])+'</label>';
    $('dst-dt-sel').innerHTML=h}
  $('dst-dt-sel').addEventListener('change',e=>{const id=e.target.id;
    if(id==='dst-dt-m'){mi=+e.target.value}else if(id.startsWith('dst-dt-s'))src[+id.slice(8)]=e.target.value;else if(id.startsWith('dst-dt-d'))dst[+id.slice(8)]=e.target.value;
    if(id==='dst-dt-m')selects();draw()});
  const mat=(v,ownCol)=>'<div class="dst-mat" style="grid-template-columns:repeat('+Math.max(1,(v[0]||[]).length)+',auto)">'+(v.length&&v[0].length?v.map(r=>r.map(x=>'<span class="dst-cell'+(x===0?' e':'')+'" style="border-color:'+ownCol+'">'+x+'</span>').join('')).join(''):'<span class="small mute">empty</span>')+'</div>';
  function draw(){const m=M[mi],key=src.join(','),dk=dst.join(','),p=m.pairs.find(q=>q.s===key&&q.d===dk);
    const coords=m.coords,shape=m.shape;
    const col=(ttl,f)=>'<div class="card" style="margin:0"><div class="small"><b>'+ttl+'</b></div><div class="dst-ranks">'+coords.map((cc,r)=>'<div class="dst-rank"><div class="h">rank '+r+(shape.length>1?' ('+cc.join(', ')+')':'')+'</div>'+f(cc,r)+'</div>').join('')+'</div></div>';
    let out=col('Before: '+src.map(x=>NM[x]).join(', '),cc=>mat(srcLocal(src,cc,shape),OWN[0]));
    if(p&&p.err==null)out+=col('After: '+dst.map(x=>NM[x]).join(', '),cc=>mat(dstLocal(src,dst,cc,shape),OWN[1]));
    else out+='<div class="card" style="margin:0"><div class="small"><b>After</b></div><p class="dst-bad">Refused by DTensor at 2.14.1:</p><p class="small"><code>'+esc(p?D.dtensor_errors[p.err]:'not recorded')+'</code></p></div>';
    $('dst-dt-out').innerHTML=out;
    let cap='';
    if(!p)cap='Not recorded.';
    else if(p.err!=null)cap='This change is not supported: DTensor will not turn a replicated tensor into pending partial sums (it could, by zeroing all but one rank, but does not at this version).';
    else{const lg=p.logical?Object.entries(p.logical).map(([k,v])=>v+' &times; <code>'+k+'</code>').join(', '):'none';
      const gl=p.gloo?p.gloo.map(g=>'<span class="dst-chip '+(g[0]==='all_gather'?'ag':'ar')+'">'+g[0]+' '+fmt(g[2])+' B'+(shape.length>1?' on mesh dim '+(g[3]-1):'')+'</span>').join(''):'none';
      cap='<b>Collectives DTensor asked for:</b> '+lg+'. <b>What gloo ran:</b> '+gl+'. '+(p.gloo?'':'Local only: each rank already holds what it needs. ')+'full_tensor() after: <span class="'+(p.ok?'dst-ok':'dst-bad')+'">'+(p.ok?'equals the original':'differs')+'</span>.'}
    $('dst-dt-cap').innerHTML=cap}
  // summary table, 1-D mesh of 4
  const m4=M.find(x=>x.mesh.indexOf('1-D, 4')===0);
  let h='<thead><tr><th>from \\ to</th>'+PL.map(p=>'<th>'+NM[p]+'</th>').join('')+'</tr></thead><tbody>';
  PL.forEach(s=>{h+='<tr><th>'+NM[s]+'</th>'+PL.map(d=>{const p=m4.pairs.find(q=>q.s===s&&q.d===d);
    if(p.err!=null)return '<td class="dst-bad">refused</td>';
    return '<td>'+(p.logical?Object.keys(p.logical).map(k=>k.replace('_into_tensor','').replace('_tensor','')).join(', '):'<span class="mute">local</span>')+'</td>'}).join('')+'</tr>'});
  $('dst-dt-sum').innerHTML=h+'</tbody>';
  $('dst-uneven').textContent=D.uneven.map(s=>s[0]).join(', ');
  selects();draw();
})();

// ---------- 8. tensor parallel MLP ----------
(function(){
  const T=D.tp;
  function draw(){const w=J.W($('dst-tp-svg')),narrow=w<520,pad=8;
    const cols=narrow?[pad,w*0.345,w*0.675]:[pad,w*0.30,w*0.62];const bw=narrow?w*0.31:w*0.22;
    let b='';
    [0,1].forEach(r=>{const y=10+r*78;
      b+=J.tx(pad,y+10,'rank '+r,{fs:11,w:600});
      const fs=narrow?9.5:10;
      b+=J.rect(cols[0],y+16,bw,26,'var(--soft)',' stroke="var(--line)"')+J.tx(cols[0]+4,y+33,narrow?'x (all of it)':'x: 512 &times; 256 (all)',{fs:fs});
      b+=J.rect(cols[1],y+16,bw,26,'var(--acc2)')+J.tx(cols[1]+4,y+33,(narrow?'fc ':'fc half: ')+T.params['blocks.0.mlp.fc.weight'].local.join('&times;')+(narrow?'':', GELU'),{fs:fs});
      b+=J.rect(cols[2],y+16,bw,26,'var(--closed2)')+J.tx(cols[2]+4,y+33,(narrow?'proj ':'proj half: ')+T.params['blocks.0.mlp.proj.weight'].local.join('&times;'),{fs:fs});
      b+=J.tx(cols[2],y+56,narrow?'partial sum':'partial sum, 512 &times; 256',{fs:10,fill:'var(--mute)'});});
    const ax=Math.min(w-pad-6,cols[2]+bw+8);
    b+='<path d="M'+(cols[2]+bw/2)+' 70 L'+(cols[2]+bw/2)+' 92" stroke="var(--c4)" stroke-width="2.5"/>'+J.tx(narrow?pad:cols[2]+bw/2+6,narrow?172:84,'all-reduce, '+fmt(T.coll[0][1])+' B',{fs:10.5,fill:'var(--c4)',w:600});
    $('dst-tp-svg').innerHTML=J.svg(w,narrow?180:166,b,'Tensor-parallel MLP on 2 ranks');
  }
  $('dst-tp-st').innerHTML=J.stat('All-reduces per step',T.coll.length,T.n_fwd+' in forward, '+(T.coll.length-T.n_fwd)+' in backward')+
    J.stat('Each',fmt(T.coll[0][1])+' B','one (8, 64, 256) float32 activation')+
    J.stat('Loss, TP against 1 process',T.loss.toFixed(5)+' / '+T.ref_loss.toFixed(5),'same batch on both ranks')+
    J.stat('Largest gradient difference',T.grad_diff.toExponential(1),'full gradients compared');
  $('dst-tp-cap').innerHTML='Recorded on 2 ranks: the plan <code>{"fc": ColwiseParallel(), "proj": RowwiseParallel()}</code> applied to each block\'s MLP with <code>parallelize_module</code>. fc\'s weight became <code>Shard(0)</code> (its 1,024 output rows split), proj\'s <code>Shard(1)</code> (its 1,024 input columns split), proj\'s bias <code>Replicate()</code> (added once, after the sum). One all-reduce per MLP forward, one per MLP backward.';
  $('dst-qkv0').textContent=T.qkv_rows[0][0]+' to '+(T.qkv_rows[0][1]-1);
  const r0=D.tp2d[0];$('dst-2d-pl').textContent=r0.fc.placements;
  const pgs={};r0.coll.forEach(c=>{const k=c[2];pgs[k]=pgs[k]||{};pgs[k][c[0]]=(pgs[k][c[0]]||0)+1});
  $('dst-2d-coll').innerHTML=Object.entries(pgs).map(([k,v])=>'<b>'+(k==='1'?'over the data-parallel axis':'over the tensor-parallel axis')+'</b>: '+Object.entries(v).map(([o,n])=>n+' '+o.replace('_','-')+(k==='1'&&o==='all_reduce'?' (FSDP2\'s reduce-scatters, run as all-reduces by gloo)':'')).join(', ')).join('; ');
  $('dst-2d-loss').textContent=D.tp2d.map(r=>r.loss.toFixed(5)).join(', ')+' on ranks 0 to 3; ranks sharing a batch agree';
  J.onR(draw);draw();
})();

// ---------- 9. pipelining ----------
(function(){
  const PP=D.pp;let cur='gpipe';
  // rebuild per-rank action lists from the recorded hooks (forwards and backwards run in micro-batch order)
  function actions(s){return PP[s].ranks.map(r=>{let f=0,b=0;return r.events.filter(e=>e[0]==='F'||e[0]==='B').map(e=>e[0]==='F'?['F',f++]:['B',b++])})}
  function schedule(s){const A=actions(s),end={},out=[[],[]],clk=[0,0];const dur={F:1,B:2};
    const idx=[0,0];let guard=0;
    while((idx[0]<A[0].length||idx[1]<A[1].length)&&guard++<200){
      for(let r=0;r<2;r++){if(idx[r]>=A[r].length)continue;const [k,mb]=A[r][idx[r]];
        const dep=k==='F'?(r===0?0:end['F0'+mb]):(r===1?end['F1'+mb]:end['B1'+mb]);if(dep==null)continue;
        const st=Math.max(clk[r],dep);out[r].push([k,mb,st,st+dur[k]]);end[k+r+mb]=st+dur[k];clk[r]=st+dur[k];idx[r]++}}
    return out}
  let S=schedule(cur),evs=[];
  function flat(){evs=[];S.forEach((l,r)=>l.forEach(a=>evs.push([a[2],r,a])));evs.sort((x,y)=>x[0]-y[0]||x[1]-y[1])}
  flat();
  function draw(i){const w=J.W($('dst-pp-svg')),pad=8,lw=50,T=Math.max(...S.map(l=>l[l.length-1][3])),x0=pad+lw,xs=v=>x0+v/T*(w-pad-x0);
    const shown=evs.slice(0,i+1).map(e=>e[2]);let b='';
    [0,1].forEach(r=>{const y=8+r*42;b+=J.tx(pad,y+20,'rank '+r,{fs:11,w:600});b+=J.rect(x0,y+4,w-pad-x0,26,'var(--soft)');
      S[r].forEach(a=>{const on=shown.indexOf(a)>=0;b+=J.rect(xs(a[2])+1,y+4,xs(a[3])-xs(a[2])-2,26,a[0]==='F'?'var(--acc2)':'var(--closed2)',' opacity="'+(on?1:0.15)+'"');
        if(on)b+=J.tx((xs(a[2])+xs(a[3]))/2,y+21,a[0]+a[1],{fs:11,a:'middle',w:600})})});
    b+=J.tx(x0,100,'unit clock: F = 1, B = 2 (illustrative); grey = idle (the bubble)',{fs:10,fill:'var(--mute)'});
    $('dst-pp-svg').innerHTML=J.svg(w,106,b,cur+' schedule');
    // in flight on rank 0 = forwards done minus backwards done
    const done0=shown.filter(a=>S[0].indexOf(a)>=0),inf=done0.filter(a=>a[0]==='F').length-done0.filter(a=>a[0]==='B').length;
    let mx=0,c=0;S[0].forEach(a=>{c+=a[0]==='F'?1:-1;mx=Math.max(mx,c)});
    const R0=PP[cur].ranks;
    $('dst-pp-st').innerHTML=J.stat('Rank 0 holds now',inf+' micro-batch'+(inf===1?'':'es'),'at most '+mx+' in this schedule')+
      J.stat('Peak memory, rank 0 / rank 1',MB(R0[0].peak,1)+' / '+MB(R0[1].peak,1),'measured, same step')+
      J.stat('Send/recv per rank',R0[0].p2p.length,R0[0].p2p.length+' &times; '+fmt(R0[0].p2p[0][1])+' B')+
      J.stat('Loss (4 micro-batches)',(R0[1].losses.reduce((s,x)=>s+x,0)/R0[1].losses.length).toFixed(5),'mean; one process: '+PP[cur].ref_loss.toFixed(5));
    const e=evs[i];$('dst-pp-cap').innerHTML=e?'<b>Rank '+e[1]+': '+(e[2][0]==='F'?'forward':'backward')+' of micro-batch '+e[2][1]+'.</b> '+
      (e[2][0]==='F'&&e[1]===0?'Its output activations (2 &times; 64 &times; 256 floats) are sent to rank 1.':e[2][0]==='F'?'Received from rank 0; at the end the loss is computed here.':e[1]===1?'The gradient of its input is sent back to rank 0.':'Rank 0 finishes this micro-batch and frees its activations.'):'';}
  const an=RD.anim({card:'dst-pp',ctl:'dst-pp-ctl',n:evs.length,ms:900,draw:draw,label:'Action'});
  J.onR(()=>an.redraw());
  J.seg($('dst-pp-seg'),[['gpipe','GPipe'],['1f1b','1F1B']],cur,m=>{cur=m;S=schedule(cur);flat();an.reset(evs.length);if(!J.RM)an.play()});
  const r0=PP.gpipe.ranks[0];$('dst-pp-tb').textContent=r0.tied_before.toFixed(3);$('dst-pp-ta').textContent=r0.tied_after.toExponential(1);
})();

// ---------- 10. checkpoints ----------
(function(){
  const X=D.dcp,keys=Object.keys(X.meta);const FC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  $('dst-dcp-k').innerHTML=keys.filter(k=>!/blocks\.[123]\./.test(k)).map(k=>'<option>'+esc(k)+'</option>').join('');
  function draw(){const k=$('dst-dcp-k').value||keys[0],m=X.meta[k],L=m[0][0],w=J.W($('dst-dcp-svg')),pad=8,x0=pad+70,xs=v=>x0+v/L*(w-pad-x0);
    let b=J.tx(pad,22,'saved, 4 files',{fs:10.5})+J.tx(pad,62,'loaded, 2 ranks',{fs:10.5});
    m[1].forEach((off,i)=>{b+=J.rect(xs(off),8,xs(off+m[2][i])-xs(off)-1,22,FC[i])+J.tx((xs(off)+xs(off+m[2][i]))/2,23,'__'+i+'_0',{fs:10,a:'middle',fill:'var(--bg)'})});
    const cs=Math.ceil(L/2);[[0,Math.min(L,cs)],[cs,L]].forEach((rg,r)=>{b+=J.rect(xs(rg[0]),48,xs(rg[1])-xs(rg[0])-1,22,'var(--soft)',' stroke="var(--ink)"')+J.tx((xs(rg[0])+xs(rg[1]))/2,63,'rank '+r+': rows '+rg[0]+' to '+(rg[1]-1),{fs:10,a:'middle'})});
    b+=J.tx(x0,86,'0',{fs:10,fill:'var(--mute)'})+J.tx(w-pad,86,L+' along dim 0',{fs:10,fill:'var(--mute)',a:'end'});
    $('dst-dcp-svg').innerHTML=J.svg(w,92,b,'Checkpoint chunks');
    const reads=[[0,Math.min(L,cs)],[cs,L]].map(rg=>m[1].map((o,i)=>o<rg[1]&&o+m[2][i]>rg[0]?'__'+i+'_0':null).filter(Boolean));
    $('dst-dcp-cap').innerHTML='<code>'+esc(k)+'</code>, shape '+m[0].join(' &times; ')+': saved as 4 chunks of '+m[2].join(', ')+' along dim 0, one per file. Loading on 2 ranks, rank 0 reads '+reads[0].join(' and ')+', rank 1 reads '+reads[1].join(' and ')+'; the metadata says where each chunk sits, so no rank needs the whole tensor.';
  }
  $('dst-dcp-k').addEventListener('change',draw);
  $('dst-dcp-files').innerHTML='<thead><tr><th>file</th><th class="num">bytes</th><th>what it holds</th></tr></thead><tbody>'+X.files.map(f=>'<tr><td><code>'+esc(f[0])+'</code></td><td class="num">'+fmt(f[1])+'</td><td>'+(f[0]==='.metadata'?'the global plan: every tensor\'s chunks, offsets, file and byte range ('+X.n_keys+' entries)':'rank '+f[0].slice(2,3)+'\'s shards of the weights and AdamW state ('+X.storage[f[0]]+' pieces)')+'</td></tr>').join('')+'</tbody>';
  const tot=X.files.reduce((s,f)=>s+f[1],0),coll=X.save_coll.reduce((s,c)=>s+c[1],0);
  $('dst-dcp-sum').innerHTML='5 files, '+MB(tot,1)+' in all (12.75 MB of weights and 25.5 MB of AdamW moments, plus the step counters and a duplicate entry for the tied <code>head.weight</code>). Saving took '+X.save_coll.length+' small coordination collectives on rank 0 ('+J.KB(coll)+' in all: gather the local plans, scatter the final ones, gather the write results); the tensor data never crossed ranks, each wrote its own file. Loading into 2 ranks gave every parameter back '+(X.load.every(l=>l.equal)?'<b>bit for bit</b>':'with differences')+' (rank 0 now holds '+X.load[0].local['tok.weight'].join(' &times; ')+' of the embedding); loading into one process with <code>no_dist=True</code> and no process group also matched exactly ('+(X.single.equal_to_saved?'yes':'no')+'), and the tie between <code>tok.weight</code> and <code>head.weight</code> survived ('+(X.single.tied_after_load?'yes':'no')+').';
  J.onR(draw);draw();
})();

// ---------- 11. hangs ----------
(function(){
  const H=D.hang;
  const MODES={skip_off:'Rank 1 skips an all_reduce',shape_off:'Different sizes, no debug',shape_detail:'Different sizes, DETAIL',barrier_off:'monitored_barrier'};
  const INTRO={skip_off:'Rank 0 calls a 4th all_reduce; rank 1 does not, and goes on to a barrier.',shape_off:'Rank 0 all-reduces 1,000 floats, rank 1 999.',shape_detail:'The same bug with TORCH_DISTRIBUTED_DEBUG=DETAIL: every collective is checked first.',barrier_off:'Rank 1 sleeps past a 5 s monitored_barrier on rank 0.'};
  let cur='skip_off';
  function draw(){let h='<p class="small">'+INTRO[cur]+'</p>';
    if(cur==='shape_off'){const x=H.shape_off;h+='<p>'+esc(x.outcome)+'</p><div class="dst-pre">'+esc(x.error)+'</div>'}
    else{const rs=H[cur].slice().sort((a,b)=>a.rank-b.rank);
      const seqs=rs.map(r=>r.fr.filter(e=>!(cur==='shape_detail'&&e[1]==='all_gather')));
      h+='<div class="grid">'+rs.map((r,i)=>'<div><div class="small"><b>rank '+r.rank+'</b>, '+(r.error?'error after '+r.seconds+' s':'no error (it was the one that did not arrive; left after '+r.seconds+' s)')+'</div>'+(r.error?'<div class="dst-pre">'+esc(r.error.slice(0,420))+(r.error.length>420?' ...':'')+'</div>':'')+
        '<div class="tw"><table class="dst-tbl"><thead><tr><th>flight-recorder seq</th><th>collective</th><th>sizes</th></tr></thead><tbody>'+
        seqs[i].map(e=>{const other=seqs[1-i]&&seqs[1-i].find(o=>o[0]===e[0]);const bad=!other||other[1]!==e[1]||JSON.stringify(other[2])!==JSON.stringify(e[2]);
          return '<tr'+(bad?' style="background:var(--hl)"':'')+'><td class="num">'+e[0]+'</td><td>'+e[1]+'</td><td>'+esc(JSON.stringify(e[2]))+'</td></tr>'}).join('')+'</tbody></table></div></div>').join('')+'</div>';
      if(cur==='shape_detail'){const ag=H[cur][0].fr.filter(e=>e[1]==='all_gather').length,ar=H[cur][0].fr.filter(e=>e[1]!=='all_gather').length;h+='<p class="small mute">Rows with all_gather hidden: the checker issued '+ag+' all-gathers for '+ar+' all-reduces, 2 per collective.</p>'}
      if(cur==='skip_off')h+='<p class="small">The highlighted row is the bug: sequence 4 is an all_reduce on rank 0 and a barrier on rank 1. Rank 0 learns only when its 10 s timeout fires; rank 1, which slept 15 s first, then times out in its barrier. Each error just says a receive timed out: the flight recorder is what shows why.</p>'}
    $('dst-hang-out').innerHTML=h}
  J.seg($('dst-hang-seg'),Object.keys(MODES).map(k=>[k,MODES[k]]),cur,m=>{cur=m;draw()});
  draw();
})();

// ---------- 12. timing ----------
(function(){
  const T=D.timing,el=$('dst-time');
  if(!T){el.innerHTML='<p class="mute">Not run yet.</p>';return}
  const rows=T.rows,mx=Math.max(...rows.map(r=>r.median_ms)),p=rows[0],d2=rows[1],f2=rows[3];
  el.innerHTML='<p>Each rank trains on its own batch of 8 sequences, so a step on n ranks does n times the work of one process. Measured under the bench lock: median of 3 trials of 20 steps, after 5 warm-up steps, one thread per rank, a barrier before each step. Times are wall time of rank 0\'s step.</p>'+
    '<div class="bars">'+rows.map(r=>'<div class="row"><div class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</div><div class="track"><div class="fill" style="width:'+(r.median_ms/mx*100).toFixed(1)+'%;background:'+(r.name.startsWith('FSDP')?'var(--c1)':r.name.startsWith('DDP')?'var(--c4)':'var(--dim)')+'"></div></div><div class="val">'+r.median_ms.toFixed(1)+' ms</div></div>').join('')+'</div>'+
    '<div class="tw"><table class="dst-tbl"><thead><tr><th>setup</th><th class="num">sequences / s</th><th>trials, run 1 (load)</th><th>trials, run 2 (load)</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+esc(r.name)+'</td><td class="num">'+r.seq_per_s+'</td><td>'+r.trials_r1.join(', ')+' ms ('+r.load_r1.join(' to ')+')</td><td>'+r.trials_r2.join(', ')+' ms ('+r.load_r2.join(' to ')+')</td></tr>').join('')+'</tbody></table></div>'+
    '<p>Read it as a statement about this laptop, not about PyTorch. DDP on 2 ranks costs '+(d2.median_ms-p.median_ms).toFixed(1)+' ms more per step than one process for twice the data: the 12.75 MB all-reduce over loopback, partly hidden behind backward. FSDP2 costs more again ('+f2.median_ms.toFixed(1)+' ms): 14 collectives instead of 2, twice the bytes on gloo, and a gathered copy of every block made and freed twice per step, all on the same cores that compute. On GPUs with NCCL the trade is different (section 13): FSDP\'s prefetched all-gathers run on their own stream and its reduce-scatter is real.</p>'+
    '<p class="small mute">"Load" is the 1-minute load average at the start and end of each run (other agents shared the machine; run 2 overlapped heavy jobs). The spread between trials is the honest error bar: a few ms on 2 ranks, over 10 ms on 4.</p>';
})();
})();
