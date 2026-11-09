// ---- Scene: Fig. 1, one real HMMT February 2026 answer through extraction and three checkers (stg-ck, renderer v2) ----
// Everything drawn is the page's own data: window.CKD (written by src/mk_check_example.py from MathArena/hmmt_feb_2026_outputs) and the problem
// statement from window.MA. On the left, all answers to problem 7 as a cube field coloured by MathArena's released grade, grouped by parsed value;
// then four stations, each a glass plate between what goes in (front) and the verdict (back): extract the last \boxed{}, exact string match,
// normalised string match, symbolic equality. The last step sends GPT-5.2 (high)'s Cardano-form answer through the parser.
(function(){
  if(!document.getElementById('stg-ck')||!window.S3||!window.CKD||!window.MA)return;const {mix,cl}=S3;
  const D=CKD,E0=D.endings[0],E2=D.endings[2];
  const cnt=(a,ok)=>D.p7_by_parse.filter(x=>x.parsed===a&&(ok==null||x.correct===ok)).reduce((s,x)=>s+x.n,0);
  const n13=cnt('1/3'),n13r=cnt('1/3',true),n3=cnt('3'),n3r=cnt('3',true),nform=cnt('(1 - sqrt(6)/3)**(1/3)',true);
  const box=s=>s.replace(/^\\boxed\{/,'').replace(/\}\.?$/,'');
  const KEY='(3+\\sqrt{6})^{-1/3}',ANS=box(E0.boxed),SYM_KEY='(3 + sqrt(6))**(-1/3)';
  const light=s=>s.replace(/\s+/g,'').replace(/\\left|\\right/g,'').replace(/\\dfrac/g,'\\frac').replace(/\\sqrt(\d)/g,'\\sqrt{$1}');
  const right=D.p7_by_parse.filter(x=>x.correct).reduce((s,x)=>s+x.n,0);
  // what the step list quotes, for src/check_stages.mjs
  window.MAS=window.MAS||{};MAS.ck={answers:D.p7_answers,right,wrong:D.p7_answers-right,exact:D.p7_right_boxed_identical_to_key,norm:D.p7_right_boxed_equal_after_light_normalisation,
    form:nform,n13,n13r,n3,n3r,nonint:D.non_integer_keys.length,problems:D.problems,ans:ANS,lightAns:light(ANS),key:KEY,lightKey:light(KEY)};
  // the problem statement beside the stage
  const hm=MA.comps.find(c=>c.k==='hmmt_feb_2026'),prob=hm&&hm.probs.find(p=>p.i===7),pe=document.getElementById('ck-prob');
  if(pe&&prob)pe.innerHTML='<span class="plab">HMMT February 2026, problem 7</span>'+prob.q+' <span class="gold">key: (3+√6)<sup>−1/3</sup></span>';
  // the answer field: one cube per answer, grouped by parsed value in the order of CKD.p7_by_parse (largest group first)
  const CELLS=[];D.p7_by_parse.forEach(g=>{for(let i=0;i<g.n;i++)CELLS.push({ok:g.correct,form:g.parsed==='(1 - sqrt(6)/3)**(1/3)'&&g.correct,trunc:g.parsed==='1/3'||g.parsed==='3'})});
  const NC=8,FS=.21,FX=-6.55,X=[-3.5,-.45,2.6,5.65],ZI=1.05,ZV=-1.05,PH=.62;
  const fpos=i=>[FX+(i%NC-(NC-1)/2)*FS,0,(Math.floor(i/NC)-6.5)*FS];
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  function slip(R,P,c,w,txt,a,col,lab){R.box(c,[w,.08,.3],{fill:col?mix(P.paper,col,.22):P.paper,a,shadow:a>.5});if(lab)R.label([c[0]-w/2,.08,c[2]],txt,{mono:true,fs:12,al:'right',dx:-8,a,c:col||P.ink})}
  function verdict(R,P,x,ok,h,a,txt,show,dx,al,dz){dz=dz||0;const c=ok?P.good:P.bad;R.box([x+(dx||0),0,ZV+dz],[.62,Math.max(.012,h),.42],{fill:mix(P.paper,c,.55),a});if(show)R.label([x+(dx||0)+(al==='right'?-.36:.36),h*.5,ZV+dz],txt,{fs:12.5,b:1,al:al||'left',dx:al==='right'?-8:8,c})}
  function draw(R,k,e){const P=R.P;R.grid(-8,7,-2,2.4,.5);
    const foc=i=>k===0?1:k===i+1||(k===5&&i===3)?1:.12,close=i=>k===i+1||(k===5&&i===3);
    const NAME=R.W<520?['Extract','Exact','Normalised','Symbolic']:['Extract \\boxed{}','Exact string','Normalised string','Symbolic'];
    // the field of all answers (overview only)
    const fa=k===0?1:.06;
    CELLS.forEach((c,i)=>{const p=fpos(i);R.box(p,[FS*.84,FS*.84,FS*.84],{fill:mix(P.paper,c.ok?P.good:P.bad,.6),a:fa,shadow:false,lw:.5})});
    if(k===0){R.label([FX,.2,-1.6],D.p7_answers+' answers',{b:1,fs:13,c:P.ink,dy:-8,wide:1});R.label([FX,0,1.6],right+' right · '+(D.p7_answers-right)+' wrong',{fs:12.5,dy:14,c:P.mute,wide:1})}
    // the four stations
    X.forEach((x,i)=>{const a=foc(i);
      R.glass([x-.95,.04,0],[1.9,0,0],[0,PH,0],{c:i===3?P.c3:i===0?P.c5:P.c1,a:a*.9,nu:6,nv:3});
      if(k===0){R.label([x,0,1.75],NAME[i],{b:1,fs:13,dy:14,c:P.ink});if(i)R.label([x,0,1.75],i<3?'rejects the right answer':'accepts it',{fs:12,dy:31,c:i<3?P.bad:P.good,wide:1})}});
    // station 0: the output, its last \boxed{} lit, and the extracted string leaving for the checkers
    {const x=X[0],a=foc(0),cz=close(0);
      R.box([x-.25,0,ZI],[1.6,.12,.42],{a});R.box([x+.42,.12,ZI],[.5,.04,.42],{fill:mix(P.paper,P.c5,.6),a,shadow:false});
      R.flow([[x+.42,.2,ZI],[x+.2,.4,0],[x+.1,.3,ZV+.2]],{c:P.c5,a:a*.85,r:.06});
      const g=k===1?win(e,.3,1):1;slip(R,P,[x+.1,0,ZV],1.3,'',a*g,P.c5,false);
      if(cz){R.label([x-.6,.12,ZI+.2],'… the whole derivation …',{fs:12.5,dy:16,c:P.mute});R.label([x+.67,.16,ZI],'last \\boxed{}',{mono:true,fs:12,b:1,c:P.c5,al:'left',dx:8});
        R.label([x+.95,PH*.6,0],'keep the last \\boxed{}',{fs:12.5,b:1,c:P.c5,al:'left',dx:10});R.label([x+.1,.08,ZV],ANS,{mono:true,fs:12,dy:-12,c:P.c5,a:g})}}
    // stations 1 to 3: the answer and the key go in; the verdict comes out
    const IN=[[ANS,KEY,'same string?'],[light(ANS),light(KEY),'same after cleaning?'],[E0.parsed,SYM_KEY,'simplify(a − b) = 0?']];
    [1,2,3].forEach(i=>{const x=X[i],a=foc(i),cz=close(i)&&k!==5,ok=i===3,[s1,s2,q]=IN[i-1];
      if(k===5&&i===3){// the last step: GPT-5.2 (high)'s Cardano-form answer, truncated by the parser; the released grade disagrees with it
        R.box([x,0,ZI+.3],[1.9,.1,.3],{a:1});R.label([x,.1,ZI+.3],'Cardano form, complex cube roots',{fs:12.5,dy:16,c:P.mute});
        slip(R,P,[x-.2,0,ZI-.25],.9,E2.parsed,1,P.c5,true);
        R.flow([[x+.5,.12,ZI+.3],[x-.2,.12,ZI-.25],[x-.3,.38,0],[x-.5,.3,ZV+.2]],{c:P.c5,a:.85,r:.06});
        R.label([x+.95,PH*.6,0],'1/3 = 0.333, key 0.568',{fs:12.5,b:1,c:P.c5,al:'left',dx:10});
        verdict(R,P,x,false,.02,1,'parser: wrong',true,.45);verdict(R,P,x,true,.4*e+.01,1,'released: right',e>.2,.45,null,-.62);return}
      slip(R,P,[x,0,ZI+.3],1.7,s1,a,null,cz);slip(R,P,[x,0,ZI-.3],1.7,s2,a,P.mute,cz);
      R.flow([[x-.3,.12,ZI+.3],[x-.1,.38,0],[x,.3,ZV+.2]],{c:ok?P.c3:P.c1,a:a*.8,r:.06});R.flow([[x+.3,.12,ZI-.3],[x+.1,.38,0]],{c:P.mute,a:a*.6,r:.05});
      const g=cz?win(e,.35,1):1;verdict(R,P,x,ok,(ok?.55:.02)*g+.01,a,ok?'equal: right':'different: wrong',cz&&g>.1);
      if(cz)R.label([x+.95,PH*.6,0],q,{fs:12.5,b:1,c:ok?P.good:P.c1,al:'left',dx:10});
      if(cz)R.label([x,0,ZI+.3],i<3?(i===1?D.p7_right_boxed_identical_to_key:D.p7_right_boxed_equal_after_light_normalisation)+' of '+right+' right answers pass':nform+' answers use this form',{fs:12.5,b:1,c:ok?P.good:P.bad,dy:30,a:g})});
  }
  const full={cam:[.05,1.1],bounds:[[-7.6,0,-1.6],[6.7,.8,2.1]]};
  S3.stage({id:'stg-ck',list:'sx-ck',fig:'Fig. 1 · one real answer, four checks',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[24,16,40,16],
    view:k=>{const i=k===5?3:k-1;return k>=1?{cam:[.55,.6],bounds:[[X[i]-1.5,0,-1.5],[X[i]+1.7,.75,1.7]]}:full}});
})();
