// ---- Scene: Fig. 3, MMMU's blind baseline and MMMU-Pro (stg-mm, renderer v2). A question card (image as a glass plate, text lines, option discs) and
// one column per setting, height = accuracy on MMMU validation. Blind test: MMStar Table 3 (GPT-4V in front, Gemini Pro Vision behind), window.LD.mmstar.
// MMMU-Pro: Table 1 of arXiv 2409.02813v3, window.LD.mmmupro (GPT-4o in front; in the last step every model of the table as a row: MMMU validation
// against the MMMU-Pro score, the mean of the 10-option and vision-only settings). ----
(function(){
  if(!document.getElementById('stg-mm')||!window.S3||!window.LD)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1),M=LD.mmstar,PRO=LD.mmmupro.filter(r=>!/choice|Human/.test(r[0])),RND=LD.mmmupro[0];
  const g4=M['GPT-4V'],gp=M['GeminiPro-Vision'],pro=r=>Math.round((r[2]+r[3])/2*100)/100;
  const rows=PRO.map(r=>({m:r[0],val:r[4],f4:r[1],o10:r[2],vis:r[3],pro:pro(r),drop:Math.round((r[4]-pro(r))*100)/100}));
  (window.LCS=window.LCS||{}).mm={random:M.random,g4,gp,rows,rnd4:RND[1],rnd10:RND[2]};
  const X=[-3.4,-2.15,-.9,.35,1.6],HS=2.6,H=v=>v/100*HS,CX=3.55,CZ=.9,ZR=i=>CZ-(i+1)*.5;
  let mode='blind';
  function card(R,P,k,e,a){const blind=mode==='blind',lift=blind?(k===1?win(e,0,.6):k===2?1:k===3?1-win(e,0,.5):0):0;
    const shot=!blind?(k===3?win(e,.1,.8):k>3?1:0):0,nopt=!blind&&k>=2?(k===2?Math.round(lerp(4,10,win(e,.1,.7))):10):4;
    R.box([CX,0,CZ],[1.95,1.4,.08],{fill:P.paper,a});
    // the image: lifted away in the blind test, grown to the whole card in the vision-only setting
    const o0=[lerp(CX-.85,CX-.9,shot),lerp(.62,.08,shot)+lift*.75,CZ+.05],w=lerp(.8,1.8,shot),h=lerp(.62,1.22,shot);
    if(lift>0)R.quad([[CX-.85,.62,CZ+.05],[CX-.05,.62,CZ+.05],[CX-.05,1.24,CZ+.05],[CX-.85,1.24,CZ+.05]],{a:a*lift*.7,ec:P.line,dash:[3,3],lw:1});
    R.glass(o0,[w,0,0],[0,h,0],{c:P.c1,a:a*(1-.8*lift),nu:4,nv:3,th:.02});
    // the question text and the options: on the card, then moving onto the image (one screenshot)
    [[1.12,.62],[1.0,.5],[.88,.56]].forEach(([y,l],i)=>{const x=lerp(CX+.4,CX-.25+.0*i,shot),yy=lerp(y,y-.12,shot);R.box([x,yy,CZ+.06],[l,.05,.02],{fill:mix(P.paper,P.ink,.55),a,shadow:false,edge:false,dz:-.5})});
    for(let i=0;i<nopt;i++){const x0=CX-.78+i*.165,y0=.3,x=lerp(x0,CX-.6+(i%5)*.3,shot),y=lerp(y0,i<5?.42:.24,shot);R.ball([x,y,CZ+.08],.06,{c:i===0?P.good:mix(P.paper,P.mute,.6),a,top:1})}
    if(!blind&&k>=1)R.label([CX,0,CZ+.1],nopt+' options'+(shot>.5?' · one screenshot':''),{fs:12,b:1,dy:14,a:a>.9?a:0,c:shot>.5?P.c1:P.ink,wide:1});
    if(blind&&lift>.3)R.label([CX-.45,1.24+lift*.75,CZ+.05],'image removed',{fs:12,b:1,dy:-10,c:P.c1,a:a*lift})}
  function col(R,P,x,z,v,a,fill,lab,o){o=o||{};if(a<=.01)return;R.box([x,0,z],[.62,Math.max(.01,H(v)*a),.5],{fill,a:o.al==null?1:o.al,shadow:!o.ns});
    if(lab)R.label([x,H(v)*a,z],lab,{mono:true,fs:12.5,b:1,dy:-11,a:Math.min(1,a*1.6)*(o.al==null?1:o.al),c:o.c})}
  function draw(R,k,e){const P=R.P,blind=mode==='blind';R.grid(-6.2,5,blind?-1:-5,2.2,.5);
    const at=(s,e0,e1)=>k>s?1:k===s?win(e,e0==null?.3:e0,e1==null?.75:e1):0;
    let names,vals,cols;
    if(blind){names=['random','text-only LLM','blind','with image'];vals=[M.random,g4.llm[1],g4.blind,g4.full];
      cols=[mix(P.paper,P.mute,.35),mix(P.paper,P.c5,.5),mix(P.paper,P.bad,.6),mix(P.paper,P.good,.6)]}
    else{const r=rows[0];names=['MMMU val','filtered','10 options','screenshot','MMMU-Pro'];vals=[r.val,r.f4,r.o10,r.vis,r.pro];
      cols=[mix(P.paper,P.acc,.3),mix(P.paper,P.c6,.5),mix(P.paper,P.c5,.5),mix(P.paper,P.bad,.6),mix(P.paper,P.acc,.75)]}
    const last=blind?3:4,fieldA=!blind&&k===4?win(e,.35,.9):0,backA=blind&&k===3?win(e,.4,.9):0;
    card(R,P,k,e,1-.6*fieldA);
    // the question set behind the card (MMMU-Pro): half of it leaves at the filter
    if(!blind)for(let i=0;i<8;i++){const gone=i%2===1,fa=gone?(k===0?1:k===1?1-win(e,0,.6):0):1,z=CZ-.18-i*.09;
      R.box([CX,gone&&k===1?win(e,0,.6)*.8:0,z],[1.95,1.4,.03],{fill:P.paper,a:fa*.5*(1-.6*fieldA),shadow:false,lw:.6})}
    if(!blind&&k>=1)R.label([CX,0,CZ+.1],k===1?'text-answerable questions removed':'1,730 questions remain',{fs:12,dy:31,c:P.mute,a:1-fieldA,wide:1});
    // the columns, one per step, each fed by the card while it rises
    vals.forEach((v,j)=>{const a=j===0?(k===0?win(e,.2,.7):1):at(j),cur=j===k,fade=j<k&&k!==last?.55:1;
      col(R,P,X[j],CZ,v,a,cols[j],R.W<520&&!cur&&j!==0&&!(k===last&&j===last)?null:v.toFixed(j===4?2:1)+'%',{al:fade});
      R.label([X[j],0,CZ+.28],names[j],{fs:12,dy:j%2?30:14,b:cur,c:cur?P.ink:P.mute,a:a>0?1:.45,wide:1})});
    if(k<=last){const v=vals[k],a=k===0?win(e,0,.6):1;R.flowArc([CX-.9,.75,CZ],[X[k]+.2,H(v)+.05,CZ],.6,{c:blind&&(k===1||k===2)?P.c5:P.c1,n:Math.max(3,Math.round(v/7)),r:.075,a:a*(1-fieldA)})}
    // what the image adds: blind to with-image, GPT-4V
    if(blind&&k===3){const a=win(e,.5,1),x=X[3]+.5;R.line([[x,H(g4.blind),CZ],[x,H(g4.full),CZ]],{c:P.acc,w:2.5,a});R.label([x,(H(g4.blind)+H(g4.full))/2,CZ],'image +'+(g4.full-g4.blind).toFixed(1),{al:'left',dx:7,fs:12.5,b:1,c:P.acc,a})}
    // Gemini Pro Vision behind (blind, last step)
    if(backA>.01){const z=CZ-1.25,gv=[M.random,gp.llm[1],gp.blind,gp.full];gv.forEach((v,j)=>col(R,P,X[j],z,v,backA,cols[j],R.W<520?null:v.toFixed(1)+'%',{al:.8,ns:1}));
      R.label([X[0]-.45,.05,z],'Gemini Pro Vision',{al:'right',dx:-6,fs:12,b:1,a:backA,wide:1});R.label([X[0]-.45,.05,CZ],'GPT-4V',{al:'right',dx:-6,fs:12,b:1,a:backA,wide:1})}
    // every model of Table 1 (MMMU-Pro, last step): MMMU validation (pale) and the MMMU-Pro score (dark), one row each
    if(fieldA>.01){rows.forEach((r,i)=>{const z=i===0?CZ:ZR(i-1);if(i>0){col(R,P,X[0],z,r.val,fieldA,cols[0],null,{ns:1});col(R,P,X[4],z,r.pro,fieldA,cols[4],null,{ns:1});
        R.line([[X[0]+.31,H(r.val),z],[X[4]-.31,H(r.pro),z]],{c:P.mute,w:1,a:fieldA*.6,dash:[3,3]})}
      R.label([X[0]-.45,.05,z],r.m+' · −'+r.drop.toFixed(1),{al:'right',dx:-6,fs:12,mono:true,grp:'row',a:fieldA,b:i===0,c:r.m.startsWith('LLaVA')?P.bad:i===0?P.ink:P.mute})})}
  }
  const narrow=()=>(document.getElementById('stg-mm').clientWidth||999)<520,B=()=>mode==='blind'?[[narrow()?-4.0:-5.2,0,-.6],[4.7,2.0,1.6]]:[[-6.6,0,-4.8],[4.7,2.2,1.5]];
  const st=S3.stage({id:'stg-mm',list:'sx-mm-blind',fig:'Fig. 3 · MMMU validation, with and without the image',cam:[-.25,.74],bounds:()=>B(),aspect:.55,dur:2200,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,40,16],
    view:k=>mode==='blind'?(narrow()?{cam:[-.62,.66]}:null):k===4?{cam:[-.2,.85],bounds:B()}:{cam:[-.25,.7],bounds:[[-4.1,0,-.2],[4.7,2.2,1.6]]}});
  document.querySelectorAll('#mm-mode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#mm-mode button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;
    ['blind','pro'].forEach(m=>{document.getElementById('sx-mm-'+m).hidden=m!==mode});st.host.querySelector('.stg-top span').textContent=mode==='blind'?'Fig. 3 · MMMU validation, with and without the image':'Fig. 3 · MMMU-Pro, three fixes, GPT-4o and every model';st.list('sx-mm-'+mode)}));
  LCS.mmStage=st;
})();
