// ---- Then and now: the DDPM recipe card, changed paper by paper, played in seven stretches (the long-replay rule); each stretch is explained by its item of the step list sx-thx ----
(function(){const F=[['space','Where the chain runs'],['net','Network'],['pred','Network predicts'],['loss','Training loss'],['sched','Noise schedule, variances'],['samp','Sampler'],['cond','Conditioning'],['res','Headline result']];
  const ax=id=>'https://arxiv.org/abs/'+id;
  const S=[
   {y:'June 2020',n:'DDPM (this paper)',u:'https://arxiv.org/abs/2006.11239',set:{space:'pixels, scaled to [−1, 1]',net:'U-Net (PixelCNN++ style), self-attention at 16 × 16, 35.7M parameters',pred:'the noise ε',loss:'L<sub>simple</sub>: unweighted ε MSE, t uniform',sched:'linear β 10<sup>−4</sup> to 0.02, T = 1,000; σ² fixed',samp:'ancestral (Algorithm 2), 1,000 network evaluations',cond:'none (unconditional)',res:'CIFAR10 FID 3.17; NLL ≤ 3.75 bits/dim'}},
   {y:'October 2020',n:'DDIM',u:ax('2010.02502'),set:{samp:'deterministic, non-Markovian sampler on the same trained model, "10× to 50× faster" in wall-clock time'}},
   {y:'November 2020',n:'Score-based SDEs',u:ax('2011.13456'),set:{sched:'continuous time: a forward SDE; DDPM and NCSN are special cases',samp:'reverse-time SDE solvers, predictor-corrector, or an equivalent ODE with exact likelihood'}},
   {y:'February 2021',n:'Improved DDPM',u:ax('2102.09672'),set:{loss:'L<sub>hybrid</sub>: L<sub>simple</sub> plus a bound term for learned variances',sched:'cosine schedule, T = 4,000; variances learned',samp:'an order of magnitude fewer forward passes with learned variances',res:'CIFAR10 NLL 2.94 bits/dim (their best); the DDPM setup reproduced at FID 3.29, NLL 3.73'}},
   {y:'May 2021',n:'Diffusion Models Beat GANs (ADM)',u:ax('2105.05233'),set:{net:'a better U-Net "through a series of ablations"',cond:'class labels, with classifier guidance (gradients of a separate classifier)',res:'ImageNet 256 × 256 FID 4.59; matches BigGAN-deep "with as few as 25 forward passes"'}},
   {y:'July 2021',n:'Variational Diffusion Models',u:ax('2107.00630'),set:{sched:'learned jointly with the model; the continuous-time bound depends only on the end-point signal-to-noise ratios',res:'CIFAR10 2.65 bits/dim, below the 2.80 that DDPM\'s Table 1 lists for the Sparse Transformer (DDPM itself listed at 3.69)'}},
   {y:'December 2021',n:'Latent diffusion (Stable Diffusion)',u:'https://app.notion.com/p/3c65c17b0d0d81bb98adc0daf8462cb6',set:{space:'the latent space of a pretrained autoencoder',cond:'cross-attention layers: text, bounding boxes'}},
   {y:'June 2022',n:'EDM (design space)',u:ax('2206.00364'),set:{net:'preconditioned score network',samp:'improved sampler, 35 network evaluations per image',res:'CIFAR10 FID 1.97 unconditional, 1.79 class-conditional'}},
   {y:'July 2022',n:'Classifier-free guidance',u:ax('2207.12598'),set:{cond:'conditional and unconditional model trained jointly; their estimates combined, no classifier'}},
   {y:'September to October 2022',n:'Rectified flow; Flow Matching',u:ax('2210.02747'),set:{pred:'a velocity field along (straight) paths from noise to data',loss:'regression of the vector field, simulation-free',samp:'an ODE, ideally along straight paths: few steps'}},
   {y:'December 2022',n:'DiT',u:ax('2212.09748'),set:{net:'a Transformer on latent patches (no U-Net)',res:'ImageNet 256 × 256 FID 2.27'}},
   {y:'March 2023',n:'Consistency models',u:ax('2303.01469'),set:{samp:'one step (multistep optional), by distillation or standalone training',res:'CIFAR10 FID 3.55 in one step'}},
   {y:'March 2024',n:'Stable Diffusion 3',u:ax('2403.03206'),set:{net:'rectified-flow Transformer',pred:'velocity (rectified flow)'}}];
  // accumulate the card at each step
  const cards=[];let cur={};S.forEach(s=>{cur=Object.assign({},cur,s.set);cards.push(cur)});
  const GR=[[0],[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]];  // the stretches: papers shown one after another within a step
  const steps=GR.map(I=>({t:I.map(i=>S[i].n).join('; ')}));
  const strike=v=>'<span class="mute" style="text-decoration:line-through">'+v+'</span>';
  function draw(m,k,e){const I=GR[k],np=I.length,f=Math.min(np-1e-9,e*np),j=Math.floor(f),u=f-j,last=e>=1,idx=I[j],C=cards[last?I[np-1]:idx],Pv=idx?cards[idx-1]:{};
    const chg=new Set();(last?I:[idx]).forEach(i=>{if(i>0)Object.keys(S[i].set).forEach(x=>chg.add(x))});
    let h='<p class="small mute" style="margin:0 0 6px">'+(last?I:[idx]).map(i=>S[i].y+': '+A(S[i].u,S[i].n)).join(' · ')+'</p><dl class="recipe">';
    F.forEach(([f,l])=>{const c=chg.has(f);h+='<dt>'+l+'</dt><dd'+(c?' class="chg"':'')+'>'+(!last&&c&&u<.45&&Pv[f]?strike(Pv[f]):C[f])+'</dd>'});
    return h+'</dl>'}
  function counters(m,k){const I=GR[k],last=I[I.length-1],ch=new Set();I.forEach(i=>{if(i>0)Object.keys(S[i].set).forEach(x=>ch.add(x))});
    return stat('years',S[I[0]].y.replace(/^.* /,'')+(I.length>1&&S[last].y.replace(/^.* /,'')!==S[I[0]].y.replace(/^.* /,'')?' to '+S[last].y.replace(/^.* /,''):''),I.length+(I.length>1?' papers':' paper'))+stat('lines changed',k?ch.size+' of '+F.length:'the original',k?'highlighted':'')+stat('still as in DDPM',F.filter(([f])=>cards[last][f]===cards[0][f]).length+' of '+F.length,'lines unchanged since 2020')}
  makeAnim({id:'thx',mode:'a',dur:7000,modes:{a:steps},lists:{a:'sx-thx'},draw,counters});
})();
