// ---- Figures of the Reading tab: the hero (generalization against superposition), the car circuit's two readings,
// InceptionV1's last layer, SwiGLU's sign quadrants, the near-miss test and the "how clean" numbers side by side.
// Every number is printed by the essay or a source named in its caption; the hero and the car circuit are labelled schematics.
// Drawn at the card's measured width, redrawn when the tab opens and on resize. Prefix nc.
(function(){
  if(!window.RD||!document.getElementById('nc-hero-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t, E=RD.esc;
  const line=(x1,y1,x2,y2,c,w,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(d?' stroke-dasharray="'+d+'"':'')+'/>';
  const rect=(x,y,w,h,f,s,rx,extra)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx==null?6:rx)+'" fill="'+f+'"'+(s?' stroke="'+s+'" stroke-width="1.5"':'')+(extra||'')+'/>';

  // ---------- Fig. 1, hero: 24 things on a ring, N neurons, generalization (arcs) against superposition (spread) ----------
  const FAM=[['dogs','var(--c3)',['beagle','spaniel','basset','poodle','terrier','husky']],
             ['cars','var(--c4)',['taxi','sedan','van','jeep','convertible','wagon']],
             ['Latin poetry','var(--c5)',['Virgil','Ovid','Horace','Catullus','Lucretius','Propertius']],
             ['curves','var(--c6)',['arc','loop','spiral','circle','wave','hook']]];
  const ITEMS=[];FAM.forEach((f,fi)=>f[2].forEach(n=>ITEMS.push({n,fi})));
  const H={N:8,k:0};
  const members=(mode,N,k)=>{const m=24/N;return ITEMS.map((x,i)=>i).filter(i=>mode==='g'?Math.floor(i/m)===k:i%N===k)};
  function ring(cx,cy,r,mode){
    const mem=members(mode,H.N,H.k),col=mode==='g'?'var(--c1)':'var(--c2)';let s='';
    const ang=i=>-Math.PI/2+(i+0.5)*2*Math.PI/24;
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)"/>';
    mem.forEach(i=>{const a=ang(i);s+=line(cx,cy,cx+r*Math.cos(a),cy+r*Math.sin(a),col,2.2)});
    ITEMS.forEach((x,i)=>{const a=ang(i),on=mem.includes(i);
      s+='<circle cx="'+(cx+r*Math.cos(a)).toFixed(1)+'" cy="'+(cy+r*Math.sin(a)).toFixed(1)+'" r="'+(on?8:6)+'" fill="'+FAM[x.fi][1]+'" fill-opacity="'+(on?1:.3)+'"'+(on?' stroke="var(--ink)" stroke-width="2"':'')+'/>'});
    FAM.forEach((f,fi)=>{const a=ang(fi*6+2.5),lx=cx+(r+16)*Math.cos(a),ly=cy+(r+16)*Math.sin(a)+4;
      s+=t(lx.toFixed(1),ly.toFixed(1),f[0],{fs:12,a:Math.abs(Math.cos(a))<.3?'middle':Math.cos(a)>0?'start':'end',fill:'var(--mute)'})});
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="13" fill="'+col+'"/>'+t(cx,cy+4,String(H.k+1),{fs:12,a:'middle',fill:'var(--bg)',w:700});
    return s;
  }
  function hero(){
    const el=$('nc-hero-svg'),W=RD.width(el),side=W>=520;
    const pw=side?W/2:W,r=Math.max(56,Math.min(120,(pw-150)/2)),ph=2*r+70;
    let s='';
    [['g','Generalization: one unbroken arc','var(--c1)'],['s','Superposition: spread far apart','var(--c2)']].forEach((p,j)=>{
      const ox=side?j*pw:0,oy=side?0:j*ph;
      s+=t(ox+pw/2,oy+16,p[1],{fs:13,a:'middle',fill:p[2],w:600})+ring(ox+pw/2,oy+38+r,r,p[0])});
    el.innerHTML=RD.svg(W,side?ph:2*ph,s,'Twenty-four things on a ring; one neuron highlighted under generalization and under superposition');
    const nm=(mode)=>members(mode,H.N,H.k).map(i=>ITEMS[i].n),fams=mode=>new Set(members(mode,H.N,H.k).map(i=>ITEMS[i].fi)).size;
    $('nc-hero-out').innerHTML='Neuron '+(H.k+1)+' of '+H.N+'. <span class="nc-g">Generalization</span>: '+nm('g').join(', ')+' ('+fams('g')+' famil'+(fams('g')>1?'ies':'y')+'). <span class="nc-s">Superposition</span>: '+nm('s').join(', ')+' ('+fams('s')+' families).';
  }
  function heroK(){const el=$('nc-hero-k');el.innerHTML=Array.from({length:H.N},(_,i)=>'<button data-m="'+i+'"'+(i===H.k?' class="on"':'')+' aria-label="Follow neuron '+(i+1)+'">'+(i+1)+'</button>').join('')}
  RD.seg($('nc-hero-n'),v=>{H.N=+v;H.k=0;heroK();hero()});
  RD.seg($('nc-hero-k'),v=>{H.k=+v;hero()});
  heroK();

  // ---------- Fig. 2: the car circuit, two readings ----------
  const CAR={old:{r:['dog','dog','dog','dog'],rc:['var(--c2)','var(--c2)','var(--c2)','var(--c2)'],viz:'free feature visualization: every reader draws dogs',
      out:[['car read back out later','var(--c2)',true]],note:'2020 reading: the car is hidden among dog neurons for later layers to recover.',
      cap:'Zoom In: car neuron 4c:447 spreads into dog neurons, read as the car stored in a high-dimensional hiding place and recovered later. The essay finds no later neuron that reads this combination.'},
    new:{r:['car','car','pose: cars + dogs','pose: cars + dogs'],rc:['var(--c4)','var(--c4)','var(--c1)','var(--c1)'],viz:'guided along real car images’ paths',
      out:[['car specialists (taxis, ambulances)','var(--c4)',false],['finer poses, dog specialists','var(--c1)',false]],note:'2026 reading: shared pose, refined downstream into car and dog specialists.',
      cap:'The essay: guided visualization shows two readers are car neurons and two are pose neurons shared by cars and dogs, among more than a hundred pose neurons in InceptionV1; later layers keep differentiating them. Nothing is hidden.'}};
  let carM='old';
  function car(){
    const el=$('nc-car-svg'),W=RD.width(el),C=CAR[carM],narrow=W<460;
    const c0=narrow?8:12,bw0=narrow?Math.min(88,W*0.24):Math.min(120,W*0.22),rw=narrow?Math.min(112,W*0.33):Math.min(150,W*0.3),ow=W-c0-bw0-rw-(narrow?24:56),rh=34,gap=10,H=4*(rh+gap)+40;
    const x1=c0+bw0+(narrow?10:24),x2=x1+rw+(narrow?10:24);
    let s='';
    const cy=20+2*(rh+gap)-gap/2;
    s+=rect(c0,cy-24,bw0,48,'var(--soft)','var(--c4)')+t(c0+bw0/2,cy-4,'car',{fs:12.5,a:'middle',w:600})+t(c0+bw0/2,cy+13,'4c:447',{fs:12,a:'middle',fill:'var(--mute)'});
    C.r.forEach((lab,i)=>{const y=20+i*(rh+gap);s+=line(c0+bw0,cy,x1,y+rh/2,'var(--line)',2)+rect(x1,y,rw,rh,'var(--card)',C.rc[i])+t(x1+rw/2,y+rh/2+4,lab,{fs:12,a:'middle',fill:C.rc[i],w:600})});
    s+=t(x1+rw/2,14,'4 readers of 4c:447',{fs:12,a:'middle',fill:'var(--mute)'});
    const outs=C.out,oh=outs.length===1?60:44;
    outs.forEach((o,j)=>{const y=outs.length===1?cy-oh/2:20+j*2*(rh+gap)+8,yc=y+oh/2;
      // old: every reader feeds the imagined read-out (dashed); new: car readers feed car specialists, pose readers feed both
      C.r.forEach((lab,i)=>{const ry=20+i*(rh+gap)+rh/2;if(outs.length===1||j===0||i>=2)s+=line(x1+rw,ry,x2,yc,o[2]?'var(--c2)':'var(--line)',o[2]?1.5:2,o[2]?'4 4':'')});
      s+=rect(x2,y,ow,oh,o[2]?'none':'var(--soft)',o[1],6,o[2]?' stroke-dasharray="5 4"':'');
      const words=o[0].split(' '),half=Math.ceil(words.length/2),l1=narrow?words.slice(0,half).join(' '):o[0],l2=narrow?words.slice(half).join(' '):'';
      s+=t(x2+ow/2,yc+(l2?-3:4),E(l1),{fs:12,a:'middle',fill:o[1]})+(l2?t(x2+ow/2,yc+12,E(l2),{fs:12,a:'middle',fill:o[1]}):'');
      if(o[2])s+=t(x2+ow/2,y+oh+15,'nothing reads it',{fs:12,a:'middle',fill:'var(--bad)',w:600});});
    s+=t(W/2,H-6,C.viz,{fs:12,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,C.note);
    $('nc-car-out').textContent=C.cap;
  }
  RD.seg($('nc-car-m'),v=>{carM=v;car()});

  // ---------- Fig. 3: InceptionV1's last layer, share of neurons judged easily interpretable ----------
  const MIC=[['InceptionV1 (2014), that era’s tools, Gorton',0,'about 0%','var(--dim)'],['InceptionV1 (2014), that era’s tools, author',5,'about 5%','var(--mute)'],
    ['Same checkpoint, better tools',50,'about 50%','var(--c1)'],['InceptionV1 retrained, modern regularisation',70,'about 70%','var(--c3)'],['ConvNeXt, same size and data',99,'about 99%','var(--c3)']];
  function micro(){
    const el=$('nc-micro-svg'),W=RD.width(el),L=8,R=W-70,bh=16,gh=44,H=MIC.length*gh+24;
    const x=v=>L+v/100*(R-L);let s='';
    [0,25,50,75,100].forEach(v=>{s+=line(x(v),0,x(v),H-20,'var(--line)')+t(x(v),H-6,v+'%',{fs:11,a:'middle',fill:'var(--mute)'})});
    MIC.forEach((m,i)=>{const y=i*gh+4;s+=t(L,y+12,E(m[0]),{fs:12,fill:'var(--ink)'})+rect(L,y+18,Math.max(3,x(m[1])-L),bh,m[3],'',3)+t(Math.max(3,x(m[1]))+6,y+18+bh-3,m[2],{fs:12,fill:'var(--ink)',w:600})});
    el.innerHTML=RD.svg(W,H,s,'Share of InceptionV1 and ConvNeXt last-layer neurons judged interpretable')+
      '<div class="wp-lg"><span><i style="background:var(--mute)"></i>2014 checkpoint, old tools</span><span><i style="background:var(--c1)"></i>better microscope</span><span><i style="background:var(--c3)"></i>better training or architecture</span></div>';
  }

  // ---------- Fig. 4: SwiGLU sign quadrants and the SiLU dip ----------
  const silu=x=>x/(1+Math.exp(-x));
  function glu(){
    const el=$('nc-glu-svg'),W=RD.width(el),side=W>=520,gw=side?Math.min(250,W*0.48):Math.min(300,W),cell=(gw-40)/2;
    let s='';const gx=side?0:(W-gw)/2,gy=34;
    s+=t(gx+40+cell,14,'value',{fs:12,a:'middle',fill:'var(--mute)'})+t(gx+40+cell/2,28,'+',{fs:13,a:'middle',w:700})+t(gx+40+1.5*cell,28,'−',{fs:13,a:'middle',w:700});
    s+=t(gx+6,gy+cell,'gate',{fs:12,fill:'var(--mute)'})+t(gx+30,gy+cell/2+5,'+',{fs:13,a:'middle',w:700})+t(gx+30,gy+1.5*cell+5,'−',{fs:13,a:'middle',w:700});
    const Q=[[0,0,'+','main positive pole','var(--c1)'],[0,1,'−','negative pole','var(--mute)'],[1,0,'small −','faint','var(--mute)'],[1,1,'small +','double negative','var(--c2)']];
    Q.forEach(q=>{const x=gx+40+q[1]*cell,y=gy+q[0]*cell,hi=q[0]===1&&q[1]===1;
      s+=rect(x+2,y+2,cell-4,cell-4,hi?'var(--card)':'var(--soft)',q[4],8)+t(x+cell/2,y+cell/2-2,q[2],{fs:15,a:'middle',fill:q[4],w:700})+t(x+cell/2,y+cell/2+16,q[3],{fs:12,a:'middle',fill:'var(--mute)'})});
    // SiLU curve
    const px=side?gw+24:12,py=side?gy:gy+2*cell+24,pw=side?W-px-8:W-24,ph=side?2*cell:150;
    const X=v=>px+(v+6)/10*pw,Y=v=>py+ph-(v+0.6)/4.6*ph;
    s+=line(X(-6),Y(0),X(4),Y(0),'var(--line)')+line(X(0),Y(-0.6),X(0),Y(4),'var(--line)');
    let d='';for(let i=0;i<=120;i++){const v=-6+i/12;d+=(i?'L':'M')+X(v).toFixed(1)+' '+Y(silu(v)).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    s+='<circle cx="'+X(-1.278).toFixed(1)+'" cy="'+Y(-0.2785).toFixed(1)+'" r="4.5" fill="var(--c2)"/>'+t(X(-1.278),Y(-0.2785)+18,'min −0.278',{fs:12,a:'middle',fill:'var(--c2)',w:600});
    s+=t(X(4),Y(0)-6,'gate',{fs:12,a:'end',fill:'var(--mute)'})+t(X(0)+6,Y(4)+12,'SiLU(gate)',{fs:12,fill:'var(--mute)'});
    [-4,2].forEach(v=>{s+=t(X(v),Y(0)+14,String(v).replace('-','−'),{fs:11,a:'middle',fill:'var(--mute)'})});
    const H=side?gy+2*cell+10:py+ph+10;
    el.innerHTML=RD.svg(W,H,s,'SwiGLU output sign for each sign of gate and value, and the SiLU curve with its minimum');
  }

  // ---------- Fig. 5: the near-miss test ----------
  function near(){
    const el=$('nc-near-svg'),W=RD.width(el),L=8,R=W-56,bh=18,gh=46;
    const B=[['5 examples written from the explanation',76,'76%','var(--c1)'],['5 near misses written to fool it',11,'11%','var(--mute)'],['5 texts on the most distant concept',1,'about 1%','var(--c2)']];
    const x=v=>L+v/100*(R-L);let s='';
    B.forEach((b,i)=>{const y=i*gh+4;s+=t(L,y+12,b[0],{fs:12})+rect(L,y+18,Math.max(3,x(b[1])-L),bh,b[3],'',3)+t(Math.max(L+3,x(b[1]))+6,y+18+bh-4,b[2],{fs:12,w:600})});
    const y0=3*gh+20;s+=t(L,y0,'Per neuron (183): did the explanation win?',{fs:12});
    const tot=183,segs=[[164,'won 164','var(--c1)'],[15,'tied 15','var(--dim)'],[4,'lost 4','var(--c2)']];let cx=L;const bw=R+40-L;
    segs.forEach(g=>{const w=g[0]/tot*bw;s+=rect(cx,y0+8,Math.max(2,w-1),bh,g[2],'',2);cx+=w});
    s+=t(L,y0+8+bh+16,'won 164',{fs:12,fill:'var(--c1)',w:600})+t(L+bw,y0+8+bh+16,'tied 15 · lost 4',{fs:12,a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y0+8+bh+24,s,'Near-miss test results');
  }

  // ---------- Fig. 6: how clean, by whom and by what measure ----------
  const CL=[['OpenAI 2023','GPT-2 XL · GPT-4 explains · simulation ≥ 0.8',0.3,1.7,'0.3%','1.7%'],['Blank 2026','GPT-2 XL · 50 neurons · Opus 5.5, same score',8,8,'8%',''],
    ['Goodfire 2026','GPT-2 XL · 500 neuron papers',5,70,'5% pristine','70% ~one thing'],['Companion paper','Qwen3.6-35B-A3B · 5,468 poles · KL damage',47,69,'47% one mode','69% dominant'],
    ['The essay','Qwen3-32B · preliminary audits',90,97,'90%','97% strong']];
  function clean(){
    const el=$('nc-clean-svg'),W=RD.width(el),L=10,R=W-14,gh=W<520?80:64,H=CL.length*gh+26;
    const x=v=>L+v/100*(R-L);let s='';
    [0,25,50,75,100].forEach(v=>{s+=line(x(v),0,x(v),H-20,'var(--line)')+t(x(v),H-6,v+'%',{fs:11,a:v===0?'start':v===100?'end':'middle',fill:'var(--mute)'})});
    CL.forEach((c,i)=>{const y=i*gh+4,yy=y+42;
      s+=t(L,y+13,c[0],{fs:12.5,w:600})+t(L,y+28,E(c[1]),{fs:12,fill:'var(--mute)'});
      if(c[3]>c[2])s+=line(x(c[2]),yy,x(c[3]),yy,'var(--c1)',3);
      s+='<circle cx="'+x(c[2]).toFixed(1)+'" cy="'+yy+'" r="5.5" fill="var(--card)" stroke="var(--c1)" stroke-width="2"/>';
      if(c[3]>c[2])s+='<circle cx="'+x(c[3]).toFixed(1)+'" cy="'+yy+'" r="5.5" fill="var(--c1)"/>';
      const lab=c[4]+(c[5]?' to '+c[5]:''),lx=x(c[3])+10,fits=lx+lab.length*6.6<R;
      const w=lab.length*6.6,left=x(c[2])-10-w>L;
      s+=fits?t(lx,yy+4,lab,{fs:12}):left?t(x(c[2])-10,yy+4,lab,{fs:12,a:'end'}):t(L,yy+22,lab,{fs:12});});
    el.innerHTML=RD.svg(W,H,s,'Shares of neurons counted as explained, by source')+
      '<div class="wp-lg"><span><i style="border:2px solid var(--c1);background:none"></i>strict definition</span><span><i style="background:var(--c1)"></i>loose definition</span></div>';
  }

  const all=()=>{hero();car();micro();glu();near();clean()};
  RD.onRender(all);RD.onResize(all);all();
})();
