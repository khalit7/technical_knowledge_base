// ---- Scene: layer 0 of the real graph of one token (CL.trace.layer0, from llama-eval-callback), built node by node, then run (renderer v2) ----
// Nodes, operations, shapes and edges come from the printout: an edge joins a node to the latest earlier node of the name it lists as a source.
// Weight matrices are glass plates sized by their shapes; the two cache tensors are glass plates too. Positions are a layout, not data.
(function(){
  if(!document.getElementById('stg-graph')||!window.S3||!window.CLX||!CLX.CL.trace)return;const {at,mix,cl,lerp}=S3;
  const T=CLX.CL.trace.layer0,n=T.length;
  const EMPTY={VIEW:1,RESHAPE:1,PERMUTE:1};
  // layout: column (execution order, compressed) and lane (Q at the back, K in the middle, V at the front)
  const POS=[[0,0],[1,0],[2,-1.3],[3,-1.3],[4,-1.3],[2,1.3],[3,1.3],[2,0],[3,0],[4,0],[5,0],[6,0],[5,1.3],[6,1.3],[5,-1.3],[6,-1.3],
    [8,0],[9,0],[8,1.3],[9,1.3],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0],[16,-.75],[16,.75],[17,0],[18,0],[19,0]];
  const GROUPS=[[0,1],[2,3,4,5,6,7,8,9],[10,11,12,13],[14,15,16,17,18,19],[20,21,22,23],[24,25,26,27,28,29,30]];
  const X=c=>(c-9)*.6,at3=i=>[X(POS[i][0]),0,POS[i][1]];
  const step=i=>GROUPS.findIndex(g=>g.includes(i));
  // edges from the printout's source names
  const E=[],PL=[],CACHE={cache_k_l0:[X(7),0,0],cache_v_l0:[X(7),0,1.3]};let EMBD=[X(-1.2),0,0];
  T.forEach((r,i)=>r[3].forEach(([s,sh])=>{let j=-1;for(let q=i-1;q>=0;q--)if(T[q][0]===s){j=q;break}
    if(j>=0)E.push({a:j,b:i});
    else if(s==='embd')E.push({a:'embd',b:i});
    else if(CACHE[s])E.push({a:s,b:i});
    else if(r[2]==='MUL_MAT'&&s.startsWith('blk.'))PL.push({i,name:s.replace('blk.0.','').replace('.weight',''),ne:sh})}));
  // FLASH_ATTN_EXT also reads V (the printout lists only its first two sources)
  {const fa=T.findIndex(r=>r[2]==='FLASH_ATTN_EXT'),vp=T.findIndex(r=>r[0]==='cache_v_l0 (view) (permuted)');if(fa>=0&&vp>=0&&!E.some(e=>e.a===vp&&e.b===fa))E.push({a:vp,b:fa})}
  // SET_ROWS writes into the cache plate
  T.forEach((r,i)=>{if(r[2]==='SET_ROWS')E.push({a:i,b:r[0].startsWith('cache_k')?'cache_k_l0':'cache_v_l0',w:1})});
  const pt=x=>typeof x==='number'?at3(x):x==='embd'?EMBD:CACHE[x];
  const colOf=i=>{const r=T[i];return r[2]==='MUL_MAT'?'acc':r[2]==='FLASH_ATTN_EXT'?'c4':r[2]==='SET_ROWS'?'c6':r[2]==='ROPE'?'c2':null};
  function draw(R,k,e){const P=R.P;R.grid(-6.8,6.8,-2.6,2.6,.5);
    const run=k===7,built=k>=6,prog=run?e*n:-1;
    const aN=i=>{const s=step(i);return built?1:s===k?1:s<k?.32:.09};
    // the input vector and the two cache plates
    {const a=k===0||built?1:.35;R.box([EMBD[0],0,0],[.18,.6,.18],{fill:mix(P.paper,P.c1,.5),a});R.label([EMBD[0],.6,0],'embd · 576',{mono:true,fs:12,dy:-10,a:k===0||k===7?1:.0,c:P.c1})}
    [['cache_k_l0',P.k],['cache_v_l0',P.v]].forEach(([nm,c])=>{const p=CACHE[nm],a=k===2||k===3||built?1:k>3?.35:.12;
      R.glass([p[0],.04,p[2]-.38],[0,0,.76],[0,1.0,0],{c,a,nu:4,nv:6});if(k===2||k===3)R.label([p[0],1.04,p[2]],nm,{mono:true,fs:12,dy:-10,c,b:1,a:e,wide:1})});
    // weight plates above their products
    PL.forEach(w=>{const p=at3(w.i),s=step(w.i),a=built?.85:s===k?1:s<k?.3:.1,wd=w.ne[0]/576*.42,ht=w.ne[1]/576*.42;
      R.glass([p[0]-wd/2,.55,p[2]],[wd,0,0],[0,ht,0],{c:P.acc,a,nu:4,nv:Math.max(2,Math.round(ht/.1))});
      if(s===k&&k<6){R.label([p[0],.55+ht,p[2]],w.name+' {'+w.ne[0]+', '+w.ne[1]+'}',{mono:true,fs:12,dy:-10,c:P.acc,a:e,wide:1});
        R.flow([[p[0],.55,p[2]],[p[0],.32,p[2]]],{c:P.acc,a:e,r:.05,n:3,speed:.8})}});
    // edges
    E.forEach(ed=>{const a=pt(ed.a),b=pt(ed.b),sb=typeof ed.b==='number'?step(ed.b):step(ed.a),vis=built?.5:sb===k?1:sb<k?.25:0;if(vis<=0)return;
      const p0=[a[0],.16,a[2]],p1=[b[0],.16,b[2]],long=Math.abs(p1[0]-p0[0])>1.3;
      R.arc(p0,p1,long?.45:.06,{c:P.mute,w:1.1,a:vis*(sb===k&&!built?Math.min(1,e*2):1)*.8});
      if(!built&&sb===k)R.flowArc(p0,p1,long?.45:.06,{c:P.c1,a:e*.9,r:.045,n:3,speed:.9})});
    // nodes: real operations solid, views dashed outlines
    T.forEach((r,i)=>{const p=at3(i),a=aN(i),emp=EMPTY[r[2]],c=colOf(i),done=run&&i<prog,now=run&&i<prog&&i>=prog-1;
      if(emp){R.quad([[p[0]-.17,.01,p[2]-.17],[p[0]+.17,.01,p[2]-.17],[p[0]+.17,.01,p[2]+.17],[p[0]-.17,.01,p[2]+.17]],{fill:false,ec:P.mute,dash:[4,3],lw:1.3,a});
        R.box(p,[.3,.26,.3],{fill:P.paper,a:a*.25,fa:.35,ea:.5,shadow:false})}
      else R.box(p,[.34,.3,.34],{fill:done?mix(P.paper,c?P[c]:P.c1,.7):c?mix(P.paper,P[c],.45):P.paper,a});
      if(now&&!emp)R.glow([p[0],.35,p[2]],.4,{c:P.acc});
      const lab=r[2]+(r[2]==='MUL_MAT'?'':'');
      if(!built&&step(i)===k)R.label([p[0],emp?.27:.31,p[2]],lab,{mono:true,fs:12,dy:-10,c:emp?P.mute:P.ink,b:!emp,a:e,grp:'n'+Math.round(p[2]*10)})});
    // running: data moves along every edge into the node being computed
    if(run){E.forEach(ed=>{if(typeof ed.b!=='number')return;if(ed.b<prog&&ed.b>=prog-3){const a=pt(ed.a),b=pt(ed.b),long=Math.abs(b[0]-a[0])>1.3;R.flowArc([a[0],.16,a[2]],[b[0],.16,b[2]],long?.45:.06,{c:P.acc,r:.06,n:4,speed:1.6})}});
      const i=Math.min(n-1,Math.floor(prog)),p=at3(i);R.label([p[0],.3,p[2]],T[i][2]+(EMPTY[T[i][2]]?' · skipped':''),{mono:true,fs:12.5,b:1,dy:-14,c:EMPTY[T[i][2]]?P.mute:P.acc})}
    if(k===6)R.label([X(9),0,-1.9],'31 nodes · 7 products · nothing computed yet',{mono:true,fs:12.5,b:1,c:P.mute,a:e,wide:1});
  }
  const xs=g=>g.map(i=>X(POS[i][0]));
  const full={cam:[.3,.62],bounds:[[-6.4,0,-1.7],[6.3,1.2,1.7]]};
  S3.stage({id:'stg-graph',list:'sx-graph',fig:'Fig. 2 · layer 0 of the real graph',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4600,draw,
    // each building step moves in on its nodes; the last two show the whole layer
    view:k=>{if(k>=6)return document.getElementById('stg-graph').clientWidth<520?{cam:[1.0,.7],bounds:full.bounds}:full; // a phone: the long graph turned into depth so it fills the tall card
      const g=GROUPS[k],lo=Math.min(...xs(g))-(k===0?1.2:.8),hi=Math.max(...xs(g))+(k===2||k===3?.9:.6);return {cam:[.42,.58],bounds:[[lo,0,-1.7],[hi,1.1,1.7]]}},
    margin:w=>w<520?[16,10,16,10]:[20,18,18,18]});
})();
