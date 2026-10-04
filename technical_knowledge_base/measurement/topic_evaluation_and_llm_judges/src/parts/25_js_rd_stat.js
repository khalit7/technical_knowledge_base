// ---- Reading, Statistics: 95% intervals on a 2-point drop over 200 pass/fail items (derived, formulas in the caption) ----
(function(){
  const host=document.getElementById('rd-ci');if(!host)return;
  const p=0.70,n=200,delta=-0.02,d=0.10,z=1.96,zb=0.8416;
  const se1=Math.sqrt(p*(1-p)/n), seU=Math.SQRT2*se1, seP=Math.sqrt((d-delta*delta)/n);
  const nU=Math.ceil((z+zb)**2*2*p*(1-p)/delta**2), nP=Math.ceil((z+zb)**2*(d-delta*delta)/delta**2);
  const rows=[['Unpaired',seU],['Paired, 10% disagree',seP]];
  window.RD_CHECK=window.RD_CHECK||{};window.RD_CHECK.stat={se1:100*se1,seU:100*seU,seP:100*seP,ciU:100*z*seU,ciP:100*z*seP,nU,nP};
  function draw(){
    const W=Math.min(760,RD.width(host)),pad=14,lo=-14,hi=8,H=36+rows.length*46+8;
    const X=v=>pad+(v-lo)/(hi-lo)*(W-2*pad);
    let s='';
    for(let v=lo;v<=hi;v+=2){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="22" y2="'+(H-6)+'" stroke="var(--line)"/>';if(W>420||v%4===0)s+=RD.t(x,14,(v>0?'+':'')+v,{a:'middle',fs:10.5,fill:'var(--mute)'})}
    s+='<line x1="'+X(0)+'" x2="'+X(0)+'" y1="22" y2="'+(H-6)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    rows.forEach((r,i)=>{const y=40+i*46,h=100*z*r[1],a=X(-2-h),b=X(-2+h);
      s+=RD.t(pad,y,r[0]+': −2 ± '+h.toFixed(1)+' pts',{fs:12,fill:'var(--ink)'});
      s+='<line x1="'+a+'" x2="'+b+'" y1="'+(y+14)+'" y2="'+(y+14)+'" stroke="var(--acc)" stroke-width="3"/>'+
         '<line x1="'+a+'" x2="'+a+'" y1="'+(y+8)+'" y2="'+(y+20)+'" stroke="var(--acc)" stroke-width="2"/><line x1="'+b+'" x2="'+b+'" y1="'+(y+8)+'" y2="'+(y+20)+'" stroke="var(--acc)" stroke-width="2"/>'+
         '<circle cx="'+X(-2)+'" cy="'+(y+14)+'" r="4.5" fill="var(--bad)"/>';});
    host.innerHTML=RD.svg(W,H,s,'95% intervals on a 2-point drop, unpaired and paired')+
      '<div class="an-cnt">'+RD.stat('One score, standard error',(100*se1).toFixed(1)+' pts','70% on 200 items')+
      RD.stat('Items to see 2 points, unpaired',nU.toLocaleString('en-US'),'per model')+RD.stat('Items to see 2 points, paired',nP.toLocaleString('en-US'),'if 10% of items disagree')+'</div>'+
      '<p class="small mute" style="margin:2px 0">Axis: change in pass rate, percentage points; dashed line is no change; red dot is the observed drop.</p>';
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
