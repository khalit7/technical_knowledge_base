// ---- Failure lab: straggler animation (measured step times) and the backward-time probe ----
(function(){
  const H=window.FL_H,D=window.FL_DATA;if(!H||!D)return;const $=H.$;
  let m=0;const STEPS=3,FR=36;
  const stepMs=()=>D.strag.step_ms[m][0],base=D.strag.step_ms[0][0];
  function draw(i){
    const el=$('fl-st-svg');if(!el)return;const W=H.width(el),L=58,R=10,T=8,lane=26,h=T+4*lane+30;
    const span=STEPS*D.strag.step_ms[2][0];// common scale: three steps of the slowest case
    const X=ms=>L+(W-L-R)*ms/span;const st=stepMs(),tnow=STEPS*st*i/(FR-1);
    let b='';
    for(let r=0;r<4;r++){const y=T+r*lane;b+=H.t(L-8,y+16,'rank '+r,{a:'end',fs:11,w:r===3&&m>0?600:400,fill:r===3&&m>0?'var(--bad)':undefined});
      for(let k=0;k<STEPS;k++){const t0=k*st;
        const comp=Math.min(base,st);const busy=r===3?st:comp;// rank 3: compute then its own delay; others: compute then wait
        const segs=r===3?[[t0,t0+comp,'var(--acc)'],[t0+comp,t0+st,'var(--bad)']]:[[t0,t0+comp,'var(--acc)'],[t0+comp,t0+st,'var(--dim)']];
        segs.forEach(([a,c,col])=>{if(a>=tnow)return;const e=Math.min(c,tnow);if(e>a)b+=H.rect(X(a),y+4,X(e)-X(a),lane-8,col,{rx:2})});
        if(t0+st<=tnow)b+=H.line(X(t0+st),y+2,X(t0+st),y+lane-2,'var(--ink)',{op:.5});
      }}
    const ax=T+4*lane+4;b+=H.line(L,ax,W-R,ax,'var(--line)');
    for(let ms=0;ms<=span;ms+=100){const x=X(ms);b+=H.line(x,ax,x,ax+4,'var(--mute)');b+=H.t(x,ax+16,ms+' ms',{a:'middle',fs:10,fill:'var(--mute)'})}
    el.innerHTML=H.svg(W,h,b,'Four ranks over three steps');
    const done=Math.min(STEPS,Math.floor(tnow/st+1e-9));
    $('fl-st-cap').innerHTML=(m===0?'All four ranks compute for about '+base.toFixed(1)+' ms, meet in the all-reduce, and move on together.':'Rank 3 computes, then sleeps '+D.strag.slow_ms[m]+' ms (red). Ranks 0 to 2 finish their compute and wait in the all-reduce (grey) for rank 3: every rank\'s step now takes '+st.toFixed(1)+' ms.')+' <b>Steps done: '+done+'</b> at '+tnow.toFixed(0)+' ms.';
  }
  const A=H.anim({card:'fl-st-card',ctl:'fl-st-ctl',n:FR,draw,ms:110,label:'Time'});
  H.seg($('fl-st-mode'),v=>{m=+v;A.go(0)});
  function probe(){
    const el=$('fl-pb-svg');if(!el)return;const P=D.probe;const mx=Math.max(...P.backward_median_ms.flat());
    let h='<div class="bars">';
    P.slow_ms.forEach((s,k)=>{h+='<div class="small" style="margin:6px 0 2px;font-weight:600">'+(s?'Rank 3 sleeps '+s+' ms per step':'No straggler')+'</div>';
      P.backward_median_ms[k].forEach((v,r)=>{const hl=s&&r===3;h+='<div class="row'+(hl?' hl':'')+'"><span class="nm">rank '+r+(hl?' (slow)':'')+'</span><span class="track"><span class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:'+(hl?'var(--bad)':'var(--acc)')+'"></span></span><span class="val">'+v.toFixed(1)+' ms</span></div>'})});
    el.innerHTML=h+'</div>';
  }
  probe();H.onRender(probe);
})();
