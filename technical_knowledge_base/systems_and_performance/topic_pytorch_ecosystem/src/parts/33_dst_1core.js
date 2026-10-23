// ---- Distributed lab (t-dist), part 1: helpers, head, collectives primer, predictions, DDP buckets, FSDP2 shards ----
// Every number comes from window.DST (33_dst_0data.js, built by src/dist/build_data.py from the recorded runs).
window.DSTJS=(function(){
const D=window.DST;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const MB=(b,d)=>(b/1e6).toFixed(d==null?2:d)+' MB';
const KB=b=>b>=1e6?MB(b):b>=1e3?(b/1e3).toFixed(1)+' KB':fmt(b)+' B';
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const renders=[];
const onR=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-dist']=window.TAB_RENDER['t-dist']||[]).push(f)};
let rt=0;addEventListener('resize',()=>{const t=$('t-dist');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr('t-dist resize: '+e.message)}}),80)});
const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
const rect=(x,y,w,h,f,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" fill="'+f+'"'+(o||'')+'/>';
const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
function seg(el,items,on,f){el.innerHTML=items.map(([k,l])=>'<button data-m="'+k+'"'+(k===on?' class="on"':'')+'>'+l+'</button>').join('');
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
// collective colours
const CC={all_reduce:'var(--c4)',AR:'var(--c4)',all_gather:'var(--c1)',AG:'var(--c1)',RS:'var(--c2)',reduce_scatter:'var(--c2)',broadcast:'var(--c5)',send:'var(--c3)',recv:'var(--c3)'};
// an element is worth animating only when on screen in the visible tab
function watch(el,cb){const st={vis:false};if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;cb&&cb(st.vis)},{threshold:.2}).observe(el)}else st.vis=true;
  return ()=>st.vis&&!document.hidden&&el.offsetParent!==null}

// ---------- head ----------
const L=D.ddp.w2.ranks[0].steps.map(s=>s.loss),LF=D.fsdp.w2.ranks[0].losses;
const sameLoss=L.every((x,i)=>x===LF[i]);
const peak=k=>{const m=D.mem[k].mem;return m.params+m.opt+m.buckets+m.peak_delta};
let nPairs=0,nOk=0,nErr=0;D.dtensor.forEach(m=>m.pairs.forEach(p=>{nPairs++;if(p.ok)nOk++;if(p.err!=null)nErr++}));
$('dst-head').innerHTML=stat('Losses, rank 0, 3 steps',L.map(x=>x.toFixed(4)).join(' / '),sameLoss?'identical under DDP and FSDP2 (2 ranks)':'DDP and FSDP2 differ')+
  stat('Collectives in one step, 2 ranks','DDP '+D.ddp.w2.ranks[0].steps[2].coll.length+', FSDP2 '+D.fsdp.w2.ranks[0].coll.length,'from the flight recorder')+
  stat('Peak memory per rank',MB(peak('ddp_w2'),1)+' to '+MB(peak('fsdp_w4'),1),'DDP to FSDP2 on 4 ranks, running example')+
  stat('DTensor redistributions run',fmt(nPairs),nOk+' correct, '+nErr+' refused by DTensor');
$('dst-ddp-chk').textContent=D.ddp.w2.check.max_abs_grad_diff_vs_single_process_full_batch.toExponential(1);
$('dst-view-peak').textContent=MB(peak('ddp_w2'),1)+' with or without it';

// ---------- predictions ----------
function pq(id,right){const c=$(id+'-c'),r=$(id+'-r');c.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  c.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.style.borderColor=x.dataset.a===String(right)?'var(--good)':''});r.hidden=false})}
pq('dst-pq1',0);pq('dst-pq2',1);
$('dst-pq2-v').textContent=MB(D.mem.fsdp_w2.mem.peak_delta,1)+' on 2 ranks and '+MB(D.mem.fsdp_w4.mem.peak_delta,1)+' on 4';
$('dst-pq2-a').textContent=MB(peak('fsdp_w2'),1)+' to '+MB(peak('fsdp_w4'),1);
$('dst-pq2-b').textContent=MB(peak('fsdp_w2_big'),0)+' to '+MB(peak('fsdp_w4_big'),0);

