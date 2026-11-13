// ---- Scene (Reading 4, Fig. 2): what a row becomes. One real Tulu 3 row (window.PD.tok: 476 Qwen3 tokens of the open-instruct "tulu" rendering, each with
// its loss flag): two message plates, the template's headers, the token sequence as a field of cubes in reading order, then the loss mask lifting only the
// assistant's tokens. Token roles come from the rendered text itself (header strings located by character offset). ----
(function(){
  if(!document.getElementById('stg-row')||!window.PD||!PD.tok)return;const {at,lerp,mix,cl}=S3;
  const T=PD.tok,PC=T.pieces,n=PC.length,f=x=>Math.round(x).toLocaleString('en-US');
  // character offsets of every token, then its role: uh/ah header, u prompt, a answer, e end token
  const txt=PC.map(p=>p[0]).join(''),off=[];{let o=0;PC.forEach(p=>{off.push(o);o+=p[0].length})}
  const spans=[];for(const m of txt.matchAll(/<\|(user|assistant|endoftext)\|>\n?/g))spans.push([m.index,m.index+m[0].length,m[1]]);
  const role=PC.map((p,i)=>{const a=off[i],b=a+p[0].length;const s=spans.find(([x,y])=>a<y&&b>x);if(s)return s[2]==='user'?'uh':s[2]==='assistant'?'ah':'e';
    const ah=spans.find(x=>x[2]==='assistant');return a>=ah[1]?'a':'u'});
  const cU=spans.find(x=>x[2]==='user'),cA=spans.find(x=>x[2]==='assistant'),cE=spans.find(x=>x[2]==='endoftext');
  const chU=cA[0]-cU[1],chA=cE[0]-cA[1];
  const firstA=role.indexOf('a'),ahI=role.indexOf('ah');
  const COLS=28,P0=.22,CS=.17,rows=Math.ceil(n/COLS);
  const pos=i=>[(i%COLS-(COLS-1)/2)*P0,0,(Math.floor(i/COLS)-(rows-1)/2)*P0];
  // the stored row: two plates whose widths follow the characters of each message
  const ZP=-2.75,WT=6.2,wU=WT*chU/(chU+chA),wA=WT*chA/(chU+chA),HW=.42;
  function draw(R,k,e){const P=R.P;R.grid(-4.5,4.5,-3.4,2.6,.5);
    const cu=P.c1,ca=P.good,ch=P.mute;
    // 1. two message plates, then (2) headers slot in and the plates close up into one line of text
    const pk=k===0?1:k===1?1:k===2?1-.7*e:k===3?.25:.25*(1-e);
    const gap=k===0?.6:k===1?lerp(.6,0,e):0,hdr=k===0?0:k===1?e:1;
    const xs=-WT/2-(HW*2+HW)/2*hdr-gap/2;
    let x=xs;
    const piece=(w,c,lab,sub,a,isH)=>{const o=[x,.05,ZP];if(isH){R.box([x+w/2,0,ZP],[w*.9,.22,.3],{fill:mix(P.paper,P.ink,.55),a,lw:.7})}else R.glass(o,[w,0,0],[0,1.2,0],{c,a,nu:Math.max(2,Math.round(w*2)),nv:4});
      if(lab)R.label([x+w/2,isH?0:1.25,ZP],lab,{mono:true,fs:12,b:!isH,dy:isH?16:-10,c:isH?P.ink:c,a:k<3?Math.max(.5,a):a});
      if(sub&&k<2)R.label([x+w/2,0,ZP],sub,{mono:true,fs:12,dy:34,c:P.mute,a,wide:1});x+=w};
    if(hdr>0){piece(HW*hdr,ch,k>=1&&k<=2?'<|user|>':null,null,hdr*pk,true)}
    piece(wU,cu,'user',f(chU)+' characters',pk);x+=gap;
    if(hdr>0){piece(HW*hdr,ch,k>=1&&k<=2?'<|assistant|>':null,null,hdr*pk,true)}
    piece(wA,ca,'assistant',f(chA)+' characters',pk);
    if(hdr>0){piece(HW*hdr,ch,k>=1&&k<=2?'<|endoftext|>':null,null,hdr*pk,true)}
    if(k===0)R.label([0,1.6,ZP],'{"messages": [user, assistant]}',{mono:true,fs:12.5,dy:-8,c:P.mute,a:e});
    // the token slots to come, faint, so the frame is full from the first step
    if(k<2)PC.forEach((p,i)=>R.box(pos(i),[CS,.02,CS],{fill:P.paper,a:.16,shadow:false,lw:.4}));
    // 3. the token field, in reading order; (4) the loss mask lifts the graded tokens
    if(k>=2){if(k===2)R.flowArc([0,.5,ZP+.2],[0,.2,-rows*P0/2],.6,{c:P.c1,a:.8,r:.06,speed:1.5,n:12});
      PC.forEach((p,i)=>{const r=role[i],t=k===2?cl(e*1.6-(i/n)*.6,0,1):1;if(t<=0)return;const g=p[1]===1;
        const lift=k>=3?(k===3?e:1):0,hh=g?CS*(1+2.2*lift*(k===4?1-.7*e:1)):CS*(1-.75*lift);
        let fill=r==='uh'||r==='ah'?mix(P.paper,P.ink,.55):r==='u'?mix(P.paper,cu,.35):r==='e'?mix(P.paper,ca,.85):mix(P.paper,ca,.35);
        if(k>=3)fill=g?mix(fill,P.good,.55*lift):mix(fill,P.paper,.5*lift);
        const rw=Math.floor(i/COLS),near=rw===Math.floor(ahI/COLS),a=t*(k>=3&&!g?1-.45*lift:1)*(k===4&&!near?(1-e):1);
        R.box(pos(i),[CS,hh,CS],{fill,a,shadow:false,lw:.45})});
      const nG=PC.filter(p=>p[1]===1).length;
      if(k===2)R.label([0,0,pos(n-1)[2]+P0/2],f(n)+' tokens · 28 a row',{mono:true,fs:12.5,b:1,dy:18,c:P.ink,a:e});
      if(k===3){R.label([pos(COLS-1)[0]+.2,0,pos(firstA+COLS)[2]],f(nG)+' graded · '+Math.round(100*nG/n)+'%',{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.good,a:e});
        R.label([pos(0)[0]-.2,0,pos(COLS)[2]],f(n-nG)+' masked',{mono:true,fs:12.5,b:1,al:'right',dx:-8,c:P.mute,a:e})}
      if(k===3){const pe=pos(n-1);R.label([pe[0],CS*3.2,pe[2]],'<|endoftext|> · graded',{mono:true,fs:12,al:'right',dx:-10,dy:12,c:P.good,b:1,a:e,wide:1});R.glow([pe[0],CS*3.2,pe[2]],.25,{c:P.good,a:.8*e})}
      if(k===4){const ph=pos(ahI+2),pa=pos(firstA),pl=pos(ahI-1);
        R.label([ph[0],CS*.25,ph[2]],'<|assistant|> header · masked',{mono:true,fs:12.5,dy:26,c:P.ink,b:1,a:e});
        R.label([pl[0],CS*.25,pl[2]],'end of the prompt · masked',{mono:true,fs:12.5,al:'right',dx:-4,dy:-30,c:P.mute,b:1,a:e});
        R.label([pa[0],CS*1.6,pa[2]],'"'+PC[firstA][0].trim()+'": first graded token',{mono:true,fs:12.5,al:'left',dx:-6,dy:-34,c:P.good,b:1,a:e})}}
  }
  const full={cam:[.1,.78],bounds:[[-3.9,0,-3.0],[3.9,1.3,2.0]]};
  const ph=pos(ahI);
  S3.stage({id:'stg-row',list:'sx-row',fig:'Fig. 2 · one Tulu 3 row, rendered and masked',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1600,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,90,16,90],
    view:k=>k<=1?{cam:[.06,.62],bounds:[[-3.9,0,-3.0],[3.9,1.6,1.4]]}:k===4?{cam:[.05,1.2],bounds:[[ph[0]-1.9,0,ph[2]-.35],[3.2,.3,ph[2]+.35]]}:full});
})();
