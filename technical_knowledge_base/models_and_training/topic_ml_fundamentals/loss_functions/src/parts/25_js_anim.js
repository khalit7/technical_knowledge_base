// ---- Reading: one dataset, two losses: the outliers arrive and the line moves (before/after animation) ----
(function(){
  const card=document.getElementById('oa-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const NM={huber:'Huber, δ = 1',mae:'MAE',logcosh:'Log-cosh'};
  const st={sc:'a',rl:'huber'};
  function scen(){
    if(st.sc==='a'){const X=LD.anscombe3.x,Y=LD.anscombe3.y;const out=[2];
      return {X,Y,out,base:X.map((v,i)=>i).filter(i=>!out.includes(i)),xr:[3,15],yr:[3.5,13.5],xl:'x',yl:'y',
        what:'the point (13, 12.74), a bad target'}}
    const X=LD.stars.x,Y=LD.stars.y,out=LD.stars.giants.map(g=>g-1);
    return {X,Y,out,base:X.map((v,i)=>i).filter(i=>!out.includes(i)),xr:[3.3,4.8],yr:[3,6.8],xl:'log surface temperature',yl:'log light',
      what:'the 4 red giants, cool and bright: unusual inputs'}
  }
  let S,F;
  function prep(){S=scen();const p={delta:1,tau:0.5};
    const bx=S.base.map(i=>S.X[i]),by=S.base.map(i=>S.Y[i]);
    F={};for(const k of ['mse',st.rl]){F[k]={old:LF.fit(k,bx,by,p),neu:LF.fit(k,S.X,S.Y,p)}}
    // one arrow scale for both panels: the largest pull at the old or new line maps to 30% of the y range
    let mx=0;for(const k in F)for(const f of [F[k].old,F[k].neu])LF.pulls(k,S.X,S.Y,f,p).forEach(q=>{mx=Math.max(mx,Math.abs(q.psi))});
    S.sc=0.3*(S.yr[1]-S.yr[0])/(mx||1);S.p=p;
    $('oa-h1').innerHTML=NM[st.rl]+' <small>robust to large errors</small>';
  }
  const lerp=(a,b,t)=>({a:a.a+(b.a-a.a)*t,b:a.b+(b.b-a.b)*t});
  function lineAt(k,i){const f=F[k];if(i<=2)return f.old;if(i===3)return lerp(f.old,f.neu,1/3);if(i===4)return lerp(f.old,f.neu,2/3);return f.neu}
  function panel(k,i,el,cnt,id){
    const f=lineAt(k,i),show=i>=1,pts=[],segs=[],lines=[];
    const idx=show?S.X.map((v,j)=>j):S.base;
    const xs=[S.xr[0],S.xr[1]];
    if(i>=1)lines.push({xs,ys:xs.map(x=>F[k].old.a+F[k].old.b*x),c:'var(--mute)',dash:'5 4',w:1.5});
    lines.push({xs,ys:xs.map(x=>f.a+f.b*x),c:'var(--ink)',w:2.2});
    const P=LF.pulls(k,S.X,S.Y,f,S.p);
    idx.forEach(j=>{const o=S.out.includes(j);pts.push({x:S.X[j],y:S.Y[j],r:o?5.5:4,c:o?'var(--c2)':'var(--c1)'});
      if(i===1&&o)segs.push({x1:S.X[j],y1:S.Y[j],x2:S.X[j],y2:f.a+f.b*S.X[j],c:'var(--c2)',w:1.5,dash:'3 3'});
      if(i===2||i===5){const L=P[j].psi*S.sc;if(Math.abs(L)>0.035*(S.yr[1]-S.yr[0]))segs.push({x1:S.X[j],y1:f.a+f.b*S.X[j],x2:S.X[j],y2:f.a+f.b*S.X[j]+L,c:'var(--c3)',w:2.4,arrow:true})}});
    PL.chart({el,id,x:S.xr,y:S.yr,lines,pts,segs,xl:S.xl,yl:S.yl,h:RD.width(el)<330?210:240,label:'Fit under '+k});
    // counters at the current line, over the points currently shown
    let tot=0,out=0,lev=0,levo=0,ein=0;const xb=idx.reduce((s,j)=>s+S.X[j],0)/idx.length;
    idx.forEach(j=>{const a=Math.abs(P[j].psi),l=Math.abs(P[j].psi*(S.X[j]-xb));tot+=a;lev+=l;if(S.out.includes(j)){out+=a;levo+=l}});
    S.base.forEach(j=>{ein+=Math.abs(P[j].u)});ein/=S.base.length;
    cnt.innerHTML=RD.stat('slope',f.b.toFixed(3),'intercept '+f.a.toFixed(2))+
      RD.stat('outliers\' share of pull',show?Math.round(100*out/(tot||1))+'%':'none yet','of the lever on the slope: '+(show?Math.round(100*levo/(lev||1))+'%':'none'))+
      RD.stat('error on the other points',ein.toFixed(3),'mean |u|, the clean '+S.base.length);
  }
  function caps(i){
    const m=F.mse,r=F[st.rl],R=NM[st.rl];const a=st.sc==='a';
    const sl=f=>f.b.toFixed(3).replace('-','−');
    return [
      ['Before','Only the clean points: '+(a?'Anscombe\'s ten':'the 43 main-sequence stars')+'. Both losses find the same kind of line (slope '+sl(m.old)+' under MSE, '+sl(r.old)+' under '+R+').'],
      ['The outliers arrive',(a?'One point':'Four points')+' join: '+S.what+'. Nothing has moved yet; the dashed segments are their errors at the current line.'],
      ['Each point pulls','Green arrows: each point\'s pull ψ(u) at the current line, to the same scale in both panels (pulls too short to see are left out). Under MSE the pull is 2u and grows with the error; under '+R+' it is '+(st.rl==='mae'?'±1 whatever the error, so even points a hair off the line pull as hard as the outliers':st.rl==='huber'?'capped at δ = 1':'tanh(u), capped at 1')+'.'+(a&&st.rl!=='mae'?' The clean points sit almost on the line and barely pull.':'')],
      ['The line gives way','The fit moves towards its new minimum, shown in two steps. '+(a?'Under MSE it has far to go.':'The giants are far out on x, so even a capped pull has a long lever on the slope.')],
      ['','Two thirds of the way.'],
      ['After',a?'MSE ends at slope '+sl(m.neu)+' (Anscombe\'s 0.500) with every clean point now off the line; '+R+' ends at '+sl(r.neu)+'. At the minimum the pulls balance: the outlier\'s pull equals the sum of the others\'.':
        'Every loss turns the slope over: MSE '+sl(m.neu)+', '+R+': '+sl(r.neu)+'. A capped pull does not cap a lever; the giants are leverage points, which a robust loss does not handle.']][i];
  }
  let A;
  function draw(i){if(!S)prep();panel('mse',i,$('oa-l0'),$('oa-c0'),'oa0');panel(st.rl,i,$('oa-l1'),$('oa-c1'),'oa1');
    const c=caps(i);$('oa-cap').innerHTML='<div class="t">Step '+(i+1)+' of 6'+(c[0]?': '+c[0]:'')+'</div>'+c[1]}
  A=RD.anim({card:'oa-card',ctl:'oa-ctl',n:6,draw,ms:2200,label:'Outlier animation step'});
  function seg(id,key){document.getElementById(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    [...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));st[key]=b.dataset[key==='sc'?'s':'l'];prep();A.reset(6);A.play()})}
  seg('oa-sc','sc');seg('oa-l','rl');
  addEventListener('resize',()=>{if(card.offsetParent)A.redraw()});
})();
