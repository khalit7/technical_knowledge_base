// ---- Reading section 1 (closed block under Fig. 1): numbers held by one attention layer and one recurrent layer against context, log scales.
// Shapes from the Qwen3-Next-80B-A3B config: attention 2 KV heads x 256, keys and values (1,024 numbers per token); Gated DeltaNet 32 value
// heads x 128 x 128 (524,288 numbers). The token-by-token stepper that lived here (moved from the root on 2026-10-23) is Fig. 1, a 3D stage, since 2026-11-09. ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.RD||!$('rd-ssm-chart'))return;
  const PER=1024,STATE=32*128*128,CROSS=STATE/PER,chart=$('rd-ssm-chart');
  function drawChart(){
    const W=Math.min(760,RD.width(chart)),H=170,l=46,rr=24,t=10,bt=34;
    const X=T=>l+(W-l-rr)*Math.log2(T)/18,Y=n=>t+(H-t-bt)*(1-(Math.log2(n)-10)/(28-10));
    let b='';
    [1,64,512,4096,32768,262144].forEach(T=>{b+='<line x1="'+X(T)+'" x2="'+X(T)+'" y1="'+t+'" y2="'+(H-bt)+'" stroke="var(--line)"/>';
      if(W>420||[1,512,32768,262144].includes(T))b+=RD.t(X(T),H-bt+14,T>=1024?(T/1024)+'K':String(T),{a:'middle',fs:11})});
    [1024,32768,1048576,33554432].forEach(n=>{b+='<line x1="'+l+'" x2="'+(W-rr)+'" y1="'+Y(n)+'" y2="'+Y(n)+'" stroke="var(--line)"/>';
      b+=RD.t(l-4,Y(n)+4,n>=1048576?(n/1048576)+'M':(n/1024)+'K',{a:'end',fs:11})});
    b+='<line x1="'+X(1)+'" y1="'+Y(PER)+'" x2="'+X(262144)+'" y2="'+Y(PER*262144)+'" stroke="var(--c4)" stroke-width="2"/>';
    b+='<line x1="'+X(1)+'" y1="'+Y(STATE)+'" x2="'+X(262144)+'" y2="'+Y(STATE)+'" stroke="var(--c1)" stroke-width="2"/>';
    b+='<circle cx="'+X(CROSS)+'" cy="'+Y(STATE)+'" r="4" fill="var(--bad)"/>';
    b+=RD.t(X(CROSS)+6,Y(STATE)+15,'equal at '+CROSS+' tokens',{fs:11,fill:'var(--bad)'});
    b+=RD.t(l+(W-l-rr)/2,H-4,'context length (tokens, log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    chart.innerHTML=RD.svg(W,H,b,'Numbers held by one layer against context: attention grows, the recurrent state is flat')+
      '<div class="leg"><span style="--sw:var(--c4)">attention layer (KV cache)</span><span style="--sw:var(--c1)">recurrent layer (fixed state)</span></div>';
  }
  RD.onRender(drawChart);RD.onResize(drawChart);
  document.addEventListener('toggle',e=>{if(e.target.contains&&e.target.contains(chart))drawChart()},true);
  drawChart();
})();
