// ---- Section 7: how far the reward travels per sweep of synchronous n-step backups on a 12-state corridor ----
// Exact: after k sweeps from zero, a state d steps from the reward has value gamma^(d-1) if d <= k*n, else 0.
(function(){
  const el=document.getElementById('vb-nsD');if(!el)return;const S=document.getElementById('vb-nsN'),T=document.getElementById('vb-nsT');
  const L=12,G=0.9,K=4;
  function draw(){const n=+S.value;document.getElementById('vb-nsNv').textContent=n;
    const W=RD.width(el),lw=W<480?52:64,cw=Math.min(44,(W-lw-4)/L),ch=24,top=6,H=top+K*(ch+4)+34;let s='';
    for(let k=1;k<=K;k++){const y=top+(k-1)*(ch+4);s+=RD.t(lw-6,y+ch/2+4,'sweep '+k,{a:'end',fs:11,fill:'var(--mute)'});
      for(let i=0;i<L;i++){const d=L-i,on=d<=k*n,v=on?Math.pow(G,d-1):0;const x=lw+i*cw;
        s+='<rect x="'+(x+1).toFixed(1)+'" y="'+y+'" width="'+(cw-2).toFixed(1)+'" height="'+ch+'" rx="3" fill="'+(on?'color-mix(in srgb, var(--acc) '+Math.round(25+65*v)+'%, var(--bg))':'var(--soft)')+'" stroke="var(--line)"/>'}}
    const yb=top+K*(ch+4)+12;
    for(let i=0;i<L;i++){const x=lw+i*cw+cw/2;if(cw>=22||i===0||i===L-1)s+=RD.t(x,yb,String(i+1),{a:'middle',fs:11,fill:'var(--mute)'})}
    s+=RD.t(lw,yb+16,'start',{fs:11,fill:'var(--mute)'})+RD.t(lw+L*cw,yb+16,'reward 1 →',{a:'end',fs:11,fill:'var(--acc)'});
    el.innerHTML=RD.svg(W,H,s,'Corridor states lit once the reward has reached them, per sweep');
    const need=Math.ceil(L/n),reach=Math.min(L,K*n);
    T.innerHTML='n = '+n+': after '+K+' sweeps the reward has reached '+reach+' of '+L+' states; the start needs '+need+' sweep'+(need>1?'s':'')+' (⌈12/n⌉). Its value, once reached, is γ<sup>11</sup> = '+RD.n(Math.pow(G,L-1),3)+' whatever n is: n changes how fast, not where it ends.'}
  S.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
