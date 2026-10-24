// ---- Reading, section 2: fan-out on user 1's real chats and messages (static figure) ----
(function(){
  const el=document.getElementById('rd-fan');if(!el)return;
  const D=window.SM_DATA,UID=1;
  const ch=D.chats.filter(c=>c[1]===UID).map(c=>({id:c[0],n:D.msgs.filter(m=>m[1]===c[0]).length})).sort((a,b)=>a.id-b.id);
  const N=ch.reduce((a,c)=>a+c.n,0),C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  function draw(){
    const W=RD.width(el),k=ch.length,gap=6,cw=Math.floor((W-gap*(k-1))/k),sq=W<420?7:9,g=2,per=Math.max(3,Math.floor((cw-4)/(sq+g)));
    let s='<rect x="0" y="2" width="'+Math.min(W,240)+'" height="24" rx="6" fill="var(--acc2)"/>'+RD.t(8,18,'users: user '+UID+' (1 row)',{fs:12,w:600});
    let y=46,maxRows=0;
    ch.forEach((c,i)=>{const x=i*(cw+gap);
      s+='<path d="M40,26 L'+(x+cw/2)+','+y+'" stroke="var(--line)"/>';
      s+='<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="34" rx="6" fill="var(--bg)" stroke="'+C[i%6]+'" stroke-width="1.6"/>';
      s+=RD.t(x+cw/2,y+14,'chat '+c.id,{fs:11,a:'middle',w:600})+RD.t(x+cw/2,y+28,c.n+' msgs',{fs:11,a:'middle',fill:'var(--mute)'});
      maxRows=Math.max(maxRows,Math.ceil(c.n/per))});
    y+=46;const tl=SV.wrap('after JOIN messages: one row per message, each repeating its user and chat',W,11);s+=SV.lines(0,y,tl,{fs:11,fill:'var(--mute)',lh:15});y+=8+(tl.length-1)*15;
    ch.forEach((c,i)=>{const x=i*(cw+gap)+2;for(let j=0;j<c.n;j++){s+='<rect x="'+(x+(j%per)*(sq+g))+'" y="'+(y+Math.floor(j/per)*(sq+g))+'" width="'+sq+'" height="'+sq+'" rx="1.5" fill="'+C[i%6]+'"/>'}});
    y+=maxRows*(sq+g)+18;
    s+=RD.t(0,y,'COUNT(c.id) = '+N+' (one per row)',{fs:12,w:600,fill:'var(--bad)'});
    s+=RD.t(W<420?0:W/2,W<420?y+18:y,'chats user '+UID+' has = '+k,{fs:12,w:600,fill:'var(--good)'});
    el.innerHTML=RD.svg(W,y+(W<420?24:8),s,'Fan-out: user '+UID+'’s chats repeated once per message');
    document.getElementById('rd-fan-cap').textContent='User '+UID+' has '+k+' chats holding '+N+' messages ('+ch.map(c=>c.n).join(' + ')+'). Joining users to chats to messages makes '+N+' rows, so COUNT(c.id) counts each chat once per message: '+N+' "chats", the number the first query in the box below returns. SUM(m.tokens) is right here only because tokens live on the bottom table; a sum of a chat-level column would be inflated the same way.';
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
