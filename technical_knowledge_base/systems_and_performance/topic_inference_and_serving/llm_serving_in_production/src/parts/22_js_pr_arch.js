// ---- Reading tab, hero: the production path of one request (static diagram, laid out by measured width) ----
(function(){
  const el=document.getElementById('pr-arch');if(!el)return;
  const B=[['Client','app, agent, SDK; TTFT seen here','var(--c6)','1, 8'],['Gateway','auth, rate limits, fallbacks','var(--c5)','2'],['Router','picks a replica: load and cache','var(--c1)','2'],
    ['Replicas','engine + KV cache, each a copy of the model','var(--c3)','4, 5, 6'],['Metrics','TTFT, TPOT, queue, KV, hits','var(--c4)','7'],['Autoscaler','adds or removes replicas','var(--c2)','3, 4']];
  function draw(){
    const w=RD.width(el);let s='';const narrow=w<620;
    if(!narrow){
      const n=4,gap=14,bw=(w-gap*(n-1)-4)/n,bh=64,y=8;
      for(let i=0;i<n;i++){const x=2+i*(bw+gap),b=B[i];
        s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--bg)" stroke="'+b[2]+'" stroke-width="2"/>';
        s+=RD.t(x+8,y+18,b[0],{fs:12.5,w:600});s+=wrap(b[1],x+8,y+34,bw-14,10.5);s+=RD.t(x+bw-6,y+bh-6,'section '+b[3],{a:'end',fs:9.5,fill:'var(--mute)'});
        if(i<n-1)s+='<path d="M'+(x+bw+1)+' '+(y+bh/2)+'h'+(gap-4)+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#pr-ah)"/>'}
      const y2=y+bh+40,bw2=Math.min(260,(w-40)/2),x3=2+3*(bw+gap)+bw/2;
      [[4,x3-bw2-10],[5,Math.max(2,x3-2*bw2-40)]].forEach(([k,x],j)=>{const b=B[k];
        s+='<rect x="'+x+'" y="'+y2+'" width="'+bw2+'" height="52" rx="8" fill="var(--bg)" stroke="'+b[2]+'" stroke-width="2"/>';
        s+=RD.t(x+8,y2+18,b[0],{fs:12.5,w:600});s+=wrap(b[1],x+8,y2+34,bw2-14,10.5);s+=RD.t(x+bw2-6,y2+48,'section '+b[3],{a:'end',fs:9.5,fill:'var(--mute)'})});
      const xm=x3-bw2-10;
      s+='<path d="M'+x3+' '+(y+bh)+'V'+(y2+26)+'H'+(xm+bw2+2)+'" fill="none" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#pr-ah)"/>';
      const xa=Math.max(2,x3-2*bw2-40);
      s+='<path d="M'+(xm-2)+' '+(y2+26)+'H'+(xa+bw2+2)+'" fill="none" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#pr-ah)"/>';
      s+='<path d="M'+(xa+bw2/2)+' '+y2+'V'+(y+bh+14)+'H'+(x3-20)+'V'+(y+bh+2)+'" fill="none" stroke="var(--c2)" stroke-dasharray="4 3" stroke-width="1.5" marker-end="url(#pr-ah)"/>';
      s+=RD.t(xa+bw2/2+6,y+bh+28,'more or fewer replicas',{fs:10,fill:'var(--mute)'});
      el.innerHTML=RD.svg(w,y2+60,defs()+s,'The path of a request: client, gateway, router, replicas, with metrics feeding an autoscaler');
    }else{
      const bw=w-4,bh=50;let y=2;
      B.forEach((b,i)=>{s+='<rect x="2" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--bg)" stroke="'+b[2]+'" stroke-width="2"/>';
        s+=RD.t(10,y+18,b[0],{fs:12.5,w:600});s+=wrap(b[1],10,y+34,bw-80,10.5);s+=RD.t(bw-4,y+18,'section '+b[3],{a:'end',fs:9.5,fill:'var(--mute)'});
        if(i<B.length-1)s+='<path d="M'+(w/2)+' '+(y+bh+1)+'v10" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#pr-ah)"/>';y+=bh+14});
      el.innerHTML=RD.svg(w,y,defs()+s,'The path of a request: client, gateway, router, replicas, metrics, autoscaler');
    }
  }
  const defs=()=>'<defs><marker id="pr-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>';
  function wrap(t,x,y,maxw,fs){const words=t.split(' '),per=Math.max(8,Math.floor(maxw/(fs*0.55)));let line='',out='',k=0;
    words.forEach(wd=>{if((line+' '+wd).trim().length>per){out+=RD.t(x,y+k*13,line.trim(),{fs,fill:'var(--mute)'});k++;line=wd}else line+=' '+wd});
    return out+RD.t(x,y+k*13,line.trim(),{fs,fill:'var(--mute)'})}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
