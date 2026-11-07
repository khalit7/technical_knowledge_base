// ---- Scene (renderer v2, 2026-11-07): Fig. 4, the eager and the lazy pipeline of g2_order.py (section 3) ----
// Three stages on the floor (read, parse, count) between the input list and sum(). Each step of the step list on the left is a stretch of the
// lines the program printed (window.PA.lazy, written by pa/gen.py from outputs/g2_order.txt); each item's data-n is how many printed lines
// have run by the end of that step, so the scene plays exactly those events during the step. Eager: every stage's list piles up (height is
// what is held in memory) until the next stage has consumed it. Lazy: sum() pulls (grey dots flowing backwards) and one line at a time
// travels the whole chain; nothing piles up.
(function(){
  if(!document.getElementById('stg-pipe')||!window.S3||!window.PA||!PA.lazy)return;const {lerp3,mix,cl}=S3,$=id=>document.getElementById(id);
  let mode='eager';
  const X={src:-4.9,read:-2.45,parse:0,count:2.45,sum:4.9},BH=.26,BS=.3,SZ=[.82,BH,.62];
  const L=(R,p,t,o)=>{if((o.a==null?1:o.a)>=.3)R.label(p,t,o)};
  const who=v=>{const m=/"user": "(\w+)"/.exec(v);return m?m[1]:v};          // '{"user": "a"' -> a; 'oops' stays
  const ns=()=>[...$('sx-pipe-'+mode).children].map(li=>+li.dataset.n);
  const col=(P,u)=>u==='a'?P.c1:u==='b'?P.c3:P.bad;
  function draw(R,k,e){const P=R.P,ev=PA.lazy[mode],N=ns(),n1=N[k],n0=k?N[k-1]:0,lazy=mode==='lazy',last=k===N.length-1;
    R.grid(-6,6,-1.6,1.6,.5);
    // progress of event j during this step: 0 not started, 1 done
    const span=Math.max(1,n1-n0),pe=j=>j<n0?1:j>=n1?0:cl(e*span*1.05-(j-n0),0,1);
    // the stations: the input list, three stages, sum
    const tint=lazy?P.c4:P.c1;
    [['read',lazy?'read_gen':'read_list'],['parse',lazy?'parse_gen':'parse_list'],['count',lazy?'count_gen':'count_list']].forEach(([s,nm])=>{
      R.glass([X[s]-.75,0,-.6],[1.5,0,0],[0,0,1.2],{c:tint,a:.9,nu:3,nv:2,th:.04});L(R,[X[s],0,.6],nm,{mono:true,fs:12.5,b:1,dy:16,c:tint})});
    R.glass([X.src-.6,0,-.55],[1.2,0,0],[0,0,1.1],{c:P.mute,a:.6,nu:2,nv:2,th:.03});L(R,[X.src,0,.55],'LINES',{mono:true,fs:12.5,b:1,dy:16,c:P.mute});
    R.glass([X.sum-.55,0,-.55],[1.1,0,0],[0,0,1.1],{c:P.c5,a:.8,nu:2,nv:2,th:.03});L(R,[X.sum,0,.55],'sum()',{mono:true,fs:12.5,b:1,dy:16,c:P.c5});
    // the input list: three lines; a line already read is dimmed
    const reads=ev.map((x,j)=>x[0]==='read'?j:-1).filter(j=>j>=0);
    reads.forEach((j,i)=>{const u=who(ev[j][1]),done=pe(j)>=1;R.box([X.src,i*BS,0],SZ,{fill:mix(P.paper,col(P,u),.35),a:done?.35:1,shadow:i===0});
      L(R,[X.src+.41,i*BS+BH/2,0],u,{mono:true,fs:12,al:'left',dx:6,c:P.ink,a:done?.4:1})});
    // the items: where each event takes a line
    const box=(p,u,a,lab)=>{R.box(p,SZ,{fill:mix(P.paper,col(P,u),.55),a,shadow:p[1]<.05});L(R,[p[0],p[1]+BH,p[2]],lab,{mono:true,fs:12,b:1,dy:-7,a})};
    const hop=(a,b,t,c)=>{const h=.55,p=R.arcPt(a,b,h,t);if(t>0&&t<1)R.flowArc(a,b,h,{c,a:.8,r:.055,n:6,speed:1.4});return p};
    let sum=0;
    if(lazy){
      ev.forEach(([s,v],j)=>{const t=pe(j);if(t<=0)return;const u=s==='read'?who(v):s==='parse'?(v==='skip'?'oops':v):v.split(' ')[0],c=col(P,u);
        const from=s==='read'?[X.src,reads.indexOf(j)*BS,0]:s==='parse'?[X.read,0,0]:[X.parse,0,0],to=[X[s],0,0];
        // one line in flight: it hops to this stage and is gone once the next event has taken it on; count hands its number on to sum
        if(s==='parse'&&v==='skip'){if(t<1)box(hop(from,to,t,c),u,1-cl((t-.7)/.3,0,1),'skip');return}
        if(s==='count'){const val=+v.split(' ')[1];if(t<.6)box(hop(from,to,t/.6,c),u,1,String(val));else if(t<1)box(hop(to,[X.sum,0,0],(t-.6)/.4,c),u,1,String(val));if(t>=1)sum+=val;return}
        const nxt=j+1<ev.length?pe(j+1):0;if(nxt<=0)box(t<1?hop(from,to,t,c):to,u,1,u)});
      // the pull: before each line moves, sum asks count_gen, which asks parse_gen, which asks read_gen
      const pull=!last&&e<.35?1-e/.35:0,PY=.55,PZ=-.3;
      if(pull>0)R.flow([[X.sum,PY,PZ],[X.count,PY,PZ],[X.parse,PY,PZ],[X.read,PY,PZ],[X.src,PY,PZ]],{c:P.mute,a:pull,r:.06,n:14,speed:1.6});
      if(last){R.flow([[X.read,PY,PZ],[X.parse,PY,PZ],[X.count,PY,PZ],[X.sum,PY,PZ]],{c:P.bad,a:.9,r:.06,n:10,speed:1.4});
        L(R,[X.parse,PY+.1,PZ],'StopIteration, stage by stage',{mono:true,fs:12,dy:-8,c:P.bad,b:1})}
      L(R,[X.src-.4,1.35,0],'held in lists: 0',{al:'left',mono:true,fs:12.5,b:1,c:P.c4});
    }else{
      // eager: each stage appends to its own list, which piles up on its stage; a list is freed once the next stage has returned
      // (the read list when counting starts, the other two at sum)
      const done=(s,skip)=>ev.filter((x,j)=>x[0]===s&&(skip||x[1]!=='skip')&&pe(j)>=1).length;
      const counting=ev.some((x,j)=>x[0]==='count'&&pe(j)>0),aRead=!counting?1:k===2?1-cl(e*2.5,0,1):0,aEnd=last?1-cl(e*1.6,0,1):1;
      let ip=0,ic=0,ir=0;
      ev.forEach(([s,v],j)=>{const t=pe(j);if(s==='read')ir++;if(t<=0)return;
        if(s==='read'){const u=who(v),i=ir-1;box(t<1?hop([X.src,i*BS,0],[X.read,i*BS,0],t,col(P,u)):[X.read,i*BS,0],u,aRead,u)}
        else if(s==='parse'){const ri=ev.slice(0,j).filter(x=>x[0]==='parse').length,u=v==='skip'?'oops':v;
          if(v==='skip'){if(t<1)box(hop([X.read,ri*BS,0],[X.parse,ip*BS+.3,0],t,P.bad),u,1-cl((t-.6)/.4,0,1),'skip');return}
          box(t<1?hop([X.read,ri*BS,0],[X.parse,ip*BS,0],t,col(P,u)):[X.parse,ip*BS,0],u,aEnd,u);ip++}
        else{const u=v.split(' ')[0];box(t<1?hop([X.parse,ic*BS,0],[X.count,ic*BS,0],t,col(P,u)):[X.count,ic*BS,0],u,aEnd,v.split(' ')[1]);ic++}});
      const held=last?Math.round((done('parse')+done('count'))*aEnd):(counting?0:done('read'))+done('parse')+done('count');
      if(last){sum=ev.filter(x=>x[0]==='count').reduce((a,x)=>a+ +x[1].split(' ')[1],0);
        [0,1].forEach(i=>R.flowArc([X.count,i*BS+BH,0],[X.sum,.3,0],.5,{c:P.c5,a:aEnd*.9,r:.06,n:6,speed:1.3}))}
      L(R,[X.src-.4,1.35,0],'held in lists: '+held,{al:'left',mono:true,fs:12.5,b:1,c:P.c1});
    }
    if(sum)L(R,[X.sum,.35,0],(last?'total ':'sum = ')+sum,{mono:true,fs:13.5,b:1,dy:-10,c:P.c5});
  }
  const st=S3.stage({id:'stg-pipe',list:'sx-pipe-eager',fig:'Fig. 4 · lists pile up; generators pass one line through',cam:[.22,.4],bounds:[[-5.5,0,-.75],[5.5,1.35,.75]],aspect:.4,dur:2400,hold:5200,draw,
    margin:w=>w<520?[16,8,12,8]:[18,14,14,14],
    // on a phone the row is seen on a diagonal, so it recedes in depth and its parts stay large
    view:()=>innerWidth<560?{cam:[.85,.5],bounds:[[-5.5,0,-.75],[5.5,1.35,.75]]}:null});
  const M=$('dm-pipe-mode');if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;
    M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));['eager','lazy'].forEach(m=>$('sx-pipe-'+m).hidden=m!==mode);st.list('sx-pipe-'+mode)});
})();
