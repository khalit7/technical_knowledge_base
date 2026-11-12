// ---- Reading section 5, Fig. 4: the allowed-set size at every step (the mask at step 0 is the 3D scene 42_js_sc_mask.js) (real Qwen2.5-0.5B-Instruct steps, SD.JSONC) ----
(function(){
  const J=window.SD&&SD.JSONC;if(!J)return;
  const V=J.vocab;
  const f1=v=>v>=0.01&&v<1?(v*100).toFixed(1)+'%':SD.fmtP(v);
  const z=document.getElementById('sd-msz');
  function sizes(){
    const S=J.steps,W=RD.width(z),pl=40,pr=4,pt=24,ph=150,pb=W<520?66:58,H=pt+ph+pb,n=S.length,bw=(W-pl-pr)/n,L=Math.log10(V);
    const Y=v=>pt+ph*(1-Math.log10(Math.max(1,v))/L);
    let g='';
    [1,10,100,1000,10000,100000].forEach(v=>{g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text class="m" x="'+(pl-5)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+(v>=1000?(v/1000)+'k':v)+'</text>'});
    g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(V)+'" y2="'+Y(V)+'" stroke="var(--mute)" stroke-dasharray="4 3"/><text class="m" x="'+(W-pr)+'" y="'+(Y(V)-4)+'" text-anchor="end">whole vocabulary '+SD.fmtN(V)+'</text>';
    S.forEach((s,i)=>{const x=pl+i*bw,y=Y(s.n_allowed),over=s.mass_allowed<0.05;
      g+='<rect x="'+(x+1).toFixed(1)+'" y="'+Math.min(y,pt+ph-2).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+Math.max(2,pt+ph-y).toFixed(1)+'" rx="1" fill="'+(over?'var(--bad)':'var(--acc)')+'"><title>step '+i+': '+SD.fmtN(s.n_allowed)+' allowed, holding '+SD.fmtP(s.mass_allowed)+'</title></rect>';
      const cx=x+bw/2;
      if(W>=520||i%2===0)g+='<text class="m" x="'+cx.toFixed(1)+'" y="'+(pt+ph+13)+'" text-anchor="middle">'+i+'</text>';
      const tk=s.pick==='<end>'?'[end]':SD.vis(s.pick);
      g+='<text x="'+cx.toFixed(1)+'" y="'+(pt+ph+24)+'" transform="rotate(-60 '+cx.toFixed(1)+' '+(pt+ph+24)+')" text-anchor="end"'+(over?' class="bad"':'')+'>'+RD.esc(tk.length>6?tk.slice(0,6):tk)+'</text>'});
    z.innerHTML=RD.svg(W,H,g,'Allowed tokens at each step of the constrained run, log scale');
  }
  if(z){RD.onRender(sizes);RD.onResize(sizes)}
})();
