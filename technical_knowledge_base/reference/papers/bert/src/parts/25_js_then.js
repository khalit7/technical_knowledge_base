// ---- Then and now: BERT-Base to ModernBERT-base, one change at a time, recounted ----
(function(){
  const S0={V:30522,H:768,L:12,I:3072,glu:false,pos:512,seg:2,bias:true,nb:true,pre:false,local:false,ctx:512,mask:15,nsp:true,data:'3.3B words, ~40 epochs'};
  const ax='https://arxiv.org/html/',a=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const CH=[
    {t:'BERT-Base, 2018',c:'The paper\'s model: 12 post-LN layers of width 768, learned absolute positions and segment embeddings, a GELU feed-forward of 3,072, biases everywhere, every layer attending to all 512 positions; masked LM at 15% plus NSP.',d:{},hl:''},
    {t:'RoBERTa: no NSP, dynamic masks, more data, a bigger vocabulary',c:'Liu et al. 2019 found BERT "significantly undertrained": they drop NSP, draw a new mask each time a sequence is seen, train on 160GB with batches of 8K sequences, and use a 50K byte-level BPE vocabulary, which "adds approximately 15M" parameters. One segment row remains ('+a(ax+'1907.11692','RoBERTa')+', '+a('https://huggingface.co/FacebookAI/roberta-base/blob/main/config.json','config')+').',d:{nsp:false,V:50265,pos:514,seg:1,data:'160GB of text'},hl:'emb obj'},
    {t:'Mask 30%, not 15%',c:'ModernBERT masks 30% "as the original rate of 15 percent has since been shown to be sub-optimal" ('+a('https://arxiv.org/abs/2202.08005','Wettig et al. 2023')+'). No parameter changes; each sequence now gives twice the training signal.',d:{mask:30},hl:'obj'},
    {t:'Pre-LN, and norms without bias',c:'The norm moves before each sublayer, which "is known to help stabilize training" ('+a('https://arxiv.org/abs/2002.04745','Xiong et al. 2020')+'); a norm is kept after the embeddings, a final norm is added, and LayerNorm loses its bias.',d:{pre:true,nb:false},hl:'norm'},
    {t:'No biases in the linear layers',c:'ModernBERT disables "bias terms in all linear layers except for the final decoder linear layer", to "spend more of our parameter budget in linear layers".',d:{bias:false},hl:'att ffn'},
    {t:'RoPE replaces learned positions',c:'Rotary position embeddings rotate queries and keys inside every attention layer ('+a('https://arxiv.org/abs/2104.09864','Su et al. 2021')+', the RoFormer page in this knowledge base), with no position table and easy context extension; the segment embedding goes too.',d:{pos:0,seg:0},hl:'emb att'},
    {t:'GeGLU feed-forward',c:'The feed-forward becomes a gated GELU unit ('+a('https://arxiv.org/abs/2002.05202','Shazeer 2020')+'): <span class="m">(GELU(<i>xW</i>) ⊙ <i>xV</i>)<i>W</i><sub>2</sub></span>, with an inner size of 1,152 (a "GLU expansion of 2,304" for the two input matrices), so it is smaller than BERT\'s 3,072 at this width.',d:{glu:true,I:1152},hl:'ffn'},
    {t:'Alternating attention, 8,192 tokens, unpadding',c:'Global attention every third layer, a 128-token sliding window elsewhere ("identical downstream performance" in the ablation), a native 8,192-token context, and unpadding: no compute is spent on padding tokens.',d:{local:true,ctx:8192},hl:'att'},
    {t:'ModernBERT-base, 2024',c:'Deeper and narrower (22 layers, "Deep &amp; Narrow"), a 50,368-token vocabulary "a multiple of 64", and 2 trillion training tokens including code. The recount lands on the stated 149M, independently from the '+a('https://huggingface.co/answerdotai/ModernBERT-base/blob/main/config.json','configuration')+'.',d:{L:22,V:50368,data:'2T tokens incl. code'},hl:'emb blk'}];
  const states=[];let s=Object.assign({},S0);CH.forEach(c=>{s=Object.assign({},s,c.d);states.push(s)});
  function params(c){const nb=c.nb?2:1,H=c.H;const emb=c.V*H+c.pos*H+c.seg*H+H*nb;
    const layer=4*H*H+(c.bias?4*H:0)+(c.glu?H*2*c.I+c.I*H:2*H*c.I)+(c.bias?(c.glu?2*c.I:c.I)+H:0)+2*H*nb;
    return {emb,layer,total:emb+c.L*layer+(c.pre?H*nb:0)}}
  const keys=c=>{if(!c.local)return c.ctx;let g=0;for(let i=0;i<c.L;i++)if(i%3===0)g++;return (g*c.ctx+(c.L-g)*Math.min(128,c.ctx))/c.L};
  function draw(m,k,e,w){const c=states[k],hl=CH[k].hl.split(' '),W=Math.min(w,560),x0=(w-W)/2,H=300;let o='';
    const box=(x,y,bw,bh,t,sub,key)=>{const on=hl.includes(key)&&k>0;return rc(x,y,bw,bh,on?'var(--hl)':'var(--soft)',{s:on?'var(--c2)':'var(--line)',sw:on?2:1,r:6})+tx(x+bw/2,y+bh/2+(sub?-2:4),t,{fs:12,a:'middle',w:600})+(sub?tx(x+bw/2,y+bh/2+13,sub,{fs:11,a:'middle',c:'var(--mute)'}):'')};
    // embeddings
    const emb=['token '+fmt(c.V)];if(c.pos)emb.push('+ position '+c.pos);if(c.seg)emb.push('+ segment'+(c.seg>1?' A/B':''));
    o+=box(x0,H-46,W,38,'Embeddings',emb.join(' ')+' · norm'+(c.nb?'':' (no bias)'),'emb');
    // the block
    const by=56,bh=H-46-by-14;o+=rc(x0,by,W,bh,'none',{s:hl.includes('blk')&&k>0?'var(--c2)':'var(--mute)',da:'5 4',r:8,sw:hl.includes('blk')&&k>0?2:1});
    o+=tx(x0+8,by+16,'× '+c.L+' layers, width '+c.H,{fs:12,w:600,c:'var(--mute)'});
    const iw=W-24,ix=x0+12,rows=c.pre?[['Norm','','norm'],['Attention',attSub(c),'att'],['Norm','','norm'],['Feed-forward',ffnSub(c),'ffn']]:[['Attention',attSub(c),'att'],['Add & Norm','','norm'],['Feed-forward',ffnSub(c),'ffn'],['Add & Norm','','norm']];
    const rh=(bh-30)/rows.length;rows.forEach((r,i)=>{const y=by+24+i*rh;const small=r[0].indexOf('Norm')>=0;o+=box(ix+(small?iw*.18:0),y+2,small?iw*.64:iw,rh-6,r[0]+(small&&!c.nb?' (no bias)':''),r[1],r[2])});
    // head
    o+=box(x0,8,W,38,'Head','masked LM'+(c.nsp?' + NSP on [CLS]':'')+' · '+c.mask+'% masked','obj');
    // attention span glyph
    return svgW(w,H,o,'Encoder block at step '+(k+1))}
  const attSub=c=>(c.local?'global every 3rd layer, 128-token window otherwise':'every layer global')+(c.pos===0?' · RoPE':'')+(c.bias?' · biases':'');
  const ffnSub=c=>(c.glu?'GeGLU, inner '+fmt(c.I):'GELU, '+fmt(c.I))+(c.bias?' · biases':'');
  function counters(m,k){const c=states[k],p=params(c),p0=params(states[0]).total;
    return stat('Parameters (encoder)',fM(p.total),k?('from '+fM(p0)+(k===CH.length-1?'; stated 149M':'')):'110M with the pooler')+stat('Embeddings',fM(p.emb),(100*p.emb/p.total).toFixed(0)+'% of the total')+stat('Context',fmt(c.ctx)+' tokens',c.pos?'learned positions':'RoPE')+stat('Keys per query',fmt(Math.round(keys(c))),'at '+fmt(c.ctx)+' tokens, mean over layers')+stat('Training data',c.data,'')}
  const A=makeAnim({id:'thx',modes:{x:CH},mode:'x',draw,counters,dur:3200});
  onTab('t-then',()=>{if(A)A.draw()});
})();
