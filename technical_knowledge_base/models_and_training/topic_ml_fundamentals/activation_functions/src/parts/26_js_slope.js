// ---- Reading, saturation section: the same 3,072 real pre-activations through five activations' slopes ----
// Before/after on one input (toggle-compare, no motion). Input: GPT-2 small's pre-activations of " cat" in layer 6
// (recorded by real_models.py, stored in DATA). Units sorted by pre-activation; top strip the pre-activation, bottom
// the slope f'(x) each unit multiplies its gradient by. src/slope_numbers.mjs prints the same counters.
(function(){
  const card=document.getElementById('sl');if(!card)return;
  const $=id=>document.getElementById(id);
  const pre0=AFD.dq(AFD.M.gpt2.tok.pre).slice().sort((a,b)=>a-b);
  const NM={sigmoid:'Sigmoid',tanh:'Tanh',relu:'ReLU',gelut:'GELU (tanh form, as GPT-2 runs it)',silu:'SiLU'};
  let fn='gelut',k=1;
  const pc=v=>(v*100).toFixed(1)+'%';
  function stats(){const a=AF.BY[fn],x=pre0.map(v=>v*k),d=x.map(a.d);
    return {x,d,mean:d.reduce((p,q)=>p+Math.abs(q),0)/d.length,zero:a.dead?x.filter(v=>v<=0).length/x.length:0,
      low:d.filter(v=>Math.abs(v)<0.01).length/d.length,max:Math.max(...d)}}
  function draw(){
    const el=$('slSvg'),W=RD.width(el),S=stats(),n=S.x.length,ml=34,mr=6,iw=W-ml-mr;
    const xlo=Math.min(...S.x),xhi=Math.max(...S.x),h1=70,t1=16,t2=t1+h1+30,h2=90,H=t2+h2+24;
    const zx=t1+h1*xhi/(xhi-xlo);   // y of pre-activation 0 in the top strip
    const SY=v=>t2+h2*(1.15-Math.max(-0.2,Math.min(1.15,v)))/1.35,Y0=SY(0);
    const cols=Math.max(1,Math.floor(iw));let s='',top='',bot='',red='',grey='';
    for(let c=0;c<cols;c++){const a=Math.floor(c*n/cols),b=Math.max(a+1,Math.floor((c+1)*n/cols));let xm=0,dm=0,dead=false,low=true;
      for(let i=a;i<b;i++){xm+=S.x[i];dm+=S.d[i];if(AF.BY[fn].dead&&S.x[i]<=0)dead=true;if(Math.abs(S.d[i])>=0.01)low=false}
      xm/=(b-a);dm/=(b-a);const X=(ml+c+0.5).toFixed(1);
      top+='M'+X+' '+zx.toFixed(1)+'V'+(t1+h1*(xhi-xm)/(xhi-xlo)).toFixed(1);
      const yb=Y0,yh=SY(dm);
      if(dead&&dm===0)red+='M'+X+' '+(Y0-3)+'V'+(Y0+3);
      else{bot+='M'+X+' '+yb+'V'+yh.toFixed(1);if(low)grey+='M'+X+' '+(t2)+'V'+(t2+h2)}}
    s+=RD.t(ml,11,'pre-activation x, the 3,072 units sorted'+(k!==1?' (× '+k+')':''),{fs:11,fill:'var(--mute)'});
    s+='<path d="'+top+'" stroke="var(--mute)" stroke-width="1"/>';
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+zx.toFixed(1)+'" y2="'+zx.toFixed(1)+'" stroke="var(--line)"/>';
    s+=RD.t(ml-4,t1+8,xhi.toFixed(1),{fs:10.5,a:'end',fill:'var(--mute)'})+RD.t(ml-4,zx+4,'0',{fs:10.5,a:'end',fill:'var(--mute)'})+RD.t(ml-4,t1+h1,xlo.toFixed(1),{fs:10.5,a:'end',fill:'var(--mute)'});
    s+=RD.t(ml,t2-8,"slope f′(x): what each unit's gradient is multiplied by",{fs:11,fill:'var(--mute)'});
    s+='<path d="'+grey+'" stroke="var(--dim)" stroke-width="1" opacity=".3"/>';
    const y1=SY(1);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y1.toFixed(1)+'" y2="'+y1.toFixed(1)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    s+='<path d="'+bot+'" stroke="var(--acc)" stroke-width="1"/>';
    if(red)s+='<path d="'+red+'" stroke="var(--bad)" stroke-width="1"/>';
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y0+'" y2="'+Y0+'" stroke="var(--line)"/>';
    s+=RD.t(ml-4,y1+4,'1',{fs:10.5,a:'end',fill:'var(--mute)'})+RD.t(ml-4,Y0+4,'0',{fs:10.5,a:'end',fill:'var(--mute)'});
    s+=RD.t(ml,H-4,'most negative',{fs:10.5,fill:'var(--mute)'})+RD.t(W-mr,H-4,'most positive',{fs:10.5,a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Slope of '+NM[fn]+' on the same 3,072 pre-activations');
    $('slN').innerHTML=RD.stat('Mean |slope|',S.mean.toFixed(3),'over the 3,072 units')+RD.stat('Slope exactly 0',pc(S.zero),S.zero?'dead region: no gradient at all':'never exactly 0')+
      RD.stat('Slope below 0.01',pc(S.low),'saturated: gradient almost gone')+RD.stat('Largest slope',S.max.toFixed(3),fn==='sigmoid'?'the 0.25 ceiling':'');
    const msg={sigmoid:'No unit is saturated, yet none passes more than a quarter of its gradient: through ten such layers the slopes alone shrink the gradient at least a million times (4<sup>10</sup> = 1,048,576).',
      tanh:'At this scale tanh is the most generous: these inputs sit near 0, where its slope is close to 1. Scale the inputs by 3 and almost half of them saturate.',
      relu:'Almost nine units in ten have a negative input, and pass exactly no gradient back; the rest pass all of it. Scaling the inputs changes nothing: the dead share depends only on signs.',
      gelut:'The function GPT-2 was trained with. Negative inputs pass a small slope (down to about −0.13), not zero, so no unit is cut off completely on this token.',
      silu:'Like GELU, with a longer negative tail: at × 3 only 8.8% of units fall below 0.01, against 43.9% for GELU.'};
    $('slP').innerHTML='<b>'+NM[fn]+(k!==1?', inputs × '+k:'')+'.</b> '+msg[fn];
  }
  RD.seg($('slF'),m=>{fn=m;draw()});RD.seg($('slK'),m=>{k=+m;draw()});
  RD.onRender(draw);draw();RD.onResize(draw);
})();
