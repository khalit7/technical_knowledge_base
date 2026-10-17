// ---- Architecture explorer (t-ldarch) ----
(function(){
  const U=window.LDU,L=U.L,$=id=>document.getElementById(id),A=U.byKey;
  const keys=L.arch.map(m=>m.key);
  const opt=k=>'<option value="'+k+'">'+A[k].label+'</option>';
  $('la-a').innerHTML=keys.map(opt).join('');$('la-b').innerHTML=keys.map(opt).join('');$('la-a').value='sd15';$('la-b').value='flux1';
  $('la-leg').innerHTML=U.CATS.map(c=>'<span style="--sw:'+U.CAT[c][1]+'">'+U.CAT[c][0]+'</span>').join('');
  const check=m=>{if(m.key==='sd15')return 'equal to the measured count of the loaded U-Net (859,520,964)';if(m.key==='dit')return 'paper Table 4: 675M (the authors\' code)';
    if(m.hub)return m.hub.match?'equal to the Hub total for '+m.hub.repo+(m.hub.hub_total!==m.params?' (with the stored position table)':''):'differs from the Hub total';
    return 'equal to the Model map\'s safetensors-header count'};
  const kindName={unet:'U-Net',dit:'DiT (adaLN-Zero)',dit_cross:'DiT with cross-attention',mmdit:'MMDiT (two streams)',flux:'double + single stream',single:'single stream'};
  const cfgKeys=[['block_out_channels','channels per level'],['layers_per_block','ResNet blocks per level'],['attention_head_dim','attention_head_dim (= heads in U-Nets)'],['cross_attention_dim','text width read by cross-attention'],
    ['num_layers','blocks'],['num_single_layers','single-stream blocks'],['n_layers','blocks'],['n_refiner_layers','refiner layers (each side)'],['num_attention_heads','heads'],['n_heads','heads'],['dim','width'],['caption_projection_dim','width'],
    ['joint_attention_dim','text width in'],['pooled_projection_dim','pooled text width'],['patch_size','patch'],['in_channels','input channels per token'],['pos_embed_max_size','position table side'],['qk_norm','QK norm'],
    ['axes_dims_rope','RoPE split per head'],['axes_dims','RoPE split per head'],['mlp_ratio','MLP ratio'],['norm_type','norm type'],['guidance_embeds','guidance embedder']];
  function card(el,k,res){const m=A[k],f=L.flops[k];const N=U.tokens(k,res,res),F=U.flops(k,N,f.T),g=U.grid(k,res);
    const stack='<div class="la-stack">'+U.CATS.map(c=>m.cats[c]?'<span title="'+U.CAT[c][0]+'" style="width:'+(100*m.cats[c]/m.params).toFixed(2)+'%;background:'+U.CAT[c][1]+'"></span>':'').join('')+'</div>';
    const cats=U.CATS.filter(c=>m.cats[c]).map(c=>'<div>'+U.CAT[c][0]+'</div><div>'+U.P(m.cats[c])+' ('+U.pct(m.cats[c]/m.params,1)+')</div>').join('');
    let cfg='';const seen={};cfgKeys.forEach(([ck,n])=>{if(m.config[ck]!=null&&!seen[n]){seen[n]=1;cfg+='<div>'+n+'</div><div>'+RD.esc(JSON.stringify(m.config[ck])).replace(/,/g,', ')+'</div>'}});
    const top=Object.entries(m.top).filter(([,v])=>v>=1e6).sort((a,b)=>b[1]-a[1]).map(([n,v])=>'<div><span class="ld-mono">'+RD.esc(n)+'</span><span>'+U.P(v)+'</span></div>').join('');
    const bufs=Object.entries(m.big_buffers||{}).map(([n,v])=>U.int(v)+' numbers in the buffer <span class="ld-mono">'+n+'</span>').join('; ');
    el.innerHTML='<h4>'+m.label+'</h4><div class="small mute">'+kindName[m.kind]+'; latent '+m.latent_ch+' channels at '+m.vae_factor+'&times; downsampling'+(m.patch?', patch '+m.patch:'')+'; text: '+m.text_encoder+'</div>'+stack+
      '<div class="an-cnt">'+RD.stat('Parameters',U.int(m.params),check(m))+RD.stat(m.kind==='unet'?'Top-level positions':'Image tokens',U.int(N),res+' &times; '+res+(f.T?', + '+f.T+' text':''))+RD.stat('FLOPs per pass',U.FL(F),g?'attention scores '+U.pct(g[3]/g[2],0):'')+'</div>'+
      '<div class="la-kv">'+cats+'</div><div class="small mute" style="margin-top:6px">From the config</div><div class="la-kv">'+cfg+'</div>'+(bufs?'<div class="small mute">Not counted as parameters: '+bufs+'.</div>':'')+
      '<div class="small mute" style="margin-top:6px">Largest top-level modules</div><div class="la-blocks">'+top+'</div>'}
  function all(res){$('la-all').querySelector('tbody').innerHTML=keys.slice().sort((a,b)=>A[a].params-A[b].params).map(k=>{const m=A[k],f=L.flops[k],N=U.tokens(k,res,res),g=U.grid(k,res);
    return '<tr><td>'+m.label+'</td><td>'+U.P(m.params)+'</td><td>'+U.pct(m.cats.mod/m.params,1)+'</td><td>'+U.int(N)+'</td><td>'+(f.T||'none')+'</td><td>'+(g?U.FL(g[2]):U.FL(U.flops(k,N))+' *')+'</td><td>'+(g?U.pct(g[3]/g[2],0):'')+'</td><td class="small">'+(m.hub||k==='sd15'||k==='dit'?'<span class="ok">exact</span>':'Model map count')+'</td></tr>'}).join('')}
  function draw(){const r=+$('la-res').value;card($('la-ca'),$('la-a').value,r);card($('la-cb'),$('la-b').value,r);all(r)}
  ['la-a','la-b','la-res'].forEach(i=>$(i).addEventListener('change',draw));draw();
})();
