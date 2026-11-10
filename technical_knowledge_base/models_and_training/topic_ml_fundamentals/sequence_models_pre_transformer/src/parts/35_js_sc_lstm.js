// ---- Scene (Fig. 3): one LSTM cell gate by gate, the cell state as a conveyor along the back (renderer v2) ----
// The toy LSTM trained on sequences of 5 to 50 symbols (SQ.mem.models.lstm, run by CELL, checked against PyTorch by check_cells.py)
// on the running example at length 40 (CELL.sequence(key, 40, 7)), key "b", with key "a" on the same distractors for contrast.
// Four glass plates (W_f, W_i, W_C, W_o) each make 8 numbers (gates 0 to 1 as bars, the candidate signed); unit 4 is outlined.
// The step list's numbers are static spans (data-ls) written here from the same run; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-lstm')||!window.S3||!window.CELL)return;const {at,off,lerp,mix}=S3;
  const C=CELL,H=C.H,T=40,U=3,m=C.models.lstm,seqB=C.sequence(1,T,7),seqA=C.sequence(0,T,7),RB=C.run(m,seqB),RA=C.run(m,seqA);
  const o0=RB.tr[0],o1=RB.tr[1],oq=RB.tr[T-1];
  let pf=1,sf=0,si=0;for(let t=1;t<T;t++){pf*=RB.tr[t].f[U];sf+=RB.tr[t].f[U]}for(let t=1;t<T-1;t++)si+=RB.tr[t].i[U];
  const sg=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2),sg1=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(1);
  const F={i0:o0.i[U].toFixed(2),g0:sg(o0.cand[U]),c0:sg(o0.c[U]),ga0:sg(RA.tr[0].cand[U]),f1:o1.f[U].toFixed(2),f1b:o1.f[U].toFixed(2),i1:o1.i[U].toFixed(2),i1b:o1.i[U].toFixed(2),
    c0b:o0.c[U].toFixed(2),g1:o1.cand[U].toFixed(2),c1:o1.c[U].toFixed(2),cb:sg1(oq.c[U]),ca:sg1(RA.tr[T-1].c[U]),mf:(sf/(T-1)).toFixed(2),pf:pf.toFixed(2),
    o:oq.o[U].toFixed(2),h:oq.h[U].toFixed(2),pk:RB.p[T-1][1].toFixed(2),mi:(si/(T-2)).toFixed(2)};
  document.querySelectorAll('[data-ls]').forEach(e=>{if(F[e.dataset.ls]!=null)e.textContent=F[e.dataset.ls]});
  window.SQ_LSTM={F,RB,RA};
  const ZR=-.7,YR=2.05,ZP=.35,ZI=2.5,XF=-2.85,XI=-.95,XC=.95,XO=2.85,YP0=.08,YP1=.95,YV=1.2,WD=1.05,YH=.7;
  const lab=(R,p,t,o)=>{const q=R.p(p);if(q[0]>2&&q[0]<R.W-2&&q[1]>2&&q[1]<R.H-2)R.label(p,t,o)};
  function comb(R,c,vals,col,a,hmax,wd,hl,signed){if(a<=.01)return;const P=R.P,nb=vals.length,bw=wd/nb;
    R.box([c[0],c[1]-.04,c[2]],[wd+.12,.04,.3],{a,shadow:false});
    vals.forEach((v,i)=>{const hg=Math.max(.012,Math.abs(v)*hmax),bx=c[0]-wd/2+bw*(i+.5),on=i===hl;
      R.box([bx,v>=0||!signed?c[1]:c[1]-.04-hg,c[2]],[bw*(on?.8:.66),hg,on?.16:.1],{fill:on?col:mix(P.paper,col,.4),a:on?a:a*.85,shadow:false,lw:on?1.4:.6,ec:on?P.ink:null})})}
  // a cell-state vector: its scale shrinks once the cell grows past 1.2 (the label says the real value on unit 4)
  const cs=v=>.3/Math.max(1,Math.max(...v.map(Math.abs))/1.2);
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-1.6,2.8,.5);
    const cf=P.c6,ci=P.c3,cc=P.c2,co=P.c4,cC=P.c1,cA=P.c5;
    const t=k<=1?0:k===2?1:T-1,o=RB.tr[t],prevC=t?RB.tr[t-1].c:new Array(H).fill(0),prevH=t?RB.tr[t-1].h:new Array(H).fill(0);
    const hist=k===3?e:0,base=k===3?1-.85*e:1;
    // which part a step is about: the rest recedes
    const lo=k===1||k===2||k===4?.12:.2,foc={f:k===0||k===2?1:lo,i:k<=2?1:lo,c:k<=2?1:lo,o:k===0||k===4?1:lo,inp:k===0?1:k===4?.12:.35};
    if(k===1)foc.f=.2;
    const A=v=>v*base;
    // the conveyor: the cell state's lane along the top, old C on the left, new C on the right
    const ab=k===3?1:A(1);
    R.box([0,YR-.06,ZR],[10.6,.06,.7],{fill:mix(P.paper,cC,.14),a:ab,shadow:false});[-5.1,5.1].forEach(xx=>R.box([xx,0,ZR],[.05,YR-.06,.05],{a:ab*.8}));
    R.line([[-5.2,YR+.01,ZR+.36],[5.25,YR+.01,ZR+.36]],{c:cC,w:2,head:7,a:ab*.7});
    comb(R,[-4.3,YR+.02,ZR],prevC,cC,A(1),cs(prevC),1.0,U,true);comb(R,[4.3,YR+.02,ZR],o.c,cC,A(1),cs(o.c),1.0,U,true);
    if(k!==3){lab(R,[-4.3,YR+.45,ZR],t?'old C':'C = 0',{mono:true,fs:12,c:cC,dy:-6,a:A(1)});lab(R,[4.3,YR+.45,ZR],'C · cell state',{mono:true,fs:12,b:1,c:cC,dy:-6,a:A(1)})}
    // the four layers: a glass plate each, its 8 outputs on top
    const L4=[['f · forget',XF,cf,o.f,0,foc.f],['i · input',XI,ci,o.i,0,foc.i],['C̃ · candidate',XC,cc,o.cand,1,foc.c],['o · output',XO,co,o.o,0,foc.o]];
    L4.forEach(([nm,xx,col,v,sgn,a])=>{const aa=A(a);R.glass([xx-WD/2,YP0,ZP],[WD,0,0],[0,YP1-YP0,0],{c:col,a:aa,nu:5,nv:4});
      comb(R,[xx,YV+(sgn?.32:0),ZP],v,col,aa,sgn?.3:.45,.95,U,!!sgn);
      // the plate's name sits above its outputs; on the step about it, with its value on unit 4
      const val=k===1&&xx===XI?'i = '+F.i0+' on unit 4':k===1&&xx===XC?'C̃ = '+F.g0+' on unit 4':k===2&&xx===XF?'f = '+F.f1+' on unit 4':nm;
      if(k!==3&&(a>.5||k===0))lab(R,[xx,YV+(sgn?.68:.5),ZP],val,{mono:true,fs:12,dy:-10,b:a>.5,c:col,a:aa})});
    // the input: the symbol and the previous hidden state, fed to all four at once
    const ai=A(foc.inp);R.box([-.7,0,ZI],[.5,.3,.5],{fill:t===0?mix(P.paper,P.c2,.45):P.paper,a:ai});if(k!==3&&k!==4)lab(R,[-.7,.3,ZI],C.sym[seqB[t]],{serif:true,fs:15,b:1,dy:-10,a:Math.max(.5,ai)});
    comb(R,[.75,YH,ZI],prevH,P.ink,ai*.8,.3,.8,U,true);if(k!==3&&k!==4)lab(R,[.75,YH,ZI+.2],t?'old h':'h = 0',{mono:true,fs:12,dy:16,c:P.mute,a:Math.max(.5,ai)});
    if(k===0)L4.forEach(([,xx,col])=>R.flowArc([0,.35,ZI-.1],[xx,YP0+.2,ZP+.05],.45,{c:col,a:e*.85,r:.06,n:6,speed:1.2}));
    // the operations on the conveyor: x f where the forget gate meets it, + i C~ where the write joins it
    if(k===1||k===2){const wi=o.i[U],wg=Math.abs(o.cand[U]);
      R.flowArc([XC,YV+.65,ZP],[.15,YR,ZR+.2],.35,{c:cc,a:base*(.3+.7*Math.min(1,wi*wg*1.3)),r:.05+.04*wi,n:Math.max(2,Math.round(2+8*wi*wg)),speed:1.1});
      R.flowArc([XI,YV+.45,ZP],[-.15,YR,ZR+.2],.35,{c:ci,a:base*(.3+.7*wi),r:.05+.04*wi,n:Math.max(2,Math.round(2+7*wi)),speed:1.1});
      lab(R,[0,YR+.05,ZR+.3],'+ i ⊙ C̃',{mono:true,fs:13,b:1,c:ci,dy:-16,a:base})}
    if(k===2||k===0){const wf=o.f[U];R.flow([[-4.3+.6,YR+.08,ZR+.1],[XF,YR+.08,ZR+.1],[-.4,YR+.08,ZR+.1]],{c:cC,a:base*(.25+.75*wf),r:.05+.04*wf,n:Math.max(2,Math.round(3+7*wf)),speed:1.2});
      R.flowArc([XF,YV+.45,ZP],[XF,YR,ZR+.2],.3,{c:cf,a:base*.7,r:.05,n:4,speed:1});lab(R,[XF,YR+.05,ZR+.3],'× f',{mono:true,fs:13,b:1,c:cf,dy:-16,a:base})}
    // step 5: the output gate reads the conveyor into h, and the readout answers
    if(k===4){R.flowArc([3.6,YR,ZR+.2],[XO,YV+.45,ZP],.25,{c:cC,a:e,r:.07,n:6,speed:1.1});
      const xh=4.35;comb(R,[xh,YH,ZI-.3],o.h,co,e,.36,.9,U,true);R.flowArc([XO,YV+.2,ZP],[xh,YH+.3,ZI-.3],.35,{c:co,a:e,r:.06,n:5,speed:1.1});
      lab(R,[xh,YH+.45,ZI-.3],'h · '+F.h+' on unit 4',{mono:true,fs:12.5,b:1,c:co,dy:-14,a:e});
      lab(R,[xh,0,ZI-.3],'answer "b" · P = '+F.pk,{mono:true,fs:12.5,b:1,c:P.ink,dy:14,a:e})}
    // step 4: unit 4's cell at every step, on plinths along the conveyor: key "a" in front, key "b" behind
    if(hist>0){const XH=i=>-4.85+i*(9.7/(T-1)),S=.085,Y0=YR+.05;
      [[RA,ZR+.55,cA,'key a'],[RB,ZR-.15,cC,'key b']].forEach(([Rr,z,col,nm])=>{R.box([0,Y0-.04,z],[10.1,.04,.34],{a:hist,shadow:false});
        for(let i=0;i<T;i++){const v=Rr.tr[i].c[U],hg=Math.max(.01,Math.abs(v)*S),grow=Math.min(1,Math.max(0,hist*1.4*T-i));if(grow<=0)continue;
          R.box([XH(i),v>=0?Y0:Y0-.04-hg*grow,z],[.15,hg*grow,.16],{fill:col,a:hist,shadow:false,lw:.5})}
        const v=Rr.tr[T-1].c[U];lab(R,[5.12,Y0+(v>=0?.35:-.3),z],nm+' · '+sg1(v),{mono:true,fs:12.5,b:1,al:'left',dx:6,c:col,a:hist,wide:1});
        lab(R,[XH(0),Y0,z],nm.slice(-1),{serif:true,fs:13,b:1,al:'right',dx:-8,c:col,a:hist})});
      lab(R,[XH(0),Y0+1.45,ZR-.15],'unit 4\'s cell state, steps 1 to 40',{mono:true,fs:12,al:'left',c:P.mute,a:hist})}
  }
  const full={cam:[-.15,.45],bounds:[[-5.3,0,-1.1],[5.3,2.6,2.8]]};
  S3.stage({id:'stg-lstm',list:'sx-lstm',fig:'Fig. 3 · one cell of the trained LSTM',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,12,8]:[18,14,12,14],
    view:k=>k===1?{cam:[-.15,.38],bounds:[[-2.1,0,-1.1],[2.1,2.8,1.2]]}:k===2?{cam:[-.1,.4],bounds:[[-5.2,0,-1.1],[1.3,2.8,1.2]]}:k===3?{cam:[0,.3],bounds:[[-5.2,1.4,-1.1],[6.4,3.6,.1]]}:k===4?{cam:[-.25,.42],bounds:[[-.6,0,-1.1],[5.3,2.6,2.8]]}:full});
})();
