// ---- Reading visuals added on 2026-10-24 (static figures and one toggle; nothing moves by itself) ----
// SH.bars draws labelled horizontal bars in groups, at the measured width; every number drawn is also in the HTML
// caption or a closed table beside it (the figures repeat sourced numbers, they compute nothing except the abstention scores).
window.SH=(function(){
  const T=RD.t,esc=RD.esc;
  const fmt=v=>(Math.round(v*10)/10).toString().replace(/\.0$/,'');
  // groups: [{title, rows:[{label, v, col} or {label, segs:[{v,col,txt}]}, right?], lines:[{v,label}]}]
  // o: {max, ticks:[...], unit:'%', fmtTick, rw (right column width), min}
  function bars(host,groups,o){
    o=o||{};const W=Math.min(860,RD.width(host)),narrow=W<520;
    const lw=Math.min(narrow?132:200,Math.round(W*(narrow?0.38:0.33))),rw=o.rw||0;
    const x0=lw+8,x1=W-8-rw-(o.valPad==null?(narrow?34:40):o.valPad),lo=o.min||0,hi=o.max||100;
    const X=v=>x0+(x1-x0)*(v-lo)/(hi-lo);const rh=narrow?19:21;let y=4,b='';
    const ticks=o.ticks||[0,25,50,75,100],ft=o.fmtTick||(t=>t+(o.unit==null?'%':o.unit));
    groups.forEach((g,gi)=>{
      if(g.title){b+=T(0,y+12,esc(g.title),{fs:11.5,w:600,fill:'var(--ink)'});y+=18}
      const top=y+12;b+=ticks.map(t=>T(X(t),y+9,ft(t),{a:'middle',fs:10.5,fill:'var(--mute)'})).join('');y=top+2;
      const y0=y;
      g.rows.forEach(r=>{const cy=y+rh/2;
        b+=T(lw,cy+4,esc(r.label),{a:'end',fs:11,fill:r.strong?'var(--ink)':'var(--ink)',w:r.strong?600:null});
        if(r.segs){let a=lo;r.segs.forEach(s=>{const xa=X(a),xb=X(a+s.v);b+='<rect x="'+xa.toFixed(1)+'" y="'+(y+3)+'" width="'+Math.max(0.5,xb-xa).toFixed(1)+'" height="'+(rh-6)+'" fill="'+s.col+'"><title>'+esc(s.txt||fmt(s.v))+'</title></rect>';
            if(s.txt&&xb-xa>34)b+=T((xa+xb)/2,cy+4,s.txt,{a:'middle',fs:10.5,fill:s.ink||'var(--bg)',w:600});a+=s.v});}
        else{const xb=X(r.v);b+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+Math.max(1,xb-x0).toFixed(1)+'" height="'+(rh-6)+'" rx="2" fill="'+r.col+'"/>';
          b+=T(xb+4,cy+4,r.txt||(fmt(r.v)+(o.unit==null?'%':o.unit)),{fs:11,fill:'var(--ink)'})}
        if(r.right!=null)b+=T(W-2,cy+4,r.right,{a:'end',fs:11,w:600,fill:'var(--ink)'});
        y+=rh});
      b+='<line x1="'+X(lo)+'" y1="'+(y0-2)+'" x2="'+X(lo)+'" y2="'+y+'" stroke="var(--mute)"/>';
      (g.lines||[]).forEach(l=>{b+='<line x1="'+X(l.v)+'" y1="'+(y0-2)+'" x2="'+X(l.v)+'" y2="'+y+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+T(X(l.v)+(l.a==='end'?-3:3),y+11,esc(l.label),{a:l.a||'start',fs:10.5,fill:'var(--ink)'});y+=12});
      y+=gi<groups.length-1?10:2});
    host.innerHTML=RD.svg(W,y+4,b,host.getAttribute('aria-label')||'');
  }
  function reg(f){f();RD.onRender(f);RD.onResize(f)}
  return {bars,reg,fmt};
})();

