// ---- Scene, Fig. 6 (section 7): one jbd2 transaction under ext4's three data modes: memory, the journal as a ring on disk, the home locations (renderer v2) ----
// Order from fs/jbd2/commit.c (the commit block with REQ_PREFLUSH | REQ_FUA, line 157, v5.10) and the ext4 documentation (data=ordered, journal, writeback).
// One transaction: a new file's inode, its directory entry and a bitmap block (metadata), plus the file's 4 data blocks. The step lists sx-jb-* explain each step and what a crash then leaves.
(function(){
  if(!document.getElementById('stg-jb'))return;const {lerp,mix}=S3;
  // per step: mem (m metadata, d data, in memory), jr (journal holds m, d, c commit block), home (m: 0 old, 1 new; d: 0 unwritten, 1 new, -1 stale), fl: flows [from,to,what], flush
  const S={ordered:[
      {mem:'md',jr:'',hm:0,hd:0,fl:[]},
      {mem:'m',jr:'',hm:0,hd:1,fl:[['mem','home','d']]},
      {mem:'m',jr:'m',hm:0,hd:1,fl:[['mem','jr','m']]},
      {mem:'',jr:'mc',hm:0,hd:1,fl:[],flush:1},
      {mem:'',jr:'mc',hm:1,hd:1,fl:[['jr','home','m']]},
      {mem:'',jr:'',hm:1,hd:1,fl:[]}],
    journal:[
      {mem:'md',jr:'',hm:0,hd:0,fl:[]},
      {mem:'md',jr:'md',hm:0,hd:0,fl:[['mem','jr','m'],['mem','jr','d']]},
      {mem:'',jr:'mdc',hm:0,hd:0,fl:[],flush:1},
      {mem:'',jr:'mdc',hm:1,hd:1,fl:[['jr','home','m'],['jr','home','d']]},
      {mem:'',jr:'',hm:1,hd:1,fl:[]}],
    writeback:[
      {mem:'md',jr:'',hm:0,hd:0,fl:[]},
      {mem:'md',jr:'m',hm:0,hd:0,fl:[['mem','jr','m']]},
      {mem:'d',jr:'mc',hm:0,hd:-1,fl:[],flush:1},
      {mem:'',jr:'mc',hm:0,hd:1,fl:[['mem','home','d']]},
      {mem:'',jr:'',hm:1,hd:1,fl:[['jr','home','m']]}]};
  let mode='ordered';
  const YM=2.5,JX=-1.9,HX=1.9,RR=1.0,NS=12;
  const slot=i=>{const a=-Math.PI/2+i*2*Math.PI/NS;return [JX+RR*Math.cos(a),0,RR*Math.sin(a)]};
  const memM=i=>[-1.6+i*.5,YM,-.25],memD=i=>[.6+i*.45,YM,-.25],homeM=i=>[HX-.5+i*.5,0,-.55],homeD=i=>[HX-.68+i*.45,0,.45];
  function draw(R,k,e){const P=R.P,L=S[mode],kk=Math.min(k,L.length-1),s=L[kk],p=L[Math.max(0,kk-1)];R.grid(-4,4,-2.2,2.2,.5);
    const CM=P.c2,CD=P.c1,CC=P.good;
    // memory: a glass plate above the disk
    R.glass([-2.6,YM,-1],[5.2,0,0],[0,0,1.6],{c:P.c3,a:.85,nu:8,nv:2,th:.03,dz:5});R.label([-2.6,YM,.6],'memory',{al:'right',dx:-6,fs:12.5,b:1,c:P.ink});
    const inMem=(w)=>s.mem.includes(w),was=(w)=>p.mem.includes(w)&&!s.mem.includes(w);
    for(let i=0;i<3;i++){const a=inMem('m')?1:was('m')?1-e:0;R.box(memM(i),[.4,.18,.4],{fill:mix(P.paper,CM,.6),a,shadow:false,dz:-2})}
    for(let i=0;i<4;i++){const a=inMem('d')?1:was('d')?1-e:0;R.box(memD(i),[.36,.18,.36],{fill:mix(P.paper,CD,.6),a,shadow:false,dz:-2})}
    if(inMem('m')||was('m'))R.label(memM(1),'inode, dir entry, bitmap',{fs:12,c:CM,b:1,dy:-18,wide:1,a:inMem('m')?1:1-e});
    if(inMem('d')||was('d'))R.label(memD(1.5),'4 data blocks'+(inMem('d')?' (dirty)':''),{fs:12,c:CD,b:1,dy:-18,wide:1,a:inMem('d')?1:1-e});
    // the journal: a ring of blocks on disk, written in order, then reused
    for(let i=0;i<NS;i++)R.box(slot(i),[.3,.06,.3],{fill:P.paper,a:.6,lw:.6});
    R.label([JX,0,RR+.25],'journal (on disk): a ring',{fs:12.5,b:1,c:P.ink,dy:16});
    const jr=s.jr,pj=p.jr;let j=0;const put=(ch,c,n)=>{const has=jr.includes(ch),had=pj.includes(ch),a=has?(had?1:e):(had?1-e:0);for(let i=0;i<n;i++){const q=slot(j++);if(a>.01)R.box(q,[.3,.22,.3],{fill:mix(P.paper,c,.65),a,shadow:false,lw:1})}};
    put('m',CM,3);if(mode==='journal')put('d',CD,4);
    {const has=jr.includes('c'),had=pj.includes('c'),a=has?(had?1:e):(had?1-e:0);const q=slot(j);if(a>.01){R.box(q,[.3,.3,.3],{fill:mix(P.paper,CC,.75),a,shadow:false,lw:1.3,ec:CC});R.label(q,'commit',{fs:12,b:1,c:CC,dy:-22,a})}}
    if(s.flush)R.glow([JX,.2,0],1.3,{c:CC,a:.45*e});
    // home locations: where the metadata and the data finally live
    R.quad([[HX-1.05,.005,-.95],[HX+1.05,.005,-.95],[HX+1.05,.005,.85],[HX-1.05,.005,.85]],{fill:mix(P.paper,P.c6,.18),ea:.5,dz:8});
    R.label([HX,0,.95],'home locations (on disk)',{fs:12.5,b:1,c:P.ink,dy:16});
    const hm=s.hm,ph=p.hm;for(let i=0;i<3;i++){const t=hm===ph?1:e,c=hm?mix(P.paper,CM,lerp(ph?.65:.12,.65,t)):mix(P.paper,P.mute,.25);R.box(homeM(i),[.4,.16,.4],{fill:c,shadow:false,lw:.8})}
    R.label(homeM(2),hm?'new metadata':'old metadata',{al:'left',dx:22,fs:12,c:hm?CM:P.mute,b:hm,wide:1});
    for(let i=0;i<4;i++){const q=homeD(i),hd=s.hd;if(hd===0){R.quad([[q[0]-.17,.01,q[2]-.17],[q[0]+.17,.01,q[2]-.17],[q[0]+.17,.01,q[2]+.17],[q[0]-.17,.01,q[2]+.17]],{fill:null,ec:P.mute,ea:.6,dash:[3,3]});continue}
      const a=hd===p.hd?1:e;R.box(q,[.34,.16,.34],{fill:hd<0?mix(P.paper,P.mute,.55):mix(P.paper,CD,.65),a,shadow:false,lw:hd<0?2:.8,ec:hd<0?P.bad:undefined})}
    if(s.hd<0)R.label(homeD(3),'stale blocks',{al:'left',dx:20,fs:12.5,b:1,c:P.bad,a:e});
    // data moving: memory to the journal or home, the journal to home (the checkpoint)
    s.fl.forEach(([a,b,w])=>{const c=w==='m'?CM:CD,from=a==='mem'?(w==='m'?memM(1):memD(1.5)):[JX,.25,0],to=b==='jr'?[JX,.25,0]:(w==='m'?homeM(1):homeD(1.5));
      const f=[from[0],a==='mem'?YM:.25,from[2]],t=[to[0],.2,to[2]];R.flowArc(f,t,a==='mem'?.4:.9,{c,r:.065,n:9,speed:1.4})});
  }
  const full={cam:[-.28,.6],bounds:[[-3.1,0,-1.3],[3.1,2.8,1.4]]};
  const st=S3.stage({id:'stg-jb',list:'sx-jb-ordered',fig:'Fig. 6 · one jbd2 transaction, three data modes',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,30,10]:[18,40,30,90]});
  const seg=document.getElementById('rd-jb-mode');
  seg.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    Object.keys(S).forEach(m=>{document.getElementById('sx-jb-'+m).hidden=m!==mode});st.list('sx-jb-'+mode)});
})();
