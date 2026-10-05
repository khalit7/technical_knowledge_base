// ---- Part 1 (ra) tab "Ownership, animated": one Vec moved, borrowed, grown, cloned, dropped, at the addresses a real run printed; Python's version as the "before" ----
(function(){
  const D=window.RA_DATA&&window.RA_DATA.own;if(!D||!document.getElementById('ra-own-card'))return;
  const esc=RA.esc;
  // parse the Rust log: "N name stack=0x.. heap=0x.. len=.. cap=.. data=[..]" and "N r points to 0x.."
  const R={};D.rs_log.split('\n').forEach(l=>{let m=l.match(/^(\d) (\w) stack=(0x[0-9a-f]+) heap=(0x[0-9a-f]+) len=(\d+) cap=(\d+) data=\[(.*)\]/);
    if(m){R[m[1]]={name:m[2],stack:m[3],heap:m[4],len:+m[5],cap:+m[6],data:m[7].split(', ')};return}
    m=l.match(/^(\d) (\w) points to (0x[0-9a-f]+)/);if(m)R[m[1]]={ref:m[2],to:m[3]}});
  // Python log: ids per step, and the first list's reference count (carried forward on steps that do not print it; step 6 prints c's)
  const P={};let lastRc=1;D.py_log.split('\n').forEach(l=>{const m=l.match(/^(\d) .*?id=(0x[0-9a-f]+)/);if(m)P[m[1]]=m[2];const st=l.match(/^(\d) /);if(!st)return;
    const r=l.match(/refcount=(\d+)/);if(r&&st[1]!=='6')lastRc=+r[1];P['rc'+st[1]]=lastRc});
  const H1=R[1].heap,H2=R[3].heap,HC=R[6].heap,S_V=R[1].stack,S_W=R[5].stack,S_C=R[6].stack;
  const reuse=HC===H1;
  // source lines to highlight per step
  function lineOf(src,needle){const L=src.split('\n');const i=L.findIndex(x=>x.includes(needle));return i+1}
  const RS_LN=['v.extend','let r = &v','v.push(40)','m[0] = 11','let w = v','let c = w.clone()','drop(w)','show("8"'].map(n=>lineOf(D.rs_src,n));RS_LN.push(D.rs_src.split('\n').length);
  const PY_LN=['v = [10','r = v','v.append','m[0] = 11','w = v','c = w.copy()','del w','print("8'].map(n=>lineOf(D.py_src,n));
  const CAP={rs:[
    'A <code>Vec</code> with capacity 3 holds 10, 20, 30. Its header (pointer, capacity, length: 24 bytes) is on the stack at '+S_V+'; the elements are in one heap block at '+H1+'.',
    '<code>r = &amp;v</code>: a shared borrow is just an 8-byte pointer to <code>v</code>\'s stack slot (the run printed '+R[2].to+'). Nothing is copied.',
    '<code>push(40)</code>: the block is full, so <code>Vec</code> allocates a bigger one (capacity '+R[3].cap+') at '+H2+', copies the elements and frees the old block. <code>r</code> is not used again, so the checker allowed this. <code>r</code> pointed at the header, but a reference into the buffer (like <code>&amp;v[0]</code>) would now point at freed memory, which is why such a borrow across <code>push</code> is refused.',
    '<code>m = &amp;mut v</code>: an exclusive borrow. While <code>m</code> is in use nobody else may read or write <code>v</code>. <code>m[0] = 11</code> writes into the heap block through it.',
    '<code>let w = v</code>: a <b>move</b>. The 24-byte header is copied to <code>w</code>\'s slot ('+S_W+'); the heap block is untouched and still at '+H2+'. <code>v</code> is now unusable: any use is a compile error.',
    '<code>c = w.clone()</code>: a deep copy, so a new heap block ('+R[6].cap+' slots, at '+HC+')'+(reuse?'. The allocator reused the block freed at step 3: same address.':'.'),
    '<code>drop(w)</code>: <code>w</code>\'s block is freed now, at a line you can point to. No garbage collector, no reference count.',
    '<code>c</code> is still valid and owns its own block.',
    'The closing brace of <code>main</code>: <code>c</code> goes out of scope and its block is freed (not printed: this is the drop the compiler inserts).'],
   py:[
    '<code>v = [10, 20, 30]</code>: the name <code>v</code> points at one list object on the heap (id '+P[1]+'), reference count 1.',
    '<code>r = v</code>: a second name for the <b>same object</b>; the count becomes '+P.rc2+'. Python never copies on assignment.',
    '<code>v.append(40)</code>: the list grows in place (its internal pointer array may move, the object does not), and <code>r</code> sees the change.',
    '<code>m = v; m[0] = 11</code>: a third name; a change through any name is visible through all of them. Count '+P.rc4+'.',
    '<code>w = v</code>: a fourth name, count '+P.rc5+'. Nothing like a move exists: <code>v</code> stays usable.',
    '<code>c = w.copy()</code>: the only new object in the program (id '+P[6]+').',
    '<code>del w</code> removes a name, not the object: the count drops to '+P.rc7+' and the list lives on.',
    'Both objects are alive; they are freed when their counts reach zero (here, when the program ends).']};
  // Rust scene per step k (0-based): slots and blocks with states
  function rsScene(k){const s=k+1,S=[],B=[];
    const vState=s>=5?'moved':'live';
    S.push({n:'v',addr:S_V,kind:'vec',to:s>=3?'H2':'H1',st:vState,words:s>=3?[H2,R[3].cap,R[3].len]:[H1,3,3]});
    if(s>=2)S.push({n:'r',addr:'',kind:'ref',to:'v',st:s===2?'live':'ended'});
    if(s>=4)S.push({n:'m',addr:'',kind:'ref',mut:1,to:'v',st:s===4?'live':'ended'});
    if(s>=5)S.push({n:'w',addr:S_W,kind:'vec',to:'H2',st:s>=7?'dropped':'live',words:[H2,R[5].cap,R[5].len]});
    if(s>=6)S.push({n:'c',addr:S_C,kind:'vec',to:'HC',st:s>=9?'dropped':'live',words:[HC,R[6].cap,R[6].len]});
    if(!(reuse&&s>=6))B.push({id:'H1',addr:H1,cap:3,data:['10','20','30'],st:s>=3?'freed':'live'});
    if(s>=3)B.push({id:'H2',addr:H2,cap:R[3].cap,data:s>=4?R[5].data:R[3].data,st:s>=7?'freed':'live',hl:s===4?0:-1});
    if(s>=6)B.push({id:'HC',addr:HC,cap:R[6].cap,data:R[6].data,st:s>=9?'freed':'new',note:reuse?'reused block':''});
    return {S,B}}
  function pyScene(k){const s=k+1,S=[],B=[];
    const names=['v','r','m','w'].slice(0,s>=5?4:s>=4?3:s>=2?2:1);
    names.forEach(n=>S.push({n,kind:'name',to:'L',st:(n==='w'&&s>=7)?'dropped':'live'}));
    if(s>=6)S.push({n:'c',kind:'name',to:'C',st:'live'});
    const data=s>=4?['11','20','30','40']:s>=3?['10','20','30','40']:['10','20','30'];
    B.push({id:'L',addr:P[1],cap:data.length,data,st:'live',rc:P['rc'+s],obj:1});
    if(s>=6)B.push({id:'C',addr:P[6],cap:4,data:['11','20','30','40'],st:'new',rc:1,obj:1});
    return {S,B}}
  let mode='rs';
  const svgEl=document.getElementById('ra-own-svg'),cap=document.getElementById('ra-own-cap'),codeEl=document.getElementById('ra-own-code'),cnt=document.getElementById('ra-own-cnt');
  function codeHtml(src,py,ln){return '<pre class="ra-lcp">'+src.split('\n').map((t,i)=>'<span class="ra-ln'+(i+1===ln?' on':'')+'"><span class="ra-no">'+(i+1)+'</span>'+RA.hl(t,py)+'</span>').join('')+'</pre>'}
  function T(x,y,s,o){o=o||{};return '<text x="'+x+'" y="'+y+'" font-size="'+(o.fs||11)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.dec?' text-decoration="line-through"':'')+'>'+s+'</text>'}
  function draw(k){
    const py=mode==='py',sc=py?pyScene(k):rsScene(k);
    const ln=py?PY_LN[Math.min(k,PY_LN.length-1)]:RS_LN[k];
    codeEl.innerHTML=codeHtml(py?D.py_src:D.rs_src,py,ln);
    const on=codeEl.querySelector('.ra-ln.on');if(on){const top=on.offsetTop-codeEl.clientHeight/2;codeEl.scrollTop=Math.max(0,top)}
    const W=Math.max(280,Math.min(560,svgEl.clientWidth||RD.width(svgEl))),wide=W>=440;
    const sw=wide?Math.round(W*0.44):W-16,sx=4,hx=wide?sw+40:4,hw=wide?W-hx-4:W-16;
    const slotH=py?30:46,gap=8,top=22;
    let svg='',pos={};
    svg+=T(sx,13,py?'names (the frame)':'stack (main\'s frame)',{fill:'var(--mute)',w:600});
    sc.S.forEach((o,i)=>{const y=top+i*(slotH+gap);pos[o.n]={x:sx,y,w:sw,h:slotH};
      const dead=o.st==='moved'||o.st==='dropped',ended=o.st==='ended';
      const stroke=dead?'var(--bad)':ended?'var(--dim)':o.mut?'var(--c2)':o.kind==='ref'?'var(--c1)':'var(--acc)';
      svg+='<rect x="'+sx+'" y="'+y+'" width="'+sw+'" height="'+slotH+'" rx="6" fill="'+(dead||ended?'var(--bg)':'var(--acc2)')+'" stroke="'+stroke+'"'+(dead?' stroke-dasharray="4 3"':'')+' opacity="'+(ended?0.6:1)+'"/>';
      let label=o.n+(o.kind==='ref'?(o.mut?': &mut Vec':': &Vec'):py?'':': Vec<u32>');
      svg+=T(sx+7,y+14,esc(label),{w:600,dec:dead});
      let sub='';
      if(o.kind==='vec')sub=(o.addr?o.addr+'  ':'')+(dead?(o.st==='moved'?'moved out: unusable':'dropped'):'ptr '+o.words[0].slice(-5)+' cap '+o.words[1]+' len '+o.words[2]);
      else if(o.kind==='ref')sub=ended?'borrow ended (last use passed)':'8-byte pointer to v';
      else sub=o.st==='dropped'?'name deleted':'';
      if(sub)svg+=T(sx+7,y+(py?26:32),esc(sub),{fs:10,fill:'var(--mute)'});
    });
    const sTop=wide?top:top+sc.S.length*(slotH+gap)+26;
    svg+=T(hx,wide?13:sTop-9,py?'heap objects':'heap',{fill:'var(--mute)',w:600});
    const bH=py?52:50;
    sc.B.forEach((b,i)=>{const y=sTop+i*(bH+gap);pos[b.id]={x:hx,y,w:hw,h:bH};
      const freed=b.st==='freed';
      svg+='<rect x="'+hx+'" y="'+y+'" width="'+hw+'" height="'+bH+'" rx="6" fill="'+(freed?'var(--bg)':'var(--soft)')+'" stroke="'+(freed?'var(--bad)':b.st==='new'?'var(--good)':'var(--line)')+'"'+(freed?' stroke-dasharray="4 3"':'')+(b.st==='new'?' stroke-width="2"':'')+'/>';
      svg+=T(hx+6,y+13,esc((b.obj?'list id ':'block ')+b.addr+(freed?'  freed':'')+(b.note?'  ('+b.note+')':'')),{fs:10,fill:freed?'var(--bad)':'var(--mute)'});
      const n=b.cap,cw=Math.min(40,(hw-12)/Math.max(n,1));
      for(let j=0;j<n;j++){const x=hx+6+j*cw,has=j<b.data.length;
        svg+='<rect x="'+x+'" y="'+(y+19)+'" width="'+(cw-3)+'" height="20" rx="3" fill="'+(freed?'var(--bg)':has?(b.hl===j?'var(--hl)':'var(--bg)'):'var(--soft)')+'" stroke="var(--line)"/>';
        if(has&&!freed)svg+=T(x+(cw-3)/2,y+33,esc(b.data[j]),{a:'middle',fs:10.5});}
      if(b.obj)svg+=T(hx+hw-6,y+bH-5,'refcount '+b.rc,{a:'end',fs:10,fill:'var(--acc)',w:600});
      else if(!freed)svg+=T(hx+hw-6,y+bH-5,'len '+b.data.length+' / cap '+b.cap,{a:'end',fs:10,fill:'var(--mute)'});
    });
    // arrows
    sc.S.forEach((o,oi)=>{const a=pos[o.n],t=pos[o.to];if(!a||!t)return;if(o.st==='moved'||o.st==='dropped'||o.st==='ended')return;
      const ended=o.st==='ended';const col=ended?'var(--dim)':o.mut?'var(--c2)':o.kind==='ref'?'var(--c1)':'var(--acc)';
      let x1=a.x+a.w,y1=a.y+a.h/2,x2,y2,d;
      if(o.kind==='ref'){x1=a.x+a.w-4;x2=t.x+t.w-4;y2=t.y+t.h/2;d='M'+x1+','+y1+' C'+(x1+22)+','+y1+' '+(x2+22)+','+y2+' '+(x2+2)+','+y2}
      else if(wide){x2=t.x;y2=t.y+t.h/2;d='M'+x1+','+y1+' C'+(x1+20)+','+y1+' '+(x2-20)+','+y2+' '+x2+','+y2}
      else{const off=14+16*oi;x1=a.x+a.w-off;y1=a.y+a.h;x2=t.x+t.w-off;y2=t.y;d='M'+x1+','+y1+' L'+x2+','+y2}
      svg+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="1.6" marker-end="url(#ra-own-ah)" opacity="'+(ended?0.5:1)+'"/>'});
    const H=Math.max(...Object.values(pos).map(p=>p.y+p.h))+6;
    svgEl.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Stack and heap at this step"><defs><marker id="ra-own-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>'+svg+'</svg>';
    cap.innerHTML='<b>Step '+(k+1)+' of '+(py?8:9)+'.</b> '+CAP[mode][k];
    if(py){cnt.innerHTML='<span>objects allocated: <b>'+(k>=5?2:1)+'</b></span><span>names for the first list: <b>'+(sc.S.filter(o=>o.to==='L'&&o.st!=='dropped').length)+'</b></span><span>bytes copied by assignment: <b>0</b></span>'}
    else{const s=k+1;cnt.innerHTML='<span>heap allocations so far: <b>'+(s>=6?3:s>=3?2:1)+'</b></span><span>live heap blocks: <b>'+sc.B.filter(b=>b.st!=='freed').length+'</b></span><span>bytes copied by moves: <b>'+(s>=5?24:0)+'</b></span><span>elements copied: <b>'+(s>=6?7:s>=3?3:0)+'</b> (growth 3, clone 4)</span>'}
  }
  const A=RD.anim({card:'ra-own-card',ctl:'ra-own-ctl',n:9,draw,ms:2600,label:'Step'});
  RD.seg(document.getElementById('ra-own-seg'),v=>{mode=v;A.reset(v==='py'?8:9);A.play()});
  RA.onTab('t-ra-own',()=>A.redraw());RA.onResize('t-ra-own',()=>A.redraw());
})();
