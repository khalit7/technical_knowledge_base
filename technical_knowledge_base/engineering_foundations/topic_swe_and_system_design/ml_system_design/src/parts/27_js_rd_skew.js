// ---- Reading, section 2: training-serving skew, one ticket's feature computed by two code paths, then by one (before/after toggle, static) ----
(function(){
  const el=document.getElementById('rd-skew-svg');if(!el)return;
  const cap=document.getElementById('rd-skew-cap');let mode='before';
  function wrap(s,max){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if(l&&(l+' '+x).length>max){out.push(l);l=x}else l=l?l+' '+x:x});if(l)out.push(l);return out}
  const D={
    before:{code:[['Nightly SQL','last 7 calendar days, UTC, before today'],['Stream counter','last 168 hours up to now']],val:['3','5'],dec:['answer it','escalate'],bad:true,
      cap:'<b>Before: two code paths.</b> Training rows got the feature from a nightly warehouse job; the live service counts on a stream. Both are "tickets in the last 7 days", yet for this ticket they give 3 and 5, so the model meets an input it never learned from and makes a different call than offline evaluation predicted. No error is raised anywhere.'},
    after:{code:[['One definition','feature store or shared code (Rule #32)'],null],val:['5','5'],dec:['escalate','escalate'],bad:false,
      cap:'<b>After: one definition, logged at serving.</b> Both sides call the same feature code, and the service writes the value it used into the log; training reads that logged value (Rule #29). The model is trained on exactly what it will see.'}};
  function draw(){const d=D[mode],W=Math.max(280,Math.min(860,RD.width(el))),fs=W<480?10.5:11.5,cw=fs*0.56,m=4,lab=16,gap=W<480?22:34;
    const c0=Math.round((W-2*m-2*gap)*0.46),c1=Math.round((W-2*m-2*gap)*0.18),c2=W-2*m-2*gap-c0-c1;
    const x0=m,x1=x0+c0+gap,x2=x1+c1+gap,bh=W<480?58:50,y=[lab,lab+bh+lab+18];let b='';
    const rect=(x,yy,w,h,st,sw)=>'<rect x="'+x+'" y="'+yy+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+st+'" stroke-width="'+(sw||1)+'"/>';
    const text=(x,yy,w,lines,o)=>{let s='',ty=yy;lines.forEach((l,i)=>{wrap(l,Math.floor((w-12)/cw)).forEach(q=>{s+=RD.t(x+6,ty,RD.esc(q),{fs:i?fs-1:fs,w:i?400:600,fill:i?'var(--mute)':(o||'var(--ink)')});ty+=fs+2})});return s};
    const ar='marker-end="url(#rdsar)"';
    if(d.code[1]){[0,1].forEach(r=>{b+=rect(x0,y[r],c0,bh,'var(--bad)',1.6)+text(x0,y[r]+fs+4,c0,d.code[r])})}
    else{const h=y[1]+bh-y[0];b+=rect(x0,y[0],c0,h,'var(--good)',1.8)+text(x0,y[0]+h/2-fs/2,c0,d.code[0])}
    [0,1].forEach(r=>{const col=d.bad?'var(--bad)':'var(--good)';
      b+='<line x1="'+(x0+c0)+'" y1="'+(y[r]+bh/2)+'" x2="'+(x1-2)+'" y2="'+(y[r]+bh/2)+'" stroke="var(--mute)" stroke-width="1.3" '+ar+'/>';
      b+=rect(x1,y[r],c1,bh,col,1.6)+RD.t(x1+c1/2,y[r]+bh/2+7,d.val[r],{fs:20,a:'middle',w:700,fill:col});
      b+='<line x1="'+(x1+c1)+'" y1="'+(y[r]+bh/2)+'" x2="'+(x2-2)+'" y2="'+(y[r]+bh/2)+'" stroke="var(--mute)" stroke-width="1.3" '+ar+'/>';
      b+=rect(x2,y[r],c2,bh,'var(--line)')+text(x2,y[r]+fs+4,c2,['Model',d.dec[r]])});
    if(d.bad)b+=RD.t(x1+c1/2,y[1]-8,'3 ≠ 5',{fs:11.5,a:'middle',w:700,fill:'var(--bad)'});
    else b+='<path d="M'+(x1+c1*0.5)+','+y[1]+' V'+(y[0]+bh+2)+'" fill="none" stroke="var(--good)" stroke-width="1.6" '+ar+'/>'+RD.t(x1+c1*0.5+5,y[1]-10,'log',{fs:11,fill:'var(--good)',w:600});
    ['TRAINING ROW (offline)','LIVE REQUEST (online)'].forEach((t,r)=>b+=RD.t(d.code[1]?m:x2,y[r]-5,t,{fs:10.5,fill:'var(--mute)',w:600}));
    const defs='<defs><marker id="rdsar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,y[1]+bh+4,defs+b,'One ticket\'s feature, tickets this customer opened in the last 7 days, computed for a training row and for the live request');
    cap.innerHTML=d.cap}
  RD.seg(document.getElementById('rd-skew-seg'),v=>{mode=v;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
