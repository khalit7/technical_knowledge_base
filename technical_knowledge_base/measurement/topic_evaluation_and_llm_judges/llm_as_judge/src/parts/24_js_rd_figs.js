// ---- Reading: static figures (hero, modes, prompt anatomy, order cost, null model, kappa, reliability vs validity, jury, JudgeBench, list vs item) ----
// Drawn at the measured width when the Reading tab opens and on resize. Numbers from the MT-Bench data are computed with LJ
// (checked against src/recompute.json by src/check_page.mjs); published numbers carry their source in the caption beside each figure.
(function(){
  if(!document.getElementById('lj-hero'))return;
  const L=window.LJ,$=id=>document.getElementById(id),T=RD.t,esc=RD.esc;
  const tw=(s,fs)=>String(s).length*(fs||11)*0.56;   // rough text width
  const WIDE=640;
  // a box with lines of text: lines = [[text, {w:bold, fill}] ...], centred
  function box(x,y,w,h,lines,o){o=o||{};
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>';
    const n=lines.length,lh=15,y0=y+h/2-(n-1)*lh/2+4;
    lines.forEach((l,i)=>{const t=typeof l==='string'?[l,{}]:l;s+=T(x+w/2,y0+i*lh,t[0],Object.assign({a:'middle',fs:11.5},t[1]))});
    return s}
  function arrow(x1,y1,x2,y2,c,lab){c=c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),h=7;
    let s='<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-Math.cos(a)*2)+'" y2="'+(y2-Math.sin(a)*2)+'" stroke="'+c+'" stroke-width="1.6"/>'+
      '<path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45))+' '+(y2-h*Math.sin(a-0.45))+' L'+(x2-h*Math.cos(a+0.45))+' '+(y2-h*Math.sin(a+0.45))+'Z" fill="'+c+'"/>';
    if(lab)s+=T((x1+x2)/2+6,(y1+y2)/2+4,lab,{fs:11,fill:'var(--mute)'});
    return s}
  const put=(id,w,h,body,label)=>{$(id).innerHTML=RD.svg(w,h,body,label)};

  // ---------- hero ----------
  function hero(){
    const W=RD.width($('lj-hero')),I=L.items(2,'P'),C=L.calib(I,100,1),P=x=>L.pct(x);
    const B={
      prompt:[['Prompt',{w:600}],'rubric, reference,','candidate fenced as data'],
      judge:[['Judge model',{w:600}],'GPT-4, both orders'],
      verd:[['Verdicts on all items',{w:600}],'n = '+I.length.toLocaleString()+' votes'],
      raw:[['Raw judge rate',{w:600}],['p̂ = '+P(C.p),{fill:'var(--bad)',w:600}]],
      gold:[['Gold slice',{w:600}],C.g.length+' human labels'],
      corr:[['Corrected θ̂ = '+P(C.c.est),{w:600,fill:'var(--acc)'}],P(C.c.lo)+' to '+P(C.c.hi),['truth '+P(C.th),{fill:'var(--mute)'}]],
      trust:[['Trust averages, not single verdicts',{w:600}],'ranking Spearman 0.94; single votes 66%']
    };
    const hi={fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5};
    let s='',H;
    const biasTxt='biases leak in: order, length, own family, names, authority';
    if(W>=WIDE){
      const g=26,c=(W-3*g-2)/4,X=i=>1+i*(c+g),bh=64,y1=44,y2=y1+bh+52;H=y2+bh+4;
      s+=T(X(1)+c/2,14,'order, length, own family,',{a:'middle',fs:11,fill:'var(--bad)'})+T(X(1)+c/2,28,'names, authority',{a:'middle',fs:11,fill:'var(--bad)'});
      s+=arrow(X(1)+c/2,31,X(1)+c/2,y1,'var(--bad)');
      s+=box(X(0),y1,c,bh,B.prompt)+box(X(1),y1,c,bh,B.judge,hi)+box(X(2),y1,c,bh,B.verd)+box(X(3),y1,c,bh,B.raw);
      for(let i=0;i<3;i++)s+=arrow(X(i)+c,y1+bh/2,X(i+1),y1+bh/2);
      s+=box(X(0),y2,2*c+g,bh,B.trust)+box(X(2),y2,c,bh,B.gold)+box(X(3),y2,c,bh+0,B.corr,{fill:'var(--bg)',stroke:'var(--acc)',sw:1.5});
      s+=arrow(X(2)+c/2,y1+bh,X(2)+c/2,y2,'var(--mute)');s+=T(X(2)+c/2+6,y1+bh+30,'random subset',{fs:11,fill:'var(--mute)'});
      s+=arrow(X(2)+c,y2+bh/2,X(3),y2+bh/2,'var(--acc)');
      s+=arrow(X(3)+c/2,y1+bh,X(3)+c/2,y2,'var(--acc)');s+=T(X(3)+c/2+6,y1+bh+30,'q̂1, q̂0',{fs:11,fill:'var(--acc)'});
    }else{
      const g=14,full=W-2,c=(full-g)/2,bh=50;let y=0;
      s+=box(1,y,full,bh,B.prompt.slice(0,1).concat([B.prompt[1]+' '+B.prompt[2]]));y+=bh;
      s+=T(W/2,y+16,biasTxt.length*6.2<W?biasTxt:'biases: order, length, own family, names',{a:'middle',fs:11,fill:'var(--bad)'});
      s+=arrow(W/2,y+20,W/2,y+30,'var(--bad)');y+=30;
      s+=box(1,y,full,bh,B.judge,hi);s+=arrow(W/2,y+bh,W/2,y+bh+18);y+=bh+18;
      s+=box(1,y,full,bh,B.verd);s+=arrow(c/2,y+bh,c/2,y+bh+18);s+=arrow(1+c+g+c/2,y+bh,1+c+g+c/2,y+bh+18);s+=T(1+c+g+c/2+6,y+bh+13,'random subset',{fs:11,fill:'var(--mute)'});y+=bh+18;
      s+=box(1,y,c,bh,B.raw)+box(1+c+g,y,c,bh,B.gold);s+=arrow(c/2,y+bh,c/2,y+bh+18,'var(--acc)');s+=arrow(1+c+g+c/2,y+bh,1+c+g+c/2,y+bh+18,'var(--acc)');y+=bh+18;
      s+=box(1,y,full,58,B.corr,{fill:'var(--bg)',stroke:'var(--acc)',sw:1.5});y+=58+12;
      s+=box(1,y,full,bh,B.trust);y+=bh;H=y+2;
    }
    put('lj-hero',W,H,s,'An LLM judge as an instrument: prompt, judge, verdicts, raw rate; a gold slice of human labels gives the judge error rates that correct the raw rate');
  }

  // ---------- four modes ----------
  function modes(){
    const W=RD.width($('lj-modes')),cols=W>=680?4:2,g=12,pw=(W-(cols-1)*g-2)/cols,ph=150;
    const M=[['Pointwise',['answer'],'score, or pass/fail','1 call per answer'],
      ['Pairwise',['A','B'],'A, B or tie','2 calls: both orders'],
      ['Reference-guided',['answer','reference'],'pass or fail','math fails: 14 to 3 of 20'],
      ['Checklist',['answer','q1 q2 q3'],'yes/no per item','3 to 25 items per query']];
    let s='';
    M.forEach((m,i)=>{const x=1+(i%cols)*(pw+g),y=Math.floor(i/cols)*(ph+g);
      s+='<rect x="'+x+'" y="'+y+'" width="'+pw+'" height="'+ph+'" rx="8" fill="none" stroke="var(--line)"/>';
      s+=T(x+pw/2,y+18,m[0],{a:'middle',fs:12.5,w:600});
      const n=m[1].length,cw=Math.min(78,(pw-16-(n-1)*8)/n),tot=n*cw+(n-1)*8;
      m[1].forEach((c,j)=>{const cx=x+pw/2-tot/2+j*(cw+8);s+=box(cx,y+28,cw,24,[[c,{fs:11}]],c==='reference'||c.startsWith('q1')?{fill:'var(--open2)'}:{})});
      s+=arrow(x+pw/2,y+54,x+pw/2,y+70);
      s+=box(x+pw/2-36,y+70,72,22,[['judge',{fs:11,w:600}]],{fill:'var(--acc2)',stroke:'var(--acc)'});
      s+=arrow(x+pw/2,y+93,x+pw/2,y+108);
      s+=T(x+pw/2,y+124,m[2],{a:'middle',fs:11.5,w:600});
      s+=T(x+pw/2,y+141,m[3],{a:'middle',fs:11,fill:'var(--mute)'});
    });
    const rows=Math.ceil(M.length/cols);
    put('lj-modes',W,rows*ph+(rows-1)*g+1,s,'Four judge modes: what the judge sees and what it returns');
  }

  // ---------- prompt anatomy ----------
  function prompt(){
    const W=RD.width($('lj-prompt')),wide=W>=WIDE;
    const R=[['Rubric: pass/fail or a few anchored levels','few levels, written criteria'],
      ['Reference answer, test results, evidence','rescues correctness grading'],
      ['<candidate> ... </candidate>','data, not instructions; no model names'],
      ['Analysis first, then [[A]], [[B]] or [[C]]','parsed; failures counted; temperature 0']];
    let s='',y=0;
    s+=T(0,13,'pinned in the eval config: judge version + prompt hash',{fs:11,fill:'var(--mute)'});y=22;
    const bw=wide?Math.min(360,W*0.56):W-2,bh=wide?34:46;
    R.forEach((r,i)=>{
      s+='<rect x="1" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="5" fill="'+(i===2?'var(--hl)':'var(--soft)')+'" stroke="var(--line)"/>';
      s+=T(10,y+(wide?21:19),esc(r[0]),{fs:11.5,w:600});
      if(wide){s+=arrow(bw+28,y+bh/2,bw+8,y+bh/2,'var(--mute)')+T(bw+34,y+bh/2+4,r[1],{fs:11.5,fill:'var(--mute)'})}
      else s+=T(10,y+36,r[1],{fs:11,fill:'var(--mute)'});
      y+=bh+6});
    put('lj-prompt',W,y,s,'Anatomy of a judge prompt: rubric, reference, fenced candidate, analysis then a parsed verdict');
  }

  // ---------- order: one order against both ----------
  function order(){
    const W=RD.width($('lj-order')),o={scope:'g35'};
    const rows=[['F','Shown first'],['B','Shown second'],['FB','Both orders']].map(r=>Object.assign({lab:r[1]},L.agree(r[0],o)));
    const two=W>=560,pw=two?(W-24)/2:W-2,lw=94,rh=24;
    function panel(x0,y0,title,key,max,fmt,ticks,col){
      let s=T(x0,y0+12,title,{fs:12,w:600});const bx=x0+lw,bw=pw-lw-56;
      ticks.forEach(t=>{const x=bx+bw*t/max;s+='<line x1="'+x+'" y1="'+(y0+20)+'" x2="'+x+'" y2="'+(y0+22+rows.length*rh)+'" stroke="var(--line)"/>'+T(x,y0+34+rows.length*rh,fmt(t,1),{a:'middle',fs:11,fill:'var(--mute)'})});
      rows.forEach((r,i)=>{const y=y0+24+i*rh,v=r[key],last=i===rows.length-1;
        s+=T(bx-6,y+13,r.lab,{a:'end',fs:11.5,w:last?600:400});
        s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+Math.max(1,bw*v/max)+'" height="14" rx="2" fill="'+(last?col:'var(--dim)')+'"/>';
        s+=T(bx+bw*v/max+5,y+14,fmt(v),{fs:11.5,w:last?600:400})});
      return s}
    const ph=24+rows.length*rh+20;
    let s=panel(1,0,'Kappa with humans (higher is better)','kappa',0.4,(v,t)=>t?v.toFixed(1):v.toFixed(3),[0,0.1,0.2,0.3,0.4],'var(--acc)');
    s+=two?panel(pw+23,0,'Judge tie rate (cost)','ties',0.3,(v,t)=>(v*100).toFixed(t?0:1)+'%',[0,0.1,0.2,0.3],'var(--bad)'):panel(1,ph+14,'Judge tie rate (cost)','ties',0.3,(v,t)=>(v*100).toFixed(t?0:1)+'%',[0,0.1,0.2,0.3],'var(--bad)');
    put('lj-order',W,two?ph+2:2*ph+16,s,'Kappa with humans and tie rate for one order against both orders');
  }

  // ---------- null model ----------
  function nullm(){
    const W=RD.width($('lj-null'));
    const G=[['AlpacaEval 2.0, LC win rate',[76.8,86.5,57.5]],['AlpacaEval 2.0, raw win rate',[59.5,76.9,51.3]],['Arena-Hard-Auto, win rate',[67.2,83.0,82.6]]];
    const cols=['var(--c2)','var(--bad)','var(--c3)'],nm=['constant string','+ prefix','best real model'];
    const lw=W>=560?120:96,bw=W-lw-48,bh=13;let s='',y=4;
    [0,25,50,75,100].forEach(t=>{const x=lw+bw*t/100;s+='<line x1="'+x+'" y1="14" x2="'+x+'" y2="'+(14+G.length*68)+'" stroke="var(--line)"/>'+T(x,10,t+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    y=18;
    G.forEach(g=>{s+=T(0,y+12,g[0],{fs:11.5,w:600});y+=18;
      g[1].forEach((v,i)=>{s+=T(lw-6,y+10,nm[i],{a:'end',fs:11,fill:'var(--mute)'})+'<rect x="'+lw+'" y="'+y+'" width="'+(bw*v/100)+'" height="'+bh+'" rx="2" fill="'+cols[i]+'"/>'+T(lw+bw*v/100+4,y+11,v.toFixed(1)+'%',{fs:11,w:i===1?600:400});y+=bh+3});
      y+=2});
    put('lj-null',W,y+4,s,'Null-model win rates against the best real model on three GPT-4-judged leaderboards');
  }

  // ---------- kappa on the confusion matrix ----------
  function kappa(){
    const W=RD.width($('lj-kappa')),r=L.agree('P',{scope:'all'}),cm=r.cm,N=r.n;
    const rs=cm.map(x=>x[0]+x[1]+x[2]),cs=[0,1,2].map(c=>cm[0][c]+cm[1][c]+cm[2][c]);
    const po=(cm[0][0]+cm[1][1]+cm[2][2])/N,pe=rs.reduce((a,x,i)=>a+x*cs[i],0)/N/N,k=(po-pe)/(1-pe);
    const lab=['A wins','B wins','tie'],lw=78,cw=Math.min(74,(Math.min(W,420)-lw-4)/4),ch=28,top=34;
    let s=T(lw+1.5*cw,12,'GPT-4 judge',{a:'middle',fs:11.5,w:600});
    lab.forEach((l,j)=>{s+=T(lw+j*cw+cw/2,top-6,l,{a:'middle',fs:11,fill:'var(--mute)'})});s+=T(lw+3*cw+cw/2,top-6,'total',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let i=0;i<3;i++){const y=top+i*ch;s+=T(lw-6,y+18,'human: '+lab[i],{a:'end',fs:11,fill:'var(--mute)'});
      for(let j=0;j<3;j++){s+='<rect x="'+(lw+j*cw)+'" y="'+y+'" width="'+cw+'" height="'+ch+'" fill="'+(i===j?'var(--acc2)':'var(--bg)')+'" stroke="var(--line)"/>'+T(lw+j*cw+cw/2,y+18,cm[i][j].toLocaleString(),{a:'middle',fs:11.5,w:i===j?600:400})}
      s+=T(lw+3*cw+cw/2,y+18,rs[i].toLocaleString(),{a:'middle',fs:11,fill:'var(--mute)'})}
    const yb=top+3*ch;s+=T(lw-6,yb+18,'total',{a:'end',fs:11,fill:'var(--mute)'});cs.forEach((c,j)=>{s+=T(lw+j*cw+cw/2,yb+18,c.toLocaleString(),{a:'middle',fs:11,fill:'var(--mute)'})});
    s+=T(lw+3*cw+cw/2,yb+18,N.toLocaleString(),{a:'middle',fs:11,w:600});
    const mw=lw+4*cw,side=W-mw>=200;
    const ax=side?mw+24:0,ay=side?top+8:yb+44,f=n=>n.toLocaleString();
    const sb=c=>'p<tspan dy="3">'+c+'</tspan><tspan dy="-3"> </tspan>';
    const lines=[[sb('o')+'= diagonal / N',{w:600,fill:'var(--acc)'}],[f(cm[0][0]+cm[1][1]+cm[2][2])+' / '+f(N)+' = '+po.toFixed(3),{}],[sb('e')+'= Σ row × column / N² = '+pe.toFixed(3),{}],['κ = ('+sb('o')+'− '+sb('e')+') / (1 − '+sb('e')+') = '+k.toFixed(3),{w:600}]];
    lines.forEach((l,i)=>{s+=T(ax,ay+i*19,l[0],Object.assign({fs:12},l[1]))});
    put('lj-kappa',W,side?yb+30:ay+3*19+10,s,'Confusion matrix of human votes against GPT-4 verdicts with the kappa arithmetic');
  }

  // ---------- reliability against validity ----------
  function rv(){
    const W=RD.width($('lj-rv')),R=Math.min(70,(W-40)/4-4),cy=R+26,r=L.rng(7);
    const T2=[['reliable and valid',0,0],['reliable, not valid',0.55,-0.3]];
    let s='';
    T2.forEach((t,i)=>{const cx=W/4+i*W/2;s+=T(cx,13,t[0],{a:'middle',fs:12,w:600});
      [1,2/3,1/3].forEach(f=>{s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R*f+'" fill="none" stroke="var(--line)" stroke-width="1.5"/>'});
      s+='<circle cx="'+cx+'" cy="'+cy+'" r="3" fill="var(--mute)"/>';
      for(let k=0;k<9;k++){const dx=(r()-0.5)*R*0.22,dy=(r()-0.5)*R*0.22;s+='<circle cx="'+(cx+t[1]*R+dx).toFixed(1)+'" cy="'+(cy+t[2]*R+dy).toFixed(1)+'" r="3.2" fill="'+(i?'var(--bad)':'var(--acc)')+'"/>'}
      s+=T(cx,cy+R+16,i?'same verdict every run; wrong':'same verdict, right',{a:'middle',fs:11,fill:'var(--mute)'})});
    put('lj-rv',W,cy+R+22,s,'Two targets: a reliable and valid judge, and a reliable but biased one');
  }

  // ---------- jury: mean against median ----------
  function jury(){
    const W=RD.width($('lj-jury')),lw=W>=520?120:82,pw=W-lw-16,X=v=>lw+pw*(v-1)/4,rh=74;
    const base=[3.5,3.75,4,4.25,4.5],rows=[['all healthy',base,0],['one collapsed',[1].concat(base.slice(0,4)),1],['two collapsed',[1,1].concat(base.slice(0,3)),2]];
    let s='';[1,2,3,4,5].forEach(v=>{s+='<line x1="'+X(v)+'" y1="10" x2="'+X(v)+'" y2="'+(10+rows.length*rh)+'" stroke="var(--line)"/>'+T(X(v),rows.length*rh+24,v,{a:'middle',fs:11,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=i*rh+30,v=r[1].slice().sort((a,b)=>a-b),mean=v.reduce((a,x)=>a+x,0)/v.length,med=v[2];
      s+=T(lw-8,y+4,r[0],{a:'end',fs:11.5});
      s+='<line x1="'+X(1)+'" y1="'+y+'" x2="'+X(5)+'" y2="'+y+'" stroke="var(--dim)" stroke-width="2"/>';
      const seen={};v.forEach(x=>{const k=seen[x]=(seen[x]||0)+1,failed=x===1;s+='<circle cx="'+(X(x)+(k-1)*11)+'" cy="'+y+'" r="5" fill="'+(failed?'var(--bad)':'var(--mute)')+'"/>'});
      s+='<path d="M'+X(mean)+' '+(y-8)+' l-5 -9 h10z" fill="var(--c2)"/>'+T(X(mean),y-20,'mean '+mean.toFixed(2),{a:'middle',fs:11,fill:'var(--c2)'});
      s+='<path d="M'+X(med)+' '+(y+8)+' l-5 9 h10z" fill="var(--acc)"/>'+T(X(med),y+29,'median '+med.toFixed(2),{a:'middle',fs:11,fill:'var(--acc)'});
    });
    put('lj-jury',W,rows.length*rh+30,s,'Five jurors on a 1 to 5 scale: mean and median as jurors collapse to 1');
  }

  // ---------- JudgeBench ----------
  function jb(){
    const W=RD.width($('lj-jb')),wide=W>=600;
    const Rw=[['NVIDIA generative RM (vendor-run)',81.4,'var(--c4)'],['o3-mini (high), v2',80.86,'var(--c1)'],['o1-preview',75.43,'var(--c1)'],['Claude 3.5 Sonnet',64.29,'var(--c1)'],['Skywork-Reward-Gemma-2-27B',64.29,'var(--c3)'],['GPT-4o, Arena-Hard prompt',56.57,'var(--c1)'],['Prometheus 2 8x7B',40.29,'var(--c2)'],['Auto-J 13B',36.57,'var(--c2)'],['JudgeLM-33B',35.71,'var(--c2)'],['ChatEval debate, GPT-4o',34.0,'var(--c5)'],['PandaLM-7B',13.14,'var(--c2)']];
    const lw=wide?196:0,bw=W-lw-52,rh=wide?22:34,X=v=>lw+bw*v/100;let s='';
    const top=16,H=top+Rw.length*rh+6;
    [0,25,50,75,100].forEach(t=>{s+='<line x1="'+X(t)+'" y1="'+top+'" x2="'+X(t)+'" y2="'+(H-4)+'" stroke="var(--line)"/>'+T(X(t),11,t+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    s+='<line x1="'+X(50)+'" y1="'+top+'" x2="'+X(50)+'" y2="'+(H-4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    Rw.forEach((r,i)=>{const y=top+i*rh;
      if(wide)s+=T(lw-6,y+14,r[0],{a:'end',fs:11.5});else s+=T(0,y+11,r[0],{fs:11});
      const by=wide?y+4:y+15;s+='<rect x="'+lw+'" y="'+by+'" width="'+(bw*r[1]/100)+'" height="13" rx="2" fill="'+r[2]+'"/>'+T(X(r[1])+4,by+11,r[1].toFixed(2).replace(/\.?0+$/,'')+'%',{fs:11})});
    s+=T(X(50)+4,H-6,'coin',{fs:11,fill:'var(--mute)'});
    put('lj-jb',W,H,s,'JudgeBench accuracy by judge family');
    $('lj-jb').insertAdjacentHTML('beforeend','<div class="leg"><span style="--sw:var(--c1)">prompted frontier model</span><span style="--sw:var(--c3)">reward model</span><span style="--sw:var(--c4)">generative verifier</span><span style="--sw:var(--c2)">fine-tuned judge</span><span style="--sw:var(--c5)">debate</span><span style="--sw:var(--ink)">dashed: 50%</span></div>');
  }

  // ---------- list against instance ----------
  function list(){
    const W=RD.width($('lj-list')),Wr=L.winRates('P',{scope:'all'}).sort((a,b)=>b.h-a.h);
    const lw=W>=520?110:92,vw=82,pw=W-lw-vw-12,X=v=>lw+pw*v,rh=26,top=18;let s='';
    [0,0.25,0.5,0.75,1].forEach(t=>{s+='<line x1="'+X(t)+'" y1="'+top+'" x2="'+X(t)+'" y2="'+(top+Wr.length*rh)+'" stroke="var(--line)"/>'+T(X(t),12,Math.round(t*100)+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    Wr.forEach((w,i)=>{const y=top+i*rh+13;
      s+=T(lw-6,y+4,esc(L.nm(w.m)),{a:'end',fs:11.5})+'<line x1="'+X(w.h)+'" y1="'+y+'" x2="'+X(w.j)+'" y2="'+y+'" stroke="var(--mute)" stroke-width="2"/>'+
        '<circle cx="'+X(w.h)+'" cy="'+y+'" r="5.5" fill="var(--c3)"/><circle cx="'+X(w.j)+'" cy="'+y+'" r="5.5" fill="var(--c2)"/>'+
        T(W-2,y+4,(100*w.h).toFixed(1)+' → '+(100*w.j).toFixed(1),{a:'end',fs:11})});
    put('lj-list',W,top+Wr.length*rh+4,s,'Win rates by model, humans against the GPT-4 judge');
    if(!$('lj-list-leg'))$('lj-list').insertAdjacentHTML('afterend','<div class="leg" id="lj-list-leg"><span style="--sw:var(--c3)">humans</span><span style="--sw:var(--c2)">GPT-4 judge</span><span style="--sw:var(--line)">right: humans → judge, %</span></div>');
  }

  const ALL=[hero,modes,prompt,order,nullm,kappa,rv,jury,jb,list];
  const draw=()=>ALL.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr('figure '+f.name+': '+e.message)}});
  RD.onRender(draw);RD.onResize(draw);
})();
