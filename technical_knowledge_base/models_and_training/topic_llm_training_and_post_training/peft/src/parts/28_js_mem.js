// ---- Reading, memory: full fine-tuning, LoRA and QLoRA from real shapes (same formulas as recompute.py mem()) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('mem'))return;
  const M=PF_DATA.mem.models,NF4=PF_DATA.mem.nf4,ORDER=['Llama 3 8B','Qwen3-8B','Mistral 7B v0.3','LLaMA 7B','LLaMA 13B','LLaMA 65B','Qwen3-30B-A3B'];
  const GPUS=[24,48,80];
  $('memM').innerHTML=ORDER.map(k=>'<option'+(k==='Llama 3 8B'?' selected':'')+'>'+k+'</option>').join('');
  const gb=b=>b/1e9,fmt=g=>g>=1000?PF.comma(g)+' GB':g>=100?g.toFixed(0)+' GB':g.toFixed(1)+' GB';
  function rows(k,r){const m=M[k],N=m.N,NL=m.NL,P=r*m.u;
    // segments: [GB, colour, label]
    return [
      ['Full fine-tuning','every weight trained',[[4*N,'var(--c1)'],[12*N,'var(--c2)']]],
      ['LoRA','bf16 base frozen',[[2*N,'var(--c6)'],[4*P,'var(--c1)'],[12*P,'var(--c2)']]],
      ['QLoRA','NF4 base frozen',[[NL*NF4/8+(N-NL)*2,'var(--c6)'],[4*P,'var(--c1)'],[12*P,'var(--c2)']]]].map(x=>({n:x[0],s:x[1],seg:x[2].map(y=>[gb(y[0]),y[1]]),P}))}
  function draw(){
    const k=$('memM').value,r=+$('memR').value,R=rows(k,r),tot=R.map(x=>x.seg.reduce((a,y)=>a+y[0],0)),mx=Math.max(...tot);
    const lines=g=>GPUS.filter(v=>v<mx).map(v=>'<span class="gl" style="left:'+(100*v/mx).toFixed(2)+'%" title="'+v+' GB"></span>').join('');
    let h='<div class="mem-ax">'+GPUS.filter(v=>v<mx&&100*v/mx>4).map(v=>'<span style="left:'+(100*v/mx).toFixed(2)+'%">'+v+'</span>').join('')+'</div>';
    R.forEach((x,i)=>{let l=0;h+='<div class="mem-row"><span class="nm">'+x.n+'<small>'+x.s+'</small></span><span class="tr">';
      x.seg.forEach(y=>{const w=100*y[0]/mx;h+='<i style="left:'+l.toFixed(3)+'%;width:'+Math.max(y[0]>0?0.4:0,w).toFixed(3)+'%;background:'+y[1]+'"></i>';l+=w});
      h+=lines()+'</span><span class="val">'+fmt(tot[i])+'</span></div>'});
    $('memB').innerHTML=h;
    const m=M[k],P=r*m.u,fits=g=>GPUS.find(v=>v>=g);
    $('memNote').innerHTML=k+': '+PF.fmt(m.N)+' parameters, '+PF.fmt(m.NL)+' of them in linear layers; the rank-'+r+' adapter on all seven matrices has '+PF.fmt(P)+' ('+(100*P/m.N).toFixed(2)+'%). Smallest card that holds the states: full '+(fits(tot[0])?fits(tot[0])+' GB':'none of these, '+Math.ceil(tot[0]/80)+' × 80 GB')+', LoRA '+(fits(tot[1])?fits(tot[1])+' GB':Math.ceil(tot[1]/80)+' × 80 GB')+', QLoRA '+(fits(tot[2])?fits(tot[2])+' GB':Math.ceil(tot[2]/80)+' × 80 GB')+', before activations. Config: <a href="'+m.url.replace('/resolve/','/blob/')+'" target="_blank" rel="noopener noreferrer">config.json</a>.';
  }
  $('memM').addEventListener('change',draw);$('memR').addEventListener('change',draw);
  RD.onRender(draw);draw();
})();
