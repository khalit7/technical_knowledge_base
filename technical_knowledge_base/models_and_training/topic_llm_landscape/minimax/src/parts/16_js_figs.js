// ---- Reading: the hero (which layers cache, per generation) and the MoE expert layouts to scale, drawn at the measured width from the configs ----
(function(){ // hero: one square per layer
  if(!$('heroSvg'))return;
  const C={lin:'var(--c3)',sm:'var(--c2)',fa:'var(--c5)',msa:'var(--acc)'};
  const rows=[
    {n:'MiniMax-01, M1',d:'Jan 2025',L:80,t:i=>i%8===7?'sm':'lin',k:'40 KiB per token + 140 MiB fixed state',s:'70 lightning layers keep a state; every 8th caches'},
    {n:'M2 to M2.7',d:'Oct 2025',L:62,t:()=>'sm',k:'248 KiB per token',s:'every layer caches every token and reads all of it'},
    {n:'M3',d:'Jun 2026',L:60,t:i=>i<3?'fa':'msa',k:'120 KiB + 14.25 KiB index keys per token',s:'every layer caches; 57 MSA layers read 16 blocks per group'}];
  function draw(){const W=RD.width($('heroSvg'))||700,narrow=W<560,rh=narrow?80:66;let s='',y=0;
    rows.forEach(r=>{s+=RD.t(0,y+14,'<tspan font-weight="600">'+r.n+'</tspan><tspan fill="var(--mute)"> · '+r.d+'</tspan>',{fs:12.5});
      if(narrow)s+=RD.t(0,y+30,r.k,{fs:12,fill:'var(--acc)',w:600});else s+=RD.t(W,y+14,r.k,{a:'end',fs:12.5,fill:'var(--acc)',w:600});
      const sy=y+(narrow?36:21),cw=W/r.L,g=cw>5?1:0.5;
      for(let i=0;i<r.L;i++)s+='<rect x="'+(i*cw+g/2).toFixed(2)+'" y="'+sy+'" width="'+Math.max(cw-g,0.8).toFixed(2)+'" height="18" rx="1.5" fill="'+C[r.t(i)]+'"/>';
      s+=RD.t(0,sy+33,r.s,{fs:11,fill:'var(--mute)'});y+=rh});
    $('heroSvg').innerHTML=RD.svg(W,y,s,'Layer strips of MiniMax-01, M2 and M3 coloured by attention type');}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

(function(){ // MoE layouts to scale: each expert a bar whose width is its hidden size
  if(!$('moeSvg'))return;
  const rows=[
    {n:'MiniMax-Text-01',E:32,h:9216,on:[5,22],sh:0,r:'32 × 9,216, top-2: 2 × 9,216 = 18,432 per token'},
    {n:'M2',E:256,h:1536,on:[11,40,77,120,151,190,213,244],sh:0,r:'256 × 1,536, top-8: 8 × 1,536 = 12,288 per token'},
    {n:'M3',E:128,h:3072,on:[9,47,83,118],sh:1,r:'128 × 3,072 + 1 shared, top-4 + shared: 5 × 3,072 = 15,360 per token'}];
  const tot=Math.max(...rows.map(r=>(r.E+r.sh)*r.h));
  function draw(){const W=RD.width($('moeSvg'))||700,sc=W/tot;let s='',y=0;
    rows.forEach(r=>{s+=RD.t(0,y+13,'<tspan font-weight="600">'+r.n+'</tspan>',{fs:12.5});
      const narrow=W<560;const pr=r.r.split(': ');if(narrow){s+=RD.t(0,y+28,pr[0]+':',{fs:11,fill:'var(--mute)'})+RD.t(0,y+42,pr[1],{fs:11,fill:'var(--mute)'})}else s+=RD.t(W,y+13,r.r,{a:'end',fs:11.5,fill:'var(--mute)'});
      const by=y+(narrow?48:19),ew=r.h*sc,g=ew>3?0.8:0.3;
      for(let e=0;e<r.E+r.sh;e++){const shared=e>=r.E,on=shared||r.on.includes(e);
        s+='<rect x="'+(e*ew+g/2).toFixed(2)+'" y="'+by+'" width="'+Math.max(ew-g,0.4).toFixed(2)+'" height="16" fill="'+(shared?'var(--good)':on?'var(--acc)':'var(--dim)')+'"/>'}
      y=by+16+16});
    $('moeSvg').innerHTML=RD.svg(W,y-8,s,'Experts per MoE layer for MiniMax-Text-01, M2 and M3, widths to scale');}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
