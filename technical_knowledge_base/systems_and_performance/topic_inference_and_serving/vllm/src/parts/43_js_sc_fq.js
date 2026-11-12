// ---- Scene, section 3 (Fig. 3): the free queue is the eviction policy (renderer v2). Steps 1 to 5 replay vLLM v0.31.0's own unit test
// test_evict (tests/v1/core/test_prefix_caching.py L2739: a pool of 11 blocks, request 0 on blocks 1 to 6, request 1 on 7 to 9, both freed;
// the queues after each free are the test's assertions); steps 6 and 7 apply the same four operations to a new request (illustrative).
// The model below is the page's statement of the operations (block_pool.py L669, L226, L755, L777); window.VLFQ exposes the queues for the check. ----
(function(){
  if(!document.getElementById('stg-fq'))return;const {at,off,lerp,mix}=S3;
  // the states, one per step: queue (head first), holder of each held block with its slot, hashed set, and the step's moved or evicted blocks
  const S=[];{let q=[1,2,3,4,5,6,7,8,9,10],held={},hashed=new Set(),reqs={r0:[],r1:[],r2:[]};
    const snap=(mv,ev)=>S.push({q:q.slice(),held:JSON.parse(JSON.stringify(reqs)),hashed:new Set(hashed),mv:mv||[],ev:ev||[]});
    const alloc=(r,n)=>{const got=[],ev=[];for(let i=0;i<n;i++){const b=q.shift();if(hashed.has(b)){hashed.delete(b);ev.push(b)}got.push(b);reqs[r].push(b)}return [got,ev]};
    const free=r=>{const bl=reqs[r].slice().reverse();reqs[r]=[];bl.forEach(b=>{if(hashed.has(b))q.push(b);else q.unshift(b)});return bl};
    const touch=(r,bl)=>{bl.forEach(b=>{q.splice(q.indexOf(b),1);reqs[r].push(b)});return bl};
    snap();
    const a0=alloc('r0',6)[0],a1=alloc('r1',3)[0];snap(a0.concat(a1));
    [1,2,3,4,5,7,8,9].forEach(b=>hashed.add(b));snap([1,2,3,4,5,7,8,9]);
    snap(free('r0'));snap(free('r1'));
    snap(touch('r2',[1,2]));
    const [g,ev]=alloc('r2',3);snap(g,ev)}
  window.VLFQ=S.map(s=>s.q);
  const XQ=j=>-4.3+j*.95,ZP={r0:-1.9,r1:-1.9,r2:2.1},XP={r0:i=>XQ(i),r1:i=>XQ(6+i),r2:i=>XQ(i)},BW=.66;
  function pos(s,b){for(const r of ['r0','r1','r2']){const i=s.held[r].indexOf(b);if(i>=0)return [XP[r](i),.08,ZP[r]]}return [XQ(s.q.indexOf(b)),0,0]}
  function draw(R,k,e){const P=R.P,s=S[k],p=S[Math.max(0,k-1)];R.grid(-5.4,5.4,-2.9,2.9,.5);
    const lab=(show,pt,t,o)=>{if(show)R.label(pt,t,Object.assign({fs:12.5},o||{}))};
    // the request plates
    const plate=(r,n0,n,txt,a)=>{if(a<=.01)return;R.box([(XP[r](n0)+XP[r](n0+n-1))/2,0,ZP[r]],[(n-1)*.95+.95,.08,1.05],{fill:mix(P.paper,r==='r2'?P.c2:P.c1,.1),a,lw:.7,shadow:false,dz:300});
      const right=r==='r1';lab(1,[right?XP[r](n0+n-1)+.5:XP[r](n0)-.5,0,ZP[r]],txt,{al:right?'left':'right',dx:right?6:-6,b:1,a:Math.max(a,.5),wide:1})};
    plate('r0',0,6,'request 0',k===0?.3:k<=3?1:k===4?1-e*.7:.3);plate('r1',0,3,'request 1',k===0?.3:k<=4?1:.3);plate('r2',0,5,'new request',k>=5?(k===5?e:1):0);
    // the free queue: slots, head and tail
    R.box([0,0,0],[10*.95+.2,.03,1.05],{fill:mix(P.paper,P.ink,.05),a:1,lw:.6,shadow:false,dz:400});
    lab(1,[XQ(0)-.4,0,.55],'free queue head: next out',{al:'left',dy:16,fs:12,b:1,c:P.mute,wide:1});lab(1,[XQ(9)+.4,0,.55],'tail: last to evict',{al:'right',dy:16,fs:12,b:1,c:P.mute,wide:1});
    // the blocks: glide from where they were to where they are
    for(let b=1;b<=10;b++){const a0=pos(p,b),a1=pos(s,b),t=k===0?1:e,c=[lerp(a0[0],a1[0],t),lerp(a0[1],a1[1],t)+Math.sin(Math.PI*t)*(a0[2]!==a1[2]||a0[0]!==a1[0]?.5:0),lerp(a0[2],a1[2],t)];
      const hs=s.hashed.has(b)||(k===2&&p.hashed.has(b)),hn=k===2&&s.hashed.has(b)&&!p.hashed.has(b),evt=s.ev.includes(b),mv=s.mv.includes(b);
      const fill=evt?mix(P.paper,P.bad,.35*(1-e)+.05):hs?mix(P.paper,P.k,hn?.5*e:.5):P.paper;
      R.box(c,[BW,b===6&&k<3?.32:.5,BW],{fill,lw:mv||evt?1.6:.7,ec:evt?P.bad:mv?P.acc:null});
      lab(1,[c[0],c[1]+(b===6&&k<3?.32:.5),c[2]],String(b),{dy:-9,b:1,fs:12.5,c:evt?P.bad:P.ink})}
    // flows on the moves of the step
    if(k>=1){s.mv.forEach(b=>{const a0=pos(p,b),a1=pos(s,b);if(a0[0]===a1[0]&&a0[2]===a1[2])return;R.flowArc([a0[0],.55,a0[2]],[a1[0],.55,a1[2]],.6,{c:k===3||k===4?P.k:P.acc,r:.045,n:4,speed:1.2,a:e*.7})})}
    if(k===6){const b=s.ev[0],c=pos(s,b);lab(1,[c[0],0,c[2]+.55],'block '+b+' evicted: hash dropped',{dy:16,al:'left',dx:-20,b:1,c:P.bad,a:e})}
    if(k===5)lab(1,[XP.r2(.5),0,ZP.r2+.55],'1 and 2 found by hash',{dy:16,b:1,c:P.good,a:e});
  }
  const st=S3.stage({id:'stg-fq',list:'sx-fq',fig:'Fig. 3 · the free queue in test_evict',cam:[-.1,1.0],bounds:[[-6.6,0,-2.5],[6.4,.9,2.7]],aspect:.5,dur:1400,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[22,24,22,24]});
  (window.VLSTG=window.VLSTG||{})['stg-fq']=st;
})();
