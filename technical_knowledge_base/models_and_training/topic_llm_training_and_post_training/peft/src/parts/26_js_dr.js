// ---- Reading, DoRA (Fig. 7): one 2-D weight column turned 60 degrees at the same length, LoRA's additive path against DoRA's magnitude and direction, on one plot ----
// Illustrative geometry, not a trained model: LoRA moves the column's tip along the straight chord (its length dips to cos 30 degrees halfway);
// DoRA turns the unit direction along the arc and keeps the length m as its own number. Four steps, explained in the step list sx-dr.
(function(){
  const $=id=>document.getElementById(id);if(!$('dr'))return;
  const TH0=10*Math.PI/180,TURN=60*Math.PI/180;
  const w0=[Math.cos(TH0),Math.sin(TH0)],wt=[Math.cos(TH0+TURN),Math.sin(TH0+TURN)],mid=[(w0[0]+wt[0])/2,(w0[1]+wt[1])/2];
  const dip=(1-Math.hypot(mid[0],mid[1]))*100;
  document.querySelectorAll('[data-dr="dip"]').forEach(e=>e.textContent=dip.toFixed(0)+'%');
  function draw(i){
    const el=$('drP'),W=RD.width(el),H=Math.min(300,Math.max(230,W*.6)),s=Math.min(H*.74,W*.46),ox=Math.max(34,W*.3-s*.25),oy=H-30;
    const P=v=>[ox+s*v[0],oy-s*v[1]],ph=W<520,T=(a,b)=>ph?b:a;
    const arrow=(v,col,w,dash,lab,op,cls)=>{const p=P(v),a=Math.atan2(-(p[1]-oy),p[0]-ox),hx=p[0]-10*Math.cos(a-.4),hy=p[1]+10*Math.sin(a-.4),gx=p[0]-10*Math.cos(a+.4),gy=p[1]+10*Math.sin(a+.4);
      return '<g opacity="'+(op||1)+'"'+(cls?' class="'+cls+'"':'')+'><line x1="'+ox+'" y1="'+oy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="5 4"':'')+'/><path d="M'+p[0]+','+p[1]+'L'+hx+','+hy+'L'+gx+','+gy+'Z" fill="'+col+'"/>'+(lab?'<text x="'+(p[0]+7)+'" y="'+(p[1]-5)+'" font-size="12" fill="'+col+'">'+lab+'</text>':'')+'</g>'};
    let h='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="One weight column turned 60 degrees: LoRA along the chord, DoRA along the arc">';
    // the unit circle (same length) and the floor
    h+='<path d="M'+(ox+s)+','+oy+' A'+s+','+s+' 0 0 0 '+(ox+s*Math.cos(100*Math.PI/180))+','+(oy-s*Math.sin(100*Math.PI/180))+'" fill="none" stroke="var(--line)" stroke-dasharray="2 4"/>';
    h+='<line x1="'+(ox-10)+'" y1="'+oy+'" x2="'+(ox+s+14)+'" y2="'+oy+'" stroke="var(--line)"/>';
    if(!ph)h+='<text x="'+(ox+s*Math.cos(95*Math.PI/180)+6)+'" y="'+(oy-s*Math.sin(95*Math.PI/180)+4)+'" font-size="12" fill="var(--mute)">same length</text>';
    h+=arrow(w0,'var(--mute)',1.6,false,T('start, W₀ column','start'),.9)+arrow(wt,'var(--ink)',1.4,true,T('target, turned 60°','target'),.8);
    // LoRA: the tip moves along the chord; the BA column is the straight update; halfway the column is shorter
    if(i>=1){const a=P(w0),b=P(wt),m=P(mid),op=i===2?.35:1;
      h+='<g opacity="'+op+'"'+(i===1?' class="rd-new"':'')+'><line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="var(--c3)" stroke-width="3"/>'+
        '<text x="'+(a[0]+.22*(b[0]-a[0])+10)+'" y="'+(a[1]+.22*(b[1]-a[1])+2)+'" font-size="12" fill="var(--c3)">'+T('LoRA: + BA column','+ BA')+'</text>'+
        arrow(mid,'var(--c3)',2.2,false,'',1)+'<circle cx="'+m[0]+'" cy="'+m[1]+'" r="4" fill="var(--c3)"/><text x="'+(m[0]-8)+'" y="'+(m[1]-8)+'" text-anchor="end" font-size="12" fill="var(--c3)">'+T('halfway: '+dip.toFixed(0)+'% shorter',dip.toFixed(0)+'% shorter')+'</text></g>'}
    // DoRA: the direction turns along the arc at unit length; the magnitude m is a separate bar that does not move
    if(i>=2){const op=i===3?.9:1,arc=[];for(let k=0;k<=30;k++){const t=TH0+TURN*k/30;arc.push(P([Math.cos(t),Math.sin(t)]))}
      const th=TH0+TURN/2,u=[Math.cos(th),Math.sin(th)];
      h+='<g opacity="'+op+'"'+(i===2?' class="rd-new"':'')+'><path d="M'+arc.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join('L')+'" fill="none" stroke="var(--c4)" stroke-width="3"/>'+
        arrow(u,'var(--c4)',2.2,false,T('DoRA: direction, unit length','direction'),1);
      const bx=W-(ph?26:46),bh=s*.78;
      h+='<rect x="'+bx+'" y="'+(oy-bh)+'" width="18" height="'+bh+'" fill="var(--soft)" stroke="var(--line)"/><rect x="'+bx+'" y="'+(oy-bh/1.2)+'" width="18" height="'+(bh/1.2)+'" fill="var(--c5)"/><text x="'+(bx+9)+'" y="'+(oy+16)+'" text-anchor="middle" font-size="12" fill="var(--c5)">m</text></g>'}
    if(i===3)h+='<text x="'+(W-8)+'" y="18" text-anchor="end" font-size="12" font-weight="600" fill="var(--ink)" class="rd-new">both reach the target</text>';
    el.innerHTML=h+'</svg>';
    $('drN').innerHTML=RD.stat('LoRA, shortest on the way',i>=1?'−'+dip.toFixed(1)+'%':'not yet','length and angle move together')+RD.stat('DoRA, shortest on the way',i>=2?'0.0%':'not yet','length m is its own number');
  }
  RD.anim({card:'dr',ctl:'drCtl',n:4,draw,ms:4200,label:'Step of the DoRA figure',list:'sx-dr'});
  addEventListener('resize',()=>{try{draw(+document.getElementById('drCtl-s').value)}catch(e){}});
})();
