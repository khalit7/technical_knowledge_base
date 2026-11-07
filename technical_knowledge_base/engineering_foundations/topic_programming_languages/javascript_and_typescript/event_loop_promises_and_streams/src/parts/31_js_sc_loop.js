// ---- Scenes, Fig. 1 (the hero, section 0) and Fig. 2 (section 2): Node's queues around one thread (renderer v2, 2026-11-07) ----
// Your JavaScript lives on a glass plate: the call stack (left), the nextTick and microtask queues (middle), the loop's macrotask phases as a ring
// (timers, poll, check; right) and the console (front). libuv and the operating system sit on the floor under the ring.
// Fig. 2 replays the six recorded programs: each step's stack, queues and printed line come from window.EL.steps (src/ja/loop_steps.json),
// the printed lines are checked against Node's recorded output (EL.loops). The explanation of each step is the step list on the left.
(function(){
  if(!window.S3||!window.EL)return;const {at,lerp,lerp3,mix,cl}=S3,$=id=>document.getElementById(id);
  const YU=1.15,FH=.46,ST=[-3.25,YU,.35],SW=[1.75,FH-.05,.95];
  const LX0=-2.05,LW=3.0,LZ={n:-.85,m:.35},SLOT=j=>LX0+.78+j*1.5;
  const RC=[2.85,0,.25],RR=1.15,ANG={t:-2.45,io:1.5708,c:-.69},PHP=k=>[RC[0]+RR*Math.cos(ANG[k]),YU,RC[2]+RR*Math.sin(ANG[k])];
  const UV=[2.6,0,-2.55],CON=[-2.05,YU,1.45];
  const COL={n:'c5',m:'acc',t:'c2',c:'c3',io:'c6'},NAME={n:'nextTick queue',m:'microtask queue',t:'timers',io:'poll (I/O)',c:'check'};
  // short names for queued callbacks and stack frames, so labels stay small on a phone
  const short=s=>s.replace(/^\(\) => /,'').replace(' (0 ms)',', 0 ms').replace('job: continue after await','job, after await').replace(/^(timer \d) callback$/,'$1')
    .replace('microtask: evaluate module','evaluate module').replace('read l4_node.mjs','read the file').replace(' callback',' cb');
  const top=n=>[ST[0],YU+Math.max(0,n)*FH+.05,ST[2]];
  const slotPos=(q,j)=>q==='n'||q==='m'?[SLOT(j),YU,LZ[q]]:q==='io'?[UV[0]+.1+j*.9,.32,UV[2]+.35]:(p=>[p[0],YU+j*.38,p[2]])(PHP(q));
  // the fixed furniture: plate, floor slab, lanes, ring, console; a: alpha per part (0 hides it)
  function furniture(R,A){const P=R.P;R.grid(-4.6,4.6,-2.6,2.8,.5);
    const lab=R.label.bind(R),L=(p,t,o)=>{if((o.a==null?1:o.a)>=.3)lab(p,t,o)};
    // libuv and the OS on the floor: the thread pool (4 threads by default, docs.libuv.org) and the readiness API
    if(A.uv>.01){R.box(UV,[3.4,.3,1.3],{fill:mix(P.paper,P.c6,.1),a:A.uv,dz:300});
      for(let i=0;i<4;i++)R.box([UV[0]-1.35+i*.5,.3,UV[2]-.2],[.36,.36,.36],{fill:mix(P.paper,P.c6,.35),a:A.uv*.75,shadow:false,dz:280});
      R.box([UV[0]+1.1,.3,UV[2]-.2],[.9,.22,.6],{fill:mix(P.paper,P.c6,.22),a:A.uv,shadow:false,dz:280});
      
      
      L([UV[0]+1.7,.3,UV[2]-.65],'libuv and the OS',{fs:12.5,b:1,c:P.c6,a:A.uv,al:'left',dx:4,dy:-8})}
    // the plate your JavaScript runs on
    R.glass([-4.3,YU,-1.55],[8.6,0,0],[0,0,3.5],{c:P.c1,nu:12,nv:5,a:A.plate*.5,th:.03,dz:80});
    L([-4.3,YU,-1.55],'your JavaScript: one thread',{al:'left',fs:12.5,b:1,c:P.c1,a:A.plate,dy:-10,dx:2,wide:1});
    // the two queues drained between callbacks
    ['n','m'].forEach(q=>{const a=A[q];if(a<=.01)return;const z=LZ[q],c=P[COL[q]];
      R.glass([LX0,YU+.01,z-.42],[LW,0,0],[0,0,.84],{c,nu:2,nv:1,a:a*.9,th:.04,dz:40});
      L([LX0+.05,YU,z-.42],NAME[q],{al:'left',fs:12,b:1,c,a,dy:-9})});
    // the macrotask phases as a ring, in the order the loop visits them
    if(A.ring>.01){const ord=['t','io','c'];ord.forEach((q,i)=>{const p=PHP(q),c=P[COL[q]];
        R.glass([p[0]-.55,YU+.01,p[2]-.4],[1.1,0,0],[0,0,.8],{c,nu:2,nv:2,a:A.ring*(A.ph&&A.ph[q]?1:.7),th:.04,dz:40});
        L([p[0],YU,p[2]+.4],NAME[q],{fs:12,b:1,c,a:A.ring,dy:11});
        const nx=PHP(ord[(i+1)%3]);R.arc([p[0],YU+.05,p[2]],[nx[0],YU+.05,nx[2]],.25,{c:P.mute,w:1.3,a:A.ring*.55,head:6})});
      if(A.spin)R.flow((()=>{const pts=[];for(let i=0;i<=48;i++){const t=ANG.t+(i/48)*(Math.PI*2);pts.push([RC[0]+RR*Math.cos(t),YU+.12,RC[2]+RR*Math.sin(t)])}return pts.reverse()})(),{c:P.mute,a:A.spin,r:.05,n:10,speed:1.3})}
    // the call stack
    R.quad([[ST[0]-.95,YU+.005,ST[2]-.55],[ST[0]+.95,YU+.005,ST[2]-.55],[ST[0]+.95,YU+.005,ST[2]+.55],[ST[0]-.95,YU+.005,ST[2]+.55]],{fill:mix(P.paper,P.ink,.05),a:A.stack,dz:30});
    L([ST[0],YU,ST[2]+.55],'call stack',{fs:12,b:1,a:A.stack,dy:11});
    if(A.con>.01){R.box([CON[0]+1.1,YU,CON[2]+.05],[2.6,.05,.7],{fill:mix(P.paper,P.good,.12),a:A.con,shadow:false});L([CON[0]+2.45,YU,CON[2]-.3],'console',{fs:12,b:1,c:P.good,a:A.con,al:'right',dy:-8})}}
  function frame(R,i,txt,o){const P=R.P,y=YU+i*FH+(o.drop||0);R.box([ST[0],y,ST[2]],SW,{fill:o.hot?mix(P.paper,P.acc,.35):P.paper,a:o.a,shadow:i===0});
    R.label([ST[0],y+FH/2-.02,ST[2]+SW[2]/2],short(txt),{fs:12,mono:true,b:o.hot,a:o.a})}
  function item(R,q,p,txt,o){const P=R.P,c=P[COL[q]];R.box(p,[.95,.3,.55],{fill:mix(P.paper,c,.45),a:o.a,shadow:false});
    if(o.lab!==false)R.label([p[0],p[1]+.15,p[2]+.28],short(txt),{fs:12,mono:true,c:P.ink,a:o.a,wide:1})}
  function consoleLines(R,lines,o){const P=R.P;lines.forEach((t,i)=>R.label([CON[0],YU+.05,CON[2]],t,{al:'left',mono:true,fs:12,dy:-4+i*16,dx:2,b:i===lines.length-1&&o.fresh,c:P.good,a:i===lines.length-1&&o.fresh?o.e:1}))}

  // ---------- Fig. 2: the six programs ----------
  const QK=['n','m','t','c','io'];
  function states(mode){const st={l:[],s:[],n:[],m:[],t:[],c:[],io:[],out:[]};return EL.steps[mode].map(d=>{
    ['s','n','m','t','c','io'].forEach(k=>{if(d[k])st[k]=d[k].slice()});const out=d.o!=null?st.out.concat([d.o]):st.out.slice();st.out=out;
    return Object.assign({},st,{l:d.l||[],o:d.o,out})})}
  const used=mode=>({n:/^l[45]/.test(mode),c:/^l4/.test(mode),io:/^l4/.test(mode)});
  let mode='l1_basic.mjs',S=states(mode),curK=0;
  function drawLoop(R,k,e){const P=R.P,cur=S[k],prv=k>0?S[k-1]:{s:[],n:[],m:[],t:[],c:[],io:[],out:[]},U=used(mode);
    const moved={};QK.forEach(q=>moved[q]=prv[q].filter(x=>cur[q].indexOf(x)<0).length>0);
    const ph={t:moved.t,io:moved.io,c:moved.c},any=ph.t||ph.io||ph.c;
    furniture(R,{plate:1,stack:1,con:1,n:U.n?1:.12,m:1,ring:1,uv:U.io?1:.18,ph,spin:any?.6:0});
    // the call stack: frames kept, frames leaving fade out, new frames drop in
    const keep=i=>prv.s[i]===cur.s[i];
    prv.s.forEach((f,i)=>{if(!keep(i))frame(R,i,f,{a:1-e})});
    cur.s.forEach((f,i)=>frame(R,i,f,{a:keep(i)?1:e,drop:keep(i)?0:.35*(1-e),hot:i===cur.s.length-1}));
    const tp=top(Math.max(cur.s.length,prv.s.length));
    // the queues: an item queued now comes from the top of the stack; an item that leaves goes to the stack to run
    QK.forEach(q=>{const c=P[COL[q]],wide=cur[q].length>1||prv[q].length>1;
      cur[q].forEach((x,j)=>{const was=prv[q].indexOf(x),p=slotPos(q,j);
        if(was>=0){item(R,q,lerp3(slotPos(q,was),p,e),x,{a:1,wide})}
        else{item(R,q,lerp3(tp,p,e),x,{a:e,wide,lab:e>.6});R.flowArc(tp,[p[0],p[1]+.15,p[2]],q==='io'?.2:.5,{c,a:.85,r:.06,n:8,top:1})}});
      prv[q].forEach((x,j)=>{if(cur[q].indexOf(x)>=0)return;const p=slotPos(q,j),to=top(cur.s.length-1);
        item(R,q,lerp3(p,to,e),x,{a:1-e,lab:false});
        if(q==='io'){const ph=PHP('io');R.flowArc([p[0],p[1]+.2,p[2]],[ph[0],YU+.1,ph[2]],.5,{c,a:.85,r:.06,n:8,top:1});R.flowArc([ph[0],YU+.15,ph[2]],to,.6,{c,a:.85,r:.06,n:9,top:1})}
        else R.flowArc([p[0],p[1]+.15,p[2]],to,.6,{c,a:.85,r:.065,n:9,top:1})})});
    // a printed line flies from the running frame to the console
    if(cur.o!=null){R.flowArc(top(cur.s.length-1),[CON[0]+.4,YU+.05,CON[2]],.45,{c:P.good,a:.85,r:.06,n:8,top:1})}
    consoleLines(R,cur.out,{fresh:cur.o!=null,e});
    if(!cur.out.length)R.label([CON[0],YU+.05,CON[2]],'nothing printed yet',{al:'left',fs:12,dx:2,dy:-4,c:P.mute})}
  function code(){const L=EL.loops[mode],c=$('el-lp-code');if(!c)return;const lit=(S[curK]||S[0]).l;
    $('el-lp-file').textContent=mode+(mode.endsWith('.cjs')?' (CommonJS)':' (ES module)');
    c.innerHTML=L.code.split('\n').map((ln,i)=>'<span class="ln'+(lit.indexOf(i+1)>=0?' on':'')+'"><span class="n">'+(i+1)+'</span>'+RD.esc(ln)+'</span>').join('')}
  const sxId=m=>'sx-lp-'+m.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const st=$('stg-loop')?S3.stage({id:'stg-loop',list:sxId(mode),fig:'Fig. 2 · six programs through Node\'s queues',cam:[-.2,.62],bounds:[[-4.3,.8,-3.2],[4.3,2.0,2.0]],aspect:.66,dur:1300,hold:4300,
    draw:drawLoop,margin:w=>w<520?[12,6,30,6]:[16,14,40,14],onStep:k=>{curK=k;code()}}):null;
  if(st){code();RD.seg($('el-lp-mode'),m=>{mode=m;S=states(m);curK=0;document.querySelectorAll('ol.sx[id^="sx-lp-"]').forEach(o=>o.hidden=o.id!==sxId(m));st.list(sxId(m))});
    // the stepped output of every program must equal Node's recorded output
    window.EL_LOOP_CHECK=()=>Object.keys(EL.steps).map(k=>{const s=states(k);return [k,JSON.stringify(s[s.length-1].out)===JSON.stringify(EL.loops[k].out)]});
    const ok=EL_LOOP_CHECK().every(x=>x[1]),ck=$('el-lp-check');if(ck)ck.textContent='Stepped output equals Node\'s recorded output for all six programs: '+(ok?'yes':'NO')+' (checked by the page as it loads).'}

  // ---------- Fig. 1: the hero, the same parts introduced one at a time ----------
  if($('stg-hero')){
    const out=EL.loops['l1_basic.mjs'].out,s1=states('l1_basic.mjs'),mid=s1.find(x=>x.s.length===0&&x.m.length&&x.t.length)||s1[5];
    ['el-hero-out','el-hero-c','el-hero-b'].forEach((id,i)=>{const n=$(id);if(n)n.textContent=i===0?out.join(' '):i===1?out[2]:out[3]});
    function drawHero(R,k,e){const P=R.P,f=.16;
      const A={plate:1,stack:k===0?1:k>=3?1:.35,con:k>=4?1:.15,n:k===3?1:k===4?.2:f,m:k>=3?1:f,ring:k===2||k===4?1:k===1?.5:f,uv:k===1?1:k===2?.4:f,
        ph:k===2?{t:1,io:1,c:1}:k===4?{t:e>.5}:null,spin:k===2?.7:0};
      furniture(R,A);
      if(k===0){frame(R,0,'module',{a:1});frame(R,1,'console.log',{a:e,drop:.35*(1-e),hot:true})}
      else frame(R,0,k===4?(e<.5?'then callback':'timer callback'):k===2?'timer callback':k===3?'then callback':'module',{a:k===1?.5:1,hot:k!==1});
      if(k===1){const p=slotPos('io',0),ph=PHP('io');item(R,'io',p,'read the file',{a:1});
        R.flowArc(top(1),[p[0],p[1]+.2,p[2]],.3,{c:P.c6,a:.8,r:.06,n:8,top:1});R.flowArc([p[0]+.2,p[1]+.2,p[2]],[ph[0],YU+.1,ph[2]],.5,{c:P.c6,a:.9,r:.06,n:8,top:1})}
      if(k===2){item(R,'t',slotPos('t',0),'timer cb',{a:1});item(R,'io',[PHP('io')[0],YU,PHP('io')[2]],'I/O cb',{a:1});item(R,'c',slotPos('c',0),'immediate cb',{a:1});
        R.flowArc([PHP('t')[0],YU+.3,PHP('t')[2]],top(1),.8,{c:P.c2,a:.85,r:.065,n:10,top:1})}
      if(k===3){item(R,'n',slotPos('n',0),'nextTick cb',{a:1});item(R,'m',slotPos('m',0),'then cb',{a:1});item(R,'m',slotPos('m',1),'after await',{a:1});
        R.flowArc([SLOT(0),YU+.3,LZ.n],top(1),.5,{c:P.c5,a:.85,r:.065,n:9,top:1});R.flowArc([SLOT(0),YU+.3,LZ.m],top(1),.5,{c:P.acc,a:.85,r:.065,n:9,top:1});
        R.flowArc([SLOT(1),YU+.3,LZ.m],top(1),.6,{c:P.acc,a:.6,r:.05,n:7,top:1})}
      if(k===4){const ec=cl(e*2,0,1),eb=cl(e*2-1,0,1);
        item(R,'m',lerp3(slotPos('m',0),top(0),ec),mid.m[0],{a:1-ec,wide:1});item(R,'t',lerp3(slotPos('t',0),top(0),eb),mid.t[0],{a:1-eb,wide:1});
        R.flowArc([SLOT(0),YU+.3,LZ.m],top(1),.5,{c:P.acc,a:.9,r:.07,n:9,top:1});R.flowArc([PHP('t')[0],YU+.3,PHP('t')[2]],top(1),.8,{c:P.c2,a:.55,r:.05,n:8,top:1});
        R.flowArc(top(1),[CON[0]+.4,YU+.05,CON[2]],.45,{c:P.good,a:.8,r:.06,n:8,top:1});
        consoleLines(R,out.slice(0,ec<1?3:4),{fresh:true,e:ec<1?ec:eb})}}
    const full={cam:[-.2,.62],bounds:[[-4.3,.8,-3.2],[4.3,2.0,2.0]]};
    S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one thread, two queues, a ring of phases',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1400,hold:4800,draw:drawHero,
      margin:w=>w<520?[12,6,30,6]:[16,14,40,14],
      view:k=>k===0?{cam:[-.35,.6],bounds:[[-4.4,.6,-.6],[-.6,2.6,2.0]]}:k===1?{cam:[-.15,.5],bounds:[[.4,0,-3.3],[4.6,2.0,1.0]]}:k===2?{cam:[-.1,.7],bounds:[[.9,.8,-1.3],[4.6,2.0,1.8]]}:k===3?{cam:[-.25,.7],bounds:[[-4.4,.8,-1.5],[1.4,2.2,2.0]]}:full});
  }
})();
