// ---- Scene: one turn of the four-module protocol, ReAct (a seed harness) against Turnstile (a harness JIT-Agent generated), renderer v2 ----
// Illustrative: the paper publishes no trace for Turnstile. Built only from its description in Appendix C and Figure C.3 (a typed travel_spec and
// checklist, one memory bucket per evidence class, final_answer withheld until is_complete()) and the ReAct row of Table 1; the ten tools are the
// DeepPlanning-Travel tools in the released repository. Module cases run in execution order M, P, F, A; the view the model reads sits behind them,
// the tool shelf in front, the shared kernel on the right. window.JITTURN exposes what the scene draws for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-turn'))return;const {at,off,lerp,mix}=S3;
  const TOOLS=['query_train_info','query_flight_info','query_hotel_info','recommend_attractions','query_attraction_details','recommend_restaurants','query_restaurant_details','search_location','query_road_route_info','final_answer'];
  const BUCK=['transport','hotel','attractions','restaurants','routes'];
  const TURN_EXP=[5,6,7],PICK={react:2,turn:5},FA=9;
  const D={react:{view:[13,15],offered:10,final:true},turn:{buckets:[3,4],offered:TURN_EXP.length,hidden:TOOLS.length-1-TURN_EXP.length,final:false}};
  window.JITTURN={tools:TOOLS.length,react:D.react,turn:D.turn,steps:6};
  let mode='react';
  const MX={M:-3.6,P:-1.2,F:1.2,A:3.6},MZ=0,MW=1.7,MH=.95,ORD=['M','P','F','A'],NAME={M:'Memory',P:'Planning',F:'Capability',A:'Action'};
  const IMPL={react:{M:'FullHistory',P:'none: ∅',F:'full registry',A:'ReAct loop'},turn:{M:'DataStoreMemory',P:'TravelPlanning',F:'DynamicToolPolicy',A:'ReAct loop'}};
  const HZ=-2.7,TZ=2.7,TX=i=>-4.95+i*1.1,KX=[5.45,0,MZ],HX=i=>-5.4+i*.6,BX=i=>-3.3+i*1.55;
  function draw(R,k,e){const P=R.P,narrow=R.W<520,turn=mode==='turn';R.grid(-6.6,6.6,-3.2,3.2,.5);
    const MC={M:P.c1,P:P.c4,A:P.c3,F:P.c2};
    // which part each step is about: the rest recedes
    const act=[null,'M','P','F','A','K'][k];
    const dim=q=>act===null||act==='K'?(q==='A'&&act==='K'?1:.55):act===q?1:.28;
    // ---- the four module cases, in execution order ----
    ORD.forEach(q=>{const a=dim(q),on=act===q,c=[MX[q],0,MZ];
      R.box(c,[MW,.08,1.0],{fill:P.paper,a});
      R.box([c[0],.08,c[2]],[MW-.1,MH,.9],{fill:mix(P.paper,MC[q],on?.18+.32*e:.18),fa:on?.85:.35,ea:on?.9:.45,shadow:false,a});
      if(on)R.glow([c[0],.08+MH+.15,c[2]],.4,{c:MC[q],a:.45*e});
      R.label([c[0],.08+MH,c[2]],narrow?q:q+' · '+NAME[q],{fs:13,b:1,dy:-12,c:MC[q],a:Math.max(.55,a)});
      R.label([c[0],0,c[2]+.5],IMPL[mode][q],{mono:true,fs:12,dy:14,c:on?P.ink:P.mute,a:Math.max(.5,a),wide:1})});
    // execution order: faint arrows M to P to F to A
    ['M','P','F'].forEach((q,i)=>{const nx=ORD[i+1];R.line([[MX[q]+MW/2+.05,.45,MZ],[MX[nx]-MW/2-.05,.45,MZ]],{c:P.mute,w:1.2,head:5,a:.6})});
    // ---- the kernel ----
    const ka=act==='K'?1:.4;R.box(KX,[1.0,.62,.9],{fill:mix(P.paper,P.mute,.18),a:ka});R.label([KX[0],.62,KX[2]],'kernel',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:Math.max(.55,ka)});
    // ---- the view the model reads (M) ----
    const va=act===null||act==='M'||act==='K'?1:act==='P'&&turn?.85:.35;
    if(!turn){const n=k>=5?15:13;
      for(let i=0;i<15;i++){const kind=i===0?'task':i%2?'call':'obs',grow=i<13?1:k>=5?Math.min(1,e*2-(i-13)*.5):0;if(grow<=.01)continue;
        const h=(kind==='task'?.5:kind==='call'?.32:.42)*grow,fill=kind==='task'?mix(P.paper,P.c1,.55):kind==='call'?P.paper:mix(P.paper,P.c5,.5);
        R.box([HX(i),0,HZ],[.46,h,.5],{fill,a:va*(i<13?1:grow),shadow:i<13})}
      R.label([HX(0)-.3,.3,HZ],'view: the whole transcript',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,a:Math.max(.5,va),wide:1});
      R.label([HX(Math.min(n,14)-1),.5,HZ],n+' entries',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:Math.max(.5,va)});
      if(k===1)for(let i=0;i<13;i+=2)R.flowArc([HX(i),.45,HZ],[MX.M+(i-6)*.07,.95,MZ],.45,{c:P.c1,a:e,r:.045,n:3,speed:1.2})}
    else{R.box([-4.6,0,HZ],[.9,.55,.6],{fill:mix(P.paper,P.c4,.4),a:va});R.label([-4.6,.55,HZ],'travel_spec',{mono:true,fs:12,dy:-12,c:P.c4,a:Math.max(.5,va),wide:1});
      BUCK.forEach((b,i)=>{const full=i<3||(i===3&&k>=5),lvl=i<3?1:i===3&&k>=5?(k===5?e:1):0,gap=i===3&&k>=2,c=[BX(i),0,HZ];
        R.box(c,[1.0,.08,.75],{fill:P.paper,a:va});
        if(lvl>0)R.box([c[0],.08,c[2]],[.84,.55*lvl,.6],{fill:mix(P.paper,P.c1,.5),shadow:false,a:va});
        R.glass([c[0]-.48,.08,c[2]+.36],[.96,0,0],[0,.62,0],{c:gap?P.c4:P.c1,a:va*(gap?1:.7),nu:2,nv:2});
        R.label([c[0],.72,c[2]],i<3?b:b+(full?' · collected':' · missing'),{mono:true,fs:12,dy:-12,c:i<3?P.ink:full?P.good:gap?P.c4:P.bad,b:i>=3?1:0,a:Math.max(.5,va),wide:i===3?0:1});
        });
      if(k===1)BUCK.forEach((b,i)=>{if(i<3)R.flowArc([BX(i),.6,HZ],[MX.M+(i-1)*.25,.95,MZ],.4,{c:P.c1,a:e,r:.05,n:4,speed:1.2})});
      if(k===2)R.flowArc([BX(3),.75,HZ],[MX.P,.95,MZ],.35,{c:P.c4,a:e,r:.055,n:5,speed:1.2})}
    // ---- the tool shelf (F decides what is offered) ----
    const ta=act==='F'||act==='A'?1:act==='K'?.6:.4;
    TOOLS.forEach((t,i)=>{const fa=i===FA,c=[TX(i),0,TZ];
      // exposed at this step? ReAct: always all ten. Turnstile: decided at the F step; three exposed, final_answer withheld, six hidden
      let up=1;if(turn&&k>=3){const ex=TURN_EXP.includes(i);up=ex?1:k===3?lerp(1,.2,e):.2}
      const pick=PICK[mode]===i&&k>=4,h=.12+.3*up;
      R.box(c,[.8,h,.5],{fill:fa?mix(P.paper,P.acc,.45):pick?mix(P.paper,P.c3,.55):P.paper,a:ta*(up<.5?.5:1)});
      if(fa&&turn&&k>=3){const la=k===3?e:1;R.glass([c[0]-.45,0,c[2]+.3],[.9,0,0],[0,.62,0],{c:P.bad,a:la*ta,nu:1,nv:1});R.glass([c[0]-.45,.62,c[2]-.3],[.9,0,0],[0,0,.6],{c:P.bad,a:la*ta*.7,nu:1,nv:1});
        R.label([c[0],.62,c[2]],'final_answer · locked',{mono:true,fs:12,b:1,dy:-12,c:P.bad,a:la*Math.max(.6,ta)})}
      else if(fa&&k>=3)R.label([c[0],h,c[2]],'final_answer · offered',{mono:true,fs:12,b:1,dy:-12,c:P.acc,a:ta,wide:1});
      if(turn&&k>=3&&TURN_EXP.includes(i)&&!pick){const lo=i%2===1;R.label([c[0],lo?0:h,lo?c[2]+.3:c[2]],t.replace(/^(query|recommend|search)_/,''),{mono:true,fs:12,dy:lo?14:-12,c:P.c2,a:ta,wide:1})}
      if(pick)R.label([c[0],0,c[2]+.3],t,{mono:true,fs:12.5,b:1,dy:14,c:P.c3,a:k===4?e:1})});
    if(!(turn&&k===3))R.label([TX(0)-.5,.2,TZ],k<3?'tools':turn?'3 offered · 6 hidden':'all 10 offered',{al:'right',dx:-6,mono:true,fs:12.5,b:k>=3?1:0,c:P.c2,a:Math.max(.5,ta)});
    if(k===3){
      // the directive and the view reach F
      R.flowArc([MX.P+.5,.9,MZ],[MX.F-.3,.9,MZ],.3,{c:P.c4,a:e,r:.05,n:4,speed:1.1})}
    if(k===2&&!turn)R.label([MX.P,.5,MZ],'∅',{fs:22,b:1,c:P.c4,a:e});
    if(k===2&&turn)R.label([MX.P,.08+MH,MZ],'next gap: restaurants',{mono:true,fs:12.5,b:1,dy:-30,c:P.c4,a:e});
    // ---- A: the model picks one call among the offered tools ----
    if(k===4){(turn?TURN_EXP:TOOLS.map((_,i)=>i)).forEach(i=>R.flowArc([TX(i),.45,TZ],[MX.A,.9,MZ],.5,{c:i===PICK[mode]?P.c3:P.mute,a:e*(i===PICK[mode]?1:.45),r:i===PICK[mode]?.06:.04,n:i===PICK[mode]?6:2,speed:1.2}))}
    // ---- the kernel runs the call and appends the observation (ReAct) or fills the bucket (Turnstile) ----
    if(k===5){R.flowArc([MX.A+.6,.8,MZ],[KX[0]-.3,.6,KX[2]],.4,{c:P.c3,a:e,r:.06,n:5,speed:1.2});
      R.flowArc([KX[0],.6,KX[2]-.3],turn?[BX(3),.6,HZ]:[HX(14),.5,HZ],1.0,{c:P.c5,a:e,r:.06,n:8,speed:1.3})}
  }
  const full={cam:[.16,.95],bounds:[[-6.2,0,-3.2],[6.2,1.25,3.2]]};
  const st=S3.stage({id:'stg-turn',list:'sx-turn-react',fig:'3D · one turn of the protocol · illustrative',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,16,8]:[18,16,24,16],
    // M moves in close on the view and the memory case; F on the tool shelf; everything else shows the whole turn
    view:k=>k===1?{cam:[.12,.7],bounds:[[-6.2,0,-3.3],[-.2,1.2,.8]]}:k===3?(mode==='turn'?{cam:[.12,.8],bounds:[[-1.6,0,-.7],[6.0,1.2,3.3]]}:{cam:[.12,.84],bounds:[[-6.0,0,-.7],[6.0,1.2,3.3]]}):full});
  const seg=document.getElementById('turnM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    ['react','turn'].forEach(m=>{const L=document.getElementById('sx-turn-'+m);if(L)L.hidden=m!==mode});st.list('sx-turn-'+mode)}));
})();
