// ---- Objective drill (t-obj): the same 40 tokens under six objectives; per-256 table ----
(function(){
  if(!window.FOD||!document.getElementById('ob-card'))return;
  const O=FOD.obj,esc=FO.esc,n=O.n,P=O.pieces.map(s=>s.replace(/\n/g,'↵'));
  const sp=(txt,c)=>'<span class="'+(c||'')+'">'+esc(txt)+'</span>';
  const isMlm=i=>O.mlm.find(m=>m.pos===i);
  function build(m){
    let inp='',out='',cap='',cnt=[];
    if(m==='clm'){inp=P.slice(0,n-1).map(p=>sp(p)).join('');out=P.slice(1).map(p=>sp(p,'t')).join('');
      cap='Input tokens 0 to '+(n-2)+'; target at each position is the next token. '+(n-1)+' loss terms from '+n+' tokens, each seeing only its left.';cnt=[n-1,'left only']}
    else if(m==='mlm'){inp=P.map((p,i)=>{const x=isMlm(i);if(!x)return sp(p);const j=O.mlm.indexOf(x);
        return x.kind==='mask'?sp('[MASK]','m'):x.kind==='random'?sp(O.mlm_rand[j],'x'):sp(p,'p')}).join('');
      out=O.mlm.map(x=>sp(P[x.pos],'t')).join('');
      const k=O.mlm.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{});
      cap='15% of '+n+' = '+O.mlm.length+' positions chosen; in this draw '+(k.mask||0)+' became [MASK], '+(k.random||0)+' a random token (struck through), '+(k.keep||0)+' stayed unchanged (green). All '+O.mlm.length+' are scored, from both sides.';cnt=[O.mlm.length,'both sides']}
    else if(m==='t5'){let i=0,s=0,tg='';while(i<n){const span=O.spans.find(z=>z[0]===i);
        if(span){inp+=sp('<X'+s+'>','s');tg+=sp('<X'+s+'>','s')+P.slice(span[0],span[1]).map(p=>sp(p,'t')).join('');s++;i=span[1]}else{inp+=sp(P[i]);i++}}
      inp+=sp('</s>','s');out=tg+sp('<X'+s+'>','s')+sp('</s>','s');
      const nn=O.spans.reduce((a,z)=>a+z[1]-z[0],0);
      cap='T5 arithmetic for '+n+' tokens: round(0.15 x '+n+') = '+nn+' corrupted tokens in '+O.spans.length+' spans; input '+(n-nn+O.spans.length+1)+' tokens, target '+(nn+O.spans.length+1)+' (sentinel <X'+O.spans.length+'> closes the target; <X0> stands for <extra_id_0>). Encoder reads the input both ways, decoder writes the target.';cnt=[nn+O.spans.length+1,'encoder: both; decoder: left']}
    else if(m==='prefix'){const pr=O.prefix;inp=P.slice(0,n-1).map((p,i)=>sp(p,i<pr?'p':'')).join('');out=P.slice(1).map((p,i)=>i+1>=pr?sp(p,'t'):sp(p,'g')).join('');
      cap='The first '+pr+' tokens are the prefix, read bidirectionally and not scored (dashed); the '+(n-pr)+' continuation targets are scored causally.';cnt=[n-pr,'prefix both ways, then left']}
    else if(m==='mtp'){inp=P.slice(0,n-1).map(p=>sp(p)).join('');out=P.slice(1).map((p,i)=>sp(p,'t')+(i+2<n?sp(P[i+2],'new'):'')).join('');
      cap='Each position i is scored twice: the main head on token i+1 (blue) and the MTP module on token i+2 (yellow), the module also given the real token i+1. '+(n-1)+' + '+(n-2)+' = '+(2*n-3)+' loss terms.';cnt=[2*n-3,'left (+ token i+1 for the module)']}
    else{const dm=new Set(O.diff_mask);inp=P.map((p,i)=>dm.has(i)?sp('[MASK]','m'):sp(p)).join('');out=O.diff_mask.map(i=>sp(P[i],'t')).join('');
      cap='One rate t = '+O.diff_t+' for the whole sequence: '+O.diff_mask.length+' of '+n+' tokens masked in this draw, each scored and weighted by 1/t = '+(1/O.diff_t)+'. Next sequence, a new t: from nearly clean to nearly all masked.';cnt=[O.diff_mask.length,'both sides (unmasked ones)']}
    document.getElementById('ob-in').innerHTML=inp;document.getElementById('ob-out').innerHTML=out;
    document.getElementById('ob-cap').innerHTML='<p>'+cap+'</p>';
    document.getElementById('ob-cnt').innerHTML=RD.stat('loss terms here',cnt[0],'from '+n+' tokens')+RD.stat('a scored token sees',cnt[1],'');
  }
  RD.seg(document.getElementById('ob-seg'),build);build('clm');
  const t5=FOD.obj.t5_256;
  const rows=[['causal LM',256,255,'left context','yes, one token per forward'],['masked LM (BERT)',256,Math.round(0.15*256),'both sides','no'],
    ['span corruption (T5)',t5.input,t5.targets,'encoder: whole corrupted input','yes (decoder)'],['prefix LM (prefix 128)',256,128,'prefix both ways, then left','yes'],
    ['CLM + one MTP depth',256,255+254,'left (+ next token)','yes, 1 to 2 tokens per forward'],['masked diffusion (t = 0.5 on average)',256,128,'both sides, partly masked','yes, many tokens per forward']];
  document.querySelector('#ob-tab tbody').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td></tr>').join('');
})();