// ---------- 2. collectives primer (toy values, 4 ranks) ----------
(function(){
  const n=4,base=[[1,2,3,4],[10,20,30,40],[100,200,300,400],[1000,2000,3000,4000]];
  const C={
    broadcast:{l:'broadcast',cap:'Rank 0 sends its tensor to everyone. DDP does this once at construction, so every rank starts from rank 0\'s weights.',
      after:b=>b.map(()=>b[0].slice()),bytes:'(n &minus; 1)/n &times; S per rank on a ring (pipelined); rank 0 is the source'},
    all_reduce:{l:'all-reduce',cap:'Every rank ends with the element-wise sum of all ranks\' tensors (divide by n for the mean). DDP\'s gradient step; tensor parallel\'s activation sum.',
      after:b=>b.map(()=>b[0].map((_,j)=>b.reduce((s,r)=>s+r[j],0))),bytes:'2(n &minus; 1)/n &times; S per rank'},
    all_gather:{l:'all-gather',cap:'Each rank holds one shard; every rank ends with all of them, concatenated. FSDP\'s weight gather before each block runs.',
      before:b=>b.map((r,i)=>[r[i]]),after:b=>b.map(()=>b.map((r,i)=>r[i])),bytes:'(n &minus; 1)/n &times; S per rank (S = the gathered size)'},
    reduce_scatter:{l:'reduce-scatter',cap:'Sum across ranks, but each rank keeps only its own 1/n slice of the result. FSDP\'s gradient step: each rank gets exactly the gradient rows it owns. (On gloo: run as a full all-reduce, then sliced.)',
      after:b=>b.map((_,i)=>[b.reduce((s,r)=>s+r[i],0)]),bytes:'(n &minus; 1)/n &times; S per rank (S = the full input)'},
    all_to_all:{l:'all-to-all',cap:'Rank i sends its j-th piece to rank j: a transpose across ranks. Expert parallelism\'s token dispatch; not used by this model.',
      after:b=>b.map((_,i)=>b.map(r=>r[i])),bytes:'(n &minus; 1)/n &times; S per rank'}
  };
  let cur='all_reduce',done=false;
  const vec=(v,e)=>'<div class="dst-vec">'+v.map(x=>'<span class="dst-cell'+(e?' e':'')+'">'+x+'</span>').join('')+'</div>';
  function draw(){const c=C[cur],before=c.before?c.before(base):base,v=done?c.after(base):before;
    $('dst-prim-r').innerHTML=v.map((r,i)=>'<div class="dst-rank"><div class="h">rank '+i+(done?' after':' before')+'</div>'+vec(r)+'</div>').join('');
    $('dst-prim-cap').innerHTML='<b>'+c.l+'.</b> '+c.cap+' <span class="mute">Cost: '+c.bytes+'.</span>';
    $('dst-prim-st').textContent=done?'after':'before'}
  seg($('dst-prim-seg'),Object.keys(C).map(k=>[k,C[k].l]),cur,m=>{cur=m;done=false;draw()});
  $('dst-prim-go').addEventListener('click',()=>{done=true;draw()});
  $('dst-prim-reset').addEventListener('click',()=>{done=false;draw()});
  draw();
})();

