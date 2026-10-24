// ---- Reading, top: the hero figure. Five activations with their slopes on the same axes, and the gated block ----
// Static (no motion): each panel is drawn at its measured width. f in ink, f' (the slope) in the page's highlight colour,
// the region where the slope is exactly 0 in red, where it is below 0.01 shaded grey. Curves from AF (21_js_core.js).
(function(){
  const box=document.getElementById('hrG');if(!box)return;
  const P=[
    {id:'sigmoid',t:'Sigmoid',note:'slope at most 0.25: the gradient shrinks at every layer'},
    {id:'tanh',t:'Tanh',note:'slope 1 at 0, below 0.01 beyond |x| = 3: saturates'},
    {id:'relu',t:'ReLU',note:'slope exactly 1 or exactly 0: a unit can die'},
    {id:'gelu',t:'GELU',note:'smooth ReLU with a dip to −0.17; BERT, GPT-2, ViT'},
    {id:'silu',t:'SiLU (Swish)',note:'dip to −0.28; the gate inside SwiGLU'}
  ];
  box.innerHTML=P.map(p=>'<figure class="hr-p"><div class="hr-s" id="hr-'+p.id+'"></div><figcaption><b>'+p.t+'</b> '+p.note+'</figcaption></figure>').join('')+
    '<figure class="hr-p hr-g"><div class="hr-s" id="hr-glu"></div><figcaption><b>SwiGLU block</b> a second projection <i>g</i> sets the slope of the <i>u</i> path, unit by unit and token by token</figcaption></figure>';
  const X0=-4,X1=4,Y0=-1.2,Y1=2.2;
  function panel(p){
    const el=document.getElementById('hr-'+p.id),W=Math.max(140,RD.width(el)),H=Math.round(Math.min(150,W*0.72)),a=AF.BY[p.id];
    const ml=4,mr=4,mt=6,mb=14,sx=x=>ml+(W-ml-mr)*(x-X0)/(X1-X0),sy=y=>mt+(H-mt-mb)*(Y1-Math.max(Y0-1,Math.min(Y1+1,y)))/(Y1-Y0);
    let s='',sat='',dead='';const n=Math.round(W);
    for(let i=0;i<n;i++){const x=X0+(X1-X0)*(i+0.5)/n,d=a.d(x);
      if(a.dead&&x<0)dead+='M'+sx(x).toFixed(1)+' '+sy(0).toFixed(1)+'h'+((W-ml-mr)/n+0.3).toFixed(2);
      else if(Math.abs(d)<0.01)sat+='<rect x="'+(sx(x)-(W-ml-mr)/n/2).toFixed(1)+'" y="'+mt+'" width="'+((W-ml-mr)/n+0.4).toFixed(2)+'" height="'+(H-mt-mb)+'" fill="var(--dim)" opacity=".28"/>'}
    s+=sat;
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+sy(0)+'" y2="'+sy(0)+'" stroke="var(--line)"/><line x1="'+sx(0)+'" x2="'+sx(0)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>';
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+sy(1)+'" y2="'+sy(1)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
    const path=f=>{let d='';for(let i=0;i<=n;i++){const x=X0+(X1-X0)*i/n;d+=(i?'L':'M')+sx(x).toFixed(1)+' '+sy(f(x)).toFixed(1)}return d};
    const cid='hrc-'+p.id;s+='<clipPath id="'+cid+'"><rect x="0" y="'+mt+'" width="'+W+'" height="'+(H-mt-mb)+'"/></clipPath><g clip-path="url(#'+cid+')">';
    s+='<path d="'+path(a.f)+'" fill="none" stroke="var(--ink)" stroke-width="1.6"/>';
    s+='<path d="'+path(a.d)+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/></g>';
    if(dead)s+='<path d="'+dead+'" stroke="var(--bad)" stroke-width="4" fill="none"/>';
    s+=RD.t(sx(0)+3,sy(1)-3,'1',{fs:10.5,fill:'var(--mute)'})+RD.t(ml,H-2,'−4',{fs:10.5,fill:'var(--mute)'})+RD.t(W-mr,H-2,'4',{fs:10.5,fill:'var(--mute)',a:'end'})+RD.t(sx(0),H-2,'x = 0',{fs:10.5,fill:'var(--mute)',a:'middle'});
    el.innerHTML=RD.svg(W,H,s,p.t+' and its slope');
  }
  function glu(){
    const el=document.getElementById('hr-glu'),W=Math.max(140,RD.width(el)),H=Math.round(Math.min(150,W*0.72));
    const bw=Math.min(62,W*0.27),bh=22,cx=W*0.5;let s='';
    const bx=(x,y,w,t,hl)=>'<rect x="'+(x-w/2).toFixed(1)+'" y="'+(y-bh/2)+'" width="'+w.toFixed(1)+'" height="'+bh+'" rx="5" fill="'+(hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(hl?'var(--acc)':'var(--line)')+'"/>'+RD.t(x,y+4,t,{a:'middle',fs:11});
    const ar=(x1,y1,x2,y2)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var(--mute)" stroke-width="1.2"/>';
    const xl=W*0.2,xr=W*0.72,y0=14,y1=48,y2=82,y3=H-16;
    s+=RD.t(cx,y0+4,'x (width d)',{a:'middle',fs:11});
    s+=ar(cx,y0+8,xl,y1-bh/2)+ar(cx,y0+8,xr,y1-bh/2);
    s+=bx(xl,y1,bw,'W_gate')+bx(xr,y1,bw,'W_up');
    s+=ar(xl,y1+bh/2,xl,y2-bh/2)+bx(xl,y2,bw,'SiLU(g)',1);
    s+=ar(xr,y1+bh/2,xr,y2-9)+RD.t(xr-12,y1+bh/2+14,'u',{fs:11,fill:'var(--mute)'})+RD.t(xl+bw/2+3,y1+bh/2+14,'g',{fs:11,fill:'var(--mute)'});
    s+='<circle cx="'+xr+'" cy="'+y2+'" r="9" fill="var(--bg)" stroke="var(--acc)" stroke-width="1.5"/>'+RD.t(xr,y2+4,'⊙',{a:'middle',fs:12});
    s+=ar(xl+bw/2,y2,xr-9,y2);
    s+=ar(xr,y2+9,cx,y3-bh/2)+bx(cx,y3,bw,'W_down');
    el.innerHTML=RD.svg(W,H,s,'SwiGLU block: two projections of x, one through SiLU, multiplied, then the down projection');
  }
  function draw(){P.forEach(panel);glu()}
  RD.onRender(draw);draw();RD.onResize(draw);
})();
