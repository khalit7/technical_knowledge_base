// ---- MLA: the two modes, and the per-layer cache at V3's dimensions ----
(function(){
  function draw(m){
    let s='';
    // the cache, common to both modes
    s+='<text x="262" y="16" font-size="11.5" text-anchor="middle" fill="var(--good)">KV cache: 512 + 64 = 576 per token per layer</text>';
    if(m==='pre'){
      s+=bx(6,95,104,46,'box',['hₜ','hidden state']);
      s+=bx(140,40,92,40,'box',['Wᴰᴷⱽ','down-projection']);
      s+=bx(140,160,92,40,'box',['Wᴷᴿ, RoPE','decoupled key']);
      s+=bx(262,30,100,58,'boxc',['latent cᴷⱽₜ','512, cached']);
      s+=bx(256,152,112,56,'boxc',['RoPE key kᴿₜ','64, all heads'],11.5);
      s+=ar(110,110,138,64)+ar(110,126,138,178)+ar(232,60,260,60)+ar(232,180,260,180);
      for(let i=0;i<3;i++){const y=26+i*48;s+=bx(400,y,112,38,'boxa',['Wᵁᴷᵢ, Wᵁⱽᵢ → kᵢ, vᵢ','head '+(i===2?'128':i+1)],11.5);s+=ar(362,59,398,y+19)}
      s+='<text x="456" y="178" font-size="12" text-anchor="middle" fill="var(--mute)">… one slice per head</text>';
      s+=bx(536,50,100,90,'box',['MHA mode','each head attends','with its own kᵢ, vᵢ','plus kᴿ'],11.5);
      s+=ar(512,45,534,80)+ar(512,93,534,100)+ar(512,141,534,120);
      s+='<polyline points="368,190 586,190 586,143" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="MARK"/>';
    }else{
      s+=bx(6,30,108,58,'box',['queries qᵢ','128 heads']);
      s+=bx(140,24,104,70,'boxa',['absorb:','Wᵁᴷᵢᵀ qᵢ','into latent space'],11.5);
      s+=bx(262,40,100,150,'boxc',['one cached entry','[cᴷⱽⱼ ; kᴿⱼ]','576 dims:','shared key;','first 512 =','shared value'],11.5);
      s+=bx(6,150,108,40,'box',['qᴿᵢ','rotated part']);
      s+=bx(392,60,108,70,'box',['MQA mode','every head reads','the same entry'],11.5);
      s+=bx(526,40,110,46,'boxa',['Σ aⱼ cᴷⱽⱼ','512 dims'],11.5);
      s+=bx(526,120,110,56,'boxa',['Wᵁⱽᵢ folded','into Wᴼ'],11.5);
      s+=ar(114,59,138,59)+ar(244,59,260,80)+ar(114,170,260,150)+ar(362,95,390,95)+ar(500,80,524,63)+ar(581,86,581,118);
    }
    $('mlaSvg').innerHTML=svgEl(640,215,s,'MLA '+(m==='pre'?'prefill':'decode')+' data flow');
    $('mlaCap').textContent=m==='pre'
      ?'Prefill and training are compute-bound with many queries at once, so the latent is expanded through each head\'s own slice of the up-projections and attention runs as ordinary multi-head attention. Only the green boxes are cached.'
      :'Decode reads one token at a time, so nothing is expanded: each query head is projected into latent space (Wᵁᴷ absorbed into the query side) and all 128 heads score the same 576-dimensional cached entry, whose first 512 dimensions also serve as the value; Wᵁⱽ folds into the output projection.';
  }
  segBind('mlaM',draw);draw('pre');

  const nh=128,dh=128,dc=512,dr=64,L=61,G=[1,2,3,4,8,16,32,64,128];
  function bars(){
    const g=G[+$('mlaG').value];$('mlaGv').textContent=g;
    const rows=[['MHA','2 × 128 × 128',2*nh*dh,'var(--bad)'],['GQA, '+g+(g===1?' group':' groups'),'2 × '+g+' × 128',2*g*dh,'var(--c5)'],['MQA','2 × 128',2*dh,'var(--mute)'],['MLA','512 + 64',dc+dr,'var(--good)']];
    const max=2*nh*dh;
    $('mlaBars').innerHTML=rows.map(r=>'<div class="row'+(r[0]==='MLA'?' hl':'')+'"><span class="nm" title="'+r[1]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.4,100*r[2]/max).toFixed(2)+'%;background:'+r[3]+'"></span></span><span class="val">'+fmt(r[2])+'</span></div>').join('')+
      '<p class="small mute" style="margin:6px 0 0">Elements cached per token per layer. Across 61 layers in BF16 that is '+rows.map(r=>r[0].split(',')[0]+' '+fmtBytes(r[2]*L*2)).join(', ')+' per token. MLA is '+(2*g*dh/(dc+dr)).toFixed(2)+' times smaller than this GQA and '+(max/(dc+dr)).toFixed(1)+' times smaller than MHA.</p>';
  }
  $('mlaG').addEventListener('input',bars);bars();
})();
