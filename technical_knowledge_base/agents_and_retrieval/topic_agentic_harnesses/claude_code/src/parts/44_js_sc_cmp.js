// ---- Scene: Fig. 5, what survives a compaction (section 9, renderer v2). The window as a stack of what fills it, bottom up in the order it
// loads; then the documented compaction: older tool outputs cleared first, older turns summarised, the project-root CLAUDE.md and up to five
// recently modified files re-read from disk, the latest skill bodies re-attached, recent messages kept. Sizes are illustrative (labelled);
// the parts and the rules are the documentation's. Steps (ol#sx-cmp): the parts, filling, clearing, summary, re-read, re-attached. ----
(function(){
  if(!document.getElementById('stg-cmp'))return;const {mix,lerp}=S3;
  const NP=5,XS=0,XD=-2.7,WD=[1.5,1.0];
  // each slab: id, base height, colour key, label; heights then follow the step
  const S=[['sys',.34,'mute','system prompt + tools'],['md',.12,'c4','project-root CLAUDE.md'],['list',.1,'c4','skill listing, MCP names'],['nest',.1,'c4','nested CLAUDE.md, path rules'],['skill',.14,'c6','invoked skill bodies']];
  for(let j=0;j<NP;j++){S.push(['t'+j,.07,'c1','older turns']);S.push(['o'+j,.24,'c2','tool outputs'])}
  S.push(['sum',.16,'c5','summary of the older turns'],['files',.2,'c2','re-read files (up to 5)'],['rec',.17,'c1','recent messages, verbatim']);
  function hOf(id,h0,k,e){
    if(id==='sum')return k<3?0:k===3?h0*e:h0;
    if(id==='files')return k<4?0:k===4?h0*e:h0;
    const m=/^([to])(\d)$/.exec(id);if(m){const j=+m[2],vis=k===0?(j<2?1:0):k===1?(j<2?1:Math.max(0,Math.min(1,e*3-(j-2)))):1;
      if(m[1]==='o')return k<2?h0*vis:k===2?h0*(1-e):0;
      return k<3?h0*vis:k===3?h0*(1-e):0}
    return h0}
  function aOf(id,k,e){
    if(id==='nest')return k<3?1:k===3?1-.85*e:.15;
    if(id==='md')return k===3?.35:k===4?.35+.65*e:1;
    if(id==='skill')return k===3||k===4?.35:k===5?.35+.65*e:1;
    return 1}
  const LIM=2.75;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-3.8,2.2,-1.2,1.2,.5);
    // the window's limit: a glass ceiling over the stack
    R.glass([XS-.85,LIM,-.6],[1.7,0,0],[0,0,1.2],{c:P.bad,a:k===1?1:.35,nu:4,nv:3});
    R.label([XS-.85,LIM,-.6],nar?'limit':'limit · about 967K of 1M',{fs:12.5,b:k===1,c:P.bad,al:'right',dx:-8,a:k===1?1:.6});
    // the disk the harness re-reads from
    const da=k>=4?1:.35;R.box([XD,0,0],[1.3,.08,1.2],{fill:mix(P.paper,P.soft,.5),a:da});
    [['CLAUDE.md',-.35,'c4'],['skills/',.0,'c6'],['modified files',.35,'c2']].forEach(([t,z,c],i)=>{R.box([XD+(i-1)*.38,.08,z],[.3,.3,.3],{fill:mix(P.paper,P[c],.4),a:da});});
    R.label([XD,0,.6],'on disk',{fs:13,b:1,c:P.ink,dy:18,a:Math.max(.5,da)});
    // the stack
    let y=0;const tops={};
    S.forEach(([id,h0,c,t])=>{const h=hOf(id,h0,k,e),a=aOf(id,k,e);if(h<.004){tops[id]=[y,y];return}
      R.box([XS,y,0],[WD[0],h,WD[1]],{fill:mix(P.paper,P[c],id==='nest'&&k>=3?.08:.45),a,lw:.7,shadow:id==='sys'});tops[id]=[y,y+h];y+=h});
    const mid=id=>{const v=tops[id];return v?[XS+WD[0]/2,(v[0]+v[1])/2,0]:null};
    // labels for what this step is about (all of them on the first step)
    const L={0:['sys','md','list','nest','skill','o1'],1:['o4'],2:['t3'],3:['sum','nest'],4:['md','files'],5:['skill','rec']}[k]||[];
    if(!nar)L.forEach(id=>{const p=mid(id),row=S.find(s=>s[0]===id);if(!p||(tops[id][1]-tops[id][0])<.004&&id!=='nest')return;
      let t=row[3];if(id==='o1'||id==='o4')t='conversation and tool results';if(id==='t3')t='turns kept; tool outputs cleared';if(id==='nest'&&k>=3)t='nested files: gone until read';
      R.label(p,t,{fs:12.5,al:'left',dx:10,c:mix(P.ink,P[row[2]],.35),b:1,grp:'cmp'})});
    // flows: the request at the start; tool outputs leaving; files coming back from disk
    if(k===0)R.flow([[XS,.2,-.5],[XS,y,-.5]],{c:P.c4,r:.05,n:8,speed:.9,a:.7});
    if(k===2){[0,1,2,3,4].forEach(j=>{const p=tops['o'+j];if(p)R.flow([[XS-.75,(p[0]+p[1])/2,0],[XS-1.6,(p[0]+p[1])/2+.4,.2]],{c:P.c2,r:.06,n:4,speed:1.1,a:1-e})})}
    if(k===4){R.flowArc([XD-.38,.38,-.35],mid('md'),.8,{c:P.c4,r:.065,n:8,speed:1.3,a:1});R.flowArc([XD+.38,.38,.35],mid('files'),1.0,{c:P.c2,r:.065,n:8,speed:1.3,a:e})}
    if(k===5){R.flowArc([XD,.38,0],mid('skill'),.8,{c:P.c6,r:.065,n:8,speed:1.3,a:1});const r=mid('rec');if(r)R.glow(r,.28,{c:P.c1})}
  }
  const full={cam:[.4,.42],bounds:[[-3.4,0,-.7],[.8,2.9,.7]]};
  S3.stage({id:'stg-cmp',list:'sx-cmp',fig:'Fig. 5 · a compaction, illustrative sizes',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:4600,draw,
    view:k=>k===4||k===5?{cam:[.55,.38],bounds:[[-3.5,0,-.7],[.8,1.9,.7]]}:full,
    margin:w=>w<520?[16,10,14,10]:[20,230,16,16]});
})();
