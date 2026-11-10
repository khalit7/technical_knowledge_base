// ---- Scene (Whose text, Fig. 3): one toy prompt, the teacher's route against the student's own, graded token by token (renderer v2) ----
// Everything drawn is the trained toy's own (DS.toy.anim, from toy/mk_toy.py): the 32-node graph, a route sampled from the teacher, one sampled from
// the student checkpoint, the teacher's next-node distribution at each position and the reverse KL there.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-fl')||!window.S3||!window.DS||!DS.toy||!DS.toy.anim)return;const {at,off,lerp,mix}=S3;
  const G=DS.toy.graph,A=DS.toy.anim,NM=G.names,EOS=G.n+1,nm=v=>v===EOS?'end':v===G.n?'sep':NM[v];
  const TR=A.routes.teacher,SR=A.routes.student,tPath=[A.s,...TR.route],sPath=[A.s,...SR.route],teachSet=new Set(tPath),TP=TR.pos[1];
  const P3=v=>[-4.2+G.xy[v][0]*8.4,0,-2.4+G.xy[v][1]*4.8],Y=.16;
  // where a token's grade stands: 35% of the way along the move it made (so a move and its reverse do not share a spot), on the node for "end"
  const spot=(p)=>{const a=P3(p.at);if(p.next===EOS||p.next>=G.n)return a;const b=P3(p.next);return [lerp(a[0],b[0],.35),0,lerp(a[2],b[2],.35)]};
  const grades=SR.pos.map(p=>({p,x:spot(p),off:!teachSet.has(p.at)}));
  const gmax=Math.max(...SR.pos.map(p=>p.rkl)),GS=1.9/gmax,TS=1.7;
  const pathPts=pth=>pth.map(v=>{const q=P3(v);return [q[0],Y,q[2]]});
  const top=(d,n)=>Object.keys(d).map(Number).sort((a,b)=>d[b]-d[a]).slice(0,n);
  const off2=grades.filter(g=>g.off).length,sum=SR.pos.reduce((s,p)=>s+p.rkl,0),imax=SR.pos.reduce((b,p,i)=>p.rkl>SR.pos[b].rkl?i:b,0);
  const offSum=grades.filter(g=>g.off).reduce((s,g)=>s+g.p.rkl,0);
  function writeList(){const set=(k,h)=>document.querySelectorAll('[data-fl="'+k+'"]').forEach(e=>e.innerHTML=h);
    set('s',NM[A.s]);set('t',NM[A.t]);set('dist',A.dist);set('budget',A.budget);set('troute',tPath.map(nm).join(' ')+' end');set('tn',TR.pos.length);
    set('tat',NM[TP.at]);set('tnext',nm(TP.next));set('tdist',top(TP.t,4).map(v=>nm(v)+' '+Math.round(100*TP.t[v])+'%').join(', '));
    set('ckpt',A.ckpt.replace('sft','SFT'));set('sroute',sPath.map(nm).join(' ')+' end, which '+(SR.ok?'is correct':SR.why));set('soff',off2);set('sn',SR.pos.length);
    const pm=SR.pos[imax];set('smax',pm.rkl.toFixed(2)+' nats at '+NM[pm.at]+', where it chose '+nm(pm.next)+' and the teacher gives that '+(pm.t[pm.next]||0).toFixed(4));
    set('ssum',sum.toFixed(1)+' nats, '+offSum.toFixed(1)+' of them on the '+off2+' states')}
  function node(R,v,o){const q=P3(v);R.box([q[0],0,q[2]],[.24,.1,.24],{fill:o.fill||R.P.paper,a:o.a==null?1:o.a,lw:.8});
    if(o.lab)R.label([q[0],.1,q[2]],NM[v],{fs:12.5,b:1,dy:o.dy||-11,c:o.c||R.P.ink,a:o.a==null?1:o.a})}
  function draw(R,k,e){const P=R.P,narrow=R.W<520,RED=S3.rgb(P.dark?'#ef6f7f':'#d1495b');R.grid(-5,5,-3,3,.5);
    const ea=k===2?.45:.85;G.edges.forEach(([a,b])=>{const p=P3(a),q=P3(b);R.line([[p[0],.01,p[2]],[q[0],.01,q[2]]],{c:mix(P.paper,P.ink,.28),w:1.2,a:ea})});
    const lab=new Set();if(k===1)tPath.forEach(v=>lab.add(v));if(k===2){Object.keys(TP.t).forEach(v=>+v<G.n&&lab.add(+v))}
    if(k>=3)sPath.forEach(v=>lab.add(v));
    for(let v=0;v<G.n;v++){const isS=v===A.s,isT=v===A.t;node(R,v,{fill:isS?P.c3:isT?P.c4:null,lab:isS||isT||(lab.has(v)&&!narrow),c:isS?P.c3:isT?P.c4:P.ink,a:k===2&&!lab.has(v)&&!isS&&!isT?.4:1})}
    if(k===0){R.label(P3(A.s),'start',{fs:12.5,b:1,dy:16,c:P.c3,a:e});R.label(P3(A.t),'target',{fs:12.5,b:1,dy:16,c:P.c4,a:e})}
    // 1. the teacher's route: off-policy text
    if(k>=1){const tp=pathPts(tPath),ta=k===1?1:k===2?.5:.3;R.line(tp,{c:P.c1,w:k===1?3.2:2.2,a:ta*(k===1?Math.min(1,e*1.5):1)});if(k<=2)R.flow(tp,{c:P.c1,a:ta,r:.07,speed:1.3})}
    // 2. one position, two targets: the teacher's distribution standing on the candidate next nodes, the one-hot label as an outline
    if(k===2){const a0=P3(TP.at);R.label([a0[0],.1,a0[2]],'here: '+NM[TP.at],{fs:12.5,b:1,dy:16,c:P.c1,a:e});
      Object.keys(TP.t).map(Number).forEach(v=>{const pr=TP.t[v];if(pr<.005)return;const q=v===EOS?a0:P3(v),h=Math.max(.02,pr*TS*e);
        R.box([q[0],.1,q[2]],[.22,h,.22],{fill:mix(P.paper,P.c1,.85),shadow:false});R.label([q[0],.1+h,q[2]],Math.round(100*pr)+'%',{mono:true,fs:12.5,b:1,dy:-11,c:P.c1,a:e});
        R.flowArc([a0[0],.25,a0[2]],[q[0],.2,q[2]],.3,{c:P.c1,a:.7*e,r:.05,n:3+Math.round(8*pr),speed:1.1})});
      const q=P3(TP.next);R.box([q[0],.1,q[2]],[.3,TS*e,.3],{fill:P.c2,fa:.1,ec:P.c2,lw:2,shadow:false});
      R.label([q[0]+.25,.1+TS*e,q[2]],'SFT target: '+nm(TP.next)+' 100%',{al:'left',mono:true,fs:12.5,b:1,dx:6,c:P.c2,a:e,wide:1})}
    // 3. the student's own route, which leaves the teacher's states
    if(k>=3){const sp=pathPts(sPath);R.line(sp,{c:P.c2,w:3,a:k===3?Math.min(1,e*1.5):.75});if(k===3)R.flow(sp,{c:P.c2,a:1,r:.07,speed:1.3})}
    // 4. the teacher grades every token the student wrote: a column of reverse KL at each move, red on states off the teacher's route
    if(k===4){const g0=[0,1.7,-3.1];R.glass([g0[0]-.5,1.1,g0[2]],[1,0,0],[0,.8,0],{c:P.c1,a:e,nu:4,nv:4});R.label([g0[0],1.9,g0[2]],'teacher',{fs:12.5,b:1,dy:-8,c:P.c1,a:e});
      grades.forEach((g,i)=>{const h=Math.max(.02,g.p.rkl*GS*e),c=g.off?RED:P.c1;R.box([g.x[0],.02,g.x[2]],[.2,h,.2],{fill:mix(P.paper,c,.95),shadow:false});
        R.flowArc([g0[0],1.5,g0[2]],[g.x[0],h+.05,g.x[2]],.4,{c:P.c1,a:.6*e,r:.04+.04*g.p.rkl/gmax,n:2+Math.round(6*g.p.rkl/gmax),speed:1.1});
        if(i===imax)R.label([g.x[0],.02+h,g.x[2]],g.p.rkl.toFixed(2),{mono:true,fs:12.5,b:1,dy:-11,c,a:e,grp:'gr'})});
      R.label([-4.2,0,3.0],off2+' of '+SR.pos.length+' graded states off the teacher’s route',{al:'left',dy:6,mono:true,fs:12.5,b:1,c:RED,a:e,wide:1});R.label([-4.2,0,3.0],'Σ reverse KL '+sum.toFixed(1)+' nats',{al:'left',dy:23,mono:true,fs:12.5,b:1,c:P.ink,a:e,wide:1})}
  }
  const full={cam:[.08,.95],bounds:[[-4.6,0,-2.8],[4.4,1.2,2.8]]};
  const a0=P3(TP.at);
  S3.stage({id:'stg-fl',list:'sx-fl',fig:'Fig. 3 · the teacher’s text against the student’s own',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,10,18,10]:[22,18,26,18],
    view:k=>k===2?{cam:[.25,.72],bounds:[[a0[0]-2.8,0,a0[2]-2.1],[a0[0]+2.8,1.9,a0[2]+2.1]]}:k===4?{cam:[.1,.75],bounds:[[-4.4,0,-3.3],[4.4,2.5,3.3]]}:full});
  writeList();
})();
