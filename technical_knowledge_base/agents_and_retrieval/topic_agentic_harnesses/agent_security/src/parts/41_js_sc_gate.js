// ---- Scene: Fig. 2, the permission gate deciding (section 4, renderer v2). The root Loop lab's real gate verdicts (HSEC.gate_cases,
// reused verbatim from the root's gate_cases.json, no model) drive it: each of the 11 actions is a ball; the four checks are glass gates
// in order (deny rules, the metacharacter rule, allow rules, nothing matched); the first match settles the action. Allowed actions go on
// to the tool; a deny rule stops one at the first gate; "ask" goes to the person, and headless there is nobody, so it is denied.
// Steps (ol#sx-gate): the chain, six actions one at a time, then all 11 in their piles. ----
(function(){
  if(!document.getElementById('stg-gate'))return;const {at,mix,lerp3}=S3;
  const gc=(window.HSEC&&HSEC.gate_cases)||[];if(!gc.length)return;
  const tgt=o=>(o.args&&(o.args.cmd||o.args.path))||o.target||'';
  // the check that settled an action, from the gate's own output: 0 deny rule, 1 metacharacter (ask), 2 allow rule, 3 nothing matched (ask)
  const chk=o=>/deny rule/.test(o.why)?0:/ask rule/.test(o.why)?1:/allow rule/.test(o.why)?2:3;
  const out=o=>{const c=chk(o);return c===2?'allow':c===0?'rule':'default'};
  // the six actions stepped one by one (the same six as the step list), found in the data by what they are
  const PICK=[o=>o.tool==='read_file',o=>o.tool==='edit_file'&&/tests/.test(tgt(o)),o=>tgt(o)==='python3 tests/test_core.py',o=>tgt(o)==='python tests/test_core.py',o=>/rm -rf/.test(tgt(o)),o=>/\$\(/.test(tgt(o))];
  const seq=PICK.map(f=>gc.findIndex(f));if(seq.some(i=>i<0))return;
  const N=gc.length,LAST=seq.length+1;
  // the step at which each action reaches its outcome: its own step for the six, the last step for the rest
  const when=gc.map((_,i)=>{const s=seq.indexOf(i);return s>=0?s+1:LAST});
  // where each outcome piles up
  const idxIn=gc.map((o,i)=>gc.slice(0,i).filter(q=>out(q)===out(o)).length);
  const MX=-4.5,QX=-3.75,GX=[-2.9,-1.4,.1,1.6],TX=3.4,NB=[-.65,0,2.45],ZW=.9;
  const GN=['1 · deny','2 · metachar','3 · allow','4 · no match'];
  const qz=i=>(i-(N-1)/2)*.19;
  function pile(i){const o=gc[i],j=idxIn[i],w=out(o);
    if(w==='allow')return [TX+(j%2-.5)*.3,.79,(Math.floor(j/2)-.5)*.3];
    if(w==='rule')return [GX[0]-.3+(j%2)*.28,.09,2.0+Math.floor(j/2)*.28];
    return [NB[0]+1.0+j*.28,.09,NB[2]]}
  // the route an action takes: from the queue to the gate that settles it, then to its outcome
  function route(i){const o=gc[i],c=chk(o),z=qz(i)*.5,p=[[QX,.45,qz(i)],[GX[0]-.35,.45,z]];
    for(let g=0;g<=c;g++)p.push([GX[g]+(g<c?.2:-.15),.45,z]);
    if(c===2){p.push([TX-.65,.45,z]);p.push(pile(i))}
    else if(c===0){p.push([GX[0]-.3,.3,1.3]);p.push(pile(i))}
    else{p.push([GX[c]-.15,.6,1.1]);p.push([NB[0]+.2,.45,NB[2]-.35]);p.push(pile(i))}
    return p}
  function along(p,u){const L=[];let T=0;for(let i=1;i<p.length;i++){const d=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1],p[i][2]-p[i-1][2]);L.push(d);T+=d}
    let d=u*T,j=0;while(j<L.length-1&&d>L[j]){d-=L[j];j++}return lerp3(p[j],p[j+1],L[j]?Math.min(1,d/L[j]):1)}
  const col=(P,i)=>{const w=out(gc[i]);return w==='allow'?P.good:P.bad};
  function draw(R,k,e){const P=R.P,nar=R.W<520,cur=k>=1&&k<=seq.length?seq[k-1]:-1,cc=cur>=0?chk(gc[cur]):-1,last=k===LAST;
    R.grid(-5.6,4.2,-2.8,2.4,.5);
    R.box([MX,0,0],[.9,.8,1.3],{fill:mix(P.paper,P.c2,.3)});R.label([MX,.8,0],'model',{fs:13,b:1,c:P.c2,dy:-12});
    R.box([TX,0,0],[1.0,.7,1.0],{fill:mix(P.paper,P.good,.2)});R.label([TX,.7,0],'tool runs',{fs:13,b:1,c:P.good,dy:last?-34:-12});
    // nobody at the terminal: where "ask" goes in a headless run
    const nbHot=cc===1||cc===3||last;
    R.box(NB,[.85,.5,.6],{fill:mix(P.paper,P.c5,.25),a:k===0||nbHot?1:.45});R.label([NB[0],0,NB[2]+.3],'nobody to ask',{fs:12.5,b:nbHot,c:P.c5,dy:16,a:k===0||nbHot?1:.6});
    // the four checks as glass gates; the one that settles the current action at full strength, the ones it passed lit, the rest receding
    GX.forEach((x,g)=>{const c=g===0?P.bad:g===2?P.good:P.c5,hl=g===cc,passed=cur>=0&&g<cc,a=cur<0?1:hl?1:passed?.55:.18;
      R.glass([x,.02,-ZW],[0,0,2*ZW],[0,1.0,0],{c,a,nu:4,nv:4});
      R.label([x,1.0,0],nar?String(g+1):GN[g],{fs:13,b:1,c:mix(P.ink,c,.4),dy:-11,a:Math.max(.45,a)})});
    // the eleven actions as balls: queued, travelling (the current one), or in their pile
    gc.forEach((o,i)=>{const w=when[i];let p,a=1,c=P.c2;
      if(k<w&&!(last&&w===LAST)){p=[QX,.45,qz(i)];a=cur>=0?.35:.9}
      else if(k===w){const r=route(i),u=Math.min(1,e*1.05);p=along(r,u);c=u>.6?col(P,i):P.c2}
      else{p=pile(i);c=col(P,i);a=last?1:.6}
      R.ball(p,i===cur?.11:.085,{c,a})});
    // flows on the current action's path: up to the settling gate, then on to its outcome
    if(cur>=0){const r=route(cur),gi=2+cc,head=r.slice(0,gi+1),tail=r.slice(gi);
      R.flow(head,{c:P.c2,r:.05,n:Math.max(4,gi*3),speed:1.3,a:e});
      R.flow(tail.slice(0,-1),{c:cc===2?P.good:cc===0?P.bad:P.c5,r:.05,n:5,speed:1.1,a:e});
      const v=cc===2?'allow':cc===0?'deny: rule 1':'ask, nobody: deny';
      R.label([GX[cc],1.0,0],v,{fs:13.5,b:1,c:cc===2?P.good:P.bad,dy:-30,a:e});
      R.label([MX,.8,0],tgt(gc[cur]),{mono:true,fs:12.5,b:1,dy:-34,al:'left',dx:-30,a:1})}
    if(k===0)R.label([QX,.45,qz(N-1)],N+' actions',{fs:13,b:1,c:P.c2,dy:22});
    // the tally under each pile
    if(last){const n=w=>gc.filter(o=>out(o)===w).length;
      R.label([TX,.7,0],n('allow')+' allowed',{fs:13.5,b:1,c:P.good,dy:-12});
      R.label([GX[0]-.15,0,2.3],n('rule')+' denied by a named rule',{fs:13,b:1,c:P.bad,dy:16});
      R.label([NB[0]+1.7,.1,NB[2]],n('default')+' denied by the default',{al:'left',dx:8,fs:13,b:1,c:P.bad})}
  }
  const full={cam:[.5,.6],bounds:[[-5.1,0,-1.0],[4.0,1.1,2.9]]};
  S3.stage({id:'stg-gate',list:'sx-gate',fig:'Fig. 2 · eleven actions through the gate, no model',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:5200,draw,
    margin:w=>w<520?[24,10,14,10]:[34,16,18,16]});
})();
