// ---- Numerics lab tab: dot-product error against format, length and order (window.FP model) ----
(function(){
  const f=MC.fmtN,$=id=>document.getElementById(id),NU=PCD.numerics;
  const ids=['nl-fin','nl-fa','nl-acc','nl-S','nl-fout','nl-K'];
  const sci=v=>v===0?'0':v<1e-3?v.toExponential(2):f(v*100,v*100>=10?1:3)+'%';
  let tm=0;
  function cfg(){return {fin:$('nl-fin').value,fa:$('nl-fa').value,acc:$('nl-acc').value,S:+$('nl-S').value,fout:$('nl-fout').value,K:1<<+$('nl-K').value}}
  function run(){
    const c=cfg();$('nl-Kv').textContent=f(c.K,0);$('nl-S').disabled=c.acc!=='split';
    const T=c.K>=16384?32:64,r=FP.experiment(Object.assign({seed:11,trials:T},c));
    $('nl-out').innerHTML=RD.stat('Median error',sci(r.median),'of the scale &radic;&Sigma;(a&middot;b)&sup2;')+RD.stat('90th percentile',sci(r.p90),T+' trials')+RD.stat('Worst',sci(r.max),'')+
      RD.stat('assert_close defaults pass',r.pass+' of '+r.T,'rtol, atol for '+FP.F[c.fout].name)+RD.stat('One rounding of the output',sci(FP.eps(c.fout)/2),'eps/2 of '+FP.F[c.fout].name);
    // chart: this configuration against float32 sequential and pairwise, K = 16 .. 16384
    clearTimeout(tm);tm=setTimeout(()=>chart(c),30);
    const ref=NU.accumulate.inputs.float16.find(x=>x.K===c.K);
    $('nl-note').innerHTML=(c.fin==='fp16'&&c.fout==='fp32'&&ref&&((c.fa==='fp32'&&c.acc!=='split')||(c.fa!=='fp32'&&c.acc==='seq'))?'Cross-check: the NumPy run in <code>src/out/numerics.json</code> (256 trials, its own random numbers) gave a median of '+sci(ref[(c.fa==='fp32'?'fp32_':c.fa==='fp16'?'fp16_':'bf16_')+(c.acc==='pair'?'pairwise':'sequential')].median)+' for this setting; agreement is statistical, not bit for bit.':'');
  }
  function chart(c){
    const el=$('nl-chart');if(!el.offsetParent)return;
    const Ks=[16,64,256,1024,4096,16384];
    const pts=o=>Ks.map(K=>({x:K,y:Math.max(1e-12,FP.experiment(Object.assign({seed:5,trials:K>=4096?24:48},o,{K})).median)}));
    const base={fin:c.fin,fout:'fp32',S:c.S};
    MC.line(el,[{name:'your setting',color:'var(--c2)',pts:pts(c)},{name:'float32 running sum',color:'var(--c1)',pts:pts(Object.assign({},base,{fa:'fp32',acc:'seq'})),dash:'4 3'},{name:'float32 pairwise',color:'var(--c3)',pts:pts(Object.assign({},base,{fa:'fp32',acc:'pair'})),dash:'4 3'}],
      {logx:true,logy:true,xl:'reduction length K',yl:'median error / scale',xfmt:v=>v>=1024?(v/1024)+'K':String(v),yfmt:v=>'1e'+Math.round(Math.log10(v)),label:'error against K'});
  }
  ids.forEach(i=>$(i).addEventListener('input',run));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-num']=[run];
  addEventListener('resize',()=>{if($('t-num').offsetParent)chart(cfg())});
})();
