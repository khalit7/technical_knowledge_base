// ---- Reading sections 11 and 12: the deadly triad (w -> 2w) and maximisation bias ----
(function(){
  const E=window.RDE;
  (function(){
    const Gs=document.getElementById('rd-trG'),As=document.getElementById('rd-trA'),S=document.getElementById('rd-trS'),P=document.getElementById('rd-trP'),Tt=document.getElementById('rd-trT'),Xp=document.getElementById('rd-trX');
    let mode='off';const STEPS=30;
    function draw(i){const g=+Gs.value/100,a=+As.value/100;document.getElementById('rd-trGv').textContent=g.toFixed(2);document.getElementById('rd-trAv').textContent=a.toFixed(2);
      const off=E.triad(g,a,'off',STEPS),on=E.triad(g,a,'on',STEPS),ws=mode==='off'?off:on,w=ws[i];
      let W=RD.width(S),H=150;let s='<defs><marker id="rd-trAr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
      const x1=W*0.2,x2=W*0.55,x3=W*0.86,y=70,r=Math.min(34,W*0.1);
      const SUP='⁰¹²³⁴⁵⁶⁷⁸⁹',fmt=v=>{if(Math.abs(v)>=1e4||(Math.abs(v)<1e-3&&v!==0)){const ex=Math.floor(Math.log10(Math.abs(v))),m=v/Math.pow(10,ex);return RD.n(m,2)+' × 10'+(ex<0?'⁻':'')+String(Math.abs(ex)).split('').map(d=>SUP[+d]).join('')}return RD.n(v,Math.abs(v)<10?3:1)};
      s+='<circle cx="'+x1+'" cy="'+y+'" r="'+r+'" fill="'+RD.colorScale(Math.min(1,Math.abs(w)/100),-1,1)+'" stroke="var(--line)"/>'+RD.t(x1,y-4,'w',{a:'middle',fs:12,w:600})+RD.t(x1,y+12,fmt(w),{a:'middle',fs:10.5});
      s+='<circle cx="'+x2+'" cy="'+y+'" r="'+r+'" fill="'+RD.colorScale(Math.min(1,Math.abs(2*w)/100),-1,1)+'" stroke="var(--line)"/>'+RD.t(x2,y-4,'2w',{a:'middle',fs:12,w:600})+RD.t(x2,y+12,fmt(2*w),{a:'middle',fs:10.5});
      s+='<line x1="'+(x1+r)+'" x2="'+(x2-r-3)+'" y1="'+y+'" y2="'+y+'" stroke="var(--c1)" stroke-width="2.5" marker-end="url(#rd-trAr)"/>'+RD.t((x1+x2)/2,y-8,'reward 0',{a:'middle',fs:10,fill:'var(--mute)'});
      s+='<line x1="'+(x2+r)+'" x2="'+(x3-14)+'" y1="'+y+'" y2="'+y+'" stroke="'+(mode==='on'?'var(--c3)':'var(--dim)')+'" stroke-width="'+(mode==='on'?2.5:1.5)+'"'+(mode==='on'?'':' stroke-dasharray="4 4"')+' marker-end="url(#rd-trAr)"/>'+RD.t(x3,y+4,'end',{a:'middle',fs:11,fill:'var(--mute)'});
      s+=RD.t((x2+x3)/2,y-8,mode==='on'?'reward 0, updated':'never updated',{a:'middle',fs:10,fill:mode==='on'?'var(--c3)':'var(--mute)'});
      s+=RD.t(W/2,135,'features 1 and 2, one shared weight w',{a:'middle',fs:10,fill:'var(--mute)'});
      S.innerHTML=RD.svg(W,H,s,'Two states sharing a weight');
      // log |w| chart
      W=RD.width(P);const Hc=150,l=38,rr=8,t=10,b=22,lg=v=>Math.log10(Math.max(1e-6,Math.abs(v))),all=off.concat(on).map(lg),lo=Math.max(-6,Math.min(...all)),hi=Math.max(...all,1.5),X=j=>l+(W-l-rr)*j/STEPS,Y=v=>t+(Hc-t-b)*(hi-v)/(hi-lo||1);let c='';
      for(let e=Math.ceil(lo);e<=Math.floor(hi);e++)c+='<line x1="'+l+'" x2="'+(W-rr)+'" y1="'+Y(e)+'" y2="'+Y(e)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(e)+4,'10'+(e<0?'⁻':'')+'⁰¹²³⁴⁵⁶⁷⁸⁹'[Math.abs(e)],{a:'end',fs:11,fill:'var(--mute)'});
      [['off',off,'var(--c2)','off-policy'],['on',on,'var(--c3)','on-policy']].forEach(([k,arr,col,lab])=>{c+='<polyline fill="none" stroke="'+col+'" stroke-width="'+(k===mode?2.8:1.2)+'" opacity="'+(k===mode?1:.5)+'" points="'+arr.slice(0,i+1).map((v,j)=>X(j).toFixed(1)+','+Y(lg(v)).toFixed(1)).join(' ')+'"/>';c+=RD.t(X(i)>W-80?X(i)-4:X(i)+3,Y(lg(arr[i]))+(k==='off'?-6:(lg(arr[i])<lg(off[i])?-6:13)),lab,{fs:10,fill:col,a:X(i)>W-80?'end':'start'})});
      c+=RD.t(l,Hc-6,'update 0',{fs:10,fill:'var(--mute)'})+RD.t(W-rr,Hc-6,'update '+STEPS,{a:'end',fs:10,fill:'var(--mute)'});
      P.innerHTML=RD.svg(W,Hc,c,'Weight over updates');
      const fac=1+a*(2*g-1),facOn=(1+a*(2*g-1))*(1-4*a);
      Tt.textContent=(mode==='off'?'Off-policy':'On-policy')+', after '+i+' update'+(i===1?'':'s')+': w = '+fmt(w);
      Xp.innerHTML=mode==='off'?'TD error on the w → 2w transition: γ·2w − w = (2γ − 1)w = '+fmt((2*g-1)*w)+'. Each update multiplies w by 1 + α(2γ − 1) = '+RD.n(fac,3)+(fac>1?': it grows without bound, whatever α is, because γ &gt; 0.5.':': it shrinks, because γ ≤ 0.5.'):
        'Each visit now also updates the 2w state toward 0 (its gradient is 2), multiplying w by 1 − 4α. Per round the factor is '+RD.n(fac,3)+' × '+RD.n(1-4*a,3)+' = '+RD.n(facOn,3)+(Math.abs(facOn)<1?': the estimate is pulled back to 0, the true value.':': at this large α the on-policy updates overshoot too (|factor| ≥ 1); lower α.')}
    const an=RD.anim({card:'rd-tr',ctl:'rd-trC',n:STEPS+1,ms:500,draw,label:'Update'});
    document.getElementById('rd-trM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.reset(STEPS+1);an.play()});
    Gs.addEventListener('input',()=>an.redraw());As.addEventListener('input',()=>an.redraw());RD.onResize(()=>an.redraw());
  })();
  (function(){
    const Ns=document.getElementById('rd-mxN'),Ss=document.getElementById('rd-mxS'),P=document.getElementById('rd-mxP'),Tt=document.getElementById('rd-mxT');
    const cache={};const em=n=>cache[n]!=null?cache[n]:(cache[n]=E.emax(n));
    function draw(){const n=+Ns.value,sg=+Ss.value/10;document.getElementById('rd-mxNv').textContent=n;document.getElementById('rd-mxSv').textContent=sg.toFixed(1);
      const W=RD.width(P),H=120,l=150,r=50,X=v=>l+(W-l-r)*v/(3*2.2),rows=[['True value of the best action',0,'var(--mute)'],['Q-learning target: max of estimates',sg*em(n),'var(--c2)'],['Double estimator: pick with one, value with the other',0,'var(--c3)']];let s='';
      const lw=Math.min(l,W*0.45);rows.forEach(([lab,v,c],j)=>{const y=14+j*36;const XX=vv=>lw+(W-lw-r)*vv/(3*2.2);s+=RD.t(4,y+12,lab.length*6>lw?lab.split(': ')[0]:lab,{fs:10.5});s+='<rect x="'+lw+'" y="'+(y+2)+'" width="'+Math.max(2,XX(v)-lw).toFixed(1)+'" height="14" fill="'+c+'" rx="2"/>'+RD.t(Math.max(XX(v),lw+2)+5,y+13,RD.n(v,3),{fs:11,w:600})});
      P.innerHTML=RD.svg(W,H,s,'Maximisation bias');
      Tt.innerHTML='With '+n+' action'+(n>1?'s':'')+' all truly worth 0 and each estimate off by independent noise of standard deviation '+sg.toFixed(1)+', the expected maximum is '+RD.n(sg*em(n),3)+' <i class="nl d">derived</i>: σ × 𝔼[max of '+n+' standard normals] (0.846 for 3, 1.539 for 10). Q-learning bootstraps from that max, so the bias feeds into every earlier state. Choosing the action with one set of estimates and valuing it with an independent second set (Double Q-learning, Double DQN) has expected value 0 here.'}
    Ns.addEventListener('input',draw);Ss.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();
})();
