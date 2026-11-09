// ---- Scene: Fig. 4 (stg-ext, renderer v2): seven extraction rules on the same twenty outputs (window.HX.bench, from src/compute_extract.py:
// the harness's own code where it installs, a verbatim copy where it does not). Columns: this page's ten lm-eval outputs, then its ten Inspect outputs,
// each on a plinth whose height is the output's length in characters. Rows: the rules, introduced a few at a time, each fed by a stream from
// the outputs. A cell is a tall green cube when the rule's reading matches the gold, a low white one when it read something wrong, a dashed
// square when it read nothing. Totals and readings are published in window.HXN.ext for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-ext')||!window.S3||!window.HX||!window.HX.bench)return;const {mix}=S3;
  const B=window.HX.bench;
  const RU=[['lmeval_strict','lm-eval strict-match'],['lmeval_flex','lm-eval flexible-extract'],['inspect','Inspect match(numeric)'],['helm','HELM final_number'],
    ['lighteval','lighteval math_scorer'],['simple_evals','simple-evals MGSM'],['openai_evals','openai/evals Match']];
  const cols=['lmeval','inspect'].flatMap(run=>B.filter(r=>r.run===run).sort((a,b)=>a.id-b.id));
  const read=(r,k)=>{const v=r.extract[k][0];return v!==''&&v!=='[invalid]'&&v!=null};
  const ok=(r,k)=>!!r.extract[k][1];
  const tot=RU.map(([k])=>[cols.filter(r=>r.run==='lmeval'&&ok(r,k)).length,cols.filter(r=>r.run==='inspect'&&ok(r,k)).length]);
  // the close-up: the first output on which the rules disagree (picked by rule, as the bench's default)
  const ci=cols.findIndex(r=>{const v=RU.map(([k])=>ok(r,k));return v.some(x=>x)&&v.some(x=>!x)}),C=cols[ci];
  const shown=(r,k)=>{const v=String(r.extract[k][0]);if(!read(r,k))return k==='lmeval_strict'?'[invalid]':'(nothing)';
    if(k==='lighteval'){const m=/^\[([^,]+),/.exec(v);return m?m[1]+' (parsed)':v}if(k==='openai_evals')return '"'+v.trim().slice(0,13)+' ..."';return v};
  (window.HXN=window.HXN||{}).ext={tot,strictRead:cols.filter(r=>r.run==='lmeval'&&read(r,'lmeval_strict')).length,strictReadIn:cols.filter(r=>r.run==='inspect'&&read(r,'lmeval_strict')).length,
    simpleRead:cols.filter(r=>read(r,'simple_evals')).length,simpleOK:tot[5][0]+tot[5][1],openOK:tot[6][0]+tot[6][1],
    close:{run:C.run,problem:C.id+1,gold:C.target,readings:RU.map(([k])=>shown(C,k)),ok:RU.filter(([k])=>ok(C,k)).length}};
  const X=c=>c<10?-4.6+c*.5:.9+(c-10)*.5,ZO=2.05,Z=r=>1.15-r*.5,CH=1.1/2500;
  const SHOW=[[],[0],[0,1,2,3],[0,1,2,3,4],[0,1,2,3,4,5,6],[0,1,2,3,4,5,6],[0,1,2,3,4,5,6]],NEW=[[],[0],[1,2,3],[4],[5,6],[],[]];
  const SHORT=['strict-match','flexible-extract','Inspect match','HELM','lighteval','simple-evals','Match'];
  const RC=P=>[P.c5,P.c6,P.c4,P.c3,P.c1,P.c2,P.mute];
  function draw(R,k,e){const P=R.P,ph=R.W<520,cc=RC(P);R.grid(-5.4,6.6,-2.6,2.8,.5);
    const closeUp=k===5,fadeCol=c=>closeUp&&c!==ci?.18:1;
    // the twenty outputs
    cols.forEach((r,c)=>{const h=Math.max(.05,r.text.length*CH),a=fadeCol(c)*(k===0?Math.min(1,e*1.4):1);
      R.box([X(c),0,ZO],[.36,h,.36],{fill:r.run==='lmeval'?mix(P.paper,P.c1,.3):mix(P.paper,P.c4,.3),a})});
    if(!ph&&!closeUp){R.label([X(4.5),0,ZO+.3],'10 lm-eval outputs',{fs:12.5,b:1,dy:16,c:P.c1});R.label([X(14.5),0,ZO+.3],'10 Inspect outputs',{fs:12.5,b:1,dy:16,c:P.c4})}
    if(closeUp&&!ph)R.label([X(ci),0,ZO+.3],(C.run==='lmeval'?'lm-eval':'Inspect')+' output, problem '+(C.id+1)+' · gold '+C.target,{fs:12.5,b:1,dy:16,c:P.ink,a:e});
    // the rules' rows
    SHOW[k].forEach(ri=>{const [key,nm]=RU[ri],isNew=NEW[k].includes(ri),a=isNew?Math.min(1,e*1.3):k>=5?1:.35,z=Z(ri);
      if(!ph&&!closeUp)R.label([X(0)-.4,0,z],nm,{al:'right',fs:12,mono:true,c:cc[ri],a,grp:'rules'});
      cols.forEach((r,c)=>{const x=X(c),ac=a*fadeCol(c);
        if(isNew)R.flow([[x,.15,ZO-.2],[x,.15,z+.15]],{c:cc[ri],r:.04,n:3,speed:1.6,a:ac*.8});
        if(ok(r,key))R.box([x,0,z],[.3,.45,.3],{fill:P.good,a:ac,shadow:false});
        else if(read(r,key))R.box([x,0,z],[.3,.08,.3],{fill:P.paper,a:ac,shadow:false,lw:.6});
        else R.quad([[x-.15,.005,z-.15],[x+.15,.005,z-.15],[x+.15,.005,z+.15],[x-.15,.005,z+.15]],{a:ac*.6,ec:P.mute,dash:[2,2]})});
      if(closeUp&&!ph)R.label([X(ci)+.25,.1,z],SHORT[ri]+': '+shown(C,key),{al:'left',mono:true,fs:12,dx:8,b:ok(C,key),c:ok(C,key)?P.good:P.ink,a:e});
      if(!closeUp&&!ph&&(k===6||!isNew||e>.6))R.label([X(19)+.35,0,z],tot[ri][0]+' · '+tot[ri][1],{al:'left',mono:true,fs:12.5,b:tot[ri][0]+tot[ri][1]>0,c:cc[ri],dx:4,a:k===6?1:a})});
    if(k===6&&!ph)R.label([X(19)+.35,0,Z(6)-.5],'correct: lm-eval · Inspect',{al:'left',fs:12,c:P.mute,dx:4,a:e});
  }
  const full={cam:[.14,.9],bounds:[[-4.9,0,-2.4],[7.3,.8,2.5]]};
  const close={cam:[.5,.62],bounds:[[X(ci)-1.6,0,-2.1],[X(ci)+2.6,1.1,2.5]]};
  S3.stage({id:'stg-ext',list:'sxl-ext',fig:'Fig. 4 · seven rules, the same twenty outputs',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1400,hold:4800,draw,
    view:k=>k===5?close:k===0?{cam:[.14,.7],bounds:[[-4.9,0,1.2],[5.8,1.2,2.7]]}:full,margin:w=>w<520?[14,10,14,10]:[16,14,14,190]});
})();
