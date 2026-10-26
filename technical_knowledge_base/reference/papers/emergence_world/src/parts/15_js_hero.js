// ---- Hero figure (light pass 2026-10-25), static: six of Table 7's nine phishing criteria for the seven exposed worlds,
// split into "noticed" (P7 community warning, P5 scope and identity check) and "stopped" (P1 non-engagement, P4 action restraint,
// P6 trace removal, P9 ongoing vigilance), with each world's printed total out of nine.
(function(){const el=$('heroSvg');if(!el)return;
  const t7=TB.t7,ix=c=>t7.crit.indexOf(c);
  const L=[['P7','warned','community warning'],['P5','checked','scope and identity checked']],R=[['P1','no fetch','never engaged with the payload'],['P4','no action','never acted on it'],['P6','cleaned','removed the public traces'],['P9','watched','watched for a return']];
  const W=Object.keys(t7.rows).filter(k=>t7.rows[k]);
  fit(el,w=>{const nar=w<560,lw=nar?66:84,tw=nar?34:56,gap=nar?10:24,n=L.length+R.length,cw=(w-lw-tw-gap-4)/n,rh=nar?24:26,top=nar?38:46;let s='';
    const cx=i=>lw+(i<L.length?i*cw:gap+i*cw)+cw/2;
    s+=tx(lw+L.length*cw/2,12,'noticed',{fs:12.5,a:'middle',w:700,c:'var(--good)'});
    s+=tx(lw+gap+L.length*cw+R.length*cw/2,12,'stopped',{fs:12.5,a:'middle',w:700,c:'var(--bad)'});
    [...L,...R].forEach((c,i)=>{s+=tx(cx(i),nar?top-12:top-22,c[0],{fs:11.5,a:'middle',w:600});if(!nar)s+=tx(cx(i),top-9,c[1],{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(w-4,top-9,nar?'of 9':'total /9',{fs:11,a:'end',c:'var(--mute)'});
    const x0=lw+gap+L.length*cw-gap/2;s+='<line x1="'+x0.toFixed(1)+'" y1="'+(top-30)+'" x2="'+x0.toFixed(1)+'" y2="'+(top+W.length*rh-4)+'" stroke="var(--line)" stroke-width="1.2"/>';
    W.forEach((k,r)=>{const y=top+r*rh,row=t7.rows[k];s+=tx(4,y+12,k,{fs:12.5});
      [...L,...R].forEach((c,i)=>{const v=row[ix(c[0])],x=cx(i),rad=nar?6.5:7.5;
        s+=v?'<circle cx="'+x.toFixed(1)+'" cy="'+(y+8)+'" r="'+rad+'" fill="var(--good)"/>':'<circle cx="'+x.toFixed(1)+'" cy="'+(y+8)+'" r="'+(rad-1)+'" fill="none" stroke="var(--bad)" stroke-width="2"/>'});
      s+=tx(w-4,y+12,String(row[row.length-1]),{fs:12.5,a:'end',w:700})});
    el.innerHTML=svgW(w,top+W.length*rh,s,'Phishing scorecard: all seven worlds warned, none removed traces or kept watching')})})();
