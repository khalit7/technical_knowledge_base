// ---- Reading: Lamport clocks against vector clocks on one fixed diagram (definition mirrored in src/clocks_def.py) ----
window.DSF_CLK=(function(){
  const P={A:['a1','a2','a3','a4'],B:['b1','b2','b3'],C:['c1','c2','c3']};
  const MSG=[['a2','b1'],['b2','c2'],['c3','a4']];
  const T={a1:1,a2:2.5,a3:5,a4:9.2,b1:3.5,b2:5,b3:7,c1:1,c2:6,c3:8};
  function compute(){const L={},V={},procs=Object.keys(P),idx={A:0,B:0,C:0},done={};let left=10;
    while(left>0){let prog=false;
      for(const p of procs){while(idx[p]<P[p].length){const e=P[p][idx[p]],src=MSG.filter(m=>m[1]===e).map(m=>m[0]);
        if(src.length&&!done[src[0]])break;const prev=idx[p]?P[p][idx[p]-1]:null;
        let l=prev?L[prev]:0,v=prev?V[prev].slice():[0,0,0];
        if(src.length){l=Math.max(l,L[src[0]]);v=v.map((x,k)=>Math.max(x,V[src[0]][k]))}
        L[e]=l+1;v[procs.indexOf(p)]++;V[e]=v;done[e]=1;idx[p]++;left--;prog=true}}
      if(!prog)throw new Error('clock cycle')}
    return {L,V}}
  const C=compute();
  function rel(a,b){const va=C.V[a],vb=C.V[b];const le=va.every((x,k)=>x<=vb[k]),ge=va.every((x,k)=>x>=vb[k]);
    if(a===b)return 'same';if(le&&!ge)return 'before';if(ge&&!le)return 'after';return 'concurrent'}
  return {P,MSG,T,C,rel};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-clk-card'))return;
  const K=window.DSF_CLK;let mode='lamport',sel=['a3','b3'];
  const fmt=e=>mode==='lamport'?String(K.C.L[e]):'['+K.C.V[e].join(',')+']';
  function draw(){
    const el=$('rd-clk-svg'),W=Math.min(640,RD.width(el)),H=190,lx=26,rx=W-24,Y={A:40,B:100,C:160},X=t=>lx+(rx-lx)*(t-0.4)/9.2;
    let g='<defs><marker id="ck-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    Object.keys(Y).forEach(p=>{g+=RD.t(4,Y[p]+4,p,{fs:13,w:600})+'<line x1="'+lx+'" y1="'+Y[p]+'" x2="'+rx+'" y2="'+Y[p]+'" stroke="var(--line)" stroke-width="1.5"/>'});
    K.MSG.forEach(m=>{const a=m[0],b=m[1],pa=a[0].toUpperCase(),pb=b[0].toUpperCase(),x1=X(K.T[a]),y1=Y[pa],x2=X(K.T[b]),y2=Y[pb],d=Math.hypot(x2-x1,y2-y1);
      g+='<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-(x2-x1)*7/d)+'" y2="'+(y2-(y2-y1)*7/d)+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#ck-a)"/>'});
    const r=sel.length===2?K.rel(sel[0],sel[1]):null;
    Object.keys(K.P).forEach(p=>K.P[p].forEach((e,k)=>{const x=X(K.T[e]),y=Y[p],on=sel.indexOf(e)>=0;
      g+='<g class="ck-ev" data-e="'+e+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="13" fill="transparent"/><circle cx="'+x+'" cy="'+y+'" r="'+(on?7:5)+'" fill="'+(on?'var(--acc)':'var(--ink)')+'"/>'+
        RD.t(x,y+(k%2?22:-11),fmt(e),{a:'middle',fs:mode==='lamport'?12:10.5,w:600,fill:on?'var(--acc)':'var(--ink)'})+RD.t(x,y+(k%2?-10:21),e,{a:'middle',fs:9.5,fill:'var(--mute)'})+'</g>'}));
    el.innerHTML=RD.svg(W,H,g,'Three machines exchanging messages, with clock values');
    let c='';
    if(sel.length<2)c='Pick a second event.';
    else{const [a,b]=sel,la=K.C.L[a],lb=K.C.L[b],truth=r==='before'?a+' → '+b+' (happened before)':r==='after'?b+' → '+a+' (happened before)':'concurrent: neither could have influenced the other';
      if(mode==='lamport'){const lo=la<lb?a:b,hi=la<lb?b:a;
        c='<b>Lamport:</b> L('+a+') = '+la+', L('+b+') = '+lb+'. '+(la===lb?'Equal numbers: the events are certainly concurrent, but ties are broken arbitrarily (often by machine id).':'From '+Math.min(la,lb)+' &lt; '+Math.max(la,lb)+' Lamport can only conclude that '+hi+' did not happen before '+lo+'. Whether '+lo+' → '+hi+' or they are concurrent, the numbers cannot say.')+' <span class="mute">(The truth: '+truth+'. Switch to vector clocks to see it.)</span>'}
      else{const va='['+K.C.V[a].join(',')+']',vb='['+K.C.V[b].join(',')+']';
        c='<b>Vector:</b> '+a+' = '+va+', '+b+' = '+vb+'. '+(r==='concurrent'?'Each is larger in some entry, so they are <b>concurrent</b>. A system keeping both versions (Dynamo) knows it must merge them; last-write-wins would silently drop one.':'Every entry of one is ≤ the other, so <b>'+truth+'</b>.')}}
    $('rd-clk-cap').innerHTML=c;
  }
  $('rd-clk-svg').addEventListener('click',e=>{const g=e.target.closest('.ck-ev');if(!g)return;const id=g.dataset.e;
    if(sel.indexOf(id)>=0)sel=sel.filter(x=>x!==id);else{sel.push(id);if(sel.length>2)sel=sel.slice(-2)}draw()});
  RD.seg($('rd-clk-seg'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
