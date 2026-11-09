// Reading: the tokens-per-problem figure of section 5 (the 2D hero chain became the 3D stage Fig. 1, 29b_js_sc_hero.js, on 2026-11-09).
(function(){
const $=id=>document.getElementById(id);
const f1=x=>(x>=0?'+':'')+(+x).toFixed(1);
function scale(){
  const el=$('sc-fig');const R=window.HX&&window.HX.runs;if(!el||!R||!window.HX_SCALE)return;const W=RD.width(el),narrow=W<560;
  const L=narrow?28:70,Rm=8,bw=W-L-Rm,max=2800,x=v=>L+bw*v/max,rh=26;let top=38;
  let g='';
  [0,500,1000,1500,2000,2500].forEach(t=>{if(narrow&&t%1000)return;g+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-6)+'" y2="'+(top+R.items.length*rh)+'" stroke="var(--line)"/>'+RD.t(x(t),top+R.items.length*rh+14,t.toLocaleString('en-GB'),{a:'middle',fill:'var(--mute)'})});
  const key=[['var(--c1)',1,'lm-eval prompt'],['var(--c2)',.45,'Inspect: same system message'],['var(--c2)',1,'Inspect: rest of prompt'],['var(--ink)',.35,'output']];
  let kx=L,ky=4;key.forEach(k=>{const w=k[2].length*6.2+28;if(kx+w>W){kx=L;ky+=16}g+='<rect x="'+kx+'" y="'+ky+'" width="10" height="10" fill="'+k[0]+'" opacity="'+k[1]+'"/>';g+=RD.t(kx+14,ky+9,k[2],{fill:'var(--mute)'});kx+=w;});
  top+=ky-4;
  R.items.forEach((it,i)=>{const y=top+i*rh;const L1=it.lm.prompt_tokens,O1=it.lm.output_tokens,L2=it['in'].real.input,O2=it['in'].real.output;
    const pre=Math.round(L2*window.HX_SCALE.share[i]);
    g+=RD.t(L-6,y+15,narrow?String(it.id+1):'problem '+(it.id+1),{a:'end',fill:'var(--mute)'});
    g+='<rect x="'+L+'" y="'+(y+2)+'" width="'+(x(L1)-L)+'" height="9" fill="var(--c1)"><title>lm-eval prompt '+L1+' tokens</title></rect><rect x="'+x(L1)+'" y="'+(y+2)+'" width="'+(x(L1+O1)-x(L1))+'" height="9" fill="var(--ink)" opacity=".35"><title>output '+O1+' tokens</title></rect>';
    g+='<rect x="'+L+'" y="'+(y+12)+'" width="'+(x(pre)-L)+'" height="9" fill="var(--c2)" opacity=".45"><title>identical system message, about '+pre+' tokens by character share</title></rect><rect x="'+x(pre)+'" y="'+(y+12)+'" width="'+(x(L2)-x(pre))+'" height="9" fill="var(--c2)"/><rect x="'+x(L2)+'" y="'+(y+12)+'" width="'+(x(L2+O2)-x(L2))+'" height="9" fill="var(--ink)" opacity=".35"><title>output '+O2+' tokens</title></rect>';
  });
  g+=RD.t(L+bw/2,top+R.items.length*rh+30,narrow?'tokens per problem; top lm-eval, bottom Inspect':'tokens per GSM8K problem (prompt, then output); top bar lm-eval, bottom bar Inspect',{a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,top+R.items.length*rh+36,g,'Prompt and output tokens per GSM8K problem in the two runs');
}
RD.onRender(scale);RD.onResize(scale);
})();
