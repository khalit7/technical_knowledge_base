// ---- Reading, hero: the three boxes every optimiser passes through (static annotated diagram, drawn at the measured width) ----
(function(){
  const host=document.getElementById('hero-svg');if(!host)return;
  const B=[
    {t:'gradient gₜ',l:['from backprop,','one mini-batch'],s:'',a:false},
    {t:'1  smooth over time',l:['momentum m ← βm + g','SGD+mom, Adam, Lion, Muon'],s:'+1 value',a:true},
    {t:'2  reshape',l:['÷ √v per coordinate: Adam (+1)','L^(−1/4) G R^(−1/4): Shampoo, SOAP','orthogonalise: Muon','sign: Lion'],s:'0 to 1 value, or factors',a:true},
    {t:'3  × ηₜ, the schedule',l:['warmup, hold, decay'],s:'none',a:true,spark:true},
    {t:'apply',l:['θ ← θ − step','− ηₜλθ (decoupled decay)'],s:'',a:false}];
  function draw(){
    const W=RD.width(host),wide=W>=760;let s='';
    const lh=14,pad=8,tf=12;
    const hOf=b=>pad*2+16+b.l.length*lh+(b.spark?30:0)+(b.s?lh:0);
    if(wide){
      const n=B.length,gap=16,wt=[0.12,0.21,0.28,0.17,0.22],avail=W-gap*(n-1),H=Math.max(...B.map(hOf))+4;let x=0;
      B.forEach((b,i)=>{const bw=avail*wt[i];s+=box(b,x,2,bw,H-4);
        if(i<n-1)s+=arrow(x+bw+2,H/2,x+bw+gap-2,H/2);x+=bw+gap});
      host.innerHTML=RD.svg(W,H,s,'Gradient, smooth, reshape, schedule, apply');
    }else{
      const gap=14;let y=2;const bw=W-4;
      B.forEach((b,i)=>{const h=hOf(b);s+=box(b,2,y,bw,h);y+=h;if(i<B.length-1){s+=arrow(W/2,y+1,W/2,y+gap-1);y+=gap}});
      host.innerHTML=RD.svg(W,y+2,s,'Gradient, smooth, reshape, schedule, apply');
    }
    function box(b,x,y,w,h){let r='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(b.a?'var(--acc2)':'var(--soft)')+'" stroke="'+(b.a?'var(--acc)':'var(--line)')+'"/>';
      let yy=y+pad+12;r+=RD.t(x+pad,yy,b.t,{fs:tf,w:600});yy+=4;
      b.l.forEach(q=>{yy+=lh;r+=RD.t(x+pad,yy,q,{fs:11})});
      if(b.spark){const x0=x+pad,x1=x+w-pad,y0=yy+26,y1=yy+8;let d='';for(let k=0;k<=60;k++){const t=k/60;const v=t<0.1?t/0.1:t<0.8?1:1-Math.sqrt((t-0.8)/0.2);d+=(k?'L':'M')+(x0+t*(x1-x0)).toFixed(1)+','+(y0-v*(y0-y1)).toFixed(1)}
        r+='<line x1="'+x0+'" x2="'+x1+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--line)"/><path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';yy+=30}
      if(b.s){yy+=lh;r+=RD.t(x+pad,yy,'state: '+b.s,{fs:11,fill:'var(--mute)'})}
      return r}
    function arrow(x1,y1,x2,y2){const ang=Math.atan2(y2-y1,x2-x1),a=6;
      return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+x2+','+y2+'L'+(x2-a*Math.cos(ang-0.5))+','+(y2-a*Math.sin(ang-0.5))+'L'+(x2-a*Math.cos(ang+0.5))+','+(y2-a*Math.sin(ang+0.5))+'Z" fill="var(--mute)"/>'}
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
