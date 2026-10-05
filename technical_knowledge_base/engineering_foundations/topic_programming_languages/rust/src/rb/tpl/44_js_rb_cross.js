// ---- Part 2, Crossing the boundary tab: one call with three items, copied against borrowed ----
(function(){
  const X=window.RBX,RB=X.RB,fmt=X.fmt;const card=document.getElementById('rb-cx-card');if(!card||!RB.convert)return;
  const C=RB.convert;
  const STR=[{t:'café',kind:'1 byte per char (Latin-1)',ascii:false,u8:5,tok:1},{t:'x86_64',kind:'ASCII',ascii:true,u8:6,tok:2},{t:'v2.1 C++',kind:'ASCII',ascii:true,u8:8,tok:3}];
  const FL=[0.5,1.5,2.5];
  const M={
    sown:{sig:'fn count_many_owned(texts: Vec<String>) -> Vec<u64>',kind:'s',copy:true,ns:C.len_owned.med,nsl:'conversion per string, measured'},
    sref:{sig:'fn count_many(texts: &Bound<PyList>) -> PyResult<Vec<u64>>',kind:'s',copy:false,ns:C.len_borrowed.med,nsl:'conversion per string, measured'},
    fvec:{sig:'fn sum_sq_list(xs: Vec<f64>) -> f64',kind:'f',copy:true,ns:C.floats_vec.med,nsl:'per float incl. the sum, measured'},
    fnp:{sig:'fn sum_sq_array(xs: PyReadonlyArray1<f64>) -> PyResult<f64>',kind:'f',copy:false,ns:C.floats_numpy.med,nsl:'per float incl. the sum, measured'}};
  // steps: 0 before, 1 call, 2..4 items, 5 rust work, 6 return, 7 drop
  const N=8;let mode='sown';
  const box=document.getElementById('rb-cx-svg'),stats=document.getElementById('rb-cx-stats'),cap=document.getElementById('rb-cx-cap'),sig=document.getElementById('rb-cx-sig');
  function caption(m,i){
    const s=m.kind==='s',it=i>=2&&i<=4?i-2:-1;
    if(i===0)return s?'Before the call: a Python list holding three str objects. CPython stores each str in the narrowest fixed width that fits its widest character; ASCII text is already valid UTF-8, "café" is not (é is one byte here, two in UTF-8).':
      (m.copy?'Before the call: a Python list of three float objects, each a separate 24-byte object on the heap with its own refcount.':'Before the call: a NumPy array: a small header plus one contiguous 24-byte buffer of raw f64 values.');
    if(i===1)return 'Python calls the function. PyO3\'s generated glue checks the argument\'s type ('+(s?(m.copy?'any sequence except str':'exactly a list'):(m.copy?'any sequence of floats':'an ndarray of float64'))+') before your Rust code runs.';
    if(it>=0){if(!s)return m.copy?'Float '+(it+1)+': PyO3 reads the f64 out of the Python float object (unboxing) and pushes it into a new Rust Vec<f64>. One object visited per element.':
        (it===0?'No per-element work: as_slice() gives Rust a pointer to NumPy\'s buffer and a length. The three values are read where they are.':'Nothing to do for this element: it is already in the slice.');
      const x=STR[it];
      if(!x.ascii)return 'Item 1, "café": Rust needs UTF-8, so CPython encodes it (5 bytes) and caches the result inside the str object, once. '+(m.copy?'Then PyO3 allocates a Rust String and copies the 5 bytes into it.':'Rust gets a &str pointing at that cached copy: no Rust allocation.');
      return 'Item '+(it+1)+', "'+x.t+'": ASCII, so its stored bytes are already UTF-8. '+(m.copy?'PyO3 allocates a Rust String and copies '+x.u8+' bytes.':'Rust gets a &str pointing straight at them.')}
    if(i===5)return s?'Rust counts the tokens of each item: 1, 2 and 3. The loop is the same in both signatures; only where the bytes live differs.':'Rust sums the squares: 0.25 + 2.25 + 6.25 = 8.75. Same loop either way.';
    if(i===6)return s?'The Vec<u64> result is converted into a new Python list of three ints (small ints come from CPython\'s cache, so no new int objects).':'The f64 result becomes one new Python float object.';
    return m.copy?'The call returns and Rust frees what it allocated: the copies existed only for this call.':'The call returns. Nothing to free on the Rust side: the views simply end. (A view can never outlive the call: the compiler enforces it.)'}
  function counts(m,i){let copied=0,allocs=0,pyobj=0,utf8=0;
    const items=i>=2?Math.min(3,i-1):0;
    if(m.kind==='s'){for(let k=0;k<items;k++){if(!STR[k].ascii)utf8+=STR[k].u8;if(m.copy){copied+=STR[k].u8;allocs++}}if(m.copy&&i>=2)allocs++;}
    else{if(m.copy){copied=items*8;if(i>=2)allocs=1}}
    if(i>=6){pyobj=m.kind==='s'?1:1;if(m.kind==='s')allocs++}
    return {copied,allocs,pyobj,utf8}}
  function draw(i){
    const m=M[mode];sig.textContent=m.sig.replace('->','-\u2060>');
    const W=Math.max(280,Math.min(860,RD.width(box)));const narrow=W<560;
    const pw=narrow?W:W*0.5-6,rx=narrow?0:W*0.5+6,ry=narrow?190:0,H=narrow?380:200;
    let s='';const t=(x,y,str,o)=>{s+=RD.t(x,y,str,o)};const rect=(x,y,w,h,f,st,o)=>{s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+f+'" stroke="'+(st||'var(--line)')+'"'+(o?' opacity="'+o+'"':'')+'/>'};
    rect(0,0,pw,180,'var(--soft)');t(8,16,'Python heap',{w:600,fs:12});
    rect(rx,ry,pw,180,'none','var(--acc)');t(rx+8,ry+16,'Rust, inside this call',{w:600,fs:12,fill:'var(--acc)'});
    const it=i>=2&&i<=4?i-2:-1,active=k=>i>=2&&k<=Math.min(2,i-2);
    const iy=k=>40+k*44;
    const arrow=(x1,y1,x2,y2,c)=>{s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.5" marker-end="url(#rb-cx-ah)"/>'};
    s+='<defs><marker id="rb-cx-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--ink)"/></marker></defs>';
    const ow=Math.min(pw-80,190);
    if(m.kind==='s'){
      rect(8,28,58,140,'var(--bg)');t(14,44,'list',{fs:11,w:600});t(14,58,'3 refs',{fs:10,fill:'var(--mute)'});
      STR.forEach((x,k)=>{const y=iy(k),ox=76;const hl=k===it;
        rect(ox,y-8,ow,36,'var(--bg)',hl?'var(--acc)':'var(--line)');t(ox+6,y+6,'str "'+x.t+'"',{fs:11,w:600});t(ox+6,y+20,x.kind,{fs:10,fill:'var(--mute)'});
        if(!x.ascii&&i>=2){t(ox+ow-6,y+20,'+ UTF-8 cache',{fs:10,a:'end',fill:'var(--c2)'})}
        s+='<line x1="66" y1="'+(y+8)+'" x2="'+ox+'" y2="'+(y+8)+'" stroke="var(--mute)"/>';
        if(i>=1&&i<7){const by=ry+40+k*44,bx=rx+10,bw=Math.min(pw-20,170);
          if(active(k)){if(m.copy){rect(bx,by-8,bw,30,'var(--acc2)','var(--acc)');t(bx+6,by+6,'String: copy, '+x.u8+' bytes',{fs:10.5});t(bx+6,by+18,'heap allocation',{fs:9.5,fill:'var(--mute)'})}
            else{rect(bx,by-8,bw,30,'var(--bg)','var(--good)');t(bx+6,by+6,'&str view (ptr, len '+x.u8+')',{fs:10.5});
              if(narrow)arrow(bx+bw/2,by-8,ox+ow/2,y+28,'var(--good)');else arrow(bx,by+7,ox+ow,y+10,'var(--good)')}}}
      });
      if(i>=5&&i<7)t(rx+10,ry+172,'tokens: [1, 2, 3]',{fs:11,w:600,fill:'var(--good)'});
      if(i>=6)t(8,176,'new list [1, 2, 3] returned',{fs:10.5,w:600,fill:'var(--good)'});
    }else{
      if(m.copy){rect(8,28,58,140,'var(--bg)');t(14,44,'list',{fs:11,w:600});
        FL.forEach((v,k)=>{const y=iy(k),ox=76;rect(ox,y-8,Math.min(ow,150),30,'var(--bg)',k===it?'var(--acc)':'var(--line)');t(ox+6,y+6,'float '+v,{fs:11,w:600});t(ox+6,y+18,'24-byte object',{fs:9.5,fill:'var(--mute)'});
          s+='<line x1="66" y1="'+(y+7)+'" x2="'+ox+'" y2="'+(y+7)+'" stroke="var(--mute)"/>'});
        if(i>=2&&i<7){const n=Math.min(3,i-1);rect(rx+10,ry+30,Math.min(pw-20,200),40,'var(--acc2)','var(--acc)');t(rx+16,ry+46,'Vec<f64>: '+n+' of 3 values copied',{fs:10.5});
          t(rx+16,ry+62,'['+FL.slice(0,n).join(', ')+']',{fs:10.5,fill:'var(--mute)'})}}
      else{rect(8,28,Math.min(pw-16,220),56,'var(--bg)');t(14,44,'ndarray header',{fs:11,w:600});t(14,58,'dtype float64, shape (3,), strides (8,)',{fs:9.5,fill:'var(--mute)'});
        const bw=Math.min(pw-16,220);rect(8,100,bw,30,'var(--bg)',it===0?'var(--acc)':'var(--line)');FL.forEach((v,k)=>{t(14+k*bw/3,119,String(v),{fs:11})});t(8,146,'one contiguous 24-byte buffer',{fs:10,fill:'var(--mute)'});
        if(i>=2&&i<7){const bx=rx+10,by=ry+40;rect(bx,by,Math.min(pw-20,170),30,'var(--bg)','var(--good)');t(bx+6,by+19,'&[f64] slice (ptr, len 3)',{fs:10.5});
          if(narrow)arrow(bx+60,by,60,130,'var(--good)');else arrow(bx,by+15,8+bw,115,'var(--good)')}}
      if(i>=5&&i<7)t(rx+10,ry+172,'sum of squares: 8.75',{fs:11,w:600,fill:'var(--good)'});
      if(i>=6)t(8,176,'new float 8.75 returned',{fs:10.5,w:600,fill:'var(--good)'});
    }
    if(i===7&&m.copy)t(rx+10,ry+100,'copies freed',{fs:11,w:600,fill:'var(--bad)'});
    box.innerHTML=RD.svg(W,H,s,'One call crossing from Python to Rust');
    const c=counts(m,i);
    stats.innerHTML=RD.stat('Bytes copied into Rust',String(c.copied))+RD.stat('Rust heap allocations',String(c.allocs))+
      (m.kind==='s'?RD.stat('UTF-8 bytes encoded by CPython',String(c.utf8),'once per str, then cached'):RD.stat('Python objects visited',String(m.copy?Math.max(0,Math.min(3,i-1)):0)))+
      RD.stat('Measured at scale',fmt(m.ns,m.ns<10?2:1)+' ns',m.nsl);
    cap.textContent=caption(m,i)}
  const an=RD.anim({card:'rb-cx-card',ctl:'rb-cx-ctl',n:N,ms:2200,draw,label:'Step'});
  RD.seg(document.getElementById('rb-cx-mode'),v=>{mode=v;an.reset(N);an.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rb-cross']=window.TAB_RENDER['t-rb-cross']||[]).push(()=>an.redraw());
  let rt=0;addEventListener('resize',()=>{const r=document.getElementById('t-rb-cross');if(!r||r.hidden)return;clearTimeout(rt);rt=setTimeout(()=>an.redraw(),80)});
})();
