// ---- Reading tab, section 1: cost per million tokens against average traffic, self-hosted fleet against an API ----
// Inputs from the parent page's Capacity planner (worked example "Chat assistant", prices of 2026-10-08):
// 10 H200s at $4.47 an hour, 20 requests/s at peak, 2,300 tokens per request (2,000 in, 300 out), API $0.40 per million.
(function(){
  const el=document.getElementById('pr-cost-svg');if(!el)return;
  const GPUS=10,GPU_H=4.47,PEAK=20,TOK=2300,API=0.40;
  const FLEET=GPUS*GPU_H;                              // $44.70 an hour
  const mtokH=s=>PEAK*s*TOK*3600/1e6;                  // millions of tokens an hour at share s of the peak
  const self=s=>FLEET/mtokH(s);                        // $ per million tokens, self-hosted
  const BE=FLEET/(API*mtokH(1));                       // break-even share, 0.675
  const sl=document.getElementById('pr-cost-s'),out=document.getElementById('pr-cost-v'),cnt=document.getElementById('pr-cost-cnt');
  function draw(){
    const s=+sl.value/100,w=RD.width(el),L=44,R=22,T=14,h=210,B=34,ymax=3,
      x=v=>L+(w-L-R)*(v-0.1)/0.9,y=v=>T+(h-T-B)*(1-Math.min(v,ymax)/ymax);
    let g='';
    [0,0.5,1,1.5,2,2.5,3].forEach(v=>{g+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,y(v)+4,'$'+v.toFixed(2),{a:'end',fs:10.5,fill:'var(--mute)'})});
    [0.1,0.25,0.5,0.75,1].forEach(v=>{g+=RD.t(x(v),h-B+15,Math.round(v*100)+'%',{a:'middle',fs:10.5,fill:'var(--mute)'})});
    g+=RD.t(w-R,h-3,'average traffic, share of the peak',{a:'end',fs:10.5,fill:'var(--mute)'});
    // cheaper-region shading
    g+='<rect x="'+x(BE)+'" y="'+T+'" width="'+(x(1)-x(BE))+'" height="'+(h-T-B)+'" fill="var(--good)" opacity=".08"/>';
    let d='';for(let v=0.1;v<=1.0001;v+=0.01)d+=(d?'L':'M')+x(v).toFixed(1)+' '+y(self(v)).toFixed(1);
    g+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2.4"/>';
    g+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y(API)+'" y2="'+y(API)+'" stroke="var(--c4)" stroke-width="2" stroke-dasharray="6 4"/>';
    g+=RD.t(w-R-2,y(API)-6,'API $0.40',{a:'end',fs:11,fill:'var(--c4)',w:600});
    g+=RD.t(x(0.13),y(self(0.13))-4<T+10?T+12:y(Math.min(ymax,self(0.13)))+16,'self-hosted, 10 H200s',{fs:11,fill:'var(--acc)',w:600});
    g+='<line x1="'+x(BE)+'" x2="'+x(BE)+'" y1="'+T+'" y2="'+(h-B)+'" stroke="var(--good)" stroke-dasharray="3 3"/>';
    g+=RD.t(x(BE)+(w<520?-4:4),T+12,'break-even '+Math.round(BE*100)+'%',{a:w<520?'end':'start',fs:10.5,fill:'var(--good)',w:600});
    g+='<circle cx="'+x(s)+'" cy="'+y(self(s))+'" r="5" fill="var(--acc)" stroke="var(--bg)" stroke-width="2"/>';
    el.innerHTML=RD.svg(w,h,g,'Cost per million tokens against average traffic: a fixed fleet against an API');
    out.textContent=Math.round(s*100)+'%';
    const api=API*mtokH(s);
    cnt.innerHTML=RD.stat('Tokens an hour',mtokH(s).toFixed(1)+' M','at '+Math.round(s*100)+'% of 20 requests/s')+
      RD.stat('Self-hosted','$'+self(s).toFixed(2)+' / M','$'+FLEET.toFixed(2)+' an hour, busy or not')+
      RD.stat('API','$0.40 / M','$'+api.toFixed(2)+' an hour at this traffic')+
      RD.stat('Cheaper',self(s)<API-1e-9?'self-hosted':(Math.abs(self(s)-API)<0.005?'even':'API'),'by $'+Math.abs(FLEET-api).toFixed(2)+' an hour');
  }
  sl.addEventListener('input',draw);
  RD.onRender(draw);RD.onResize(draw);draw();
  window.PR_COST={self,mtokH,BE,FLEET};
})();
