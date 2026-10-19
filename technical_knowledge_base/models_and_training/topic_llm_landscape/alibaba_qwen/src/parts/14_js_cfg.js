// ---- Configs and cache tab: eight config.json files, recomputed ----
(function(){
  if(!$('cfPlot'))return;
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
  const TS=[4096,8192,16384,32768,65536,131072,262144,524288,1000000];
  const kvt=m=>m.lf*2*m.kv*m.dh*2, stN=m=>m.ll*m.hv*m.dk*m.dv;
  const big=v=>v>=1e12?(v/1e12).toFixed(3)+'T':v>=1e9?(v/1e9).toFixed(1)+'B':(v/1e6).toFixed(1)+'M';
  function draw(){
    const T=TS[+$('cfT').value],sb=+$('cfS').value;$('cfTv').textContent=fmt(T)+' tokens';
    const mem=(m,t)=>kvt(m)*t+stN(m)*sb;
    // plot: memory per request against context, log-log
    const W=Math.max(560,Math.min(860,$('cfPlot').clientWidth||700)),H=330,o={W,H,pl:56,pr:150,pt:12,pb:36,x:[4096,1e6],y:[2**26,2**38],
      xt:[[4096,'4K'],[16384,'16K'],[65536,'64K'],[262144,'256K'],[1e6,'1M']],yt:[[2**26,'64 MiB'],[2**28,'256 MiB'],[2**30,'1 GiB'],[2**32,'4 GiB'],[2**34,'16 GiB'],[2**36,'64 GiB'],[2**38,'256 GiB']],xl:'context length (tokens, log scale)',yl:'memory per request'};
    const f=logFrame(o);let s=f.s;const ends=[];
    C.forEach(m=>{let d='';for(let i=0;i<=60;i++){const t=4096*Math.pow(1e6/4096,i/60),v=Math.min(Math.max(mem(m,t),2**26),2**38);d+=(i?'L':'M')+f.lx(t).toFixed(1)+' '+f.ly(v).toFixed(1)}
      s+='<path d="'+d+'" fill="none" stroke="'+m.c+'" stroke-width="'+(m.ll?2.2:1.6)+'"'+(m.ll?'':' stroke-dasharray="5 3"')+'/>';
      const v=mem(m,1e6);ends.push({y:f.ly(Math.min(v,2**38)),c:m.c,n:m.n,how:m.n+': '+fmtBytes(kvt(m))+' per token + '+fmtBytes(stN(m)*sb)+' of state'})});
    s+='<line x1="'+f.lx(T)+'" x2="'+f.lx(T)+'" y1="'+o.pt+'" y2="'+(H-o.pb)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
    C.forEach(m=>{s+='<circle cx="'+f.lx(T)+'" cy="'+f.ly(Math.min(Math.max(mem(m,T),2**26),2**38))+'" r="3.2" fill="'+m.c+'"/>'});
    s+=endLabels(ends,W-o.pr+6,13);
    $('cfPlot').innerHTML=svgEl(W,H,s,'Memory per request against context for eight Qwen models')+'<div class="leg"><span><i style="background:var(--mute)"></i>dashed: full attention in every layer</span><span><i style="background:var(--mute);height:4px"></i>solid: 3:1 hybrid, cache plus fixed DeltaNet state</span><span>Qwen3 models support 128K context (with YaRN); their lines beyond it are arithmetic only</span></div>';
    // table 1: memory
    let h='<tr><th>Model</th><th class="num">Layers (full / linear)</th><th class="num">KV heads × dim</th><th class="num">KV per token</th><th class="num">DeltaNet state</th><th class="num">State = cache of</th><th class="num">Memory at '+fmt(T)+'</th></tr>';
    C.forEach(m=>{const st=stN(m)*sb;h+='<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+m.c+';margin-right:6px"></span>'+m.n+'</td><td class="num">'+m.L+' ('+m.lf+' / '+m.ll+')</td><td class="num">'+m.kv+' × '+m.dh+'</td><td class="num">'+fmtBytes(kvt(m))+'</td><td class="num">'+(m.ll?fmtBytes(st):'none')+'</td><td class="num">'+(m.ll?fmt(Math.round(st/(m.ll*2*m.kv*m.dh*2)))+' tokens':'')+'</td><td class="num"><b>'+fmtBytes(mem(m,T))+'</b></td></tr>'});
    $('cfTab').innerHTML=h;
    // table 2: parameters
    let g='<tr><th>Model</th><th class="num">d<sub>model</sub></th><th class="num">Experts (k active)</th><th class="num">Expert width</th><th class="num">P<sub>expert</sub></th><th class="num">Experts stored</th><th class="num">Experts active</th><th class="num">Headline</th></tr>';
    C.forEach(m=>{if(!m.E){g+='<tr><td>'+m.n+'</td><td class="num">'+fmt(m.d)+'</td><td class="num" colspan="5" style="text-align:left">'+m.note+'</td><td class="num">'+m.tot+'B</td></tr>';return}
      const pe=3*m.d*m.dff,s1=m.L*(m.E+m.sh)*pe,a1=m.L*(m.k+m.sh)*pe;
      g+='<tr><td>'+m.n+'</td><td class="num">'+fmt(m.d)+'</td><td class="num">'+m.E+(m.sh?' + 1 shared':'')+' ('+m.k+(m.sh?' + 1':'')+')</td><td class="num">'+fmt(m.dff)+'</td><td class="num">'+fmt(pe)+'</td><td class="num">'+big(s1)+' <span class="mute">('+Math.round(s1/(m.tot*1e9)*100)+'%)</span></td><td class="num">'+big(a1)+'</td><td class="num">'+(m.tot>=1000?(m.tot/1000).toFixed(1)+'T':m.tot+'B')+' / '+m.act+'B'+(m.note?'<br><span class="mute small">'+m.note+'</span>':'')+'</td></tr>'});
    $('cfTab2').innerHTML=g;
    const a=C[2],b=C[6];$('cfPin').innerHTML='At '+fmt(T)+' tokens with the state in '+(sb*8)+'-bit: Qwen3-235B-A22B needs <b>'+fmtBytes(mem(a,T))+'</b> per request and Qwen3.8-2.4T-A95B <b>'+fmtBytes(mem(b,T))+'</b>, '+(mem(b,T)/mem(a,T)*100).toFixed(0)+'% of it with ten times the parameters. Reproduces the page\'s 188 KiB and 92 KiB per token from config.json.';
  }
  $('cfT').addEventListener('input',draw);$('cfS').addEventListener('change',draw);
  onTab('t-cfg',draw);addEventListener('resize',()=>{if(!$('t-cfg').hidden)draw()});
})();
