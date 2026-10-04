// ---- Section 7: prioritised replay, sampling probabilities and importance weights for eight transitions ----
(function(){
  const E=window.VBE;const D=[0.05,0.1,0.2,0.3,0.5,0.8,1.5,3.0];let v='prop';
  const As=document.getElementById('vb-prA'),Bs=document.getElementById('vb-prB'),P=document.getElementById('vb-prP'),T=document.getElementById('vb-prT');
  function draw(){const a=+As.value/100,b=+Bs.value/100;document.getElementById('vb-prAv').textContent=a.toFixed(2);document.getElementById('vb-prBv').textContent=b.toFixed(2);
    const [Pr,w]=E.per(D,a,b,v);const n=D.length;const W=RD.width(P),H=200,l=34,r=8,t=14,bt=40,gw=(W-l-r)/n,bw=Math.min(18,gw*0.32);
    const pm=Math.max(...Pr,1/n)*1.1;const Y=q=>t+(H-t-bt)*(1-q/pm),Yw=q=>t+(H-t-bt)*(1-q);
    let s='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(1/n).toFixed(1)+'" y2="'+Y(1/n).toFixed(1)+'" stroke="var(--c1)" stroke-dasharray="4 3"/>'+RD.t(W-r,Y(1/n)-4,'uniform 1/8',{a:'end',fs:10,fill:'var(--c1)'});
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+(H-bt)+'" y2="'+(H-bt)+'" stroke="var(--mute)"/>';
    for(let i=0;i<n;i++){const cx=l+gw*(i+0.5);s+='<rect x="'+(cx-bw-1).toFixed(1)+'" y="'+Y(Pr[i]).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(H-bt-Y(Pr[i])).toFixed(1)+'" fill="var(--c2)"/>';
      s+='<rect x="'+(cx+1).toFixed(1)+'" y="'+Yw(w[i]).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(H-bt-Yw(w[i])).toFixed(1)+'" fill="var(--c3)" opacity=".85"/>';
      s+=RD.t(cx,H-bt+13,'|δ| '+D[i],{a:'middle',fs:9.5,fill:'var(--mute)'})+RD.t(cx,H-bt+25,(100*Pr[i]).toFixed(Pr[i]<0.1?1:0)+'%',{a:'middle',fs:9.5,fill:'var(--c2)'})+RD.t(cx,H-bt+37,'w '+w[i].toFixed(2),{a:'middle',fs:9.5,fill:'var(--c3)'})}
    s+=RD.t(l,10,'orange: P(i), left scale to '+(100*pm).toFixed(0)+'%; green: weight w(i), 0 to 1',{fs:10,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,H,s,'Sampling probabilities and weights');
    const eff=Pr.map((q,i)=>n*q*w[i]);const mx=Math.max(...eff),mn=Math.min(...eff);
    T.innerHTML='The largest error is sampled '+RD.n(Pr[n-1]/Pr[0],1)+' times as often as the smallest. Effective weight in the expected update, N·P(i)·w(i), ranges from '+RD.n(mn,3)+' to '+RD.n(mx,3)+' (ratio '+RD.n(mx/mn,2)+')'+(b>=0.999?': equal for every transition at β = 1, so the update is unbiased (the normalisation only rescales it).':(a===0?': uniform sampling, nothing to correct.':'; at β = 1 the ratio would be 1.'));}
  document.getElementById('vb-prV').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;v=b.dataset.v;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));
    if(v==='rank'){As.value=70;Bs.value=50}else{As.value=60;Bs.value=40}draw()});
  As.addEventListener('input',draw);Bs.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
