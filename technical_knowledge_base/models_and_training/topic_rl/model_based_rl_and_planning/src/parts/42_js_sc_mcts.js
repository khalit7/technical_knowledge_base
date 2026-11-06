// ---- Scene: Monte Carlo tree search growing on one tic-tac-toe position (section 5), 30 simulations, three searchers ----
// The tree is rebuilt from the engine's trace (MB.uct / MB.puct, checked against src/recompute.py): one bar per node, height grows with its visits,
// colour its mean value for O. One simulation with a path of two or more edges is shown phase by phase; the others play in two stretches.
(function(){
  if(!document.getElementById('stg-mc'))return;const {at,lerp,mix}=S3;
  const SHOW=[-1,0,0,1,1,0,0,0,0],BLOCK=5,SIMS=30;
  const nets={};const net=k=>nets[k]||(nets[k]=MB.Net(MB_DATA.ttt.ckpts[k]));
  let mode='p60',T=null;
  // the tree: nodes keyed by their path ('' is the root), birth = the simulation that added them, vis[c] and val[c] after c simulations (val: summed result for O)
  function build(){const run=mode==='uct'?MB.uct(SHOW,SIMS,MB.rng(4242),true):MB.puct(net(mode==='p0'?'0':'60'),SHOW,SIMS,true);
    const nodes={'':{key:'',d:0,kids:[],birth:-1}},order=[];
    run.trace.forEach((tr,s)=>{let key='';tr.path.forEach((a,d)=>{const k2=key?key+','+a:String(a);if(!nodes[k2]){nodes[k2]={key:k2,a,d:d+1,par:key,kids:[],birth:s,vis:new Array(SIMS+1).fill(0),val:new Array(SIMS+1).fill(0)};nodes[key].kids.push(k2);order.push(k2)}key=k2})});
    run.trace.forEach((tr,s)=>{const L=tr.path.length,vO=L%2===0?tr.v:-tr.v;let key='';const on=new Set();tr.path.forEach(a=>{key=key?key+','+a:String(a);on.add(key)});
      order.forEach(k=>{const n=nodes[k];for(let c=s+1;c<=SIMS;c++){if(on.has(k)){n.vis[c]++;n.val[c]+=vO}}})});
    // layout: the root's six moves in fixed slots across the floor; each subtree shares its slot by leaf count
    const legal=[];for(let a=0;a<9;a++)if(SHOW[a]===0)legal.push(a);const slot={};legal.forEach((a,j)=>slot[a]=(j-(legal.length-1)/2)*1.55);
    const leaves=k=>{const n=nodes[k];return n.kids.length?n.kids.reduce((s,c)=>s+leaves(c),0):1};
    const place=(k,x0,x1)=>{const n=nodes[k];n.x=(x0+x1)/2;n.z=1.3-(n.d-1)*.85;const tot=leaves(k);let x=x0;n.kids.sort((a,b)=>nodes[a].a-nodes[b].a).forEach(c=>{const w=(x1-x0)*leaves(c)/tot;place(c,x,x+w);x+=w})};
    nodes[''].kids.forEach(k=>place(k,slot[nodes[k].a]-.7,slot[nodes[k].a]+.7));legal.forEach(a=>{if(!nodes[String(a)])nodes['_'+a]={x:slot[a],z:1.3,ghost:1,a}});
    // the featured simulation: the first after the opening with a path of two or more edges
    const lastKey=tr=>tr.path.join(',');let f=run.trace.findIndex((tr,s)=>s>=2&&tr.path.length>=2&&nodes[lastKey(tr)].birth===s);if(f<0)f=Math.min(5,SIMS-1);
    const path=[];let key='';run.trace[f].path.forEach(a=>{key=key?key+','+a:String(a);path.push(key)});
    T={run,nodes,order,legal,slot,f,path,tr:run.trace[f]};}
  const H=(n,c)=>.06+Math.sqrt(n.vis[c])*.27;
  // simulations finished at step k, progress e: 0 | opening stretch | the featured one (not yet backed up) | backed up | the rest | all
  const done=(k,e)=>k===0?0:k===1?Math.round(lerp(0,T.f,e)):k<=4?T.f:k===5?T.f+1:k===6?Math.round(lerp(T.f+1,SIMS,e)):SIMS;
  function draw(R,k,e){const P=R.P;if(!T)build();R.grid(-5,5,-4,3.6,.5);
    const c=done(k,e),fp=new Set(T.path),newKey=T.path[T.path.length-1],focus=k>=2&&k<=5;
    // the root: the position itself as a board, O to move; the block cell outlined
    for(let i=0;i<9;i++){const x=((i%3)-1)*.34,z=2.75+(Math.floor(i/3)-1)*.34,b=SHOW[i];
      R.box([x,0,z],[.31,.06,.31],{fill:i===BLOCK?mix(P.paper,P.acc,.35):P.paper,shadow:false,lw:.6,dz:2});
      if(b)R.label([x,.06,z],b===1?'X':'O',{fs:13,b:1,c:b===1?P.q:P.acc})}
    R.label([0,0,3.25],'root · O to move',{fs:12.5,b:1,dy:12});
    const pos=n=>[n.x,0,n.z],tip=(n,cc)=>[n.x,H(n,cc)+.04,n.z];
    // edges and nodes
    T.order.forEach(k2=>{const n=T.nodes[k2],shown=n.birth<c||(k2===newKey&&k>=3&&k<=4);if(!shown)return;
      const par=n.par?T.nodes[n.par]:null,pp=par?[par.x,.02,par.z]:[0,.02,2.25],dim=focus&&!fp.has(k2)?.3:k===7&&n.d>1?.22:1;
      R.line([pp,[n.x,.02,n.z]],{c:fp.has(k2)&&focus?P.acc:P.mute,w:fp.has(k2)&&focus?2.2:1,a:.55*dim});
      const vv=n.vis[Math.max(c,0)],q=vv?n.val[c]/vv:0,isNew=k2===newKey&&k>=3&&k<=4,h=isNew?.08*(k===3?e:1)+.02:H(n,c),w=n.d===1?.42:Math.max(.16,.34-.04*n.d);
      R.box(pos(n),[w,h,w],{fill:vv?mix(P.paper,q>=0?P.good:P.bad,Math.min(.85,.2+Math.abs(q)*.7)):P.paper,a:dim,shadow:n.d===1,lw:.7});
      if(isNew)R.glow([n.x,.15,n.z],.45,{c:P.acc,a:k===3?e:.6});
      if(n.d===1)R.label([n.x,h,n.z],'N '+vv,{mono:true,fs:12,b:n.a===BLOCK,dy:-10,a:Math.max(.5,dim)})});
    T.legal.forEach(a=>{const n=T.nodes[String(a)];if(n&&n.birth<c)return;const x=T.slot[a],h=.21;R.quad([[x-h,.01,1.3-h],[x+h,.01,1.3-h],[x+h,.01,1.3+h],[x-h,.01,1.3+h]],{dash:[4,3],ea:.6,a:focus?.4:1})});
    // the six root moves: labels in front, the network's prior as a thin purple bar beside each (PUCT)
    T.legal.forEach(a=>{const x=T.slot[a];R.label([x,0,1.3+.3],'cell '+(a+1)+(a===BLOCK?' · block':''),{fs:12,b:a===BLOCK,c:a===BLOCK?P.acc:P.ink,dy:14,a:focus?.45:1});
      if(mode!=='uct'&&(k===0||k===7))R.box([x+.34,0,1.3],[.1,.04+T.run.P[a]*2.2,.1],{fill:P.v,a:k===0?e:1,shadow:false,lw:.5})});
    if(k===0&&mode!=='uct')R.label([T.slot[T.legal[0]]-.4,.3,1.3],'prior p',{al:'right',fs:12,c:P.v,dx:-6,grp:'side'});
    // the featured simulation: selection down the path, expansion, evaluation, backup up the path
    const pts=[[0,.35,2.25]].concat(T.path.map(k2=>{const n=T.nodes[k2];return [n.x,(k2===newKey?.12:H(n,c))+.15,n.z]}));
    if(k===2)R.flow(pts,{c:P.acc,r:.07,speed:1.6,n:8});
    if(k===2)R.line(pts,{c:P.acc,w:2.4,a:.8,head:8});
    const nl=T.nodes[newKey],tr=T.tr,L=tr.path.length,vO=L%2===0?tr.v:-tr.v,who=v=>v>0?'O wins':v<0?'X wins':'draw';
    if(k===4){if(mode==='uct'){const m=Math.max(1,tr.roll.length),end=[nl.x,.05,nl.z-.5*m-.2];
        R.line([[nl.x,.05,nl.z],end],{c:P.mute,w:1.6,dash:[4,4]});R.flow([[nl.x,.12,nl.z],[end[0],.12,end[2]]],{c:P.mute,r:.05,n:5,speed:1.2});
        R.box(end,[.22,.06,.22],{fill:vO>0?P.good:vO<0?P.bad:P.mute,shadow:false});R.label(end,'random playout, '+tr.roll.length+' moves: '+who(vO),{fs:12.5,b:1,dy:14})}
      else R.label([nl.x,.2,nl.z],tr.kind==='terminal'?'game over: '+who(vO)+' (exact)':'network v = '+RD.n(vO,2)+' for O, no rollout',{fs:12.5,b:1,c:P.acc,dy:-14})}
    if(k===5){const back=pts.slice().reverse();R.flow(back,{c:vO>=0?P.good:P.bad,r:.075,speed:1.4,n:9});
      R.label(pts[1],'result '+RD.n(vO,2)+' for O, +1 visit on every edge',{fs:12.5,b:1,c:vO>=0?P.good:P.bad,dy:-26})}
    if(k===7){const tot=SIMS;T.legal.forEach(a=>{const n=T.nodes[String(a)];if(!n)return;R.label([n.x,H(n,SIMS),n.z],'π '+Math.round(100*n.vis[SIMS]/tot)+'%'+(mode!=='uct'?' · p '+Math.round(100*T.run.P[a])+'%':''),{mono:true,fs:12,b:a===BLOCK,c:a===BLOCK?P.acc:P.ink,dy:-26})})}
    R.label([4.6,0,-3.7],'simulations done: '+c+' of '+SIMS,{al:'right',mono:true,fs:12,c:P.mute,dy:8})
  }
  function near(){const ns=T.path.map(k=>T.nodes[k]);let x0=Math.min(0,...ns.map(n=>n.x))-1.2,x1=Math.max(0,...ns.map(n=>n.x))+1.2,z0=Math.min(...ns.map(n=>n.z))-1.2;
    if(mode==='uct')z0-=.5*Math.max(1,T.tr.roll.length);return [[x0,0,z0],[x1,1.2,3.3]]}
  const full={cam:[.18,.78],bounds:[[-4.6,0,-3.8],[4.6,1.6,3.3]]};
  const st=S3.stage({id:'stg-mc',list:'sx-mc',fig:'Fig. 3 · MCTS on one position, 30 simulations',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1700,hold:4400,draw,
    view:k=>{if(!T)build();return k>=2&&k<=5?{cam:[.3,.72],bounds:near()}:k===7?{cam:[.12,.5],bounds:[[-4.6,0,.6],[4.6,1.7,3.3]]}:full}});
  const M=document.getElementById('rd-mcM');
  M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;T=null;build();st.list('sx-mc')});
  // reproduction line (the counts the prose quotes, computed live)
  const pu=MB.puct(net('60'),SHOW,SIMS),p0=MB.puct(net('0'),SHOW,SIMS),uc=MB.uct(SHOW,SIMS,MB.rng(4242));
  document.getElementById('rd-mcR').innerHTML='<b>Computed live, checked against Python.</b> Root visit counts after 30 simulations (cells 2, 3, 6, 7, 8, 9): UCT '+[1,2,5,6,7,8].map(a=>uc.N[a]).join(', ')+'; PUCT with the untrained network '+[1,2,5,6,7,8].map(a=>p0.N[a]).join(', ')+'; PUCT with the trained network '+[1,2,5,6,7,8].map(a=>pu.N[a]).join(', ')+'. src/recompute.py runs the same searches in Python and gets the same counts, and the 40-seed UCT percentages in the text.';
})();
