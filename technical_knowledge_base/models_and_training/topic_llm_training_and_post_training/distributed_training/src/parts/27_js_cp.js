// ---- Reading: three ways to bring keys and values to the queries under context parallelism (Ring Attention, all-gather, Ulysses) ----
(function(){
  const els=[...document.querySelectorAll('#cpP [data-cp]')];
  if(!els.length)return;
  const G=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  const arrow=(x1,y1,x2,y2,c)=>{const a=Math.atan2(y2-y1,x2-x1),hx=x2-6*Math.cos(a),hy=y2-6*Math.sin(a);
    return '<path d="M'+x1.toFixed(1)+','+y1.toFixed(1)+' L'+hx.toFixed(1)+','+hy.toFixed(1)+'" stroke="'+c+'" stroke-width="1.5" fill="none"/>'+
      '<path d="M'+(hx-4*Math.sin(a)).toFixed(1)+','+(hy+4*Math.cos(a)).toFixed(1)+' L'+x2.toFixed(1)+','+y2.toFixed(1)+' L'+(hx+4*Math.sin(a)).toFixed(1)+','+(hy-4*Math.cos(a)).toFixed(1)+'z" fill="'+c+'"/>'};
  function draw(el){
    const k=el.dataset.cp,w=Math.max(150,RD.width(el)),t=RD.t;let s='',H;
    if(k==='ring'){const cx=w/2,cy=62,r=Math.min(46,w/2-30),pos=[[0,-1],[1,0],[0,1],[-1,0]].map(([a,b])=>[cx+a*r,cy+b*r]);
      for(let g=0;g<4;g++){const [x,y]=pos[g],[x2,y2]=pos[(g+1)%4],m=[(x+x2)/2,(y+y2)/2];
        s+=arrow(x+(x2-x)*0.28,y+(y2-y)*0.28,x+(x2-x)*0.72,y+(y2-y)*0.72,'var(--mute)')}
      pos.forEach(([x,y],g)=>{s+='<rect x="'+(x-17)+'" y="'+(y-11)+'" width="34" height="22" rx="4" fill="'+G[g]+'" fill-opacity="0.85"/>'+t(x,y+4,'KV'+g,{a:'middle',fill:'var(--bg)'})});
      s+=t(cx,cy+r+28,'n − 1 passes',{a:'middle',fill:'var(--mute)'});H=cy+r+32}
    else if(k==='ag'){const cw=(w-18)/4;
      for(let g=0;g<4;g++){const x=g*(cw+6);s+=t(x+cw/2,11,'GPU '+g,{a:'middle',fill:'var(--mute)'});
        s+='<rect x="'+x.toFixed(1)+'" y="18" width="'+cw.toFixed(1)+'" height="14" rx="2" fill="'+G[g]+'" fill-opacity="0.85"/>'+t(x+cw/2,29,'Q'+g,{a:'middle',fill:'var(--bg)'});
        for(let j=0;j<4;j++)s+='<rect x="'+x.toFixed(1)+'" y="'+(44+j*15)+'" width="'+cw.toFixed(1)+'" height="14" rx="2" fill="'+G[j]+'" fill-opacity="'+(j===g?0.85:0.45)+'"/>'+t(x+cw/2,55+j*15,'KV'+j,{a:'middle',fill:'var(--bg)'})}
      H=44+4*15+2}
    else {const cw=(w-26)/2,gh=12;  // tokens x heads grid: left split by tokens (rows), right split by heads (columns)
      const grid=(x0,byRow)=>{let o='';for(let r=0;r<4;r++)for(let c=0;c<4;c++){const g=byRow?r:c;
        o+='<rect x="'+(x0+c*(cw/4)).toFixed(1)+'" y="'+(18+r*(gh+2))+'" width="'+(cw/4-1.5).toFixed(1)+'" height="'+gh+'" rx="1" fill="'+G[g]+'" fill-opacity="0.85"/>'}return o};
      s+=t(cw/2,11,'tokens by GPU',{a:'middle',fill:'var(--mute)'})+t(cw+26+cw/2,11,'heads by GPU',{a:'middle',fill:'var(--mute)'});
      s+=grid(0,true)+grid(cw+26,false)+arrow(cw+3,18+2*(gh+2)-1,cw+23,18+2*(gh+2)-1,'var(--mute)');
      s+=t(0,18+4*(gh+2)+13,'rows: tokens · columns: heads',{fill:'var(--mute)'});H=18+4*(gh+2)+18}
    el.innerHTML=RD.svg(w,H,s,'Context parallelism: '+k);
  }
  const all=()=>els.forEach(draw);
  RD.onRender(all);RD.onResize(all);all();
})();
