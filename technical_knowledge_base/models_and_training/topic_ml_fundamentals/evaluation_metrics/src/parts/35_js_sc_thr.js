// ---- Scene (section 1, Fig. 1): one threshold through 872 real SST-2 scores, the four confusion-matrix cells as stacks (renderer v2) ----
// Everything drawn is the page's data: the logistic regression's probabilities (EM.sst2 via window.SST), the rare-positive subset MX.sst(true),
// and the best-MCC threshold on that subset, found the same way as the accuracy-trap table. The step list's numbers are written here (data-tc spans);
// check_stages.mjs compares them with the static page.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-thr')||!window.S3||!window.SST||!window.MX)return;const {at,lerp,mix}=S3;
  const {Y,P}=window.SST,p=P.lr,NB=40;
  const sets=[false,true].map(rare=>{const idx=MX.sst(rare),pos=[],neg=[];idx.forEach(i=>(Y[i]?pos:neg).push(p[i]));pos.sort((a,b)=>a-b);neg.sort((a,b)=>a-b);
    const bins=arr=>{const b=[...Array(NB)].map(()=>[]);arr.forEach(v=>b[Math.min(NB-1,Math.floor(v*NB))].push(v));return b};return {pos,neg,bp:bins(pos),bn:bins(neg)}});
  // the best-MCC threshold on the rare subset (as in the accuracy-trap table)
  const TB=(()=>{const idx=MX.sst(true),y=idx.map(i=>Y[i]),q=idx.map(i=>p[i]);let best={mcc:-2,th:.5};[...new Set(q)].sort((a,b)=>a-b).forEach(t=>{const r=MX.rates(MX.confusion(y,q,t));if(r.mcc>best.mcc)best={mcc:r.mcc,th:t}});return best.th})();
  const ge=(arr,t)=>{let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m]>=t)hi=m;else lo=m+1}return arr.length-lo}; // how many scores are >= t
  const cells=(s,t)=>{const tp=ge(s.pos,t),fp=ge(s.neg,t);return {tp,fp,fn:s.pos.length-tp,tn:s.neg.length-fp}};
  const rates=c=>{const n=c.tp+c.fp+c.fn+c.tn,d=Math.sqrt((c.tp+c.fp)*(c.tp+c.fn)*(c.tn+c.fp)*(c.tn+c.fn));
    return {acc:(c.tp+c.tn)/n,prec:c.tp+c.fp?c.tp/(c.tp+c.fp):null,rec:c.tp/(c.tp+c.fn),mcc:d?(c.tp*c.tn-c.fp*c.fn)/d:0}};
  // the six steps: threshold (null: no plane yet; 1.0001: nothing is called positive) and which data
  const ST=[[null,0],[.5,0],[TB,0],[.5,1],[1.0001,1],[TB,1]];
  // the static numbers in the step list
  {const f3=v=>v==null?'undefined':v.toFixed(3),pc=v=>(100*v).toFixed(1)+'%',c1=cells(sets[0],.5),c2=cells(sets[0],TB),c4=cells(sets[1],.5),c5=cells(sets[1],1.0001),c6=cells(sets[1],TB);
    const V={tp1:c1.tp,fp1:c1.fp,fn1:c1.fn,tn1:c1.tn,acc1:pc(rates(c1).acc),pr1:f3(rates(c1).prec),re1:f3(rates(c1).rec),tb:TB.toFixed(2),fp2:c2.fp,pr2:f3(rates(c2).prec),fn2:c2.fn,re2:f3(rates(c2).rec),
      np:sets[1].pos.length,fp4:c4.fp,tp4:c4.tp,pr4:f3(rates(c4).prec),acc4:pc(rates(c4).acc),mcc4:rates(c4).mcc.toFixed(2),acc5:pc(rates(c5).acc),tb6:TB.toFixed(2),calls6:c6.tp+c6.fp,tp6:c6.tp,acc6:pc(rates(c6).acc),mcc6:rates(c6).mcc.toFixed(2)};
    document.querySelectorAll('[data-tc]').forEach(e=>{if(V[e.dataset.tc]!=null)e.textContent=String(V[e.dataset.tc])})}
  const phone=()=>{const c=document.querySelector('#stg-thr canvas');return c&&c.clientWidth<520};
  const X0=-4,XW=8,x=v=>X0+XW*v,BW=XW/NB,ZP=1,ZN=-1,HS=.045,SX=[5.4,6.85],SH=1.75/444;
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5,7.8,-2.4,2.4,.5);
    const cur=ST[k],prev=ST[Math.max(0,k-1)],pe=k===0?1:e;
    // the threshold glides from the last step's value; the positive row shrinks when the data turns rare
    const T=cur[0]==null?null:prev[0]==null?cur[0]:lerp(prev[0],cur[0],pe),rr=lerp(prev[1],cur[1],pe),pa=cur[0]==null?0:prev[0]==null?pe:1;
    const sA=sets[0],sR=sets[1];
    const col=(cls,right)=>{const base=cls?P.c1:P.c2,cell=(cls===1)===right?P.good:P.c4;return mix(base,cell,pa)};
    // the two rows of columns, one per bin of 0.025; a bin the threshold cuts is drawn as two columns, one each side
    [[1,ZP],[0,ZN]].forEach(([cls,z])=>{for(let b=0;b<NB;b++){
        const get=s=>cls?s.bp[b]:s.bn[b],nA=get(sA),nR=get(sR),cx=x((b+.5)/NB);
        const tot=lerp(nA.length,nR.length,cls?rr:0);if(tot<.02)continue;
        let fr=1;if(T!=null){const above=lerp(ge(nA,T),ge(nR,T),cls?rr:0);fr=tot?above/tot:0}
        else fr=-1;
        const h=tot*HS;
        if(fr<0)R.box([cx,0,z],[BW*.8,h,.56],{fill:mix(P.paper,col(cls,true),.75),shadow:false,lw:.5});
        else{const b0=x(b/NB),b1=x((b+1)/NB),xt=T==null?b1:Math.min(b1,Math.max(b0,x(T)));
          if(fr<.999){const w=(xt-b0)*.9;if(w>.01)R.box([b0+(xt-b0)/2,0,z],[w,h*(1-fr),.56],{fill:mix(P.paper,col(cls,false),.78),shadow:false,lw:.5})}
          if(fr>.001){const w=(b1-xt)*.9;if(w>.01)R.box([xt+(b1-xt)/2,0,z],[w,h*fr,.56],{fill:mix(P.paper,col(cls,true),.78),shadow:false,lw:.5})}}}});
    // row and axis labels
    const nPos=(rr<.5?sA:sR).pos.length; // labels show a real data set, never a blend, while the row shrinks
    R.label([X0-.2,.2,ZP],nPos+' positive reviews',{al:'right',dx:-6,fs:12.5,b:1,c:P.c1,grp:'side'});
    R.label([X0-.2,.2,ZN],'428 negative reviews',{al:'right',dx:-6,fs:12.5,b:1,c:P.c2,grp:'side'});
    R.label([x(0),0,ZP+.4],'p = 0',{mono:true,fs:12,dy:12,c:P.mute});R.label([x(1),0,ZP+.4],'p = 1',{mono:true,fs:12,dy:12,c:P.mute});
    // the threshold: a glass plane across both rows
    if(T!=null){const xp=T>1?x(1)+.25:x(T);R.glass([xp,0,-1.6],[0,0,3.2],[0,1.9,0],{c:P.acc,nu:1,nv:5,a:pa});
      if(!narrow)R.label([xp,1.9,-1.6],T>1?'nothing called positive':'p ≥ '+T.toFixed(2)+' → positive',{mono:true,fs:12.5,b:1,c:P.acc,a:pa,dy:-12,grp:narrow?null:'top'})}
    // the four cells as stacks: predicted negative, predicted positive; front the positives, back the negatives
    if(T!=null){const cA=cells(sA,T),cR=cells(sR,T),C={};['tp','fp','fn','tn'].forEach(q=>C[q]=lerp(cA[q],cR[q],rr));
      const S4=[['fn',SX[0],ZP,P.c4],['tp',SX[1],ZP,P.good],['tn',SX[0],ZN,P.good],['fp',SX[1],ZN,P.c4]];
      S4.forEach(([q,sx,z,c])=>{const h=Math.max(.012,C[q]*SH*pa);R.box([sx,0,z],[.8,h,.62],{fill:mix(P.paper,c,.8),a:Math.max(.25,pa)});
        R.label([sx,h,z],q.toUpperCase()+' '+(rr<.5?cA:cR)[q],{mono:true,fs:12.5,b:1,c,dy:-11,a:pa,grp:narrow?null:'stk'})});
      R.label([SX[0],0,ZP+.4],'called −',{mono:true,fs:12,dy:12,c:P.mute,a:pa});R.label([SX[1],0,ZP+.4],'called +',{mono:true,fs:12,dy:12,c:P.mute,a:pa});
      // flows: each side of each row streams into its cell, as dense as the count it carries
      if(pa>.05){const xs=T>1?x(1):x(Math.min(1,T));[[ZP,'fn','tp',P.c4,P.good],[ZN,'tn','fp',P.good,P.c4]].forEach(([z,ql,qr,cl,cr])=>{
          [[ql,(x(0)+xs)/2,SX[0],cl],[qr,(xs+x(1))/2,SX[1],cr]].forEach(([q,fx,sx,c])=>{const v=C[q];if(v<.5)return;
            R.flowArc([fx,.9,z],[sx,Math.max(.1,v*SH)+.15,z],.55,{c,a:pa*(k===1?.95:.6),r:.05+.04*Math.min(1,v/300),n:Math.max(3,Math.round(3+v/40)),speed:1.3})})})}
      const r=rates(rr<.5?cA:cR);
      const rd=narrow?(T>1?'none called + · ':'p ≥ '+T.toFixed(2)+' · ')+'acc '+(100*r.acc).toFixed(1)+'% · MCC '+r.mcc.toFixed(2):'accuracy '+(100*r.acc).toFixed(1)+'% · precision '+(r.prec==null?'undefined':r.prec.toFixed(3))+' · recall '+r.rec.toFixed(3)+' · MCC '+r.mcc.toFixed(2);
      R.label([x(.5),2.0,ZN-.7],rd,{mono:true,fs:13,b:1,c:P.ink,a:pa,dy:-14,grp:narrow?null:'top'})}
    else R.label([x(.5),2.0,ZN-.7],narrow?'872 SST-2 scores':'logistic regression on SST-2 · 872 validation sentences',{mono:true,fs:13,b:1,c:P.ink,dy:-14});
  }
  S3.stage({id:'stg-thr',list:'sx-thr',fig:'Fig. 1 · one threshold, four counts (real SST-2 scores)',cam:[.2,.72],bounds:[[-4.3,0,-1.8],[7.3,2.0,1.8]],aspect:.44,dur:1700,hold:4800,draw,
    view:()=>phone()?{cam:[.72,.6]}:null,
    margin:w=>w<520?[16,10,14,10]:[22,14,14,150]});
})();
