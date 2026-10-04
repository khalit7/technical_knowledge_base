// ---- Section 4: chasing a moving target against a frozen one (exact expected updates), and Extended Data Table 3 ----
(function(){
  const E=window.VBE;const CS=[1,2,3,5,10,20,40,0];// 0 = fitted Q iteration (C = infinity)
  const Cs=document.getElementById('vb-tnC'),Ds=document.getElementById('vb-tnD'),As=document.getElementById('vb-tnA'),Vp=document.getElementById('vb-tnV'),Ep=document.getElementById('vb-tnE'),
    Tt=document.getElementById('vb-tnT'),Xp=document.getElementById('vb-tnX'),Nc=document.getElementById('vb-tnN');
  const G=0.9,STEPS=120;let mode='on';
  const par=()=>({C:CS[+Cs.value],d1:+Ds.value/100,a:+As.value/100});
  const cName=C=>C===0?'∞ (fitted Q iteration)':String(C);
  function runs(){const p=par();return {p,on:E.tnet(G,p.d1,p.a,1,STEPS),tn:E.tnet(G,p.d1,p.a,p.C,STEPS)}}
  let cache=null,key='';
  function get(){const p=par(),k=p.C+'|'+p.d1+'|'+p.a;if(k!==key){key=k;cache=runs()}return cache}
  const tv=E.tnetTrue(G);const err=o=>Math.max(Math.abs(o[0]-tv[0]),Math.abs(o[1]-tv[1]));
  function draw(i){const R=get(),p=R.p;document.getElementById('vb-tnCv').textContent=cName(p.C);document.getElementById('vb-tnDv').textContent=p.d1.toFixed(2);document.getElementById('vb-tnAv').textContent=p.a.toFixed(2);
    const run=mode==='on'?R.on:R.tn,cur=run[i],C=mode==='on'?1:p.C;
    // value-space panel, clipped view around the true values
    const W=RD.width(Vp),H=230,l=34,r=10,t=10,b=26;const span=Math.max(14,Math.min(40,1.15*Math.max(...run.slice(0,i+1).map(o=>Math.max(Math.abs(o[0]),Math.abs(o[1]),Math.abs(o[2]),Math.abs(o[3]))))));
    const lo=-2,hi=Math.max(14,span);const X=v=>l+(W-l-r)*(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo),Y=v=>t+(H-t-b)*(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo);
    let s='';for(let v=0;v<=hi;v+=hi>30?10:5){s+='<line x1="'+X(v).toFixed(1)+'" x2="'+X(v).toFixed(1)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--line)"/><line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(X(v),H-b+13,v,{a:'middle',fs:10,fill:'var(--mute)'})+RD.t(l-4,Y(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'})}
    s+=RD.t((l+W-r)/2,H-2,'V(s₁)',{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(l+3,t+10,'V(s₂)',{fs:10.5,fill:'var(--mute)'});
    const inV=(a,b2)=>a>=lo&&a<=hi&&b2>=lo&&b2<=hi;let seg=[[0,0]],segs=[];run.slice(0,i+1).forEach(o=>{if(inV(o[0],o[1]))seg.push([o[0],o[1]]);else{if(seg.length>1)segs.push(seg);seg=[]}});if(seg.length>1)segs.push(seg);
    segs.forEach(sg=>{s+='<polyline fill="none" stroke="var(--c1)" stroke-width="1.3" opacity=".6" points="'+sg.map(o=>X(o[0]).toFixed(1)+','+Y(o[1]).toFixed(1)).join(' ')+'"/>'});
    s+='<circle cx="'+X(tv[0])+'" cy="'+Y(tv[1])+'" r="6" fill="none" stroke="var(--c3)" stroke-width="2"/>'+RD.t(X(tv[0])+8,Y(tv[1])+14,'true (9, 10)',{fs:10,fill:'var(--c3)'});
    if(inV(cur[2],cur[3]))s+='<rect x="'+(X(cur[2])-5)+'" y="'+(Y(cur[3])-5)+'" width="10" height="10" fill="var(--c2)" transform="rotate(45 '+X(cur[2])+' '+Y(cur[3])+')"/>'+RD.t(X(cur[2])+9,Y(cur[3])-6,'target',{fs:10,fill:'var(--c2)'});
    if(inV(cur[0],cur[1]))s+='<circle cx="'+X(cur[0])+'" cy="'+Y(cur[1])+'" r="5" fill="var(--c1)"/>'+RD.t(X(cur[0])-8,Y(cur[1])-8,'estimate',{fs:10,fill:'var(--c1)',a:'end'});
    else s+=RD.t(W-r,t+12,'estimate and target off the chart',{a:'end',fs:10,fill:'var(--bad)'});
    Vp.innerHTML=RD.svg(W,H,s,'The two values and their target');
    // error chart: both runs, log scale
    const eOn=R.on.map(err),eTn=R.tn.map(err);const W2=RD.width(Ep),H2=230,l2=40,r2=8,t2=10,b2=26,lg=v=>Math.log10(Math.max(1e-4,v));
    const all=eOn.concat(eTn).map(lg);const lo2=Math.max(-4,Math.floor(Math.min(...all))),hi2=Math.max(Math.ceil(Math.max(...all)),lo2+1);
    const X2=j=>l2+(W2-l2-r2)*j/(STEPS-1),Y2=v=>t2+(H2-t2-b2)*(hi2-v)/(hi2-lo2);let c='';
    const st2=Math.max(1,Math.ceil((hi2-lo2)/6));for(let e=lo2;e<=hi2;e+=st2)c+='<line x1="'+l2+'" x2="'+(W2-r2)+'" y1="'+Y2(e).toFixed(1)+'" y2="'+Y2(e).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l2-4,Y2(e)+4,e===0?'1':'10'+(e<0?'⁻':'')+String(Math.abs(e)).split('').map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join(''),{a:'end',fs:10.5,fill:'var(--mute)'});
    [[eOn,'var(--c2)','online, C = 1','on'],[eTn,'var(--c1)','target, C = '+(p.C===0?'∞':p.C),'tn']].forEach(([ys,col,lab,m])=>{const sh=ys.slice(0,i+1);
      c+='<polyline fill="none" stroke="'+col+'" stroke-width="'+(mode===m?2.6:1.2)+'" opacity="'+(mode===m?1:.55)+'" points="'+sh.map((v,j)=>X2(j).toFixed(1)+','+Y2(lg(v)).toFixed(1)).join(' ')+'"/>';
      const j=sh.length-1;c+=RD.t(X2(j)>W2-110?X2(j)-4:X2(j)+4,Y2(lg(sh[j]))+(m==='on'?-6:13),lab,{fs:10,fill:col,a:X2(j)>W2-110?'end':'start'})});
    c+=RD.t(l2,H2-8,'update 1',{fs:10,fill:'var(--mute)'})+RD.t(W2-r2,H2-8,'update '+STEPS,{a:'end',fs:10,fill:'var(--mute)'});
    Ep.innerHTML=RD.svg(W2,H2,c,'Error over updates');
    const k=i+1,fresh=(C===0)||((k-1)%C===0);
    Tt.textContent=(mode==='on'?'Online target':'Target network, C = '+cName(p.C))+', update '+k+' of '+STEPS+': error '+RD.n(err(cur),3);
    Xp.innerHTML=mode==='on'?'The target (r + γV(s₂) for each state) is recomputed from the weights being trained, so every step that raises V(s₁) also raises V(s₂) twice as much and drags the target along. With s₁ replayed '+Math.round(p.d1*100)+'% of the time, the estimate '+(err(R.on[STEPS-1])>err(R.on[0])?'never catches it: the error grows to '+RD.n(err(R.on[STEPS-1]),1)+' after '+STEPS+' updates.':'still catches it here: lower the share of s₁ and the online run is stable.'):
      (C===0?'Fitted Q iteration: each step solves the regression onto the frozen target exactly, so the estimate lands on the target and the target then jumps. With features that represent the true values, this is value iteration and the error shrinks by γ = 0.9 per refresh.':
      (fresh?'Refresh: the target network copies the online weights, and the target jumps to r + γV<sup>−</sup>(s₂) computed from that copy. ':'The target stands still (copied '+((k-1)%C)+' update'+((k-1)%C===1?'':'s')+' ago); the estimate regresses onto it like ordinary supervised learning. ')+'Error after '+STEPS+' updates: '+RD.n(err(R.tn[STEPS-1]),3)+' against '+RD.n(err(R.on[STEPS-1]),1)+' online.');
    Nc.innerHTML=RD.stat('Estimate (V(s₁), V(s₂))','('+RD.n(cur[0],2)+', '+RD.n(cur[1],2)+')','true (9, 10)')+RD.stat('Target (y₁, y₂)','('+RD.n(cur[2],2)+', '+RD.n(cur[3],2)+')',mode==='on'?'moves every update':'frozen between refreshes')+RD.stat('Target refreshes',mode==='on'?k:(C===0?k:Math.floor((k-1)/C)+1),'C = '+(mode==='on'?1:cName(p.C)))}
  const an=RD.anim({card:'vb-tn',ctl:'vb-tnK',n:STEPS,ms:220,draw,label:'Update'});
  document.getElementById('vb-tnM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.reset(STEPS);an.play()});
  [Cs,Ds,As].forEach(s=>s.addEventListener('input',()=>an.redraw()));RD.onResize(()=>an.redraw());
  // Extended Data Table 3 of the Nature paper (transcribed from the image): replay x target network, 5 games, 10M frames
  const ED=[['Breakout',316.8,240.7,10.2,3.2],['Enduro',1006.3,831.4,141.9,29.1],['River Raid',7446.6,4102.8,2867.7,1453.0],['Seaquest',2894.4,822.6,1003.0,275.8],['Space Invaders',1088.9,826.3,373.2,302.0]];
  const LAB=['replay + target','replay only','target only','neither'],COL=['var(--c1)','var(--c6)','var(--c5)','var(--c2)'];let edm='rel';
  function drawED(){const el=document.getElementById('vb-ed');el.innerHTML=ED.map(g=>'<div style="margin:8px 0 2px;font-size:13px;font-weight:600">'+g[0]+'</div><div class="edb"></div>').join('');
    [...el.querySelectorAll('.edb')].forEach((d,gi)=>{const g=ED[gi];RD.bars(d,LAB.map((lb,j)=>({nm:lb,v:edm==='rel'?100*g[j+1]/g[1]:g[j+1],lab:edm==='rel'?Math.round(100*g[j+1]/g[1])+'%':g[j+1].toLocaleString('en-US',{minimumFractionDigits:1}),col:COL[j]})),{lo:0,hi:edm==='rel'?100:g[1]})})}
  document.getElementById('vb-edM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;edm=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));drawED()});
  drawED();
})();
