// ---- Reading section 1: one request through a pipeline and through an early-fusion model (before/after) ----
(function(){
  const card=document.getElementById('nm-fa-card');if(!card)return;
  const E=RD.esc;
  const chip=(t,c,hl)=>'<span class="'+c+(hl?' hl':'')+'">'+E(t)+'</span>';
  const PROMPT=['a','red','knit','pullover'];
  // each step: caption title, text, sequence builder, counters {seq, calls, saw}
  const S={
    pipe:[
      {t:'Start: a photo and an instruction',p:'The user sends a 512 x 512 photo of a pullover and the words "draw it in red".',seq:()=>chip('photo','s')+chip('draw','t s')+chip('it','t s')+chip('in','t s')+chip('red','t s'),c:[0,0,'nothing yet']},
      {t:'The VLM\'s vision encoder reads the photo',p:'A separately trained encoder (SigLIP in SmolVLM) turns the photo into continuous vectors, and a projector maps them to the language model\'s width: 1,088 soft tokens for one image in SmolVLM-500M. They are inputs only: there is no vocabulary entry the model could ever output for them.',seq:()=>['v1','v2','v3','v4'].map((x,i)=>chip(x,'i',1)).join('')+chip('draw','t')+chip('it','t')+chip('in','t')+chip('red','t'),c:[1092,1,'nothing yet']},
      {t:'One prefill pass over the whole prompt',p:'The language model reads image tokens and text tokens in one forward pass with a causal mask. This is the cheap part: one call however long the prompt is (it costs compute, not sequential steps).',seq:()=>['v1','v2','v3','v4'].map(x=>chip(x,'i')).join('')+['draw','it','in','red'].map(x=>chip(x,'t',1)).join(''),c:[1092,1,'nothing yet']},
      {t:'The VLM writes a prompt for the generator, one token per call',p:'It cannot write pixels, so it writes text: an illustrative "a red knit pullover". Each word piece is one sequential call.',seq:()=>['v1','v2','v3','v4'].map(x=>chip(x,'i')).join('')+['draw','it','in','red'].map(x=>chip(x,'t')).join('')+PROMPT.map(x=>chip(x,'o',1)).join(''),c:[1096,5,'nothing yet']},
      {t:'The prompt crosses to a separate model',p:'Stable Diffusion 1.5\'s CLIP text encoder reads only the sentence. The photo itself does not cross: the generator receives about a dozen tokens of text.',seq:()=>PROMPT.map(x=>chip(x,'o')).join('')+chip('CLIP text encoder','s',1),c:[1096,6,'one sentence']},
      {t:'25 denoising steps',p:'The generator starts from noise and runs 25 DPM-Solver steps; guidance needs a conditional and an unconditional pass, batched together, so 25 sequential calls of a 860M U-Net over a 64 x 64 x 4 latent.',seq:()=>chip('noise','s')+chip('25 denoising steps','s',1)+chip('VAE decoder','s'),c:[1096,31,'one sentence']},
      {t:'Result: a red pullover, but not yours',p:'The VAE decodes the latent to pixels. The output is a plausible red pullover; any detail of the original that the sentence left out is lost. Total: 32 sequential calls, counting the prefill, the text encoder and the VAE decoder.',seq:()=>chip('new image','o',1),c:[1096,32,'one sentence']}],
    early:[
      {t:'Start: the same photo and instruction',p:'Same request. This model has one vocabulary of 65,536 entries, 8,192 of which are image codes (Chameleon).',seq:()=>chip('photo','s')+chip('draw','t s')+chip('it','t s')+chip('in','t s')+chip('red','t s'),c:[0,0,'nothing yet']},
      {t:'The image tokenizer turns the photo into codes',p:'A VQ tokenizer maps 512 x 512 pixels to a 32 x 32 grid of integers: 1,024 discrete tokens. These are ordinary vocabulary entries, the same kind of thing the model can output.',seq:()=>['c812','c77','c4033','c19'].map(x=>chip(x,'i',1)).join('')+chip('draw','t')+chip('it','t')+chip('in','t')+chip('red','t'),c:[1028,1,'nothing yet']},
      {t:'One prefill pass over codes and words',p:'One transformer, one causal mask, one softmax over the shared vocabulary. Every later position can attend to every image code.',seq:()=>['c812','c77','c4033','c19'].map(x=>chip(x,'i')).join('')+['draw','it','in','red'].map(x=>chip(x,'t',1)).join(''),c:[1028,1,'all 1,024 codes']},
      {t:'Begin the output image: a start-of-image token, then code 1',p:'The model predicts a start-of-image marker, then the first image code, sampled from the softmax restricted to image codes. One call per code.',seq:()=>['c812','c77','c4033','c19'].map(x=>chip(x,'i')).join('')+['draw','it','in','red'].map(x=>chip(x,'t')).join('')+chip('<img>','o')+chip('c812*','o',1),c:[1030,3,'all 1,024 codes']},
      {t:'Codes 2 to 1,024, each one call',p:'Raster order, left to right, top to bottom. Each new code can copy or change the corresponding input code: a red version of the same shape. 1,024 sequential calls, each cheap thanks to the KV cache.',seq:()=>['c812','c77','c4033','c19'].map(x=>chip(x,'i')).join('')+['draw','it','in','red'].map(x=>chip(x,'t')).join('')+chip('<img>','o')+['c812*','c71*','c4031*','c19*'].map(x=>chip(x,'o',1)).join(''),c:[2053,1026,'all 1,024 codes']},
      {t:'Result: your pullover, in red, capped by the tokenizer',p:'The tokenizer\'s decoder turns 1,024 codes back into pixels. The output can keep the input\'s exact shape, but its sharpness is capped by what 1,024 codes from 8,192 can reconstruct ("a core weakness of our tokenizer is in reconstructing images with a large amount of text", Chameleon).',seq:()=>chip('edited image','o',1),c:[2053,1027,'all 1,024 codes']}]};
  let mode='pipe';
  const seq=document.getElementById('nm-fa-seq'),cnt=document.getElementById('nm-fa-cnt'),cap=document.getElementById('nm-fa-cap');
  function draw(i){const st=S[mode][Math.min(i,S[mode].length-1)];
    seq.innerHTML=st.seq();
    cnt.innerHTML=RD.stat('Positions in the language model',st.c[0].toLocaleString('en-US'),'')+RD.stat('Sequential network calls so far',st.c[1].toLocaleString('en-US'),'')+RD.stat('What the image generator saw of the photo',st.c[2],'');
    cap.innerHTML='<div class="t">'+(i+1)+'. '+E(st.t)+'</div><p>'+E(st.p)+'</p>'}
  const A=RD.anim({card:'nm-fa-card',ctl:'nm-fa-ctl',n:S.pipe.length,draw,ms:2600,label:'Step'});
  RD.seg(document.getElementById('nm-fa-mode'),m=>{mode=m;A.reset(S[m].length);A.play()});
})();
