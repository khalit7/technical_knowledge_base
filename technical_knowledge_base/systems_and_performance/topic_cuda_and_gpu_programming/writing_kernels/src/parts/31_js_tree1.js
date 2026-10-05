// ---- Reduce and scan, animated (t-tree): drawing and controls ----
(function(){
  const T=window.WKT, fig=document.getElementById('tr-fig'), cap=document.getElementById('tr-cap'), cnt=document.getElementById('tr-cnt');
  const NAMES={r1:'Interleaved (R1)',r2:'Strided (R2)',r3:'Sequential (R3)',r5:'Warp shuffle',hs:'Scan: Hillis-Steele',bl:'Scan: Blelloch'};
  const INTRO={r1:'Harris rung 1: at stride s, threads whose index is a multiple of 2s work.',r2:'Harris rung 2: contiguous threads, strided addresses.',
    r3:'Harris rung 3: sequential addressing.',r5:'Shuffles inside each warp, then one trip through shared memory.',
    hs:'Inclusive scan, Hillis and Steele: log2(16) = 4 steps, every element busy.',bl:'Exclusive scan, Blelloch: an up-sweep (a reduction tree) then a down-sweep.'};
  let mode='r1', R=T.run(mode);
  const WC=['var(--c1)','var(--c3)','var(--c2)','var(--c4)'];
  function draw(i){
    const W=Math.min(760,RD.width(fig)), n=T.N, pad=8, cw=(W-2*pad)/n, top=78, ch=Math.min(30,cw*1.25);
    const st=i>0?R.S[i-1]:null, a=R.states[i];
    let s='';
    // warp bands and lane activity
    for(let t=0;t<n;t++){const x=pad+t*cw,w=Math.floor(t/T.WS);
      let state='';
      if(st){const act=st.kind==='shfl'?(t<st.lanes):st.ops.some(o=>o.t===t);
        const issued=st.kind==='shfl'?(t<st.lanes):st.ops.some(o=>Math.floor(o.t/T.WS)===w);
        state=act?'act':(issued?'idle':'')}
      s+='<rect x="'+(x+1).toFixed(1)+'" y="'+(top+ch+4)+'" width="'+(cw-2).toFixed(1)+'" height="6" fill="'+(state==='act'?'var(--good)':state==='idle'?'var(--bad)':'var(--dim)')+'" rx="1"/>';
      s+='<rect x="'+(x+1).toFixed(1)+'" y="'+top+'" width="'+(cw-2).toFixed(1)+'" height="'+ch.toFixed(1)+'" fill="var(--soft)" stroke="'+WC[w]+'" stroke-width="1.5" rx="3"/>';
      s+=RD.t((x+cw/2).toFixed(1),(top+ch/2+4).toFixed(1),a[t],{a:'middle',w:600});
      s+=RD.t((x+cw/2).toFixed(1),top+ch+24,'b'+(t%T.NB),{a:'middle',fill:'var(--mute)',fs:9});
    }
    // arrows: source to destination
    if(st)st.ops.forEach(o=>{if(o.s<0)return;const x1=pad+o.s*cw+cw/2,x2=pad+o.d*cw+cw/2;
      if(o.s===o.d){s+='<circle cx="'+x2.toFixed(1)+'" cy="'+(top-6)+'" r="3" fill="var(--acc)"/>';return}
      const h=Math.min(64,10+Math.abs(x2-x1)*0.35),mx=(x1+x2)/2;
      s+='<path d="M'+x1.toFixed(1)+','+(top-2)+' Q'+mx.toFixed(1)+','+(top-2-h).toFixed(1)+' '+x2.toFixed(1)+','+(top-2)+'" fill="none" stroke="'+(o.swap?'var(--c2)':'var(--acc)')+'" stroke-width="1.6"/>'+
        '<circle cx="'+x2.toFixed(1)+'" cy="'+(top-3)+'" r="2.6" fill="'+(o.swap?'var(--c2)':'var(--acc)')+'"/>'});
    if(st&&st.ops.some(o=>o.zero))s+=RD.t(W-pad,top-10,'last element set to 0',{a:'end',fill:'var(--c2)'});
    // warp labels
    for(let w=0;w<n/T.WS;w++)s+=RD.t((pad+(w*T.WS+T.WS/2)*cw).toFixed(1),top+ch+38,'warp '+w,{a:'middle',fill:WC[w],fs:10});
    fig.innerHTML=RD.svg(W,top+ch+44,s,NAMES[mode]+', step '+i);
    // caption
    cap.innerHTML='<b>'+NAMES[mode]+(i?', step '+i+' of '+R.S.length:', the input')+'.</b> '+(i?st.cap:INTRO[mode]+' Bars under the cells: green = lane working, orange = lane idle in a warp that issued, grey = warp not issued. b0 to b3: the bank of each shared-memory slot.')+
      (i===R.S.length?(mode==='bl'?' Done: the exclusive scan.':mode==='hs'?' Done: the inclusive scan.':' Done: the sum, '+a[0]+', is in element 0.'):'');
    // running counters
    const c={adds:0,idle:0,barrier:0,shfl:0,tx:0,worst:1};for(let k=0;k<i;k++){const x=R.cs[k];['adds','idle','barrier','shfl','tx'].forEach(q=>c[q]+=x[q]);c.worst=Math.max(c.worst,x.worst)}
    cnt.innerHTML=RD.stat('Additions',c.adds)+RD.stat('Idle lanes',c.idle)+RD.stat('Barriers',c.barrier)+RD.stat('Shuffles',c.shfl)+RD.stat('Shared-mem transactions',c.tx)+RD.stat('Worst bank conflict',c.worst+'-way');
  }
  const A=RD.anim({card:'tr-card',ctl:'tr-ctl',n:R.S.length+1,draw,ms:1500,label:'Step'});
  RD.seg(document.getElementById('tr-mode'),m=>{mode=m;R=T.run(m);A.reset(R.S.length+1);table();A.play()});
  function table(){const rows=['r1','r2','r3','r5','hs','bl'].map(m=>{const t=T.run(m).tot;return '<tr'+(m===mode?' class="on"':'')+'><td>'+NAMES[m]+'</td><td class="num">'+t.steps+'</td><td class="num">'+t.adds+'</td><td class="num">'+t.active+'</td><td class="num">'+t.idle+'</td><td class="num">'+t.barrier+'</td><td class="num">'+t.shfl+'</td><td class="num">'+t.tx+'</td><td class="num">'+t.worst+'-way</td></tr>'}).join('');
    document.getElementById('tr-tab').innerHTML='<tr><th>Method</th><th class="num">steps</th><th class="num">additions</th><th class="num">active lanes</th><th class="num">idle lanes</th><th class="num">barriers</th><th class="num">shuffles</th><th class="num">smem transactions</th><th class="num">worst conflict</th></tr>'+rows}
  table();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tree']=window.TAB_RENDER['t-tree']||[]).push(()=>A.redraw());
  addEventListener('resize',()=>{if(!document.getElementById('t-tree').hidden)A.redraw()});
})();
