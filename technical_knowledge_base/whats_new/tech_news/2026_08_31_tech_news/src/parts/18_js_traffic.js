// ---- AI referrals against organic search: sessions on one axis, key events on another ----
(function(){
  const card=$('v-traffic');if(!card)return;
  const O0=140.1,O1=125.4,AIg=0.8,A0=AIg/1.63,A1=A0+AIg; // million sessions (AI split derived)
  const AIke=0.134*(A0+A1),K0=AIke/5.35,K1=AIke-K0;       // million AI key events: after = 4.35 x before, period rate 13.4%
  function panel(W,title,rows,max,unit,ticks){const narrow=W<560,lw=narrow?10:150,pr=narrow?70:90,rh=narrow?34:24,top=20,H=top+rows.length*rh+22;
    const X=v=>lw+(W-lw-pr)*v/max;let s='<text x="0" y="12" font-size="12" font-weight="600">'+title+'</text>';
    ticks.forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+top+'" y2="'+(top+rows.length*rh)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(top+rows.length*rh+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    rows.forEach((r,i)=>{const yb=top+i*rh,y=yb+(narrow?16:4),h=narrow?12:15;
      s+=narrow?'<text x="0" y="'+(y-3)+'" font-size="11" fill="var(--mute)">'+r[0]+'</text>':'<text x="'+(lw-8)+'" y="'+(y+h-3)+'" font-size="12" text-anchor="end">'+r[0]+'</text>';
      s+='<rect x="'+X(0)+'" y="'+y+'" width="'+Math.max(1.5,X(r[1])-X(0))+'" height="'+h+'" rx="2" fill="'+r[2]+'"/><text x="'+(X(r[1])+5)+'" y="'+(y+h-3)+'" font-size="11" fill="var(--ink)">'+r[3]+'</text>'});
    return svgEl(W,H,s,title)}
  function draw(){
    const ro=+$('trRate').value/100,W=boxW($('trSvg'),340);$('trRateV').textContent=fmt(ro*100,1)+'%';
    const E0=O0*ro,E1=O1*ro,mx=Math.max(16,Math.ceil(E0/8)*8);
    const a=panel(W,'Sessions, millions',[['Organic, before',O0,'var(--dim)',fmt(O0,1)],['Organic, after',O1,'var(--c1)',fmt(O1,1)],['AI referrals, before',A0,'var(--dim)',fmt(A0,2)],['AI referrals, after',A1,'var(--c3)',fmt(A1,2)+' (+163%)']],150,'M',[0,50,100,150]);
    const b=panel(W,'Key events, millions',[['Organic, before',E0,'var(--dim)',fmt(E0,2)],['Organic, after',E1,'var(--c1)',fmt(E1,2)],['AI referrals, before',K0,'var(--dim)',fmt(K0,3)],['AI referrals, after',K1,'var(--c3)',fmt(K1,3)+' (+335%)']],mx,'M',[0,mx/4,mx/2,3*mx/4,mx]);
    $('trSvg').innerHTML=a+'<div style="height:6px"></div>'+b;
    const lostE=E0-E1,gainE=K1-K0;
    $('trStats').innerHTML=stat('Sessions: AI made up',fmt(100*AIg/(O0-O1),1)+'%','of the 14.7 million organic sessions lost (Brainlabs: "around 5%")')+
      stat('Key events: AI made up',fmt(100*gainE/lostE,1)+'%','of '+fmt(lostE,2)+' million organic key events lost, at the rate on the slider')+
      stat('All search and AI together','sessions '+fmt(100*((O1+A1)/(O0+A0)-1),1)+'% · key events '+fmt(100*((E1+K1)/(E0+K0)-1),1)+'%','after against before');
  }
  $('trRate').addEventListener('input',draw);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);draw();
})();
