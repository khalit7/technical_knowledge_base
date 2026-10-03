// ---- Reading: family tree (first arXiv dates; Hadsell et al. is CVPR 2006, LeCun's position paper is dated 2022-06-27) ----
(function(){
  const el=document.getElementById('ft-list');if(!el)return;
  const F={pre:['Pretext tasks','var(--mute)'],con:['Contrastive','var(--c1)'],dis:['Self-distillation','var(--c3)'],red:['Redundancy reduction','var(--c4)'],mask:['Masked modelling','var(--c2)'],jepa:['Joint-embedding prediction','var(--c6)'],emb:['Embedding models','var(--c5)']};
  const A='https://arxiv.org/abs/';
  const E=[
    ['2006-06','Contrastive loss with a margin (Hadsell, Chopra, LeCun)','con','pull similar pairs together, push dissimilar ones apart within a radius','http://yann.lecun.com/exdb/publis/pdf/hadsell-chopra-lecun-06.pdf'],
    ['2014-06','Exemplar CNN','pre','each image under many transformations is one surrogate class',A+'1406.6909'],
    ['2015-03','FaceNet triplet loss','con','anchor, positive and negative separated by a margin',A+'1503.03832'],
    ['2015-05','Context prediction','pre','where is the second patch relative to the first?',A+'1505.05192'],
    ['2016-03','Jigsaw puzzles','pre','reorder shuffled tiles',A+'1603.09246'],
    ['2018-03','Rotation prediction','pre','which 2-D rotation was applied?',A+'1803.07728'],
    ['2018-05','Instance discrimination','con','every image its own class; a memory bank; NCE',A+'1805.01978'],
    ['2018-07','CPC and InfoNCE','con','the loss and its mutual-information bound',A+'1807.03748'],
    ['2018-10','BERT','mask','masked-token prediction, 15% of tokens',A+'1810.04805'],
    ['2019-08','Sentence-BERT','emb','siamese BERT, mean pooling',A+'1908.10084'],
    ['2019-11','MoCo','con','momentum encoder and a queue of 65,536 negatives',A+'1911.05722'],
    ['2020-02','SimCLR','con','augmentations, projection head, batch 4,096',A+'2002.05709'],
    ['2020-05','Alignment and uniformity','con','what the contrastive loss optimises',A+'2005.10242'],
    ['2020-06','BYOL','dis','no negatives: predictor and moving-average target',A+'2006.07733'],
    ['2020-11','SimSiam','dis','stop-gradient and predictor are enough',A+'2011.10566'],
    ['2021-02','CLIP','con','image-text pairs, symmetric InfoNCE, batch 32,768',A+'2103.00020'],
    ['2021-03','Barlow Twins','red','cross-correlation towards the identity',A+'2103.03230'],
    ['2021-04','SimCSE','emb','dropout as the augmentation for sentences',A+'2104.08821'],
    ['2021-04','DINO','dis','centering and sharpening a momentum teacher',A+'2104.14294'],
    ['2021-05','VICReg','red','variance, invariance, covariance',A+'2105.04906'],
    ['2021-06','BEiT','mask','predict discrete visual tokens',A+'2106.08254'],
    ['2021-11','MAE','mask','75% masked, encoder on visible patches only',A+'2111.06377'],
    ['2021-11','SimMIM','mask','raw pixels, one-layer head, l1 loss',A+'2111.09886'],
    ['2022-02','data2vec','jepa','predict a teacher\'s representations, for speech, text and images',A+'2202.03555'],
    ['2022-06','JEPA proposed (LeCun)','jepa','"A Path Towards Autonomous Machine Intelligence", v0.9.2','https://openreview.net/forum?id=BZ5a1r-kVsf'],
    ['2022-12','E5','emb','contrastive pretraining on web text pairs',A+'2212.03533'],
    ['2023-01','I-JEPA','jepa','predict target-block representations from a context block',A+'2301.08243'],
    ['2023-03','SigLIP','con','a per-pair sigmoid instead of the batch softmax',A+'2303.15343'],
    ['2023-04','DINOv2','dis','142M curated images, ViT-g, frozen features',A+'2304.07193'],
    ['2023-12','E5-Mistral','emb','a decoder-only LLM as embedder, [EOS] pooling',A+'2401.00368'],
    ['2024-02','V-JEPA','jepa','JEPA on 2 million videos',A+'2404.08471'],
    ['2024-05','NV-Embed','emb','latent attention pooling, causal mask removed',A+'2405.17428'],
    ['2025-06','Qwen3-Embedding','emb','[EOS] pooling with causal attention kept',A+'2506.05176'],
    ['2025-06','V-JEPA 2','jepa','over 1 million hours of video; action-conditioned world model',A+'2506.09985'],
    ['2025-08','DINOv3','dis','7B parameters, 1.7B images, Gram anchoring',A+'2508.10104']];
  const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let sel=null;
  function draw(){
    const years=[...new Set(E.map(e=>e[0].slice(0,4)))];
    el.innerHTML=years.map(y=>'<div style="display:grid;grid-template-columns:3.2em minmax(0,1fr);gap:4px 10px;border-top:1px solid var(--line);padding:5px 0"><div style="font-weight:600;font-size:13px">'+y+'</div><div>'+
      E.filter(e=>e[0].startsWith(y)).map(e=>'<div style="font-size:13px;margin:2px 0;'+(sel&&sel!==e[2]?'opacity:.25':'')+'"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+F[e[2]][1]+';margin-right:6px"></span><span class="mute">'+MO[+e[0].slice(5)-1]+'</span> <a href="'+e[4]+'" target="_blank" rel="noopener noreferrer">'+e[1]+'</a>: '+e[3]+'</div>').join('')+'</div></div>').join('');
  }
  const ch=document.getElementById('ft-chips');
  ch.innerHTML=Object.keys(F).map(k=>'<button data-f="'+k+'" aria-pressed="false"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+F[k][1]+';margin-right:5px"></span>'+F[k][0]+'</button>').join('');
  ch.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=sel===b.dataset.f?null:b.dataset.f;
    [...ch.querySelectorAll('button')].forEach(x=>{const on=x.dataset.f===sel;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});draw()});
  draw();
})();
