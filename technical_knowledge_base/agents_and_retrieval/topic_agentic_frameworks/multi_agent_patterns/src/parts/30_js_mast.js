// Section 10: MAST (Cemri et al., arXiv 2503.13657 v3, Figure 1): 14 failure modes in 3 categories, bar length = prevalence
// over 1642 traces as printed in the paper. Category totals are sums of the printed mode shares (derived).
// "near": this page's nearest case, our reading, with its section.
(function(){
  const el=document.getElementById('fm-mast');if(!el)return;
  const C=[
    ['System design issues','var(--c1)',[['1.1','Disobey task specification',11.8,'section 5: reports outside the brief'],['1.2','Disobey role specification',1.5],['1.3','Step repetition',15.7],['1.4','Loss of conversation history',2.8],['1.5','Unaware of termination conditions',12.4]]],
    ['Inter-agent misalignment','var(--c4)',[['2.1','Conversation reset',2.2],['2.2','Fail to ask for clarification',6.8],['2.3','Task derailment',7.4],['2.4','Information withholding',0.85],['2.5',"Ignored other agent's input",1.9],['2.6','Reasoning-action mismatch',13.2,'section 6: reply promised a refund never issued']]],
    ['Task verification','var(--c2)',[['3.1','Premature termination',6.2,'section 3: "comprehensive" after half'],['3.2','No or incomplete verification',8.2],['3.3','Incorrect verification',9.1,'section 5: checkers kept all 186']]]];
  function draw(){
    const W=RD.width(el),narrow=W<600,max=16;
    const lw=narrow?0:236,vw=40,bw=W-lw-vw-6;let y=0,s='';
    const x=v=>lw+bw*v/max;
    C.forEach(([cat,colr,ms])=>{
      const tot=ms.reduce((a,m)=>a+m[2],0);
      s+=RD.t(0,y+14,cat+': '+tot.toFixed(1)+'% of failures',{fs:12.5,w:600});y+=22;
      ms.forEach(m=>{
        const rowH=narrow?(m[3]?48:32):(m[3]?34:22);
        const by=narrow?y+15:y+2,label='FM-'+m[0]+' '+m[1];
        s+=RD.t(narrow?0:0,narrow?y+11:y+13,label,{fs:11,fill:'var(--ink)'});
        s+='<rect x="'+x(0)+'" y="'+by+'" width="'+Math.max(1,x(m[2])-x(0))+'" height="13" rx="2" fill="'+colr+'"'+(m[3]?' stroke="var(--ink)" stroke-width="1.6"':'')+' opacity=".85"><title>'+label+': '+m[2]+'%</title></rect>';
        s+=RD.t(x(m[2])+4,by+11,m[2]+'%',{fs:11,fill:'var(--mute)'});
        if(m[3])s+=RD.t(x(0),by+27,m[3],{fs:11,fill:'var(--ink)'});
        y+=rowH});
      y+=6});
    el.innerHTML=RD.svg(W,y,s,'MAST failure modes by prevalence');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
