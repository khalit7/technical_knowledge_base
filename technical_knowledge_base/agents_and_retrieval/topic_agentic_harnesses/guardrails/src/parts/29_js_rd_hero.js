// ---- Reading, top: the hero figure. One request's path with a rail at each stage, what each sees and costs, and the boundary outside the model ----
// Static annotated diagram (no animation): drawn at the measured width, side by side when wide, stacked when narrow.
(function(){
  const el=document.getElementById('rd-hero');if(!el)return;
  const ST=[
    {k:'in',h:'Before the call',s:'input rails',col:'var(--c1)',
     items:['injection detector','harm classifier (prompt)','PII masking','scope / topic rail'],
     cost:'8 to 92 ms (22M to 184M)',miss:'what appears later'},
    {k:'mid',h:'During the call',s:'action and stream rails',col:'var(--c4)',
     items:['tool-call policy check','filter on tool output','LLM auditor of the trace','streaming cut-off'],
     cost:'0 ms (code) to an LLM call',miss:'injected tool output'},
    {k:'out',h:'After the call',s:'output rails',col:'var(--c3)',
     items:['harm (prompt + answer)','groundedness','leakage: PII, secrets','format and policy'],
     cost:'a few 100 ms (8B guard)',miss:'an agent already acted'}
  ];
  function draw(){
    const w=RD.width(el),wide=w>=760,T=RD.t;let b='',H;
    const box=(x,y,bw,bh,s)=>{
      let g='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="'+s.col+'" stroke-width="1.6"/>';
      g+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="24" rx="8" fill="'+s.col+'"/><rect x="'+x+'" y="'+(y+16)+'" width="'+bw+'" height="8" fill="'+s.col+'"/>';
      g+=T(x+10,y+16,s.h,{fs:12,w:600,fill:'var(--bg)'});
      g+=T(x+10,y+40,s.s,{fs:11.5,w:600,fill:s.col});
      s.items.forEach((it,i)=>{g+='<circle cx="'+(x+14)+'" cy="'+(y+56+i*17)+'" r="3" fill="'+s.col+'"/>'+T(x+22,y+60+i*17,it,{fs:11.5,fill:'var(--ink)'})});
      const yc=y+60+s.items.length*17+4;
      g+=T(x+10,yc,'cost: '+s.cost,{fs:11,fill:'var(--mute)'});
      g+=T(x+10,yc+15,'misses: '+s.miss,{fs:11,fill:'var(--bad)'});
      return g};
    const bh=60+4*17+4+22;
    const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#rdh-ar)"/>';
    const defs='<defs><marker id="rdh-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
    if(wide){
      const ew=62,gap=22,bw=(w-2*ew-4*gap)/3,y=30;
      b+=T(0,y+bh/2-6,'user,',{fs:11.5,w:600})+T(0,y+bh/2+8,'documents',{fs:11.5,w:600})+T(0,y+bh/2+22,'tool results',{fs:11,fill:'var(--mute)'});
      let x=ew+gap;
      b+=arrow(ew-4,y+bh/2,x-3,y+bh/2);
      ST.forEach((s,i)=>{b+=box(x,y,bw,bh,s);if(i<2)b+=arrow(x+bw+2,y+bh/2,x+bw+gap-3,y+bh/2);x+=bw+gap});
      b+=arrow(x-gap+2,y+bh/2,x+2,y+bh/2);
      b+=T(w,y+bh/2-6,'user,',{fs:11.5,w:600,a:'end'})+T(w,y+bh/2+8,'the world',{fs:11.5,w:600,a:'end'});
      b+=T(ew+gap,14,'cheapest place to block: nothing generated yet',{fs:11,fill:'var(--mute)'});
      b+=T(w-ew-gap,14,'costliest: a second pass, or too late',{fs:11,fill:'var(--mute)',a:'end'});
      const by=y+bh+16,bx=ew+gap+bw+gap;
      b+='<rect x="'+bx+'" y="'+by+'" width="'+(2*bw+gap)+'" height="40" rx="8" fill="none" stroke="var(--acc)" stroke-dasharray="5 4" stroke-width="1.5"/>';
      b+=T(bx+10,by+16,'Outside the model, no false-negative rate: permission gate,',{fs:11.5,fill:'var(--acc)',w:600});
      b+=T(bx+10,by+31,'egress allowlist, credentials it never holds (Agent security)',{fs:11.5,fill:'var(--acc)',w:600});
      H=by+46;
    }else{
      const bw=w-2;let y=18;
      b+=T(0,12,'user, documents, tool results',{fs:11.5,w:600});
      ST.forEach((s,i)=>{b+=arrow(bw/2,y,bw/2,y+14);y+=16;b+=box(1,y,bw-1,bh,s);y+=bh+2});
      b+=arrow(bw/2,y,bw/2,y+14);y+=28;
      b+=T(0,y,'user, the world',{fs:11.5,w:600});y+=12;
      b+='<rect x="1" y="'+y+'" width="'+(bw-1)+'" height="56" rx="8" fill="none" stroke="var(--acc)" stroke-dasharray="5 4" stroke-width="1.5"/>';
      b+=T(10,y+17,'Outside the model, no false-negative rate:',{fs:11.5,fill:'var(--acc)',w:600});
      b+=T(10,y+32,'permission gate, egress allowlist, credentials',{fs:11.5,fill:'var(--acc)',w:600});
      b+=T(10,y+47,'it never holds (Agent security)',{fs:11.5,fill:'var(--acc)',w:600});
      H=y+60;
    }
    el.innerHTML=RD.svg(w,H,defs+b,'The request path: input rails before the call, action and stream rails during it, output rails after it, and the permission boundary outside the model');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
