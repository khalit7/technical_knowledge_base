// ---- This page's static figures, drawn at the measured width: the hero (the sampler-trainer loop) and the 30B results
// (only the numbers printed in the paper's Section 5.4).
(function(){
  if(!window.RD)return;
  const $=id=>document.getElementById(id), t=RD.t;
  function box(x,y,w,h,title,sub,col){
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="10" fill="var(--card)" stroke="'+col+'" stroke-width="2"/>'+
      t(x+w/2,y+24,title,{a:'middle',fs:14,w:600,fill:col})+sub.map((s,i)=>t(x+w/2,y+44+i*17,s,{a:'middle',fs:12,fill:'var(--mute)'})).join('')}
  function arrow(x1,y1,x2,y2,col){const a=Math.atan2(y2-y1,x2-x1),h=8;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="2"/>'+
      '<path d="M'+x2+' '+y2+'L'+(x2-h*Math.cos(a-0.45))+' '+(y2-h*Math.sin(a-0.45))+'L'+(x2-h*Math.cos(a+0.45))+' '+(y2-h*Math.sin(a+0.45))+'Z" fill="'+col+'"/>'}
  function hero(){
    const el=$('sc-hero-svg');if(!el)return;
    const W=RD.width(el), narrow=W<470, bw=narrow?(W-24)/2:Math.min(200,(W-120)/2), bh=narrow?86:80, y=48;
    const xL=6, xR=W-6-bw;
    let s='';
    s+=t(W/2,16,narrow?'weights synced to the sampler':'weights synced to the sampler (every step, or every 64)',{a:'middle',fs:12,fill:'var(--mute)'});
    s+=arrow(xL+bw*0.7,y-4,xR+bw*0.3,y-4,'var(--mute)');
    s+=box(xL,y+6,bw,bh,'trainer p',narrow?['bf16 forward,','gradients']:['bf16 forward, fp32','master, gradients'],'var(--c1)');
    s+=box(xR,y+6,bw,bh,'sampler q',narrow?['int8, FP4 cache,','or stale']:['int8 or FP4 cache,','or a stale copy'],'var(--c2)');
    const yb=y+bh+20;
    s+=arrow(xR+bw*0.3,yb,xL+bw*0.7,yb,'var(--mute)');
    s+=t(W/2,yb+18,narrow?'rollouts + top-k log-probs':'rollouts + the sampler\'s top-k log-probs',{a:'middle',fs:12,fill:'var(--mute)'});
    if(narrow){s+=t(W/2,yb+40,'each step: drift pulls p toward q,',{a:'middle',fs:12,fill:'var(--c2)',w:600})+t(W/2,yb+57,'then q is re-copied from p',{a:'middle',fs:12,fill:'var(--c2)',w:600})}
    else s+=t(W/2,yb+40,'each step: drift pulls p toward q, then q is re-copied from p',{a:'middle',fs:12,fill:'var(--c2)',w:600});
    el.innerHTML=RD.svg(W,yb+(narrow?66:50),s,'The trainer and sampler loop: weights go to the sampler, rollouts come back; drift pulls the trainer toward the sampler each step');
  }
  // Section 5.4's printed numbers: [panel, method, value or null, note]
  const R30=[['FP8 W/A + FP8 KV',[['PG',58,'uncorrected']]],
             ['FP8 W/A + FP4 KV',[['SC',52,'5 seeds'],['TIS',51,'4 seeds'],['PG',0,'collapses by step 200'],['MIS',0,'collapses late in training']]],
             ['INT8 W/A + INT4 KV',[['SC',30,'4 seeds'],['TIS',12,'3 seeds'],['others',5,'every other method']]]];
  const COL={SC:'var(--c3)',TIS:'var(--c1)',PG:'var(--mute)',MIS:'var(--mute)',others:'var(--mute)'};
  function r30(){
    const el=$('sc-30b');if(!el)return;
    const W=RD.width(el), L=84, R=W-8, X=v=>L+v/(W>420?75:72)*(R-L), rowH=21, gap=16;
    let y=18, s='';
    [0,20,40,60].forEach(v=>{s+=t(X(v),12,v+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    y=24;
    R30.forEach(([panel,rows])=>{
      s+=t(4,y+13,panel,{fs:12,w:600,fill:'var(--ink)'}); y+=20;
      rows.forEach(([m,v,note])=>{
        s+=t(L-6,y+14,m,{a:'end',fs:12,fill:COL[m]});
        if(m==='others')s+='<rect x="'+X(0)+'" y="'+(y+3)+'" width="'+(X(5)-X(0))+'" height="'+(rowH-6)+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>';
        else if(v>0)s+='<rect x="'+X(0)+'" y="'+(y+3)+'" width="'+(X(v)-X(0))+'" height="'+(rowH-6)+'" rx="3" fill="'+COL[m]+'" opacity="'+(m==='SC'||m==='TIS'?1:.55)+'"/>';
        const lab=v>0&&m!=='others'?v+'%'+(W>420?' · '+note:''):(m==='others'?'< 5%'+(W>420?' · '+note:''):note);
        s+=t((v>0?X(v):X(0))+6,y+15,lab,{fs:11.5,fill:'var(--ink)'});
        y+=rowH;
      });
      y+=gap-6;
    });
    [0,20,40,60].forEach(v=>{s='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="16" y2="'+y+'" stroke="var(--line)"/>'+s});
    el.innerHTML=RD.svg(W,y,s,'Final training accuracy at 30B as printed in the paper: FP8 PG 58; FP4 KV SC 52, TIS 51; INT4 KV SC 30, TIS 12, others below 5');
  }
  function draw(){hero();r30()}
  RD.onRender(draw); RD.onResize(draw);
})();
