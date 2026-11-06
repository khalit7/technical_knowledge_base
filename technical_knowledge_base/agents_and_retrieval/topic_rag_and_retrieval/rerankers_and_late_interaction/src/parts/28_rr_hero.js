// ---- Reading tab: section 10's sparse document vector (the hero is the 3D scene 30_sc_hero.js) ----
(function(){
  const R=window.RR;if(!R||!document.getElementById('rr-sp-svg'))return;const $=id=>document.getElementById(id),esc=RRL.esc;
  // ---------- section 10: the heaviest terms of one real sparse document vector
  function sparse(){const el=$('rr-sp-svg');if(!el||!R.sparse)return;const T=R.sparse.ex.top_terms,W=Math.max(270,Math.min(RD.width(el),760));
    const rh=17,top=6,lab=W<480?84:110,H=top+T.length*rh+18,mx=Math.max(...T.map(t=>t[1]));let s='';
    T.forEach((t,i)=>{const y=top+i*rh,exp=!t[2],w=(W-lab-50)*t[1]/mx;
      s+=RD.t(lab-6,y+12,esc(t[0]),{a:'end',fs:11,fill:exp?'var(--c2)':'var(--ink)',w:exp?600:400})+
        '<rect x="'+lab+'" y="'+(y+3)+'" width="'+w.toFixed(1)+'" height="11" rx="2" fill="'+(exp?'var(--c2)':'var(--dim)')+'"/>'+
        RD.t(lab+w+4,y+12,t[1].toFixed(2),{fs:10.5,fill:'var(--mute)'})});
    s+=RD.t(lab,H-4,'term weight w_j (orange: not in the text)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'sparse document vector')}
  RD.onRender(sparse);RD.onResize(sparse);
})();