// ---------- 3. DDP buckets ----------
(function(){
  if(!document.getElementById('dst-bk-strip'))return; // the strip moved to Distributed PyTorch, section 3 (2026-10-23)
  const P=D.ddp.w2.params,COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const modes={s0:['Step 0',D.ddp.w2,0],s2:['Step 2 (rebuilt buckets)',D.ddp.w2,2],b1:['bucket_cap_mb=1, step 2',D.ddp.w2_b1,0]};
  let cur='s0';
  function draw(){
    const [lab,X,si]=modes[cur],s=X.ranks[0].steps[si],w=W($('dst-bk-strip')),pad=8,ww=w-2*pad;
    const order=s.ready.map(r=>r[0]),tot=P.reduce((a,p)=>a+p[1],0);
    const bucketOf={};s.buckets.forEach((b,i)=>b.forEach(p=>bucketOf[p]=i));
    let x=pad,body='';
    order.forEach(pi=>{const wd=P[pi][1]/tot*ww,bi=bucketOf[pi]||0;
      body+=rect(x,6,wd,26,COL[bi%6],' stroke="var(--bg)" stroke-width="0.5"><title>'+esc(P[pi][0])+': '+fmt(P[pi][1]*4)+' bytes, bucket '+bi+'</title></rect');x+=wd});
    body+=tx(pad,46,'first gradient final',{fs:10.5,fill:'var(--mute)'})+tx(w-pad,46,'last: '+esc(P[order[order.length-1]][0]),{fs:10.5,fill:'var(--mute)',a:'end'});
    $('dst-bk-strip').innerHTML=svg(w,52,body,'DDP buckets');
    $('dst-bk-leg').innerHTML=s.buckets.map((b,i)=>i<6||i===s.buckets.length-1?'<span><i style="background:'+COL[i%6]+'"></i>bucket '+i+': '+b.length+' params, '+MB(s.bucket_bytes[i])+'</span>':'').join('')+(s.buckets.length>7?'<span>(colours repeat)</span>':'');
    // timeline
    const T=s.t,end=T.opt1,h=96,x0=pad,xs=t=>x0+t/end*(w-2*pad);
    let b2=rect(xs(0),40,xs(T.fwd1)-xs(0),18,'var(--acc2)')+rect(xs(T.fwd1),40,xs(T.bwd1)-xs(T.fwd1),18,'var(--closed2)')+rect(xs(T.bwd1),40,xs(T.opt1)-xs(T.bwd1),18,'var(--open2)');
    b2+=tx(xs(0)+3,53,'fwd',{fs:10})+tx(xs(T.fwd1)+3,53,'backward',{fs:10})+(xs(T.opt1)-xs(T.bwd1)>26?tx(xs(T.bwd1)+2,53,'opt',{fs:10}):'');
    s.ready.forEach(r=>{b2+='<line x1="'+xs(r[1]).toFixed(1)+'" x2="'+xs(r[1]).toFixed(1)+'" y1="60" y2="68" stroke="var(--mute)" stroke-width="1"/>'});
    const ar=s.coll.filter(c=>c[0]==='all_reduce');
    s.coll.forEach(c=>{const cx=xs(c[2]),col=c[0]==='all_reduce'?'var(--c4)':'var(--c5)';b2+='<path d="M'+cx.toFixed(1)+' 22 l5 6 l-5 6 l-5 -6z" fill="'+col+'"><title>'+c[0]+' '+fmt(c[1])+' B at '+c[2].toFixed(1)+' ms</title></path>'});
    b2+=tx(pad,14,'ms after forward starts: 0',{fs:10,fill:'var(--mute)'})+tx(w-pad,14,end.toFixed(1)+' ms',{fs:10,fill:'var(--mute)',a:'end'});
    b2+=tx(pad,84,'ticks: a gradient becomes final; diamonds: a collective is issued',{fs:10,fill:'var(--mute)'});
    $('dst-bk-tl').innerHTML=svg(w,h,b2,'Step timeline');
    const last=ar[ar.length-1],lastReady=s.ready[s.ready.length-1][1];
    let cap='';
    if(cur==='s0')cap='<b>Step 0:</b> one all-reduce of '+MB(last[1])+', issued at '+last[2].toFixed(1)+' ms when the last gradient became final ('+lastReady.toFixed(1)+' ms). Backward could not return until it finished, at '+T.bwd1.toFixed(1)+' ms: '+(T.bwd1-last[2]).toFixed(1)+' ms of pure waiting, nothing overlapped.';
    else cap='<b>'+lab+':</b> '+ar.length+' all-reduces. The first, '+MB(ar[0][1])+', went out at '+ar[0][2].toFixed(1)+' ms, '+(ar[0][2]-T.fwd1).toFixed(1)+' ms into backward. The last one ('+MB(last[1])+') holds <code>tok.weight</code>, final only at '+lastReady.toFixed(1)+' ms because the tied embedding is the last layer backward reaches; backward then waited '+(T.bwd1-last[2]).toFixed(1)+' ms for it'+(cur==='s2'?'. A large final bucket is exposed communication.':', less than with two buckets, because the last bucket is small.');
    if(cur==='s2'&&D.ddp.w2.ranks[0].steps[1].coll.length>2)cap+=' <span class="mute">(Step 1 also carried the rebuild: broadcasts of '+D.ddp.w2.ranks[0].steps[1].coll.filter(c=>c[0]==='broadcast').map(c=>c[1]+' B').join(' and ')+'.)</span>';
    $('dst-bk-cap').innerHTML=cap;
    $('dst-bk-note').textContent=lab+': '+s.buckets.length+' bucket'+(s.buckets.length>1?'s':'')+', rank 0, 2 processes. Loss this step '+s.loss.toFixed(5)+'.';
  }
  seg($('dst-bk-seg'),Object.keys(modes).map(k=>[k,modes[k][0]]),cur,m=>{cur=m;draw()});
  onR(draw);draw();
})();

