// ---- Configs tab: eight config.json files, recomputed (cache sizing moved to Long context's KV-cache calculator, 2026-10-23) ----
(function(){
  if(!$('cfTab2'))return;
  // Fields copied from each model's config.json (text_config where nested). lf/ll = full/linear layers from layer_types or full_attention_interval.
  const C=[
    {n:'Qwen3-32B',c:'var(--c5)',L:64,lf:64,ll:0,kv:8,dh:128,hv:0,dk:0,dv:0,d:5120,E:0,k:0,sh:0,dff:0,tot:32,act:32,note:'dense, 64 layers of full attention'},
    {n:'Qwen3-30B-A3B',c:'var(--mute)',L:48,lf:48,ll:0,kv:4,dh:128,hv:0,dk:0,dv:0,d:2048,E:128,k:8,sh:0,dff:768,tot:30,act:3},
    {n:'Qwen3-235B-A22B',c:'var(--c2)',L:94,lf:94,ll:0,kv:4,dh:128,hv:0,dk:0,dv:0,d:4096,E:128,k:8,sh:0,dff:1536,tot:235,act:22},
    {n:'Qwen3-Next-80B-A3B',c:'var(--c6)',L:48,lf:12,ll:36,kv:2,dh:256,hv:32,dk:128,dv:128,d:2048,E:512,k:10,sh:1,dff:512,tot:80,act:3},
    {n:'Qwen3.5-397B-A17B',c:'var(--c7)',L:60,lf:15,ll:45,kv:2,dh:256,hv:64,dk:128,dv:128,d:4096,E:512,k:10,sh:1,dff:1024,tot:397,act:17},
    {n:'Qwen3.8-27B',c:'var(--c4)',L:64,lf:16,ll:48,kv:4,dh:256,hv:48,dk:128,dv:128,d:5120,E:0,k:0,sh:0,dff:0,tot:27,act:27,note:'dense feed-forward (intermediate 17,408)'},
    {n:'Qwen3.8-2.4T-A95B',c:'var(--c1)',L:92,lf:23,ll:69,kv:4,dh:256,hv:128,dk:128,dv:128,d:8192,E:512,k:10,sh:1,dff:2048,tot:2400,act:95},
    {n:'Qwen3.8-Flash-Next',c:'var(--good)',L:48,lf:12,ll:36,kv:2,dh:256,hv:48,dk:128,dv:128,d:2560,E:512,k:10,sh:1,dff:640,tot:125,act:6,note:'125B excludes 51B n-gram and 4B MTP'}];
  const big=v=>v>=1e12?(v/1e12).toFixed(3)+'T':v>=1e9?(v/1e9).toFixed(1)+'B':(v/1e6).toFixed(1)+'M';
  function draw(){
    // table 2: parameters
    let g='<tr><th>Model</th><th class="num">Layers (full / linear)</th><th class="num">d<sub>model</sub></th><th class="num">Experts (k active)</th><th class="num">Expert width</th><th class="num">P<sub>expert</sub></th><th class="num">Experts stored</th><th class="num">Experts active</th><th class="num">Headline</th></tr>';
    C.forEach(m=>{if(!m.E){g+='<tr><td>'+m.n+'</td><td class="num">'+m.L+' ('+m.lf+' / '+m.ll+')</td><td class="num">'+fmt(m.d)+'</td><td class="num" colspan="5" style="text-align:left">'+m.note+'</td><td class="num">'+m.tot+'B</td></tr>';return}
      const pe=3*m.d*m.dff,s1=m.L*(m.E+m.sh)*pe,a1=m.L*(m.k+m.sh)*pe;
      g+='<tr><td>'+m.n+'</td><td class="num">'+m.L+' ('+m.lf+' / '+m.ll+')</td><td class="num">'+fmt(m.d)+'</td><td class="num">'+m.E+(m.sh?' + 1 shared':'')+' ('+m.k+(m.sh?' + 1':'')+')</td><td class="num">'+fmt(m.dff)+'</td><td class="num">'+fmt(pe)+'</td><td class="num">'+big(s1)+' <span class="mute">('+Math.round(s1/(m.tot*1e9)*100)+'%)</span></td><td class="num">'+big(a1)+'</td><td class="num">'+(m.tot>=1000?(m.tot/1000).toFixed(1)+'T':m.tot+'B')+' / '+m.act+'B'+(m.note?'<br><span class="mute small">'+m.note+'</span>':'')+'</td></tr>'});
    $('cfTab2').innerHTML=g;
  }
  onTab('t-cfg',draw);
})();
