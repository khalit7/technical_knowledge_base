// ---- Reading, The idea: the hero, one ML system as two lanes of one loop (static annotated diagram) ----
(function(){
  const el=document.getElementById('rd-hero');if(!el)return;
  function wrap(s,max){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if(l&&(l+' '+x).length>max){out.push(l);l=x}else l=l?l+' '+x:x});if(l)out.push(l);return out}
  // stage boxes: [title, plain line, badges]
  const OFF=[['Event logs','what was shown, done, and what happened',''],['Feature pipeline','features for training rows, as of each row\'s time','2'],['Train','fit on logged examples',''],['Offline eval','metric on held-out data','3'],['Registry','versioned model, ready to deploy','']];
  const ON=[['Request','a ticket arrives',''],['Online features','the same features, computed now','2'],['Model serves','batch or online, inside a budget','6 4'],['Action','answer, escalate, rank','3'],['Outcome logged','resolved? escalated? the metric','1']];
  function draw(){
    const W=Math.max(280,Math.min(900,RD.width(el))),wide=W>=620,fs=wide?11:10.5,cw=fs*0.56,m=18;
    let b='',H;const box={};
    const ar='marker-end="url(#rdhar)"';
    if(wide){
      const gap=10,bw=(W-2*m-gap*4)/5,bh=64,y0=22,gy=52,y1=y0+bh+gy;
      OFF.forEach((s,i)=>box['o'+i]={x:m+i*(bw+gap),y:y0,w:bw,h:bh,s});
      ON.forEach((s,i)=>box['n'+i]={x:m+i*(bw+gap),y:y1,w:bw,h:bh,s});
      b+=RD.t(m,14,'OFFLINE: LEARN',{fs:10.5,fill:'var(--mute)',w:600});
      b+=RD.t(m,y1-8,'ONLINE: SERVE',{fs:10.5,fill:'var(--mute)',w:600});
      for(let i=0;i<4;i++){const a=box['o'+i],c=box['o'+(i+1)];b+='<line x1="'+(a.x+a.w)+'" y1="'+(a.y+bh/2)+'" x2="'+(c.x-2)+'" y2="'+(c.y+bh/2)+'" stroke="var(--mute)" stroke-width="1.3" '+ar+'/>';
        const p=box['n'+i],q=box['n'+(i+1)];b+='<line x1="'+(p.x+p.w)+'" y1="'+(p.y+bh/2)+'" x2="'+(q.x-2)+'" y2="'+(q.y+bh/2)+'" stroke="var(--mute)" stroke-width="1.3" '+ar+'/>'}
      // skew and offline-against-online links
      [[1,'same values?'],[3,'same verdict?']].forEach(([i,l])=>{const a=box['o'+i],c=box['n'+i],x=a.x+a.w*0.5;
        b+='<line x1="'+x+'" y1="'+(a.y+bh)+'" x2="'+x+'" y2="'+c.y+'" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="4 3"/>'+RD.t(x+5,a.y+bh+gy/2+4,l,{fs:10.5,fill:'var(--acc)'})});
      // deploy: registry down to the model
      const r=box.o4,md=box.n2,ym=y0+bh+gy*0.78;
      b+='<path d="M'+(r.x+r.w*0.75)+','+(r.y+bh)+' V'+ym+' H'+(md.x+md.w*0.7)+' V'+(md.y-2)+'" fill="none" stroke="var(--good)" stroke-width="1.5" '+ar+'/>'+RD.t(r.x+r.w*0.75-4,ym-4,'deploy',{fs:10.5,a:'end',fill:'var(--good)'});
      // the loop: outcome back to the logs
      const o=box.n4,lg=box.o0,yb=y1+bh+16;
      b+='<path d="M'+(o.x+o.w/2)+','+(o.y+bh)+' V'+yb+' H6 V'+(lg.y+bh/2)+' H'+(lg.x-2)+'" fill="none" stroke="var(--bad)" stroke-width="1.6" '+ar+'/>';
      b+=RD.t(W/2,yb+15,'5: outcomes become the next training data, chosen by the model\'s own actions',{fs:11,a:'middle',fill:'var(--bad)'});
      H=yb+22;
    }else{
      const gap=8,gx=30,bw=(W-2*m-gx)/2,bh=58,y0=20;
      OFF.forEach((s,i)=>box['o'+i]={x:m,y:y0+i*(bh+gap+8),w:bw,h:bh,s});
      ON.forEach((s,i)=>box['n'+i]={x:m+bw+gx,y:y0+i*(bh+gap+8),w:bw,h:bh,s});
      b+=RD.t(m,13,'OFFLINE: LEARN',{fs:10.5,fill:'var(--mute)',w:600})+RD.t(m+bw+gx,13,'ONLINE: SERVE',{fs:10.5,fill:'var(--mute)',w:600});
      for(let i=0;i<4;i++){['o','n'].forEach(k=>{const a=box[k+i],c=box[k+(i+1)];b+='<line x1="'+(a.x+a.w/2)+'" y1="'+(a.y+bh)+'" x2="'+(c.x+c.w/2)+'" y2="'+(c.y-2)+'" stroke="var(--mute)" stroke-width="1.3" '+ar+'/>'})}
      [1,3].forEach(i=>{const a=box['o'+i],c=box['n'+i],y=a.y+bh*0.35;b+='<line x1="'+(a.x+a.w)+'" y1="'+y+'" x2="'+c.x+'" y2="'+y+'" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="4 3"/>'});
      const r=box.o4,md=box.n2,xm=r.x+r.w+gx*0.5;
      b+='<path d="M'+(r.x+r.w)+','+(r.y+bh*0.7)+' H'+xm+' V'+(md.y+bh*0.75)+' H'+(md.x-2)+'" fill="none" stroke="var(--good)" stroke-width="1.5" '+ar+'/>';
      const o=box.n4,lg=box.o0,yb=o.y+bh+14;
      b+='<path d="M'+(o.x+o.w/2)+','+(o.y+bh)+' V'+yb+' H6 V'+(lg.y+bh/2)+' H'+(lg.x-2)+'" fill="none" stroke="var(--bad)" stroke-width="1.6" '+ar+'/>';
      b+=RD.t(W/2,yb+15,'5: outcomes become training data',{fs:11,a:'middle',fill:'var(--bad)'});
      H=yb+22;
    }
    Object.keys(box).forEach(k=>{const q=box[k],maxc=Math.max(8,Math.floor((q.w-14)/cw)),badge=q.s[2];
      const hl=badge.indexOf('2')>=0||badge.indexOf('4')>=0;
      b+='<rect x="'+q.x+'" y="'+q.y+'" width="'+q.w+'" height="'+q.h+'" rx="6" fill="var(--soft)" stroke="'+(hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(hl?1.6:1)+'"/>';
      let ty=q.y+fs+5;wrap(q.s[0],maxc-(badge?3:0)).forEach(l=>{b+=RD.t(q.x+6,ty,RD.esc(l),{fs:fs,w:600});ty+=fs+2});
      wrap(q.s[1],maxc).forEach(l=>{if(ty<q.y+q.h-2){b+=RD.t(q.x+6,ty,RD.esc(l),{fs:fs-0.5,fill:'var(--mute)'});ty+=fs+1}});
      badge.split(' ').filter(Boolean).forEach((n,j)=>{const cx=q.x+q.w-10-j*17;b+='<circle cx="'+cx+'" cy="'+(q.y+10)+'" r="7.5" fill="var(--acc)"/>'+RD.t(cx,q.y+13.5,n,{fs:10,a:'middle',fill:'var(--bg)',w:600})})});
    const defs='<defs><marker id="rdhar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+b,'An ML system as two lanes of one loop: offline, event logs feed a feature pipeline, training, offline evaluation and a registry; online, a request gets online features, the model serves, the product acts and the outcome is logged; the outcome flows back into the logs, and the registry deploys to the model');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
