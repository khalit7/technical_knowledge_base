// ---- Scene: Fig. 2, weak tests (stg-he, renderer v2): three Codex-12B samples for HumanEval/31 (is_prime), as printed in the Codex paper's Appendix B,
// graded first by HumanEval's 13 inputs and then by HumanEval+'s 154. Each sample is a card with a glass plate in front of it: the front row holds the
// 13 HumanEval inputs, the grid behind it the 154 HumanEval+ inputs. Every cell is the result of running that sample on that input in src/recompute.py
// (window.CD.he.res: p passed, w wrong answer, t over this page's 1 s limit); expected answers come from the reference solution in HumanEval+. ----
(function(){
  if(!document.getElementById('stg-he')||!window.S3||!window.CD)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1),H=CD.he;
  const S=[['c6','Sample 6','CORRECT',-2.75],['c4','Sample 4','CORRECT',0],['c1','Sample 1','WRONG',2.75]];
  const nb=H.base.length,np=H.plus.length,COLS=14,PIT=.15,ZB=.95,ZP=.62,ZC=-1.25;
  const cnt=(s,ch)=>[...s].filter(x=>x===ch).length;
  const C={};S.forEach(([id])=>{const r=H.res[id];C[id]={b:[cnt(r.base,'p'),cnt(r.base,'w'),cnt(r.base,'t')],p:[cnt(r.plus,'p'),cnt(r.plus,'w'),cnt(r.plus,'t')]}});
  const pass=t=>S.filter(([id])=>C[id].b[0]===nb&&(t==='base'||C[id].p[0]===np)).length;
  window.CBN=window.CBN||{};CBN.he={nb,np,c:C,heval:pass('base'),plus:pass('plus'),
    neg:H.plus.filter((x,j)=>x<=0&&H.res.c6.plus[j]==='w').length,wrong6:H.plus.filter((x,j)=>H.res.c6.plus[j]==='w').every(x=>x<=0)};
  // how far each sample's runs have got: base inputs at step 2, HumanEval+ for sample 6 at step 4 and for samples 4 and 1 at step 5
  const fb=(k,e)=>k<1?0:k===1?e:1,fp=(id,k,e)=>id==='c6'?(k<3?0:k===3?e:1):(k<4?0:k===4?e:1);
  function lab(R,p,t,o){const q=R.p(p);if((o.a!=null&&o.a<.15)||q[2]<=0)return;R.label(p,t,o)}
  function cell(R,P,x,z,r,a,big){if(r==='p')R.quad([[x-.06,.03,z-.06],[x+.06,.03,z-.06],[x+.06,.03,z+.06],[x-.06,.03,z+.06]],{fill:mix(P.paper,P.good,.72),a,edge:false});
    else if(r==='w')R.box([x,.02,z],[.12,big?.2:.15,.12],{fill:mix(P.paper,P.bad,.78),a,shadow:false,lw:.5});
    else if(r==='t')R.box([x,.02,z],[.12,big?.2:.15,.12],{fill:mix(P.paper,P.mute,.55),a,shadow:false,lw:.5});
    else R.quad([[x-.055,.025,z-.055],[x+.055,.025,z-.055],[x+.055,.025,z+.055],[x-.055,.025,z+.055]],{a:a*.55,ec:P.line,lw:.7,dash:[2,2]})}
  function draw(R,k,e,st){const P=R.P;R.grid(-4.4,6,-2.1,1.7,.5);const pk=st&&st.pk!=null?st.pk:k;
    S.forEach(([id,nm,mk,x0],si)=>{const r=H.res[id],c=C[id],f1=fb(k,e),f2=fp(id,k,e),focus=k===3?(id==='c6'?1:.25):k===4?(id==='c6'?.45:1):1;
      const nB=Math.floor(f1*nb+1e-9),nP=Math.floor(f2*np+1e-9),showP=k>=2?(k===2?win(e,0,.6):1):0;
      // the plate
      const w=COLS*PIT+.2,d=(np/COLS)*PIT+PIT+.5;R.glass([x0-w/2,.0,ZB+.2],[w,0,0],[0,0,-d],{c:P.c1,a:.6*focus,nu:4,nv:4,th:.02});
      for(let j=0;j<nb;j++)cell(R,P,x0-(nb-1)*PIT/2+j*PIT,ZB,j<nB?r.base[j]:'',focus,false);
      if(showP>0)for(let j=0;j<np;j++){const cc=j%COLS,rr=Math.floor(j/COLS);cell(R,P,x0-(COLS-1)*PIT/2+cc*PIT,ZP-rr*PIT,j<nP?r.plus[j]:'',focus*showP,k===3&&id==='c6')}
      // the program card: green while it passes everything run so far, orange once anything fails
      const bad=[...r.base.slice(0,nB)].some(x=>x!=='p')||[...r.plus.slice(0,nP)].some(x=>x!=='p'),run=nB>0;
      R.box([x0,0,ZC],[1.9,.78,.12],{fill:run?mix(P.paper,bad?P.bad:P.good,.4):P.paper,a:focus});
      const la=focus<.3?0:Math.max(.4,focus);lab(R,[x0,.78,ZC],nm,{b:1,fs:13,dy:-11,a:la});
      lab(R,[x0,.4,ZC+.07],'paper: '+mk,{fs:12,mono:true,wide:k!==3,c:mk==='WRONG'?P.bad:P.ink,a:focus<.3?0:focus});
      // what has run, under the plate
      const t=(nB?(r.base.slice(0,nB).split('').filter(x=>x==='p').length+'/'+nB):'')+(nP?' · '+r.plus.slice(0,nP).split('').filter(x=>x==='p').length+'/'+nP:'');
      if(t)lab(R,[x0,0,ZB+.2],t,{mono:true,fs:12,dy:14,b:1,wide:k!==3,a:la,c:bad?P.bad:P.good});
      // the inputs running: dots from the card onto the cells being filled
      if(k===1&&e<1)R.flow([[x0,.45,ZC+.1],[x0,.25,ZB]],{c:P.c1,a:.8,n:6,r:.05});
      if(e<1&&((k===3&&id==='c6')||(k===4&&id!=='c6'))){const rr=Math.floor(nP/COLS);R.flow([[x0,.45,ZC+.1],[x0-(COLS-1)*PIT/2+(nP%COLS)*PIT,.12,ZP-rr*PIT]],{c:P.c2,a:.9,n:6,r:.05})}
    });
    // the extra inputs arriving (step 3): a stream into each plate
    if(k===2){const a=win(e,0,.5);S.forEach(([,, ,x0])=>R.flowArc([x0,1.5,-2.0],[x0,.1,ZP-.6],.2,{c:P.c2,a:a*.8,n:7,r:.05}));lab(R,[0,1.5,-2.0],'HumanEval+ · 154 more inputs, expected answers from the reference solution',{fs:12.5,b:1,c:P.c2,a,wide:1})}
    if(k===3){lab(R,[-2.75-1.15,0,ZP-.75],C.c6.p[1]+' wrong',{fs:12.5,b:1,c:P.bad,al:'right',a:win(e,.5,1)});lab(R,[-2.75-1.15,0,ZP-1.2],C.c6.p[2]+' over 1 s',{fs:12.5,b:1,c:P.mute,al:'right',a:win(e,.5,1)})}
    // the two scores for the same three programs
    if(k===5||(pk===5&&k!==5)){const a=k===5?win(e,.2,.8):1-win(e,0,.4),X=4.7,h=v=>v/3*1.3*a;
      [['HumanEval',pass('base'),P.paper],['HumanEval+',pass('plus'),mix(P.paper,P.c2,.6)]].forEach(([nm,v,f],i)=>{const x=X+i*.95;R.box([x,0,0],[.42,Math.max(.01,h(v)),.42],{fill:f,a,shadow:false});
        lab(R,[x,h(v),0],v+' of 3',{mono:true,fs:12,b:1,dy:-10,a,wide:1,c:i?P.c2:P.ink});lab(R,[x,0,.25],nm,{fs:12,dy:14+i*16,a,b:1,wide:1})})}
  }
  const full={cam:[.0,.86],bounds:[[-4.0,0,-1.4],[5.9,1.0,1.3]]};
  S3.stage({id:'stg-he',list:'sx-he',fig:'Fig. 2 · is_prime, three Codex samples, 13 then 167 inputs',cam:full.cam,bounds:full.bounds,aspect:.44,dur:2200,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[24,16,22,16],
    view:k=>k===3?{cam:[.12,.7],bounds:[[-4.3,0,-1.5],[-1.2,.9,1.3]]}:null});
})();
