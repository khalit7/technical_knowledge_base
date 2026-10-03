// ---- Reading: which number each loss picks, on the 141 rivers ----
(function(){
  const card=document.getElementById('pk-card');if(!card)return;
  const COL={mse:'var(--c1)',mae:'var(--c2)',huber:'var(--c3)',logcosh:'var(--c4)',pinball:'var(--c5)',mape:'var(--c6)'};
  const NAME={mse:'MSE: mean',mae:'MAE: median',huber:'Huber',logcosh:'Log-cosh',pinball:'Pinball',mape:'MAPE'};
  const $=id=>document.getElementById(id);
  const st={tau:0.9,delta:100,zero:false};
  function draw(){
    const y=LD.rivers.concat(st.zero?[0.5]:[]),p={delta:st.delta,tau:st.tau};
    $('pk-tv').textContent=st.tau.toFixed(2);$('pk-dv').textContent=st.delta>=10?Math.round(st.delta):st.delta.toFixed(1);
    const xs=PL.range(0,1600,240),lines=[],pts=[],tiles=[];
    for(const k of ['mse','mae','huber','logcosh','pinball','mape']){
      const ys=xs.map(c=>LF.meanLoss(k,y,c,p));let a=Infinity,b=-Infinity;ys.forEach(v=>{if(v<a)a=v;if(v>b)b=v});
      const c=LF.location(k,y,p),vc=LF.meanLoss(k,y,c,p);
      lines.push({xs,ys:ys.map(v=>(v-a)/(b-a||1)),c:COL[k],w:k==='mape'?2.6:2});
      if(c<=1600)pts.push({x:c,y:Math.max(0,(vc-a)/(b-a||1)),r:5,c:COL[k],stroke:'var(--bg)',title:NAME[k]+': '+c.toFixed(1)});
      const lab=k==='pinball'?'Pinball, τ = '+st.tau.toFixed(2):k==='huber'?'Huber, δ = '+(st.delta>=10?Math.round(st.delta):st.delta.toFixed(1)):NAME[k];
      tiles.push('<div class="stat"><div class="k"><span class="sw" style="background:'+COL[k]+'"></span>'+lab+'</div><div class="v">'+(c>=100?Math.round(c):c.toFixed(1))+' mi</div></div>');
    }
    PL.chart({el:$('pk-svg'),id:'pk',x:[0,1600],y:[-0.02,1.02],lines,pts,xl:'constant forecast c (miles)',yl:'mean loss, scaled',yt:[0,0.5,1],label:'Mean loss against a constant forecast for six losses'});
    $('pk-out').innerHTML=tiles.join('');
  }
  $('pk-t').addEventListener('input',e=>{st.tau=e.target.value/100;draw()});
  $('pk-d').addEventListener('input',e=>{st.delta=Math.pow(10,e.target.value/20);draw()});
  $('pk-z').addEventListener('change',e=>{st.zero=e.target.checked;draw()});
  RD.onRender(draw);draw();
  addEventListener('resize',()=>{if(card.offsetParent)draw()});
})();
