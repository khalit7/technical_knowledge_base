// Hero: which half of the merged model does the work at each kind of token in one calc call (an HTML grid, transposed on narrow screens).
// Source: the post and docs/rv32.md, P3 (the bridge, owned positions, RvChat). No data beyond the labels below.
(function(){
  const el=document.getElementById('qp-hero-svg');if(!el)return;
  const SEG=[
    {h:'Qwen writes its answer',tok:'"Let me use calc."',c:['run','passes through'],q:['act','predicts']},
    {h:'Qwen writes the tool call',tok:'&lt;tool_call&gt; calc(123456789*987654321) &lt;/tool_call&gt;',c:['run','copies the call into RAM at 0x8000'],q:['act','predicts']},
    {h:'The CPU runs',tok:'about 1,300 to 3,000 trace tokens',c:['act','run the program, predict each trace token'],q:['off','skipped by the driver']},
    {h:'The answer is printed',tok:'&lt;tool_response&gt; 121932631112635269 &lt;/tool_response&gt;',c:['act','decide each digit'],q:['run','run, read it as text']},
    {h:'Qwen continues',tok:'"The product is 121,932,631,112,635,269."',c:['run','passes through'],q:['act','predicts']}
  ];
  const LANES=[['c','11 compiled layers (the CPU)'],['q','Qwen3.5-4B\'s 32 layers, unchanged']];
  const css='#qp-hero-svg .g{display:grid;gap:4px;font-size:12.5px;line-height:1.35}'+
    '#qp-hero-svg .h{font-weight:600;color:var(--ink);padding:4px 2px}#qp-hero-svg .tk{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--mute);overflow-wrap:anywhere;padding:0 2px 4px}'+
    '#qp-hero-svg .ln{font-weight:600;color:var(--mute);padding:6px 4px;align-self:center}'+
    '#qp-hero-svg .x{border-radius:8px;padding:6px 8px;min-width:0;overflow-wrap:anywhere}'+
    '#qp-hero-svg .act{background:var(--acc);color:var(--bg);font-weight:600}#qp-hero-svg .run{background:var(--acc2);color:var(--ink)}'+
    '#qp-hero-svg .off{border:1px dashed var(--line);color:var(--mute)}#qp-hero-svg .ky{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--mute);margin-top:8px}#qp-hero-svg .ky i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px}';
  function draw(){
    const W=RD.width(el),wide=W>=600;let h='<style>'+css+'</style>';
    if(wide){
      h+='<div class="g" style="grid-template-columns:8.5em repeat(5,minmax(0,1fr))"><div></div>'+SEG.map(s=>'<div><div class="h">'+s.h+'</div><div class="tk">'+s.tok+'</div></div>').join('');
      LANES.forEach(([k,n])=>{h+='<div class="ln">'+n+'</div>'+SEG.map(s=>'<div class="x '+s[k][0]+'">'+s[k][1]+'</div>').join('')});
      h+='</div>';
    }else{
      h+='<div class="g" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr)"><div></div><div class="ln">'+LANES[0][1]+'</div><div class="ln">'+LANES[1][1]+'</div>';
      SEG.forEach(s=>{h+='<div><div class="h">'+s.h+'</div><div class="tk">'+s.tok+'</div></div><div class="x '+s.c[0]+'">'+s.c[1]+'</div><div class="x '+s.q[0]+'">'+s.q[1]+'</div>'});
      h+='</div>';
    }
    h+='<div class="ky"><span><i style="background:var(--acc)"></i>decides the next token</span><span><i style="background:var(--acc2)"></i>runs, does not decide</span><span><i style="border:1px dashed var(--line)"></i>not run</span></div>';
    el.innerHTML=h;
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
