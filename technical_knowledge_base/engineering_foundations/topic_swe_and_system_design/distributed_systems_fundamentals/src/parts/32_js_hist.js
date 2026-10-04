// ---- Consistency lab (and the two inline histories in the Reading tab). Definitions mirrored in src/histories_def.py ----
window.DSF_H=(function(){
  const o=(p,s,e,f,v)=>({p,s,e,f,v});
  const HIST=[
    {id:'ok',t:'Everything in order',ops:[o(1,0,2,'w',1),o(2,3,4,'r',1),o(3,5,6,'r',1)],
     story:'Client 1 saves 1; afterwards clients 2 and 3 both read 1. This is what a single machine gives you.',
     h:{causal:[1,'Nothing is seen out of order.'],ryw:[1,'Nobody reads after their own write.'],ev:[1,'Everyone ends on 1.']}},
    {id:'stale',t:'A stale read after the write finished',ops:[o(1,0,2,'w',1),o(2,3,4,'r',0),o(2,6,7,'r',1)],
     story:'Client 1\'s write of 1 returned "done". Then client 2 read 0, and later 1. This is a read from a lagging asynchronous replica (the Reading tab\'s animation).',
     why:{lin:'The write ended at time 2 and the read began at 3, so the read must take effect after the write and return 1.'},
     h:{causal:[1,'Client 2 had seen nothing that depended on the write, so seeing the older value breaks no cause-and-effect.'],ryw:[1,'Client 2 never wrote, so it has no "own write" to miss.'],ev:[1,'Client 2 ends on 1, like everyone.']}},
    {id:'overlap',t:'Two reads during a slow write',ops:[o(1,0,7,'w',1),o(2,1,2,'r',0),o(3,4,5,'r',1)],
     story:'A slow write of 1 is in progress. Client 2 reads 0, then client 3 reads 1. While a write is in progress, either answer is allowed.',
     h:{causal:[1,'Old value first, new value after: nothing out of order.'],ryw:[1,'No client reads after its own write.'],ev:[1,'All later reads would return 1.']}},
    {id:'inversion',t:'A new value, then an old one',ops:[o(1,0,7,'w',1),o(2,1,2,'r',1),o(3,4,5,'r',0)],
     story:'The same slow write, but now client 2 reads 1 and only after that read returned, client 3 reads 0. Each read alone overlaps the write; together they break linearizability.',
     why:{lin:'Client 2\'s read (returned 1) ended before client 3\'s read began, so client 3 must see the write too. Linearizability forbids the new value followed, in real time, by the old one.'},
     h:{causal:[1,'Client 3 had no causal link to client 2\'s read (they never talked), so it may lag.'],ryw:[1,'No client reads after its own write.'],ev:[1,'Allowed: later reads converge on 1.']}},
    {id:'own',t:'Ana loses her own write',ops:[o(1,0,1,'w',1),o(1,2,3,'r',0),o(1,5,6,'r',1)],
     story:'One client writes 1, then reads 0, then 1. Ana sent "hello", refreshed, and it was gone (the read went to a lagging replica).',
     why:{lin:'The read started after the client\'s own write ended.',seq:'In any order that keeps the client\'s own sequence, its read comes after its write of 1 and must return 1.'},
     h:{causal:[0,'A client\'s own earlier write is always causally before its later read.'],ryw:[0,'The definition of a read-your-writes violation.'],ev:[1,'Allowed: it converges, which is all eventual consistency promises.']}},
    {id:'disagree',t:'Two observers disagree on the order',ops:[o(1,0,2,'w',1),o(2,0,2,'w',2),o(3,3,4,'r',1),o(3,5,6,'r',2),o(4,3,4,'r',2),o(4,5,6,'r',1)],
     story:'Clients 1 and 2 write 1 and 2 at the same time. Client 3 sees 1 then 2; client 4 sees 2 then 1. Jepsen\'s "yes" and "no" to "lunch?".',
     why:{lin:'No single order explains both observers, with or without real time.',seq:'Client 3 needs the write of 1 before the write of 2; client 4 needs the opposite. One total order cannot do both.'},
     h:{causal:[1,'The two writes are concurrent (neither saw the other), so different clients may see them in different orders.'],ryw:[1,'Writers never read here.'],ev:[2,'Not converged yet: clients 3 and 4 end on different values. Allowed only if later reads agree.']}},
    {id:'causal',t:'An answer seen before its question',ops:[o(1,0,1,'w',1),o(2,2,3,'r',1),o(2,4,5,'w',2),o(3,6,7,'r',2),o(3,8,9,'r',1)],
     story:'Ana writes 1 ("lunch?"). Ben reads it, then writes 2 ("yes"). Cy reads 2, then 1: he sees the answer, then the question overwrites it.',
     why:{lin:'No order works at all (see sequential).',seq:'Ben read 1 before writing 2, so the write of 1 is before the write of 2; Cy\'s final read of 1 would need a write of 1 after the write of 2.'},
     h:{causal:[0,'The write of 1 caused Ben\'s write of 2 (he read it first). Seeing 2 and then 1 shows the cause after its effect.'],ryw:[1,'Ben reads before he writes; nobody reads after their own write.'],ev:[2,'Not converged yet: Cy ends on 1, others on 2.']}}];
  function legal(seq){let v=0;for(const op of seq){if(op.f==='w')v=op.v;else if(op.v!==v)return false}return true}
  function check(ops,rt){const n=ops.length,used=new Array(n).fill(false),seq=[];let found=null;
    function ok(i){for(let j=0;j<n;j++){if(used[j]||j===i)continue;const a=ops[j],b=ops[i];
        if(a.p===b.p&&a.s<b.s)return false;if(rt&&a.e<b.s)return false}return true}
    (function rec(){if(found)return;if(seq.length===n){if(legal(seq))found=seq.slice();return}
      for(let i=0;i<n;i++){if(used[i]||!ok(i))continue;used[i]=true;seq.push(ops[i]);
        // prune: the prefix must already be legal
        if(legal(seq))rec();seq.pop();used[i]=false;if(found)return}})();
    return found}
  const lab=op=>op.f==='w'?'w('+op.v+')':'r→'+op.v;
  function svg(ops,W,o2){o2=o2||{};const ps=[...new Set(ops.map(x=>x.p))].sort(),tmax=Math.max(...ops.map(x=>x.e))+0.5,lx=62,rx=W-8,rh=34,H=ps.length*rh+30;
    const X=t=>lx+(rx-lx)*t/tmax;let g='';
    for(let t=0;t<=Math.floor(tmax);t++)g+='<line x1="'+X(t)+'" y1="4" x2="'+X(t)+'" y2="'+(H-22)+'" stroke="var(--line)" stroke-width="1"/>'+RD.t(X(t),H-8,String(t),{a:'middle',fs:10,fill:'var(--mute)'});
    ps.forEach((p,k)=>{g+=RD.t(4,14+k*rh+12,'Client '+p,{fs:11.5,w:600})});
    ops.forEach((op,i)=>{const k=ps.indexOf(op.p),y=10+k*rh,x1=X(op.s),x2=X(op.e),isR=op.f==='r';
      g+='<g'+(isR&&o2.edit?' class="hl-op" data-i="'+i+'" style="cursor:pointer"':'')+'><rect x="'+x1+'" y="'+y+'" width="'+Math.max(8,x2-x1)+'" height="22" rx="5" fill="'+(isR?'var(--acc2)':'var(--open2)')+'" stroke="'+(isR?'var(--acc)':'var(--good)')+'" stroke-width="1.5"/>'+
        RD.t((x1+x2)/2,y+15,lab(op),{a:'middle',fs:11.5,w:600})+'</g>'});
    return RD.svg(W,H,g,'History timeline')}
  return {HIST,check,svg,lab,legal};
})();
// inline figures in the Reading tab
(function(){
  const pairs=[['rd-h-stale','stale'],['rd-h-inv','inversion']];
  function draw(){pairs.forEach(([id,h])=>{const el=document.getElementById(id);if(!el)return;const H=DSF_H.HIST.find(x=>x.id===h);el.innerHTML=DSF_H.svg(H.ops,Math.min(420,RD.width(el)))})}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
// the lab tab
(function(){
  const $=id=>document.getElementById(id);if(!$('hl-list'))return;
  const H=DSF_H;let cur=1,ops=null,edited=false;
  $('hl-list').innerHTML=H.HIST.map((h,i)=>'<button data-i="'+i+'">'+(i+1)+'. '+h.t+'</button>').join('');
  function pick(i){cur=i;ops=H.HIST[i].ops.map(x=>Object.assign({},x));edited=false;
    [...$('hl-list').children].forEach((b,k)=>b.classList.toggle('on',k===i));draw()}
  const V=(v,t)=>v===1?'<span class="verd y">allowed</span>':v===0?'<span class="verd n">forbidden</span>':v===2?'<span class="verd q">so far</span>':'<span class="verd q">?</span>';
  function draw(){
    const h=H.HIST[cur],el=$('hl-svg');el.innerHTML=H.svg(ops,Math.min(760,RD.width(el)),{edit:1});
    $('hl-story').innerHTML=(edited?'<b>Edited.</b> You changed what a read returned. ':'')+h.story;
    const lin=H.check(ops,true),seq=H.check(ops,false),why=edited?{}:(h.why||{});
    const ord=s=>s.map(x=>H.lab(x)+'·c'+x.p).join(', ');
    const rows=[
      ['Linearizable',lin?1:0,lin?'A valid order that respects real time exists (below).':(why.lin||'No order respects both real time and the register\'s values.')],
      ['Sequential',seq?1:0,seq?(lin?'Implied by linearizable.':'An order exists if real time is ignored (below).'):(why.seq||'No single order respects each client\'s own sequence.')],
      ['Causal',edited?-1:h.h.causal[0],edited?'Checked by hand for the presets only.':h.h.causal[1]],
      ['Read-your-writes',edited?-1:h.h.ryw[0],edited?'Checked by hand for the presets only.':h.h.ryw[1]],
      ['Eventual',edited?-1:h.h.ev[0],edited?'Checked by hand for the presets only.':h.h.ev[1]]];
    $('hl-vt').innerHTML='<div><b>Model</b></div><div><b>Verdict</b></div><div><b>Why</b></div>'+rows.map(r=>'<div>'+r[0]+'</div><div>'+V(r[1])+'</div><div>'+r[2]+'</div>').join('');
    $('hl-ord').innerHTML=(lin?'Linearizable order: '+ord(lin):seq?'Sequential order (ignoring real time): '+ord(seq):'No valid order found among all orderings.');
  }
  $('hl-list').addEventListener('click',e=>{const b=e.target.closest('button');if(b)pick(+b.dataset.i)});
  $('hl-svg').addEventListener('click',e=>{const g=e.target.closest('.hl-op');if(!g)return;const op=ops[+g.dataset.i];
    const vals=[0,...new Set(ops.filter(x=>x.f==='w').map(x=>x.v))].sort();op.v=vals[(vals.indexOf(op.v)+1)%vals.length];edited=true;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-hist']=window.TAB_RENDER['t-hist']||[]).push(()=>draw());
  addEventListener('resize',()=>{if(!$('t-hist').hidden)draw()});
  pick(1);
})();
