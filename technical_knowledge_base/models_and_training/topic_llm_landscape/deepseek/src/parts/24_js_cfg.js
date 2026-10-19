// ---- Lineage: config diff explorer ----
(function(){
  const HF='https://huggingface.co/';
  // values from each model's config.json (and model card for parameter counts)
  const M={
    v2:{n:'DeepSeek V2',src:HF+'deepseek-ai/DeepSeek-V2/blob/main/config.json',tot:'236B',act:'21B',l:60,d:5120,at:'MLA',h:128,kv:'latent 512',q:1536,r:64,e:160,k:6,s:2,w:1536,dp:'1 dense',v:102400,kvb:(512+64)*60*2,kvh:'(512 + 64) × 60 × 2',fl:L=>60*128*L*2*1088},
    v3:{n:'DeepSeek V3',src:HF+'deepseek-ai/DeepSeek-V3/blob/main/config.json',tot:'671B',act:'37B',l:61,d:7168,at:'MLA',h:128,kv:'latent 512',q:1536,r:64,e:256,k:8,s:1,w:2048,dp:'3 dense',v:129280,kvb:70272,kvh:'(512 + 64) × 61 × 2',fl:L=>61*128*L*2*1088},
    v32:{n:'DeepSeek V3.2',src:HF+'deepseek-ai/DeepSeek-V3.2/blob/main/config.json',tot:'671B',act:'37B',l:61,d:7168,at:'MLA + DSA (indexer 64 × 128, top-2,048)',h:128,kv:'latent 512',q:1536,r:64,e:256,k:8,s:1,w:2048,dp:'3 dense',v:129280,kvb:70272,kvh:'(512 + 64) × 61 × 2 (BF16 formula)',fl:L=>61*128*Math.min(L,2048)*2*1088+61*64*128*L*2},
    v4f:{n:'DeepSeek V4-Flash',src:HF+'deepseek-ai/DeepSeek-V4-Flash/blob/main/config.json',tot:'284B',act:'13B',l:43,d:4096,at:'2 window, 21 CSA, 20 HCA',h:64,kv:'entry 512, shared K = V',q:1024,r:64,e:256,k:6,s:1,w:2048,dp:'3 hash-routed MoE',v:129280,kvb:3514,kvh:'reported in DeepSeek\'s chart',fl:L=>2*64*128*2048+21*64*(Math.min(L/4,512)+128)*2048+20*64*(L/128+128)*2048+21*64*128*L/4*2},
    v4p:{n:'DeepSeek V4-Pro',src:HF+'deepseek-ai/DeepSeek-V4-Pro/blob/main/config.json',tot:'1.6T',act:'49B',l:61,d:7168,at:'30 CSA, 31 HCA',h:128,kv:'entry 512, shared K = V',q:1536,r:64,e:384,k:6,s:1,w:3072,dp:'3 hash-routed MoE',v:129280,kvb:4939.5,kvh:'estimate (Reading tab)',fl:L=>30*128*(Math.min(L/4,1024)+128)*2048+31*128*(L/128+128)*2048+30*64*128*L/4*2},
    v41:{n:'DeepSeek V4.1-Flash',src:HF+'deepseek-ai/DeepSeek-V4.1-Flash/blob/main/config.json',tot:'552B',act:'8B prefill, 16B decode',l:40,d:5120,at:'encoder-decoder, CSA2 full / reindex / reuse',h:64,kv:'entry 512, shared K = V',q:1280,r:64,e:384,k:6,s:1,w:2304,dp:'not in config',v:129280,kvb:890,kvh:'reported',fl:null},
    kimi:{n:'Kimi K2',src:HF+'moonshotai/Kimi-K2-Instruct/blob/main/config.json',tot:'1T',act:'32B',l:61,d:7168,at:'MLA',h:64,kv:'latent 512',q:1536,r:64,e:384,k:8,s:1,w:2048,dp:'1 dense',v:163840,kvb:70272,kvh:'(512 + 64) × 61 × 2',fl:L=>61*64*L*2*1088},
    ml3:{n:'Mistral Large 3',src:HF+'mistralai/Mistral-Large-3-675B-Instruct-2512-BF16/blob/main/params.json',tot:'675B',act:'41B',l:61,d:7168,at:'MLA',h:128,kv:'latent 512',q:1536,r:64,e:128,k:4,s:1,w:4096,dp:'3 dense',v:131072,kvb:70272,kvh:'(512 + 64) × 61 × 2',fl:L=>61*128*L*2*1088},
    glm:{n:'GLM-4.5',src:HF+'zai-org/GLM-4.5/blob/main/config.json',tot:'355B',act:'32B',l:92,d:5120,at:'GQA',h:96,kv:'8 KV heads × 128',q:'none',r:'64 (half of 128)',e:160,k:8,s:1,w:1536,dp:'3 dense',v:151552,kvb:2*8*128*92*2,kvh:'2 × 8 × 128 × 92 × 2',fl:L=>92*96*L*2*256}};
  const F=[['Parameters, total','tot'],['Parameters, active','act'],['Layers','l'],['Hidden size','d'],['Attention','at'],['Query heads','h'],['What is cached','kv'],['Query latent','q'],['RoPE dimensions','r'],['Routed experts','e'],['Active routed experts','k'],['Shared experts','s'],['Expert width','w'],['First layers','dp'],['Vocabulary','v']];
  const lc=n=>{let s=0;for(let i=2;i<=n;i++)s+=Math.log10(i);return s};
  const comb=(n,k)=>10**(lc(n)-lc(k)-lc(n-k));
  const ks=Object.keys(M);
  ['cfA','cfB'].forEach((id,j)=>{$(id).innerHTML=ks.map(k=>'<option value="'+k+'"'+(k===(j?'kimi':'v3')?' selected':'')+'>'+M[k].n+'</option>').join('');$(id).addEventListener('change',draw)});
  function draw(){
    const a=M[$('cfA').value],b=M[$('cfB').value],v=x=>typeof x==='number'?fmt(x):x;
    let h='<tr><th></th><th>'+A(a.src,a.n)+'</th><th>'+A(b.src,b.n)+'</th></tr>';
    F.forEach(([n,k])=>{const d=String(a[k])!==String(b[k]);h+='<tr'+(d?' style="background:var(--hl)"':'')+'><td class="mute">'+n+'</td><td>'+v(a[k])+'</td><td>'+v(b[k])+'</td></tr>'});
    const L=131072,fa=a.fl?a.fl(L):null,fb=b.fl?b.fl(L):null;
    h+='<tr><th colspan="3" style="padding-top:12px">Computed from those values</th></tr>';
    h+='<tr><td class="mute">KV cache per token</td><td><b>'+fmt(a.kvb,a.kvb%1?1:0)+' B</b><div class="small mute">'+a.kvh+'</div></td><td><b>'+fmt(b.kvb,b.kvb%1?1:0)+' B</b><div class="small mute">'+b.kvh+'</div></td></tr>';
    h+='<tr><td class="mute">Possible expert sets per token per layer, C(routed, active)</td><td>'+sci(comb(a.e,a.k),1)+'</td><td>'+sci(comb(b.e,b.k),1)+'</td></tr>';
    h+='<tr><td class="mute">Attention FLOPs per decoded token at 128K (indexer included)</td><td>'+(fa?flp(fa):'not computed')+'</td><td>'+(fb?flp(fb):'not computed')+'</td></tr>';
    $('cfTab').innerHTML=h;
    $('cfNote').innerHTML='Highlighted rows differ. Cache: BF16 for MLA and GQA by the Cache tab\'s formulas; V4-Flash as reported in DeepSeek\'s generation chart (<a href="https://api-docs.deepseek.com/news/news260910/" target="_blank" rel="noopener noreferrer">V4.1-Flash announcement</a>), V4-Pro as estimated on the Reading tab, V4.1-Flash as reported on its model card. FLOPs: core attention per decoded token at 2 FLOPs per multiply-add (MLA absorbed: every head scores a 576-dimensional entry and reads back 512, so layers × heads × L × 2 × 1,088; DSA: the same over min(L, 2,048) entries plus its indexer, layers × 64 × 128 × L × 2; V4: CSA layers heads × (min(L/4, k) + 128) × 2 × 1,024 plus a 64 × 128 indexer over L/4, HCA layers heads × (L/128 + 128) × 2 × 1,024; GQA: layers × heads × L × 2 × 256); V4.1-Flash is left out because its layers share work in ways those formulas do not cover. Parameter counts: model cards (<a href="https://huggingface.co/moonshotai/Kimi-K2-Instruct" target="_blank" rel="noopener noreferrer">Kimi K2</a>, <a href="https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512" target="_blank" rel="noopener noreferrer">Mistral Large 3</a>, <a href="https://huggingface.co/zai-org/GLM-4.5" target="_blank" rel="noopener noreferrer">GLM-4.5</a>) and the DeepSeek reports. '+(a.kvb===b.kvb&&a.h!==b.h?'<b>Same cache, different heads:</b> '+a.h+' against '+b.h+' query heads changes attention compute by '+(Math.max(fa,fb)/Math.min(fa,fb)).toFixed(1)+'× and the cache not at all.':'');
  }
  onTab('t-line',draw);
})();
