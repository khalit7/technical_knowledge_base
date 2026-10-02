// ---- Then and now: the 2020 input sequence changed one sourced step at a time ----
(function(){
const P='var(--c1)',C='var(--c4)',X='var(--c2)',R='var(--c5)',M='var(--dim)',TX='var(--c3)';
const S=[
 {t:'2020: ViT-B/16 (this paper)',c:'One class token and 196 patch tokens from a 224 px image, a learned 1D position table, supervised pre-training on JFT-300M or ImageNet-21k labels; the class token is read out (SEC31).',
  g:[{n:1,c:C,l:'class'},{n:196,c:P,l:'patches'}],pos:'learned 1D table, interpolated for new resolutions',sup:'labels (JFT-300M, ImageNet-21k)',ref:['ViT','https://arxiv.org/abs/2010.11929']},
 {t:'December 2020: a distillation token (DeiT)',c:'A second learned token is trained to match a teacher network\'s predictions; with a stronger training recipe a ViT-B reaches 83.1% on ImageNet with no external data, trained on one computer in under 3 days.',
  g:[{n:1,c:C,l:'class'},{n:1,c:X,l:'distillation'},{n:196,c:P,l:'patches'}],pos:'learned 1D table',sup:'ImageNet labels plus a teacher',ref:['DeiT','https://arxiv.org/abs/2012.12877']},
 {t:'2021: masked patches (BEiT, MAE)',c:'The masked prediction tried in §4.6, made to work: MAE masks 75% of the patches, the encoder sees only the visible quarter (49 of 196 here), and a light decoder reconstructs the pixels; a vanilla ViT-Huge reaches 87.8% using ImageNet-1K only.',
  g:[{n:1,c:C,l:'class'},{n:49,c:P,l:'visible patches'},{n:147,c:M,l:'masked, not encoded',ghost:1}],pos:'fixed or learned 1D table',sup:'none (reconstruct the image)',ref:['MAE','https://arxiv.org/abs/2111.06377']},
 {t:'2021 to 2023: trained against text (CLIP, SigLIP)',c:'The image tower is trained to match a text encoder\'s embedding of the caption, over hundreds of millions of image-text pairs (400 million for CLIP); SigLIP replaces the softmax with a pairwise sigmoid loss. Such towers are what LLaVA (CLIP ViT-L/14) and Qwen-VL (OpenCLIP ViT-bigG) attach to an LLM.',
  g:[{n:1,c:C,l:'class'},{n:196,c:P,l:'patches'}],text:1,pos:'learned 1D table',sup:'image-text pairs',ref:['CLIP','https://arxiv.org/abs/2103.00020']},
 {t:'2023: registers',c:'Extra learnable tokens that are never read out. Without them, supervised and self-supervised ViTs repurpose some low-information background patches as high-norm "scratch" tokens, which spoils feature and attention maps; registers take that role. (Four drawn here, as an illustration.)',
  g:[{n:1,c:C,l:'class'},{n:4,c:R,l:'registers'},{n:196,c:P,l:'patches'}],pos:'learned 1D table',sup:'any of the above',ref:['Registers','https://arxiv.org/abs/2309.16588']},
 {t:'2023: native resolution (NaViT)',c:'Images are no longer resized to one square: each keeps its resolution and aspect ratio, and the patches of several images are packed into one sequence (here a 224 × 160 and a 112 × 224 image). The resolution can then be chosen at inference to trade cost for accuracy.',
  g:[{n:140,c:P,l:'image 1: 14 × 10 patches'},{n:98,c:TX,l:'image 2: 7 × 14 patches'}],pos:'per image, from each patch\'s own row and column (see the NaViT paper)',sup:'labels or image-text pairs',ref:['NaViT','https://arxiv.org/abs/2307.06304']},
 {t:'2024: 2D rotary positions (Qwen2-VL)',c:'Qwen2-VL removes ViT\'s absolute position embeddings and uses 2D-RoPE, so an image of any resolution becomes a different number of tokens with no table to interpolate; its vision encoder has 675M parameters. The rotary idea is RoFormer\'s, extended to rows and columns.',
  g:[{n:220,c:P,l:'patches at native resolution (the count varies with the image; 220 drawn)'}],pos:'2D-RoPE (rotations by row and column)',sup:'image-text, then joint with the LLM',ref:['Qwen2-VL','https://arxiv.org/abs/2409.12191']},
 {t:'2022 onward: the same tokens for generation (DiT)',c:'DiT runs a ViT-style transformer on patches of a latent-diffusion latent instead of pixels, and gets better FID as Gflops grow (depth, width or more tokens); DiT-XL/2 reached FID 2.27 on class-conditional ImageNet 256 × 256. Its best variant injects the timestep and class through adaptive LayerNorm rather than as extra tokens. Stable Diffusion 3 builds on transformer backbones of this kind.',
  g:[{n:256,c:P,l:'latent patches (32 × 32 latent, patch 2)'}],pos:'fixed sine-cosine (frequency-based)',sup:'denoising',ref:['DiT','https://arxiv.org/abs/2212.09748']}];
function draw(m,k,e,w){const st=S[k],W=w,cell=Math.max(7,Math.min(12,(W-20)/40));let y=8,s='';const perRow=Math.floor((W-10)/(cell+2));
  st.g.forEach((g,gi)=>{const show=Math.min(g.n,perRow*(g.n>perRow*2?2:3)),rows=Math.ceil(show/perRow);
    s+=tx(0,y+11,g.l+' ('+fmt(g.n)+')',{fs:12,c:g.ghost?'var(--mute)':'var(--ink)'});y+=17;
    for(let i=0;i<show;i++){const r=Math.floor(i/perRow),c=i%perRow,op=Math.min(1,e*1.4-(i/show)*.4);s+=rc(c*(cell+2),y+r*(cell+2),cell,cell,g.c,{r:2,op:g.ghost?.35:Math.max(.15,op)})}
    if(show<g.n)s+=tx(W-4,y+rows*(cell+2)+11,'… '+fmt(g.n-show)+' more',{a:'end',fs:11,c:'var(--mute)'});
    y+=rows*(cell+2)+(show<g.n?16:8)});
  if(st.text){s+=rc(0,y+4,Math.min(W,300),34,'var(--soft)',{s:'var(--c3)'})+tx(10,y+25,'text tower: "a photo of a dog" → embedding',{fs:12});s+=tx(Math.min(W,300)+8,y+25,'match',{fs:12,c:'var(--c3)'});y+=44}
  return svgW(W,y+4,G(Math.min(1,.3+e),s),'token sequence')}
function counters(m,k){const st=S[k],n=st.g.filter(g=>!g.ghost).reduce((a,g)=>a+g.n,0);
  const sm=t=>'<span style="font-size:14px;font-weight:500;line-height:1.35;display:block">'+t+'</span>';return stat('Tokens the encoder sees',fmt(n),'')+stat('Positions',sm(st.pos),'')+stat('Supervision',sm(st.sup),'')+stat('Source',sm(A(st.ref[1],st.ref[0])),'')}
S.forEach(x=>{x.c=x.c.replace('SEC31','<a href="'+PAPER.meta.ax+'#S3.SS1" target="_blank" rel="noopener noreferrer">§3.1</a>')});
let an=null;onTab('t-then',()=>{if(!an)an=makeAnim({id:'tn',modes:{m:S.map(x=>({t:x.t,c:x.c}))},mode:'m',draw,counters,dur:3600});else an.draw()});
})();
