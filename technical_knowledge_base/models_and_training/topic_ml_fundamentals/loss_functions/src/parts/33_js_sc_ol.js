// ---- Scene (Outliers, Fig. 2): the data on the floor, the fitted line, each point's loss as a column standing on it (renderer v2) ----
// Two real datasets from 20_js_data.js: Anscombe's set III (one bad target) and the CYG OB1 stars (four leverage points). Every line is the
// exact minimiser from 21_js_core.js (LF.fit: closed form for MSE, IRLS for Huber with delta 1, the best line through two points for MAE),
// checked against PyTorch by recompute.py. Columns: each point's loss rho(u) at the line drawn, one scale per dataset; green dots: each
// point's pull psi(u) on the line, as long as the pull (scaled to the largest in the step). The side column: the total the fit minimises.
// The step lists' numbers are static spans (data-ol) written here from the same fits; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ol')||!window.S3||!window.LD||!window.LF)return;const {at,off,lerp,mix}=S3;
  const PAR={delta:1,tau:.5},KEYS=['mse','huber','mae'],NM={mse:'MSE',huber:'Huber',mae:'MAE'};
  function build(D,out,xr,yr){const n=D.x.length,base=[...Array(n).keys()].filter(i=>!out.includes(i)),bx=base.map(i=>D.x[i]),by=base.map(i=>D.y[i]);
    const F={};KEYS.forEach(k=>{F[k]={old:LF.fit(k,bx,by,PAR),neu:LF.fit(k,D.x,D.y,PAR)}});return {D,n,out,base,F,xr,yr}}
  const SC={a:build(LD.anscombe3,[2],[3,15],[4,13.6]),s:build(LD.stars,LD.stars.giants.map(g=>g-1),[3.4,4.7],[2.8,6.6])};
  const rho=(k,u)=>LF.REG[k].rho(u,PAR),psi=(k,u)=>LF.REG[k].psi(u,PAR);
  const tot=(S,k,f,only)=>{let s=0;for(let i=0;i<S.n;i++){if(only&&!only.includes(i))continue;s+=rho(k,S.D.y[i]-(f.a+f.b*S.D.x[i]))}return s};
  const lever=(S,k,f)=>{const xb=S.D.x.reduce((a,b)=>a+b,0)/S.n;return S.D.x.map((x,i)=>Math.abs(psi(k,S.D.y[i]-(f.a+f.b*x))*(x-xb)))};
  // the numbers the step lists quote
  const fx=(v,d)=>v.toFixed(d).replace('-','−'),pc=v=>Math.round(100*v)+'%',T={};
  for(const m of ['a','s']){const S=SC[m];KEYS.forEach(k=>{const F=S.F[k];T[m+'-'+k+'-b0']=fx(F.old.b,m==='a'?3:2);T[m+'-'+k+'-b1']=fx(F.neu.b,m==='a'?3:2);
      T[m+'-'+k+'-t0']=fx(tot(S,k,F.old),m==='a'?2:1);T[m+'-'+k+'-t1']=fx(tot(S,k,F.neu),m==='a'?2:1);T[m+'-'+k+'-to']=fx(tot(S,k,F.neu,S.out),2);T[m+'-'+k+'-o1']=pc(tot(S,k,F.neu,S.out)/tot(S,k,F.neu))});
    const uo=Math.max(...S.out.map(i=>S.D.y[i]-(S.F.mse.old.a+S.F.mse.old.b*S.D.x[i])));
    T[m+'-a0']=fx(S.F.mse.old.a,2);T[m+'-uo']=fx(uo,2);T[m+'-ro']=fx(uo*uo,1);T[m+'-ho']=fx(rho('huber',uo),2);T[m+'-n']=String(S.base.length)}
  {const S=SC.s,lv=lever(S,'mae',S.F.mae.neu),all=lv.reduce((a,b)=>a+b,0);T['s-lev']=pc(S.out.reduce((a,i)=>a+lv[i],0)/all);T['s-levn']=pc(S.out.length/S.n)}
  document.querySelectorAll('[data-ol]').forEach(e=>{e.textContent=T[e.dataset.ol]!=null?T[e.dataset.ol]:'?'});
  window.OLT=T;
  let mode='a';
  const X0=-3.6,X1=2.8,Z0=2.2,Z1=-2.2,HC=2.0,TX=4.3,TZ=2.5,HT=1.3;
  function draw(R,k,e){const P=R.P,S=SC[mode],D=S.D,narrow=R.W<520;R.grid(-4.4,5.2,-2.8,2.8,.5);
    const X=x=>lerp(X0,X1,(x-S.xr[0])/(S.xr[1]-S.xr[0])),Z=y=>lerp(Z0,Z1,(y-S.yr[0])/(S.yr[1]-S.yr[0]));
    const LC={mse:P.ink,huber:P.c4,mae:P.c6};
    // which loss and which line this step draws
    const key=k<=2?'mse':k===3?'huber':'mae',F=S.F[key],last=k===5;
    const lin=last?F.neu:k<=1?F.old:{a:lerp(F.old.a,F.neu.a,e),b:lerp(F.old.b,F.neu.b,e)};
    const lk=last?'mae':key,lf=last?S.F.mae.neu:lin;
    const outA=k===0?0:k===1?e:1;
    // the column scale: the largest single loss under MSE at the clean line (one scale for the whole dataset, so losses compare)
    const cmax=Math.max(...S.out.map(i=>rho('mse',D.y[i]-(S.F.mse.old.a+S.F.mse.old.b*D.x[i])))),hs=HC/cmax;
    const levStep=last&&mode==='s',lv=levStep?lever(S,'mae',S.F.mae.neu):null,lmax=lv?Math.max(...lv):1;
    const colA=last&&!levStep?.22:1;
    // axes on the floor
    R.line([[X0-.2,0,Z0+.35],[X1+.2,0,Z0+.35]],{c:P.mute,w:1,dz:50});R.line([[X0-.35,0,Z0+.2],[X0-.35,0,Z1-.2]],{c:P.mute,w:1,dz:50});
    R.label([X1+.2,0,Z0+.35],mode==='a'?'x':'log surface temperature',{mono:true,fs:12,al:'right',dy:14,c:P.mute});
    R.label([X0-.35,0,0],mode==='a'?'y':'log light',{mono:true,fs:12,al:'right',dx:-8,c:P.mute});
    // ghost lines: the minimum each earlier loss reached
    const ghosts=k===3?['mse']:k===4?['mse','huber']:last?KEYS:[];
    ghosts.forEach(g=>{const f=S.F[g].neu,a=last?1:.45;R.line([[X0,.01,Z(f.a+f.b*S.xr[0])],[X1,.01,Z(f.a+f.b*S.xr[1])]],{c:LC[g],w:last?2.6:1.6,dash:last?null:[5,4],a,dz:40});
      R.label([X1,.01,Z(f.a+f.b*S.xr[1])],NM[g]+' · '+fx(f.b,mode==='a'?3:2),{mono:true,fs:12.5,b:last,al:'left',dx:8,c:LC[g],a,grp:'ln'})});
    // the current line
    if(!last){R.line([[X0,.012,Z(lin.a+lin.b*S.xr[0])],[X1,.012,Z(lin.a+lin.b*S.xr[1])]],{c:LC[key],w:3,dz:30});
      R.label([X1,.012,Z(lin.a+lin.b*S.xr[1])],NM[key]+' · slope '+fx(lin.b,mode==='a'?3:2),{mono:true,fs:13,b:1,al:'left',dx:8,c:LC[key],grp:'ln'})}
    // points, their columns, residuals and pulls
    const shown=[...Array(S.n).keys()].filter(i=>!S.out.includes(i)||outA>0);
    const ps=shown.map(i=>psi(lk,D.y[i]-(lf.a+lf.b*D.x[i])));const pmax=Math.max(1e-9,...ps.map(Math.abs));
    shown.forEach((i,j)=>{const o=S.out.includes(i),a=o?outA:1,x=X(D.x[i]),z=Z(D.y[i]),u=D.y[i]-(lf.a+lf.b*D.x[i]),c=o?P.c2:P.c1;
      R.ball([x,.07,z],mode==='a'?.1:.075,{c,a});
      const h=levStep?lv[i]/lmax*HC:rho(lk,u)*hs;
      R.box([x,0,z],[mode==='a'?.24:.1,Math.max(.012,h),mode==='a'?.24:.1],{fill:mix(P.paper,c,o?.6:.4),a:a*colA,shadow:false,lw:.5,fa:.75});
      if(o&&k>=1&&!last)R.line([[x,.02,z],[x,.02,Z(lf.a+lf.b*D.x[i])]],{c:P.c2,w:1.4,dash:[3,3],a,dz:30});
      // the pull: from the line towards the point, as long as the pull
      if(k>=1&&!last){const L=Math.abs(ps[j])/pmax*.95;if(L>.06){const z0=Z(lf.a+lf.b*D.x[i]),dz=(Z1-Z0)/Math.abs(Z1-Z0)*Math.sign(u)*L;
        R.line([[x,.04,z0],[x,.04,z0+dz]],{c:P.c3,w:mode==='a'?2.2:1.6,head:mode==='a'?8:6,a:a*.75,dz:20});
        R.flow([[x,.06,z0],[x,.06,z0+dz]],{c:P.c3,a:a,r:mode==='a'?.07:.05,n:Math.max(2,Math.round(2+5*L)),speed:.8})}}});
    // the side column: the total the fit minimises (its own scale), the outliers' part on top; for the stars' lever step, the share of the lever
    if(!last||levStep){let base,top,lab,sub;
      if(levStep){const all=lv.reduce((a,b)=>a+b,0),o=S.out.reduce((a,i)=>a+lv[i],0);base=(all-o)/all;top=o/all;lab='lever on the slope';sub=S.out.length+' giants · '+pc(o/all)}
      else{const tm=Math.max(...KEYS.map(g=>tot(S,g,S.F[g].old))),t=tot(S,key,lin),to=outA>0?tot(S,key,lin,S.out)*outA:0,tr=tot(S,key,lin,S.base);base=tr/tm;top=to/tm;
        lab='total '+NM[key]+' loss '+fx(tr+to,1);sub=outA>0?(mode==='a'?'outlier':'giants')+' · '+pc(to/(tr+to||1)):'clean points only'}
      R.box([TX,0,TZ],[.5,Math.max(.012,base*HT),.5],{fill:mix(P.paper,P.c1,.45),lw:.6});
      if(top>0)R.box([TX,base*HT,TZ],[.5,Math.max(.012,top*HT),.5],{fill:mix(P.paper,P.c2,.6),lw:.6,shadow:false});
      R.label([TX,0,TZ+.25],lab,{mono:true,fs:12,dy:14,c:P.ink,b:1});R.label([TX,0,TZ+.25],sub,{mono:true,fs:12,dy:29,c:top>0?P.c2:P.mute})}
  }
  const full={cam:[.3,.8],bounds:[[-4,0,-2.4],[4.7,2,2.8]]};
  const st=S3.stage({id:'stg-ol',list:'sx-ol-a',fig:'Fig. 2 · one bad target, three losses, real data',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,8,40,8]:[16,130,40,40],
    view:k=>k===1?{cam:[.42,.72],bounds:[[-4,0,-2.4],[4.7,2,2.8]]}:full});
  const M=$('olM');if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;
    M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));['a','s'].forEach(m=>{$('sx-ol-'+m).hidden=m!==mode});
    st.host.querySelector('.stg-top span').textContent=mode==='a'?'Fig. 2 · one bad target, three losses, real data':'Fig. 2 · four unusual inputs, three losses, real data';st.list('sx-ol-'+mode)});
})();
