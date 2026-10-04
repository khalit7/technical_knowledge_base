// ---- Reading, Variance: SE under four scorings of the same RACE-H questions, Miller's K curve fed with measured components ----
(function(){
  const S=window.EST;if(!S||!S.race||!document.getElementById('rd-var-card'))return;
  const $=id=>document.getElementById(id);let mj=0;
  const KS=[1,2,3,5,10,20];
  function comp(j){const p=S.race.p[j],n=p.length,vx=S.varS(p),es=S.mean(p.map(x=>x*(1-x))),g=S.race.g[j];
    const meas=KS.map(K=>{const v=S.sampleK(p,K,500+K*13+j);return{K,se:S.seClt(v),m:S.mean(v)}});
    return{n,vx,es,share:es/(vx+es),pred:K=>Math.sqrt((vx+es/K)/n),meas,seP:S.seClt(p),seG:S.seClt(g),accG:S.mean(g),accP:S.mean(p)}}
  const CC=[comp(0),comp(1)];
  window.ES_CHECK=window.ES_CHECK||{};window.ES_CHECK.var=CC.map(c=>({vx:c.vx,es:c.es,seP:c.seP,seG:c.seG,pred1:c.pred(1),pred5:c.pred(5)}));
  function draw(){
    const c=CC[mj],host=$('rd-var-svg'),W=Math.min(860,RD.width(host)),H=W<520?230:250,pl=44,pr=W<520?12:150,pt=12,pb=34;
    const vals=[c.pred(1),c.seG,c.seP,...c.meas.map(m=>m.se)],hi=Math.max(...vals)*1.12,lo=Math.min(...vals)*0.8;
    const X=K=>pl+(Math.log(K)/Math.log(20))*(W-pl-pr),Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
    let s='';
    for(let k=0;k<5;k++){const v=lo+(hi-lo)*k/4,y=Y(v);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(pl-4,y+4,(100*v).toFixed(2),{a:'end',fs:10.5,fill:'var(--mute)'})}
    KS.forEach((K,i)=>s+=RD.t(X(K),H-16,(i===0||W>=520?'K = ':'')+K,{a:i===KS.length-1&&pr<20?'end':'middle',fs:10.5,fill:'var(--mute)'}));
    let pts=[];for(let i=0;i<=60;i++){const K=Math.exp(Math.log(20)*i/60);pts.push(X(K).toFixed(1)+','+Y(c.pred(K)).toFixed(1))}
    s+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+pts.join(' ')+'"/>';
    c.meas.forEach(m=>s+='<circle cx="'+X(m.K)+'" cy="'+Y(m.se)+'" r="4" fill="var(--acc)" stroke="var(--bg)"/>');
    const hl=(v,col,lab)=>{const y=Y(v);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="'+col+'" stroke-dasharray="5 3" stroke-width="1.5"/>';if(pr>20)s+=RD.t(W-pr+6,y+4,lab,{fs:11,fill:col});};
    hl(c.seP,'var(--good)','probability (K → ∞)');hl(c.seG,'var(--c2)','greedy (T = 0)');
    host.innerHTML=RD.svg(W,H,s,'Standard error of the accuracy against samples per question');
    $('rd-var-cnt').innerHTML=RD.stat('Var(x), item variance',c.vx.toFixed(4),'variance of P(correct) over questions')+RD.stat('E[σ²], within-item',c.es.toFixed(4),(100*c.share).toFixed(0)+'% of one sample\'s variance')+
      RD.stat('SE, one sample → probability',(100*c.pred(1)).toFixed(2)+' → '+(100*c.seP).toFixed(2),'points; K = 5: '+(100*c.pred(5)).toFixed(2))+RD.stat('Accuracy: sampled vs greedy',(100*c.accP).toFixed(1)+'% vs '+(100*c.accG).toFixed(1)+'%','the thermostat moves the mean');
    $('rd-var-cap').innerHTML=S.race.models[mj]+'. Horizontal: samples per question K (log scale); vertical: standard error of the accuracy, points. Line: Miller\'s √((Var(x) + E[σ²]/K)/n) with the measured components. Dots: actual standard errors when each question\'s answer is drawn K times from the model\'s probabilities over the four letters (seeded) <i class="nl r">real data</i>. Dashed green: scoring by the probability itself (no sampling noise); dashed orange: the most likely letter (temperature 0). "Sampling" here draws from the renormalised letter probabilities, not from free generation <i class="nl i">simplification</i>.';
  }
  RD.seg($('rd-var-m'),m=>{mj=+m;draw()});
  document.querySelectorAll('#rd-var-m button').forEach((b,i)=>b.textContent=S.race.models[i]);
  draw();RD.onRender(draw);RD.onResize(draw);
})();
