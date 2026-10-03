// ---- Reading 7: initialisation calculator. Var(w) per scheme, per-layer factor n Var(w) c, compounded over L layers ----
(function(){
  const tb=document.getElementById('in-tb');if(!tb)return;
  const $=id=>document.getElementById(id);
  // scheme: [name, Var(fi, fo, L), formula text]
  const S=[
    ['Xavier (Glorot)',(fi,fo)=>2/(fi+fo),'2 / (n<sub>in</sub> + n<sub>out</sub>)'],
    ['He, fan-in',(fi)=>2/fi,'2 / n<sub>in</sub>'],
    ['He, fan-out',(fi,fo)=>2/fo,'2 / n<sub>out</sub>'],
    ['LeCun',(fi)=>1/fi,'1 / n<sub>in</sub>'],
    ['PyTorch nn.Linear default',(fi)=>1/(3*fi),'1 / (3 n<sub>in</sub>)'],
    ['Normal, &sigma; = 0.02',()=>0.0004,'0.02&sup2;'],
    ['GPT-2 residual output',(fi,fo,L)=>0.0004/(2*L),'0.02&sup2; / (2L)'],
    ['&mu;P output layer',(fi)=>1/(fi*fi),'1 / n<sub>in</sub>&sup2;']];
  const f=v=>v===0?'0':(v>=1e4||v<1e-3)?v.toExponential(2).replace('e','×10^').replace('^+','^').replace(/\^(-?\d+)/,(m,e)=>'<sup>'+e.replace('-','−')+'</sup>'):v.toPrecision(3);
  function upd(){const fi=Math.pow(2,+$('in-fi').value),fo=Math.pow(2,+$('in-fo').value),L=+$('in-L').value,c=$('in-act').value==='relu'?0.5:1;
    $('in-fi-v').textContent=fi.toLocaleString('en-GB');$('in-fo-v').textContent=fo.toLocaleString('en-GB');$('in-L-v').textContent=L;
    tb.innerHTML=S.map(s=>{const v=s[1](fi,fo,L),ff=fi*v*c,fb=fo*v*c,fl=Math.pow(ff,L);const ok=fl>0.1&&fl<10;
      return '<tr'+(ok?' class="hl"':'')+'><td>'+s[0]+'</td><td>'+s[2]+' = '+f(v)+'</td><td class="num">'+f(ff)+'</td><td class="num"><span class="'+(ok?'ok':'bad')+'">'+f(fl)+'</span></td><td class="num">'+f(fb)+'</td><td class="num">'+f(Math.sqrt(v))+'</td><td class="num">'+f(Math.sqrt(3*v))+'</td></tr>'}).join('')}
  ['in-fi','in-fo','in-L','in-act'].forEach(id=>$(id).addEventListener('input',upd));upd();
  window.NI_INIT={S};
})();
