// ---- Reading: what each regulariser buys, from published comparisons (values transcribed from the papers' tables) ----
(function(){
  const card=document.getElementById('ef-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const S=[
    {id:'mnist',nm:'MNIST, dropout paper',base:1.62,baseNm:'L2',unit:'test error %',
      rows:[['L2',1.62],['L2 + L1 towards the end of training',1.60],['L2 + KL-sparsity',1.55],['Max-norm',1.35],['Dropout + L2',1.25],['Dropout + max-norm',1.05]],
      note:'784-1024-1024-2048-10 ReLU network, SGD, every hyperparameter chosen on a validation set ({{Srivastava et al. 2014, Table 9|https://jmlr.org/papers/v15/srivastava14a.html}}). No unregularised row: the line is L2 alone.'},
    {id:'zhang',nm:'CIFAR-10, Inception',base:14.25,baseNm:'neither',unit:'test error %',
      rows:[['no crops, no weight decay',14.25],['weight decay only',13.97],['random crops only',10.69],['crops + weight decay',10.95]],
      note:'Inception (1.6M parameters) on CIFAR-10, 100% training accuracy in every row; errors are 100 minus the printed test accuracies 85.75, 86.03, 89.31, 89.05 ({{Zhang et al. 2017, Table 1|https://arxiv.org/abs/1611.03530}}). Augmentation buys about 3.5 points; weight decay, at most 0.3.'},
    {id:'imnet',nm:'ImageNet, ResNet-50',base:23.68,baseNm:'baseline',unit:'top-1 error %',
      rows:[['Baseline',23.68],['+ Cutout',22.93],['+ Mixup',22.58],['+ Manifold Mixup',22.50],['+ Stochastic depth',22.46],['+ DropBlock *',21.87],['+ Feature CutMix',21.80],['+ CutMix',21.40]],
      note:'ResNet-50, 300 epochs, standard crops and flips in every row ({{Yun et al. 2019, Table 3|https://arxiv.org/abs/1905.04899}}). * reported in the original paper, not re-run.'},
    {id:'c100',nm:'CIFAR-100, PyramidNet-200',base:16.45,baseNm:'baseline',unit:'top-1 error %',
      rows:[['Baseline',16.45],['+ Label smoothing 0.1',16.73],['+ Cutout',16.53],['+ Manifold Mixup',16.14],['+ Stochastic depth',15.86],['+ Mixup (α = 0.5)',15.78],['+ DropBlock',15.73],['+ Mixup (α = 1.0)',15.63],['+ Cutout + label smoothing',15.61],['+ Cutout + Mixup',15.46],['+ DropBlock + label smoothing',15.16],['+ Cutout + Manifold Mixup',15.09],['+ ShakeDrop',15.08],['+ CutMix',14.47],['+ CutMix + ShakeDrop',13.81]],
      note:'PyramidNet-200 (26.8M parameters) on CIFAR-100 ({{Yun et al. 2019, Table 5|https://arxiv.org/abs/1905.04899}}). Label smoothing and Cutout alone made it slightly worse; together they helped.'},
    {id:'noise',nm:'Corrupted labels, CIFAR-10',unit:'test error %',grp:true,
      rows:[['20% wrong: plain',12.7,16.6],['20%: + dropout',8.8,10.4],['20%: mixup (α = 8)',5.9,6.4],['20%: mixup + dropout',6.2,6.2],
            ['50% wrong: plain',18.8,44.6],['50%: + dropout',14.1,15.5],['50%: mixup (α = 32)',11.3,12.7],['50%: mixup + dropout',10.9,10.9],
            ['80% wrong: plain',36.5,73.9],['80%: + dropout',30.9,35.1],['80%: mixup (α = 32)',25.3,30.9],['80%: mixup + dropout',24.0,24.8]],
      note:'PreAct ResNet-18, 200 epochs, a share of training labels replaced by random ones, test labels clean ({{Zhang et al. 2018, Table 2|https://arxiv.org/abs/1710.09412}}). Bar: test error at the last epoch; tick: at the best epoch, which early stopping would have kept. Dropout rates there are drop probabilities (0.7 at 20%, 0.8 at 50% and 80%).'}];
  const st={s:'imnet'};
  $('ef-s').innerHTML=S.map(s=>'<button data-v="'+s.id+'"'+(s.id===st.s?' class="on"':'')+'>'+s.nm+'</button>').join('');
  function draw(){const s=S.find(x=>x.id===st.s),el=$('ef-plot'),W=Math.max(260,Math.min(860,RD.width(el)));
    const narrow=W<520,lw=narrow?6:240,rh=narrow?34:22,m={t:8,b:26,r:narrow?12:44};
    const H=m.t+m.b+rh*s.rows.length,iw=W-lw-m.r;
    const dl=r=>s.grp?r[2]:r[1]-s.base;
    let vmin=s.grp?0:Math.min(0,...s.rows.map(dl)),vmax=Math.max(s.grp?0:0.05,...s.rows.map(r=>s.grp?Math.max(r[1],r[2]):dl(r)));const pad=(vmax-vmin)*0.04;vmin-=s.grp?0:pad;vmax+=pad;
    const sx=v=>lw+(v-vmin)/(vmax-vmin)*iw;let g='';
    PL.ticks(vmin,vmax,narrow?3:5).forEach(v=>{g+='<line x1="'+sx(v)+'" x2="'+sx(v)+'" y1="'+m.t+'" y2="'+(H-m.b)+'" stroke="var(--line)"/><text x="'+sx(v)+'" y="'+(H-m.b+13)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+(s.grp?'':v>0?'+':'')+PL.fmt(v).replace('-','−')+'</text>'});
    s.rows.forEach((r,i)=>{const y=m.t+i*rh,bh=narrow?12:rh*0.62,isB=!s.grp&&r[0].toLowerCase().indexOf(s.baseNm)===0;
      const v=dl(r),col=s.grp?'var(--c1)':isB?'var(--mute)':v<0?'var(--c3)':'var(--c2)';
      const lab=RD.esc(r[0]);
      if(narrow){g+='<text x="4" y="'+(y+11)+'" font-size="11.5" fill="var(--ink)">'+lab+'</text>'}
      else g+='<text x="'+(lw-6)+'" y="'+(y+rh*0.62)+'" text-anchor="end" font-size="12" fill="var(--ink)">'+lab+'</text>';
      const x0=sx(Math.min(0,v)),x1=sx(Math.max(0,v));
      const by=narrow?y+15:y+(rh-bh)/2;g+='<rect x="'+x0+'" y="'+by+'" width="'+Math.max(1,x1-x0)+'" height="'+bh+'" rx="2" fill="'+col+'"/>';
      const txt=s.grp?String(r[2]):(isB?r[1]+'%':(v>0?'+':'−')+Math.abs(v).toFixed(2)+' ('+r[1]+')');
      if(narrow){g+='<text x="'+(W-4)+'" y="'+(y+11)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+txt+'</text>'}else{
      const right=x1+4+txt.length*6<W;
      g+='<text x="'+(right?x1+4:x0-4)+'" y="'+(by+bh*0.8)+'" text-anchor="'+(right?'start':'end')+'" font-size="11" fill="var(--mute)">'+txt+'</text>';}
      if(s.grp)g+='<line x1="'+sx(r[1])+'" x2="'+sx(r[1])+'" y1="'+(y+2)+'" y2="'+(y+rh-2)+'" stroke="var(--ink)" stroke-width="2.5" transform="translate(0,'+(narrow?7:0)+')"><title>best epoch '+r[1]+'</title></line>'});
    if(!s.grp)g+='<line x1="'+sx(0)+'" x2="'+sx(0)+'" y1="'+m.t+'" y2="'+(H-m.b)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    g+='<text x="'+(lw+iw/2)+'" y="'+(H-2)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+(s.grp?s.unit:'change against '+s.baseNm+' ('+s.base+'), points of '+s.unit)+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+RD.esc(s.nm)+'">'+g+'</svg>';
    $('ef-note').innerHTML=s.note.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,(a,t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>')+(s.grp?'':' Bars: change in test error against the dashed line (the study\'s '+s.baseNm+' run); green is better, orange worse; the absolute error is in brackets.');
  }
  $('ef-s').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));st.s=b.dataset.v;draw()});
  RD.onRender(draw);addEventListener('resize',()=>{if(card.offsetParent)draw()});draw();
})();
