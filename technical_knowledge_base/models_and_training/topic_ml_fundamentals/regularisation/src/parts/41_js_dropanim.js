// ---- Reading: one real layer through dropout, training then inference, under three scaling schemes (before/after animation) ----
// The 96 activations are the first hidden layer of the page's dropout network on a real test digit (Dropout tab), keep p = 0.5.
(function(){
  const card=document.getElementById('da-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const L=RG.mlp(DIG.model),p=DIG.model.keep[1];
  const pix=k=>[...DIG.digits.slice(k*64,k*64+64)].map(c=>parseInt(c,17)/16);
  const DIGIT=DIG.measures.clear[0];
  const h=RG.fwd(L,pix(DIGIT),[1,1,1]).acts[0];const nU=h.length;
  const MODES={inv:{nm:'Inverted dropout (PyTorch, JAX, Keras)',tr:1/p,inf:1},orig:{nm:'Original scheme (Srivastava et al. 2014)',tr:1,inf:p},bug:{nm:'Scaling forgotten (a bug)',tr:1,inf:1}};
  const st={m:'inv'};
  const r=RG.rng(7),mask=h.map(()=>r()<p);
  // 1,000 further masks for the running mean (fixed seed so every mode sees the same masks)
  const sums={};function many(m){if(sums[m])return sums[m];const rr=RG.rng(11),out=[];
    for(let k=0;k<1000;k++){let s=0;for(let i=0;i<nU;i++)if(rr()<p)s+=h[i]*MODES[m].tr;out.push(s)}return sums[m]=out}
  const full=h.reduce((a,b)=>a+b,0);
  function bars(vals,opt){const el=$('da-plot'),W=Math.max(260,Math.min(860,RD.width(el))),H=120,m={l:6,r:6,t:8,b:18};
    const iw=W-m.l-m.r,bw=iw/nU,ymax=Math.max(...h)/p*1.04,sy=v=>m.t+(H-m.t-m.b)*(1-v/ymax);
    let s='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+sy(0)+'" y2="'+sy(0)+'" stroke="var(--dim)"/>';
    for(let i=0;i<nU;i++){const x=m.l+i*bw,v=vals[i],gh=opt.ghost?h[i]:0;
      if(gh)s+='<rect x="'+(x+bw*0.1).toFixed(1)+'" y="'+sy(gh).toFixed(1)+'" width="'+(bw*0.8).toFixed(1)+'" height="'+(sy(0)-sy(gh)).toFixed(1)+'" fill="none" stroke="var(--dim)" stroke-width="0.8"/>';
      if(v>0)s+='<rect x="'+(x+bw*0.1).toFixed(1)+'" y="'+sy(v).toFixed(1)+'" width="'+(bw*0.8).toFixed(1)+'" height="'+(sy(0)-sy(v)).toFixed(1)+'" fill="'+(opt.col||'var(--c1)')+'"/>';
      if(opt.drop&&!mask[i])s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-5)+'" text-anchor="middle" font-size="'+Math.min(10,bw*1.4).toFixed(1)+'" fill="var(--bad)">×</text>'}
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="96 activations of one hidden layer">'+s+'</svg>'}
  const f1=v=>v.toFixed(1);
  function draw(i){const M=MODES[st.m],kept=mask.filter(Boolean).length;
    let vals,opt={},cap;
    const trainSum=h.reduce((a,v,k)=>a+(mask[k]?v*M.tr:0),0),S=many(st.m),mean=S.reduce((a,b)=>a+b,0)/S.length,inf=full*M.inf;
    if(i===0){vals=h;cap=['The layer','96 activations of the first hidden layer, computed from one real test digit by the network on the Dropout tab. Together they send '+f1(full)+' (their sum) to the next layer.']}
    else if(i===1){vals=h;opt={drop:true};cap=['Draw a mask','Each unit is kept with probability p = 0.5, independently: a coin per unit. This pass keeps '+kept+' of 96 (× marks the dropped ones).']}
    else if(i===2){vals=h.map((v,k)=>mask[k]?v:0);opt={drop:true,ghost:true};cap=['Drop','Dropped units output 0 for this pass, and receive no gradient. The survivors now send only '+f1(h.reduce((a,v,k)=>a+(mask[k]?v:0),0))+' instead of '+f1(full)+'.']}
    else if(i===3){vals=h.map((v,k)=>mask[k]?v*M.tr:0);opt={drop:true,ghost:true,col:M.tr!==1?'var(--c3)':'var(--c1)'};
      cap=['Scale in training?',st.m==='inv'?'Inverted dropout divides every survivor by p, so each doubles (green). On average the layer now sends what it would send with nothing dropped.':st.m==='orig'?'The 2014 paper does not scale during training: survivors pass through unchanged. The correction comes later, at inference.':'Nothing is scaled now, as in the original scheme, but the correction it needs at inference will be forgotten.']}
    else if(i===4){vals=h.map((v,k)=>mask[k]?v*M.tr:0);opt={drop:true,col:M.tr!==1?'var(--c3)':'var(--c1)'};cap=['One training pass','This pass sends '+f1(trainSum)+' to the next layer. Every training step draws a fresh mask, so the next layer sees a different thinned network each time.']}
    else if(i===5){vals=h.map((v,k)=>mask[k]?v*M.tr:0);opt={drop:true,col:M.tr!==1?'var(--c3)':'var(--c1)'};cap=['Over 1,000 masks','Averaged over 1,000 masks, the layer sends '+f1(mean)+' (exact expectation '+f1(full*p*M.tr)+' = p × '+f1(full)+(M.tr!==1?' × 1/p':'')+'). The next layer learned its weights for inputs of this size.']}
    else if(i===6){vals=h.map(v=>v*M.inf);opt={col:M.inf!==1?'var(--c2)':'var(--c1)'};cap=['Inference: nothing dropped',st.m==='inv'?'At inference every unit is present and nothing is scaled: a plain forward pass, which is why frameworks prefer this scheme.':st.m==='orig'?'Every unit is present, and the outputs are multiplied by p = 0.5 (orange), the paper\'s "weights are multiplied by p at test time".':'Every unit is present and nothing is scaled, because the training-side scaling never happened.']}
    else {vals=h.map(v=>v*M.inf);opt={col:M.inf!==1?'var(--c2)':'var(--c1)'};const ok=Math.abs(inf-full*p*M.tr)<1e-9;
      cap=[ok?'Train and test agree':'Train and test disagree',ok?'Inference sends '+f1(inf)+', the training average. Both schemes give the same numbers; they differ only in where the factor sits (Srivastava et al. call them equivalent, section 10).':'Inference sends '+f1(inf)+', twice the '+f1(full*p)+' the next layer saw in training. Every downstream unit is driven harder than it was trained for. Frameworks build the scaling in, so the usual slip there is a different one: evaluating in train() mode, where dropout keeps firing and predictions come out noisy.']}
    bars(vals,opt);
    $('da-cap').innerHTML='<div class="t">Step '+(i+1)+' of 8: '+cap[0]+'</div>'+cap[1];
    $('da-n').innerHTML=RD.stat('kept this pass',i>=1&&i<=5?kept+' of 96':'all 96',i>=1&&i<=5?'p = 0.5':'nothing dropped')+
      RD.stat('sent, this pass',f1(i>=6?inf:i>=2?(i>=3?trainSum:h.reduce((a,v,k)=>a+(mask[k]?v:0),0)):full),i>=6?'inference':'training')+
      RD.stat('training average',i>=5?f1(mean):'…','over 1,000 masks')+
      RD.stat('inference ÷ training',i>=7?(inf/mean).toFixed(2)+'×':'…',i>=7?(Math.abs(inf/mean-1)<0.05?'<span class="ok">matches</span>':'<span class="warn">off by 1/p</span>'):'');
  }
  const A=RD.anim({card:'da-card',ctl:'da-ctl',n:8,draw,ms:2000,label:'Dropout step'});
  $('da-m').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));st.m=b.dataset.v;A.reset(8);A.play()});
  addEventListener('resize',()=>{if(card.offsetParent)A.redraw()});
})();
