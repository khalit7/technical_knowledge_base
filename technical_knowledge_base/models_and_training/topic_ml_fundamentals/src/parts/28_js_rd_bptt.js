// ---- Reading, thread 3: gradient through time, a tanh RNN against an LSTM cell path (RDE.bptt) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-bp'))return;
  const F=RD.f,T=RDE.T_BP,YL=-30,YH=3;
  function draw(){const w=+$('rd-bpW').value/100,bf=+$('rd-bpF').value/10;$('rd-bpWv').textContent=F(w,2);$('rd-bpFv').textContent=F(bf,1);
    const o=RDE.bptt(w,bf),box=$('rd-bpSvg'),W=RD.width(box),H=Math.round(Math.min(250,Math.max(190,W*.38))),ml=40,mr=10,mt=10,mb=30;
    const x=k=>ml+(W-ml-mr)*k/T,y=v=>mt+(H-mt-mb)*(1-(Math.max(YL,Math.min(YH,v))-YL)/(YH-YL));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Gradient size against steps back in time">';
    for(let v=YL;v<=0;v+=6)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="'+(v===0?'var(--mute)':'var(--line)')+'"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(v===0?'1':'1e'+v)+'</text>';
    for(let k=0;k<=T;k+=10)s+='<text x="'+x(k)+'" y="'+(H-14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+k+'</text>';
    s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">steps back in time, k</text>';
    const path=(a,col)=>'<path d="'+a.map((v,k)=>(k?'L':'M')+x(k).toFixed(1)+' '+y(v).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2.4"/>';
    s+=path(o.rnn,'var(--c2)')+path(o.lstm,'var(--c3)');box.innerHTML=s+'</svg>';
    const p10=v=>v>=-2&&v<=3?F(Math.pow(10,v),v<0?4:1):'10<sup>'+(v<0?'&minus;'+Math.round(-v):Math.round(v))+'</sup>';
    const reach=a=>{const k=a.findIndex(v=>v<-3);return k<0?'beyond '+T+' steps':k+' steps'};
    $('rd-bpN').innerHTML=RD.stat('tanh RNN, 50 steps back',p10(o.rnn[50]),'below 10<sup>&minus;3</sup> after '+reach(o.rnn))+RD.stat('LSTM cell, 50 steps back',p10(o.lstm[50]),'below 10<sup>&minus;3</sup> after '+reach(o.lstm))+RD.stat('Mean forget gate',F(Math.pow(10,o.lstm[T]/T),3),'geometric mean over the sequence');
  }
  ['rd-bpW','rd-bpF'].forEach(id=>$(id).addEventListener('input',draw));RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
})();
