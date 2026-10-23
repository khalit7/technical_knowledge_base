// ---- Reading 1: same image, five connectors (step animation; one square = one token, same size in every design) ----
(function(){
  const V=VM,el=V.$('vm-conn');if(!el)return;
  const D=V.D,cat=(D.catThumb||'');
  const DES=[
    {k:'llava',name:'Projector (LLaVA-1.5)',grid:[[24]],patches:576,out:576,where:'seq',
     enc:'CLIP ViT-L/14 at 336 pixels: 24 &#215; 24 = 576 patch vectors of 1,024 numbers (second-to-last block, [CLS] dropped).',
     op:'A 2-layer MLP maps each patch vector to 4,096 numbers, one at a time: nothing is merged, 576 in, 576 out.',
     params:'about 21.0M (1,024 &#215; 4,096 + 4,096 &#215; 4,096 weights plus biases) <span class="der">derived</span>'},
    {k:'blip2',name:'Q-Former (BLIP-2)',grid:[[16]],patches:257,out:32,where:'seq',
     enc:'A frozen ViT at 224 pixels with 14-pixel patches: 16 &#215; 16 patches plus [CLS] = 257 vectors.',
     op:'32 learned queries (the same for every image) cross-attend to all 257 vectors through a BERT-sized transformer; a linear layer maps their 32 outputs to the language model&#8217;s width.',
     params:'188M (Q-Former) <span class="pub">paper</span>'},
    {k:'flam',name:'Resampler + cross-attention (Flamingo)',grid:[[12]],patches:null,out:64,where:'xattn',
     enc:'A frozen NFNet encoder gives a grid of feature vectors (drawn schematically; its size is not used here).',
     op:'A Perceiver Resampler: 64 learned latents attend to all the features and come out as a fixed 64 visual tokens, whatever the input size.',
     params:'not given on this page'},
    {k:'smol',name:'Pixel shuffle + tiles (SmolVLM)',grid:'tiles',patches:17408,out:1088,where:'seq',
     enc:'The 512 &#215; 512 photo is enlarged to 2,048 and cut into 4 &#215; 4 tiles of 512 plus a 512 global view: 17 views &#215; 32 &#215; 32 = 17,408 patch vectors of 768 numbers.',
     op:'Pixel shuffle lays each 4 &#215; 4 block of patch vectors side by side (12,288 numbers) and one linear layer maps it to 960: 1,024 patches become 64 tokens per view.',
     params:'11.8M (one 12,288 &#215; 960 matrix) <span class="meas">measured</span>'},
    {k:'qwen',name:'2 &#215; 2 merger, native resolution (Qwen3.5)',grid:[[32]],patches:1024,out:256,where:'seq3d',
     enc:'The 512 &#215; 512 photo is kept at its size (already a multiple of 32): 32 &#215; 32 = 1,024 patch vectors of 768 numbers.',
     op:'Each patch vector is layer-normalised, each 2 &#215; 2 block is concatenated (4 &#215; 768 = 3,072 numbers), and a 2-layer MLP (3,072 to 3,072 to 1,024) maps it to the language model&#8217;s width: 1,024 patches become 256 tokens.',
     params:'12.6M (counted from the checkpoint) <span class="meas">measured</span>'}];
  const STEPS=['The image','Encoder: patch vectors','The connector','Tokens out (to scale)','Where the language model reads them'];
  let cur=DES[0];const TEXT=20;
  V.seg(V.$('vm-conn-seg'),DES.map(d=>[d.k,d.name]),'llava',k=>{cur=DES.find(d=>d.k===k);A.reset(STEPS.length)});
  function cap(i){const d=cur;const t=[
      'One 512 &#215; 512 photo (the root&#8217;s test cat, CC0) goes into every design. What differs is how many vectors the encoder makes and how the connector turns them into tokens.',
      d.enc, d.op,
      d.out+' image tokens leave the connector'+(d.k==='flam'?', but none of them will enter the token sequence.':'. Each square below is one token of the language model&#8217;s width; the same square size is used for every design, so the five rows compare directly.'),
      d.where==='xattn'?'The text tokens form the sequence; the 64 visual tokens are read by new gated cross-attention layers inserted between frozen language-model layers, each scaled by tanh(&#945;) with &#945; starting at 0. Context cost: 0 tokens.':
      d.where==='seq3d'?'The 256 tokens replace the image placeholder in the sequence, with 3-D positions (time, row, column): the text after the image continues 16 positions later, not 256 (section 2).':
      'The tokens replace the image placeholder in the sequence and are attended to like words: '+V.comma(d.out)+' of the context, cached for the rest of the conversation.'];
    V.$('vm-conn-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+STEPS[i]+'</div><p>'+t[i]+'</p>';
    V.$('vm-conn-cnt').innerHTML=RD.stat('Patch vectors',d.patches?V.comma(d.patches):'grid','from the encoder')+RD.stat('Tokens out',i>=2?V.comma(d.out):'?','after the connector')+
      RD.stat('In the context',i>=4?(d.where==='xattn'?'0':V.comma(d.out)):'?','sequence positions used')+RD.stat('Connector',d.params,'trainable parameters')}
  function draw(i){const fig=V.$('vm-conn-fig'),W=Math.min(V.width(fig),760),sq=W<480?5:6,gap=1,per=Math.floor((W-8)/(sq+gap));
    const rowsOut=Math.ceil(cur.out/per);let H=i<3?230:i===3?Math.max(80,rowsOut*(sq+gap)+40):cur.where==='xattn'?200:Math.max(110,Math.ceil((cur.out+TEXT*2)/per)*(sq+gap)+70);
    const {g}=V.canvas(fig,W,H);const ink=V.css('--ink'),mute=V.css('--mute'),acc=V.css('--acc'),c2=V.css('--c2'),c4=V.css('--c4'),line=V.css('--line');
    V.img(cat,im=>{
      if(i<3){const S=Math.min(200,W*0.42),x0=8,y0=14;
        if(cur.k==='smol'&&i>0){const s=S/4;for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(im)g.drawImage(im,c*im.width/4,r*im.height/4,im.width/4,im.height/4,x0+c*s,y0+r*s,s-2,s-2);}
          const gx=x0+S+16,gs=S*0.5;if(im)g.drawImage(im,gx,y0,gs,gs);g.fillStyle=mute;g.fillText('global view',gx,y0+gs+10);
          g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=0.5;const n=i===2?8:32;
          for(let r=0;r<4;r++)for(let c=0;c<4;c++)gridLines(g,x0+c*s,y0+r*s,s-2,n);gridLines(g,gx,y0,gs,n);
          if(i===2){g.strokeStyle=acc;g.lineWidth=1.5;g.strokeRect(x0+(s-2)/8,y0,(s-2)/8,(s-2)/8)}
          g.fillStyle=ink;g.fillText(i===1?'17 views x 32 x 32 patches':'each 4 x 4 block of patches -> 1 token: 17 x 64',x0,y0+S+12);return}
        if(im)g.drawImage(im,x0,y0,S,S);
        if(i>0&&cur.grid!=='tiles'){const n=cur.grid[0][0];g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=0.5;gridLines(g,x0,y0,S,n);
          g.fillStyle=ink;g.fillText(cur.k==='flam'?'feature grid (schematic)':n+' x '+n+' patches'+(cur.k==='blip2'?' + [CLS]':''),x0,y0+S+12)}
        if(i===2){const bx=x0+S+24,bw=W-bx-8;
          if(cur.k==='llava'){g.fillStyle=mute;g.fillText('every patch -> MLP -> one token (576 -> 576)',bx,y0+10);for(let k=0;k<6;k++){g.fillStyle=c2;g.fillRect(bx+k*14,y0+30,10,10);g.fillStyle=mute;g.fillText('->',bx+k*14,y0+52);g.fillStyle=acc;g.fillRect(bx+k*14,y0+66,10,10)}}
          if(cur.k==='blip2'||cur.k==='flam'){const q=cur.out,cols=Math.min(16,Math.floor(bw/12));g.fillStyle=mute;g.fillText(q+' learned '+(cur.k==='blip2'?'queries':'latents')+' attend to all patches',bx,y0+10);
            for(let k=0;k<q;k++){const x=bx+(k%cols)*12,y=y0+30+Math.floor(k/cols)*12;g.fillStyle=acc;g.fillRect(x,y,10,10)}
            g.strokeStyle=acc;g.globalAlpha=.25;for(let k=0;k<8;k++){g.beginPath();g.moveTo(bx,y0+35);g.lineTo(x0+S*(k+.5)/8,y0+S*((k*3)%8+.5)/8);g.stroke()}g.globalAlpha=1}
          if(cur.k==='qwen'){g.fillStyle=mute;g.fillText('each 2 x 2 block of patches -> 1 token: 32 x 32 -> 16 x 16',bx,y0+10);g.strokeStyle=acc;g.lineWidth=1.5;g.strokeRect(x0,y0,S/16,S/16);g.lineWidth=1}}
        return}
      // tokens to scale
      const y0=i===3?22:46;let x=4,y=y0;g.fillStyle=ink;
      if(i===3){g.fillText(V.comma(cur.out)+' tokens, one square each',4,10);for(let k=0;k<cur.out;k++){g.fillStyle=acc;g.fillRect(4+(k%per)*(sq+gap),y0+Math.floor(k/per)*(sq+gap),sq,sq)}return}
      if(cur.where==='xattn'){g.fillText('token sequence: text only',4,10);for(let k=0;k<TEXT*2;k++){g.fillStyle=c4;g.fillRect(4+k*(sq+gap),22,sq,sq)}
        const lx=4,ly=60,lw=Math.min(W-120,420);for(let L=0;L<6;L++){const yy=ly+L*20;g.fillStyle=L%2?V.css('--soft'):V.css('--soft');g.strokeStyle=line;g.strokeRect(lx,yy,lw,14);g.fillStyle=mute;
          g.fillText(L%2?'gated cross-attention (new, tanh(a), a = 0 at start)':'frozen language-model layer',lx+6,yy+7)}
        const vx=lx+lw+12;for(let k=0;k<64;k++){g.fillStyle=acc;g.fillRect(vx+(k%8)*(sq+gap),ly+Math.floor(k/8)*(sq+gap),sq,sq)}g.fillStyle=mute;g.fillText('64 visual tokens',vx,ly+8*(sq+gap)+10);return}
      g.fillText('token sequence: text, then image tokens'+(cur.where==='seq3d'?' (3-D positions)':'')+', then the question',4,10);
      let k=0;const put=(col)=>{g.fillStyle=col;g.fillRect(4+(k%per)*(sq+gap),22+Math.floor(k/per)*(sq+gap),sq,sq);k++};
      for(let t=0;t<TEXT/2;t++)put(c4);for(let t=0;t<cur.out;t++)put(acc);for(let t=0;t<TEXT*1.5;t++)put(c4);
      g.fillStyle=mute;g.fillText('text',4,22+Math.ceil(k/per)*(sq+gap)+10);g.fillStyle=acc;g.fillText('image',44,22+Math.ceil(k/per)*(sq+gap)+10)})}
  function gridLines(g,x,y,s,n){g.beginPath();for(let k=1;k<n;k++){g.moveTo(x+s*k/n,y);g.lineTo(x+s*k/n,y+s);g.moveTo(x,y+s*k/n);g.lineTo(x+s,y+s*k/n)}g.stroke()}
  const A=RD.anim({card:'vm-conn',ctl:'vm-conn-ctl',n:STEPS.length,ms:2600,label:'Connector step',draw:i=>{cap(i);draw(i)}});
  RD.onResize(()=>A.redraw());
})();
