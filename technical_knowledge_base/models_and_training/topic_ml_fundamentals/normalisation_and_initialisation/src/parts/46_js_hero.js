// ---- Reading, top: the hero. Measured mean square after each of 20 ReLU layers (width 512), one line per init, log scale ----
(function(){
  const svg=document.getElementById('hr-svg');if(!svg||!window.NID||!NID.hero)return;
  const H0=NID.hero;
  // [key, label, colour, highlighted]
  const S=[['default_ln','default + LayerNorm','var(--hlc)',1],['orth','orthogonal, gain √2','var(--c6)',0],['he','He','var(--c3)',0],
    ['xavier','Xavier','var(--c1)',0],['default','PyTorch default','var(--c2)',0],['n002','N(0, 0.02)','var(--c4)',0]];
  const sup=e=>String(e).replace('-','⁻').split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)]||c).join('');
  const fe=v=>v>=0.1?v.toFixed(2):v.toExponential(1).replace(/e(-?)(\d+)/,(m,s,d)=>' × 10'+sup(s+d));
  function draw(){
    const W=Math.max(300,Math.min(860,RD.width(svg.parentNode))),narrow=W<520,H=narrow?280:300;
    const pad={l:44,r:narrow?112:190,t:26,b:30};svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);
    const lo=-21,hi=1,lx=k=>pad.l+k/20*(W-pad.l-pad.r),ly=v=>pad.t+(hi-Math.log10(v))/(hi-lo)*(H-pad.t-pad.b);
    let h='';
    for(let e=hi;e>=lo;e-=(narrow?6:3)){const Y=ly(Math.pow(10,e));h+='<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+Y+'" y2="'+Y+'" stroke="var(--line)"/>'+RD.t(pad.l-4,Y+3,e===0?'1':'10'+sup(e),{a:'end',fs:10.5,fill:'var(--mute)'})}
    const Y1=ly(1);h+='<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+Y1+'" y2="'+Y1+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    [0,5,10,15,20].forEach(k=>{h+=RD.t(lx(k),H-pad.b+14,k,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    h+=RD.t((pad.l+W-pad.r)/2,H-3,'layer',{a:'middle',fs:11,fill:'var(--mute)'});
    h+=RD.t(pad.l,pad.t-12,'mean square of the activations (log)',{fs:11,fill:'var(--mute)'});
    // end labels, pushed apart vertically
    const ends=S.map(s=>({s,y:ly(H0[s[0]][20])})).sort((a,b)=>a.y-b.y);
    for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<13)ends[i].y=ends[i-1].y+13;
    S.forEach(s=>{const v=H0[s[0]];h+='<path d="M'+v.map((x,k)=>lx(k).toFixed(1)+' '+ly(x).toFixed(1)).join('L')+'" fill="none" stroke="'+s[2]+'" stroke-width="'+(s[3]?3:1.8)+'"/>'});
    ends.forEach(e=>{const s=e.s,v=H0[s[0]][20];h+='<line x1="'+lx(20)+'" y1="'+ly(v)+'" x2="'+(lx(20)+6)+'" y2="'+e.y+'" stroke="'+s[2]+'"/>'+
      RD.t(lx(20)+8,e.y+3.5,(narrow?s[1].replace('PyTorch ','').replace(', gain √2',''):s[1])+(narrow?'':' '+fe(v)),{fs:narrow?10.5:11,fill:s[2],w:s[3]?600:400})});
    svg.innerHTML=h}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
// a closed block that opens redraws the Reading visuals inside it at their real width
document.querySelectorAll('#t-read details.dp').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)((window.TAB_RENDER||{})['t-read']||[]).forEach(f=>{try{f()}catch(e){}})}));
