// ---- Reading, hero: what each strategy does with the same evidence (left) and what it costs over 10,000 pulls (right). Static. ----
(function(){
  const D=window.BXD,$=id=>document.getElementById(id);if(!D||!$('hr-A'))return;
  const H=D.hero,A=H.arms,COL={greedy:'var(--c2)',eps:'var(--c1)',ucb1:'var(--c3)',ts:'var(--c4)'};
  const LAB={greedy:'greedy',eps:'ε-greedy',ucb1:'UCB1',ts:'Thompson'};
  function arms(){const el=$('hr-A'),W=RD.width(el),Ht=250,l=34,r=8,t=26,b=40,K=3,hi=1.8;
    const Y=v=>t+(Ht-t-b)*(hi-Math.min(hi,v))/hi,cw=(W-l-r)/K;let s='';
    [0,0.5,1,1.5].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.n(v,1),{a:'end',fs:10,fill:'var(--mute)'})});
    const g=A.w.map((w,k)=>w/A.n[k]),gi=g.indexOf(Math.max(...g)),ui=A.ucb.indexOf(Math.max(...A.ucb));
    for(let k=0;k<K;k++){const cx=l+k*cw+cw/2,bw=Math.min(34,cw*0.36);
      s+='<rect x="'+(cx-bw/2)+'" y="'+Y(g[k])+'" width="'+bw+'" height="'+(Y(0)-Y(g[k]))+'" fill="'+(k===gi?'var(--c2)':'var(--c1)')+'" opacity="'+(k===gi?1:.6)+'"/>';
      s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+Y(g[k])+'" y2="'+Y(A.ucb[k])+'" stroke="var(--c3)" stroke-width="2.4"/><line x1="'+(cx-8)+'" x2="'+(cx+8)+'" y1="'+Y(A.ucb[k])+'" y2="'+Y(A.ucb[k])+'" stroke="var(--c3)" stroke-width="2.4"/>';
      s+=RD.t(cx+10,Y(A.ucb[k])+4,RD.n(A.ucb[k],2),{fs:10.5,fill:'var(--c3)',w:k===ui?600:400});
      s+=RD.t(cx-5,Y(g[k])-5,RD.n(g[k],2),{a:'end',fs:10.5,w:600});
      s+=RD.t(cx,Ht-24,'arm '+'ABC'[k]+', n = '+A.n[k],{a:'middle',fs:11,w:600});
      s+=RD.t(cx,Ht-9,'Thompson '+(A.ts[k]<0.01?RD.n(100*A.ts[k],1):Math.round(100*A.ts[k]))+'%',{a:'middle',fs:10.5,fill:'var(--c4)'})}
    s+=RD.t(l,13,'bar: estimate Q (wins / pulls); green: Q + √(2 ln t / n), t = '+A.t,{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,Ht,s,'Three arms: estimates, upper confidence bounds and Thompson sampling choice probabilities')}
  function regret(){const el=$('hr-R'),ser=['greedy','eps','ucb1','ts'].map(k=>({k,col:COL[k],w:k==='ts'||k==='ucb1'?2.6:2,xs:[0].concat(H.marks),ys:[0].concat(H.m[k])}));
    const ymax=700,narrow=RD.width(el)<330;
    RD.chart(el,ser,{x0:0,x1:10000,y0:0,y1:ymax,xt:[[0,'0'],[5000,'5,000'],[10000,'10,000']],yt:[[0,'0'],[200,'200'],[400,'400'],[600,'600']],xlab:'pulls',ylab:'expected regret (reward lost)',H:250,label:'Expected regret over 10,000 pulls',
      extra:(X,Yf,W)=>{let s='';const ends=ser.map(se=>[se.k,Yf(se.ys.at(-1))]).sort((a,b)=>a[1]-b[1]);for(let j=1;j<ends.length;j++)if(ends[j][1]-ends[j-1][1]<15)ends[j][1]=ends[j-1][1]+15;
        ends.forEach(([k,y])=>{const v=H.m[k].at(-1);s+=RD.t(W-14,y-4,LAB[k]+' '+Math.round(v),{a:'end',fs:narrow?10.5:11,fill:COL[k],w:600})});
        return s}})}
  function draw(){arms();regret()}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
