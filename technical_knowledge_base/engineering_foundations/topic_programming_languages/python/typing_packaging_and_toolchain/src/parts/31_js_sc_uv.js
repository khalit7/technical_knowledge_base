// ---- Scene: Fig. 2, uv's three files that must agree (section 4; renderer v2). Three plates: pyproject.toml (what you asked for),
// uv.lock (what one resolution picked) and .venv (what is installed), plus the system python3 beside them. Nine steps, one per
// recorded command of src/pb/uvwalk/walk_uv.sh (window.PB.uv). Every count and package name is parsed from that transcript:
// the lock's size from "Resolved N packages", the environment from uv tree and the "+ name==version" / "- name==version" lines.
// Only the names the transcript prints are drawn in .venv; their dependencies are not listed there, so they are not drawn. ----
(function(){
  if(!document.getElementById('stg-uv')||!window.PB)return;const {at,off,cl,mix,lerp}=S3;
  const U=PB.uv,find=(p,rc)=>U.find(b=>b.cmd&&b.cmd.startsWith(p)&&(rc==null||b.rc===rc));
  const B=[find('uv init tokcount'),find("uv run python -c 'import httpx"),find("python3 -c 'import httpx'"),find('uv sync --locked && echo in sync'),
    {cmd:'(edit pyproject.toml by hand: add "rich" to dependencies, no uv command)',out:'',rc:null},find('uv sync --locked',1),find('uv lock && uv sync --locked'),find('uv sync --extra fast'),find('uv sync && uv run')];
  if(B.some(b=>!b))return;
  const tree=find('uv tree'),resolved=b=>{const m=(b.out||'').match(/Resolved (\d+) packages/);return m?+m[1]:null};
  const asked=[...B[0].out.matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(x=>/[<>=~]/.test(x)&&!/^uv_build/.test(x));
  const role=x=>/^pytest/.test(x)?'group dev':/^orjson/.test(x)?'extra fast':'dependency';
  // the state after each step
  let venv=[...tree.out.matchAll(/── ([\w.-]+) v/g)].map(m=>m[1]),lock=resolved(tree),py=asked.slice();const S=[];
  B.forEach((b,i)=>{const add=[...(b.out||'').matchAll(/^ \+ ([\w.-]+)==/gm)].map(m=>m[1]),rm=[...(b.out||'').matchAll(/^ - ([\w.-]+)==/gm)].map(m=>m[1]);
    if(i===4)py=py.concat(['rich']);
    const r=resolved(b),stale=i===4||i===5;if(r&&b.rc===0&&i>=6)lock=r;
    venv=venv.filter(x=>!rm.includes(x)).concat(add.filter(x=>!venv.includes(x)));
    S.push({b,py:py.slice(),lock,res:r,stale,venv:venv.slice(),add,rm,rc:b.rc})});
  window.UV_STEPS=S.map(s=>({lock:s.lock,res:s.res,venv:s.venv,add:s.add,rm:s.rm,rc:s.rc}));
  const XP=-3.3,XL=0,XV=3.3,PW=2.3,Y=.02,lockXY=j=>[XL-.8+(j%5)*.4,Y,-.7+Math.floor(j/5)*.45];
  const pyXY=j=>[XP,Y,-.85+j*.42],vXY=j=>[XV,Y,-.9+j*.37];
  function plate(R,x,c,a,nm,sub){R.glass([x-PW/2,Y,-1.15],[PW,0,0],[0,0,2.3],{c,a,nu:5,nv:5});R.label([x,Y,-1.15],nm,{mono:true,fs:13,b:1,dy:-12,c:c,a:a<.5?0:a});
    if(sub)R.label([x,Y,1.15],sub,{fs:12,dy:16,c:R.P.mute,a,wide:1})}
  function draw(R,k,e){const P=R.P,s=S[k],pv=S[Math.max(0,k-1)];R.grid(-5.2,5.2,-2.6,3,.5);
    // the uv run and system-python steps are about the environment: the two files recede
    const fo=k===1||k===2?.15:1;
    // pyproject.toml: the ranges you asked for
    plate(R,XP,P.c5,fo,'pyproject.toml','what you asked for');
    s.py.forEach((x,j)=>{const isNew=k===4&&x==='rich',a=isNew?e:1;R.box(pyXY(j),[2,.1,.3],{fill:isNew||(k>=4&&x==='rich')?mix(P.paper,P.c5,.5):P.paper,a:a*fo});
      R.label([XP,.14,pyXY(j)[2]],x+(x==='rich'?' (by hand)':'  · '+role(x)),{mono:true,fs:12,a:fo<1?0:a,c:P.ink,wide:1})});
    // uv.lock: one tile per resolved package
    const lc=s.stale?P.bad:P.c6,ln=k===6?Math.round(lerp(pv.lock,s.lock,e)):s.lock;
    plate(R,XL,lc,fo,'uv.lock',(k===4||k===5?s.lock+' packages, now stale':s.lock+' packages')+(k===5?' · resolving gives '+s.res:''));
    for(let j=0;j<ln;j++){const isNew=k>=6&&j>=pv.lock&&k===6;R.box(lockXY(j),[.3,.16,.3],{fill:isNew?mix(P.paper,P.c6,.6):P.paper,a:fo,shadow:false})}
    // .venv: what is installed (the packages the transcript names)
    plate(R,XV,P.acc,1,'.venv','what is installed');
    const names=Array.from(new Set(pv.venv.concat(s.venv)));
    names.forEach((x,j)=>{const now=s.venv.includes(x),before=pv.venv.includes(x)||k===0;let a=1,dy=0,fill=P.paper;
      if(k>0&&now&&!before){a=e;fill=mix(P.paper,P.good,.5)}if(!now){a=1-e;dy=-.25*e;fill=mix(P.paper,P.bad,.5)}
      const p=vXY(j);R.box([p[0],Y+dy,p[2]],[1.9,.1,.28],{fill,a,shadow:false});R.label([p[0],.18+dy,p[2]],x,{mono:true,fs:12,a,c:now?P.ink:P.bad,wide:1})});
    // what moves on each step
    const FL=(a,b,c,o)=>R.flowArc(a,b,.5,Object.assign({c,r:.065,speed:1.2},o||{}));
    const pyTo=[XP+PW/2-.1,.15,0],lkIn=[XL-PW/2+.1,.15,0],lkOut=[XL+PW/2-.1,.15,0],vIn=[XV-PW/2+.1,.15,0];
    if(k===0){FL(pyTo,lkIn,P.c5,{a:e});FL(lkOut,vIn,P.c6,{a:e})}
    if(k===3||k===7||k===8)FL(lkOut,vIn,P.c6,{a:1});
    if(k===6){FL(pyTo,lkIn,P.c5,{a:1});FL(lkOut,vIn,P.c6,{a:e})}
    if(k===5){FL(pyTo,lkIn,P.c5,{a:.8});R.quad([[XL+PW/2+.25,0,-1],[XL+PW/2+.25,0,1],[XL+PW/2+.25,.9,1],[XL+PW/2+.25,.9,-1]],{fill:P.bad,fa:.12,ec:P.bad,dash:[5,4],a:e});
      R.label([XL+PW/2+.25,0,1],'--locked: exit '+s.rc,{mono:true,fs:12.5,b:1,c:P.bad,dy:18,a:e})}
    // uv run: python inside .venv
    if(k===1){R.ball([XV+.7,.75,.3],.16,{c:P.acc,a:e});R.flow([[XV+.7,.75,.3],[XV,.2,-.7]],{c:P.acc,a:e,r:.05,n:4,speed:.8});
      const [hv,inv]=s.b.out.trim().split(' ');R.label([XV,.95,0],'httpx '+hv+' · sys.prefix in .venv: '+inv,{mono:true,fs:12,b:1,c:P.acc,dy:-10,a:e})}
    // the system python3 beside the project: it does not see .venv
    const sa=k===2?1:k===1||k===3?.25:0;
    if(sa>0){R.box([XV,0,2.3],[1.4,.4,.6],{fill:mix(P.paper,P.mute,.25),a:sa});R.label([XV,.4,2.3],'system python3',{mono:true,fs:12,b:1,dy:-10,a:sa});
      if(k===2){R.line([[XV,.25,1.95],[XV,.25,1.3]],{c:P.bad,w:2,dash:[4,4],a:e});R.label([XV+.8,.2,2.3],(s.b.out.trim().split('\n').pop()),{al:'left',dx:8,mono:true,fs:12,c:P.bad,a:e,wide:1})}}
  }
  const full={cam:[.06,.85],bounds:[[-4.5,0,-1.3],[4.5,1,2.7]]};
  const st=S3.stage({id:'stg-uv',list:'sx-uv',fig:'Fig. 2 · three files that must agree, a real uv session',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:5000,draw,
    margin:w=>w<520?[16,8,16,8]:[24,16,18,16],
    // the uv run and system-python steps are about the environment: in close on it
    view:k=>k===1||k===2?{cam:[.25,.6],bounds:[[1.6,0,-1.4],[5,1.2,2.8]]}:full,
    onStep:k=>{const t=document.getElementById('pb-sync-term');if(t)t.innerHTML=PBU.block(S[k].b)}});
})();
