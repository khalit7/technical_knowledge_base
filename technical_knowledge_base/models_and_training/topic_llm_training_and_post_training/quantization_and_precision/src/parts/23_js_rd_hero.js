// ---- Reading, top: the hero. One ordinary block of 32 real weights in INT4, with the per-tensor scale and with its own scale (static) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-hero'))return;
  const H=window.QV.hero();
  const f=(x,d)=>x.toFixed(d==null?3:d);
  function strip(q,scale,title){
    const W=RD.width($('rd-hero')),Ht=W<520?112:124,pl=W<520?40:46,pr=6,pt=8,pb=16,iw=W-pl-pr,ih=Ht-pt-pb;
    const A=H.bamax*1.18,y=v=>pt+ih/2-(v/A)*(ih/2),bw=iw/32;
    let s='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--mute)"/>';
    for(let k=-12;k<=12;k++){const t=k*scale;if(k!==0&&Math.abs(t)<=A)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--c4)" stroke-opacity=".5"/>'}
    [H.bamax,-H.bamax].forEach(t=>{s+=RD.t(pl-4,y(t)+4,f(t),{a:'end',fs:10.5,fill:'var(--mute)'})});
    for(let i=0;i<32;i++){const x=pl+i*bw+bw*0.15,w=bw*0.7,v=H.v[i],qq=q[i],z=qq===0&&v!==0;
      s+='<rect x="'+x.toFixed(1)+'" y="'+Math.min(y(0),y(v)).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,Math.abs(y(v)-y(0))).toFixed(1)+'" fill="var(--c1)" opacity=".3"/>';
      if(z)s+='<circle cx="'+(x+w/2).toFixed(1)+'" cy="'+y(0).toFixed(1)+'" r="'+Math.max(2,Math.min(3.5,bw*0.22)).toFixed(1)+'" fill="var(--bad)"/>';
      else s+='<rect x="'+(x+w*0.2).toFixed(1)+'" y="'+Math.min(y(0),y(qq)).toFixed(1)+'" width="'+(w*0.6).toFixed(1)+'" height="'+Math.max(1,Math.abs(y(qq)-y(0))).toFixed(1)+'" fill="var(--c3)"/>'}
    s+=RD.t(pl,Ht-3,'input column 0',{fs:10.5,fill:'var(--mute)'})+RD.t(W-pr,Ht-3,'31',{a:'end',fs:10.5,fill:'var(--mute)'});
    return RD.svg(W,Ht,s,title)}
  function draw(){
    $('rd-hero-a').innerHTML=strip(H.tq,H.tscale,'INT4 with the per-tensor scale');
    $('rd-hero-b').innerHTML=strip(H.bq,H.bscale,'INT4 with a scale for these 32 weights');
    $('rd-hero-na').innerHTML='step '+f(H.tscale)+': <b>'+H.tzero+' of 32</b> stored as 0, error '+(100*H.terr).toFixed(0)+'%';
    $('rd-hero-nb').innerHTML='step '+f(H.bscale,4)+': <b>'+H.bzero+' of 32</b> stored as 0, error '+(100*H.berr).toFixed(1)+'%';
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
