// ---- Reading: one model, many ASRs (HarmBench standard test behaviours) ----
(function(){
  const H=window.HB,host=document.getElementById('hb-mini');if(!host||!H)return;
  const PICK=['Llama 2 7B Chat','Llama 2 70B Chat','Claude 2.1','Claude 1','GPT-4 0613','GPT-4 Turbo 1106','GPT-3.5 Turbo 1106','Gemini Pro','Mixtral 8x7B','Vicuna 7B','Mistral 7B','Zephyr 7B','R2D2 (Ours)'];
  const V=H.v.test_standard,dr=H.attacks.indexOf('DR');
  function draw(){const w=Math.min(860,RD.width(host)),lw=Math.min(150,Math.round(w*0.34)),x0=lw+6,x1=w-10,rh=20,top=20;
    const X=v=>x0+(x1-x0)*v/100;let b='';
    [0,25,50,75,100].forEach(t=>{b+='<line x1="'+X(t)+'" y1="'+(top-4)+'" x2="'+X(t)+'" y2="'+(top+PICK.length*rh)+'" stroke="var(--line)"/>'+RD.t(X(t),12,t+'%',{a:t===100?'end':'middle',fs:10,fill:'var(--mute)'})});
    PICK.forEach((m,k)=>{const i=H.models.indexOf(m);if(i<0)return;const r=V[i].filter(x=>x!=null),y=top+k*rh+rh/2;const lo=Math.min(...r),hi=Math.max(...r);
      b+=RD.t(lw,y+4,RD.esc(m==='R2D2 (Ours)'?'Zephyr 7B + R2D2':m),{a:'end',fs:11});
      b+='<line x1="'+X(lo)+'" y1="'+y+'" x2="'+X(hi)+'" y2="'+y+'" stroke="var(--dim)" stroke-width="6" stroke-linecap="round"/>';
      V[i].forEach((x,a)=>{if(x==null)return;b+='<circle cx="'+X(x).toFixed(1)+'" cy="'+y+'" r="'+(a===dr?4.5:3)+'" fill="'+(a===dr?'var(--acc)':'var(--bad)')+'" opacity="'+(a===dr?1:.65)+'"><title>'+H.attacks[a]+': '+x.toFixed(1)+'%</title></circle>'})});
    host.innerHTML=RD.svg(w,top+PICK.length*rh+4,b,'Attack success rate range per model')+'<div class="leg"><span><i style="background:var(--acc)"></i>direct request (no attack)</span><span><i style="background:var(--bad)"></i>one attack</span></div>'}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