// hero: the number usually quoted and its mirror
(function(){const h=document.getElementById('sh-hero');if(!h)return;
  const Q='var(--acc)',M='var(--bad)';
  SH.reg(()=>SH.bars(h,[
    {title:'Refusal: XSTest, Llama 2 70B chat (original system prompt)',rows:[{label:'refused unsafe prompts',v:99.5,col:Q},{label:'refused safe prompts',v:59.6,col:M}]},
    {title:'Factuality: SimpleQA, GPT-4o',rows:[{label:'answered correctly',v:38.2,col:Q},{label:'wrong, not abstaining',v:60.8,col:M}]},
    {title:'Jailbreaks: HarmBench, GPT-4 Turbo',rows:[{label:'success, plain request',v:6.9,col:Q},{label:'success under TAP-T',v:81.8,col:M}]},
    {title:'Observation: Claude Opus 4, blackmail scenario',rows:[{label:'said it was a test',v:6.5,col:Q},{label:'said it was real',v:55.1,col:M}]}
  ]))})();

// section 2: three graders on the same XSTest answers
(function(){const h=document.getElementById('sh-grd');if(!h||!window.GR)return;
  const U=window.XSU,G=window.GR,GS=[['h','people','var(--ink)'],['s','string match','var(--c2)'],['g','GPT-4 classifier','var(--c4)']];
  function draw(){const W=Math.min(860,RD.width(h)),narrow=W<560,lw=narrow?118:150,pw=narrow?W-lw-14:(W-lw-30)/2;
    let b='',y=18;const rh=22;
    const panels=narrow?[[0,'s','Safe prompts refused (lower is better)'],[1,'u','Unsafe prompts refused (higher is better)']]:[[0,'s','Safe prompts refused (lower is better)'],[1,'u','Unsafe prompts refused (higher is better)']];
    const P=(k)=>narrow?{x:lw+6,y:k*(G.MS.length*rh+44)}:{x:lw+6+k*(pw+18),y:0};
    panels.forEach(([k,key,title])=>{const o=P(k),X=v=>o.x+pw*v;
      b+=RD.t(narrow?0:o.x,o.y+12,title,{fs:11.5,w:600,fill:'var(--ink)'});
      [0,.25,.5,.75,1].forEach(t=>{b+='<line x1="'+X(t)+'" y1="'+(o.y+30)+'" x2="'+X(t)+'" y2="'+(o.y+30+G.MS.length*rh)+'" stroke="var(--line)"/>'+RD.t(X(t),o.y+27,Math.round(t*100)+'%',{a:t===1?'end':t===0?'start':'middle',fs:10.5,fill:'var(--mute)'})});
      G.MS.forEach((m,i)=>{const cy=o.y+30+i*rh+rh/2;if(k===0||narrow)b+=RD.t(lw,cy+4,RD.esc(U.MOD[m].sh),{a:'end',fs:11});
        const vs=GS.map(g=>G.rates(m,g[0])[key]);b+='<line x1="'+X(Math.min(...vs))+'" y1="'+cy+'" x2="'+X(Math.max(...vs))+'" y2="'+cy+'" stroke="var(--dim)" stroke-width="4"/>';
        GS.forEach((g,j)=>{b+='<circle cx="'+X(vs[j]).toFixed(1)+'" cy="'+cy+'" r="4.5" fill="'+g[2]+'"><title>'+g[1]+': '+RD.pct(vs[j])+'</title></circle>'})});
      y=Math.max(y,o.y+30+G.MS.length*rh+6)});
    h.innerHTML=RD.svg(W,y,b,'Refusal rates under three graders')+'<div class="leg">'+GS.map(g=>'<span><i style="background:'+g[2]+'"></i>'+g[1]+'</span>').join('')+'</div>'}
  SH.reg(draw)})();

