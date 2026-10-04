// ---- Threshold lab tab: measured true-hit and false-hit curves, combined with a traffic mix and costs ----
(function(){
  const SM=CA.sem,$=id=>document.getElementById(id);if(!SM||!$('sem-model'))return;
  const CALL=[0.0001,0.001,0.01,0.03,0.1,0.3],WRONG=[0,0.01,0.1,0.5,1,5,20];
  const money=v=>(v<0?'−':'')+'$'+Math.abs(v).toFixed(Math.abs(v)<1?3:2);
  function render(){
    const m=$('sem-model').value,d=$('sem-data').value,T=SM.thresholds,i=+$('sem-t').value,t=T[i],p=+$('sem-p').value/100,c=CALL[+$('sem-c').value],wc=WRONG[+$('sem-w').value];
    $('sem-tv').textContent=t.toFixed(2);$('sem-pv').textContent=Math.round(p*100)+'%';$('sem-cv').textContent='$'+c;$('sem-wv').textContent='$'+wc;
    const R=SM[m][d],tpr=R.tpr[i],fpr=R.fpr[i];
    const right=p*tpr,wrong=(1-p)*fpr,served=right+wrong,none=1-served;
    $('sem-split').innerHTML='<span style="width:'+(right*100)+'%;background:var(--good)">'+(right>0.08?(right*100).toFixed(0)+'%':'')+'</span><span style="width:'+(wrong*100)+'%;background:var(--bad)">'+(wrong>0.08?(wrong*100).toFixed(0)+'%':'')+'</span><span style="width:'+(none*100)+'%;background:var(--dim);color:var(--ink)">'+(none>0.12?(none*100).toFixed(0)+'%':'')+'</span>';
    const val=1000*(served*c-wrong*wc);
    $('sem-out').innerHTML=RD.stat('Served from cache',(served*100).toFixed(1)+'%','of all queries')+RD.stat('Wrong among served',served?((wrong/served)*100).toFixed(1)+'%':'-','answers to a different question')+
      RD.stat('True matches served',(tpr*100).toFixed(1)+'%','measured true-hit rate')+RD.stat('Value per 1,000 queries','<span style="color:'+(val>=0?'var(--good)':'var(--bad)')+'">'+money(val)+'</span>','calls saved minus wrong answers');
    // curves with the wrong-share-of-served curve for this mix
    const box=$('sem-svg'),W=Math.min(RD.width(box),760),H=Math.round(Math.min(280,Math.max(210,W*0.42))),L=44,Rr=12,Tp=10,B=34,w=W-L-Rr,h=H-Tp-B;
    const xs=v=>L+(v-0.5)/0.5*w,ys=v=>Tp+h-v*h;let g='';
    for(let k=0;k<=4;k++){const y=ys(k/4);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-5,y+4,(k*25)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    for(let v=0.5;v<=1.0001;v+=0.1){const x=xs(v);g+=RD.t(x,Tp+h+14,v.toFixed(1),{a:'middle',fs:10,fill:'var(--mute)'})}
    g+=RD.t(L+w/2,H-3,'similarity threshold',{a:'middle',fs:11,fill:'var(--mute)'});
    const line=(arr,col,wd)=>{let s='';T.forEach((v,j)=>{if(arr[j]==null)return;s+=(s?' L':'M')+xs(v).toFixed(1)+','+ys(arr[j]).toFixed(1)});return '<path d="'+s+'" fill="none" stroke="'+col+'" stroke-width="'+wd+'"/>'};
    const ws=T.map((v,j)=>{const sv=p*R.tpr[j]+(1-p)*R.fpr[j];return sv>0.002?(1-p)*R.fpr[j]/sv:null});
    g+=line(R.tpr,'var(--good)',2.4)+line(R.fpr,'var(--bad)',2.4)+line(ws,'var(--acc)',2);
    g+='<line x1="'+xs(t)+'" x2="'+xs(t)+'" y1="'+Tp+'" y2="'+(Tp+h)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    box.innerHTML=RD.svg(W,H,g,'True-hit, false-hit and wrong-share curves by threshold');
    // nearest-neighbour view (Quora only)
    const N=SM[m].nn;
    $('sem-nn').innerHTML=RD.stat('Served',(N.served[i]*100).toFixed(1)+'%','of 10,000 lookups')+RD.stat('Own duplicate (right)',(N.right[i]*100).toFixed(1)+'%','labelled')+
      RD.stat('Own non-duplicate (wrong)',(N.wrong_labelled[i]*100).toFixed(1)+'%','labelled')+RD.stat('Another stored question',(N.other_unlabelled[i]*100).toFixed(1)+'%','no label; examples below');
    $('sem-ex').innerHTML='<tr><th>Incoming question</th><th>Best stored match (not its labelled partner)</th><th class="num">Cosine</th></tr>'+SM[m].nn_examples.map(e=>'<tr><td>'+RD.esc(e.query)+'</td><td>'+RD.esc(e.matched)+'</td><td class="num">'+e.sim.toFixed(3)+'</td></tr>').join('')+
      '<tr><td colspan="3" class="small mute">The first matches at cosine 0.9 or above with this model, in dataset order: mostly the same question asked twice on Quora, which is why the labelled numbers understate correct hits slightly.</td></tr>';
  }
  ['sem-model','sem-data','sem-t','sem-p','sem-c','sem-w'].forEach(id=>$(id).addEventListener('input',render));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sem']=[render];
  addEventListener('resize',()=>{const t=$('t-sem');if(t&&!t.hidden)render()});
  render();
})();
