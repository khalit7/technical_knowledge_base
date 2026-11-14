// ---- Scene: MCP with and without sessions (renderer v2): one client, a gateway, three server instances, the same six calls ----
// The mechanisms are the ones InfoQ's report of the 2026-07-28 revision describes (initialize handshake and Mcp-Session-Id, sticky routing,
// Mcp-Method and Mcp-Name headers, approval as a second request instead of a held stream). Illustrative: three instances, one restart and
// these six calls. Per step: which instance answers (to), round trips (rt), handshake steps (hs), bodies the gateway parses (parse),
// failures (fail), connections held for a human (hold), the restart, the sessions each instance holds. The totals (9 and 6 round trips,
// 4 of them handshake) are asserted in src/recompute.py; the step text is the ol.sx list beside the stage (#sx-mc-old, #sx-mc-new).
(function(){
  if(!document.getElementById('stg-mc'))return;const {at,mix}=S3;
  const R_=o=>Object.assign({rt:1,hs:0,parse:0,fail:0,hold:0,sess:{}},o);
  const STEPS={
    old:[R_({to:'A',hs:1,parse:1,sess:{A:'S1'},k:'hs'}),R_({to:'A',hs:1,parse:1,sess:{A:'S1'},k:'hs',pin:'A'}),R_({to:'A',parse:1,sess:{A:'S1'},pin:'A'}),R_({to:'A',parse:1,sess:{A:'S1'},pin:'A'}),
      R_({to:null,rt:0,restart:'A',lost:'S1',pin:'A'}),R_({to:'A',parse:1,fail:1,restarted:'A',pin:'A'}),R_({to:'B',hs:1,rt:2,parse:2,sess:{B:'S2'},restarted:'A',k:'hs',pin:'B'}),
      R_({to:'B',parse:1,sess:{B:'S2'},restarted:'A',pin:'B'}),R_({to:'B',parse:1,hold:1,sess:{B:'S2'},restarted:'A',pin:'B'}),R_({to:null,rt:0,sess:{B:'S2'},restarted:'A',sum:1})],
    new:[R_({to:'B'}),R_({to:'C'}),R_({to:'A'}),R_({to:null,rt:0,restart:'A'}),R_({to:'B',restarted:'A'}),R_({to:'C',ask:1,restarted:'A'}),R_({to:'B',answer:1,restarted:'A'}),R_({to:null,rt:0,restarted:'A',sum:1})]};
  window.MCP_STEPS=STEPS; // read by src/check_stages.mjs against the step lists and the counters
  let M='old';
  const CL=[-5.1,0,0],GW=[-1.5,0,0],IX=2.7,IZ={A:-2.2,B:0,C:2.2},HU=[-5.1,0,2.3],IS=[1.5,.75,1.25];
  const inst=n=>[IX,0,IZ[n]];
  // requests each instance has answered so far, as a stack of tiles beside it (failed ones in the warning colour)
  function served(k){const S=STEPS[M],c={A:[],B:[],C:[]};for(let j=0;j<=k;j++){const s=S[j];if(s.to)for(let r=0;r<s.rt;r++)c[s.to].push(s.fail?'f':'o')}return c}
  function draw(R,k,e){const P=R.P,S=STEPS[M],s=S[k];R.grid(-6.6,4.4,-3.4,3.6,.5);
    const down=n=>s.restart===n&&e<.75,wasR=n=>s.restarted===n||(s.restart===n&&e>=.75);
    // the client (an agent) and, for the approval steps, the human it asks
    R.box(CL,[1.3,.62,1.0],{fill:mix(P.paper,P.c1,.22)});R.label([CL[0],.62,CL[2]],'client (agent)',{fs:12.5,b:1,dy:-12});
    const hu=s.hold||s.ask||s.answer?(s.ask?e:1):0;
    if(hu>0){R.box(HU,[.36,.42,.36],{fill:mix(P.paper,P.c5,.4),a:hu});R.ball([HU[0],.62,HU[2]],.17,{c:P.c5,a:hu});R.label([HU[0],.8,HU[2]],'a human',{fs:12,c:P.c5,dy:-10,a:hu})}
    // the gateway: parses each JSON-RPC body (with sessions) or reads two headers (without)
    const gOn=s.to?1:.55;R.box(GW,[1.0,.42,2.4],{fill:mix(P.paper,P.c6,.28),a:gOn+.2});R.label([GW[0],.42,GW[2]-1.2],'gateway',{fs:12.5,b:1,dy:-12});
    if(s.to){const t=M==='old'?'parses the body':'reads Mcp-Method'+(k===0?'':', Mcp-Name');R.label([GW[0],.42,GW[2]+1.2],t,{fs:12,c:M==='old'?P.c2:P.c6,dy:16,a:e,b:1})}
    // the three instances; a session is a glass plate standing on the instance that holds it
    const tally=served(k);
    ['A','B','C'].forEach(n=>{const c=inst(n),hot=s.to===n,dn=down(n);
      R.box(c,IS,{fill:hot?mix(P.paper,s.fail&&e>.5?P.bad:P.c1,.35):P.paper,a:dn?.28:1});
      R.label([c[0]+.85,.4,c[2]],'instance '+n,{fs:12.5,b:hot,al:'left',dx:6});
      if(dn){R.glow([c[0],.5,c[2]],1.1,{c:P.bad,a:.55*(1-e)});R.label([c[0],IS[1],c[2]],'restarting',{fs:12,c:P.bad,dy:-12,b:1})}
      else if(wasR(n)&&!s.sess[n])R.label([c[0]+.85,.4,c[2]],M==='old'?'restarted: S1 lost':'restarted, nothing lost',{fs:12,c:M==='old'?P.bad:P.good,al:'left',dx:6,dy:16,wide:1});
      const ss=s.sess[n]||(s.lost&&n===s.restart?s.lost:null);
      if(ss){const a=s.lost&&n===s.restart?1-e:(k===0||(s.k==='hs'&&!S[k-1].sess[n]))?e:1;
        R.glass([c[0]-.45,IS[1]+.02,c[2]],[.9,0,0],[0,.55,0],{c:P.c4,a,nu:4,nv:3});R.label([c[0],IS[1]+.6,c[2]],'session '+ss,{fs:12,c:P.c4,b:1,dy:-10,a})}
      // the tally of requests this instance answered
      tally[n].forEach((f,i)=>{const fresh=hot&&i>=tally[n].length-s.rt;R.box([c[0]-.95,i*.13,c[2]+.35],[.32,.1,.32],{fill:f==='f'?P.bad:mix(P.paper,P.c1,.55),a:fresh?at(1,e,1)*Math.min(1,e*2):1,shadow:false,lw:.6})});
    });
    if(k===S.length-1||s.sum)['A','B','C'].forEach(n=>R.label([IX-.95,tally[n].length*.13,IZ[n]+.35],tally[n].length+' answered',{fs:12,c:P.c1,dy:-10,b:1}));
    // sticky routing: with sessions the client is pinned to one instance
    if(s.pin){const c=inst(s.pin);R.line([[CL[0]+.4,.7,CL[2]],[GW[0],.95,0],[c[0]-.3,IS[1]+.1,c[2]]],{c:P.c4,w:1.6,dash:[5,5],a:.75});
      R.label([(GW[0]+IX)/2+.3,1.3,IZ[s.pin]/2],'pinned to '+s.pin,{fs:12,c:P.c4,dy:-8,b:1,wide:1})}
    // the request and its reply: dots stream client to gateway to instance, then back
    if(s.to){const c=inst(s.to),a0=[CL[0]+.65,.45,CL[2]+.15],g=[GW[0],.55,GW[2]+.15],b0=[c[0]-.75,.5,c[2]+.15];
      const col=s.k==='hs'?P.c5:P.acc,go=[],back=[];for(let i=0;i<=14;i++)go.push(R.arcPt(a0,g,.45,i/14));for(let i=1;i<=18;i++)go.push(R.arcPt(g,b0,.5,i/18));
      for(let i=go.length-1;i>=0;i--){const p=go[i];back.push([p[0],p[1]+.2,p[2]-.3])}
      R.flow(go,{c:col,a:Math.min(1,e*2),r:.09,speed:2.2,n:s.rt>1?16:9});
      if(e>.45){const rc=s.fail?P.bad:s.ask?P.c5:P.good;R.flow(back,{c:rc,a:Math.min(1,(e-.45)*2.5),r:.08,speed:2.2,n:s.rt>1?14:8});
        const rt=s.fail?'404 session not found':s.ask?'input_required':s.k==='hs'?(s.rt>1?'200 with id S2, then 202':k===0?'200 with id S1':'202'):s.hold?'held open':s.answer?'refund approved':'200';
        R.label(R.arcPt(g,b0,.5,R.W<520?.38:.62),rt,{fs:12,c:rc,b:1,dy:18})}
      if(s.k==='hs')R.label([(CL[0]+GW[0])/2,1.05,0],'handshake',{fs:12,c:P.c5,b:1,dy:-10,a:e,wide:1})}
    // approval: held stream (with sessions) against an answer collected between two requests (without)
    if(s.hold&&e>.5){const c=inst(s.to);R.flowArc([c[0]-.75,.7,c[2]],[CL[0]+.6,.7,CL[2]],1.1,{c:P.c4,a:(e-.5)*2,r:.06,speed:1.2,n:10});
      R.flowArc([CL[0],.5,CL[2]+.5],[HU[0],.5,HU[2]-.2],.3,{c:P.c5,a:(e-.5)*2,r:.05,n:4});R.label([(CL[0]+c[0])/2,1.55,0],'stream held open while the human decides',{fs:12,c:P.c4,b:1,a:(e-.5)*2})}
    if(s.ask&&e>.7)R.flowArc([CL[0],.5,CL[2]+.5],[HU[0],.5,HU[2]-.2],.3,{c:P.c5,a:(e-.7)*3,r:.05,n:4});
    if(s.answer)R.label([CL[0],.62,CL[2]+.5],'"approved"',{fs:12,c:P.c5,dy:16,b:1,al:'left',dx:30});
  }
  const fmtN=v=>String(v);
  function counters(k){const S=STEPS[M];let rt=0,hs=0,parse=0,fail=0,hold=0;for(let j=0;j<=k;j++){const s=S[j];rt+=s.rt;hs+=s.hs*(s.rt>1?2:1);parse+=s.parse;fail+=s.fail;hold+=s.hold}
    return stat('Round trips',fmtN(rt),'HTTP requests and replies')+stat('Handshake round trips',fmtN(hs),'initialize and initialized')+stat('Bodies parsed by the gateway',fmtN(parse),M==='old'?'to learn the method':'routing on Mcp-Method, Mcp-Name')+stat('Calls failed by the restart',fmtN(fail),'')+stat('Connections held for a human',fmtN(hold),M==='old'?'elicitation over an open stream':'input_required, then retry')}
  const full={cam:[.42,.72],bounds:[[-6,0,-3],[3.9,1.4,3.2]]},fullW={cam:[.42,.72],bounds:[[-6,0,-3],[6.4,1.4,3.2]]},near={cam:[.5,.62],bounds:[[1.0,0,-3],[4.4,1.3,3]]},phone={cam:[.3,.98],bounds:[[-6,0,-2.9],[3.6,1.2,3]]}; // on a phone the camera looks down more, so the instances spread vertically
  const stg=S3.stage({id:'stg-mc',list:'sx-mc-old',fig:'MCP · the same six calls, two protocol versions',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4400,draw,
    // the restart is about the instances: the camera moves in close; every other step shows the whole path
    view:k=>STEPS[M][k]&&STEPS[M][k].restart?near:innerWidth<520?phone:fullW, // fullW: room on the right for the instance notes
    margin:w=>w<520?[22,8,14,8]:[26,16,16,16],
    onStep:k=>{const c=document.getElementById('mcCnt');if(c)c.innerHTML=counters(k)}});
  const seg=document.getElementById('mcM');if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    M=b.dataset.m;document.getElementById('sx-mc-old').hidden=M!=='old';document.getElementById('sx-mc-new').hidden=M!=='new';stg.list('sx-mc-'+M)}));
})();
