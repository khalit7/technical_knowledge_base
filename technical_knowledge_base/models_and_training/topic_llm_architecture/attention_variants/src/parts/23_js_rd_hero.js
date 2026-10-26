// Reading tab, hero figure (static): each variant's cache entry per token per layer, drawn to scale (one square = 64 numbers,
// Llama 3.1 8B's shape of 32 query heads of 128; MLA rows at DeepSeek-V3's 512 + 64), beside a strip of the last tokens showing
// what the next token reads (blue), what is stored but not read (grey), and what is not stored (dashed). Strip sizes illustrative.
(function(){
  const el=document.getElementById('av-hero');if(!el||!window.RD)return;
  const K='var(--c2)',V='var(--c4)',LAT='var(--good)',ROPE='var(--c6)',IDX='var(--c5)',ENT='ENT';
  const R=[
    {nm:'MHA',sub:'8,192 numbers',sq:[[64,K],[64,V]],st:'all'},
    {nm:'GQA-8',sub:'2,048',sq:[[16,K],[16,V]],st:'all'},
    {nm:'MQA',sub:'256',sq:[[2,K],[2,V]],st:'all'},
    {nm:'MLA',sub:'576 = 512 + 64',sq:[[8,LAT],[1,ROPE]],st:'all'},
    {nm:'Sliding window',sub:'2,048, last W',sq:[[16,K],[16,V]],st:'win'},
    {nm:'DSA (sparse)',sub:'576 + 128 indexer',sq:[[8,LAT],[1,ROPE],[2,IDX]],st:'topk'},
    {nm:'V4 CSA',sub:'512 per 4 tokens',sq:[[8,ENT]],st:'csa'},
    {nm:'V4 HCA',sub:'512 per 128 tokens',sq:[[8,ENT]],st:'hca'},
    {nm:'Sink or gate',sub:'no extra cache',sq:[],st:'sink'}];
  function draw(){
    const W=RD.width(el),nar=W<560,p=nar?5:7,c=p-1,nmW=nar?84:150,gW=16*p+(nar?8:16),x0=nmW,xs=nmW+gW;
    const N=nar?16:24,sw=W-xs-(nar?4:190),cw=Math.min(22,Math.floor((sw-14)/(N+1))-1),gap=1;
    let s='',y=nar?32:34;
    s+=RD.t(x0,12,nar?'entry, 1 square':'entry per token per layer',{fill:'var(--mute)'})+(nar?RD.t(x0,24,'= 64 numbers',{fill:'var(--mute)'}):RD.t(x0+0,24,'(1 square = 64 numbers)',{fill:'var(--mute)'}));
    s+=RD.t(xs,12,nar?'last '+N+' tokens, then new':'last '+N+' tokens, then the new one',{fill:'var(--mute)'});
    const WIN=nar?4:6,TOP=nar?[1,6,10]:[0,4,9,15,21],BLK=4,HB=nar?8:12;
    for(const r of R){
      let n=0;for(const [k] of r.sq)n+=k;const rows=Math.max(1,Math.ceil(n/16)),gh=rows*p,rh=Math.max(gh,cw,22)+(nar?14:10);
      s+=RD.t(2,y+12,r.nm,{w:600})+RD.t(2,y+25,r.sub,{fill:'var(--mute)'});
      let i=0;for(const [k,col] of r.sq)for(let j=0;j<k;j++,i++)s+='<rect x="'+(x0+(i%16)*p)+'" y="'+(y+2+Math.floor(i/16)*p)+'" width="'+c+'" height="'+c+'" rx="1" fill="'+(col==='ENT'?'var(--good)':col)+'"'+(col==='ENT'?' fill-opacity=".4" stroke="var(--good)" stroke-width=".8"':'')+'/>';
      if(!r.sq.length)s+=RD.t(x0,y+14,'+ a column',{fill:'var(--bad)'});
      const cy=y+2,X=t=>xs+t*(cw+gap);
      const cell=(t,kind,wd)=>{const w=(wd||1)*(cw+gap)-gap;
        if(kind==='read')return '<rect x="'+X(t)+'" y="'+cy+'" width="'+w+'" height="'+cw+'" rx="2" fill="var(--acc)"/>';
        if(kind==='held')return '<rect x="'+X(t)+'" y="'+cy+'" width="'+w+'" height="'+cw+'" rx="2" fill="var(--dim)"/>';
        return '<rect x="'+(X(t)+.5)+'" y="'+(cy+.5)+'" width="'+(w-1)+'" height="'+(cw-1)+'" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"/>'};
      if(r.st==='all'||r.st==='sink')for(let t=0;t<N;t++)s+=cell(t,'read');
      if(r.st==='win')for(let t=0;t<N;t++)s+=cell(t,t>=N-WIN?'read':'none');
      if(r.st==='topk')for(let t=0;t<N;t++)s+=cell(t,TOP.includes(t)?'read':'held');
      if(r.st==='csa'){const nb=Math.floor((N-WIN)/BLK);for(let b=0;b<nb;b++)s+=cell(b*BLK,(b===1||b===nb-2)?'read':'held',BLK);for(let t=nb*BLK;t<N;t++)s+=cell(t,'read')}
      if(r.st==='hca'){const nb=Math.floor((N-WIN)/HB);for(let b=0;b<nb;b++)s+=cell(b*HB,'read',HB);for(let t=nb*HB;t<N;t++)s+=cell(t,'read')}
      // the new token
      s+='<rect x="'+(X(N)+2)+'" y="'+cy+'" width="'+cw+'" height="'+cw+'" rx="2" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
      if(r.st==='sink')s+='<rect x="'+(xs-cw-4)+'" y="'+cy+'" width="'+cw+'" height="'+cw+'" rx="2" fill="var(--bad)"/>';
      const note={win:'only the last W kept',topk:'all kept, top k read',csa:'4 tokens merged; top k + window',hca:'merged blocks, all read + window',sink:'red: weight sent nowhere'}[r.st];
      if(note&&!nar)s+=RD.t(X(N)+cw+8,cy+cw-2,note,{fill:'var(--mute)'});
      y+=rh;
    }
    if(nar){s+=RD.t(2,y+4,'blue: read; grey: stored, not read; dashed: not stored',{fill:'var(--mute)'});y+=10}
    el.innerHTML=RD.svg(W,y+4,s,'Cache entry per token per layer for each attention variant, and which past tokens the next token reads');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
