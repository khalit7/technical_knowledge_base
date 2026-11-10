// ---- Reading: the static 2D figures (hero, reward-model agreement, online or offline, recipes); the mechanisms are 3D stages (31 to 34) ----
// Every number drawn here is a published figure quoted in the prose beside it, or derived from inputs/derived.json (window.AL_DATA).
// Nothing moves: they are static figures, redrawn at the measured width.
window.AL_FIG=(function(){
  const E=RD.esc;
  const tx=(x,y,s,c,a)=>'<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(c?' class="'+c+'"':'')+(a?' text-anchor="'+a+'"':'')+'>'+s+'</text>';
  const rect=(x,y,w,h,c,extra)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="5"'+(c?' class="'+c+'"':'')+(extra||'')+'/>';
  const head=(x,y,dir)=>{const d=5;return dir==='down'?'<path d="M'+(x-d)+' '+(y-d)+' L'+x+' '+y+' L'+(x+d)+' '+(y-d)+'" class="arr"/>':
    dir==='up'?'<path d="M'+(x-d)+' '+(y+d)+' L'+x+' '+y+' L'+(x+d)+' '+(y+d)+'" class="arr"/>':
    dir==='right'?'<path d="M'+(x-d)+' '+(y-d)+' L'+x+' '+y+' L'+(x-d)+' '+(y+d)+'" class="arr"/>':'<path d="M'+(x+d)+' '+(y-d)+' L'+x+' '+y+' L'+(x+d)+' '+(y+d)+'" class="arr"/>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w.toFixed(0)+' '+h.toFixed(0)+'" width="'+w.toFixed(0)+'" height="'+h.toFixed(0)+'" role="img" aria-label="'+E(label)+'">'+body+'</svg>';
  const stat=RD.stat;
  return {tx,rect,head,svg,stat};
})();

// Hero: Tulu 3 8B, stage by stage
(function(){
  const el=document.getElementById('heroSvg');if(!el)return;const F=window.AL_FIG;
  const S=[
    {t:'Base model',r:'the next token of web text',d:'Llama 3.1 8B',m:'pretrained, not tuned',o:'→ continues the text'},
    {t:'1 · SFT',r:'imitating a written answer',d:'939,344 prompts, 2 epochs',m:'fixed data, 1 model',o:'→ answers in the template'},
    {t:'2 · Preference (DPO)',r:'the answer a judge preferred',d:'271K pairs, 1 epoch',m:'fixed pairs, 2 models',o:'→ the answers judges prefer'},
    {t:'3 · RLVR (PPO)',r:'an answer a checker accepts',d:'30K prompts, reward 10 or 0',m:'own samples, 3 models',o:'→ answers that pass checks'}];
  function draw(){
    const W=Math.min(RD.width(el),900),wide=W>=800;let g='',H;
    const lines=(s,x,y,a)=>F.tx(x,y,s.t,'t12',a)+F.tx(x,y+16,s.r,'a',a)+F.tx(x,y+31,s.d,'',a)+F.tx(x,y+46,s.m,'m',a)+F.tx(x,y+61,s.o,'',a);
    if(wide){const gap=22,bw=(W-2-3*gap)/4,bh=88;H=bh+4;
      S.forEach((s,i)=>{const x=1+i*(bw+gap);g+=F.rect(x,1,bw,bh,i?'box':'box',i===0?' stroke-dasharray="4 3"':'')+lines(s,x+8,17);
        if(i<3){const ax=x+bw+3,ay=1+bh/2;g+='<line x1="'+ax+'" y1="'+ay+'" x2="'+(ax+gap-6)+'" y2="'+ay+'" class="arr"/>'+F.head(ax+gap-6,ay,'right')}});
    }else{const bh=88,gap=18,bw=W-2;H=4*bh+3*gap+2;
      S.forEach((s,i)=>{const y=1+i*(bh+gap);g+=F.rect(1,y,bw,bh,'box',i===0?' stroke-dasharray="4 3"':'')+lines(s,10,y+16);
        if(i<3){const ay=y+bh+2,ax=W/2;g+='<line x1="'+ax+'" y1="'+ay+'" x2="'+ax+'" y2="'+(ay+gap-5)+'" class="arr"/>'+F.head(ax,ay+gap-5,'down')}})}
    el.innerHTML=F.svg(W,H,g,'Tulu 3 8B post-training pipeline: base model, SFT, DPO, RLVR, with what each stage rewards, its data, what it learns from and the resulting behaviour');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();

// Reward model: the agreement ceiling (the ranking and its six pairs are the stage in 32_js_sc_rm.js)
(function(){
  const el=document.getElementById('rmSvg');if(!el)return;const F=window.AL_FIG;
  const BARS=[['Labeller vs labeller (training labellers)',72.6,1.5],['RM vs training labellers',72.4,0.4],['RM vs held-out labellers',69.6,0.9]];
  function draw(){
    const W=Math.min(RD.width(el),760);let g='';
    const bwid=W-60,X=v=>bwid*v/100;
    g+=F.tx(0,13,'How often two judges agree (InstructGPT)','t12');
    BARS.forEach((b,i)=>{const y=28+i*46;g+=F.tx(0,y+10,b[0],'m');
      g+='<rect x="0" y="'+(y+16)+'" width="'+bwid+'" height="16" fill="var(--soft)" stroke="var(--line)"/>';
      g+='<rect x="0" y="'+(y+16)+'" width="'+X(b[1]).toFixed(1)+'" height="16" fill="'+(i?'var(--c4)':'var(--c1)')+'"/>';
      g+='<line x1="'+X(b[1]-b[2]).toFixed(1)+'" x2="'+X(b[1]+b[2]).toFixed(1)+'" y1="'+(y+24)+'" y2="'+(y+24)+'" stroke="var(--ink)" stroke-width="1.5"/>';
      g+=F.tx(bwid+6,y+28,b[1].toFixed(1)+'%','b')});
    const cx=X(50),yb=28+3*46;
    g+='<line x1="'+cx+'" x2="'+cx+'" y1="40" y2="'+(yb-2)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+F.tx(cx,yb+12,'chance 50%','m','middle');
    el.innerHTML=F.svg(W,yb+18,g,'InstructGPT agreement rates: labellers 72.6%, reward model 72.4% on training labellers and 69.6% on held-out labellers');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();

// Online or offline: OAIF's human evaluation and Tulu 3's node-hours, to scale
(function(){
  const el=document.getElementById('ooSvg');if(!el)return;const F=window.AL_FIG;
  function draw(){
    const W=Math.min(RD.width(el),760),bw=W-2;let g='';
    g+=F.tx(0,13,'People\'s verdict: online DPO against offline DPO','t12');
    const segs=[[63.7,'online wins','var(--c3)'],[28.6,'tie','var(--dim)'],[7.7,'offline wins','var(--bad)']];let x=1;
    segs.forEach((s,i)=>{const w=bw*s[0]/100;g+='<rect x="'+x.toFixed(1)+'" y="22" width="'+w.toFixed(1)+'" height="26" fill="'+s[2]+'"/>';
      const lab=(i<2&&w>s[1].length*6.4+44)?s[1]+' '+s[0]+'%':(i<2?s[0]+'%':'');
      if(lab)g+='<text x="'+(x+6).toFixed(1)+'" y="39" class="b" style="fill:'+(i===0?'var(--bg)':'var(--ink)')+'">'+lab+'</text>';x+=w});
    g+=F.tx(W-1,64,'offline wins 7.7%','m','end');
    const s=(bw-4)/56,y0=96;
    g+=F.tx(0,y0,'Tulu 3: node-hours to train, PPO against DPO','t12');
    g+='<rect x="1" y="'+(y0+8)+'" width="'+(4*s).toFixed(1)+'" height="20" fill="var(--c4)"/>'+F.tx(4*s+8,y0+22,'DPO: 1 node × 4 h = 4','b');
    g+='<rect x="1" y="'+(y0+34)+'" width="'+(56*s).toFixed(1)+'" height="20" fill="var(--c3)"/><text x="8" y="'+(y0+48)+'" class="b" style="fill:var(--bg)">PPO: 2 nodes × 28 h = 56</text>';
    el.innerHTML=F.svg(W,y0+58,g,'Online DPO beat offline DPO 63.7% to 7.7% with 28.6% ties; Tulu 3 PPO took 56 node-hours against 4 for DPO');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();

// Recipes: five open recipes as stage strips
(function(){
  const el=document.getElementById('reSvg');if(!el)return;const F=window.AL_FIG;
  const C={s:'var(--c1)',p:'var(--c4)',r:'var(--c3)',x:'var(--c5)'};
  const R=[
    {n:'Tulu 3 8B',d:'Nov 2024',b:[['s','SFT','939,344'],['p','DPO','271K pairs'],['r','RLVR (PPO)','30K prompts']]},
    {n:'Llama 3.1',d:'Jul 2024',loop:'× 6 rounds, each on the new model',b:[['p','RM','human pairs'],['x','Rejection','sampling'],['s','SFT',''],['p','DPO','']]},
    {n:'DeepSeek-R1',d:'Jan 2025',b:[['s','Cold start','thousands'],['r','GRPO','reasoning'],['s','RS + SFT','804,745'],['r','RL','all tasks']]},
    {n:'Qwen3',d:'May 2025',b:[['s','Cold start','long CoT'],['r','GRPO','3,995 pairs'],['s','SFT','mode fusion'],['r','RL','general']]},
    {n:'Olmo 3 32B Think',d:'Dec 2025',b:[['s','SFT','2.25M'],['p','DPO','200K pairs'],['r','RLVR','105K prompts']]}];
  function draw(){
    const W=Math.min(RD.width(el),860),wide=W>=640,lw=wide?150:0,gp=4,sw=(W-lw-2-3*gp)/4,bh=36;let g='',y=1;
    R.forEach(r=>{
      if(wide){g+=F.tx(0,y+15,r.n,'t12')+F.tx(0,y+30,r.d,'m')}else{g+=F.tx(0,y+12,r.n+' · '+r.d,'t12');y+=18}
      r.b.forEach((b,i)=>{const x=lw+1+i*(sw+gp);
        g+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+sw.toFixed(1)+'" height="'+bh+'" rx="5" fill="'+C[b[0]]+'" fill-opacity=".18" stroke="'+C[b[0]]+'"/>';
        g+=F.tx(x+6,y+15,b[1],'b')+(b[2]?F.tx(x+6,y+30,b[2],''):'')});
      y+=bh;
      if(r.loop){const x0=lw+1+sw/2,x1=lw+1+(r.b.length-1)*(sw+gp)+sw/2;
        g+='<path d="M'+x1.toFixed(1)+' '+(y+1)+' V'+(y+12)+' H'+x0.toFixed(1)+' V'+(y+6)+'" class="arr"/>'+F.head(x0,y+2,'up')+F.tx((x0+x1)/2,y+25,r.loop,'m','middle');y+=30}
      y+=12});
    el.innerHTML=F.svg(W,y,g,'Stage order of five open post-training recipes: Tulu 3, Llama 3.1, DeepSeek-R1, Qwen3, Olmo 3 Think');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
