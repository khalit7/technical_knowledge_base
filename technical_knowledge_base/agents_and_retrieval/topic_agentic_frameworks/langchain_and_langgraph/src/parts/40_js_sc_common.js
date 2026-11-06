// ---- 3D scenes, shared parts (renderer v2, 2026-11-06): a LangGraph graph laid out on the floor, its nodes, edges, the checkpoint stack ----
// Rows of FLGG.LAYOUT run from left to right along x; nodes of one row stand side by side in depth (z), so parallel tasks sit one behind the other.
// Colours: amber (P.c5) for a triggered or running node, green (P.c3) for writes and state, the page's accent for checkpoints, purple (P.c4) for model calls, P.bad for a kill or an error.
window.FLG3=(function(){
  const {mix}=S3;
  // pos[node] = [x, z]; rows: FLGG.LAYOUT[name]
  // START and END (always the first and last row) sit just outside [x0, x1]; the rows between share it evenly
  function layout(rows,x0,x1,zc,dz){const pos={},n=rows.length,m=n-2;
    rows.forEach((r,i)=>{const x=i===0?x0-1.1:i===n-1?x1+1.1:m>1?x0+(x1-x0)*(i-1)/(m-1):(x0+x1)/2;r.forEach((nd,j)=>{if(!nd)return;pos[nd]=[x,r.length>1?zc+dz*(j-(r.length-1)/2):zc]})});return pos}
  const isSE=nd=>nd==='__start__'||nd==='__end__';
  // a node: st 'idle'|'next'|'run'|'done'|'err'|'lost'; copies: parallel tasks of one node (Send) drawn one behind the other
  function node(R,p,name,o){const P=R.P,st=o.st||'idle',a=o.a==null?1:o.a,W=o.w||.95,H=.3,D=.5;
    if(isSE(name)){const c=[p[0],.14,p[1]];R.ball(c,.13,{c:name==='__start__'?P.c5:st==='done'?P.good:P.mute,a:Math.max(.5,a)});
      R.label([p[0],.14,p[1]],name==='__start__'?'START':'END',{mono:true,fs:12,b:1,c:P.mute,al:name==='__start__'?'right':'left',dx:name==='__start__'?-12:12,a:Math.max(.55,a)});return}
    const fill=st==='run'?mix(P.paper,P.c5,.75):st==='next'?mix(P.paper,P.c5,.18):st==='done'?mix(P.paper,P.acc,.22):st==='err'?mix(P.paper,P.bad,.7):st==='lost'?mix(P.paper,P.bad,.25):P.paper;
    const n=o.copies||1;for(let c=n-1;c>=0;c--)R.box([p[0],0,p[1]-c*.22],[W,H,D],{fill,a,ec:st==='next'?P.c5:st==='err'||st==='lost'?P.bad:null,lw:st==='next'?2.2:.9});
    if(o.label!==false)R.label([p[0],H,p[1]],o.text||name,{mono:true,fs:12,b:st==='run'||st==='next'||st==='err',c:st==='err'||st==='lost'?P.bad:P.ink,dy:-12,a:Math.max(.45,a)})}
  // an edge on the floor between two nodes; a backward edge (a loop) arcs over the nodes
  function edge(R,a,b,o){o=o||{};const P=R.P,al=o.a==null?.6:o.a,y=.03;if(!a||!b)return;
    if(b[0]>a[0]+.01){const pts=[[a[0]+(isSE(o.s)?.16:.5),y,a[1]],[b[0]-(isSE(o.t)?.18:.52),y,b[1]]];R.line(pts,{c:o.c||P.mute,w:1.4,a:al,dash:o.cond?[5,4]:null,head:6});return pts}
    const pts=[];for(let i=0;i<=24;i++)pts.push(R.arcPt([a[0],.32,a[1]-.25],[b[0],.32,b[1]-.25],.9,i/24));R.line(pts,{c:o.c||P.mute,w:1.4,a:al,dash:[5,4],head:6});return pts}
  // the checkpointer: saved checkpoints as slabs stacked on the floor; the newest drops in with t (0..1)
  function stack(R,c,n,t,o){o=o||{};const P=R.P,h=.12,a=o.a==null?1:o.a;
    for(let i=0;i<n;i++){const last=i===n-1,drop=last&&t<1?(1-t)*.9:0,al=last&&t<1?a*t:a;
      R.box([c[0],i*h+drop,c[2]],[1.3,h*.86,.9],{fill:mix(P.paper,P.acc,last&&o.hiLast?.5:.22),a:al,lw:.8,shadow:i===0})}
    return n*h}
  return {layout,node,edge,stack,isSE};
})();
