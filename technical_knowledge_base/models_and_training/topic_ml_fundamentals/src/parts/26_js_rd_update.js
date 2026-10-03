// ---- Reading, step 5: the shape of one update (SGD, Adam's first step, Muon) and learning-rate schedules ----
(function(){
  const $=id=>document.getElementById(id);
  const F=RD.f,P=v=>RD.pct(v,0);
  // --- update geometry, animated through Newton-Schulz ---
  if($('rd-ug')){
    const nrm=s=>{const q=Math.sqrt(s.reduce((a,b)=>a+b*b,0));return s.map(v=>v/q)};
    const NSTEP=8;let an;
    const nz=s=>s.filter(v=>v>1e-9),spread=s=>{const z=nz(s);return z[0]/z[z.length-1]};
    function series(i){const G=RDE.geometry();if(i===0)return G.sgd;if(i<=5)return nrm(G.iters[i]);return G.adam}
    function draw(i){const G=RDE.geometry(),cur=i===7?G.muon:series(i),box=$('rd-ugSvg'),W=RD.width(box),H=Math.round(Math.min(230,Math.max(170,W*.34))),ml=34,mr=8,mt=10,mb=28,n=64,YM=0.36;
      const x=k=>ml+(W-ml-mr)*(k+0.5)/n,bw=Math.max(1.5,(W-ml-mr)/n*0.7),y=v=>mt+(H-mt-mb)*(1-Math.min(v,YM)/YM);
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Singular values of the update">';
      for(let v=0;v<=0.35;v+=0.1)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+F(v,1)+'</text>';
      [1,16,32,48,64].forEach(k=>s+='<text x="'+x(k-1)+'" y="'+(H-14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+k+'</text>');
      s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">direction, strongest first</text>';
      s+='<line x1="'+(x(31)+((W-ml-mr)/n)/2)+'" x2="'+(x(31)+((W-ml-mr)/n)/2)+'" y1="'+mt+'" y2="'+y(0)+'" stroke="var(--mute)" stroke-dasharray="3 3"/><text x="'+(x(31)+((W-ml-mr)/n)/2+4)+'" y="'+(mt+10)+'" font-size="10" fill="var(--mute)">batch of 32: gradient rank 32</text>';
      const bars=(arr,col,wf,dx)=>arr.map((v,k)=>v>0?'<rect x="'+(x(k)-bw*wf/2+dx)+'" y="'+y(v)+'" width="'+bw*wf+'" height="'+(y(0)-y(v))+'" fill="'+col+'"/>':'').join('');
      if(i===7){s+=bars(G.sgd,'var(--dim)',0.36,-bw*0.36)+bars(G.adam,'var(--c4)',0.36,0)+bars(G.muon,'var(--c1)',0.36,bw*0.36)}
      else{if(i>0)s+=bars(G.sgd,'var(--dim)',1,0);s+=bars(cur,i===6?'var(--c4)':'var(--c1)',i>0?0.55:1,0)}
      box.innerHTML=s+'</svg>';
      let t,p;
      if(i===0){t='The raw gradient: what SGD and momentum step along';p='A batch of 32 gives this 64 &times; 176 matrix at most 32 independent directions, and it has exactly 32. Its strongest direction is '+F(spread(G.sgd),1)+' times its weakest, and the top 5 carry '+P(RDE.topShare(G.sgd,5))+' of the update.'}
      else if(i<=5){const sv=G.iters[i].filter(v=>v>1e-9);t='Newton-Schulz iteration '+i+' of 5';p='X ← aX + b(XX<sup>T</sup>)X + c(XX<sup>T</sup>)<sup>2</sup>X maps every singular value σ to aσ + bσ<sup>3</sup> + cσ<sup>5</sup>, lifting small ones fast and capping large ones, while keeping the directions. Raw values now span '+F(sv[sv.length-1],2)+' to '+F(sv[0],2)+(i===5?': not exactly 1, but within a factor of '+F(spread(G.iters[5]),2)+', against '+F(spread(G.sgd),1)+' before. This is Muon\'s update.':'.')}
      else if(i===6){t='Adam\'s first step: the sign of every entry';p='Each weight moves by the same amount, up or down. That spreads the update over all 64 directions: '+P(G.adamOut)+' of it lies outside the 32 directions the gradient actually spans, where this batch gave no signal. Later steps are less extreme, as the averages fill in.'}
      else{t='Three updates from one gradient';p='Grey: SGD follows the gradient\'s own uneven shape. Purple: Adam\'s elementwise rescaling fills every direction, including ones with no gradient. Blue: Muon keeps exactly the gradient\'s 32 directions and gives them comparable strength.'}
      $('rd-ugT').textContent=t;$('rd-ugP').innerHTML=p;
      const sh=i===7?G.muon:cur;
      $('rd-ugN').innerHTML=RD.stat('Directions used',String(nz(sh).length),'of 64 possible')+RD.stat('Top 5 directions\' share',P(RDE.topShare(sh,5)),'raw gradient: '+P(RDE.topShare(G.sgd,5)))+RD.stat('Strongest / weakest',F(spread(sh),2),'nonzero directions');
    }
    an=RD.anim({card:'rd-ug',ctl:'rd-ugC',n:NSTEP,start:NSTEP-1,draw,ms:1700,label:'Iteration'});
    let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>an.redraw(),120)});
  }
  // --- schedules ---
  if($('rd-sc')){
    const S=RDE.SCHED,C=[['step','var(--dim)'],['isqrt','var(--c4)'],['cosine','var(--c1)'],['wsd','var(--c2)']];
    function draw(){const E=+$('rd-scE').value/100;$('rd-scEv').textContent=Math.round(E*100)+'%';
      const box=$('rd-scSvg'),W=RD.width(box),H=Math.round(Math.min(240,Math.max(180,W*.36))),ml=34,mr=10,mt=10,mb=30;
      const x=t=>ml+(W-ml-mr)*t,y=v=>mt+(H-mt-mb)*(1-v/1.05);
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Learning rate against training progress">';
      for(let v=0;v<=1.001;v+=0.25)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+F(v,2)+'</text>';
      for(let t=0;t<=1.001;t+=0.25)s+='<text x="'+x(t)+'" y="'+(H-14)+'" font-size="10" text-anchor="'+(t>0.99?'end':'middle')+'" fill="var(--mute)">'+Math.round(t*100)+'%</text>';
      s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">fraction of the planned run</text>';
      s+='<rect x="'+x(E)+'" y="'+mt+'" width="'+(x(1)-x(E))+'" height="'+(y(0)-mt)+'" fill="var(--soft)"/>';
      C.forEach(([k,col])=>{let d='';const f=k==='wsd'?(t=>S.wsd(t,E)):S[k],end=k==='wsd'?E:1;for(let j=0;j<=400;j++){const t=end*j/400;d+=(j?'L':'M')+x(t).toFixed(1)+' '+y(f(t)).toFixed(1)}
        s+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(k==='step'?2:2.3)+'"'+(k==='isqrt'?' stroke-dasharray="6 4"':'')+'/>'});
      s+='<line x1="'+x(E)+'" x2="'+x(E)+'" y1="'+mt+'" y2="'+y(0)+'" stroke="var(--ink)" stroke-width="1.5"/>';
      C.forEach(([k,col])=>{const v=k==='wsd'?S.wsd(E,E):S[k](E);s+='<circle cx="'+x(E)+'" cy="'+y(v)+'" r="4" fill="'+col+'" stroke="var(--bg)"/>'});
      box.innerHTML=s+'</svg>';
      const lab={step:'Step decay',isqrt:'Inverse square root',cosine:'Cosine, planned for 100%',wsd:'WSD, cooldown re-planned'};
      $('rd-scN').innerHTML=C.map(([k])=>{const v=k==='wsd'?S.wsd(E,E):S[k](E);return RD.stat(lab[k],RD.pct(v,0)+' of peak',k==='cosine'&&E<1?'a mid-run rate: not annealed':k==='wsd'?'cooled down at the new end':k==='isqrt'?'never anneals; needs no end':'set by fixed milestones')}).join('');
    }
    $('rd-scE').addEventListener('input',draw);RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  }
})();
