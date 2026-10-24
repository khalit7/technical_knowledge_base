// ---- Test-time compute and reasoning. Built for this page on 2026-10-24: the hero, the PRM beam-search stepper (section 4) and the cost slider (section 7) ----
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

// ---- Section 4: beam search against a process reward model, N = 4 beams, beam width M = 2 (Snell et al. 2024, Section 5.2). Illustrative scores ----
(function(){
  const el=$('ttcPrm');if(!el||!window.RD)return;
  // nodes: [depth, row, PRM score, parent index or -1, final answer]
  const N=[[1,0,.82,-1],[1,1,.35,-1],[1,2,.67,-1],[1,3,.21,-1],
    [2,0,.88,0],[2,1,.54,0],[2,2,.71,2],[2,3,.30,2],
    [3,0,.91,4,'42'],[3,1,.62,4,'17'],[3,2,.74,6,'42'],[3,3,.40,6,'42']];
  const keep={1:[0,2],2:[4,6]};
  const S=[['Sample N = 4 first steps','The base model proposes four different first steps for the same problem. Nothing is scored yet.',1,0],
    ['The PRM scores each step','The process reward model predicts, for each partial solution, how likely it is to end correct (its reward-to-go). An outcome reward model could not do this: it only reads finished answers.',1,1],
    ['Keep the top N / M = 2','Only the two best prefixes survive (0.82 and 0.67). Compute is no longer spent on the two that already look wrong.',1,2],
    ['Expand each M = 2 times, score again','Each kept prefix gets two continuations, back to four candidates; the PRM scores the new steps and the top two are kept again.',2,2],
    ['Finish four solutions','The kept prefixes are expanded to complete answers. Snell et al. score a whole solution by the PRM’s prediction at its last step.',3,1],
    ['Best-of-N weighted','Scores are summed per final answer: 42 gets 0.91 + 0.74 + 0.40 = 2.05, 17 gets 0.62. The answer 42 is returned, a vote weighted by the verifier.',3,3]];
  function draw(i){const s=S[i],W=Math.min(760,width(el)),nar=W<560,top=8,rh=nar?40:44,tree=top+4*rh,H=tree+(nar?30:8);
    const x0=nar?44:84,res=nar?62:200,dx=(W-x0-res)/3,X=d=>x0+(d-1)*dx+dx*0.5,Y=rw=>top+rw*rh+rh/2;let g=defs;
    g+='<circle cx="16" cy="'+(tree/2)+'" r="9" fill="var(--ink)"/>'+t(2,tree/2+26,'problem',{fs:11,fill:'var(--mute)'});
    const vis=n=>n[0]<=s[2];
    N.forEach((n,k)=>{if(!vis(n))return;const [d,rw,sc,p,ans]=n,x=X(d),y=Y(rw);
      const px=p<0?16:X(N[p][0]),py=p<0?tree/2:Y(N[p][1]);
      const dead=(d<s[2]&&keep[d]&&!keep[d].includes(k))||(d===s[2]&&s[3]>=2&&keep[d]&&!keep[d].includes(k));
      g+='<line x1="'+(px+(p<0?9:24))+'" y1="'+py+'" x2="'+(x-24)+'" y2="'+y+'" stroke="'+(dead?'var(--dim)':'var(--mute)')+'" stroke-width="1.3"/>';
      const scored=d<s[2]||s[3]>=1;const fill=dead?'var(--soft)':ans&&s[3]>=3?(ans==='42'?'var(--open2)':'var(--soft)'):'var(--acc2)';
      g+=r(x-24,y-12,48,24,fill,dead?'var(--dim)':'var(--acc)',6);
      g+=t(x,y+4,scored?sc.toFixed(2):'step',{a:'middle',fs:11.5,fill:dead?'var(--mute)':'var(--ink)'});
      if(ans&&s[3]>=1)g+=t(x+30,y+4,'→ '+ans,{fs:11.5,w:600});});
    if(s[3]>=3){if(nar){g+=t(W/2,H-10,'sum per answer: 42 = 2.05 ✓, 17 = 0.62',{a:'middle',fs:11.5,w:600,fill:'var(--good)'})}
      else{const bx=W-180;g+=r(bx,Y(0)-14,176,Y(1)-Y(0)+28,'var(--bg)','var(--good)',6)+t(bx+10,Y(0)+4,'answer 42: 2.05 ✓',{fs:11.5,w:600,fill:'var(--good)'})+t(bx+10,Y(1)+4,'answer 17: 0.62',{fs:11.5,fill:'var(--mute)'});}}
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Beam search against a process reward model, step '+(i+1)+'">'+g+'</svg>';
    $('ttcPrmStep').textContent='Step '+(i+1)+' of '+S.length+': '+s[0];$('ttcPrmCap').textContent=s[1];}
  const a=RD.anim({card:'ttcPrmCard',ctl:'ttcPrmCtl',n:S.length,draw,ms:2200,label:'Beam search step'});
  addEventListener('resize',()=>{const r=$('t-read');if(r&&!r.hidden)a.redraw()});
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
