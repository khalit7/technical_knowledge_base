// ---- Scene (section 2, Fig. 2): the loss on every character of one held-out passage, checkpoint by checkpoint (renderer v2) ----
// Everything drawn is the page's toy run (TOY, from toy/runs via mk_toy.py): seed 1's per-character loss in bits on the 96-character held-out
// passage at steps 0, 600, 2,000 and 6,000 and after two of the four anneals. The stage draws the passage's last 41 characters; the step list's
// numbers are means over the whole passage, by kind of character, and are written here from the same data (check_stages.mjs compares).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ls')||!window.S3||!window.TOY||!TOY.seeds.length)return;const {at,off,lerp,mix}=S3;
  const S=TOY.seeds[0],disp=TOY.meta.display,V=TOY.meta.vocab.length,KEYS=['0','600','2000','6000','decay_same','decay_maths'];
  // kind of each predicted character (index j in the passage, loss heat[j-1])
  const kind=[];let seen=false;
  for(let j=1;j<disp.length;j++){const c=disp[j],p=disp[j-1];if(p==='\n')seen=false;if(c==='=')seen=true;
    kind[j]=/[0-9]/.test(c)?(seen?'an':'op'):(/[+=]/.test(c)||(c==='\n'&&/[0-9]/.test(p)))?'sy':/[a-z]/.test(c)?(/[a-z]/.test(p)?'in':'st'):'sp'}
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const stat=key=>{const h=S.heat[key],g={in:[],st:[],sp:[],op:[],an:[],sy:[]};for(let j=1;j<disp.length;j++)g[kind[j]].push(h[j-1]);
    const o={};Object.keys(g).forEach(k=>o[k]=mean(g[k]));o.tx=mean([...g.in,...g.st,...g.sp]);o.all=mean(h);return o};
  const ST=KEYS.map(stat);
  const J0=disp.length-41,COLS=[];for(let j=J0;j<disp.length;j++)COLS.push(j);
  const DX=.27,x=i=>(i-(COLS.length-1)/2)*DX,ZT=.62;let HB=.3;
  // on a phone the grouped labels hide, so the view drops the room kept for them and the columns stand taller
  const nar=()=>$('stg-ls').clientWidth<520;
  const sumStart=COLS.findIndex(j=>/[0-9]/.test(disp[j]));
  const MAXB=Math.max(...KEYS.map(kk=>Math.max(...COLS.map(j=>S.heat[kk][j-1]))));
  function writeList(){const set=(k,h)=>document.querySelectorAll('[data-ls="'+k+'"]').forEach(e=>e.textContent=h),f=v=>v.toFixed(2);
    set('v',V);set('lv',f(Math.log2(V)));set('a0',f(ST[0].all));set('in1',f(ST[1].in));set('sp1',f(ST[1].sp));set('st1',f(ST[1].st));
    set('smp1',S.samples['600'].replace(/\s+/g,' ').slice(0,57).trim());set('tx2',f(ST[2].tx));set('st2',f(ST[2].st));set('op2',f(ST[2].op));set('an2',f(ST[2].an));
    set('tx3',f(ST[3].tx));set('an3',f(ST[3].an));set('tx4',f(ST[4].tx));set('an4',f(ST[4].an));set('an5',f(ST[5].an));set('op5',f(ST[5].op));set('a5',f(ST[5].all))}
  const FLOOR=(Math.log2(9)+Math.log2(10))/2;
  function draw(R,k,e){const P=R.P,narrow=R.W<520;HB=narrow?.5:.3;
    const COL={st:P.c2,in:P.c1,sp:mix(P.paper,P.mute,.55),op:P.c4,an:P.c3,sy:mix(P.paper,P.mute,.3)};
    R.grid(-6,6,-1.6,1.8,.5);
    // which columns this step is about (the rest recede); steps 5 and 6 are about the sums
    const jt0=COLS.indexOf(disp.indexOf('=')+1),sums=k>=5,inView=i=>k===0?(i>=jt0-9&&i<=jt0+3):!(k>=5&&i<sumStart);
    // the characters, as tiles in front of their columns
    const near=i=>i>=jt0-9&&i<=jt0+3;
    COLS.forEach((j,i)=>{const c=disp[j],kd=kind[j],a=k===0?(near(i)?1:0):k===1&&!near(i)?e:k>=5&&i<sumStart?(k===5?Math.max(0,1-2*e):0):1;R.box([x(i),0,ZT],[.22,.04,.26],{fill:mix(P.paper,COL[kd],.25),a,shadow:false,lw:.7});
      if(inView(i)&&a>.05)R.label([x(i),0,ZT+.13],c==='\n'?'⏎':c===' '?'·':c,{mono:true,fs:12.5,b:1,dy:12,c:kd==='sp'||kd==='sy'?P.mute:mix(P.ink,COL[kd],.55),a:Math.max(.45,a)})});
    // 0. one prediction: the context streams into the position, which must name the next character
    const jt=COLS.indexOf(disp.indexOf('=')+1);
    if(k===0){const tx=x(jt);for(let i=Math.max(0,jt-9);i<jt;i++)R.flowArc([x(i),.08,ZT],[tx,.1,0],.35+.03*(jt-i),{c:P.acc,a:e*(.35+.065*(i-jt+9)),r:.045,n:4,speed:1});
      R.glow([tx,.15,0],.3,{c:P.acc,a:e});R.ball([tx,.15,0],.08,{c:P.acc,a:e});R.line([[tx,.15,0],[tx,.06,ZT-.15]],{c:P.acc,w:2,head:7,a:e,top:1});
      R.label([tx,.2,0],'predict the next character from all before it',{fs:12.5,b:1,c:P.acc,dy:-16,a:e});
      R.label([x(jt-9),.1,ZT],'context',{mono:true,fs:12,c:P.mute,dy:-22,a:e,wide:1})}
    // 1 to 6: one column per character, its height the loss there in bits; each step eases from the last checkpoint's heights
    if(k>=1){const cur=S.heat[KEYS[k-1]],prv=k>=2?S.heat[KEYS[k-2]]:null,t=e;
      COLS.forEach((j,i)=>{const v=prv?lerp(prv[j-1],cur[j-1],t):cur[j-1]*t,kd=kind[j],h=Math.max(.015,v*HB);
        const a=(sums&&i<sumStart)?(k===5?Math.max(0,1-2*e):0):(k===2||k===3)&&i>=sumStart?.6:1;
        R.box([x(i),0,0],[.2,h,.2],{fill:mix(P.paper,COL[kd],.85),a,shadow:false,lw:.6})});
      // the mean of each kind over the whole passage, as a tick at that height on the left with its value
      const la=k===5?Math.max(0,2*e-1):1,s=ST[k-1],sp=prv?ST[k-2]:null,mv=kk=>sp?lerp(sp[kk],s[kk],e):s[kk]*e,xl=k>=5?x(sumStart)-.7:x(0)-.8;
      const show=k<=4?['st','in','sp','op','an']:['tx','op','an','all'];
      show.forEach(kk=>{const v=mv(kk),c=kk==='tx'||kk==='all'?P.ink:COL[kk],nm={st:'word starts',in:'inside words',sp:'spaces, punct.',op:'operands',an:'answers',tx:'text',all:'passage average'}[kk];
        if(!narrow)R.line([[xl,v*HB,0],[xl+.22,v*HB,0]],{c,w:2.4,a:la});R.label([xl,v*HB,0],nm+' '+v.toFixed(2),{mono:true,fs:12,b:1,c,al:'right',dx:-6,grp:'mean',a:la})});
      R.label([x(COLS.length-1)+.2,6.6*HB,0],k===1?'step 0':k===2?'step 600':k===3?'step 2,000':k===4?'step 6,000':k===5?'+1,200 steps, same mix':'+1,200 steps, maths-heavy',{fs:12.5,b:1,c:P.ink,al:'right',dy:-6})}
    // 6. the floor: random operand digits cannot be predicted below about 3.25 bits; the answers follow from the operands
    if(k===6){const x0=x(sumStart)-.15,x1=x(COLS.length-1)+.15;R.glass([x0,FLOOR*HB,-.18],[x1-x0,0,0],[0,0,.36],{c:P.c4,a:.7*e,nu:12,nv:1,th:.01});
      R.label([x1,FLOOR*HB,0],'floor '+FLOOR.toFixed(2),{mono:true,fs:12.5,b:1,c:P.c4,al:'left',dx:10,a:e,wide:1});
      let o=[];COLS.forEach((j,i)=>{if(i<sumStart)return;const c=disp[j];if(c==='\n'){o=[];return}if(kind[j]==='op')o.push(i);
        if(kind[j]==='an')o.forEach(q=>R.flowArc([x(q),.06,ZT],[x(i),.06,ZT],.32,{c:P.c3,a:.8*e,r:.04,n:3,speed:.8}))});
    }
  }
  const full=()=>nar()?{cam:[.2,.62],bounds:[[x(0)-.2,0,-.3],[x(COLS.length-1)+.2,MAXB*.5+.1,ZT+.3]]}:{cam:[.2,.5],bounds:[[x(0)-3.0,0,-.3],[x(COLS.length-1)+.4,Math.max(2.1,MAXB*.3+.1),ZT+.3]]};
  const sx0=x(sumStart)-.4,sx1=x(COLS.length-1)+1.3;
  S3.stage({id:'stg-ls',list:'sx-ls',fig:'Fig. 2 · the loss on every character, as the toy trains',cam:full().cam,bounds:()=>full().bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[18,10,26,10]:[24,18,30,18],
    view:k=>k===0?{cam:[.3,.42],bounds:[[x(Math.max(0,COLS.indexOf(disp.indexOf('=')+1)-10)),0,-.4],[x(COLS.indexOf(disp.indexOf('=')+1))+1.2,1.1,ZT+.3]]}:k>=5?(nar()?{cam:[.22,.6],bounds:[[sx0,0,-.4],[x(COLS.length-1)+.2,MAXB*.5+.1,ZT+.3]]}:{cam:[.22,.45],bounds:[[sx0-2.6,0,-.4],[sx1,Math.max(2.2,MAXB*.3+.1),ZT+.3]]}):full()});
  writeList();
})();