// ---------- 4. FSDP2 shards ----------
(function(){
  let cur='2';
  function draw(){
    const ranks=cur==='2'?D.fsdp.w2.ranks.map(r=>r.params):D.fsdp.w4.params,n=ranks.length;
    const pick=ranks[0].map((p,i)=>i).filter(i=>{const nm=ranks[0][i][0];return !nm.startsWith('blocks.')||nm.startsWith('blocks.0.')});
    let h='<thead><tr><th>parameter</th><th>global shape</th>'+ranks.map((_,r)=>'<th>rank '+r+'</th>').join('')+'</tr></thead><tbody>';
    pick.forEach(i=>{const p=ranks[0][i];h+='<tr><td><code>'+esc(p[0])+'</code></td><td>'+p[1].join(' &times; ')+'</td>'+ranks.map(rr=>'<td>'+rr[i][2].join(' &times; ')+'</td>').join('')+'</tr>'});
    const tot=ranks.map(rr=>rr.reduce((s,p)=>s+p[3],0));
    h+='<tr><td colspan="2"><b>all 52 parameters</b> (blocks 1 to 3 shard like block 0)</td>'+tot.map(t=>'<td><b>'+MB(t)+'</b></td>').join('')+'</tr></tbody>';
    $('dst-sh-t').innerHTML=h;
    const tok=ranks.map(rr=>rr[0][2][0]);
    $('dst-sh-note').innerHTML='Every parameter is a DTensor with placement <code>Shard(dim=0)</code>, recorded on each rank. One process holds '+MB(D.fsdp.w2.full_params)+' of weights; each of '+n+' ranks holds about 1/'+n+'. The 43-row embedding does not divide evenly: '+tok.join(', ')+' rows (<code>torch.chunk</code> sizes). For its all-gather FSDP2 pads every rank\'s piece to the same length, which is why the root unit\'s all-gather input is '+fmt(D.fsdp.w2.ranks[0].coll[0][2])+' bytes on both ranks of 2.';
  }
  seg($('dst-sh-seg'),[['2','2 ranks'],['4','4 ranks']],cur,m=>{cur=m;draw()});
  draw();
})();

return {D,$,esc,fmt,MB,KB,RM,onR,W,svg,tx,rect,stat,seg,CC,watch,peak};
})();
