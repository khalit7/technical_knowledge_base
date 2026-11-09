// ---- Scene: Fig. 4, finding the wrong labels and rescoring (stg-find, renderer v2) ----
// One MMLU subject's 100 questions sampled by MMLU-Redux, one cube each (window.HE.audit, dataset order). The 18 open models' released 5-shot
// probabilities propose suspects: each cube rises by 1 minus the models' mean probability of the official key (self-confidence, HES.audit .sc.self).
// The 20 most suspect go to a review queue; MMLU-Redux 2.0's human verdicts say which are flawed; then the 18 models are rescored with the audit's
// corrected key (sound questions plus wrong keys the audit gave an answer for) and re-sorted, with 95% binomial intervals.
// Every number is HES.audit's, which check_page.mjs compares with recompute.json; the step-list numbers are written here per subject and
// published in window.ESS.find for check_stages.mjs. A static number in the list that differs from the computed one is reported as an error.
(function(){
  if(!document.getElementById('stg-find')||!window.S3||!window.HES)return;const {mix,lerp}=S3,S=window.HES,B=20;
  let subj='virology';
  const FX=-2.4,SP=.42,CU=.3,QZ=2.75,XB=1.75,BL=3.1;
  const cpos=i=>[FX+((i%10)-4.5)*SP,0,(Math.floor(i/10)-4.5)*SP];
  const qpos=j=>[FX+(j-(B-1)/2)*.235,0,QZ];
  const ord=(v,base)=>v.map((x,i)=>i).sort((i,j)=>v[j]-v[i]||base[j]-base[i]||i-j);
  function info(){const a=S.AUD[subj],it=a.items,q=a.order.self.slice(0,B),inq=new Array(a.n).fill(-1);q.forEach((i,j)=>inq[i]=j);
    const qe=a.curves.self.err[B-1],qw=a.curves.self.wrong[B-1];let up=0,ui=0,dn=0,di=0;
    a.orig.forEach((_,m)=>{const d=a.rank_orig[m]-a.rank_corr[m];if(d>up){up=d;ui=m}if(d<dn){dn=d;di=m}});
    const wfix=a.fix-a.ok,hw=Math.round(196*Math.sqrt(.8*.2/a.fix));
    return {a,it,q,inq,qe,qw,rest:a.errors-qe,up,ui,dn,di,wfix,hw,sus:it.map(x=>1-x.mp[x.k]),o0:ord(a.orig,a.orig),o1:ord(a.corr,a.orig)}}
  let I=info();
  const nth=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
  function fill(first){const a=I.a,set=(id,t)=>{const e=document.getElementById(id);if(!e)return;if(first&&e.textContent!==String(t))console.error('Fig. 4 step list: "'+e.textContent+'" should read "'+t+'"');e.textContent=t};
    set('fd-s',S.SUBN[subj]);set('fd-q',I.qe+' of '+B);set('fd-qw',I.qw);set('fd-rest',I.rest);set('fd-all',a.errors);set('fd-fix',a.fix);set('fd-ok',a.ok);set('fd-w',I.wfix);
    set('fd-up',I.up>0?S.M[I.ui]+' climbs from '+nth(a.rank_orig[I.ui])+' to '+nth(a.rank_corr[I.ui]):'no model climbs');
    set('fd-dn',I.dn<0?S.M[I.di]+' falls from '+nth(a.rank_orig[I.di])+' to '+nth(a.rank_corr[I.di]):'none falls');set('fd-hw','±'+I.hw);set('fd-fix2',a.fix);
    window.ESS=window.ESS||{};ESS.find={subj,qe:I.qe,qw:I.qw,rest:I.rest,fix:a.fix,ok:a.ok,w:I.wfix,hw:I.hw}}
  function draw(R,k,e){const P=R.P,a=I.a,it=I.it;R.grid(-5.6,5.6,-2.6,3.3,.5);
    const vcol=x=>x.t==='o'?mix(P.paper,P.good,.45):x.t==='w'?mix(P.paper,P.bad,.8):mix(P.paper,P.c5,.75);
    // the field, then the queue
    const win=(e,a,b)=>Math.max(0,Math.min(1,(e-a)/(b-a))),fa=k<=3?1:k===4?1-win(e,0,.45):0;
    if(fa>.01)it.forEach((x,i)=>{const j=I.inq[i],p=cpos(i),hs=.06+1.5*I.sus[i];
      let h=k===0?.18:k===1?lerp(.18,hs,e):hs,c=k>=3?vcol(x):P.paper,al=fa,pp=p,y=0;
      if(j>=0&&k>=2){const t=k===2?e:1,qp=qpos(j),hq=.28;pp=[lerp(p[0],qp[0],t),0,lerp(p[2],qp[2],t)];y=Math.sin(Math.PI*t)*.8;h=lerp(hs,hq,t)}
      else if(k>=2){al*=k===2?lerp(1,.5,e):.5;if(k===3&&x.t!=='o')al=fa*.9}
      if(k===3&&j<0&&x.t==='o')c=mix(P.paper,P.good,.2);
      R.box([pp[0],y,pp[2]],[j>=0&&k>=2?.19:CU,Math.max(.02,h),j>=0&&k>=2?.19:CU],{fill:c,a:al,shadow:false,lw:.6})});
    if(k===0)R.label([FX,0,2.3],R.W<520?'100 questions':'100 sampled '+S.SUBN[subj]+' questions · scored on the official key',{fs:12.5,b:1,dy:14});
    if(k===1)R.label([FX,0,2.3],R.W<520?'height: models\' doubt':'height: 1 − the models\' mean probability of the key',{fs:12.5,b:1,dy:14,c:P.c2,a:e});
    if(k===2){I.q.forEach((i,j)=>{if(j%4)return;const p=cpos(i);R.flowArc([p[0],.5,p[2]],[qpos(j)[0],.35,QZ],.5,{c:P.c2,a:.6,r:.045,n:4,speed:1.4})})}
    if(k===2)R.label([FX,0,QZ+.2],R.W<520?'queue of '+B:'review queue: the '+B+' most suspect, in order',{fs:12.5,b:1,dy:15,c:P.c2});
    if(k===3){R.label([FX,0,QZ+.2],R.W<520?I.qe+' of '+B+' flawed':'review queue: '+I.qe+' of '+B+' flawed',{fs:12.5,b:1,dy:15,c:P.bad});
      R.label([FX+2.3,.2,-2.2],I.rest+' more flawed, not reached',{fs:12.5,c:P.c5,b:1,al:'left',dx:4,wide:1})}
    // the models, original key then corrected key, re-sorted
    if(k>=4){const t=k===4?win(e,.35,1):1,base=a.orig,M=S.M.length,rz=r=>-2.35+r*.285,cur=k===4?t:1;
      const r0={},r1={};I.o0.forEach((m,r)=>r0[m]=r);I.o1.forEach((m,r)=>r1[m]=r);
      R.line([[XB,0,rz(0)-.25],[XB,0,rz(M-1)+.25]],{c:P.mute,w:1,a:t});
      S.M.forEach((nm,m)=>{const z=lerp(rz(r0[m]),rz(r1[m]),cur),v=lerp(base[m],a.corr[m],cur),len=Math.max(.02,v*BL),hot=m===I.ui||m===I.di;
        const c=hot?(m===I.ui?P.good:P.bad):P.c1;R.box([XB+len/2,0,z],[len,.12,.19],{fill:mix(P.paper,c,.55),shadow:false,a:Math.min(1,t*1.5)*(k===5&&!hot?.55:1)});
        if(R.W<520){if(hot)R.label([XB+len,.12,z],nm,{al:'right',dx:-6,fs:12,b:1,c:hot?P.ink:P.ink,a:k===4?win(e,.85,1):1})}else R.label([XB,0,z],nm,{al:'right',dx:-8,fs:12,grp:'rows',b:hot,c:hot?c:P.ink,a:t});
        const d=a.rank_orig[m]-a.rank_corr[m];
        R.label([XB+BL*.92,.12,z],(100*v).toFixed(0)+'% #'+a.rank_corr[m]+(d?(d>0?' ▲':' ▼')+Math.abs(d):''),{al:'left',dx:6,mono:true,fs:12,c:hot?c:P.mute,a:k===4?win(e,.85,1):1,wide:1});
        if(k===5){const se=1.96*Math.sqrt(a.corr[m]*(1-a.corr[m])/a.fix)*BL;R.line([[XB+len-se,.14,z],[XB+len+se,.14,z]],{c:hot?c:P.ink,w:2,a:e*.8})}});
      R.label([XB+BL*.4,0,rz(M-1)+.35],k===4&&e<.5?'accuracy on the original key':'accuracy on the corrected key ('+a.fix+' questions)',{fs:12,dy:14,c:P.mute,wide:1,a:t});}
  }
  const full={cam:[-.15,.85],bounds:[[-4.9,0,-2.5],[.6,1.6,3.3]]};
  const st=S3.stage({id:'stg-find',list:'sx-find',fig:'Fig. 4 · models propose, people decide, then rescore',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1600,hold:5400,draw,
    margin:w=>w<520?[16,10,14,10]:[20,16,16,16],
    view:k=>k===1?{cam:[-.3,.55],bounds:[[-4.9,0,-2.5],[.4,1.6,2.7]]}:k>=4?{cam:[0,.95],bounds:innerWidth<520?[[1.5,0,-2.6],[5.1,.4,2.9]]:[[-.4,0,-2.6],[6.2,.4,2.9]]}:full});
  const seg=document.getElementById('fd-mode');
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{subj=b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));I=info();fill(false);st.list('sx-find')});
  fill(true);
})();