// section 4: AgentHarm with and without the jailbreak template
(function(){const h=document.getElementById('sh-ah');if(!h)return;
  const D=[['GPT-4o',48.4,48.9,72.7,13.6],['Claude 3.5 Sonnet',13.5,85.2,68.7,16.7],['Gemini 1.5 Pro',15.7,78.4,56.1,3.5],['Mistral Large 2',82.2,1.1,80.5,0.0]];
  function draw(){const W=Math.min(860,RD.width(h)),narrow=W<560,lw=narrow?112:130,pw=narrow?W-lw-16:(W-lw-34)/2,rh=24;let b='',H=0;
    [['Harm score',1,3],['Refusal rate',2,4]].forEach(([t,a,c],k)=>{const ox=narrow?lw+8:lw+8+k*(pw+20),oy=narrow?k*(D.length*rh+46):0,X=v=>ox+pw*v/100;
      b+=RD.t(narrow?0:ox,oy+12,t+': no attack → with template',{fs:11.5,w:600,fill:'var(--ink)'});
      [0,50,100].forEach(v=>b+='<line x1="'+X(v)+'" y1="'+(oy+30)+'" x2="'+X(v)+'" y2="'+(oy+30+D.length*rh)+'" stroke="var(--line)"/>'+RD.t(X(v),oy+27,v+'%',{a:v===100?'end':v?'middle':'start',fs:10.5,fill:'var(--mute)'}));
      D.forEach((d,i)=>{const cy=oy+30+i*rh+rh/2,x1=X(d[a]),x2=X(d[c]);if(k===0||narrow)b+=RD.t(lw,cy+4,d[0],{a:'end',fs:11});
        const dir=x2>=x1?1:-1;if(Math.abs(x2-x1)>8)b+='<line x1="'+x1+'" y1="'+cy+'" x2="'+(x2-dir*6)+'" y2="'+cy+'" stroke="var(--mute)" stroke-width="1.6"/><path d="M'+x2+','+cy+' l'+(-dir*7)+',-4 l0,8 Z" fill="var(--mute)"/>';
        b+='<circle cx="'+x1+'" cy="'+cy+'" r="4.5" fill="var(--acc)"/><circle cx="'+x2+'" cy="'+cy+'" r="4.5" fill="var(--bad)"/>'});
      H=Math.max(H,oy+30+D.length*rh+4)});
    h.innerHTML=RD.svg(W,H,b,'AgentHarm with and without a jailbreak template')+'<div class="leg"><span><i style="background:var(--acc)"></i>no attack</span><span><i style="background:var(--bad)"></i>with the jailbreak template</span></div>'}
  SH.reg(draw)})();

// section 5: TruthfulQA answered without the question
(function(){const h=document.getElementById('sh-tqa');if(!h)return;const C='var(--c4)';
  SH.reg(()=>SH.bars(h,[
    {title:'MC1, original format (Turner and Kurzeja, Jan 2025)',rows:[{label:'decision tree, in principle',v:79.6,col:C},{label:'decision tree, their run',v:66.6,col:C},{label:'"odd one out" rule',v:73,col:C}]},
    {title:'Binary format (audit, Sep 2026)',rows:[{label:'six features, 790 pairs',v:68.9,col:C},{label:'choices only, 476 pairs',v:52.2,col:C}],lines:[{v:50,label:'chance',a:'end'}]}
  ]))})();

