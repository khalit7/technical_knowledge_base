// ---- Media against the window (Reading) ----
(function(){
  const WIN=1048576;let res='lo';
  const hm=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.round((s%3600)/60);return h?(h+' h '+m+' min'):(m+' min')};
  function draw(){
    const g3=$('mdEra').value==='g3';
    const tMin=+$('mdT').value,t=tMin*60,f=+$('mdF').value;
    const r=g3?(res==='hi'?280:70):(res==='hi'?258:66),a=$('mdA').checked?(g3?25:32):0;
    const nI=+$('mdI').value,nP=+$('mdP').value;
    $('mdTv').textContent=tMin+' min';$('mdIv').textContent=fmt(nI);$('mdPv').textContent=fmt(nP);
    const btns=$('mdRes').querySelectorAll('button');btns[0].textContent=g3?'default / low (70)':'low (66)';btns[1].textContent=g3?'high (280)':'default (258)';
    const Nf=t*f*r,Na=t*a,Ni=nI*(g3?1120:258),Np=nP*(g3?560:258),N=Nf+Na+Ni+Np;
    const mv=$('mdM').value;let pin,pa,lab;
    if(mv==='pro'){pin=N>200000?4:2;pa=pin;lab='3.1 Pro at $'+pin+(N>200000?' (prompt above 200K)':'')}
    else if(mv==='fl31'){pin=0.25;pa=0.5;lab='3.1 Flash-Lite'}
    else {pin=+mv;pa=pin;lab='$'+pin+' per million'}
    const C=((N-Na)*pin+Na*pa)/1e6;
    const per=f*r+a,tmax=WIN/per;
    // stacked bar against the window
    const W=640,H=64,sc=v=>v/Math.max(WIN,N)*(W-10);let x=5,s='';
    [[Nf,'var(--acc)','video frames'],[Na,'var(--c3)','audio'],[Ni,'var(--c5)','images'],[Np,'var(--c4)','PDF pages']].forEach(([v,c,n])=>{if(v>0){s+='<rect x="'+x+'" y="16" width="'+Math.max(1,sc(v))+'" height="26" fill="'+c+'"><title>'+n+': '+fmt(v)+' tokens</title></rect>';x+=sc(v)}});
    const wx=5+sc(WIN);s='<rect x="5" y="16" width="'+(W-10)+'" height="26" fill="var(--soft)" stroke="var(--line)"/>'+s;
    s+='<line x1="'+wx+'" x2="'+wx+'" y1="8" y2="50" stroke="var(--ink)" stroke-width="2"/><text x="'+Math.min(wx,W-6)+'" y="62" font-size="11" text-anchor="end">1,048,576-token window</text>';
    if(N>WIN)s+='<text x="8" y="11" font-size="11" fill="var(--bad)" font-weight="600">over the window by '+fmt(N-WIN)+' tokens</text>';
    $('mdBar').innerHTML=svgEl(W,H,s,'Tokens against the window')+'<div class="leg"><span><i style="background:var(--acc)"></i>video frames '+fmt(Nf)+'</span><span><i style="background:var(--c3)"></i>audio '+fmt(Na)+'</span><span><i style="background:var(--c5)"></i>images '+fmt(Ni)+'</span><span><i style="background:var(--c4)"></i>PDF '+fmt(Np)+'</span></div>';
    $('mdOut').innerHTML=stat('Input tokens, N',fmt(N),t?fmt(t)+' s × ('+f+' × '+r+' + '+a+')'+(Ni+Np?' + images and pages':''):'')
      +stat('Share of the window',(N/WIN*100).toFixed(1)+'%',N>WIN?'does not fit':'fits, '+fmt(WIN-N)+' tokens left')
      +stat('Input cost, C','$'+C.toFixed(C<1?4:2),fmt(N)+' / 10⁶ × '+lab)
      +stat('Longest video that fits',hm(tmax),fmt(WIN)+' / '+per+' ≈ '+fmt(tmax)+' s (video alone)');
    // reproduction line
    const def=g3&&tMin===60&&f===1&&a===25&&!nI&&!nP&&mv==='0.75';
    if(g3){const n1=3600*95,n2=3600*305;
      $('mdPin').innerHTML='<div class="t">'+(def&&res==='lo'?'Defaults reproduce the worked example':'The worked example, for reference')+'</div>One hour at default: 3,600 × 95 = '+fmt(n1)+' tokens ('+(n1/WIN*100).toFixed(1)+'% of the window), $'+(n1/1e6*0.75).toFixed(4)+' at $0.75; at high 3,600 × 305 = '+fmt(n2)+', over by '+fmt(n2-WIN)+'. Longest at default '+fmt(Math.round(WIN/95))+' s, at high '+fmt(Math.round(WIN/305))+' s ({{media resolution|@media}}).'}
    else{const h1=WIN/(258+32)/3600,h2=WIN/(66+32)/3600;
      $('mdPin').innerHTML='<div class="t">Gemini 2.5 rates reproduce the report\'s "about 1 hour" and "about 3 hours"</div>With audio, the window holds '+fmt(WIN)+' / (258 + 32) = '+h1.toFixed(2)+' hours at 258 tokens per frame and '+fmt(WIN)+' / (66 + 32) = '+h2.toFixed(2)+' hours at 66 ({{Gemini 2.5 report|@g25}}).'}
  }
  ['mdT','mdF','mdA','mdI','mdP','mdM','mdEra'].forEach(id=>$(id).addEventListener('input',draw));
  segBind('mdRes',m=>{res=m;draw()});draw();
})();
