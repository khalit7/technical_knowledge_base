// ---- B-tree and LSM lab tab: controls, drawing, counters ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-lab'))return;
  const st={wl:'asc',sty:'leveled'};let bt,lsm,next,rng,lastBt='',lastLsm='',lookMsg=null;
  function seeded(s){return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
  function reset(){bt=new LAB.BTree(+$('lb-cap').value,0.9);lsm=new LAB.LSM(+$('lb-mem').value,+$('lb-T').value,st.sty);next=1;rng=seeded(42);
    lastBt='Empty tree: one leaf page that is also the root.';lastLsm='Empty: an in-memory memtable and no files yet.';lookMsg=null;draw()}
  function key(){if(st.wl==='asc')return next++;if(st.wl==='rnd')return 1+Math.floor(rng()*99999);return 1+Math.floor(rng()*200)}
  function insert(n){const ck=+$('lb-ck').value;let splits=0,grow=0,fl=0,comp=[],ckw=0,cks=0,last;
    for(let i=0;i<n;i++){const k=key();last=k;const h0=bt.height;const e=bt.insert(k);if(e.split)splits+=e.levels;if(bt.height>h0)grow++;
      if(bt.inserts%ck===0){ckw+=bt.checkpoint();cks++}
      const le=lsm.put(k);if(le.flush)fl++;comp=comp.concat(le.compactions)}
    lastBt=(n===1?'Inserted key '+last+'. ':'Inserted '+n+' keys. ')+(splits?splits+' page split'+(splits>1?'s':'')+(grow?', and the root split '+grow+' time'+(grow>1?'s':'')+' (one more level)':'')+'. ':'No split. ')+(cks?cks+' checkpoint'+(cks>1?'s':'')+' wrote '+ckw+' dirty page'+(ckw===1?'':'s')+'.':'');
    lastLsm=(fl?fl+' memtable flush'+(fl>1?'es':'')+' to L0. ':'Memtable holds '+lsm.memtable.size+' of '+lsm.mem+'. ')+(comp.length?comp.length+' compaction'+(comp.length>1?'s':'')+' rewrote '+comp.reduce((a,c)=>a+c.n,0)+' slots (last: L'+comp[comp.length-1].from+' into L'+comp[comp.length-1].to+').':'');
    lookMsg=null;draw()}
  function look(present){
    let k;if(present){const ks=[...lsm.memtable.keys()];for(const l of lsm.levels)for(const r of l)for(const [x] of r)ks.push(x);if(!ks.length)return;k=ks[Math.floor(rng()*ks.length)]}else k=200000+Math.floor(rng()*1000);
    const fp=LAB.bloomFP(10),bloom=$('lb-bloom').checked,r=lsm.lookup(k,bloom,fp),pages=bt.lookup(k);
    lookMsg={k,present,pages,r,bloom};draw()}
  function svgBt(){const el=$('lb-bt-svg'),W=RD.width(el),L=bt.levels(),rowH=34,H=L.length*rowH+8;let b='';
    L.forEach((row,d)=>{const y=4+d*rowH,gap=row.length>40?0.5:3,w=(W-gap*(row.length-1))/row.length;
      row.forEach((n,i)=>{const x=i*(w+gap),dirty=bt.dirty.has(n.id),fill=n.keys.length/bt.cap;
        b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,w).toFixed(1)+'" height="26" rx="'+(w>6?3:0)+'" fill="var(--soft)" stroke="'+(dirty?'var(--bad)':'var(--line)')+'"/>';
        b+='<rect x="'+x.toFixed(1)+'" y="'+(y+26-26*fill).toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(26*fill).toFixed(1)+'" fill="'+(n.leaf?'var(--c3)':'var(--c1)')+'" opacity=".55"/>';
        const txt=n.keys.join(' ');if(w>txt.length*6+6)b+=RD.t(x+w/2,y+17,txt,{a:'middle',fs:10})})});
    el.innerHTML=RD.svg(W,H,b,'B-tree levels: root at the top, leaves at the bottom; fill shows how full each page is; red outline marks dirty pages');}
  function svgLsm(){const el=$('lb-lsm-svg'),W=RD.width(el),Ls=lsm.levels,rowH=30,H=(Ls.length+1)*rowH+8,lab=34;let b='';
    const mx=Math.max(lsm.mem,...Ls.map(l=>l.reduce((a,r)=>a+r.length,0)),...Ls.map((l,i)=>i?lsm.cap(i):0).filter(x=>x<1e9));
    const sc=v=>(W-lab-4)*v/Math.max(mx,1);
    b+=RD.t(0,22,'mem',{fs:11,w:600});b+='<rect x="'+lab+'" y="6" width="'+sc(lsm.mem).toFixed(1)+'" height="22" rx="3" fill="none" stroke="var(--acc)" stroke-dasharray="3 2"/><rect x="'+lab+'" y="6" width="'+sc(lsm.memtable.size).toFixed(1)+'" height="22" rx="3" fill="var(--acc)" opacity=".5"/>';
    Ls.forEach((l,i)=>{const y=6+(i+1)*rowH;b+=RD.t(0,y+16,'L'+i,{fs:11,w:600});let x=lab;
      if(i&&st.sty==='leveled'){const c=lsm.cap(i);if(sc(c)<W)b+='<rect x="'+lab+'" y="'+y+'" width="'+Math.min(W-lab-2,sc(c)).toFixed(1)+'" height="22" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="3 2"/>'}
      l.forEach(r=>{const w=Math.max(2,sc(r.length));b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+(w-1).toFixed(1)+'" height="22" rx="2" fill="var(--c2)" opacity=".6"/>';if(w>26)b+=RD.t(x+w/2,y+15,r.length,{a:'middle',fs:10});x+=w+2})});
    el.innerHTML=RD.svg(W,H,b,'LSM-tree: memtable, then levels of sorted runs; bar length is the number of keys');}
  function draw(){svgBt();svgLsm();
    const leaves=bt.levels().pop(),fill=bt.live/(leaves.length*bt.cap),btW=bt.pageWrites*bt.cap+bt.fpi*bt.cap+bt.walRecords,ins=Math.max(1,bt.inserts);
    const lsmW=lsm.written+lsm.walWritten,live=lsm.liveKeys();
    $('lb-bt-ev').textContent=lookMsg?'Lookup of key '+lookMsg.k+': read '+lookMsg.pages+' page'+(lookMsg.pages>1?'s':'')+' (one per level)'+(lookMsg.present?'.':', then found nothing.'):lastBt;
    $('lb-lsm-ev').textContent=lookMsg?'Lookup of key '+lookMsg.k+': searched '+lookMsg.r.probed+' sorted run'+(lookMsg.r.probed===1?'':'s')+(lookMsg.r.found?(lookMsg.r.probed===0?' (found in the memtable)':''):', found nothing')+(lookMsg.bloom?'; bloom filters skipped the others (expected false positives '+lookMsg.r.expectedFalse.toFixed(3)+').':'; without bloom filters every run is searched until the key is found.'):lastLsm;
    $('lb-bt-cnt').innerHTML=RD.stat('Keys stored',FMT.n(bt.live))+RD.stat('Levels',bt.height)+RD.stat('Pages',FMT.n(bt.pages()))+RD.stat('Leaf fill',bt.inserts?Math.round(100*fill)+'%':'0%')+RD.stat('Splits',FMT.n(bt.splits))+RD.stat('Pages written',FMT.n(bt.pageWrites),'at checkpoints')+RD.stat('Page images',FMT.n(bt.fpi),'in the log');
    $('lb-lsm-cnt').innerHTML=RD.stat('Live keys',FMT.n(live))+RD.stat('Sorted runs',lsm.runs())+RD.stat('Levels',lsm.levels.length)+RD.stat('Flushes',FMT.n(lsm.flushes))+RD.stat('Compactions',FMT.n(lsm.compactions))+RD.stat('Slots written',FMT.n(lsm.written),'flush and compaction')+RD.stat('Slots on disk',FMT.n(lsm.stored()));
    const r=(a,b)=>b?(a/b).toFixed(1)+'x':'-';
    const fp=LAB.bloomFP(10),bloom=$('lb-bloom').checked,runs=lsm.runs();
    $('lb-cmp').innerHTML='<thead><tr><th></th><th class="num">B-tree</th><th class="num">LSM-tree</th></tr></thead><tbody>'+
      '<tr><td>Write amplification (slots written per key inserted)</td><td class="num">'+(bt.inserts?r(btW,ins):'-')+'</td><td class="num">'+(lsm.userWrites?r(lsmW,lsm.userWrites):'-')+'</td></tr>'+
      '<tr><td>Space amplification (slots on disk per live key)</td><td class="num">'+(bt.live?r(bt.pages()*bt.cap,bt.live):'-')+'</td><td class="num">'+(live?r(lsm.stored()+lsm.memtable.size,live):'-')+'</td></tr>'+
      '<tr><td>Read cost of one lookup (B-tree exact; LSM expected, key present)</td><td class="num">'+bt.height+' pages</td><td class="num">'+(bloom?(1+(Math.max(0,runs-1)*fp)).toFixed(2)+' runs':runs+' runs')+'</td></tr></tbody>';
  }
  RD.seg($('lb-wl'),m=>{st.wl=m;reset()});RD.seg($('lb-sty'),m=>{st.sty=m;reset()});
  ['lb-cap','lb-ck','lb-mem','lb-T'].forEach(id=>$(id).addEventListener('change',reset));$('lb-bloom').addEventListener('change',()=>{lookMsg=null;draw()});
  [1,10,100,1000].forEach(n=>$('lb-i'+n).addEventListener('click',()=>insert(n)));
  $('lb-look').addEventListener('click',()=>look(true));$('lb-miss').addEventListener('click',()=>look(false));$('lb-reset').addEventListener('click',reset);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(draw);
  let t=0;addEventListener('resize',()=>{if($('t-lab').hidden)return;clearTimeout(t);t=setTimeout(draw,80)});
  reset();
})();
