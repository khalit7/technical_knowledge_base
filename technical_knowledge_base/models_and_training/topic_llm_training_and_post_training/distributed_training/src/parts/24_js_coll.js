// ---- Reading: the five collectives, what four GPUs hold before and after (static, drawn at the measured width) ----
(function(){
  const els=[...document.querySelectorAll('#collP [data-coll]')];
  if(!els.length)return;
  const G=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'],L='abcd';
  // a chunk: [colour index or 'S' for summed, letter] or null for empty
  const own=g=>[0,1,2,3].map(k=>[g,L[k]]);
  const S={
    ar:{b:g=>own(g),a:g=>[0,1,2,3].map(k=>['S',L[k]])},
    rs:{b:g=>own(g),a:g=>[0,1,2,3].map(k=>k===g?['S',L[k]]:null)},
    ag:{b:g=>[0,1,2,3].map(k=>k===g?[g,L[k]]:null),a:g=>[0,1,2,3].map(k=>[k,L[k]])},
    a2a:{b:g=>own(g),a:g=>[0,1,2,3].map(k=>[k,L[g]])},
    p2p:{b:g=>[0,1,2,3].map(k=>g===0&&k===0?[0,'a']:null),a:g=>[0,1,2,3].map(k=>(g<2)&&k===0?[0,'a']:null)}};
  function draw(el){
    const k=el.dataset.coll,w=Math.max(120,RD.width(el)),t=RD.t;
    const gap=6,cw=(w-3*gap)/4,ch=13,y1=33,blk=4*(ch+1),y2=y1+blk+22;
    let s='';
    for(let g=0;g<4;g++){const x=g*(cw+gap);s+=t(x+cw/2,11,(cw>38?'GPU ':'G')+g,{a:'middle',fill:'var(--mute)'})}
    s+=t(0,y1-4,'before',{fill:'var(--mute)'})+t(0,y2-4,'after',{fill:'var(--mute)'});
    [[y1,S[k].b],[y2,S[k].a]].forEach(([y0,f])=>{for(let g=0;g<4;g++){const x=g*(cw+gap),cs=f(g);
      cs.forEach((c,i)=>{const y=y0+i*(ch+1);
        if(!c){s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+cw.toFixed(1)+'" height="'+ch+'" rx="2" fill="none" stroke="var(--line)"/>';return}
        const sum=c[0]==='S';
        s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+cw.toFixed(1)+'" height="'+ch+'" rx="2" fill="'+(sum?'var(--ink)':G[c[0]])+'"/>';
        s+=t(x+cw/2,y+ch-2.5,(sum?'Σ':'')+c[1],{a:'middle',fill:'var(--bg)'})})}});
    if(k==='p2p'){const x1=cw-2,ya=y1+ch,x2=cw+gap+cw*0.5,yb=y2-1,a=Math.atan2(yb-ya,x2-x1),hx=x2-6*Math.cos(a),hy=yb-6*Math.sin(a);
      s+='<path d="M'+x1.toFixed(1)+','+ya+' L'+hx.toFixed(1)+','+hy.toFixed(1)+'" stroke="var(--mute)" stroke-width="1.4" fill="none"/><path d="M'+(hx-4*Math.sin(a)).toFixed(1)+','+(hy+4*Math.cos(a)).toFixed(1)+' L'+x2.toFixed(1)+','+yb+' L'+(hx+4*Math.sin(a)).toFixed(1)+','+(hy-4*Math.cos(a)).toFixed(1)+'z" fill="var(--mute)"/>'}
    el.innerHTML=RD.svg(w,y2+blk+2,s,k+': four GPUs before and after');
  }
  const all=()=>els.forEach(draw);
  RD.onRender(all);RD.onResize(all);all();
})();