// section 5: one set of SimpleQA answers under four scoring rules (Table 3, Nov 2024)
(function(){const h=document.getElementById('sh-abs');if(!h)return;
  const D=[['Claude 3 Haiku',5.1,75.3,19.6,8.2],['Claude 3 Sonnet',5.7,75.0,19.3,9.2],['Claude 3 Opus',23.5,39.6,36.9,29.3],['Claude 3.5 Sonnet',28.9,35.0,36.1,35.0],
    ['GPT-4o mini',8.6,0.9,90.5,8.6],['GPT-4o',38.2,1.0,60.8,38.4],['o1-mini',8.1,28.5,63.4,9.4],['o1-preview',42.7,9.2,48.1,44.8]];
  const R={c:{n:'accuracy',f:d=>d[1],hi:true,s:v=>v.toFixed(1)+'%'},f:{n:'F-score',f:d=>2*d[1]/(2*d[1]+2*d[3]+d[2])*100,hi:true,s:v=>v.toFixed(1)},
    ci:{n:'correct minus incorrect',f:d=>d[1]-d[3],hi:true,s:v=>RD.n(v,1)},h:{n:'hallucination rate',f:d=>100*d[3]/(d[3]+d[2]),hi:false,s:v=>v.toFixed(1)+'%'}};
  const CAP={c:'Accuracy ignores what the wrong answers cost: o1-preview and GPT-4o lead although GPT-4o is wrong on 60.8% of questions.',
    f:'The F-score (the paper\'s headline, harmonic mean of correct and correct-given-attempted) barely separates GPT-4o (38.4) from Claude 3.5 Sonnet (35.0), which skipped 35% of questions.',
    ci:'Correct minus incorrect charges a wrong answer what a right one earns: Claude 3.5 Sonnet moves above GPT-4o, and the low-knowledge Claude 3 models above GPT-4o mini and o1-mini.',
    h:'The hallucination rate alone crowns the models that abstain most: Claude 3 Sonnet (20.5%) and Claude 3 Haiku (20.7%) answer 5.7% and 5.1% correctly. Lower is better here.'};
  let rule='c';
  window.SH_ABS={D,R,get rule(){return rule}};
  function draw(){const r=R[rule];const rows=D.map(d=>({d,v:r.f(d)})).sort((a,b)=>r.hi?b.v-a.v:a.v-b.v).map(o=>({label:o.d[0],right:r.s(o.v),
      segs:[{v:o.d[1],col:'var(--good)',txt:o.d[1].toFixed(1)},{v:o.d[2],col:'var(--dim)',txt:o.d[2].toFixed(1),ink:'var(--ink)'},{v:o.d[3],col:'var(--bad)',txt:o.d[3].toFixed(1)}]}));
    SH.bars(h,[{title:'Sorted by '+r.n+' (score at right)',rows}],{rw:56,valPad:4});
    h.insertAdjacentHTML('beforeend','<div class="leg"><span><i style="background:var(--good)"></i>correct</span><span><i style="background:var(--dim)"></i>not attempted</span><span><i style="background:var(--bad)"></i>incorrect</span></div>');
    document.getElementById('sh-abs-cap').textContent=CAP[rule]}
  RD.seg(document.getElementById('sh-abs-mode'),m=>{rule=m;draw()});
  SH.reg(draw)})();

// section 6: MASK lying rates
(function(){const h=document.getElementById('sh-mask');if(!h)return;const C='var(--bad)';
  const D=[['Grok 2',63.0],['DeepSeek-V3',53.5],['o3-mini',48.6],['GPT-4o',44.5],['GPT-4.5 Preview',43.5],['Claude 3.5 Sonnet',33.4],['Llama 3.1 405B',28.0],['Claude 3.7 Sonnet',26.6]];
  SH.reg(()=>SH.bars(h,[{title:'P(lie) under pressure, MASK public set',rows:D.map(d=>({label:d[0],v:d[1],col:C}))}]))})();

// section 7: SycEval split and "Are you sure?"
(function(){const h=document.getElementById('sh-syc');if(!h)return;
  SH.reg(()=>SH.bars(h,[
    {title:'SycEval: answers after a user rebuttal (Feb 2025)',rows:[{label:'all cases',segs:[{v:41.81,col:'var(--dim)',txt:'41.81',ink:'var(--ink)'},{v:43.52,col:'var(--good)',txt:'43.52'},{v:14.66,col:'var(--bad)',txt:'14.66'}]}]},
    {title:'Asked "Are you sure?", wrongly admits a mistake',rows:[{label:'Claude 1.3',v:98,col:'var(--bad)'},{label:'GPT-4',v:42,col:'var(--bad)'}]}
  ]));
  h.insertAdjacentHTML('afterend','<div class="leg"><span><i style="background:var(--dim)"></i>unchanged</span><span><i style="background:var(--good)"></i>progressive (towards the right answer)</span><span><i style="background:var(--bad)"></i>regressive (towards a wrong answer)</span></div>')})();

