// ---- Scene: Fig. 1, four graders and how each can be wrong while the model is right (stg-gr, renderer v2) ----
// Four grading stations in a row, each a glass plate (the grader) between what the model produced (front) and the verdict (back), with dots flowing
// through it. Items are the page's own: the ARC-Challenge question Mercury_7175875 (key C, window.KR.items.arc_c), SimpleQA's paper example
// (key Michio Sugeno) and ARC-AGI-1 task 007bbfb7, whose first demonstration graded against Rule B's output is computed here from window.KR.arc.
// The model's answer texts and the four option probabilities are illustrative and labelled so on the page.
(function(){
  if(!document.getElementById('stg-gr')||!window.S3||!window.KR)return;const {at,mix,lerp,cl}=S3;
  const K=window.KR,item=K.items.arc_c,KEY='ABCD'[item.a],T=K.arc.find(t=>t.id==='007bbfb7'),D=T.train[0];
  const ruleB=g=>{const o=[];for(let r=0;r<9;r++){o.push([]);for(let c=0;c<9;c++)o[r].push(g[Math.floor(r/3)][Math.floor(c/3)])}return o};
  const ATT=ruleB(D.input),EXP=D.output;let RIGHT=0;for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(ATT[r][c]===EXP[r][c])RIGHT++;
  window.KRS=window.KRS||{};KRS.gr={key:KEY,id:item.id,right:RIGHT};
  const X=[-4.8,-1.6,1.6,4.8],ZI=1.15,ZP=0,ZV=-1.2,PH=.6;
  const PR=[.08,.21,.55,.16]; // illustrative probabilities for options A to D
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  function slip(R,P,c,txt,a,show,col){R.box(c,[.9,.09,.32],{fill:col?mix(P.paper,col,.18):P.paper,a,shadow:a>.5});if(show)R.label([c[0]-.5,.05,c[2]],txt,{mono:true,fs:12,al:'right',dx:-4,a})}
  function tile(R,P,x,z,s,v,a,y,hl){R.box([x,y||0,z],[s*.92,.05,s*.92],{fill:KU.ARC[v],a,shadow:false,lw:.5,ec:hl?P.bad:null});if(hl)R.glow([x,(y||0)+.06,z],s*.9,{c:P.bad,a:a*.8})}
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6.6,-1.9,2.3,.5);
    const COL=[P.c1,P.k,P.v,P.q],NAME=R.W<520?['Letter','Log-lik.','Judge','Exact']:['Letter (regex)','Log-likelihood','LLM judge','Exact output'];
    const foc=i=>k===0||k===5?1:k===i+1?1:.2,close=i=>k===i+1,ea=i=>k===i+1?e:1;
    X.forEach((x,i)=>{const a=foc(i),c=COL[i];
      R.glass([x-.95,.04,ZP],[1.9,0,0],[0,PH,0],{c,a:a*.9,nu:6,nv:3});
      if(a>.5&&!close(i))R.label([x,0,1.9],NAME[i],{b:1,fs:13,dy:12})});
    // 1. letter: two answers that both choose the key; the extraction rule matches only one way of writing it
    {const x=X[0],a=foc(0),cz=close(0),t=ea(0),A=[x+.35,.01,ZI+.3],B=[x+.35,.01,ZI-.3];
      slip(R,P,A,'"...answer is ('+KEY+')"',a,cz,null);slip(R,P,B,'"...so '+KEY+' is correct"',a,cz,null);
      if(cz){R.label([x,PH*.55,ZP],'answer is \\(?([A-J])',{mono:true,fs:12.5,b:1,c:P.c1});R.label([x-.95,0,ZV],'key: '+KEY,{mono:true,fs:12,al:'right',dx:-6,c:P.mute})}
      R.flow([[A[0]-.25,.12,A[2]],[x-.3,.35,ZP],[x-.6,.3,ZV+.2]],{c:P.c1,a:a*.85,r:.06});R.flow([[B[0]+.25,.12,B[2]],[x+.4,.35,ZP+.05]],{c:P.c1,a:a*.85,r:.06});
      const g=k===1?win(t,.35,1):1;R.box([x-.6,0,ZV],[.55,Math.max(.01,.5*g),.4],{fill:mix(P.paper,P.good,.55),a});
      R.box([x+.6,0,ZV],[.55,.02,.4],{fill:mix(P.paper,P.bad,.5),a});
      if(cz){R.label([x-.6,.5*g,ZV],KEY+': right',{fs:12.5,b:1,dy:-11,c:P.good,a:g});R.label([x+.6,.02,ZV],'no match: 0',{fs:12.5,b:1,dy:-11,c:P.bad,a:g})}
      else if(k===5)R.label([x,.5,ZV],'same answer: 1 and 0',{fs:12.5,b:1,dy:-11,c:P.bad,wide:1})}
    // 2. log-likelihood: no text, the option with the highest probability wins
    {const x=X[1],a=foc(1),cz=close(1),t=ea(1);
      R.box([x,0,ZI],[1.9,.04,.42],{a,shadow:false});
      PR.forEach((p,j)=>{const bx=x-.72+j*.48,h=Math.max(.02,p/.55*.5*(k===2?win(t,0,.5):1)),win1=j===item.a;
        R.box([bx,.04,ZI],[.3,h,.28],{fill:win1?mix(P.paper,P.k,.6):mix(P.paper,P.mute,.25),a,shadow:false});
        if(cz){R.label([bx,.04+h,ZI],p.toFixed(2),{mono:true,fs:12,dy:-10,c:win1?P.k:P.mute});R.label([bx,0,ZI+.2],'ABCD'[j],{fs:12.5,b:win1,dy:12})}
        R.flow([[bx,.04+h,ZI],[bx,.4,ZP],[x,.3,ZV+.2]],{c:P.k,a:a*(.25+p*1.4),r:.035+p*.08,n:Math.max(2,Math.round(3+p*10))})});
      const g=k===2?win(t,.45,1):1;R.box([x,0,ZV],[.6,Math.max(.01,.5*g),.4],{fill:mix(P.paper,P.k,.55),a});
      if(cz){R.label([x,PH*.55,ZP],'pick the most probable option',{fs:12.5,b:1,c:P.k});R.label([x,.5*g,ZV],'argmax: '+KEY,{fs:12.5,b:1,dy:-11,c:P.k,a:g})}
      else if(k===5)R.label([x,.5,ZV],'argmax: '+KEY,{fs:12.5,b:1,dy:-11,c:P.k,wide:1})}
    // 3. LLM judge: free text against the key; only the judge can say the two strings name the same thing
    {const x=X[2],a=foc(2),cz=close(2),t=ea(2),A=[x+.35,.01,ZI+.3],B=[x+.35,.01,ZI-.3];
      slip(R,P,A,'answer: "Sugeno, Michio"',a,cz,null);slip(R,P,B,'key: "Michio Sugeno"',a,cz,P.mute);
      R.flow([[A[0]-.2,.12,A[2]],[x-.15,.35,ZP]],{c:P.v,a:a*.8,r:.06});R.flow([[B[0]+.2,.12,B[2]],[x+.15,.35,ZP]],{c:P.v,a:a*.8,r:.06});
      const g=k===3?win(t,.4,1):1,O=[['correct',P.good,.5*g],['incorrect',P.bad,.02],['not attempted',P.mute,.02]];
      R.flow([[x,.35,ZP],[x-.68,.3,ZV+.2]],{c:P.v,a:a*.8*g,r:.06});
      O.forEach(([n,cc,h],j)=>{const bx=x-.68+j*.68;R.box([bx,0,ZV],[.46,Math.max(.01,h),.4],{fill:mix(P.paper,cc,j?.3:.55),a});
        if(cz)R.label([bx,h,ZV],n,{fs:12,dy:-11,b:!j,c:j?P.mute:P.good,a:j?1:Math.max(.3,g)})});
      if(cz)R.label([x,PH*.55,ZP],'judge: the same answer?',{fs:12.5,b:1,c:P.v});
      else if(k===5)R.label([x,.5,ZV],'judged correct',{fs:12.5,b:1,dy:-11,c:P.good,wide:1})}
    // 4. exact output: the whole grid, every cell; Rule B's attempt at task 007bbfb7's first demonstration
    {const x=X[3],a=foc(3),cz=close(3),t=ea(3),s=.15,g=k===4?win(t,.35,1):k===5?1:0;
      for(let r=0;r<9;r++)for(let c=0;c<9;c++){const px=x+(c-4)*s,bad=ATT[r][c]!==EXP[r][c];
        tile(R,P,px,ZI+(r-4)*s*.85-.05,s,ATT[r][c],a,bad?.22*g:0,bad&&g>.05);
        tile(R,P,px,ZV+(r-4)*s*.85,s,EXP[r][c],a*(k===4?Math.max(.35,win(t,0,.4)):1),0,false)}
      R.flow([[x,.15,ZI-.65],[x,.4,ZP],[x,.15,ZV+.6]],{c:P.q,a:a*.8,r:.06});
      if(cz){R.label([x-.7,0,ZI-.05],'attempt',{fs:12,al:'right',dx:-6,c:P.mute});R.label([x-.7,0,ZV],'expected',{fs:12,al:'right',dx:-6,c:P.mute});
        R.label([x,PH*.55,ZP],'every cell must match',{fs:12.5,b:1,c:P.q});R.label([x,0,ZI+.6],RIGHT+' of 81 cells right: score 0',{fs:13,b:1,c:P.bad,a:g,dy:12})}
      else if(k===5)R.label([x,.3,ZV-.7],RIGHT+' of 81 right: 0',{fs:12.5,b:1,c:P.bad,wide:1,dy:-6})}
  }
  const full={cam:[0,.78],bounds:[[-6.2,0,-1.8],[6.2,.8,2.2]]};
  S3.stage({id:'stg-gr',list:'sx-gr',fig:'Fig. 1 · four graders, real items',cam:full.cam,bounds:full.bounds,aspect:.45,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[20,16,18,16],
    view:k=>k>=1&&k<=4?{cam:[(k-2.5)*.1,.56],bounds:[[X[k-1]-1.45,0,-1.55],[X[k-1]+1.45,.75,1.85]]}:full});
})();
