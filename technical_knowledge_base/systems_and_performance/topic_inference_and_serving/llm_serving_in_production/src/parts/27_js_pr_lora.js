// ---- Reading tab, section 5: four requests on three adapters, one adapter set per batch against a mixed batch (toggle of end states) ----
(function(){
  const el=document.getElementById('pr-lora-svg');if(!el)return;
  const cap=document.getElementById('pr-lora-cap');
  const REQ=[['r1','A'],['r2','B'],['r3','A'],['r4','C']],COL={A:'var(--c1)',B:'var(--c2)',C:'var(--c3)'};
  let mode='turns';
  const pill=(x,y,w,r)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="18" rx="4" fill="'+COL[r[1]]+'"/>'+RD.t(x+w/2,y+13,r[0]+' ('+r[1]+')',{a:'middle',fs:10.5,fill:'var(--bg)',w:600});
  const arrow=(x1,y,x2)=>'<path d="M'+x1+' '+y+'H'+(x2-2)+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#pr-lah)"/>';
  const defs='<defs><marker id="pr-lah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>';
  function column(x,cw,title,reqs,adapters,top){
    let g=RD.t(x,top,title,{fs:11.5,w:600});
    const pw=Math.min(64,cw*0.32),y0=top+10,rows=reqs.length,H=Math.max(rows*24,62);
    reqs.forEach((r,i)=>{g+=pill(x,y0+i*24,pw,r);g+=arrow(x+pw+2,y0+i*24+9,x+pw+18)});
    const wx=x+pw+18,ww=Math.max(60,cw-pw-18-(adapters?Math.min(70,cw*0.28)+12:0));
    g+='<rect x="'+wx+'" y="'+y0+'" width="'+ww+'" height="'+(H-6)+'" rx="6" fill="var(--soft)" stroke="var(--ink)" stroke-width="1.5"/>';
    g+=RD.t(wx+ww/2,y0+(H-6)/2,'x W',{a:'middle',fs:12,w:600});g+=RD.t(wx+ww/2,y0+(H-6)/2+15,'base, read once',{a:'middle',fs:10.5,fill:'var(--mute)'});
    if(adapters){const ax=wx+ww+12,aw=Math.min(70,cw*0.28);
      adapters.forEach((a,i)=>{const yy=adapters.length===rows?y0+i*24:y0+((H-6)/2)-9;
        g+='<rect x="'+ax+'" y="'+yy+'" width="'+aw+'" height="18" rx="4" fill="none" stroke="'+COL[a]+'" stroke-width="2"/>'+RD.t(ax+aw/2,yy+13,'x A B ('+a+')',{a:'middle',fs:10.5,fill:COL[a],w:600})})}
    return {g,h:y0+H};
  }
  function draw(){
    const w=RD.width(el);let g=defs,h=0;
    if(mode==='turns'){
      const steps=[['Step 1: adapter A',[REQ[0],REQ[2]],['A']],['Step 2: adapter B',[REQ[1]],['B']],['Step 3: adapter C',[REQ[3]],['C']]];
      if(w>=700){const cw=(w-24)/3;steps.forEach((s,i)=>{const c=column(i*(cw+12),cw,s[0],s[1],s[2],12);g+=c.g;h=Math.max(h,c.h)})}
      else{let top=12;steps.forEach(s=>{const c=column(0,w-2,s[0],s[1],s[2],top);g+=c.g;top=c.h+20});h=top-14}
      cap.innerHTML='<b>Three passes over W for one token of four requests.</b> llama-server batches only slots whose adapter sets are equal, so requests on A, B and C take turns: batches of 2, 1 and 1, and the base weights, the expensive read, are streamed three times. Measured below: two or more different adapters in flight drop the server to the speed of one user.';
    }else{
      const c=column(0,Math.min(w-2,620),'One step: every request, any adapter',REQ,REQ.map(r=>r[1]),12);g+=c.g;h=c.h;
      cap.innerHTML='<b>One pass over W, then one gathered kernel for the small products.</b> The base multiply is shared by the whole batch of 4; each row also multiplies by its own adapter\'s A and B, which Punica computes for all rows in one launch. An adapter here is 4.6 million parameters against 0.6 billion, so its extra multiply-adds per token are about 1% of the base model\'s <span class="der">derived: 4.6 M / 600 M parameters = 0.8%; 4.6 M / 0.44 B non-embedding parameters (model card) = 1.0%</span>.';
    }
    el.innerHTML=RD.svg(w,h+6,g,mode==='turns'?'Requests on different adapters taking turns in separate batches':'Requests on different adapters in one batch sharing the base multiply');
  }
  RD.seg(document.getElementById('pr-lora-mode'),v=>{mode=v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
