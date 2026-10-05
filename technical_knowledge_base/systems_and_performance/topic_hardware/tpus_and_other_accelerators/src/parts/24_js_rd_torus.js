// ---- Reading, section 4: hops on an 8 x 8 slice, torus against mesh ----
(function(){
  const el=document.getElementById('rd-tor-svg');if(!el)return;
  const S=8;let wrap=1,sel=[0,0];
  const d1=(a,b)=>{const d=Math.abs(a-b);return wrap?Math.min(d,S-d):d};
  function draw(){
    const w=Math.min(RD.width(el),520),c=Math.floor((w-30)/S),r=Math.max(9,Math.floor(c*0.32)),x0=16+c/2,y0=12+c/2;
    let h='',far=0,sum=0;
    const ln=(x1,y1,x2,y2,o)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--line)" stroke-width="2"'+(o||'')+'/>';
    for(let i=0;i<S;i++){h+=ln(x0,y0+i*c,x0+(S-1)*c,y0+i*c)+ln(x0+i*c,y0,x0+i*c,y0+(S-1)*c);
      if(wrap){const yy=y0+i*c,xx=x0+i*c;
        h+='<path d="M'+(x0+(S-1)*c)+' '+yy+' q '+(c*0.45)+' '+(-c*0.35)+' '+(c*0.45)+' 0" fill="none" stroke="var(--c5)" stroke-width="1.5"/><path d="M'+x0+' '+yy+' q '+(-c*0.45)+' '+(-c*0.35)+' '+(-c*0.45)+' 0" fill="none" stroke="var(--c5)" stroke-width="1.5"/>';
        h+='<path d="M'+xx+' '+(y0+(S-1)*c)+' q '+(c*0.35)+' '+(c*0.45)+' 0 '+(c*0.45)+'" fill="none" stroke="var(--c5)" stroke-width="1.5"/><path d="M'+xx+' '+y0+' q '+(c*0.35)+' '+(-c*0.45)+' 0 '+(-c*0.45)+'" fill="none" stroke="var(--c5)" stroke-width="1.5"/>'}}
    for(let i=0;i<S;i++)for(let j=0;j<S;j++){const hp=d1(i,sel[0])+d1(j,sel[1]);far=Math.max(far,hp);sum+=hp;
      const me=i===sel[0]&&j===sel[1];const a=1-hp/14;
      h+='<g data-c="'+i+','+j+'" style="cursor:pointer"><circle cx="'+(x0+j*c)+'" cy="'+(y0+i*c)+'" r="'+r+'" fill="'+(me?'var(--acc)':'var(--acc2)')+'" fill-opacity="'+(me?1:Math.max(.25,a).toFixed(2))+'" stroke="var(--acc)"/>'+
        RD.t(x0+j*c,y0+i*c+4,me?'':hp,{a:'middle',fs:Math.max(9,r)})+'</g>'}
    el.innerHTML=RD.svg(w,y0+(S-1)*c+c/2+6,h,'Hop counts on an 8 by 8 slice');
    document.getElementById('rd-tor-cnt').innerHTML=RD.stat('Farthest chip',far+' hops',wrap?'torus: 4 + 4':'mesh: up to 7 + 7 from a corner')+
      RD.stat('Average distance',(sum/(S*S-1)).toFixed(2)+' hops','over the other 63 chips')+RD.stat('Links per chip',wrap?'4, all used':'2 to 4','edge chips lose links without wraparound');
  }
  el.addEventListener('click',e=>{const g=e.target.closest('g[data-c]');if(!g)return;sel=g.dataset.c.split(',').map(Number);draw()});
  RD.seg(document.getElementById('rd-tor-mode'),m=>{wrap=+m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
