// ---- Scene, Fig. 5 (section 7): the same 8 checked tokens as a chain and as a tree, verified in one pass (renderer v2) ----
// Real models at temperature 0 (SD.D.tree, measured here): draft Qwen3-0.6B, target Qwen3-1.7B, both 4-bit MLX, greedy. The chain is the draft's
// 8 best next guesses; the tree keeps the 8 nodes with the highest cumulative draft probability (4 children of the 4 best nodes per depth, capped at
// depth 6). Accepted = the longest root path equal to the target's own greedy continuation. The last step's bars are the page's means over 171
// positions (facts treeChain4 to treeTree32). src/check_stages.mjs checks the step list against window.SD_STG.tree.
(function(){
  if(!document.getElementById('stg-tree')||!window.SD||!window.S3||!SD.D.tree)return;const {at,off,lerp,mix}=S3;
  const T=SD.D.tree,EX=T.examples,F=SD.D.facts;let ei=Math.min(2,EX.length-1);
  const match=(path,g)=>{let m=0;while(m<path.length&&path[m]===g[m])m++;return m};
  function prep(){const e=EX[ei],nodes=e.tree8.map((n,i)=>({i,path:n.path,cp:n.cp,d:n.path.length}));
    const byD={};nodes.forEach(n=>(byD[n.d]=byD[n.d]||[]).push(n));Object.values(byD).forEach(a=>a.sort((x,y)=>y.cp-x.cp).forEach((n,j)=>n.j=j));
    const key=p=>p.join('\u0001'),idx=new Map(nodes.map(n=>[key(n.path),n]));nodes.forEach(n=>n.par=n.d>1?idx.get(key(n.path.slice(0,-1))):null);
    nodes.forEach(n=>n.ok=match(n.path,e.g)===n.d);const best=nodes.reduce((m,n)=>n.ok?Math.max(m,n.d):m,0);
    const anc=(a,b)=>b.d<=a.d&&key(a.path.slice(0,b.d))===key(b.path);           // b is a (or an ancestor of a)
    return {e,nodes,best,mc:Math.min(8,e.match_chain),anc,maxj:Math.max(...nodes.map(n=>n.j))}}
  let S=prep();
  const means=[['chain 4',+F.treeChain4],['chain 8',+F.treeChain8],['tree 8',+F.treeTree8],['tree 16',+F.treeTree16],['tree 32',+F.treeTree32]];
  const pub=()=>{window.SD_STG=window.SD_STG||{};window.SD_STG.tree={ei,best:S.best,mc:S.mc,means,npos:+F.treeNpos,tree8:S.e.match_tree8}};pub();
  const vis=t=>SD.vis(t).slice(0,9),XC=-4.7,x=d=>-3.55+(d-1)*.98,ZC=2.1,zt=j=>.7-j*1.0,MX=4.45,MZ=-2.5,MC=.24;
  function tile(R,p,t,fill,a,lc,show){R.box(p,[.86,.12,.48],{fill,a});if(show!==false||R.W>=520)R.label([p[0],.12,p[2]+.24],t,{mono:true,fs:12,b:1,dy:13,c:lc||R.P.ink,a})}   // on a phone (canvas under 520 px) only the row the step is about is labelled
  function draw(R,k,e){const P=R.P,or=P.c2,gr=P.good,blue=P.acc,fadeAll=k===5?Math.max(.12,1-e):1;R.grid(-5.6,6.6,-3.6,2.6,.5);
    R.box([XC,0,ZC],[1.1,.12,.48],{fill:mix(P.paper,P.mute,.2),a:fadeAll});R.box([XC,0,zt(0)],[1.1,.12,.48],{fill:mix(P.paper,P.mute,.2),a:fadeAll});
    R.label([XC,.12,ZC+.24],'…'+SD.vis(S.e.context).slice(-10),{mono:true,fs:12,dy:13,c:P.mute,a:fadeAll,wide:1});
    R.label([XC-.55,.12,ZC],'chain',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:or,a:fadeAll,wide:1});R.label([XC-.55,.12,zt(0)],'tree',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.c4,a:fadeAll,wide:1});
    // 1. the budget: 8 tokens checked per pass, either 8 deep or spread over branches
    if(k===0)for(let d=1;d<=8;d++)R.quad([[x(d)-.43,.005,ZC-.24],[x(d)+.43,.005,ZC-.24],[x(d)+.43,.005,ZC+.24],[x(d)-.43,.005,ZC+.24]],{ec:P.mute,dash:[4,3],a:.7});
    // 2. the chain: the draft's single best continuation, 8 deep
    if(k>=1&&k<5||k===5&&e<.9){const n=k===1?Math.ceil(e*8):8;
      for(let d=1;d<=n;d++){const ok=k>=4&&d<=S.mc,bad=k>=4&&d>S.mc;tile(R,[x(d),0,ZC],vis(S.e.chain[d-1]),ok?mix(P.paper,gr,.45):mix(P.paper,or,bad?.12:.35),(bad?.35:1)*fadeAll,ok?gr:or,k===1||ok)}
      if(k===1&&n<8)R.flowArc([x(Math.max(1,n))-.2,.15,ZC],[x(n+1),.15,ZC],.3,{c:or,r:.06,n:4,speed:1.3})}
    // 3. the tree: 8 nodes where the draft's cumulative probability is highest
    if(k>=2&&k<5||k===5&&e<.9){const dShow=k===2?Math.ceil(e*6):9;
      S.nodes.forEach(n=>{if(n.d>dShow)return;const p=[x(n.d),0,zt(n.j)],pp=n.par?[x(n.par.d),.06,zt(n.par.j)]:[XC,.06,zt(0)];
        const ok=k>=4&&n.ok,bad=k>=4&&!n.ok;R.line([[pp[0]+.43,.06,pp[2]],[p[0]-.43,.06,p[2]]],{c:ok?gr:P.mute,w:ok?2.4:1.2,a:(bad?.4:.9)*fadeAll});
        tile(R,p,vis(n.path[n.d-1]),ok?mix(P.paper,gr,.45):mix(P.paper,P.c4,bad?.1:.3),(bad?.35:1)*fadeAll,ok?gr:P.c4,k===2||ok);
        if(k===2&&n.d<=2)R.label([p[0],.12,p[2]+.24],'cp '+n.cp.toFixed(2),{mono:true,fs:12,dy:28,c:P.c4,a:e})})}
    // 4. one verification pass with a tree attention mask: node i sees node j only if j is i or one of its ancestors
    if(k===3||k===4){const a=k===3?Math.min(1,e*1.4):.35,N=S.nodes.length;
      R.glass([MX-.1,0,MZ-.1],[N*MC+.2,0,0],[0,0,N*MC+.2],{c:blue,a:a*.6,nu:N,nv:N,th:.02});
      S.nodes.forEach((ni,i)=>S.nodes.forEach((nj,j)=>{if(S.anc(ni,nj))R.box([MX+j*MC+MC/2,0,MZ+i*MC+MC/2],[MC*.8,.08+.1*(i===j),MC*.8],{fill:blue,a,shadow:false})}));
      R.label([MX+N*MC/2,0,MZ+N*MC+.1],'tree attention mask',{mono:true,fs:12.5,b:1,dy:16,c:blue,a,wide:1});
      if(k===3)S.nodes.forEach(n=>R.flowArc([MX+n.i*MC+MC/2,.1,MZ+n.i*MC],[x(n.d),.15,zt(n.j)],.6,{c:blue,r:.05,n:4,speed:1.3,a:.7}))}
    // 5. verify: the target keeps the longest root path equal to its own continuation, then adds its own token
    if(k===4){R.label([x(8),.12,ZC],'chain: '+S.mc+' kept',{al:'left',dx:36,fs:13,b:1,c:S.mc?gr:P.bad,a:e});
      R.label([x(6),.12,zt(0)],'tree: '+S.best+' kept',{al:'left',dx:36,fs:13,b:1,c:S.best?gr:P.bad,a:e})}
    // 6. over all 171 positions: mean tokens accepted per pass
    if(k===5){means.forEach(([nm,v],i)=>{const bx=-2.4+i*1.25,h=v*.42*Math.min(1,e*1.4);R.box([bx,0,.2],[.75,h,.6],{fill:mix(P.paper,nm.startsWith('chain')?or:P.c4,.5)});
      R.label([bx,h,.2],v.toFixed(2),{mono:true,fs:13,b:1,dy:-11,c:P.ink,a:e});R.label([bx,0,.5],nm,{mono:true,fs:12.5,dy:16,c:nm.startsWith('chain')?or:P.c4,a:e})})}
  }
  const full={cam:[.22,.88],bounds:[[-5.9,0,-2.6],[4.0,.6,2.5]]};
  const st=S3.stage({id:'stg-tree',list:'sx-tree',fig:'Fig. 5 · chain against tree, real models, greedy',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,10,24,10]:[18,16,28,16],
    view:k=>k===3?{cam:[.22,.9],bounds:[[-5.9,0,-2.8],[6.6,.6,2.5]]}:k===4?{cam:[.22,.88],bounds:[[-5.9,0,-2.6],[5.4,.6,2.5]]}:k===5?{cam:[.2,.45],bounds:[[-3.2,0,-.2],[3.4,1.9,1.0]]}:full,
    onStep:()=>{try{readout()}catch(err){}}});
  function readout(){const o=document.getElementById('tree-out');if(!o)return;
    o.innerHTML='Example '+(ei+1)+' ('+SD.esc(S.e.prompt)+'): after “…'+SD.esc(SD.vis(S.e.context).slice(-28))+'” the target writes “'+SD.esc(SD.vis(S.e.g.slice(0,5).join('')))+'…”; the chain keeps '+S.mc+', the tree '+S.best+'.'}
  const C=document.getElementById('tree-ex');
  if(C){C.innerHTML=EX.map((x,i)=>'<button data-i="'+i+'"'+(i===ei?' class="on"':'')+'>Example '+(i+1)+' ('+SD.esc(x.prompt)+')</button>').join('');
    C.querySelectorAll('button').forEach(b=>b.onclick=()=>{ei=+b.dataset.i;C.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));S=prep();pub();readout();if(st)st.draw()})}
  readout();
})();
