// ---- Reading, section 5: one bad prediction among 442 real ones (scikit-learn's diabetes data, CV linear regression) ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f;if(!$('rd-rg'))return;
  const Y=EM.reg.y,P0=EM.reg.yhat,n=Y.length;
  // the patient predicted most exactly gets the extra error
  let j=0;for(let i=1;i<n;i++)if(Math.abs(Y[i]-P0[i])<Math.abs(Y[j]-P0[j]))j=i;
  const mean=Y.reduce((a,b)=>a+b,0)/n,sst=Y.reduce((a,b)=>a+(b-mean)**2,0);
  function metrics(P){let ae=0,se=0,ape=0;const abs=[];for(let i=0;i<n;i++){const e=Y[i]-P[i];ae+=Math.abs(e);se+=e*e;ape+=Math.abs(e)/Math.abs(Y[i]);abs.push(Math.abs(e))}
    abs.sort((a,b)=>a-b);const med=n%2?abs[(n-1)/2]:(abs[n/2-1]+abs[n/2])/2;return {mae:ae/n,rmse:Math.sqrt(se/n),r2:1-se/sst,mape:ape/n,med}}
  const base=metrics(P0);
  function draw(){const d=+$('rd-rgD').value;$('rd-rgDv').textContent=d.toLocaleString('en-GB');const P=P0.slice();P[j]+=d;const m=metrics(P);
    const box=$('rd-rgSvg'),W=RD.width(box),H=Math.min(260,Math.max(200,W*0.45)),ml=40,mr=10,mt=10,mb=30,lo=0,hi=Math.max(400,P[j]+20);
    const x=v=>ml+(W-ml-mr)*(v-lo)/(400-lo),yy=v=>mt+(H-mt-mb)*(1-(Math.min(v,hi)-lo)/(hi-lo));
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Predicted against true disease progression">';
    const tk=hi>600?[0,250,500,750,1000,1250]:[0,100,200,300,400];
    tk.filter(v=>v<=hi).forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy(v)+'" y2="'+yy(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(yy(v)+3.5)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    [0,100,200,300,400].forEach(v=>{s+='<text x="'+x(v)+'" y="'+(H-15)+'" font-size="11" text-anchor="'+(v===0?'start':v===400?'end':'middle')+'" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="11" text-anchor="end" fill="var(--mute)">true value</text><text x="'+(ml+4)+'" y="'+(mt+10)+'" font-size="11" fill="var(--mute)">predicted</text>';
    s+='<line x1="'+x(0)+'" x2="'+x(400)+'" y1="'+yy(0)+'" y2="'+yy(400)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    for(let i=0;i<n;i++)if(i!==j)s+='<circle cx="'+x(Y[i]).toFixed(1)+'" cy="'+yy(P[i]).toFixed(1)+'" r="2.4" fill="var(--c1)" fill-opacity=".5"/>';
    s+='<line x1="'+x(Y[j])+'" x2="'+x(Y[j])+'" y1="'+yy(P0[j])+'" y2="'+yy(P[j])+'" stroke="var(--bad)" stroke-width="2"/><circle cx="'+x(Y[j])+'" cy="'+yy(P[j])+'" r="5" fill="var(--bad)"/>';
    if(d>0)s+='<text x="'+(x(Y[j])-8)+'" y="'+(yy(P[j])+4)+'" font-size="11" text-anchor="end" fill="var(--bad)">+'+d+'</text>';
    box.innerHTML=s+'</svg>';
    const dl=(v,b,k)=>v===b?'unchanged':(v>b?'+':'&minus;')+F(Math.abs(v-b),k);
    $('rd-rgN').innerHTML=RD.stat('MAE',F(m.mae,1),dl(m.mae,base.mae,1)+'; mean baseline 65.8')+RD.stat('RMSE',F(m.rmse,1),dl(m.rmse,base.rmse,1)+'; mean baseline 77.0')+RD.stat('R&sup2;',F(m.r2,3),dl(m.r2,base.r2,3)+'; mean baseline 0')+RD.stat('MAPE',RD.pct(m.mape),'mean baseline 62.1%')+RD.stat('Median abs. error',F(m.med,1),dl(m.med,base.med,1))}
  $('rd-rgD').addEventListener('input',draw);RD.onRender(draw);draw();RD.onResize(draw);
})();
