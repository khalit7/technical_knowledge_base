// ---- Reading section 4: what a repetition penalty and a frequency penalty do to a correct repeat (pattern prompt, position 7) ----
// Same arithmetic as the Sampler lab: repetition penalty on context counts, frequency on generated counts (src/reading_numbers.mjs).
(function(){
  const el=document.getElementById('sd-pen');if(!el||!window.SD||!SD.run)return;
  const pos=SD.LAB.prompts.find(p=>p.k==='pattern').pos[6];
  const base={k:0,p:1,minp:0,typ:1,order:'first',T:1};
  function run(rep,freq){const E=SD.entries(pos);
    const E2=E.map((e,i)=>{if(e.tail)return e;let l=e.l;const cr=pos.c[i],cg=pos.g[i];
      if(cr>0&&rep!==1)l=l>0?l/rep:l*rep;if(cg>0)l-=freq*cg;return Object.assign({},e,{l,c:0})});
    return {E2,R:SD.run(E2,base)}}
  const panels=[['No penalty',1,0],['Repetition penalty 1.3',1.3,0],['Frequency penalty 1',1,1]].map(([t,r,f])=>Object.assign({t},run(r,f)));
  const f1=v=>v>=0.01&&v<1?(v*100).toFixed(1)+'%':SD.fmtP(v);
  const lmax=Math.ceil(pos.l[0]);
  function draw(){
    const W=RD.width(el),stack=W<600,gap=12,pw=stack?W:(W-2*gap)/3,ph=92;
    let s='';
    panels.forEach((P,k)=>{
      const x=stack?0:k*(pw+gap),y=stack?k*(ph+gap):0;
      s+='<rect class="box" x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(pw-1)+'" height="'+(ph-1)+'" rx="7"/>';
      s+='<text class="b" x="'+(x+8)+'" y="'+(y+16)+'">'+P.t+'</text>';
      [0,1].forEach(j=>{const yy=y+26+j*20,lab=SD.vis(P.E2[j].t),bx=x+52,bwid=pw-52-56,v=P.E2[j].l;
        s+='<text x="'+(x+8)+'" y="'+(yy+11)+'" '+(j===0?'class="h"':'')+'>'+RD.esc(lab)+'</text>';
        s+='<rect x="'+bx+'" y="'+(yy+2)+'" width="'+Math.max(1,bwid*v/lmax).toFixed(1)+'" height="11" rx="2" fill="'+(j===0?'var(--acc)':'var(--mute)')+'"/>';
        s+='<text class="m" x="'+(x+pw-8)+'" y="'+(yy+11)+'" text-anchor="end">z '+v.toFixed(2)+'</text>'});
      s+='<text x="'+(x+8)+'" y="'+(y+ph-12)+'">p(<tspan class="h">'+RD.esc(SD.vis(P.E2[0].t))+'</tspan>) = <tspan font-weight="600">'+f1(P.R.fin[0])+'</tspan>, runner-up '+f1(P.R.fin[1])+'</text>';
    });
    const H=stack?3*ph+2*gap:ph;
    el.innerHTML=RD.svg(W,H,s,'Logits and probability of the correct repeat under each penalty');
  }
  RD.onRender(draw);RD.onResize(draw);
})();
