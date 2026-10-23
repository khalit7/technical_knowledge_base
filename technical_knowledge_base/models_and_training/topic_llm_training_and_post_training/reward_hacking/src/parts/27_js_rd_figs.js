// ---- Reading: static figures added 2026-10-23 (hero schematic, Wen et al. false-positive rates, what the policy can reach) ----
(function(){
  const $=id=>document.getElementById(id);
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fill:'var(--ink)'},o||{}));

  // hero: schematic proxy against gold (shape as in Gao et al. Figure 1; no data)
  function hero(){
    const box=$('rh-heroSvg');if(!box)return;
    const W=RD.width(box),H=Math.round(Math.min(300,Math.max(230,W*.42))),ml=16,mr=10,mt=14,mb=30,nar=W<520;
    const P=t=>Math.pow(t,0.75),G=t=>1.6*t*(1-1.25*t),G2=t=>1.4*t*(1-0.75*t);
    const x=t=>ml+(W-ml-mr)*t,y0=-0.45,y1=1.08,y=v=>mt+(H-mt-mb)*(y1-v)/(y1-y0);
    const path=(f,a,b)=>{let s='';for(let i=0;i<=80;i++){const t=a+(b-a)*i/80;s+=(i?'L':'M')+x(t).toFixed(1)+' '+y(f(t)).toFixed(1)}return s};
    let s='';
    // shaded gap past the gold peak
    let sh='M'+x(0.4).toFixed(1)+' '+y(G(0.4)).toFixed(1);for(let i=0;i<=60;i++){const t=0.4+0.6*i/60;sh+='L'+x(t).toFixed(1)+' '+y(P(t)).toFixed(1)}
    for(let i=60;i>=0;i--){const t=0.4+0.6*i/60;sh+='L'+x(t).toFixed(1)+' '+y(G(t)).toFixed(1)}
    s+='<path d="'+sh+'Z" fill="var(--bad)" opacity=".13"/>';
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--line)"/>';
    s+='<line x1="'+x(0)+'" x2="'+x(0)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>';
    // KL-penalty stop
    s+='<line x1="'+x(0.3)+'" x2="'+x(0.3)+'" y1="'+(mt+4)+'" y2="'+(H-mb)+'" stroke="var(--acc)" stroke-dasharray="4 3"/>';
    s+=T(x(0.3)-4,mt+12,nar?'KL penalty':'KL penalty: stop here',{a:'end',fs:11,fill:'var(--acc)'});
    s+='<path d="'+path(G2,0,1)+'" fill="none" stroke="var(--c3)" stroke-width="1.6" stroke-dasharray="3 4" opacity=".75"/>';
    s+='<path d="'+path(P,0,1)+'" fill="none" stroke="var(--c2)" stroke-width="2.6" stroke-dasharray="7 4"/>';
    s+='<path d="'+path(G,0,1)+'" fill="none" stroke="var(--c3)" stroke-width="3"/>';
    s+='<circle cx="'+x(0.4)+'" cy="'+y(G(0.4))+'" r="4.5" fill="var(--c3)" stroke="var(--bg)" stroke-width="1.5"/>';
    s+=T(x(0.4),y(G(0.4))+18,'gold peaks',{a:'middle',fs:11});
    s+=T(x(0.56),y(P(0.56))-10,nar?'proxy':'proxy: what is optimised',{a:'end',fs:11,fill:'var(--c2)',w:600});
    s+=T(x(0.83),y(G(0.83))+18,nar?'gold':'gold: what you wanted',{a:'end',fs:11,fill:'var(--c3)',w:600});
    s+=T(x(0.67),y(G2(0.67))-8,nar?'bigger RM':'bigger reward model: later, higher',{a:'middle',fs:11,fill:'var(--c3)'});
    s+=T(x(0.80),y(0.18),'reward hacking',{a:'middle',fs:12,fill:'var(--bad)',w:600});
    s+=T(W-mr,H-8,'optimisation pressure (KL from the starting policy) →',{a:'end',fs:11,fill:'var(--mute)'});
    box.innerHTML=RD.svg(W,H,s,'Schematic: the proxy score keeps rising with optimisation while the gold score peaks and falls');
  }

  // Wen et al. 2024: evaluators' false-positive rate before and after RLHF
  function wen(){
    const box=$('wnSvg');if(!box)return;
    const D=[['QA, general reward model',46.7,70.2],['QA, task-specific reward model',41.0,65.1],['Programming (APPS)',29.6,47.9]];
    const W=RD.width(box),ml=12,mr=16,row=46,mt=6,H=mt+row*D.length+26;
    const x=v=>ml+(W-ml-mr)*v/100;let s='';
    [0,25,50,75,100].forEach(v=>{s+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="'+mt+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+T(x(v),H-8,v+'%',{a:v===0?'start':v===100?'end':'middle',fs:11,fill:'var(--mute)'})});
    D.forEach((d,i)=>{const yy=mt+row*i+30;
      s+=T(ml,yy-14,d[0],{fs:11.5,w:600});
      s+='<line x1="'+x(d[1])+'" x2="'+(x(d[2])-6)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--bad)" stroke-width="2"/>';
      s+='<path d="M'+(x(d[2])-7)+' '+(yy-4)+'L'+(x(d[2])+1)+' '+yy+'L'+(x(d[2])-7)+' '+(yy+4)+'Z" fill="var(--bad)"/>';
      s+='<circle cx="'+x(d[1])+'" cy="'+yy+'" r="5" fill="var(--mute)"/><circle cx="'+x(d[2])+'" cy="'+yy+'" r="5" fill="var(--bad)"/>';
      s+=T(x(d[1])-8,yy+4,d[1].toFixed(1)+'%',{a:'end',fs:11,fill:'var(--mute)'});
      s+=T(x(d[2])+8,yy+4,d[2].toFixed(1)+'%',{fs:11,fill:'var(--bad)',w:600});
    });
    box.innerHTML='<div class="lg"><span><i style="background:var(--mute)"></i>before RLHF</span><span><i style="background:var(--bad)"></i>after RLHF</span></div>'+RD.svg(W,H,s,'False-positive rate of human evaluators before and after RLHF');
  }

  // what the policy can reach: nested layers, inner = what the task meant to touch
  function reach(){
    const box=$('rcSvg');if(!box)return;
    const L=[['the code the task asked for','var(--good)'],['tests and test framework','var(--c1)'],['scorer','var(--c2)'],['sandbox and filesystem','var(--c4)'],['network and internet','var(--c6)'],['harness and leaderboard','var(--c5)'],['the reward process','var(--bad)']];
    const W=RD.width(box),n=L.length,band=22,side=W<520?9:16,H=(band+6)*(n-1)+40;
    let s='';
    for(let k=n-1;k>=0;k--){const o=n-1-k,x0=side*o,y0=band*o,w=W-2*x0,h=H-y0-6*o;
      s+='<rect x="'+(x0+1)+'" y="'+(y0+1)+'" width="'+(w-2)+'" height="'+(h-2)+'" rx="8" fill="'+(k===0?'var(--soft)':'var(--bg)')+'" stroke="'+L[k][1]+'" stroke-width="'+(k===0?2.4:1.8)+'"/>';
      s+=T(x0+9,y0+(k===0?h/2+4:15),L[k][0],{fs:11.5,fill:L[k][1],w:600});}
    box.innerHTML=RD.svg(W,H,s,'Nested layers a policy can reach, from the code the task asked for out to the reward process');
  }
  function all(){hero();wen();reach()}
  RD.onRender(all);RD.onResize(all);all();
})();
