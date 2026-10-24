// ---- Reading: the triplet loss on the real batch. Squared distances 2 - 2 cos; zones hard / semi-hard / easy; margin slider ----
(function(){
  const el=document.getElementById('tr-svg');if(!el||!window.CSD)return;
  const D=CSD.rb,N0=D.s1.length,$=id=>document.getElementById(id);
  const st={m:'bert',a:30,al:0.2};
  const d=(i,j)=>2-2*D.M[st.m][i*N0+j]/1000;
  const XMAX={bert:1.2,simcse:2.0};
  // counts over every anchor and negative in the batch (exported for the check script)
  function batch(m,al){const keep=st.m;st.m=m;let hard=0,semi=0,easy=0,L=0;
    for(let i=0;i<N0;i++){const dp=d(i,i);for(let j=0;j<N0;j++){if(j===i)continue;const dn=d(i,j);
      if(dn<dp)hard++;else if(dn<dp+al)semi++;else easy++;L+=Math.max(0,dp-dn+al)}}
    st.m=keep;return {hard,semi,easy,active:hard+semi,mean:L/(N0*(N0-1))}}
  window.CS_TRIP=batch;
  function draw(){
    const W=RD.width(el),H=150,L=14,R=14,T=26,B=36,xm=XMAX[st.m],X=v=>L+Math.min(v,xm)/xm*(W-L-R),i=st.a,dp=d(i,i),al=st.al;
    let h='<rect x="'+X(0)+'" y="'+T+'" width="'+(X(dp)-X(0))+'" height="'+(H-T-B)+'" fill="var(--bad)" fill-opacity=".18"/>'+
      '<rect x="'+X(dp)+'" y="'+T+'" width="'+(X(dp+al)-X(dp))+'" height="'+(H-T-B)+'" fill="var(--c5)" fill-opacity=".28"/>';
    for(let t=0;t<=xm+1e-9;t+=0.2){const x=X(t);h+='<line x1="'+x+'" x2="'+x+'" y1="'+(H-B)+'" y2="'+(H-B+4)+'" stroke="var(--mute)"/><text x="'+x+'" y="'+(H-B+16)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+t.toFixed(1)+'</text>'}
    h+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--line)"/>';
    h+='<text x="'+((L+W-R)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" fill="var(--mute)">squared distance from the anchor, 2 − 2 cos</text>';
    const neg=[...Array(N0).keys()].filter(j=>j!==i).sort((p,q)=>d(i,p)-d(i,q));let hard=0,semi=0,easy=0,Ls=0;
    neg.forEach((j,k)=>{const dn=d(i,j),z=dn<dp?'hard':dn<dp+al?'semi':'easy';if(z==='hard')hard++;else if(z==='semi')semi++;else easy++;Ls+=Math.max(0,dp-dn+al);
      const y=T+10+(k%5)*((H-T-B-20)/4);
      h+='<circle cx="'+X(dn).toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="'+(z==='easy'?'var(--dim)':z==='hard'?'var(--bad)':'var(--c5)')+'" stroke="var(--ink)" stroke-opacity="'+(z==='easy'?0.25:0.7)+'"><title>'+RD.esc(D.s2[j])+': distance '+dn.toFixed(3)+'</title></circle>'});
    h+='<line x1="'+X(dp)+'" x2="'+X(dp)+'" y1="'+(T-4)+'" y2="'+(H-B)+'" stroke="var(--c3)" stroke-width="2.5"/><text x="'+Math.min(X(dp)+4,W-R-50)+'" y="'+(T-8)+'" font-size="11" fill="var(--c3)">positive</text>';
    h+='<text x="'+(L+2)+'" y="'+(T-8)+'" font-size="11" fill="var(--mute)">anchor</text>';
    el.innerHTML=PF.svg(W,H,'Negatives of one anchor placed by squared distance, with the margin zones',h);
    const b=batch(st.m,al);
    $('tr-av').textContent=al.toFixed(2);$('tr-an').textContent=(i+1);
    $('tr-as').innerHTML='<b>Anchor:</b> '+RD.esc(D.s1[i])+' <b>Positive:</b> '+RD.esc(D.s2[i]);
    $('tr-cnt').innerHTML=RD.stat('this anchor: hard / semi-hard',hard+' / '+semi,'of 47 negatives; the rest give nothing')+RD.stat('this anchor: loss',Ls.toFixed(3),'sum over its 47 triplets; positive at '+dp.toFixed(3))+
      RD.stat('whole batch: active triplets',b.active.toLocaleString('en-US')+' of 2,256',b.hard+' hard, '+b.semi+' semi-hard')+RD.stat('whole batch: mean loss',b.mean.toFixed(4),'per triplet');
  }
  $('tr-a').addEventListener('input',e=>{st.a=+e.target.value-1;draw()});
  $('tr-al').addEventListener('input',e=>{st.al=+e.target.value/100;draw()});
  PF.seg($('tr-m'),'m',v=>{st.m=v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
