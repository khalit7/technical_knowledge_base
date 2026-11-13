// ---- Scene, Fig. 7 (section 7): the three tables, drawn from the page's descriptor model FDSIM (renderer v2) ----
// Per process (under each process on the plate) its fd table; system-wide the open file descriptions (offset, refs); at the back the objects
// (the terminal, a file's inode, a pipe). Every frame is an FDSIM state of a script in FDSCRIPTS (tables, leak, cloexec), grouped into explained steps;
// the leak and fix timings are the measured run (PD.cloexec, src/runs/c/cloexec.c). Things that appear fade in, things that go fade out.
(function(){
  if(!document.getElementById('stg-fd')||!window.FDSIM||!window.PD)return;const {mix,cl,lerp}=S3;
  const MODES={tables:{s:'tables',g:[[0,1],[2],[3],[4],[5],[6]]},leak:{s:'leak',g:[[0,1,2],[3,4],[5,6],[7],[8,9],[10,11],[12,13]]},fix:{s:'cloexec',g:[[0,1,2],[3,4],[5,6],[7],[8,9],[10,11]]}};
  const RUN={};Object.keys(MODES).forEach(m=>RUN[m]=FDSIM.run(FDSCRIPTS[MODES[m].s].steps));
  let mode='tables';
  const YU=1.9,ZF=-1.45,ZD=.55,ZO=2.35;
  // positions of everything in one state, keyed so that a thing keeps its key from state to state
  function lay(s){const L={},live=s.procs.filter(p=>p.alive),np=live.length,PX=i=>(i-(np-1)/2)*2.8;
    live.forEach((p,i)=>{const x=PX(i),fds=Object.keys(p.fds).map(Number).sort((a,b)=>a-b),m=fds.length;
      L['p'+p.pid]={kind:'p',x,y:YU,z:ZF,p};
      fds.forEach((f,j)=>{L['f'+p.pid+':'+f]={kind:'f',x:x+(j-(m-1)/2)*.47,y:0,z:ZF,f,e:p.fds[f],pid:p.pid}})});
    const ds=Object.keys(s.desc),os=Object.keys(s.objs);
    ds.forEach((d,i)=>{L['d'+d]={kind:'d',x:(i-(ds.length-1)/2)*1.75,y:0,z:ZD,D:s.desc[d],id:d}});
    os.forEach((o,i)=>{L['o'+o]={kind:'o',x:(i-(os.length-1)/2)*2.2,y:0,z:ZO,O:s.objs[o],id:o}});
    // references, for the counts
    Object.values(L).forEach(n=>{if(n.kind==='d')n.refs=Object.values(L).filter(f=>f.kind==='f'&&f.e.d===n.id).length});
    return L}
  function draw(R,k,e,st){const P=R.P,nar=R.W<520,M=MODES[mode],S=RUN[mode],g=M.g,cur=S[g[k][g[k].length-1]],prev=k>0?S[g[k-1][g[k-1].length-1]]:null;
    R.grid(-5.6,5.6,-2,2.6,.5);
    R.quad([[-4.2,0,-2.0],[4.2,0,-2.0],[4.2,0,3.0],[-4.2,0,3.0]],{fill:P.paper,edge:true,ea:.35,dz:200});
    R.glass([-4.2,YU,-2.0],[8.4,0,0],[0,0,1.1],{c:P.c1,nu:12,nv:2,a:.32,dz:60,th:.02});
    if(!nar){R.label([-4.2,0,ZF],'fd tables',{al:'right',dx:-4,fs:12.5,b:1,c:P.c5,grp:'row'});R.label([-4.2,0,ZD],'open file descriptions',{al:'right',dx:-4,fs:12.5,b:1,c:P.c5,grp:'row'});
      R.label([-4.2,0,ZO],'objects',{al:'right',dx:-4,fs:12.5,b:1,c:P.c5,grp:'row'})}
    const A=lay(cur),B=prev?lay(prev):{},keys=[...new Set(Object.keys(B).concat(Object.keys(A)))];
    const pos=key=>{const a=A[key],b=B[key];if(a&&b)return [lerp(b.x,a.x,e),a.y,a.z];const n=a||b;return [n.x,n.y,n.z]};
    const alpha=key=>A[key]&&B[key]?1:A[key]?e:1-e;
    const nd=key=>A[key]||B[key];
    keys.forEach(key=>{const n=nd(key),a=alpha(key),p=pos(key);if(a<=.01)return;
      if(n.kind==='p'){R.box(p,[1.7,.36,.8],{fill:mix(P.paper,P.c1,.22),a});R.label([p[0],YU+.36,p[2]],n.p.name+' · '+n.p.pid+(n.p.state==='S'?' (blocked)':''),{fs:12.5,b:1,dy:-10,a,c:n.p.state==='S'?P.bad:P.ink})}
      if(n.kind==='f'){const cx=n.e.cx;R.box(p,[.38,.26,.46],{fill:cx?mix(P.paper,P.bad,.3):mix(P.paper,P.c5,.3),a,shadow:false,lw:.6});
        R.label([p[0],.24,p[2]],String(n.f),{fs:12.5,b:1,mono:true,dy:-9,a});
        // the table hangs under its process
        const d=A['d'+n.e.d]||B['d'+n.e.d];if(d){const dp=pos('d'+n.e.d);R.line([[p[0],.12,p[2]+.21],[dp[0],.15,dp[2]-.3]],{c:cx?P.bad:P.c5,w:1.1,a:a*.7})}}
      if(n.kind==='d'){const D=n.D,O=(A['o'+D.obj]||B['o'+D.obj]),isPipe=O&&O.O.kind==='pipe',lab=isPipe?(D.mode==='w'?(nar?'w':'write end'):(nar?'r':'read end')):O&&O.O.kind==='tty'?'tty':'offset '+D.off;
        R.box(p,[1.4,.32,.62],{fill:isPipe&&D.mode==='w'?mix(P.paper,P.c2,.3):mix(P.paper,P.c4,.18),a});
        R.label([p[0],.3,p[2]],lab,{fs:12.5,mono:true,b:1,dy:-10,a,c:!isPipe&&O&&O.O.kind==='file'?P.c4:P.ink});
        if(!nar)R.label([p[0],0,p[2]+.3],'refs '+n.refs,{fs:12,mono:true,dy:11,a,c:P.mute});
        if(O){const op=pos('o'+D.obj);R.line([[p[0],.15,p[2]+.3],[op[0],.2,op[2]-.35]],{c:P.mute,w:1,a:a*.6})}}
      if(n.kind==='o'){const O=n.O,c=O.kind==='pipe'?P.c6:O.kind==='file'?P.c3:P.mute;
        R.box(p,[1.5,.4,.7],{fill:mix(P.paper,c,.3),a});
        R.label([p[0],.4,p[2]],O.kind==='file'?O.name+' (inode)':O.kind==='pipe'?O.name+(O.data?': '+O.data.replace(/\n/g,'\\n'):': empty'):'terminal',{fs:12.5,b:1,dy:-10,a,mono:O.kind!=='tty'})}});
    // what moves at this step: a write or a read through the tables, a fork copying the table
    const op=cur.op.split(' ')[0],pid=+cur.op.split(' ')[1];
    if((op==='write'||op==='read')&&!/blocks/.test(cur.res)){const fd=+cur.op.split(' ')[2],F=A['f'+pid+':'+fd];if(F){const D=A['d'+F.e.d],O=A['o'+D.D.obj],pts=[[A['p'+pid].x,YU,ZF],[F.x,.3,F.z],[D.x,.35,D.z],[O.x,.45,O.z]];
      R.flow(op==='write'?pts:pts.slice().reverse(),{c:P.c6,r:.07,n:9,a:e})}}
    if(op==='fork'){const c=+cur.op.split(' ')[2];if(A['p'+pid]&&A['p'+c])R.flowArc([A['p'+pid].x,0.3,ZF],[A['p'+c].x,.3,ZF],.7,{c:P.c2,r:.065,n:8,a:e})}
    if(op==='read'&&/blocks/.test(cur.res)&&A['p'+pid])R.label([A['p'+pid].x,YU+.36,ZF],'read() blocks: a write end is still open',{fs:12.5,b:1,dy:-30,c:P.bad,a:e,wide:1});
    if(/end of file/.test(cur.res)&&A['p'+pid])R.label([A['p'+pid].x,YU+.36,ZF],'read() = 0: end of file',{fs:12.5,b:1,dy:-30,c:P.c3,a:e});
  }
  const st=S3.stage({id:'stg-fd',list:'sx-fd-tables',fig:'Fig. 7 · per-process tables, shared descriptions, objects',cam:[.05,.82],bounds:[[-4.2,0,-2.0],[4.2,YU+.15,3.0]],aspect:.7,dur:1300,hold:5000,draw,
    margin:w=>w<520?[16,8,20,8]:[20,14,22,150]});
  RD.seg(document.getElementById('rd-fdx-mode'),m=>{mode=m;Object.keys(MODES).forEach(x=>{document.getElementById('sx-fd-'+x).hidden=x!==m});st.list('sx-fd-'+m)});
})();
