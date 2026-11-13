// ---- Scene: Stage 1, the paper's Figure 1 group through three recipes (renderer v2: reward bars on the floor, per-objective advantages and the
// final advantage as signed bars on white plinths, saturation gauges as glass, flows wherever a number is carried into the next) ----
// Driven by Figure 1's printed rewards (F1 in 13_js_read.js) and the γ slider and Eq. 1 box beside it; every bar is computed here, nothing is stored.
(function(){
  if(!document.getElementById('stg-adv'))return;const {at,off,lerp,mix}=S3;
  const gEl=$('advG'),nEl=$('advN');
  const LISTS={grpo:'sx-grpo',gdpo:'sx-gdpo',sa:'sx-sa'};let mode='sa';
  const X=j=>(j-1.5)*1.9,ZR=1.9,ZM=0,ZA=-1.9,YA=1.25,AS=.5,RS=1.1,XG=4.3,DX=.3;
  const finalOf=m=>{const n=nEl.checked;if(m==='grpo')return zs(F1.f.map((v,j)=>v+F1.c[j]));if(m==='gdpo'){const a=F1.Af.map((x,j)=>x+F1.Ac[j]);return n?zs(a):a}return saAdv(+gEl.value,n)};
  const sg=v=>(Math.abs(v)<.005?'0.00':(v>0?'+':'−')+Math.abs(v).toFixed(2));
  // a white plinth at depth z: positive bars stand on it, negative ones hang below
  function plinth(R,z,a){if(a<=.01)return;R.box([0,YA-.05,z],[X(3)-X(0)+1.5,.05,.44],{a,shadow:false});[X(0)-.65,X(3)+.65].forEach(x=>R.box([x,0,z],[.03,YA-.05,.03],{a:a*.7}))}
  function bar(R,x,z,v,col,a,w,lab,o){if(a<=.01)return;o=o||{};const h=Math.max(.012,Math.abs(v)*AS);
    R.box([x,v>=0?YA:YA-.05-h,z],[w,h,.26],{fill:v>=0?col:mix(R.P.paper,col,.45),a,shadow:false,lw:.7});
    if(lab)R.label([x,v>=0?YA+h:YA-.05-h,z],sg(v),Object.assign({mono:true,fs:12,b:1,dy:v>=0?-10:12,c:col,a},o))}
  function draw(R,k,e){const P=R.P,g=+gEl.value,wf=Math.pow(1-F1.s[0],g),wc=Math.pow(1-F1.s[1],g),fin=finalOf(mode);
    R.grid(-4.4,mode==='sa'?6:3.6,-2.8,2.8,.5);
    const last=mode==='grpo'?2:mode==='gdpo'?3:4;
    // 1. the rewards on the floor, in front: format (orange) and correctness (teal) per answer; they recede once the advantages exist
    const rA=k===0?1:mode==='grpo'?(k<2?1:lerp(1,.3,e)):k===1?lerp(1,.3,e):.3;
    for(let j=0;j<4;j++){const t=mode==='grpo'?(k===1?e:k>1?1:0):0,hf=F1.f[j]/100*RS,hc=Math.max(.02,F1.c[j]/100*RS);
      // GRPO: the two bars slide together into one stacked sum
      R.box([X(j)-DX*(1-t),0,ZR],[.5,hf,.5],{fill:P.c2,a:rA});R.box([X(j)+DX*(1-t),t>0?hf*t:0,ZR],[.5,hc,.5],{fill:P.c3,a:rA});
      R.label([X(j),0,ZR+.3],'answer '+(j+1),{fs:12.5,dy:14,c:P.mute,a:Math.max(.55,rA)});
      if(t<1){R.label([X(j)-DX,hf,ZR],String(F1.f[j]),{mono:true,fs:12,dy:-10,c:P.c2,a:rA*(1-t),al:'right',dx:2});R.label([X(j)+DX,hc,ZR],String(F1.c[j]),{mono:true,fs:12,dy:-10,c:P.c3,a:rA*(1-t),al:'left',dx:-2})}
      if(mode==='grpo'&&k>=1)R.label([X(j),hf+hc,ZR],'sum '+(F1.f[j]+F1.c[j]),{mono:true,fs:12,b:1,dy:-10,c:P.ink,a:(k===1?e:1)*Math.max(.5,rA)})}
    R.label([X(0)-.9,.5,ZR],'rewards / 100',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'rows'});
    // 2. per-objective advantages (GDPO and SA-MRPO) side by side on one plinth: each objective standardised within the group
    if(mode!=='grpo'){
      const fOn=at(k,e,1),cOn=mode==='gdpo'?at(k,e,2):at(k,e,1),pl=Math.max(fOn,cOn),recede=k===last?lerp(1,.3,e):k===2&&mode==='sa'?.55:1;
      const sf=mode==='sa'&&k>=3?lerp(1,wf,k===3?e:1):1,scc=mode==='sa'&&k>=3?lerp(1,wc,k===3?e:1):1;
      plinth(R,ZM,pl*recede);R.label([X(0)-.9,YA,ZM],'advantage per objective',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'rows',a:pl});
      // values are labelled on the step that introduces them (SA-MRPO: format's, the ones the discount will shrink); the list gives the rest
      const showF=(mode==='gdpo'&&k===1)||(mode==='sa'&&k===1),showC=mode==='gdpo'&&k===2;
      for(let j=0;j<4;j++){bar(R,X(j)-DX,ZM,F1.Af[j]*sf,P.c2,fOn*recede,.5,showF,{al:'right',dx:4});bar(R,X(j)+DX,ZM,F1.Ac[j]*scc,P.c3,cOn*recede,.5,showC,{al:'left',dx:-4})}
      if((mode==='gdpo'&&k===1)||(mode==='sa'&&k===1))for(let j=0;j<4;j++)R.flowArc([X(j)-DX,F1.f[j]/100*RS+.05,ZR],[X(j)-DX,YA+.1,ZM],.45,{c:P.c2,a:e*.85,r:.06,n:5});
      if((mode==='gdpo'&&k===2)||(mode==='sa'&&k===1))for(let j=0;j<4;j++)R.flowArc([X(j)+DX,.1,ZR],[X(j)+DX,YA+.1,ZM],.6,{c:P.c3,a:e*.85,r:.06,n:5});
      // SA-MRPO: saturation gauges (glass) filled to s, then the weight (1 - s)^γ that scales each objective's bars
      if(mode==='sa'&&k>=2){const ga=k===2?e:1;
        [[XG,F1.s[0],wf,P.c2,'format',-1],[XG+1.4,F1.s[1],wc,P.c3,'correct',1]].forEach(([x,s,w,c,nm,sd])=>{const al=sd<0?'right':'left',dx=sd*2;
          R.glass([x-.3,0,ZM],[.6,0,0],[0,1.5,0],{c,a:ga*.9,nu:2,nv:10});R.box([x,0,ZM+.02],[.5,Math.max(.02,s*1.5*(k===2?e:1)),.12],{fill:c,a:ga*.85,shadow:false});
          R.label([x,1.5,ZM],nm,{fs:12.5,b:1,dy:-26,c,a:ga,al,dx,wide:1});R.label([x,1.5,ZM],'s = '+s.toFixed(2),{mono:true,fs:12,dy:-10,c,a:ga,al,dx});
          if(k>=3)R.label([x,0,ZM],'w = '+(w<.01?w.toExponential(1):w.toFixed(2)),{mono:true,fs:12,b:1,dy:16,c,a:k===3?e:1,al,dx})});
        if(k===2)for(let j=0;j<4;j++){R.flowArc([X(j)-DX,F1.f[j]/100*RS,ZR],[XG,1.3,ZM],.5,{c:P.c2,a:e*.6,r:.05,n:4});R.flowArc([X(j)+DX,.06,ZR],[XG+1.4,.3,ZM],.4,{c:P.c3,a:e*.6,r:.05,n:4})}
        if(k===3){R.flowArc([XG,1.55,ZM],[X(3)+.65,YA+.2,ZM],.4,{c:P.c2,a:e*.8,r:.05,n:3});R.flowArc([XG+1.4,1.55,ZM],[X(3)+.65,YA+.2,ZM],.6,{c:P.c3,a:e*.8,r:.06,n:7})}}
    }
    // 3. the final advantage, at the back, flows from what it is built from (dot count by the size carried)
    if(k===last){plinth(R,ZA,e);R.label([X(0)-.9,YA,ZA],'advantage',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,grp:'rows',a:e});
      for(let j=0;j<4;j++){bar(R,X(j),ZA,fin[j],P.c1,e,.7,true,{c:P.ink});
        if(mode==='grpo')R.flowArc([X(j),F1.f[j]/100*RS+.2,ZR],[X(j),YA+.1,ZA],.8,{c:P.c1,a:e*.8,r:.06,n:6});
        else{const cf=mode==='sa'?wf:1,cc=mode==='sa'?wc:1,nf=Math.round(1+3*Math.min(1.5,Math.abs(F1.Af[j]*cf))),nc=Math.round(1+3*Math.min(1.5,Math.abs(F1.Ac[j]*cc)));
          if(Math.abs(F1.Af[j]*cf)>.02)R.flowArc([X(j)-DX,YA+.1,ZM],[X(j)-.1,YA+.1,ZA],.4,{c:P.c2,a:e*.8,r:.055,n:nf});
          R.flowArc([X(j)+DX,YA+.1,ZM],[X(j)+.1,YA+.1,ZA],.4,{c:P.c3,a:e*.8,r:.055,n:nc})}}
      // answers 2 and 3: the pair the paper's figure boxes
      [1,2].forEach(j=>R.glow([X(j),YA+.02,ZA],.6,{c:mode==='gdpo'&&j===2?P.bad:P.c1,a:e*.35}))}
  }
  const bnd=()=>mode==='sa'?[[-4.2,0,-2.3],[5.6,2.1,2.3]]:[[-4.2,0,-2.3],[3.5,2.1,2.3]];
  const st=S3.stage({id:'stg-adv',list:LISTS[mode],fig:'Stage 1 · Figure 1 rebuilt: one group, three recipes',cam:[.32,.72],bounds:()=>bnd(),aspect:.6,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,104],onStep:()=>cnt(),
    // the first step is about the rewards alone: the camera starts close on them, then pulls back for the rows the recipe builds
    view:k=>k===0?{cam:[.3,.6],bounds:[[-3.6,0,1.3],[3.4,1.2,2.5]]}:null});
  function cnt(){const g=+gEl.value,fa=finalOf(mode),pr={grpo:[-1.41,0,0,1.41],gdpo:[-2.07,0.20,0.61,1.25],sa:[-0.74,-0.23,-0.69,1.65]}[mode];
    let h='';if(mode==='sa'){const fw=v=>v<0.01&&v>0?v.toExponential(1):v.toFixed(3);h+=stat('weights now','format '+fw(Math.pow(0.02,g))+' · correctness '+fw(Math.pow(0.98,g)),'ratio (0.02/0.98)<sup>γ</sup> = '+fw(Math.pow(0.02/0.98,g)))}
    h+=stat('final advantages',fa.map(sgn).join(', '),'printed in Figure 1: '+pr.map(sgn).join(', '));
    const rk=[0,1,2,3].sort((x,y)=>fa[y]-fa[x]).map(j=>j+1);h+=stat('ranking',rk.join(' > '),fa[1]===fa[2]?'answers 2 and 3 tie':'');$('advCnt').innerHTML=h}
  const lab=()=>{$('advGv').textContent=(+gEl.value).toFixed(2)};lab();cnt();
  gEl.addEventListener('input',()=>{lab();cnt();st&&st.draw()});nEl.addEventListener('change',()=>{cnt();st&&st.draw()});
  const seg=$('advM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    mode=b.dataset.m;Object.keys(LISTS).forEach(m=>{$(LISTS[m]).hidden=m!==mode});cnt();st&&st.list(LISTS[mode])}));
  window.SC_ADV={st,mode:()=>mode};
})();
