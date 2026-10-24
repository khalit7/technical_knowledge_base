// ---- Reading section 6, the fusion explorer: sequences and attention masks of each design on one toy request ----
(function(){
  if(!document.getElementById('fx-pick'))return;
  const E=RD.esc;
  // toy sequence: 0,1 text | 2..5 input image | 6,7 text | 8..11 output image
  const LAB=['draw','this','i1','i2','i3','i4','in','red','o1','o2','o3','o4'];
  const KIND=i=>i<2||i===6||i===7?'t':i<6?'i':'o';
  const img=(i,a,b)=>i>=a&&i<=b;
  const causal=(r,c)=>c<=r;
  const D=[
    {id:'pipe',n:'Pipeline',ex:'old ChatGPT Voice Mode, NExT-GPT, an LLM calling an image API',has:i=>KIND(i)==='t',mask:causal,loss:i=>'T',
      inn:'not in the language model: a separate model turns it into text (or a few projected vectors)',out:'a separate generator (diffusion) from a text prompt',calls:'the generator\'s steps (25 in the topic\'s SD 1.5 default)',
      note:'The language model never sees pixels and never writes them; what crosses between models is text or a narrow vector.'},
    {id:'xattn',n:'Late fusion: cross-attention',ex:'Flamingo, IDEFICS, Llama 3.2 Vision',has:i=>KIND(i)==='t',x:(r,c)=>KIND(c)==='i'&&(r===6||r===7),mask:causal,loss:i=>'T',
      inn:'features from a frozen or separately trained encoder, read through extra cross-attention layers',out:'text only',calls:'none',
      note:'Image features are not positions in the sequence; text after the image reads them through gated cross-attention layers inserted into the frozen language model (Flamingo\'s gate is "initialized to 0"; see the Vision-language models page).'},
    {id:'proj',n:'Late fusion: encoder + projector',ex:'LLaVA, SmolVLM, most open VLMs',has:i=>KIND(i)!=='o',mask:causal,loss:i=>KIND(i)==='t'&&i>5?'T':'',
      inn:'soft tokens: encoder vectors through a projector (1,088 per image in SmolVLM-500M)',out:'text only',calls:'none',
      note:'Image vectors are positions in the sequence but are never predicted: the loss is on the answer text only.'},
    {id:'early',n:'Early fusion: discrete tokens',ex:'Chameleon, Emu3, AnyGPT',has:()=>true,mask:causal,loss:i=>KIND(i)==='t'?'T':'C',
      inn:'codes from an image tokenizer in the shared vocabulary (1,024 per 512 px image in Chameleon)',out:'the same kind of codes, one per call, then the tokenizer\'s decoder',calls:'one per token: 1,024 (Chameleon), 4,096 (Emu3)',
      note:'One causal mask and one softmax for everything. Simple, and the hardest to train stably (QK-Norm and z-loss in Chameleon).'},
    {id:'janus',n:'Two encodings, one transformer',ex:'Janus, Janus-Pro',has:()=>true,mask:causal,loss:i=>KIND(i)==='t'?'T':KIND(i)==='o'?'C':'',
      inn:'SigLIP features (semantic, continuous)',out:'VQ codes (16,384 codes, 576 per 384 px image), one per call',calls:'576',
      note:'Reading and writing use different image representations; one VQ tokenizer for both scored POPE 60.1 against 87.0 in Janus\'s ablation.'},
    {id:'transf',n:'Two objectives: AR text + diffusion image',ex:'Transfusion',has:()=>true,mask:(r,c)=>c<=r||(img(r,2,5)&&img(c,2,5))||(img(r,8,11)&&img(c,8,11)),loss:i=>KIND(i)==='t'?'T':KIND(i)==='o'?'D':'',
      inn:'continuous VAE latent patches (256 per 256 px image)',out:'the same patches, denoised together over many steps',calls:'the diffusion steps (250 in the paper\'s evaluation)',
      note:'Causal across the sequence, bidirectional inside each image; loss = next-token on text + 5 x diffusion on images.'},
    {id:'showo',n:'Two objectives: AR text + masked image codes',ex:'Show-o',has:()=>true,mask:(r,c)=>c<=r||(img(r,2,5)&&img(c,2,5))||(img(r,8,11)&&img(c,8,11)),loss:i=>KIND(i)==='t'?'T':KIND(i)==='o'?'M':'',
      inn:'discrete codes (MAGVIT-v2, 8,192; 256 per 256 px image)',out:'codes filled in parallel over a few masked rounds',calls:'a few to tens of rounds',
      note:'"Omni-attention": causal for text, full attention among image tokens; images trained by predicting masked codes.'},
    {id:'bagel',n:'Mixture of transformer experts',ex:'BAGEL (and the Mixture-of-Transformers recipe)',has:()=>true,mask:(r,c)=>c<=r||(img(r,2,5)&&img(c,2,5))||(img(r,8,11)&&img(c,8,11)),loss:i=>KIND(i)==='t'?'T':KIND(i)==='o'?'D':'',
      inn:'SigLIP 2 features (understanding expert)',out:'FLUX VAE latents by rectified flow (generation expert)',calls:'the flow steps',
      note:'Same mask shape as Transfusion, but each token kind runs through its own expert weights; attention is shared over all tokens.'},
    {id:'encfree',n:'Encoder-free',ex:'Fuyu-8B, Gemma 4 12B Unified',has:i=>KIND(i)!=='o',mask:(r,c)=>c<=r||(img(r,2,5)&&img(c,2,5)),loss:i=>KIND(i)==='t'&&i>5?'T':'',
      inn:'raw patches through one linear layer (48 x 48 x 3 patches, a 35M-parameter matmul, 280 tokens by default in Gemma 4 12B Unified)',out:'text only',calls:'none',
      note:'No vision encoder at all. Mask shown as Gemma 4 12B Unified\'s config (bidirectional among vision tokens); Fuyu treats image patches as ordinary causal positions.'},
    {id:'speech',n:'Any-to-any speech',ex:'Moshi, Qwen3-Omni, GPT-4o voice',speech:true,
      inn:'audio codec tokens or audio-encoder features at 12.5 frames a second (Moshi, Qwen3-Omni)',out:'codec tokens: one big step per 80 ms frame, the frame\'s codebooks by a small model',calls:'12.5 big steps per second of speech',
      note:'Not one flat sequence: Moshi runs parallel streams (its own audio, the user\'s audio, text) and predicts all of them at every 80 ms step. Section 9 draws it; the Token economics tab has the arithmetic.'}];
  const COLS={t:'var(--c5)',i:'var(--c1)',o:'var(--c3)'};
  function maskSVG(d,w){
    if(d.speech)return '<p class="small mute">No single-sequence mask: three parallel streams per frame (see the note).</p>';
    const n=12,lw=38,cell=Math.max(14,Math.min(24,Math.floor((w-lw-30)/(n+1))));
    let s='';const x0=lw,y0=40;
    // column labels turned so 11 px text never collides at phone width
    for(let c=0;c<n;c++){const cx=x0+c*cell+cell/2+3,cy=y0-5;s+='<text x="'+cx+'" y="'+cy+'" font-size="11" transform="rotate(-60 '+cx+' '+cy+')" fill="'+(d.has(c)?COLS[KIND(c)]:'var(--mute)')+'">'+LAB[c]+'</text>'}
    for(let r=0;r<n;r++){
      s+=RD.t(x0-4,y0+r*cell+cell*0.7,LAB[r],{a:'end',fs:11,fill:d.has(r)?COLS[KIND(r)]:'var(--mute)'});
      for(let c=0;c<n;c++){let f='var(--soft)',op=1;
        if(d.has(r)&&d.has(c)&&d.mask(r,c)){f=COLS[KIND(c)];op=.75}
        else if(d.x&&d.has(r)&&d.x(r,c)){f='var(--c4)';op=.75}
        s+='<rect x="'+(x0+c*cell+.5)+'" y="'+(y0+r*cell+.5)+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="'+f+'" fill-opacity="'+op+'"></rect>'}
      const L=d.has(r)?d.loss(r):'';s+=RD.t(x0+n*cell+8,y0+r*cell+cell*0.7,L||'',{fs:11,w:600});
      if(!d.has(r))s+=RD.t(x0+n*cell/2,y0+r*cell+cell*0.7,'',{});
    }
    const W=x0+n*cell+22,H=y0+n*cell+4;
    return '<div class="fx-mask">'+RD.svg(W,H,s,'attention mask of '+d.n)+'</div>';
  }
  function panel(el,d){
    const w=RD.width(el)-24;
    const absent=[...Array(12).keys()].filter(i=>!d.speech&&!d.has(i)).map(i=>LAB[i]);
    el.innerHTML='<h4>'+E(d.n)+'</h4><p class="small mute">'+E(d.ex)+'</p>'+maskSVG(d,w)+
      (absent.length?'<p class="small mute">Not positions of this model\'s sequence: '+absent.join(', ')+'.</p>':'')+
      '<dl class="kv"><dt>Image in</dt><dd>'+E(d.inn)+'</dd><dt>Image out</dt><dd>'+E(d.out)+'</dd><dt>Calls to write one image</dt><dd>'+E(d.calls)+'</dd></dl><p class="small">'+E(d.note)+'</p>';
  }
  let A='proj',B='early',next='a';
  function draw(){
    const pk=document.getElementById('fx-pick');
    pk.innerHTML=D.map(d=>'<button data-id="'+d.id+'" class="'+(d.id===A?'on':d.id===B&&cmp()?'on2':'')+'">'+E(d.n)+'</button>').join('');
    panel(document.getElementById('fx-a'),D.find(d=>d.id===A));
    const b=document.getElementById('fx-b');b.hidden=!cmp();if(cmp())panel(b,D.find(d=>d.id===B));
  }
  const cmp=()=>document.getElementById('fx-cmp').checked;
  function init(){
    if(init.done){draw();return}init.done=1;
    document.getElementById('fx-pick').addEventListener('click',e=>{const bt=e.target.closest('button');if(!bt)return;
      if(!cmp()||next==='a'){A=bt.dataset.id;next='b'}else{B=bt.dataset.id;next='a'}draw()});
    document.getElementById('fx-cmp').addEventListener('change',draw);
    RD.onResize(draw);
    draw();
  }
  RD.onRender(init);init();
  window.NMFX=D;
})();
