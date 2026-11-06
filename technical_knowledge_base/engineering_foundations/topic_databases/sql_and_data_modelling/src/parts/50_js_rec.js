// ---- Reading, section 5: WITH RECURSIVE walking chat 11's thread upwards (stepper on the real rows) ----
// Five explained stretches (step list sx-rec): the anchor, the first iteration, iterations 2 to n-2 replayed one by one during their step,
// the first message, and the step that adds nothing. Back, the scrubber and reduced motion jump to a stretch's end.
(function(){
  const el=document.getElementById('rd-rec');if(!el)return;
  const D=window.SM_DATA;
  const R=D.msgs.filter(m=>m[1]===11).sort((a,b)=>a[0]-b[0]).map((m,i,a)=>({id:m[0],role:m[2]?'assistant':'user',parent:i?a[i-1][0]:null}));
  const chain=R.slice().reverse(); // the walk: last message first, then each parent
  const n=chain.length,SX=[[0,0],[1,1],[2,n-2],[n-1,n-1],[n,n]],card=document.getElementById('rd-rec-card');let raf=0;
  window.CHK=Object.assign(window.CHK||{},{rec:{n,ids:chain.map(m=>m.id),stretches:SX.length}});
  document.getElementById('rd-rec-sql').textContent="WITH RECURSIVE up(id, parent_id, depth) AS (\n  SELECT id, parent_id, 0 FROM messages WHERE id = "+chain[0].id+"   -- anchor\n  UNION ALL\n  SELECT m.id, m.parent_id, up.depth + 1                 -- step: join the rows\n  FROM messages m JOIN up ON m.id = up.parent_id         -- added last time\n)\nSELECT * FROM up;";
  function frame(i){
    const W=RD.width(el),bw=W<420?58:74,bh=40,g=6,per=Math.max(3,Math.floor((W+g)/(bw+g)));
    let s='';
    chain.forEach((m,k)=>{const x=(k%per)*(bw+g),y=Math.floor(k/per)*(bh+18);
      const inRes=k<=i&&k<n,isNew=k===i&&i<n;
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="6" fill="'+(isNew?'var(--acc2)':inRes?'var(--soft)':'var(--bg)')+'" stroke="'+(isNew?'var(--acc)':inRes?'var(--line)':'var(--dim)')+'" stroke-width="'+(isNew?2:1)+'"'+(inRes?'':' stroke-dasharray="3 3"')+'/>';
      s+=RD.t(x+bw/2,y+16,m.id,{fs:11.5,a:'middle',w:inRes?600:400,fill:inRes?'':'var(--mute)'});
      s+=RD.t(x+bw/2,y+31,inRes?'depth '+k:'parent '+(m.parent===null?'NULL':m.parent),{fs:10.5,a:'middle',fill:'var(--mute)'});
      if(k<n-1&&(k+1)%per!==0)s+='<path d="M'+(x+bw)+','+(y+bh/2)+' l'+g+',0" stroke="var(--mute)"/>'});
    const rows=Math.ceil(n/per),H=rows*(bh+18);
    el.innerHTML=RD.svg(W,H,s,'The rows WITH RECURSIVE has added after iteration '+i);
    const added=i<n?1:0,res=Math.min(i+1,n);
    document.getElementById('rd-rec-cnt').innerHTML=RD.stat('Iteration',i===0?'anchor':i)+RD.stat('Rows added this time',added)+RD.stat('Rows in the result',res);
  }
  function draw(i){cancelAnimationFrame(raf);const [f0,f1]=SX[i];
    if(f0===f1||!card.classList.contains('rd-fwd')||RD.RM||card.offsetParent===null){frame(f1);return}
    const T0=performance.now(),per=330;const step=now=>{const f=Math.min(f1,f0+Math.floor((now-T0)/per));frame(f);if(f<f1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}
  const A=RD.anim({card:'rd-rec-card',ctl:'rd-rec-ctl',n:SX.length,ms:5200,label:'Stretch',draw,list:'sx-rec'});
  RD.onResize(()=>A.redraw());
})();
