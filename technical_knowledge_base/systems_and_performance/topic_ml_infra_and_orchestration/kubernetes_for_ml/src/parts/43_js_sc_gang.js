// ---- Scene: the parent's deadlock input with and without a native PodGroup (section 7). Data: window.KM.gang (pod timelines tl0 without
// the gang and tl with it, the scheduler log, the release order). Three jobs a, b, c of two pods; each pod holds a whole worker's 4 fake GPUs,
// so 1.5 jobs fit. Back: the scheduling queue (gated pods faint, released pods solid; in the gang run each pair sits on its PodGroup plate);
// front: the three workers. ----
(function(){
  if(!document.getElementById('stg-gang')||!window.KMG||!window.KM)return;const {mix,lerp}=S3,G=KMG,GA=KM.gang;
  const JX={a:-2.6,b:0,c:2.6},ZQ=[-2.1,-3.5];
  const PH={nogang:['gated','zeros','ones','dead'],gang:['gated','zeros','a','bc','b','c']};
  const tl=m=>{const o={};(m==='gang'?GA.tl:GA.tl0).pods.forEach(p=>o[p.pod.slice(3)]=p);return o};
  const T={nogang:tl('nogang'),gang:tl('gang')};
  window.KM_GANG=T;
  let mode='nogang';
  // where each pod is at a step: 'gated' | 'wait' | 'held' (PreEnqueue) | 'refused' | 'placed' | 'done'
  function state(m,ph,id){const j=id[0],i=+id[2],P=T[m][id];
    if(m==='nogang'){if(ph==='gated')return 'gated';if(i===0)return 'placed';return ph==='zeros'?'gated':'wait'}
    const order=PH.gang,at=n=>order.indexOf(ph)>=order.indexOf(n);
    if(ph==='gated')return 'gated';
    if(j==='a'){if(!at('a'))return i===0?'held':'gated';return at('b')?'done':'placed'}
    if(!at('bc'))return i===0?'held':'gated';
    if(j==='b'){if(at('c'))return 'done';return at('b')?'placed':'refused'}
    return at('c')?'placed':'refused'}
  function draw(R,k,e){const P=R.P,ph=PH[mode][k],prev=k?PH[mode][k-1]:null,C={a:P.c1,b:P.c4,c:P.c5};
    R.grid(-4.6,4.6,-3.6,1.4,.5);
    G.WX.forEach((x,i)=>{G.worker(R,[x,0,0]);R.label([x,0,.55],G.NAMES[i],{fs:12.5,dy:14,b:1})});
    R.label([-4.0,0,-2.1],'queue',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'side'});
    if(mode==='gang')['a','b','c'].forEach(j=>{R.glass([JX[j]-.95,.01,-4.1],[1.9,0,0],[0,0,2.6],{c:C[j],a:.45,nu:2,nv:2,th:.02})});
    if(mode==='gang')R.label([-4.0,0,-3.5],'PodGroups · minCount 2',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'side'});
    const placed={};
    ['a-0','a-1','b-0','b-1','c-0','c-1'].forEach(id=>{const j=id[0],i=+id[2],s=state(mode,ph,id),s0=prev?state(mode,prev,id):s,Pd=T[mode][id],qp=[JX[j],0,ZQ[i]];
      let pos=qp,a=1,c=C[j];
      if(s==='placed'||(s==='done'&&s0==='placed')){const w=G.WN[Pd.node],tgt=G.podAt([G.WX[w],0,0],0,4);placed[w]=id;
        if(s0!=='placed'&&s==='placed'){const u=e;pos=[lerp(qp[0],tgt[0],u),lerp(qp[1],tgt[1],u)+Math.sin(Math.PI*u)*.7,lerp(qp[2],tgt[2],u)];if(u<1)R.flowArc(qp,tgt,.7,{c,a:1-u*.5,r:.08,speed:1.6})}
        else pos=tgt;
        if(s==='done'){a=1-e;c=mix(C[j],P.good,e)}}
      else if(s==='done')return;
      else if(s==='gated')a=.28;
      G.pod(R,pos,4,{c,a,fa:s==='gated'?.4:1});
      const tag=s==='gated'?'gated':s==='held'?'held':s==='refused'?'refused':s==='wait'?'Pending':'';
      R.label([pos[0],pos[1]+.34,pos[2]],j+i+(tag?' · '+tag:''),{mono:true,fs:12,dy:-9,b:s==='placed',c:s==='wait'||s==='refused'?P.bad:s==='held'?P.c5:P.ink,a:s==='done'?a:Math.max(.5,a)})});
    // the deadlock: each running pod waits for a peer that cannot be placed
    if(ph==='dead')['a','b','c'].forEach(j=>{const P0=T.nogang[j+'-0'],w=G.WN[P0.node],from=G.podAt([G.WX[w],0,0],0,4);R.arc([from[0],from[1]+.34,from[2]],[JX[j],.34,ZQ[1]],.8,{c:P.bad,w:2,t:e,a:.9})});
    if(ph==='bc')R.label([G.WX[2],0,.55],'stays free',{fs:12.5,dy:30,c:P.good,b:1,a:e});
    // the recorded times
    const clock={a:'t = '+T.gang['a-0'].start.toFixed(1)+' s · quorum met, gang a bound',b:'t = '+T.gang['b-0'].start.toFixed(1)+' s · gang b bound',c:'t = '+T.gang['c-0'].start.toFixed(1)+' s · gang c bound',
      dead:GA.nogang[2].label.replace(/^\S+\s+/,'')+' · every job half placed'}[ph];
    if(clock)R.label([0,0,-5.1],clock,{mono:true,fs:13,b:1,c:ph==='dead'?P.bad:P.acc,a:Math.max(.3,e)});
  }
  const st=S3.stage({id:'stg-gang',list:'sx-gang-nogang',fig:'All or none · three jobs of two pods, recorded',cam:[.22,.86],bounds:[[-3.8,0,-5.2],[3.8,1.2,.9]],aspect:.62,dur:1700,hold:4600,draw,
    margin:w=>w<520?[18,10,16,10]:[24,18,20,70]});
  (window.KMSTG=window.KMSTG||{})['stg-gang']=st;
  const seg=document.getElementById('km-gang-mode');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['nogang','gang'].forEach(m=>document.getElementById('sx-gang-'+m).hidden=m!==mode);st.list('sx-gang-'+mode)}));
})();
