// ---- Test-time compute and reasoning. Built for this page on 2026-10-24: the hero and the cost slider (section 7); the PRM beam-search stepper became the 3D stage 42_js_sc_prm.js on 2026-11-10 ----
(function(){
const T=window.TTC;if(!T)return;
const {$,fmt,stat,onTab}=T;
const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11.5)+'"'+(o.w?' font-weight="'+o.w+'"':'')+' fill="'+(o.fill||'var(--ink)')+'">'+s+'</text>'};
const r=(x,y,w,h,fill,stroke,rx)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx==null?4:rx)+'" fill="'+fill+'" stroke="'+(stroke||'none')+'"/>';
const arrow=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.4" marker-end="url(#ttcHa)"/>';
const defs='<defs><marker id="ttcHa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(300,Math.min(860,(document.documentElement.clientWidth||900)-60))};

// ---- Hero: one question, three places to spend the budget, what caps each, how it is learned and controlled ----
(function(){
  const el=$('ttcHero');if(!el)return;
  function panel(x,y,w,h,kind){let g=r(x,y,w,h,'var(--soft)','var(--line)',8);const cx=x+w/2;
    if(kind==='ser'){g+=t(cx,y+18,'Serial: one longer chain',{a:'middle',w:600,fs:12.5});
      const bx=x+12,bw=w-24,by=y+34;for(let i=0;i<12;i++)g+=r(bx+i*bw/12+1,by,bw/12-2,14,i===5?'var(--c5)':'var(--acc)',null,2);
      g+='<path d="M'+(bx+bw*0.47)+' '+(by+16)+' C'+(bx+bw*0.47)+' '+(by+34)+','+(bx+bw*0.2)+' '+(by+34)+','+(bx+bw*0.2)+' '+(by+18)+'" fill="none" stroke="var(--c5)" stroke-width="1.6" marker-end="url(#ttcHa)"/>';
      g+=t(bx+bw*0.6,by+32,'re-read, revise',{fs:11,fill:'var(--c5)'});
      g+=t(cx,y+h-34,'depth D = L × T',{a:'middle',w:600});g+=t(cx,y+h-16,'pays in latency and KV cache',{a:'middle',fs:11,fill:'var(--mute)'});}
    if(kind==='par'){g+=t(cx,y+18,'Parallel: n chains, a selector',{a:'middle',w:600,fs:12.5});
      const bx=x+12,bw=(w-24)*0.5;for(let j=0;j<4;j++){for(let i=0;i<4;i++)g+=r(bx+i*bw/4+1,y+30+j*12,bw/4-2,9,'var(--acc)',null,2);}
      const sx=bx+bw+18,sw=w-24-bw-18;g+=r(sx,y+30,sw,45,'var(--acc2)','var(--acc)',6);g+=t(sx+sw/2,y+50,'selector',{a:'middle',fs:11.5,w:600});g+=t(sx+sw/2,y+66,'check or vote',{a:'middle',fs:11,fill:'var(--mute)'});
      g+=arrow(bx+bw+2,y+52,sx-2,y+52);
      g+=t(cx,y+h-34,'pass@k = 1 − (1 − p)ᵏ',{a:'middle',w:600});g+=t(cx,y+h-16,'capped by what the selector recognises',{a:'middle',fs:11,fill:'var(--mute)'});}
    if(kind==='lat'){g+=t(cx,y+18,'Latent: loop the layers',{a:'middle',w:600,fs:12.5});
      const lx=cx-40;for(let i=0;i<4;i++)g+=r(lx,y+30+i*12,80,9,i===0||i===3?'var(--dim)':'var(--c4)',null,2);
      g+='<path d="M'+(lx+82)+' '+(y+61)+' C'+(lx+110)+' '+(y+61)+','+(lx+110)+' '+(y+42)+','+(lx+84)+' '+(y+42)+'" fill="none" stroke="var(--c4)" stroke-width="1.6" marker-end="url(#ttcHa)"/>';
      g+=t(lx+98,y+80,'× r',{fs:11,fill:'var(--c4)'});
      g+=t(cx,y+h-34,'depth with no text',{a:'middle',w:600});g+=t(cx,y+h-16,'nothing for a monitor to read',{a:'middle',fs:11,fill:'var(--mute)'});}
    return g}
  function draw(){const W=Math.min(860,width(el)),nar=W<600;let g=defs,H;
    const qh=30,ph=128,gap=10;
    g+=r(W/2-80,4,160,qh,'var(--bg)','var(--ink)',15)+t(W/2,24,'one question',{a:'middle',w:600,fs:12.5});
    if(!nar){const pw=(W-2*gap)/3,py=qh+30;['ser','par','lat'].forEach((k,i)=>{const x=i*(pw+gap);g+=arrow(W/2,qh+4,x+pw/2,py-3);g+=panel(x,py,pw,ph,k)});H=py+ph+12;}
    else{let y=qh+22;g+=arrow(W/2,qh+4,W/2,y-3);['ser','par','lat'].forEach(k=>{g+=panel(0,y,W,ph,k);y+=ph+gap});H=y+2;}
    const bh=40;g+=r(0,H,W,bh,'var(--bg)','var(--acc)',8)+t(W/2,H+17,nar?'learned: RL rewards answers a checker accepts':'learned: RL rewards final answers a checker accepts (RLVR), so long chains emerge',{a:'middle',fs:11.5,w:600})+t(W/2,H+32,nar?'controlled: budget, effort level or router':'controlled: a token budget, an effort level or a router decides how much',{a:'middle',fs:11,fill:'var(--mute)'});
    H+=bh+4;
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="One question, three places to spend test-time compute: a longer serial chain, parallel chains with a selector, or loops inside the network; learned by RL on checkable answers and controlled by a budget, effort level or router">'+g+'</svg>';}
  onTab(draw);draw();
})();

// ---- Section 7: the bill for one request as the thinking grows (Claude 3.7 Sonnet list prices, $3 and $15 per million tokens) ----
(function(){
  if(!$('ttcCost'))return;
  const IN=1000,ANS=500,PI=3,PO=15,TPS=50;
  function draw(){const th=+$('ttcCost').value;$('ttcCostv').textContent=fmt(th);
    const ci=IN*PI/1e6,ct=th*PO/1e6,ca=ANS*PO/1e6,tot=ci+ct+ca;
    $('ttcCostOut').innerHTML=stat('Cost of the request','$'+tot.toFixed(4),'$'+ci.toFixed(4)+' input + $'+(ct+ca).toFixed(4)+' output')+
      stat('Share of the bill that is thinking',(100*ct/tot).toFixed(1)+'%',fmt(th)+' thinking tokens at $15 per million')+
      stat('Wait before the answer starts',(th/TPS).toFixed(th/TPS>=100?0:1)+' s',fmt(th)+' ÷ 50 tokens a second (illustrative)');}
  $('ttcCost').addEventListener('input',draw);draw();
})();
})();
