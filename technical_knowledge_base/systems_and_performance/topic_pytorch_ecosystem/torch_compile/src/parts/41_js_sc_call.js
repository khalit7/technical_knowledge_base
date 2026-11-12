// ---- Scene, Fig. 1 (2026-11-12, renderer v2): one call into a compiled function. The first call runs the three compilers and writes
// a cache entry; every later call walks the entries' guards in order: a pass runs that entry's compiled code, a miss compiles a new entry.
// Calls 2 to 6 are the recorded run of section 4 (window.TCP.dyn.strat.default: T = 64, 32, 48, 16, 1, 64, three compiles; its logged
// recompile reasons); the last step is the recorded recompile-limit run (TCP.dyn.limit: ten strings, eight compiles). Steps: #sx-call. ----
(function(){
  if(!document.getElementById('stg-call')||!window.S3||!window.TCP)return;const {at,off,mix}=S3,D=TCP.dyn;
  const C=D.strat.default.calls,RS=D.strat.default.reasons;
  const why0=(RS[0].match(/expected \d+, actual \d+/)||[''])[0],why1=(RS[1].match(/2 <= idx\.size\(\)\[1\]/)||[''])[0];
  const L=D.limit,NL=L.per_call.filter(x=>x>0).length;
  // three cache entries in depth (0/0 at the back), the compiler row behind them, input on the left, output on the right
  const ZE=[-.25,.85,1.95],ZC=-2.35,XG=-1.55,XK=.75,XI=-4.2,XO=4.1,ZM=.85,Y=.32,XL=1.75;
  const ENT=[{id:'0/0',g:'T == 64'},{id:'0/1',g:'2 ≤ T (s75)'},{id:'0/2',g:'T == 1'}];
  // per step: the call, entries that exist before it, the entry that passes (-1: none, so a compile), the entry it creates, the gates that fail, the status line
  const S=[{call:'call 1 · T = '+C[0].T,n:0,pass:-1,make:0,st:'cache empty: compile'},
    {call:'call 2 · T = '+C[1].T,n:1,pass:-1,make:1,fail:[0],st:'0/0 fails: '+why0},
    {call:'calls 3, 4 · T = '+C[2].T+', '+C[3].T,n:2,pass:1,fail:[0],st:'0/0 fails, 0/1 passes: run'},
    {call:'call 5 · T = '+C[4].T,n:2,pass:-1,make:2,fail:[0,1],st:'0/1 fails: '+why1},
    {call:'call 6 · T = '+C[5].T,n:3,pass:0,st:'0/0 passes: run'}];
  const CP=[['Dynamo',-2.2,'c1'],['AOTAutograd',0,'c3'],['Inductor',2.2,'c4']];
  function draw(R,k,e){const P=R.P;R.grid(-5.5,5.5,-2.6,3,.5);
    if(k<5){const s=S[k],shown=Math.min(3,s.n+(s.make!=null?1:0)),fails=s.fail||[];
      // input and output
      R.box([XI,0,ZM],[.9,.4,.6],{fill:mix(P.paper,P.acc,.3)});R.label([XI,.4,ZM],s.call,{mono:true,fs:13,b:1,dy:-20,c:P.acc,a:Math.max(.4,e)});
      R.box([XO,0,ZM],[.9,.4,.6],{fill:P.paper,a:s.pass>=0?1:.3});R.label([XO,.4,ZM],'logits',{mono:true,fs:12.5,dy:-13,a:s.pass>=0?1:.4});
      // the compiler row: lit on a compile, faint otherwise
      const ca=s.pass<0?1:.2;CP.forEach(([nm,x,c])=>{R.glass([x-.65,.04,ZC],[1.3,0,0],[0,.95,0],{c:P[c],a:ca,nu:4,nv:4});R.label([x,1.0,ZC],nm,{fs:13,b:1,c:P[c],a:Math.max(.3,ca),dy:-8,wide:1})});
      // cache entries that exist at this call; the one being created fades in at the end of the step
      for(let i=0;i<shown;i++){const z=ZE[i],born=i===s.make,a=born?Math.max(0,(e-.55)/.45):1,res=born?null:i===s.pass?'pass':fails.includes(i)?'fail':null;
        const c=res==='pass'?P.good:res==='fail'?P.bad:P.acc,hot=born||res==='pass';
        R.glass([XG-.35,.04,z],[.7,0,0],[0,.8,0],{c,a:a*(res?1:.6),nu:3,nv:4});
        R.box([XK,0,z],[1.6,.3,.55],{fill:mix(P.paper,P.c3,hot?.55:.2),a:a*(hot?1:.5)});
        R.label([XL,.15,z],ENT[i].id+' · '+ENT[i].g,{mono:true,fs:12.5,b:hot||res,al:'left',dx:6,c:res?c:hot?P.ink:P.mute,a,grp:'ent'})}
      // the call's path: to the gate column, past every failing gate in order, then through a pass or off to the compilers
      const gx=XG-.6,p=[[XI+.45,Y,ZM]];fails.forEach(i=>p.push([gx,Y,ZE[i]]));
      if(s.pass>=0){const z=ZE[s.pass];p.push([gx,Y,z],[XG,Y,z],[XK,Y+.1,z],[XO-.45,Y,ZM]);R.flow(p,{c:P.acc,r:.075,speed:1.5,a:Math.min(1,e*1.6)})}
      else{const st=p[p.length-1];for(let j=1;j<=14;j++)p.push(R.arcPt(st,[CP[0][1]-.6,Y+.3,ZC+.3],.5,j/14));p.push([CP[2][1]+.6,Y+.3,ZC+.3]);
        R.flow(p,{c:P.acc,r:.075,speed:1.5,a:Math.min(1,e*1.6)});
        R.flowArc([CP[2][1]+.6,Y+.35,ZC+.3],[XK+.8,Y+.3,ZE[s.make]],.6,{c:P.c4,r:.075,speed:1.3,a:Math.max(0,(e-.3)/.7)})}
      // the status line and the running tally
      const calls=[1,2,4,5,6][k],comp=C.slice(0,calls).reduce((t,c)=>t+c.compiled,0);
      R.label([0,2.0,ZC],s.st,{mono:true,fs:13,b:1,c:s.pass>=0?P.good:P.bad,a:e});
      R.label([0,2.0,ZC],calls+(calls>1?' calls · ':' call · ')+comp+(comp>1?' compiles':' compile'),{mono:true,fs:12.5,c:P.mute,dy:20,a:e})}
    else{ // the recompile limit: eight entries guarded on a string, then two calls that compile nothing and run eagerly
      const ZL=i=>-1.1+i*.42;
      R.box([XI,0,ZM],[.9,.4,.6],{fill:mix(P.paper,P.acc,.3),a:e});R.label([XI,.4,ZM],"call 9 · mode = 'a8'",{mono:true,fs:13,b:1,dy:-13,c:P.acc,a:e});
      for(let i=0;i<NL;i++){R.glass([XG-.3,.04,ZL(i)],[.6,0,0],[0,.55,0],{c:P.bad,a:e*.75,nu:2,nv:3});R.box([XK,0,ZL(i)],[1.4,.2,.3],{fill:mix(P.paper,P.c3,.25),a:e*.6,shadow:false})}
      R.label([XL,.1,ZL(0)],"0/0 · mode == 'a0'",{mono:true,fs:12.5,c:P.bad,al:'left',dx:6,a:e});R.label([XL,.1,ZL(NL-1)],'0/'+(NL-1)+" · mode == 'a"+(NL-1)+"'",{mono:true,fs:12.5,c:P.bad,al:'left',dx:6,a:e});
      CP.forEach(([nm,x,c])=>{R.glass([x-.65,.04,ZC-.2],[1.3,0,0],[0,.95,0],{c:P[c],a:.13*e,nu:4,nv:4})});
      R.label([0,2.0,ZC],'recompile_limit ('+L.recompile_limit+') reached: nothing compiled',{mono:true,fs:13,b:1,c:P.bad,a:e});
      R.label([0,2.0,ZC],NL+' versions, then calls 9 and 10 run eagerly',{mono:true,fs:12.5,c:P.mute,dy:20,a:e});
      R.box([XO-.5,0,2.55],[1.8,.4,.6],{fill:P.paper,a:e});R.label([XO-.5,.4,2.55],'eager Python',{mono:true,fs:12.5,b:1,dy:-13,a:e});
      const p=[[XI+.45,Y,ZM],[XG-.55,Y,ZL(0)]];for(let i=1;i<NL;i++)p.push([XG-.55,Y,ZL(i)]);p.push([XG-.55,Y,2.55],[XO-1.4,Y,2.55]);
      R.flow(p,{c:P.acc,r:.075,speed:1.6,a:e})}
  }
  const full={cam:[.22,.6],bounds:[[-4.7,0,-2.5],[4.6,1.9,2.3]]};
  S3.stage({id:'stg-call',list:'sx-call',fig:'Fig. 1 · one call into a compiled function',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,16,14,16],
    view:k=>k===5?{cam:[.22,.66],bounds:[[-4.7,0,-2.5],[4.6,1.9,2.9]]}:full});
})();
