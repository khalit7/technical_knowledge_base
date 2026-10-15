// ---- Reading tab, section 4: LSH S-curve with published settings, FineWeb's global-dedup bars ----
(function(){
  const D=window.RDD;
  const gb=document.getElementById('rd-glob-bars');
  if(gb)RD.bars(gb,[['2013-48 before global dedup (derived: 31 + 460)',491,0,'var(--dim)'],['Kept by global dedup (scored worse)',31,1,'var(--c2)'],['Removed by global dedup, deduplicated on its own (scored better)',171,1,'var(--c3)']],491,v=>(v===491?'~':'')+v+'B');
  const host=document.getElementById('rd-sc-svg');if(!host)return;
  const P=(s,b,r)=>1-Math.pow(1-Math.pow(s,r),b);
  const M={fw:{b:14,r:8,pts:D.fwP,name:'FineWeb 14 x 8'},rw:{b:450,r:20,pts:D.rwP,name:'450 bands of 20'},rwtext:{b:20,r:450,pts:D.rwP,name:'20 bands of 450'},d3:{b:26,r:11,pts:D.d3P,name:'Dolma 3 26 x 11'}};
  let mode='fw';const sl=document.getElementById('rd-sc-s'),out=document.getElementById('rd-sc-out');
  function draw(){
    const W=RD.width(host),H=230,L=40,R=12,T=10,B=30,x=s=>L+s*(W-L-R),y=p=>T+(1-p)*(H-T-B);
    let g='';
    [0,0.25,0.5,0.75,1].forEach(p=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(p)+'" y2="'+y(p)+'" stroke="var(--line)"/>'+RD.t(L-4,y(p)+4,Math.round(p*100)+'%',{a:'end',fill:'var(--mute)'})});
    [0,0.2,0.4,0.6,0.8,1].forEach(s=>{g+=RD.t(x(s),H-14,s.toFixed(1),{a:'middle',fill:'var(--mute)'})});
    g+=RD.t((L+W-R)/2,H-1,'Jaccard similarity of the pair',{a:'middle',fill:'var(--mute)',fs:10.5});
    Object.keys(M).forEach(k=>{const m=M[k];let d='';for(let i=0;i<=200;i++){const s=i/200;d+=(i?'L':'M')+x(s).toFixed(1)+' '+y(P(s,m.b,m.r)).toFixed(1)}
      g+='<path d="'+d+'" fill="none" stroke="'+(k===mode?'var(--acc)':'var(--dim)')+'" stroke-width="'+(k===mode?2.5:1.5)+'"/>'});
    const m=M[mode];
    m.pts.forEach(p=>{g+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="5" fill="var(--c2)" stroke="var(--bg)" stroke-width="1.5"/>'});
    const s=+sl.value;g+='<line x1="'+x(s)+'" x2="'+x(s)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    host.innerHTML=RD.svg(W,H,g,'Probability that a pair becomes a candidate, against its similarity, for three band settings');
    const pub=m.pts.find(p=>Math.abs(p[0]-s)<0.001);
    out.textContent=m.name+': P(candidate) = '+(100*P(s,m.b,m.r)).toFixed(1)+'%'+(pub?' (published: '+(100*pub[1]).toFixed(1).replace(/\.0$/,'')+'%)':'');
  }
  RD.seg(document.getElementById('rd-sc-mode'),k=>{mode=k;draw()});
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
