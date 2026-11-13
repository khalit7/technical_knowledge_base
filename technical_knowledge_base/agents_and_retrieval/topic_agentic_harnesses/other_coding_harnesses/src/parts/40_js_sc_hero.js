// ---- Scene: Fig. 1, the same task through every harness (renderer v2). Data: the eight local-model recordings (HR_DATA, built by build_data.py)
// and their call classes (HR_ENDS, derive_ends.py). One row per run, one block per model call in order; a block's height is the prompt tokens
// that call sent, its colour what the call did. Steps (ol#sx-hero): all eight runs, then the choice at which each failed, then Aider. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {mix,at}=S3;
  const D=window.HR_DATA||{runs:[]},E=window.HR_ENDS||{};
  // back to front: tall rows at the back so they never hide the short ones
  const ROWS=[['ohs_1','OpenHands'],['gemini_1','Gemini CLI'],['codex_1','Codex CLI'],['opencode_1','opencode'],['mswe_local_tool','mini-SWE (tools)'],['mswe_local_text','mini-SWE (text)'],['aider_diff_1','Aider (diff)'],['aider_whole_1','Aider (whole)']]
    .map(([id,name])=>({id,name,r:D.runs.find(r=>r.id===id),cats:(E[id]||{}).cats||''})).filter(o=>o.r);
  if(!ROWS.length)return;
  const MX=Math.max(...ROWS.flatMap(o=>o.r.calls.map(c=>c.in))),HMAX=1.7,DX=.27,X0=-3.9,DZ=.78,Z0=-(ROWS.length-1)*DZ/2;
  const x=i=>X0+i*DX,z=j=>Z0+j*DZ;
  // which rows each step is about (by id); step 0 shows all
  const FOCUS=[null,['codex_1'],['gemini_1','opencode_1'],['ohs_1','mswe_local_tool','mswe_local_text'],['aider_diff_1','aider_whole_1']];
  const OUT=o=>o.r.tests_failed_after===0?['both fixed','good']:o.r.tests_failed_after===1?['one of two','c5']:['none','bad'];
  const CH={codex_1:'1',gemini_1:'2',opencode_1:'2',ohs_1:'3',mswe_local_tool:'3',mswe_local_text:'3'};
  function ccol(P,c){return c==='A'?P.c1:c==='E'?P.bad:c==='S'?P.c5:c==='U'?P.c4:c==='X'?mix(P.paper,P.mute,.45):mix(P.paper,P.mute,.75)}
  function draw(R,k,e){const P=R.P,F=FOCUS[k];R.grid(-4.4,4.6,-3.2,3.2,.5);
    // in a close-up only the rows next to the step's rows keep their faded labels (the others would be clamped to the card's edge and pile up)
    const fj=F?ROWS.map((o,j)=>F.includes(o.id)?j:-9).filter(j=>j>=0):[];
    ROWS.forEach((o,j)=>{const on=!F||F.includes(o.id),a=on?1:.2,zz=z(j),n=o.r.calls.length,la=!F||fj.some(i=>Math.abs(i-j)<=1)?1:0;
      // step 1: each row grows call by call; afterwards it stands
      const shown=k===0?Math.max(0,Math.min(n,Math.ceil(e*n*1.05))):n;
      R.box([x(n-1)/2+X0/2,0,zz],[x(n-1)-X0+.36,.03,.5],{fill:mix(P.paper,P.soft,.6),a:a*.9,shadow:false,dz:30});
      for(let i=0;i<shown;i++){const c=o.r.calls[i],h=Math.max(.02,c.in/MX*HMAX);R.box([x(i),0,zz],[.2,h,.36],{fill:ccol(P,o.cats[i]),a,shadow:false,lw:.6})}
      R.label([X0-.3,.05,zz],o.name,{al:'right',dx:-6,fs:12,c:on&&F?P.ink:P.mute,b:on&&!!F,grp:'row',a:Math.max(.45,a)*la});
      const [t,ck]=OUT(o),ea=k===0?at(1,e,1)*(shown>=n?1:0):1;
      if(shown>=n)R.label([x(n-1)+.2,.05,zz],t+(CH[o.id]&&on&&F?' · choice '+CH[o.id]:''),{al:'left',dx:8,fs:12,b:on&&!!F,c:P[ck],a:Math.max(.35,a)*ea*la,grp:'out'});
      if(R.W<520&&on&&F)R.label([x(n-1)+.2,.05,zz],o.name+': '+t,{al:'right',dx:0,fs:12,b:1,c:P[ck],dy:-34});
      // the run moving along its row while it is the step's subject
      if(on&&(k===0||F))R.flow([[X0-.15,.02,zz+.3],[x(n-1)+.15,.02,zz+.3]],{c:on&&F?P[ck]:P.c1,r:.045,n:Math.max(3,Math.round(n/2)),speed:1.1,a:k===0?.5:.85});
    });
    // step 5: Aider runs the tests itself and sends back only the failure
    if(k===4){const ta=e,j=ROWS.findIndex(o=>o.id==='aider_diff_1');if(j>=0){const zz=z(j),n=ROWS[j].r.calls.length,tp=[x(n-1)+1.1,0,zz+.4];
      R.box(tp,[.55,.35,.45],{fill:mix(P.paper,P.good,.3),a:ta});R.label([tp[0],.35,tp[2]],'tests',{fs:12,b:1,c:P.good,dy:-10,a:ta});
      R.flowArc([tp[0]-.2,.3,tp[2]],[x(1),.45,zz],.35,{c:P.good,r:.05,n:6,a:ta,speed:1})}}
  }
  const full={cam:[0,.66],bounds:[[-4.1,0,Z0-.3],[4.3,HMAX,-Z0+.3]]};
  const rowB=ids=>{const js=ids.map(id=>ROWS.findIndex(o=>o.id===id)).filter(j=>j>=0),n=Math.max(...ids.map(id=>(ROWS.find(o=>o.id===id)||{r:{calls:[1]}}).r.calls.length));
    return [[X0-.2,0,z(Math.min(...js))-.4],[Math.max(x(n-1)+1.2,X0+3.2),HMAX*.9,z(Math.max(...js))+.4]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one task, eight runs, one local 4B model',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    view:k=>k===0?full:{cam:[.08,.56],bounds:rowB(FOCUS[k])},
    margin:w=>w<520?[14,10,14,10]:[16,120,14,130]});
})();
