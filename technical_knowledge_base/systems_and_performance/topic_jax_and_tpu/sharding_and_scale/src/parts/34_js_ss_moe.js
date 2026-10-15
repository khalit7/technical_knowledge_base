// ---- Experts tab (t-moe): real routing counts, dispatch and combine animated; hand-written vs propagation ----
(function(){
  const U=SSU,esc=U.esc,$=id=>document.getElementById(id),MO=SS.moe;
  $('mo-ref-cap').innerHTML=U.ref('mt_capacity');$('mo-ref-rag').innerHTML=U.ref('mt_moe_ragged');$('mo-ref-prim').innerHTML=U.ref('ragged_all_to_all');
  $('mo-code').textContent=SS.code.moe;
  let k=1,cf=1.25;
  const run=()=>MO.runs.find(r=>r.k===k&&r.capacity_factor===cf);
  const STEPS=5;
  function draw(i){
    const r=run(),G=8,E=8,el=$('mo-svg'),W=U.width(el);
    const lab=60,cw=Math.min(52,(W-lab-8)/E),ch=Math.min(34,cw*0.8),H=G*ch+40+(i>=2?ch:0);
    const colSum=[...Array(E).keys()].map(e=>r.kept.reduce((a,row)=>a+row[e],0)),hot=colSum.indexOf(Math.max(...colSum));
    let s='<defs><pattern id="mo-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--bad)" stroke-width="2"/></pattern></defs>';
    s+=RD.t(lab+E*cw/2,12,'expert e (on device e)',{a:'middle',fs:11});
    for(let e=0;e<E;e++)s+=RD.t(lab+e*cw+cw/2,28,e,{a:'middle',fs:11});
    const mx=Math.max(...r.wanted.flat());
    let sent=0,drop=0;
    for(let g=0;g<G;g++){const y=32+g*ch;s+=RD.t(lab-6,y+ch/2+4,'device '+g,{a:'end',fs:11});
      for(let e=0;e<E;e++){const w=r.wanted[g][e],kp=r.kept[g][e],x=lab+e*cw;
        const hw=(cw-4)*w/mx,hk=(cw-4)*kp/mx;
        s+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="3" fill="var(--bg)" stroke="'+(i>=2&&e===hot?'var(--acc)':'var(--line)')+'"/>';
        if(i>=1){s+='<rect x="'+(x+2)+'" y="'+(y+ch-8)+'" width="'+hk+'" height="5" fill="var(--c1)"/>';
          if(w>kp)s+='<rect x="'+(x+2+hk)+'" y="'+(y+ch-8)+'" width="'+(hw-hk)+'" height="5" fill="url(#mo-h)"/>'}
        const txt=i===0?w:(i===1?kp+(w>kp?'/'+w:''):kp);
        s+=RD.t(x+cw/2,y+ch/2+1,txt,{a:'middle',fs:cw<40?9.5:11,fill:w>kp&&i===1?'var(--bad)':undefined});
        if(i>=1){sent+=kp;drop+=w-kp}}}
    if(i>=2){const y=32+G*ch+4;s+=RD.t(lab-6,y+ch/2,'received',{a:'end',fs:11,w:600});
      for(let e=0;e<E;e++)s+=RD.t(lab+e*cw+cw/2,y+ch/2,colSum[e],{a:'middle',fs:cw<40?9.5:11,w:600,fill:e===hot?'var(--acc)':undefined})}
    el.innerHTML=RD.svg(lab+E*cw+6,H,s,'Tokens from each device to each expert');
    const C=r.capacity,bytesA2A=r.hand.collectives['all-to-all'].bytes/2;
    const cap=['<b>Route.</b> Each device runs the router on its 512 tokens: '+(k===1?'one expert per token (top-1)':'two experts per token (top-2)')+'. The numbers are the real counts: tokens on device g that want expert e. They sum to '+U.num(r.assignments)+'.',
      '<b>Fit to capacity.</b> Each expert accepts C = '+C+' tokens from each device, in token order (first choices before second choices). '+U.num(r.dropped)+' of '+U.num(r.assignments)+' assignments do not fit and are dropped (red). Every device packs a [8 experts, '+C+' slots, 128] block, zero-padded.',
      '<b>Dispatch: all-to-all.</b> Device g sends row g of the matrix: slot block e goes to device e. Afterwards device e holds column e: the tokens of all 8 devices that chose its expert. One all-to-all, '+U.MB(bytesA2A)+' per device including padding.',
      '<b>Compute.</b> Each device runs only its own expert MLP on the [8, '+C+', 128] block it received: no weights move, only tokens. The busiest expert (outlined, '+hot+') has '+colSum[hot]+' real tokens; every expert computes on all 8 x '+C+' = '+(8*C)+' slots, padding included.',
      '<b>Combine: all-to-all back.</b> The inverse all-to-all returns each token\'s output to the device it came from, where it is weighted by its gate value and added to the residual stream; dropped tokens get 0.'];
    $('mo-cap').innerHTML=cap[i];
    $('mo-cnt').innerHTML=RD.stat('capacity C per expert per device',C,'factor '+cf+' x 512 x '+k+' / 8')+RD.stat('assignments dropped',U.num(r.dropped)+' of '+U.num(r.assignments),(100*r.dropped/r.assignments).toFixed(1)+'%')+
      RD.stat('all-to-alls (hand-written)',(i>=4?2:i>=2?1:0)+' of 2',U.MB(r.hand.collectives['all-to-all'].bytes)+' in the compiled forward');
  }
  const an=U.anim({tab:'t-moe',card:'mo-card',ctl:'mo-ctl',n:STEPS,draw,ms:1800,label:'Step'});
  U.seg($('mo-k'),v=>{k=+v;an.redraw()});U.seg($('mo-cf'),v=>{cf=+v;an.redraw()});
  addEventListener('resize',()=>{const t=$('t-moe');if(t&&!t.hidden)an.redraw()});
  const cs=c=>Object.keys(c).map(x=>U.chip(x,x+' x'+c[x].count+', '+U.MB(c[x].bytes))).join(' ');
  $('mo-t').querySelector('tbody').innerHTML=MO.runs.map(r=>'<tr><td>top-'+r.k+'</td><td class="num">'+r.capacity_factor+'</td><td class="num">'+r.capacity+'</td><td class="num">'+U.num(r.dropped)+' / '+U.num(r.assignments)+'</td><td>'+cs(r.hand.collectives)+'<br>'+cs(r.hand.grad_collectives)+'</td><td>'+cs(r.auto.collectives)+'<br>'+cs(r.auto.grad_collectives)+'</td><td class="num">'+U.sci(Math.max(r.hand.max_abs_err,r.auto.max_abs_err))+' / '+U.sci(Math.max(r.hand.grad_max_abs_err,r.auto.grad_max_abs_err))+'</td></tr>').join('');
})();
