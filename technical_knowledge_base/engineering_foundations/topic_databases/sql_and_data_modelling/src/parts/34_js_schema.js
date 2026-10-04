// ---- Reading, one screen: the four tables and their keys, drawn to the measured width ----
(function(){
  const el=document.getElementById('rd-schema');if(!el)return;
  const T=[
    {n:'users',c:[['id','PK'],['email','UNIQUE'],['name',''],['plan','CHECK'],['country',''],['created_at','']]},
    {n:'chats',c:[['id','PK'],['user_id','FK'],['title',''],['model',''],['created_at','']]},
    {n:'messages',c:[['id','PK'],['chat_id','FK'],['parent_id','FK'],['role','CHECK'],['content',''],['tokens','CHECK'],['created_at','']]},
    {n:'credits',c:[['user_id','PK, FK'],['balance','CHECK']]}];
  // links: [from table, from col, to table] (to the target's id / user_id row 0)
  const L=[[1,1,0],[2,1,1],[2,2,2],[3,0,0]];
  function draw(){
    const W=RD.width(el),narrow=W<600,cols=narrow?2:4,gap=narrow?14:22,bw=Math.floor((W-16-gap*(cols-1))/cols),rh=19,hh=24;
    const order=narrow?[0,1,3,2]:[3,0,1,2];const pos=[];let maxY=0;
    order.forEach((ti,k)=>{const col=k%cols,row=Math.floor(k/cols);
      const y=row===0?4:4+hh+rh*6+10+gap+6;pos[ti]={x:col*(bw+gap),y,w:bw};});
    let s='<defs><marker id="sch-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--c2)"/></marker></defs>';
    T.forEach((t,ti)=>{const p=pos[ti],h=hh+rh*t.c.length+4;maxY=Math.max(maxY,p.y+h);
      s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+h+'" rx="7" fill="var(--bg)" stroke="var(--line)"/>';
      s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+hh+'" rx="7" fill="var(--acc2)"/>';
      s+=RD.t(p.x+8,p.y+16,t.n,{fs:12.5,w:600});
      const rows=t.n==='users'?50:t.n==='chats'?200:t.n==='messages'?2000:50;
      s+=RD.t(p.x+p.w-6,p.y+16,rows.toLocaleString('en-US')+' rows',{fs:10.5,a:'end',fill:'var(--mute)'});
      t.c.forEach((c,i)=>{const y=p.y+hh+rh*i+14;const k=c[1];
        const col=k.indexOf('PK')===0?'var(--acc)':k.indexOf('FK')>=0?'var(--c2)':'var(--ink)';
        s+='<text x="'+(p.x+8)+'" y="'+y+'" font-size="11.5" font-family="ui-monospace,Menlo,monospace" fill="'+col+'"'+(k?' font-weight="600"':'')+'>'+c[0]+'</text>';
        if(k)s+=RD.t(p.x+p.w-6,y,k,{fs:10,a:'end',fill:'var(--mute)'});});
    });
    L.forEach(([a,ci,b])=>{const pa=pos[a],pb=pos[b];const ya=pa.y+hh+rh*ci+10,yb=pb.y+12;
      let x1,x2,d;
      if(a===b){x1=pa.x+pa.w;d='M'+x1+','+ya+' C'+(x1+18)+','+ya+' '+(x1+18)+','+(pa.y+hh+10)+' '+x1+','+(pa.y+hh+10);}
      else if(Math.abs(pa.y-pb.y)<5){x1=pa.x;x2=pb.x+pb.w;if(pa.x<pb.x){x1=pa.x+pa.w;x2=pb.x}d='M'+x1+','+ya+' C'+((x1+x2)/2)+','+ya+' '+((x1+x2)/2)+','+yb+' '+x2+','+yb;}
      else{x1=pa.x+pa.w/2;x2=pb.x+pb.w/2;const y1=pa.y,y2=pb.y+hh+rh*T[b].c.length+4;d='M'+(pa.x+12)+','+y1+' C'+(pa.x+12)+','+(y1-20)+' '+x2+','+(y2+20)+' '+x2+','+y2;}
      s+='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="1.4" marker-end="url(#sch-ar)" opacity=".85"/>';});
    el.innerHTML=RD.svg(W,maxY+6,s,'The four tables of the chat data and their foreign keys');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
