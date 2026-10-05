// ---- Reading section 5: the same four records at their real addresses (CPython via ctypes, C++ and Rust via &records[i]), one row per 128-byte cache line ----
(function(){
  const R=window.RDD;if(!R||!document.getElementById('rd-mem-card'))return;
  const M=R.mem,esc=RD.esc,LINE=+(M.cacheline.split('\n')[0])||128;
  const H=s=>parseInt(s,16);
  // ---- parse the real outputs
  const py=(()=>{const t=M.py_layout;const l=t.match(/list object\s+at (0x[0-9a-f]+)\s+(\d+) B\s+refcount (\d+)\s+-> pointer array at (0x[0-9a-f]+)/);
    const recs=[...t.matchAll(/slot (\d): (0x[0-9a-f]+) -> tuple at (0x[0-9a-f]+) \((\d+) B, refcount (\d+)\) -> ints at (0x[0-9a-f]+) \((\d+) B, refcount (\d+)\), (0x[0-9a-f]+) \((\d+) B, refcount (\d+)\)/g)]
      .map(m=>({slot:H(m[2]),tup:H(m[3]),tsz:+m[4],trc:+m[5],i1:H(m[6]),i1s:+m[7],i2:H(m[9]),i2s:+m[10],irc:+m[8]}));
    return {list:H(l[1]),lsize:+l[2],lrc:+l[3],arr:H(l[4]),recs,per:+(t.match(/= (\d+); the data/)||[0,0])[1]}})();
  const native=t=>{const s=+t.match(/= (\d+)/)[1];const v=t.match(/at (0x[0-9a-f]+), (\d+) bytes, on the stack/);
    return {size:s,vec:H(v[1]),vsz:+v[2],recs:[...t.matchAll(/records\[(\d)\] at (0x[0-9a-f]+)/g)].map(m=>H(m[2]))}};
  const cpp=native(M.cpp_layout),rs=native(M.rust_layout);
  const scan=(t,re)=>{const m=t.match(re);return m?+m[1]:NaN};
  const ns={cpp0:scan(M.cpp_scan,/contiguous[^\n]*?([\d.]+) ns\/record/),cpp1:scan(M.cpp_scan,/allocation order[^\n]*?([\d.]+) ns\/record/),cpp2:scan(M.cpp_scan,/shuffled order[^\n]*?([\d.]+) ns\/record/),
    py0:scan(M.py_scan,/in order\s+[\d.]+ ms\s+([\d.]+) ns\/record/),py1:scan(M.py_scan,/shuffled\s+[\d.]+ ms\s+([\d.]+) ns\/record/)};
  ns.ratio=(ns.cpp2/ns.cpp0).toFixed(0);
  document.querySelectorAll('#t-read .ms').forEach(s=>{const v=ns[s.dataset.k];s.textContent=typeof v==='string'?v:v.toFixed(2)});
  // ---- objects to draw, per mode and step: {a: address, n: bytes, c: colour var, lab, pad}
  const C={hdr:'var(--c1)',arr:'var(--c6)',tup:'var(--c4)',int:'var(--c3)',rec:'var(--c2)',pad:'var(--dim)'};
  function pyObjs(k){const o=[{a:py.list,n:40,c:C.hdr,lab:'list'},{a:py.arr,n:32,c:C.arr,lab:'4 pointers'}];
    if(k>=1)py.recs.forEach((r,i)=>o.push({a:r.tup,n:r.tsz,c:C.tup,lab:'tuple '+i}));
    if(k>=2)py.recs.forEach((r,i)=>{o.push({a:r.i1,n:r.i1s,c:C.int,lab:'id'});o.push({a:r.i2,n:r.i2s,c:C.int,lab:'tok'})});return o}
  function pyArrows(k){const a=[];if(k>=1)py.recs.forEach((r,i)=>a.push([py.arr+8*i+4,r.tup]));if(k>=2)py.recs.forEach(r=>{a.push([r.tup+36,r.i1]);a.push([r.tup+44,r.i2])});return a}
  function natObjs(x,k){const o=[{a:x.vec,n:x.vsz,c:C.hdr,lab:'vec: ptr, len, cap'}];
    if(k>=1)x.recs.forEach((a,i)=>{o.push({a,n:4,c:C.rec,lab:'id'});o.push({a:a+4,n:4,c:C.pad,lab:'pad',pad:1});o.push({a:a+8,n:8,c:C.rec,lab:'tokens '+i})});return o}
  function natArrows(x,k){return k>=1?[[x.vec+4,x.recs[0]]]:[]}
  const linesOf=objs=>{const s=new Set();objs.forEach(o=>{for(let b=Math.floor(o.a/LINE);b<=Math.floor((o.a+o.n-1)/LINE);b++)s.add(b)});return [...s].sort((a,b)=>a-b)};
  // lines touched to read the 4 token counts
  const pyTouched=(()=>{const o=[{a:py.arr,n:32}];py.recs.forEach(r=>{o.push({a:r.tup,n:r.tsz});o.push({a:r.i2,n:r.i2s})});return linesOf(o).length})();
  const natTouched=x=>linesOf(x.recs.map(a=>({a,n:16}))).length;
  // ---- draw
  const svgEl=document.getElementById('rd-mem-svg');
  function draw(objs,arrows){
    const W=Math.max(300,Math.min(860,RD.width(svgEl))),LX=W<480?62:92,S=W-LX-6,RH=28,GAP=16;
    const rows=linesOf(objs);let y=4,rowY={};let prev=null,body='';
    rows.forEach(r=>{if(prev!==null&&r!==prev+1){const far=(r-prev)*LINE;body+=RD.t(LX+S/2,y+11,'&#8942; '+(far>=1048576?(far/1048576).toFixed(1)+' MB':far>=1024?(far/1024).toFixed(0)+' KB':far+' B')+' further &#8942;',{a:'middle',fs:10,fill:'var(--mute)'});y+=GAP}
      rowY[r]=y;body+='<rect x="'+LX+'" y="'+y+'" width="'+S+'" height="'+(RH-4)+'" fill="var(--soft)" stroke="var(--line)"/>'+
        RD.t(LX-4,y+15,'0x…'+(r*LINE).toString(16).slice(-6),{a:'end',fs:W<480?9:10,fill:'var(--mute)'});y+=RH;prev=r});
    const pos=a=>{const r=Math.floor(a/LINE);return [LX+(a%LINE)/LINE*S,rowY[r]]};
    objs.forEach(o=>{let a=o.a,n=o.n;while(n>0){const off=a%LINE,take=Math.min(n,LINE-off);const [x,yy]=pos(a);
      body+='<rect x="'+x.toFixed(1)+'" y="'+(yy+1)+'" width="'+Math.max(1,take/LINE*S-1).toFixed(1)+'" height="'+(RH-6)+'" fill="'+o.c+'" opacity="'+(o.pad?0.5:0.85)+'" rx="2"/>';
      const tw=take/LINE*S;if(tw>22&&!o.pad)body+=RD.t(x+tw/2,yy+15,o.lab.length*5.6>tw?o.lab.split(' ')[0].slice(0,Math.floor(tw/6)):o.lab,{a:'middle',fs:9.5,fill:'var(--bg)',w:600});
      a+=take;n-=take}});
    arrows.forEach(([from,to])=>{const [x1,y1]=pos(from),[x2,y2]=pos(to);if(y1===undefined||y2===undefined)return;
      const ya=y1+RH/2-2,yb=y2+(y2>y1?1:RH-5);body+='<path d="M'+x1.toFixed(1)+' '+ya+' C '+x1.toFixed(1)+' '+((ya+yb)/2)+', '+(x2+3).toFixed(1)+' '+((ya+yb)/2)+', '+(x2+3).toFixed(1)+' '+yb+'" fill="none" stroke="var(--ink)" stroke-width="1" opacity=".55" marker-end="url(#rdm-ar)"/>'});
    svgEl.innerHTML=RD.svg(W,y+4,'<defs><marker id="rdm-ar" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--ink)" opacity=".7"/></marker></defs>'+body,'Memory rows of '+LINE+' bytes with the objects at their real addresses');
    return rows.length}
  const f2=v=>isNaN(v)?'?':v.toFixed(2);
  const S={
    py:[{t:'The list object and its array of pointers',p:'id(records) gives the list object\'s address; CPython keeps the elements in a separate array of 8-byte pointers, here at '+'0x'+py.arr.toString(16)+'. The list holds no data itself, only addresses. Its reference count, read from the object header, is '+py.lrc+'.',k:0},
      {t:'Each pointer leads to a tuple somewhere else',p:'Each record is a separate tuple object of '+(py.recs[0]||{}).tsz+' bytes (sys.getsizeof), allocated wherever the allocator had room. Every object starts with a header: its reference count (here '+(py.recs[0]||{}).trc+') and a pointer to its type.',k:1},
      {t:'Each tuple points to two int objects',p:'Python integers are objects too: '+(py.recs[0]||{}).i1s+' bytes each for these values, each with its own header and reference count ('+(py.recs[0]||{}).irc+'). Reading one record\'s token count means following two pointers: list slot, tuple, int.',k:2},
      {t:'128 bytes for 12 bytes of data',p:'Per record: an 8-byte pointer, a '+(py.recs[0]||{}).tsz+'-byte tuple and two ints, '+py.per+' bytes in all, to store a 4-byte id and an 8-byte count. Reading the four token counts touches '+pyTouched+' different cache lines.',k:2},
      {t:'The consequence, measured on 10 million records',p:'Summing the token counts: '+f2(ns.py0)+' ns per record in list order and '+f2(ns.py1)+' ns when the list is shuffled, so that consecutive records sit far apart in memory. Same records, same code; only where they sit changed.',k:2}],
    cpp:[{t:'The vector object lives on the stack',p:'std::vector<Record> is three pointer-sized fields ('+cpp.vsz+' bytes) in main\'s stack frame: where the elements start, how many there are, and how many fit. The stack is far from the heap, hence the gap.',k:0},
      {t:'The records sit side by side on the heap',p:'Each Record is '+cpp.size+' bytes: the 4-byte id, 4 bytes of padding (grey) so that the 8-byte count starts on a multiple of 8, then the count. &records[1] is exactly '+cpp.size+' bytes after &records[0]. No headers, no reference counts, no pointers per record.',k:1},
      {t:cpp.size*4+' bytes for 48 bytes of data',p:'The four token counts are in '+natTouched(cpp)+' cache line'+(natTouched(cpp)>1?'s (the buffer happens to start near the end of a line)':'')+'. One 128-byte line holds 8 records, so reading them in order, the processor fetches each line once and can prefetch the next.',k:1},
      {t:'The consequence, measured on 10 million records',p:'Summing the token counts of a contiguous vector: '+f2(ns.cpp0)+' ns per record, about '+(ns.py0/ns.cpp0).toFixed(0)+' times less than the Python list.',k:1},
      {t:'Same C++, Python\'s layout',p:'Give each record its own heap allocation and keep a vector of pointers, as Python does: '+f2(ns.cpp1)+' ns per record while the objects happen to sit in allocation order, '+f2(ns.cpp2)+' ns when the pointers are shuffled, '+ns.ratio+' times the contiguous loop. Layout, not language, made that difference.',k:1}],
    rs:[{t:'The Vec object lives on the stack',p:'Vec<Record> is also three words ('+rs.vsz+' bytes): pointer, capacity, length. The Rust standard library documents this: a Vec "is and always will be a (pointer, capacity, length) triplet".',k:0},
      {t:'The records sit side by side on the heap',p:'size_of::<Record>() is '+rs.size+', with the same padding as C++. Rust may reorder a struct\'s fields to reduce padding (only #[repr(C)] fixes the C order); with one u32 and one u64 there is nothing to gain, so it still pads.',k:1},
      {t:'Same layout as C++',p:'Consecutive addresses '+rs.size+' bytes apart; the four counts sit in '+natTouched(rs)+' cache line'+(natTouched(rs)>1?'s':'')+'. Everything said about the C++ scan applies (the measurement on this page was done in C++).',k:1}]
  };
  const cnt=document.getElementById('rd-mem-cnt'),cap=document.getElementById('rd-mem-cap'),leg=document.getElementById('rd-mem-leg');
  let mode='py';
  function render(i){const s=S[mode][i];
    const objs=mode==='py'?pyObjs(s.k):natObjs(mode==='cpp'?cpp:rs,s.k),arrows=mode==='py'?pyArrows(s.k):natArrows(mode==='cpp'?cpp:rs,s.k);
    const rows=draw(objs,arrows);
    cap.innerHTML='<div class="t">'+(i+1)+'/'+S[mode].length+'. '+esc(s.t)+'</div><p>'+esc(s.p)+'</p>';
    leg.innerHTML=(mode==='py'?[['list header',C.hdr],['pointer array',C.arr],['tuple',C.tup],['int',C.int]]:[['vector / Vec header',C.hdr],['record field',C.rec],['padding',C.pad]]).map(([n,c])=>'<span style="--sw:'+c+'">'+n+'</span>').join('')+'<span style="--sw:var(--soft)">one row = '+LINE+'-byte cache line</span>';
    const x=mode==='py'?null:(mode==='cpp'?cpp:rs);
    cnt.innerHTML=[RD.stat('Bytes per record',mode==='py'?py.per:x.size,'data: 12'),RD.stat('Cache lines for 4 counts',mode==='py'?pyTouched:natTouched(x),'rows drawn: '+rows),
      RD.stat('ns per record, in order',f2(mode==='py'?ns.py0:ns.cpp0),'<span class="meas">measured</span>'+(mode==='rs'?' in C++':'')),
      RD.stat('ns per record, scattered',f2(mode==='py'?ns.py1:ns.cpp2),mode==='py'?'shuffled list':'C++ via shuffled pointers')].join('')}
  const A=RD.anim({card:'rd-mem-card',ctl:'rd-mem-ctl',n:S.py.length,draw:render,ms:4200,label:'Step of the memory layout'});
  RD.seg(document.getElementById('rd-mem-seg'),m=>{mode=m;A.reset(S[m].length)});
  RD.onResize(()=>A.redraw());
  // ---- llama.cpp excerpts
  const L=R.llama||{};
  document.querySelectorAll('#t-read .lx').forEach(el=>{const t=L[el.dataset.x]||'(missing)';const [h,...rest]=t.split('\n');
    el.innerHTML='<div class="fname">'+esc(h.replace(/^\/\/ /,''))+'</div>'+RDH.pre(RDH.hl(rest.join('\n'),el.dataset.lang||'cpp'))});
  document.querySelectorAll('#t-read .lq').forEach(s=>s.textContent=(L.q4_size||'').trim());
})();
