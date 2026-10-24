// ---- Reading figures drawn at the measured width: the hero, the training recipe, thinking before and after ----
// Labels sit on the figures; explanations are in the HTML beside them. Redrawn when the Reading tab opens and on resize.
(function(){
  if(!$('acHero'))return;
  const T=(x,y,s,o)=>RD.t(x,y,s,o);
  // a box with a bold first line and muted further lines, left-aligned when wide enough
  function box(x,y,w,h,cls,lines,fs){fs=fs||11.5;const lh=fs+3.5,n=lines.length;let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+cls+'"/>';
    lines.forEach((t,i)=>{s+='<text x="'+(x+w/2)+'" y="'+(y+h/2+(i-(n-1)/2)*lh+4)+'" text-anchor="middle" font-size="'+fs+'"'+(i===0?' font-weight="600"':' fill="var(--mute)"')+'>'+t+'</text>'});return s}
  const arrow=(x1,y1,x2,y2)=>ar(x1,y1,x2,y2);

  // ---- Hero ----
  function hero(){
    const el=$('acHero'),W=Math.max(300,Math.min(880,RD.width(el))),narrow=W<640;let s='',H;
    const trained=[['boxo',['Pretraining','architecture, size, data:','undisclosed']],['box',['Constitutional AI + RLAIF','published (Bai et al., 2022)']],['box',['RLVR + agentic RL','named, not detailed']]];
    const rungs=[['Fable 5.1','$10 / $50'],['Opus 5.5','$4 / $20'],['Sonnet 5.5','$2 / $10'],['Haiku 5.5','$0.10 / $0.50']];
    const dials=[['effort: low to max','how many tokens it writes'],['max_tokens','hard fuse: thinking + answer'],['prompt cache','Opus 5.5 reads at 5% of input'],['append-only history','or thinking blocks are invalid']];
    if(!narrow){
      const g=34,cw=(W-2*g)/3,x1=0,x2=cw+g,x3=2*(cw+g),top=24,bh=50,bg=10;
      s+=T(x1,14,'Trained once per generation',{w:600,fs:12})+T(x2,14,'Sold as four rungs (Oct 2026)',{w:600,fs:12})+T(x3,14,'The caller keeps four dials',{w:600,fs:12,fill:'var(--acc)'});
      const ht=(bh+bg)*4-bg,tb=(ht-2*bg)/3;
      trained.forEach(([c,l],i)=>{s+=box(x1,top+i*(tb+bg),cw,tb,c,l,11.5)});
      rungs.forEach(([n,p],i)=>{s+=box(x2,top+i*(bh+bg),cw,bh,'box',[n,p+' per 1M in / out'],11.5)});
      dials.forEach(([n,p],i)=>{s+=box(x3,top+i*(bh+bg),cw,bh,'boxa',[n,p],11.5)});
      const ym=top+ht/2;s+=arrow(x1+cw+3,ym,x2-4,ym)+arrow(x2+cw+3,ym,x3-4,ym);
      s+=T(x2+cw/2,top+ht+16,'each rung is one checkpoint that thinks or answers',{a:'middle',fs:11,fill:'var(--mute)'});
      H=top+ht+24;
    }else{
      let y=4;const half=(W-8)/2,bh=44,bg=8;
      const head=(t,c)=>{s+=T(0,y+12,t,{w:600,fs:12,fill:c});y+=20};
      head('Trained once per generation');
      trained.forEach(([c,l])=>{s+=box(0,y,W,bh,c,[l[0],l.slice(1).join(' ')],11);y+=bh+bg});
      s+=arrow(W/2,y-2,W/2,y+14);y+=18;head('Sold as four rungs (Oct 2026), $ per 1M in / out');
      rungs.forEach(([n,p],i)=>{s+=box((i%2)*(half+8),y+Math.floor(i/2)*(bh+bg),half,bh,'box',[n,p],11)});y+=2*(bh+bg);
      s+=arrow(W/2,y-2,W/2,y+14);y+=18;head('The caller keeps four dials','var(--acc)');
      const dn=[['effort: low to max','tokens it writes'],['max_tokens','hard fuse'],['prompt cache','reads at 5% (Opus 5.5)'],['append-only','or reasoning is lost']];
      dn.forEach(([n,p],i)=>{s+=box((i%2)*(half+8),y+Math.floor(i/2)*(bh+bg),half,bh,'boxa',[n,p],11)});y+=2*(bh+bg);
      H=y;
    }
    el.innerHTML=svgEl(W,H,s,'Claude: how it is trained, the four price rungs, and the four dials the caller controls');
  }

  // ---- Training recipe ----
  function recipe(){
    const el=$('acRecipe');if(!el)return;const W=Math.max(300,Math.min(880,RD.width(el))),narrow=W<640;let s='',H;
    const S=[['boxo','Pretraining',['data, size, architecture'],'undisclosed'],
             ['box','SL-CAI',['critique and revise','against a constitution'],'published, 2022'],
             ['box','RLAIF',['AI labels: harmlessness','human labels: helpfulness'],'published, 2022'],
             ['boxa','RLVR',['a program checks','the answer'],'named, not detailed'],
             ['boxa','Agentic RL',['whole tasks in sandboxes','reward: task done'],'named, not detailed']];
    if(!narrow){
      const g=14,bw=(W-4*g)/5,top=30,bh=92;
      s+='<path d="M'+(bw+g)+' 20h'+(2*bw+g)+'" stroke="var(--good)" stroke-width="2"/>'+T(bw+g,14,'Constitutional AI: the published part',{fs:11,fill:'var(--good)',w:600});
      s+='<path d="M'+(3*(bw+g))+' 20h'+(2*bw+g)+'" stroke="var(--acc)" stroke-width="2"/>'+T(3*(bw+g),14,'the agentic lead: not published',{fs:11,fill:'var(--acc)',w:600});
      S.forEach(([c,n,d,p],i)=>{const x=i*(bw+g);s+=box(x,top,bw,bh,c,[n].concat(d,[p]),11);if(i<4)s+=arrow(x+bw+1,top+bh/2,x+bw+g-1,top+bh/2)});
      s+=T(0,top+bh+18,'People still write the constitution, the judge\'s prompt, the rubrics and the environments.',{fs:11,fill:'var(--mute)'});
      H=top+bh+26;
    }else{
      let y=2;const bh=46,g=16,NS=[0,0,'AI labels harmlessness, people helpfulness',0,'whole tasks in sandboxes, reward: done'];
      S.forEach(([c,n,d,p],i)=>{s+=box(0,y,W,bh,c,[n+': '+(NS[i]||d.join(' ')),p],11);y+=bh;if(i<4){s+=arrow(W/2,y+1,W/2,y+g-1)}y+=g});
      H=y-g+4;
    }
    el.innerHTML=svgEl(W,H,s,'Claude post-training as published: pretraining undisclosed, Constitutional AI published, RLVR and agentic RL named only');
  }

  // ---- Thinking: budget against adaptive with effort ----
  let tm='old';
  const CAP={old:'<b>Budget.</b> The caller sends <code>thinking: {type: "enabled", budget_tokens: N}</code> and the model thinks up to N tokens, the same cap for an easy request and a hard one. The caller owns the cost decision but must know in advance which tasks need thinking. From Opus 4.7 this request is rejected with a 400 error. Bar lengths are <span class="ill">illustrative</span>.',
             new:'<b>Adaptive with effort.</b> The model decides, per request and per step, whether and how long to think; the caller only sets a level, <code>low</code> to <code>max</code>, that scales every output token, and <code>max_tokens</code> as the one hard limit on thinking plus answer. Bar lengths are <span class="ill">illustrative</span>: Anthropic publishes no per-step amounts.'};
  function think(){
    const el=$('acThink');if(!el)return;const W=Math.max(300,Math.min(880,RD.width(el))),narrow=W<640;let s='';
    const old=tm==='old',top=4;
    // flow: caller -> request -> model
    const bw=narrow?(W-2*16)/3:(W-2*30)/3,g=narrow?16:30,bh=narrow?62:56,fs=narrow?10.5:11.5;
    const req=old?['request','budget_tokens: N','(caller sets N)']:['request','effort: medium','+ max_tokens'];
    const mod=old?['model','thinks up to N,','then answers']:['model','decides per step','how long to think'];
    s+=box(0,top,bw,bh,'box',['caller',narrow?'picks the cost':'owns the cost decision'],fs);
    s+=box(bw+g,top,bw,bh,old?'boxa':'box',req,fs);s+=box(2*(bw+g),top,bw,bh,old?'box':'boxa',mod,fs);
    s+=arrow(bw+2,top+bh/2,bw+g-2,top+bh/2)+arrow(2*bw+g+2,top+bh/2,2*(bw+g)-2,top+bh/2);
    // per-step thinking bars
    const y0=top+bh+30,lab=narrow?84:110,bx0=lab,bw2=W-lab-8,rh=20,steps=['easy question','hard bug','routine edit'];
    s+=T(0,y0-10,old?'Thinking tokens per request: one cap chosen in advance':'Thinking tokens per request: the model chooses',{fs:11.5,w:600});
    const L=old?[1,1,1]:[0.35,0.9,0.15],cap=0.62;
    steps.forEach((st,i)=>{const y=y0+i*(rh+8);s+=T(0,y+14,st,{fs:11,fill:'var(--mute)'});
      const len=old?cap*bw2*[0.55,1,0.85][i]:L[i]*0.86*bw2;
      if(old&&i===1)s+='<rect x="'+(bx0+cap*bw2).toFixed(1)+'" y="'+y+'" width="'+(0.25*bw2).toFixed(1)+'" height="'+rh+'" rx="3" fill="none" stroke="var(--c4)" stroke-dasharray="3 3"/>';
      s+='<rect x="'+bx0+'" y="'+y+'" width="'+len.toFixed(1)+'" height="'+rh+'" rx="3" fill="var(--c4)" fill-opacity="'+(old?0.55:0.8)+'"/>'});
    const yb=y0+3*(rh+8);
    if(old){const xc=bx0+cap*bw2;s+='<path d="M'+xc+' '+(y0-4)+'V'+(yb-4)+'" stroke="var(--bad)" stroke-width="2"/>'+T(Math.min(xc+4,W-4),yb+10,'budget_tokens cap',{fs:11,fill:'var(--bad)',a:xc+110>W?'end':'start'});
      s+=T(bx0,yb+(narrow?26:10),'the hard request is cut off',{fs:11,fill:'var(--mute)'});}
    else{const xf=bx0+0.97*bw2;s+='<path d="M'+xf+' '+(y0-4)+'V'+(yb-4)+'" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 3"/>'+T(xf-4,yb+10,'max_tokens fuse',{fs:11,fill:'var(--bad)',a:'end'});
      s+=T(bx0,yb+(narrow?26:10),'effort scales every bar',{fs:11,fill:'var(--mute)'});}
    const H=yb+(narrow?34:18);
    el.innerHTML=svgEl(W,H,s,old?'Thinking under a caller-set budget':'Adaptive thinking steered by effort');
    $('acThinkCap').innerHTML=CAP[tm];
  }
  RD.seg($('acThinkM'),m=>{tm=m;think()});
  const all=()=>{hero();recipe();think()};
  RD.onRender(all);RD.onResize(all);all();
})();
