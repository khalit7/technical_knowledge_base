// ---- Rosetta tab: "the same numbers in memory" animation, drawn from the real addresses in RO_DATA.outputs ----
(function(){
  const D=window.RO_DATA;if(!D||!window.RD||!document.getElementById('ro-memcard'))return;
  const $=id=>document.getElementById(id);
  const H=s=>parseInt(s,16);
  const hx=n=>'0x'+n.toString(16);
  const low=n=>'…'+n.toString(16).slice(-4);
  function parse(){
    const py=D.outputs['python/memory']||'',np=D.outputs['python/memory_numpy']||'',cpp=D.outputs['cpp/memory']||'',rs=D.outputs['rust/memory']||'';
    const M={};
    const slots=[],objs=[],vals=[];
    py.replace(/ts\[(\d)\] slot (0x[0-9a-f]+) -> object (0x[0-9a-f]+)\s+value (\d+)/g,(_,i,s,o,v)=>{slots[+i]=H(s);objs[+i]=H(o);vals[+i]=+v});
    const reo=(py.match(/new order: (.*)/)||[,''])[1].trim().split(/\s+/).map(H);
    const size=+((py.match(/each int object: (\d+) bytes/)||[,32])[1]);
    const byAddr={};objs.forEach((o,i)=>byAddr[o]=vals[i]);
    M.py={kind:'ptr',slots,objs,vals,size,label:'Python list: pointer array, then int objects'};
    M.pyre={kind:'ptr',slots,objs:reo,vals:reo.map(a=>byAddr[a]),size,label:'Python list after reordering: same objects, new order',re:true};
    const flat=(txt,label)=>{const a=[],v=[];txt.replace(/ts\[(\d)\] at (0x[0-9a-f]+)\s+value (\d+)/g,(_,i,s,x)=>{a[+i]=H(s);v[+i]=+x});return {kind:'flat',slots:a,vals:v,label}};
    M.np=flat(np,'NumPy int64 array: one buffer of numbers');
    M.cpp=flat(cpp,'C++ std::vector<int64_t>: one buffer of numbers');
    M.rust=flat(rs,'Rust Vec<i64>: one buffer of numbers');
    return M;
  }
  const M=parse();
  let mode='py';
  try{const v=localStorage.getItem('ro-mem');if(M[v])mode=v}catch(e){}
  [...$('ro-memmode').children].forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  const nSteps=m=>M[m].kind==='ptr'?17:9;
  // what has been read after step i: list of [addr,len] and the elements summed
  function reads(m,i){
    const d=M[m],r=[];let done=0,hops=0,cur=null,phase='';
    if(d.kind==='ptr'){
      for(let s=1;s<=i;s++){const k=(s-1)>>1;
        if(s%2===1){r.push([d.slots[k],8]);cur=k;phase='slot'}else{r.push([d.objs[k],d.size]);hops++;done=k+1;phase='obj'}}
    }else{for(let s=1;s<=i;s++){r.push([d.slots[s-1],8]);done=s;cur=s-1;phase='el'}}
    const lines=new Set();let bytes=0;
    r.forEach(([a,n])=>{bytes+=n;for(let x=Math.floor(a/64);x<=Math.floor((a+n-1)/64);x++)lines.add(x)});
    let sum=0;for(let k=0;k<done;k++)sum+=d.vals[k];
    return {r,lines,bytes,hops,done,sum,cur,phase};
  }
  function draw(i){
    const d=M[mode],box=$('ro-memsvg');
    const W=RD.width(box),pad=10,ok=d.slots.length===8&&d.slots.every(x=>x>0);
    if(!ok){box.innerHTML='<p class="small mute">Memory data missing for this container.</p>';return}
    const R=reads(mode,i);
    const cw=Math.min(78,(W-2*pad)/8),bx=pad,by=34,bh=34;
    const css=v=>'var('+v+')';
    let s='';
    // buffer row
    const base=d.slots[0];
    const leg=[];
    s+=RD.t(bx,14,d.kind==='ptr'?'pointer array (list)':'one buffer of numbers',{fs:11,fill:css('--mute')});
    leg.push(d.kind==='ptr'?(d.re?'Top: a new list’s pointer array, 8 bytes per slot (drawn at the original list’s addresses).':'Top: the list’s pointer array at '+hx(base)+', 8 bytes per slot.'):'Top: the buffer at '+hx(base)+', 8 bytes per number.');
    for(let k=0;k<8;k++){
      const x=bx+k*cw,isCur=R.cur===k&&(R.phase==='slot'||R.phase==='el'),read=d.kind==='ptr'?(i>=2*k+1):(i>=k+1);
      s+='<rect x="'+(x+1)+'" y="'+by+'" width="'+(cw-2)+'" height="'+bh+'" rx="3" fill="'+(isCur?css('--acc'):read?css('--acc2'):css('--soft'))+'" stroke="'+css('--line')+'"/>';
      s+=RD.t(x+cw/2,by+14,'ts['+k+']',{a:'middle',fs:10.5,fill:isCur?css('--bg'):css('--ink')});
      s+=RD.t(x+cw/2,by+27,d.kind==='ptr'?'ptr':(cw>60?String(d.vals[k]).slice(-5):String(d.vals[k]).slice(-3)),{a:'middle',fs:10,fill:isCur?css('--bg'):css('--mute')});
      if(!d.re&&(d.slots[k]%64===0)&&k>0)s+='<line x1="'+(x)+'" x2="'+x+'" y1="'+(by-6)+'" y2="'+(by+bh+6)+'" stroke="'+css('--bad')+'" stroke-dasharray="3 2"/>';
    }
    if(!d.re){
      const off=base%64;leg.push(off===0?'It starts exactly on a 64-byte cache-line boundary, so all eight fit in one line.':'It starts '+off+' bytes into a cache line; the dashed line marks where the next line begins.');
    }
    let h=by+bh+12;
    if(d.kind==='ptr'){
      const oy=h+52,lo=Math.min(...d.objs),hi=Math.max(...d.objs)+d.size,span=hi-lo;
      const X=a=>pad+(a-lo)/span*(W-2*pad);
      s+=RD.t(pad,oy-10,'int objects (heap)',{fs:11,fill:css('--mute')});
      leg.push('Bottom: the int objects, '+d.size+' bytes each, spread over '+span.toLocaleString('en-US')+' bytes ('+Math.ceil(span/64)+' cache lines) and drawn to scale; shaded bands are the cache lines touched so far.');
      // touched cache lines on the object axis
      R.lines.forEach(L=>{const a=L*64;if(a+64<lo||a>hi)return;const x1=Math.max(pad,X(a)),x2=Math.min(W-pad,X(a+64));s+='<rect x="'+x1+'" y="'+oy+'" width="'+Math.max(1.5,x2-x1)+'" height="30" fill="'+css('--hl')+'"/>'});
      s+='<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+(oy+30)+'" y2="'+(oy+30)+'" stroke="'+css('--line')+'"/>';
      d.objs.forEach((o,k)=>{
        const x=X(o),w=Math.max(5,X(o+d.size)-x),isCur=R.cur===k&&R.phase==='obj',read=i>=2*k+2;
        s+='<rect x="'+x+'" y="'+(oy+4)+'" width="'+w+'" height="22" rx="2" fill="'+(isCur?css('--c2'):read?css('--c2'):css('--soft'))+'" fill-opacity="'+(isCur?1:read?.45:1)+'" stroke="'+css('--mute')+'"/>';
        const showLink=(R.cur===k)||(read&&i>=16);
        if(showLink){const sx=bx+k*cw+cw/2;s+='<path d="M'+sx+' '+(by+bh)+' C'+sx+' '+(oy-20)+' '+(x+w/2)+' '+(by+bh+10)+' '+(x+w/2)+' '+(oy+4)+'" fill="none" stroke="'+(R.cur===k?css('--c2'):css('--dim'))+'" stroke-width="'+(R.cur===k?1.8:1)+'"/>'}
      });
      if(R.cur!=null){const o=d.objs[R.cur];s+=RD.t(Math.min(W-pad,Math.max(pad,X(o))),oy+44,low(o),{a:X(o)>W/2?'end':'start',fs:10.5,fill:css('--c2')})}
      h=oy+52;
    }
    box.innerHTML=RD.svg(W,h,s,d.label)+'<p class="small mute" style="margin:2px 0 0">'+leg.join(' ')+'</p>';
    const tot=d.kind==='ptr'?' of 8 × (8 + '+d.size+')':' of 8 × 8';
    $('ro-memstats').innerHTML=RD.stat('Numbers summed',R.done+' of 8','sum '+R.sum.toLocaleString('en-US'))+
      RD.stat('Bytes read',R.bytes,tot)+
      RD.stat('64-byte cache lines touched',R.lines.size,'distinct lines, from the real addresses')+
      RD.stat('Pointer hops',R.hops,d.kind==='ptr'?'each waits for the slot read before it':'none: address = start + 8 × index');
    $('ro-memcap').innerHTML=caption(i,R,d);
  }
  function caption(i,R,d){
    const n=nSteps(mode);
    if(i===0)return d.kind==='ptr'?(d.re?'The same eight int objects, now listed in a different order, as after sorting rows by user. The objects did not move; only the pointers did.':'A Python list of eight timestamps: a contiguous array of eight 8-byte pointers, each pointing to its own 32-byte int object elsewhere on the heap.')+' Press play to sum them.'
      :'Eight 64-bit numbers stored directly in one buffer, 8 bytes apart. Press play to sum them.';
    if(i===n-1)return d.kind==='ptr'?'Done: 8 pointer reads plus 8 hops to objects, '+R.bytes+' bytes in '+R.lines.size+' cache lines, to add up 64 bytes of numbers.'+(d.re?' Reordering makes the walk jump back and forth across the heap: harder for the prefetcher to guess.':'')
      :'Done: '+R.bytes+' bytes in '+R.lines.size+' cache line'+(R.lines.size>1?'s':'')+', no pointers followed. This is the layout NumPy, PyTorch tensors, C++ and Rust give you, and why vectorised code is fast.';
    const k=R.cur;
    if(R.phase==='slot')return 'Read slot '+k+' at '+hx(d.slots[k])+(d.re?' (drawn in place)':'')+': it holds only an address, '+hx(d.objs[k])+'.';
    if(R.phase==='obj')return 'Follow it to the int object at '+hx(d.objs[k])+' (reference count, type pointer, size tag, digits) and read the value '+d.vals[k].toLocaleString('en-US')+'.';
    return 'Read element '+k+' at '+hx(d.slots[k])+': the value '+d.vals[k].toLocaleString('en-US')+' itself.';
  }
  const A=RD.anim({card:'ro-memcard',ctl:'ro-memctl',n:nSteps(mode),ms:900,label:'Memory step',draw});
  RD.seg($('ro-memmode'),m=>{mode=m;try{localStorage.setItem('ro-mem',m)}catch(e){}A.reset(nSteps(m))});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rosetta']=window.TAB_RENDER['t-rosetta']||[]).push(()=>A.redraw());
  let rt=0;addEventListener('resize',()=>{const t=document.getElementById('t-rosetta');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>A.redraw(),80)});
})();
