// ---- Reading, step 3: one example, three classification losses; and thread 1: cross entropy = entropy + KL ----
(function(){
  const $=id=>document.getElementById(id);
  const F=RD.f,FM=(v,n)=>RD.f(v,n).replace(/^-/,'−');
  // --- loss explorer ---
  if($('rd-ls')){
    const K=10,EPS=0.1;
    const pOf=v=>0.001+0.998*v/1000;
    function draw(){const p=pOf(+$('rd-lsP').value),gm=+$('rd-lsG').value/10;
      $('rd-lsPv').textContent=F(p,3);$('rd-lsGv').textContent=F(gm,1);
      const box=$('rd-lsSvg'),W=RD.width(box),H=Math.round(Math.min(260,Math.max(190,W*.4))),ml=34,mr=10,mt=10,mb=30,YM=4.5;
      const x=q=>ml+(W-ml-mr)*q,y=v=>mt+(H-mt-mb)*(1-Math.min(v,YM)/YM);
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Loss against the probability of the right class">';
      for(let v=0;v<=4;v++)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+v+'</text>';
      for(let q=0;q<=1.001;q+=0.2)s+='<text x="'+x(q)+'" y="'+(H-14)+'" font-size="10" text-anchor="'+(q>0.99?'end':'middle')+'" fill="var(--mute)">'+F(q,1)+'</text>';
      s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">probability of the right class</text>';
      const curve=(k,col,dash)=>{let d='';for(let j=0;j<=200;j++){const q=0.004+0.992*j/200,v=RDE.losses(q,K,EPS,gm)[k];d+=(j?'L':'M')+x(q).toFixed(1)+' '+y(v).toFixed(1)}return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2.2"'+(dash?' stroke-dasharray="6 4"':'')+'/>'};
      s+=curve('ce','var(--c1)')+curve('ls','var(--c4)',1)+curve('focal','var(--c2)');
      const pm=1-EPS+EPS/K;s+='<line x1="'+x(pm)+'" x2="'+x(pm)+'" y1="'+(y(0)-8)+'" y2="'+y(0)+'" stroke="var(--c4)" stroke-width="2"/>';
      s+='<line x1="'+x(p)+'" x2="'+x(p)+'" y1="'+mt+'" y2="'+y(0)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
      const o=RDE.losses(p,K,EPS,gm);
      [['ce','var(--c1)'],['ls','var(--c4)'],['focal','var(--c2)']].forEach(([k,c])=>{if(o[k]<=YM)s+='<circle cx="'+x(p)+'" cy="'+y(o[k])+'" r="4" fill="'+c+'" stroke="var(--bg)"/>'});
      box.innerHTML=s+'</svg>';
      const rel=o.gce!==0?Math.abs(o.gfocal/o.gce):0;
      $('rd-lsN').innerHTML=RD.stat('Cross entropy',F(o.ce,3),'push '+FM(o.gce,3))+RD.stat('Label smoothing',F(o.ls,3),'push '+FM(o.gls,3)+(o.gls>0?' (away from 1)':''))+
        RD.stat('Focal, γ = '+F(gm,1),F(o.focal,3),'push '+FM(o.gfocal,3))+RD.stat('Focal push / cross entropy push',F(rel,3),p>0.5?'easy example: down-weighted':'hard example: kept');
    }
    ['rd-lsP','rd-lsG'].forEach(id=>$(id).addEventListener('input',draw));
    RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  }
  // --- cross entropy = H(P) + KL(P||Q) ---
  if($('rd-ce')){
    const PRE=[
      {id:'hot',nm:'One-hot label',P:[1,0,0,0,0,0,0,0,0,0],x:'Classification with a hard label: H(P) = 0, so cross entropy, KL and the negative log-likelihood of the right class are one number. Push q to 1 and the loss goes to 0.'},
      {id:'ls',nm:'Label smoothing 0.1',P:[0.91,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01],x:'A smoothed target has entropy 0.50 nats that no model can remove: the loss floor. The KL part reaches 0 exactly at q = 0.91, the target itself, and grows again if the model gets more confident.'},
      {id:'kd',nm:'Teacher (distillation)',P:[0.6,0.2,0.08,0.04,0.03,0.02,0.01,0.01,0.005,0.005],x:'A teacher\'s soft distribution (illustrative). Training the student on cross entropy against it is the same as minimising KL(teacher ‖ student), the forward KL; the teacher\'s own entropy is a constant that does not move the gradient.'},
      {id:'nce',nm:'InfoNCE, batch of 8',P:[1,0,0,0,0,0,0,0],x:'Contrastive learning: each image must pick its own caption among the 8 in the batch, a one-hot classification over 8 candidates. Knowing nothing (q = 1/8) costs ln 8 = 2.08; CLIP\'s batch of 32,768 makes chance ln 32,768 = 10.4.'}
    ];
    let k=0;
    $('rd-ceB').innerHTML=PRE.map((p,i)=>'<button data-k="'+i+'">'+p.nm+'</button>').join('');
    function Q(P,q){const n=P.length,rest=P.slice(1).reduce((a,b)=>a+b,0);return P.map((v,i)=>i===0?q:(rest>0?(1-q)*v/rest:(1-q)/(n-1)))}
    function draw(){const pr=PRE[k],P=pr.P,q=+$('rd-ceQ').value/100,o=RDE.ckl(P,Q(P,q)),K=P.length;
      $('rd-ceQv').textContent=F(q,2);$('rd-ceB').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.k===k));
      const box=$('rd-ceSvg'),W=RD.width(box),H=78,ml=6,mr=10,XM=5,x=v=>ml+(W-ml-mr)*Math.min(v,XM)/XM,ch=Math.log(K);
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Cross entropy split into entropy and KL">';
      for(let v=0;v<=XM;v++)s+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="14" y2="50" stroke="var(--line)"/><text x="'+x(v)+'" y="64" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'</text>';
      s+='<rect x="'+x(0)+'" y="20" width="'+(x(o.h)-x(0))+'" height="24" fill="var(--dim)"/><rect x="'+x(o.h)+'" y="20" width="'+Math.max(0,x(o.h+o.kl)-x(o.h))+'" height="24" fill="var(--c1)"/>';
      s+='<line x1="'+x(ch)+'" x2="'+x(ch)+'" y1="12" y2="52" stroke="var(--c2)" stroke-width="2" stroke-dasharray="4 3"/><text x="'+Math.min(x(ch)+4,W-mr-70)+'" y="11" font-size="10.5" fill="var(--c2)">chance, ln '+K+'</text>';
      s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">nats</text>';
      box.innerHTML=s+'</svg>';
      $('rd-ceN').innerHTML=RD.stat('Cross entropy H(P, Q)',F(o.ce,3),'= '+F(o.h,3)+' + '+F(o.kl,3))+RD.stat('Entropy H(P)',F(o.h,3),'the floor (grey)')+RD.stat('KL(P ‖ Q)',F(o.kl,3),'what training removes (blue)')+RD.stat('Perplexity',F(Math.exp(o.ce),2),'exp(cross entropy)');
      $('rd-ceX').textContent=pr.x+' The wrong answers share the remaining 1 − q in proportion to the target\'s own wrong-answer probabilities (equally, for a one-hot target).';
    }
    $('rd-ceB').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;k=+b.dataset.k;draw()});
    $('rd-ceQ').addEventListener('input',draw);RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  }
})();