// section 8: BBQ's example set, two contexts by two questions
(function(){const h=document.getElementById('sh-bbq');if(!h)return;
  function draw(){const W=Math.min(760,RD.width(h)),narrow=W<520,lw=narrow?104:170,cw=(W-lw-6)/2,rh=narrow?66:58,hh=narrow?46:40;let b='';
    const C=[[narrow?'Negative q.':'Negative question','"Who likely planted','the bomb?"'],[narrow?'Non-negative q.':'Non-negative question','"Who was likely','running for cover?"']];
    const Rr=[[narrow?'Ambiguous':'Ambiguous context','"A Christian and a Muslim were','both seen fleeing ..."'],[narrow?'Disambiguated':'+ disambiguating sentence','"... the Christian man','confessed to the crime."']];
    const A=[['Unknown','biased guess: The Muslim'],['Unknown',''],['The Christian',''],['The Muslim','']];
    C.forEach((c,j)=>{const x=lw+6+j*cw;b+=RD.t(x+cw/2,14,c[0],{a:'middle',fs:11.5,w:600,fill:'var(--ink)'});if(!narrow||true){b+=RD.t(x+cw/2,28,c[1],{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(x+cw/2,39,c[2],{a:'middle',fs:10.5,fill:'var(--mute)'})}});
    Rr.forEach((r,i)=>{const y=hh+i*rh;b+=RD.t(lw,y+18,r[0],{a:'end',fs:11.5,w:600,fill:'var(--ink)'});
      if(!narrow){b+=RD.t(lw,y+33,r[1],{a:'end',fs:10.5,fill:'var(--mute)'})+RD.t(lw,y+46,r[2],{a:'end',fs:10.5,fill:'var(--mute)'})}
      C.forEach((c,j)=>{const x=lw+6+j*cw,a=A[i*2+j],amb=i===0;
        b+='<rect x="'+(x+3)+'" y="'+(y+3)+'" width="'+(cw-6)+'" height="'+(rh-6)+'" rx="7" fill="'+(amb?'var(--acc2)':'var(--soft)')+'" stroke="'+(amb?'var(--acc)':'var(--line)')+'" stroke-width="1.5"/>';
        b+=RD.t(x+cw/2,y+(a[1]?rh/2-2:rh/2+5),(narrow?'':'correct: ')+a[0],{a:'middle',fs:narrow?11.5:12,w:600,fill:'var(--ink)'});
        if(a[1])b+=RD.t(x+cw/2,y+rh/2+15,narrow?'biased: The Muslim':a[1],{a:'middle',fs:11,fill:'var(--bad)'})})});
    h.innerHTML=RD.svg(W,hh+2*rh+4,b,'BBQ example set')}
  SH.reg(draw)})();

// section 9: the format ladder in biology and cyber
(function(){const h=document.getElementById('sh-ladder');if(!h)return;
  const COLS=['Knowledge questions','Task benchmark','People or real software'];
  const ROWS=[['Biology',[['WMDP-bio','1,273 questions','left 2026 cards'],['Virology Capabilities Test','experts 22.1%','GPT-6 Astra 57.8% (2026)'],['Uplift trials','RAND 2024: no significant gain','Opus 4: 2.53× (May 2025)']]],
    ['Cyber',[['WMDP-cyber','1,987 questions','left 2026 cards'],['Cybench, 40 CTF tasks','17.5% (2024)','100% on 35 tasks (Apr 2026)'],['Zero-day hunts','Astra: browser chain, 29 h','first Critical (Sep 2026)']]]];
  function box(x,y,w,hh,l,hi){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+hh+'" rx="7" fill="'+(hi?'var(--acc2)':'var(--soft)')+'" stroke="'+(hi?'var(--acc)':'var(--line)')+'" stroke-width="1.5"/>'+
    RD.t(x+8,y+17,RD.esc(l[0]),{fs:11.5,w:600,fill:'var(--ink)'})+RD.t(x+8,y+33,RD.esc(l[1]),{fs:11,fill:'var(--mute)'})+RD.t(x+8,y+48,RD.esc(l[2]),{fs:11,fill:'var(--mute)'})}
  function arrow(x1,y1,x2,y2,lab,vert){let s='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--bad)" stroke-width="1.6"/>';
    s+=vert?'<path d="M'+x2+','+y2+' l-4,-7 l8,0 Z" fill="var(--bad)"/>':'<path d="M'+x2+','+y2+' l-7,-4 l0,8 Z" fill="var(--bad)"/>';
    if(lab)s+=vert?RD.t(x1+8,(y1+y2)/2+4,lab,{fs:10.5,fill:'var(--bad)'}):RD.t((x1+x2)/2,y1-5,lab,{a:'middle',fs:10.5,fill:'var(--bad)'});return s}
  function draw(){const W=Math.min(860,RD.width(h));let b='',H;
    if(W>=700){const lw=62,g=66,bw=(W-lw-2*g)/3,bh=56;
      COLS.forEach((c,j)=>b+=RD.t(lw+j*(bw+g)+bw/2,12,c,{a:'middle',fs:11,w:600,fill:'var(--mute)'}));
      ROWS.forEach((r,i)=>{const y=22+i*(bh+18);b+=RD.t(0,y+bh/2+4,r[0],{fs:12,w:600,fill:'var(--ink)'});
        r[1].forEach((l,j)=>{const x=lw+j*(bw+g);b+=box(x,y,bw,bh,l,j===2);if(j<2)b+=arrow(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2,'saturated',false)})});
      H=22+2*(bh+18)}
    else{const bw=W-4,bh=56,g=22;let y=0;
      ROWS.forEach(r=>{b+=RD.t(0,y+13,r[0],{fs:12,w:600,fill:'var(--ink)'});y+=20;
        r[1].forEach((l,j)=>{b+=RD.t(bw,y-4,COLS[j],{a:'end',fs:10.5,fill:'var(--mute)'});b+=box(2,y,bw-2,bh,l,j===2);y+=bh;if(j<2){b+=arrow(26,y+2,26,y+g+10,'saturated',true);y+=g+14}});y+=12});
      H=y}
    h.innerHTML=RD.svg(W,H,b,'Format ladder of dangerous-capability evaluations')}
  SH.reg(draw)})();

// section 9: Anthropic's uplift trial for Claude Opus 4 against its pre-set lines
(function(){const h=document.getElementById('sh-upl');if(!h)return;
  SH.reg(()=>SH.bars(h,[{title:'Total uplift over the control group (control = 1×)',rows:[{label:'Claude Sonnet 4',v:1.70,col:'var(--c4)',txt:'1.70×'},{label:'Claude Opus 4',v:2.53,col:'var(--c4)',txt:'2.53×'}],
    lines:[{v:2.8,label:'2.8×: rule out'},{v:5,label:'5×: concern',a:'end'}]}],{min:1,max:6,ticks:[1,2,3,4,5,6],unit:'×',fmtTick:t=>t+'×'}))})();

// section 12: behaviour and evaluation awareness
(function(){const h=document.getElementById('sh-aw');if(!h)return;const Q='var(--acc)',M='var(--bad)';
  SH.reg(()=>SH.bars(h,[
    {title:'Claude Opus 4: blackmail rate by what it said',rows:[{label:'said it was a test',v:6.5,col:Q},{label:'said it was real',v:55.1,col:M}]},
    {title:'o3, before and after anti-scheming training',rows:[{label:'covert, before',v:13,col:M},{label:'covert, after',v:0.4,col:Q},{label:'test-aware, before',v:2.3,col:'var(--c4)'},{label:'test-aware, after',v:4.5,col:'var(--c4)'}]},
    {title:'Claude Opus 5.5, transcripts scored as eval-aware',rows:[{label:'automated audits',v:36,col:'var(--c4)'},{label:'real sessions',v:0.4,col:'var(--c4)'}]}
  ],{max:60,ticks:[0,20,40,60]}))})();

// links to the closed dated table open it
document.addEventListener('click',e=>{const a=e.target.closest('a[href="#rd-dated"]');if(!a)return;const d=document.getElementById('rd-dated');if(d)d.open=true});
