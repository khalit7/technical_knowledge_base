// ---- Mixing lab: the same token budget before and after a mid-training stage (OLMo 2 7B), and final-stage sizes by lab
(function(){
  const X=window.MXX,D=window.MXD,$=X.$;if(!$('mx-st'))return;
  const O=D.olmo2,PRE=O.pre,MID=O.mid,TOT=PRE+MID;
  const G=['web','hqweb','code','papers','wiki','instr','math'];
  const s1=g=>O.stage1[g]||0,s2=g=>O.stage2[g]||0;
  const stat={};G.forEach(g=>stat[g]=(s1(g)*PRE+s2(g)*MID)/TOT);
  const S={mode:'staged',x0:0,step:0};
  const CAP={
    staged:['The whole budget to scale: 4T tokens of pretraining, then 50B tokens of mid-training, the thin sliver at the right edge (1.2% of the run).',
      'Zoom on the last 200B tokens. At 4T the mixture switches: plain DCLM web gives way to its best-scored slice, instruction data (FLAN), Q&amp;A, papers, Wikipedia and a math mix.',
      'Math only. In pretraining math is about 0.6% of every batch; in mid-training it is about a fifth. The final 1.2% of the run carries about 30% of all the math tokens the model sees.',
      'The learning rate (sketch): cosine decay through pretraining, then a linear decay to zero during mid-training. The best data arrives while the steps get smallest.',
      'Same model size, nearly the same budget, very different order. Wikipedia illustrates the repetition: the 50B mix uses the whole 3.7B-token source again, a second pass on top of stage 1.'],
    static:['The same tokens as one static mix: every group keeps the same share from the first batch to the last.',
      'Zoom on the last 200B tokens: nothing changes at 4T. The high-quality slice, instruction data and math mix are spread thinly over the whole run.',
      'Math only. It is about 0.86% of every batch, so the final 50B tokens carry only about 0.4B math tokens, 1.2% of the math.',
      'The learning rate (sketch) is the same; only the data order differs. By the time the steps are small, the batches look like every earlier batch.',
      'Same tokens per group, same budget. The staged order puts the scarce data where it is seen last and at a low learning rate; that, not more data, is the difference.']};
  function lr(x){if(x<=PRE){const k=x/PRE;return .1+.9*(1+Math.cos(Math.PI*k))/2}return .1*(1-(x-PRE)/MID)}
  function draw(){
    const el=$('mx-st');const w=X.width(el),pl=8,pr=8,pt=10,pb=34,h=230,W=w-pl-pr,Hh=h-pt-pb;
    const x0=S.x0,x1=TOT,xs=v=>pl+W*(v-x0)/(x1-x0),ys=v=>pt+Hh*(1-v);
    const fade=g=>S.step>=2&&g!=='math'?' opacity=".18"':'';let b='';
    const segs=S.mode==='staged'?[[0,PRE,s1],[PRE,TOT,s2]]:[[0,TOT,g=>stat[g]]];
    segs.forEach(([a,c,f])=>{const A=Math.max(a,x0),C=Math.min(c,x1);if(C<=A)return;let y=1;
      G.forEach(g=>{const v=f(g);if(!v)return;b+=X.rect(xs(A),ys(y),xs(C)-xs(A),Hh*v,X.COL[g],fade(g));
        if(S.step>=1&&xs(C)-xs(A)>60&&Hh*v>13&&!(S.step>=2&&g!=='math'))b+=X.t((xs(A)+xs(C))/2,ys(y)+Hh*v/2+4,X.NAME[g]+' '+X.pct(v,v<.1?1:0),{a:'middle',fs:10.5,fill:'#fff',w:600});y-=v})});
    if(S.step>=2){ // math band outline so the thin band is visible
      segs.forEach(([a,c,f])=>{const A=Math.max(a,x0),C=Math.min(c,x1);if(C<=A)return;const v=f('math');if(Hh*v<13&&xs(C)-xs(A)>90)b+=X.t((xs(A)+xs(C))/2,ys(v)-5,'Math '+X.pct(v,2),{a:'middle',fs:11,w:600});b+='<rect x="'+xs(A).toFixed(1)+'" y="'+ys(v).toFixed(1)+'" width="'+(xs(C)-xs(A)).toFixed(1)+'" height="'+(Hh*v).toFixed(1)+'" fill="none" stroke="var(--ink)" stroke-width="1"/>'})}
    if(S.mode==='staged'&&PRE>x0){const xb=xs(PRE);b+='<line x1="'+xb+'" x2="'+xb+'" y1="'+pt+'" y2="'+(h-pb+4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'}
    if(S.step>=3){let p='';for(let i=0;i<=160;i++){const x=x0+(x1-x0)*i/160;p+=(i?'L':'M')+xs(x).toFixed(1)+','+ys(lr(x)*.95).toFixed(1)}
      b+='<path d="'+p+'" fill="none" stroke="var(--ink)" stroke-width="2.2"/>'+X.t(w-pr-2,pt+12,'learning rate (sketch)',{a:'end',fs:10.5,w:600})}
    const ticks=[];const span=x1-x0,stp=span>1e12?1e12:span>3e11?1e11:5e10;for(let v=Math.ceil(x0/stp)*stp;v<=x1+1;v+=stp)ticks.push(v);
    ticks.forEach(v=>{b+=X.t(xs(v),h-pb+14,X.tok(v),{a:v===x0?'start':xs(x1)-xs(v)<16?'end':'middle',fs:10,fill:'var(--mute)'})});
    b+=X.t(pl+W/2,h-4,'tokens trained (position in the run)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=X.svg(w,h,b,'Mixture over the run, OLMo 2 7B');
    $('mx-st-cap').innerHTML='<b>Step '+(S.step+1)+' of 5.</b> '+CAP[S.mode][S.step];
    const mathMid=S.mode==='staged'?O.math_mid*1e9:stat.math*MID,mathAll=(O.math_pre+O.math_mid)*1e9;
    $('mx-st-stats').innerHTML=X.stat('Final stage','50B of '+X.tok(TOT),X.pct(O.mid_frac,1)+' of the run')+
      X.stat('Math in the final 50B',X.tok(mathMid),X.pct(mathMid/MID,mathMid/MID<.1?2:1)+' of those tokens')+
      X.stat('Share of all math seen there',X.pct(mathMid/mathAll,1),'of '+X.tok(mathAll)+' math tokens in the run')+
      X.stat('Wikipedia in the final 50B',X.tok(S.mode==='staged'?O.wiki_mid*1e9:stat.wiki*MID),'source 3.7B tokens');
  }
  $('mx-st-leg').innerHTML=G.map(g=>'<span><span class="mx-sw" style="background:'+X.COL[g]+'"></span>'+X.NAME[g]+'</span>').join('');
  let stop=()=>{};
  function go(i){const target=i>=1?TOT-2e11:0;S.step=i;stop();
    if(S.x0!==target){const from=S.x0;stop=X.tween(from,target,900,v=>{S.x0=v;draw()})}else draw()}
  const A=X.anim({card:'mx-st-card',ctl:'mx-st-ctl',n:5,ms:3200,label:'Staging animation step',draw:go});
  X.seg($('mx-st-mode'),m=>{S.mode=m;A.redraw()});
  X.onRender(draw);
  // predict 2
  $('mx-pr2-a').innerHTML='About '+Math.round(100*O.math_mid_share)+'%: '+X.tok(O.math_mid*1e9)+' of the '+X.tok((O.math_pre+O.math_mid)*1e9)+' math tokens arrive in the final 50B (<span class="lbl der">derived</span> from Tables 4 and 13: stage 1 math = OpenWebMath plus Algebraic Stack, 24.0B of the 3.90T mix, scaled to 4T; stage 2 math = 20.8% of 50B). Play the animation above, step 3.';
  X.predict('mx-pr2');
  // souping fractions
  const s7=3*50e9/(4e12+3*50e9),s13=(3*100e9+300e9)/(5e12+3*100e9+300e9);
  $('mx-soup7').textContent=X.pct(s7,1)+' of all tokens trained, derived';$('mx-soup13').textContent=X.pct(s13,1)+', derived, with 5T of pretraining';
  // ---------- final-stage sizes by lab (log scale)
  function drawLate(){const el=$('mx-late');const L=D.late;const w=X.width(el),narrow=w<520,lw=narrow?0:120,rh=narrow?40:26,pb=22,h=L.length*rh+pb,bw=w-lw-62;
    const lo=-7,hi=0,x=f=>lw+bw*(Math.log10(f)-lo)/(hi-lo);let b='';
    [1e-6,1e-4,1e-2,1].forEach(f=>{b+='<line x1="'+x(f)+'" x2="'+x(f)+'" y1="0" y2="'+(h-pb)+'" stroke="var(--line)"/>'+X.t(x(f),h-6,{1e-6:'0.0001%',1e-4:'0.01%',1e-2:'1%',1:'100%'}[f],{a:f===1?'end':'middle',fs:10,fill:'var(--mute)'})});
    L.forEach((r,i)=>{const y=i*rh+(narrow?16:4);if(narrow)b+=X.t(2,y-3,r.name+': '+r.what,{fs:10.5});else b+=X.t(lw-6,y+13,r.name,{a:'end',fs:11});
      b+=X.rect(lw,y+2,x(r.frac)-lw,rh-(narrow?22:10),'var(--c6)')+X.t(x(r.frac)+4,y+13,X.pct(r.frac,r.frac<1e-3?5:r.frac<.1?1:0),{fs:10.5,w:600});
      if(!narrow)b+='<title>'+X.esc(r.what+' ('+r.src+')')+'</title>'});
    el.innerHTML=X.svg(w,h,b,'Final stage as a fraction of the run, by lab')+'<div class="small mute">'+L.map(r=>'<a href="'+r.url+'" target="_blank" rel="noopener noreferrer">'+X.esc(r.name)+'</a>: '+X.esc(r.what)+' of '+X.tok(r.total)).join('; ')+'.</div>'}
  X.onRender(drawLate);drawLate();
})();
