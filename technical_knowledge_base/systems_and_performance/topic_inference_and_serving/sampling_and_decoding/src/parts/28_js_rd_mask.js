// ---- Reading section 5: the grammar mask at step 0, and the allowed-set size at every step (real Qwen2.5-0.5B-Instruct steps, SD.JSONC) ----
(function(){
  const J=window.SD&&SD.JSONC;if(!J)return;
  const V=J.vocab;
  const f1=v=>v>=0.01&&v<1?(v*100).toFixed(1)+'%':SD.fmtP(v);
  const m=document.getElementById('sd-mask');
  function mask(){
    const s=J.steps[0],rows=s.top.slice(0,8),W=RD.width(m);
    const tw=W<480?58:84,mw=W<480?34:46,gap=10,bw=(W-tw-mw-2*gap)/2,rh=20,top=30;
    const x1=tw,x2=x1+bw+gap,x3=x2+mw+gap;
    let g='<text class="m" x="0" y="14">token</text><text class="m" x="'+x1+'" y="14">model p</text><text class="m" x="'+x2+'" y="14">mask</text><text class="m" x="'+x3+'" y="14">p after mask</text>';
    rows.forEach((t,i)=>{const y=top+i*rh,after=t.ok?t.p/s.mass_allowed:0;
      g+='<text x="0" y="'+(y+12)+'"'+(t.ok?' class="h"':'')+'>'+RD.esc(SD.vis(t.t))+'</text>';
      g+='<rect x="'+x1+'" y="'+(y+3)+'" width="'+Math.max(1,(bw-44)*t.p).toFixed(1)+'" height="11" rx="2" fill="var(--mute)"/><text class="m" x="'+(x1+bw)+'" y="'+(y+12)+'" text-anchor="end">'+f1(t.p)+'</text>';
      g+='<text x="'+(x2+mw/2)+'" y="'+(y+12)+'" text-anchor="middle" class="'+(t.ok?'h':'bad')+'">'+(t.ok?'0':'&#8722;&#8734;')+'</text>';
      g+=(t.ok?'<rect x="'+x3+'" y="'+(y+3)+'" width="'+Math.max(1,(bw-44)*after).toFixed(1)+'" height="11" rx="2" fill="var(--acc)"/>':'')+'<text class="'+(t.ok?'h':'m')+'" x="'+(x3+bw)+'" y="'+(y+12)+'" text-anchor="end">'+(t.ok?f1(after):'0')+'</text>';
    });
    // the whole vocabulary as one strip
    const ys=top+rows.length*rh+14,sw=W-2,aw=Math.max(3,sw*s.n_allowed/V);
    g+='<text class="m" x="0" y="'+ys+'">the whole vocabulary (the allowed sliver widened to be visible)</text>';
    g+='<rect x="1" y="'+(ys+6)+'" width="'+sw+'" height="14" rx="3" fill="var(--dim)"/><rect x="1" y="'+(ys+6)+'" width="'+aw.toFixed(1)+'" height="14" rx="1" fill="var(--acc)"/>';
    g+='<text class="h" x="0" y="'+(ys+34)+'">'+s.n_allowed+' allowed</text><text class="m" x="'+(W-1)+'" y="'+(ys+34)+'" text-anchor="end">'+SD.fmtN(V-s.n_allowed)+' masked to &#8722;&#8734;</text>';
    m.innerHTML=RD.svg(W,ys+40,g,'Model probabilities, the mask and the renormalised probabilities at the first step');
  }
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
  if(m){RD.onRender(mask);RD.onResize(mask)}
  if(z){RD.onRender(sizes);RD.onResize(sizes)}
})();
