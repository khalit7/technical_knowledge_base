// ---- Scene: Fig. 2, one real pair scored apart (bi-encoder) and together (cross-encoder), renderer v2. Claim 1180 and PubMed 31272411:
// tokens and segment ids, the last-layer attention from each claim token to its strongest abstract tokens (mean of 12 heads), the cross-encoder's
// ten logits and the bi-encoder's ten cosines are this page's recordings (RR.ce_view, RR.ce_checks, RR.bi; e_ce_manual.py). Blocks are tokens, not values. ----
(function(){
  if(!document.getElementById('stg-be')||!window.RR)return;const {at,mix,lerp}=S3,R0=window.RR;
  const V=R0.ce_view,tok=V.tokens,seg=V.segment,SP=t=>t==='[CLS]'||t==='[SEP]';
  const qI=tok.map((t,i)=>i).filter(i=>seg[i]===0),dI=tok.map((t,i)=>i).filter(i=>seg[i]===1),ND=48,dS=dI.slice(0,ND);
  const links=[];qI.forEach((qi,k)=>{if(SP(tok[qi]))return;(V.claim_to_doc_top6[k]||[]).filter(x=>Array.isArray(x)&&!SP(tok[x[0]])).slice(0,2).forEach(x=>{if(dS.includes(x[0]))links.push([qi,x[0],x[1]])})});
  const mxw=Math.max(...links.map(l=>l[2]));
  const targets=[...new Set(links.slice().sort((a,b)=>b[2]-a[2]).map(l=>l[1]))].slice(0,6);
  const bi=R0.bi.slice().sort((a,b)=>b.cos-a.cos),ce=R0.ce_checks.slice().sort((a,b)=>b.predict-a.predict);
  const relBI=R0.bi.find(b=>b.rel),relCE=R0.ce_checks.find(c=>c.rel);
  const P1=(R0.mx||[]).find(m=>m.qid==='1180');
  {const e=document.getElementById('rr-be-tg');if(e)e.textContent='The lifted abstract tokens are '+targets.map(i=>'"'+tok[i]+'"').join(', ')+'.'}
  let mode='bi';
  // bi layout: claim row in front, abstract row behind; ce layout: one sequence
  const bxQ=j=>(j-(qI.length-1)/2)*.3,bxD=j=>(j-(ND-1)/2)*.2,ZQ=1.6,ZD=-1.6;
  const seqN=qI.length+ND,sx=j=>(j-(seqN-1)/2)*.16;
  const XB=6.2,bxR=j=>XB+j*.3;
  function bars(R,k,e,L,key,rel,col,lab){const P=R.P,a=e,vmax=Math.max(...L.map(c=>Math.abs(c[key])));
    R.box([XB+1.35,0,0],[3.2,.04,.5],{a,shadow:false});
    L.forEach((c,j)=>{const v=c[key],h=Math.max(.02,Math.abs(v)/vmax*1.3)*a,fill=c.rel?P.good:mix(P.paper,col,.45);
      R.box([bxR(j),v>=0?.04:.04-h,0],[.2,h,.3],{fill,a:Math.max(.3,a),shadow:false});
      if(c.rel||j===0)R.label([bxR(j),v>=0?.04+h:.04,0],(c.rel?'relevant · ':'')+(c.rel?'rank '+(j+1)+' · ':'')+v.toFixed(key==='cos'?3:2),{fs:12.5,mono:true,b:c.rel,dy:c.rel?-26:-12,c:c.rel?P.good:P.ink,a})});
    R.label([XB+1.35,0,.25],lab,{fs:12.5,dy:16,c:P.mute,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5.8,9.4,-2.6,2.6,.5);
    if(mode==='bi'){
      const fa=k===4?.3:1;
      qI.forEach((i,j)=>R.box([bxQ(j),0,ZQ],[.22,.22,.22],{fill:SP(tok[i])?mix(P.paper,P.q,.3):mix(P.paper,P.q,.75),a:(k===1?.3:1)*fa}));
      dS.forEach((i,j)=>R.box([bxD(j),0,ZD],[.15,.15,.15],{fill:P.paper,a:(k===2?.3:1)*fa}));
      if(k<4)R.label([0,0,ZQ+.2],'claim 1180'+(P1?': '+P1.claim:''),{fs:12.5,dy:16,c:P.q,wide:1});
      if(k<4)R.label([0,.15,ZD-.2],'abstract 31272411: first '+ND+' tokens',{fs:12.5,dy:-14,c:P.mute,wide:1});
      // encoders and the two vectors
      const ea=at(k,e,1),qa=at(k,e,2);
      R.glass([bxD(0)-.2,.02,-.9],[bxD(ND-1)-bxD(0)+.4,0,0],[0,.6,0],{c:P.c1,a:ea*fa,nu:16,nv:3});
      R.box([0,0,-.3],[3,.12*Math.max(.1,ea),.2],{fill:P.paper,a:ea*fa,shadow:false});
      if(k===1){R.flow([[0,.1,ZD],[0,.35,-.9],[0,.14,-.3]],{c:P.mute,a:e,n:6});R.label([-1.6,.1,-.3],'1 stored vector · 1,024 numbers',{al:'right',dx:-8,fs:12.5,mono:true,a:e})}
      R.glass([bxQ(0)-.2,.02,.9],[bxQ(qI.length-1)-bxQ(0)+.4,0,0],[0,.55,0],{c:P.c1,a:qa*fa,nu:8,nv:3});
      R.box([0,0,.3],[3,.12*Math.max(.1,qa),.2],{fill:mix(P.paper,P.q,.75),a:qa*fa,shadow:false});
      if(k===2){R.flow([[0,.1,ZQ],[0,.33,.9],[0,.14,.3]],{c:P.q,a:e,n:6});R.label([-1.6,.1,.3],'1 pass per query',{al:'right',dx:-8,fs:12.5,mono:true,a:e,c:P.q})}
      if(k===3){R.flowArc([0,.12,.3],[0,.12,-.3],.5,{c:P.q,a:e,n:6,r:.07,speed:.9});R.label([0,.62,0],'cosine '+relBI.cos.toFixed(3),{fs:14,b:1,c:P.q,a:e})}
      if(k===4)bars(R,k,e,bi,'cos',relBI,P.c1,'top 10 by cosine')}
    else{
      const fa=k===4?.3:1,lift=i=>k===2&&targets.includes(i)?.18*e:k>2&&targets.includes(i)?.18:0;
      const seq=qI.concat(dS);
      seq.forEach((i,j)=>{const q=seg[i]===0,tg=targets.includes(i)&&k>=2;R.box([sx(j),0,0],[.13,.13+lift(i),.13],{fill:q?mix(P.paper,P.q,SP(tok[i])?.3:.75):tg?mix(P.paper,P.q,.35):P.paper,a:fa,shadow:false})});
      if(k<3)R.label([0,0,.45],'[CLS] claim [SEP] abstract ...  '+relCE.n_tokens+' tokens in one sequence',{fs:12.5,dy:16,c:P.mute,wide:1});
      const la=k===0?0:k===1?.3*e:k>=4?.12:.3;
      for(let l=0;l<6;l++)R.glass([sx(0)-.12,.32+l*.2,-.35],[sx(seqN-1)-sx(0)+.24,0,0],[0,0,.7],{c:P.c1,a:la,nu:20,nv:2,th:.015});
      if(k===1)R.label([0,1.32,-.35],'6 layers, each attending over all 231 tokens'.replace('231',relCE.n_tokens),{fs:12.5,dy:-12,c:P.c1,a:e,wide:1});
      if(k===1||k===2){const a=k===1?e:1;links.forEach(([qi,di,w])=>{const a0=[sx(seq.indexOf(qi)),.15,0],b0=[sx(seq.indexOf(di)),.15+lift(di),0];
        R.flowArc(a0,b0,.5+.25*Math.abs(a0[0]-b0[0])/4,{c:P.q,a:a*(.35+.65*w/mxw),n:Math.max(2,Math.round(2+7*w/mxw)),r:.04+.03*w/mxw,speed:1.3,top:true})})}
      if(k===2)targets.forEach(i=>R.label([sx(seq.indexOf(i)),.31,0],tok[i],{fs:12.5,mono:true,b:1,dy:-12,c:P.q,a:e,grp:'tg'}));
      if(k===3){const c0=[sx(0),.15,0],hd=[sx(0)-.9,.6,0];R.flow([c0,[c0[0],.8,0],hd],{c:P.q,a:e,n:6});R.box([hd[0],0,0],[.3,.6,.3],{fill:mix(P.paper,P.c1,.35),a:e});
        R.label([hd[0],.6,0],'dense · tanh · linear',{fs:12,dy:-12,mono:true,a:e,wide:1});R.label([hd[0],.6,0],'logit '+relCE.predict.toFixed(2),{fs:14,b:1,c:P.q,dy:-30,a:e})}
      if(k===4)bars(R,k,e,ce,'predict',relCE,P.c2,'top 10 by cross-encoder logit')}
  }
  const full={cam:[.18,.72],bounds:[[-5.4,0,-2.1],[5.4,1.5,2.1]]};
  const st=S3.stage({id:'stg-be',list:'sx-be-bi',fig:'Fig. 2 · one claim and its abstract, apart and together',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[18,16,18,16],
    view:k=>k===4?{cam:[.3,.42],bounds:[[XB-.6,-.6,-1],[XB+3.4,1.6,1]]}:mode==='ce'?(k===3?{cam:[.25,.5],bounds:[[sx(0)-1.4,0,-.8],[sx(0)+3.2,1.6,.8]]}:{cam:[.12,.42],bounds:[[-5.3,0,-.6],[5.3,1.6,.7]]}):full});
  const sg=document.getElementById('rr-be-mode');
  if(st&&sg)RD.seg(sg,m=>{mode=m;document.getElementById('sx-be-bi').hidden=m!=='bi';document.getElementById('sx-be-ce').hidden=m!=='ce';st.list(m==='bi'?'sx-be-bi':'sx-be-ce')});
})();
