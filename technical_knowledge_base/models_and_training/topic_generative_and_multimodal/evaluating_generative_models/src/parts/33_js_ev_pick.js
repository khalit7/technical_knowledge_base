// ---- Which metric? tab (static recommendations) ----
(function(){
  const $=id=>document.getElementById(id);
  const N={s:'Below 2,048 samples the Inception covariance is singular and FID is meaningless; use KID (unbiased, report the spread over subsets) or CMMD, and say N.',
    m:'Use one fixed N for every model and report the real-vs-real floor at that N (this page: FID '+EV.txt['floor:1000']+' at 1,000, '+EV.txt['floor:10000']+' at 10,000). KID alongside FID; FID<sub>&infin;</sub> by fitting in 1/N if models differ in spread.',
    l:'The published convention: 50,000 samples against statistics of the full training set (ADM, EDM2). Still state the reference set, resize and file format.'};
  const Q=[
    {id:'ckpt',name:'Is checkpoint B better than A (same model family, unconditional or class-conditional)?',
     use:['FID and KID on the same features, same N, same reference set','precision and recall (Inception or DINOv2 space) to see which way it moved','FD-DINOv2 as a second opinion with non-ImageNet features'],
     set:['torch-fidelity or clean-fid with PNG samples and one resize for both sets','fixed noise seeds; 2 to 3 seeds per checkpoint for the spread'],
     rep:['value and spread over seeds','the floor at the same N','samples per class (look at them)'],
     ev:'Section 3 (bias with N), section 4 (ranks across five metrics), the Metric comparator tab.'},
    {id:'paper',name:'How does my model compare with published numbers?',
     use:['exactly the paper\'s protocol: features, N, reference set (often full training set), resize library, file format','or recompute the baseline yourself with your protocol (ADM recomputed all baselines with one codebase)'],
     set:['clean-fid legacy modes reproduce old TensorFlow or pytorch-fid numbers','never compare an FID from a different implementation without re-running both'],
     rep:['the full protocol line: extractor and weights, resize, format, reference, N'],
     ev:'Section 5 and the Pitfall lab: JPEG and resizing alone move FID by more than typical gaps between methods.'},
    {id:'div',name:'Is my model dropping modes or losing variety (for example from guidance)?',
     use:['recall (k-NN coverage) and its partner precision','per-class counts with a classifier when labels exist','FID alone cannot tell this apart from blur'],
     set:['equal N on both sides; k = 3 as in Kynk&auml;&auml;nniemi et al.','density and coverage (Naeem et al.) if outliers matter'],
     rep:['precision and recall together, at the same N','a guidance sweep: the curve, not one point'],
     ev:'Section 4: strong guidance and the half set move precision and recall in opposite ways.'},
    {id:'t2i',name:'Does my text-to-image model follow prompts?',
     use:['question-based checks: GenEval (detector) for counts, colours, positions; TIFA or DSG questions; VQAScore with a strong VLM','CLIPScore only as a coarse signal'],
     set:['a fixed, versioned prompt suite covering composition, counting, text rendering, spatial relations','several seeds per prompt'],
     rep:['per-skill breakdown, not one average','which VLM or detector answered (it has its own errors)'],
     ev:'Section 6: CLIPScore against question-based checks on Stable Diffusion 1.5 with four guidance scales.'},
    {id:'human',name:'Will people prefer it (a product decision)?',
     use:['blind pairwise human comparison against the current model on your own prompts','reward models (HPS v2, PickScore, ImageReward) for cheap screening only'],
     set:['a few hundred pairs; Bradley-Terry with confidence intervals','never screen and report with the same reward model you trained against'],
     rep:['win rate with interval; ties; prompt categories'],
     ev:'Section 7 and Human preference and arenas (benchmarks topic).'},
    {id:'tok',name:'Is my autoencoder or image tokenizer good enough?',
     use:['reconstruction metrics on held-out images: PSNR, SSIM, LPIPS','rFID: FID of reconstructions against the originals (a distribution check on reconstructions)'],
     set:['same resolution and crop for every tokenizer; note LPIPS backbone and version'],
     rep:['codebook usage for discrete tokenizers','the generator\'s FID trained on top, since good reconstructions do not guarantee a learnable latent'],
     ev:'The sibling page Autoencoders and VAEs: latents and image tokenizers (its tokenizer comparator measured PSNR, SSIM and LPIPS on 16 test images).'},
    {id:'vlm',name:'How good is my vision-language model?',
     use:['benchmarks with answer keys chosen for the skill: MMMU (reasoning), OCRBench and DocVQA (reading), POPE (hallucination), MMStar (vision-indispensable)','CircularEval for multiple choice'],
     set:['a blind (text-only) baseline for every benchmark','yes-rate beside yes/no accuracy'],
     rep:['error bars over questions; the exact prompt and image resolution or token budget'],
     ev:'Section 8; Long-context and multimodal benchmarks; the sibling page Vision-language models (POPE-style probe).'},
    {id:'video',name:'Video or audio generation?',
     use:['video: VBench dimensions and human comparisons; FVD only with its content bias in mind','audio: FAD (VGGish or newer embeddings) plus listening tests'],
     set:['same frame rate, length and resize for both sets; for FAD, the same background set'],
     rep:['the feature model and its version (I3D, VideoMAE, VGGish, CLAP)'],
     ev:'Section 9; the sibling page Video and audio generation.'}];
  const st={q:0,n:'m'};
  $('ev-k-q').innerHTML=Q.map((q,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+q.name+'</button>').join('');
  const li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
  function draw(){const q=Q[st.q];const nn=['vlm','human','t2i','tok'].includes(q.id)?'For this question the sample count is set by prompts or questions, not by a distribution metric: use enough items for the error bar you need (see Eval statistics, evaluation topic).':N[st.n];
    $('ev-k-out').innerHTML='<div class="ev-rec"><div><h5>Compute</h5>'+li(q.use)+'</div><div><h5>Set up</h5>'+li(q.set)+'<p class="small">'+nn+'</p></div><div><h5>Report next to it</h5>'+li(q.rep)+'</div><div><h5>Evidence</h5><p>'+q.ev+'</p></div></div>'}
  RD.seg($('ev-k-q'),m=>{st.q=+m;draw()});RD.seg($('ev-k-n'),m=>{st.n=m;draw()});draw();
})();
