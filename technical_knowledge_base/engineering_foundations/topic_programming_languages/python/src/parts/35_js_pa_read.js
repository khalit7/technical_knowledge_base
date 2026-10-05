// ---- Part 1 (In depth), Reading tab: names graph, eager/lazy pipeline, bytecode specialisation, bars, section nav ----
(function(){
  const $=id=>document.getElementById(id), esc=RD.esc;
  const TAB='t-pa-read';
  const R=(window.TAB_RENDER=window.TAB_RENDER||{});(R[TAB]=R[TAB]||[]);
  const onShow=f=>R[TAB].push(f);
  addEventListener('resize',()=>{const t=$(TAB);if(t&&!t.hidden)R[TAB].forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr(String(e))}})});

  // ---------- 1. names -> objects, shallow vs deep copy ----------
  (function(){
    const CAP={
      shallow:['<code>row = [1, 2]</code>: one list object, L1, and one name pointing at it.',
        '<code>grid = [row, row]</code>: a new list L2 whose two slots both point at L1. Nothing was copied; L1 now has three references (row and two slots).',
        '<code>copy1 = grid.copy()</code>: a new outer list L3, but its slots point at the <b>same</b> L1. A shallow copy copies one level.',
        '<code>grid[0].append(3)</code>: mutates L1. Every path to L1 sees it: <code>row</code>, both slots of <code>grid</code> and both slots of <code>copy1</code>.',
        '<code>grid.append([9])</code>: changes only the outer list L2. L3 is a different outer list, so <code>copy1</code> still has two slots.'],
      deep:['<code>row = [1, 2]</code>: one list object, L1.',
        '<code>grid = [row, row]</code>: L2 with two slots pointing at L1.',
        '<code>copy1 = copy.deepcopy(grid)</code>: new lists all the way down: L3 and a new inner list L4. Note both slots of L3 point at the <b>one</b> L4: deepcopy keeps a memo, so sharing inside the original is reproduced, not multiplied.',
        '<code>grid[0].append(3)</code>: mutates L1. <code>copy1</code> is untouched: L4 is a separate object.',
        '<code>grid.append([9])</code>: changes L2 only.']};
    let mode='shallow';
    const card=$('pa-names-card');if(!card)return;
    function draw(i){
      const steps=PA.names[mode],st=steps[i],prev=i>0?steps[i-1]:null;
      const W=Math.min(640,RD.width($('pa-names-svg'))),cw=Math.max(22,Math.min(30,(W-150)/7)),bh=24;
      const objs=st.objs,refd=new Set();objs.forEach(o=>o.items.forEach(x=>{if(/^L\d+$/.test(x))refd.add(x)}));
      const c1=objs.filter(o=>!refd.has(o.id)),c2=objs.filter(o=>refd.has(o.id));
      const x0=70,x2=Math.max(x0+3*cw+40,Math.round(W*0.56)),pos={};
      c1.forEach((o,k)=>pos[o.id]={x:x0+14,y:56+k*58});c2.forEach((o,k)=>pos[o.id]={x:x2,y:12+k*58});
      const names=['row','grid','copy1'],ny={row:12,grid:56,copy1:114};
      names.forEach(n=>{if(n!=='row'&&st.names[n]&&pos[st.names[n]].x===x0+14)ny[n]=pos[st.names[n]].y});
      const H=Math.max(176,Math.max(56+c1.length*58,12+c2.length*58));
      let b='<defs><marker id="pa-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--acc)"/></marker></defs>';
      const prevItems={};if(prev)prev.objs.forEach(o=>prevItems[o.id]=o.items.join(','));
      objs.forEach(o=>{const p=pos[o.id],n=o.items.length,chg=prev&&(prevItems[o.id]===undefined||prevItems[o.id]!==o.items.join(','));
        b+='<rect x="'+p.x+'" y="'+p.y+'" width="'+(Math.max(1,n)*cw)+'" height="'+bh+'" rx="3" fill="'+(chg?'var(--hl)':'var(--soft)')+'" stroke="var(--mute)"/>';
        b+=RD.t(p.x,p.y-3,o.id+' (list)',{fs:10.5,fill:'var(--mute)'});
        o.items.forEach((it,k)=>{const cx=p.x+k*cw;if(k)b+='<line x1="'+cx+'" y1="'+p.y+'" x2="'+cx+'" y2="'+(p.y+bh)+'" stroke="var(--mute)"/>';
          if(/^L\d+$/.test(it)){const q=pos[it],sx=cx+cw/2,sy=p.y+bh/2;b+='<circle cx="'+sx+'" cy="'+sy+'" r="3" fill="var(--acc)"/>';
            const tx=q.x,ty=q.y+bh/2;b+='<path d="M'+sx+','+sy+' C'+(sx+40)+','+(sy+30)+' '+(tx-50)+','+ty+' '+(tx-2)+','+ty+'" fill="none" stroke="var(--acc)" stroke-width="1.3" marker-end="url(#pa-ar)"/>'}
          else b+=RD.t(cx+cw/2,p.y+16,esc(it),{a:'middle',fs:12})});
      });
      names.forEach(n=>{if(!(n in st.names))return;const y=ny[n],t=pos[st.names[n]];
        b+='<rect x="2" y="'+y+'" width="52" height="'+bh+'" rx="12" fill="var(--acc2)" stroke="var(--acc)"/>'+RD.t(28,y+16,n,{a:'middle',fs:12,w:600});
        const ty=t.y+bh/2;b+='<path d="M54,'+(y+bh/2)+' C'+(70)+','+(y+bh/2)+' '+(t.x-30)+','+ty+' '+(t.x-2)+','+ty+'" fill="none" stroke="var(--ink)" stroke-width="1.2" marker-end="url(#pa-ar)"/>'});
      $('pa-names-svg').innerHTML=RD.svg(W,H,b,'Names and list objects after: '+st.line);
      $('pa-names-cap').innerHTML='<b>Step '+(i+1)+' of '+steps.length+'.</b> '+CAP[mode][i];
      const g=st.names.grid&&objs.find(o=>o.id===st.names.grid),c=st.names.copy1&&objs.find(o=>o.id===st.names.copy1);
      const shared=g&&c?c.items.filter(x=>g.items.includes(x)&&/^L/.test(x)).length:0;
      $('pa-names-cnt').innerHTML='<span>list objects alive: <b>'+objs.length+'</b></span><span>slots of copy1 pointing into the original: <b>'+(c?shared+' of '+c.items.length:'n/a')+'</b></span><span>copy1 prints: <b>'+(c?esc(JSON.stringify(c.items.map(x=>/^L/.test(x)?objs.find(o=>o.id===x).items.map(Number):Number(x))).replace(/,/g,', ')):'n/a')+'</b></span>';
    }
    const an=RD.anim({card:'pa-names-card',ctl:'pa-names-ctl',n:5,draw,ms:2200,label:'Line of the program'});
    RD.seg($('pa-names-mode'),m=>{mode=m;an.reset(5);an.play()});
    onShow(()=>an.redraw());
  })();

  // ---------- 3. eager lists vs lazy generators on the same three lines ----------
  (function(){
    if(!$('pa-lazy-card'))return;
    let mode='eager';
    const ST=['read','parse','count'];
    function draw(i){
      const tr=PA.lazy[mode],W=Math.min(640,RD.width($('pa-lazy-svg'))),cw=(W-10)/3,H=150;
      const done={read:[],parse:[],count:[]};
      for(let k=0;k<=i;k++){const [s,v]=tr[k];done[s].push(v)}
      const [cs,cv]=tr[i];
      let b='';
      ST.forEach((s,j)=>{const x=5+j*cw;
        b+='<rect x="'+(x+2)+'" y="2" width="'+(cw-4)+'" height="'+(H-4)+'" rx="8" fill="var(--soft)" stroke="'+(s===cs?'var(--acc)':'var(--line)')+'" stroke-width="'+(s===cs?2:1)+'"/>';
        b+=RD.t(x+cw/2,20,s+(mode==='eager'?'_list':'_gen'),{a:'middle',fs:12,w:600});
        done[s].forEach((v,k)=>{const y=34+k*26,cur=(s===cs&&k===done[s].length-1);
          b+='<rect x="'+(x+8)+'" y="'+y+'" width="'+(cw-16)+'" height="20" rx="4" fill="'+(cur?'var(--hl)':'var(--bg)')+'" stroke="var(--line)"/>';
          let lab=v.replace(/^\{"user": /,'{');if(lab.length>Math.floor((cw-22)/6.6))lab=lab.slice(0,Math.max(3,Math.floor((cw-22)/6.6)-1))+'…';
          b+=RD.t(x+cw/2,y+14,esc(lab),{a:'middle',fs:11})});
      });
      $('pa-lazy-svg').innerHTML=RD.svg(W,H,b,'Pipeline stages, '+mode);
      // items stored in lists at this moment (eager: the stage being built plus the list it consumes)
      let held=0;
      if(mode==='eager'){const j=ST.indexOf(cs);held=done[cs].length+(j>0?done[ST[j-1]].length:0)}
      const tot=tr.length;
      let cap='<b>Step '+(i+1)+' of '+tot+'.</b> <code>'+esc(cs+'  '+cv)+'</code>: ';
      if(mode==='eager'){cap+=cs==='read'?'the read stage loops over every line and appends each to its list; nothing downstream has started.':cs==='parse'?'parsing starts only after the whole read list exists. The bad line is skipped.':'counting starts only after the whole parse list exists.'}
      else {cap+=cs==='read'?'<code>sum()</code> asks <code>count_gen</code> for a value, which asks <code>parse_gen</code>, which asks <code>read_gen</code>: one line is read.':cs==='parse'?(cv==='skip'?'the bad line is skipped and <code>parse_gen</code> immediately asks for the next line.':'that one line is parsed and handed on at once.'):'counted and added to the sum; then the chain pulls the next line.'}
      if(i===tot-1)cap+=' Total 3 tokens either way; at a million lines the eager version peaked at about 106 MiB and the lazy one at about 1 KiB (measured below).';
      $('pa-lazy-cap').innerHTML=cap;
      $('pa-lazy-cnt').innerHTML='<span>items stored in lists now: <b>'+held+'</b></span><span>stage now: <b>'+cs+'</b></span><span>lines read so far: <b>'+done.read.length+' of 3</b></span>';
    }
    const an=RD.anim({card:'pa-lazy-card',ctl:'pa-lazy-ctl',n:PA.lazy.eager.length,draw,ms:1300,label:'Printed line'});
    RD.seg($('pa-lazy-mode'),m=>{mode=m;an.reset(PA.lazy[m].length);an.play()});
    onShow(()=>an.redraw());
  })();

  // ---------- 11. bytecode before and after specialisation ----------
  (function(){
    if(!$('pa-dis-card'))return;
    const CAP=['Before the first call: generic instructions. <code>BINARY_OP (+)</code> must work for any two objects with an <code>__add__</code>; <code>FOR_ITER</code> for any iterator.',
      'After summing a list of 1,000 ints: the interpreter has rewritten instructions in place. <code>BINARY_OP_ADD_INT</code> adds two ints directly after a cheap type check; <code>FOR_ITER_LIST</code> walks a list without the general iterator protocol; <code>RESUME_CHECK</code> and <code>JUMP_BACKWARD_NO_JIT</code> are the specialised entry and loop back-edge (the JIT is off).',
      'After calls with floats: the int guard failed, the instruction fell back and re-specialised to <code>BINARY_OP_ADD_FLOAT</code>. Code whose types keep changing pays for this churn; code with stable types stays on the fast path.'];
    function draw(i){
      const blk=PA.dis[i],prev=i>0?PA.dis[i-1]:null;
      let h='<div class="tw"><table class="pa-t" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;min-width:0;word-break:break-word"><thead><tr><th>line</th><th></th><th>instruction and argument</th></tr></thead><tbody>';
      blk.ins.forEach((r,k)=>{const ch=prev&&prev.ins[k]&&prev.ins[k][2]!==r[2];
        h+='<tr'+(ch?' style="background:var(--hl)"':'')+'><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td'+(ch?' style="font-weight:700"':'')+'>'+esc(r[2])+' <span class="mute" style="font-weight:400">'+esc(r[3])+'</span>'+(ch?'<br><span class="mute" style="font-weight:400">was '+esc(prev.ins[k][2])+'</span>':'')+'</td></tr>'});
      h+='</tbody></table></div>';
      $('pa-dis-view').innerHTML=h;
      const nch=prev?blk.ins.filter((r,k)=>prev.ins[k]&&prev.ins[k][2]!==r[2]).length:0;
      $('pa-dis-cap').innerHTML='<b>'+esc(blk.title)+'</b> ('+nch+' instruction'+(nch===1?'':'s')+' changed). '+CAP[i];
    }
    const an=RD.anim({card:'pa-dis-card',ctl:'pa-dis-ctl',n:PA.dis.length,draw,ms:3200,label:'Listing'});
    onShow(()=>an.redraw());
  })();

  // ---------- bars: GIL and NumPy ----------
  function bars(el,rows,max,fmt){
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><span class="track"><span class="fill" style="width:'+(100*r.v/max).toFixed(1)+'%;background:'+r.c+'"></span></span><span class="val">'+fmt(r.v)+'</span></div>').join('')+'</div>';
  }
  function drawGil(){
    const el=$('pa-gil-bars');if(!el)return;
    const rows=[],max=Math.max(...PA.k1.gil.map(r=>r[2]),...PA.k1.ft.map(r=>r[2]));
    [['gil','3.14 (GIL)','var(--c1)'],['ft','3.14t (no GIL)','var(--c3)']].forEach(([k,lab,c])=>PA.k1[k].forEach(r=>rows.push({n:r[0]+' '+r[1]+', '+lab,v:r[2],c})));
    rows.sort((a,b)=>(a.n.startsWith('CPU')?0:1)-(b.n.startsWith('CPU')?0:1));
    bars(el,rows,max,v=>v.toFixed(2)+' s');
    el.insertAdjacentHTML('beforeend','<div class="pa-src">Wall-clock seconds from the two outputs on this page (best of 3); shorter is better.</div>');
  }
  function drawNp(){
    const el=$('pa-np-bars');if(!el)return;
    let h='';
    PA.np.forEach(r=>{const [n,loop,mapf,np,conv]=r,max=Math.max(loop,mapf,np,conv);
      h+='<div class="pa-src" style="margin-top:6px">n = '+n.toLocaleString('en-US')+' (bars relative to the slowest at this size)</div><div class="bars">'+
      [['Python loop',loop,'var(--c2)'],['map + fsum',mapf,'var(--c5)'],['NumPy',np,'var(--c1)'],['np.array(list)',conv,'var(--dim)']].map(([nm,v,c])=>'<div class="row"><span class="nm">'+nm+'</span><span class="track"><span class="fill" style="width:'+(100*v/max).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+(v>=1000?(v/1000).toFixed(1)+' ms':v.toFixed(1)+' µs')+'</span></div>').join('')+'</div>'});
    el.innerHTML=h;
  }
  drawGil();drawNp();

  // ---------- section nav highlight ----------
  (function(){const nav=$('pa-nav');if(!nav||!('IntersectionObserver' in window))return;
    const links=[...nav.querySelectorAll('a')],map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    nav.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const s=$(a.getAttribute('href').slice(1));if(s)s.scrollIntoView({block:'start'})});
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=$(id);if(s)io.observe(s)});})();
})();
