// ---- Section 5: embedded against referenced, drawn to scale (inputs/doc.json) ----
(function(){
  const el=document.getElementById('rd-doc-svg');if(!el||!window.NQ||!NQ.doc)return;
  const m=NQ.doc.mongo,T=RD.t,f0=n=>Math.round(n).toLocaleString('en-US');
  const ref=50*m.sizes.messages.avgObjSize, emb=m.long_chat_doc_bytes, lim=m.limit16.limit_bytes;
  const kb=b=>b<1048576?f0(b/1024)+' KB':(b/1048576).toFixed(1)+' MB';
  function draw(){const w=RD.width(el),x0=8,bw=w-16;let s='',y=14;
    s+=T(x0,y,'Bytes read to show chat 7\'s newest 50',{fs:11.5,w:600});y+=14;s+=T(x0,y,'scale: '+kb(emb)+' = full width',{fs:10.5,fill:'var(--mute)'});y+=8;
    const row=(lab,b,c,max,sub)=>{const L=Math.max(2,bw*b/max);let r='<rect x="'+x0+'" y="'+y+'" width="'+L.toFixed(1)+'" height="18" rx="3" fill="'+c+'"/>';
      const tx=L+x0+6, txt=lab+': '+kb(b)+(sub?' '+sub:'');
      r+=(tx+txt.length*6<w)?T(tx,y+13,txt,{fs:11}):T(x0+4,y+13,txt,{fs:11,fill:'var(--bg)',w:600});y+=24;return r};
    s+=row('referenced, 50 documents',ref,'var(--good)',emb,'');
    s+=row('embedded, 1 document',emb,'var(--bad)',emb,'(all '+f0(m.long_chat_messages)+' messages)');
    y+=12;s+=T(x0,y,'Document size against the 16 MiB limit',{fs:11.5,w:600});y+=14;s+=T(x0,y,'scale: 16 MiB = full width',{fs:10.5,fill:'var(--mute)'});y+=8;
    s+='<rect x="'+x0+'" y="'+y+'" width="'+bw+'" height="22" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
    const mk=(b,lab,c,dy)=>{const x=x0+bw*b/lim;return '<line x1="'+x.toFixed(1)+'" y1="'+(y-2)+'" x2="'+x.toFixed(1)+'" y2="'+(y+24)+'" stroke="'+c+'" stroke-width="2.4"/>'+T(Math.min(x+4,w-4),y+36+dy,lab,{fs:11,fill:c,a:x>w*0.6?'end':'start'})};
    s+=mk(emb,'chat 7: '+kb(emb),'var(--c1)',0);
    s+=mk(m.append.big_doc_bytes,'20,000 messages: '+kb(m.append.big_doc_bytes),'var(--c5)',14);
    s+=mk(m.limit16.doc_bytes,f0(m.limit16.messages_fitted)+' messages fit; the next is refused','var(--bad)',28);
    el.innerHTML=RD.svg(w,y+70,s,'Bytes read for the newest 50 messages, referenced against embedded, and document sizes against the 16 MiB limit')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
