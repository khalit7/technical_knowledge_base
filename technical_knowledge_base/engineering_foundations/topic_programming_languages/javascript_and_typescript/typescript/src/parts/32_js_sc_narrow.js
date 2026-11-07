// ---- Scene: Fig. 2, narrowing as a set being cut down (section 4; renderer v2). Data: TB.narrow, written by src/tb/gen_narrow.mjs:
// at each probed line, TypeScript 7.0.2's own answer for the type of the expression (read by inserting `expr satisfies never;` there).
// A type is drawn as the set of its union members, one block each, on a glass plate; a member the checks have ruled out sinks to a ghost.
// Two plates in depth: the front plate is the version that narrows, the back plate the "before" version of the same program, at the same line.
// Dots stream from the plate's entrance to every member still possible: the values that can reach this line. The last step is tsc's verdict.
// Replaces the 2D Narrowing stepper (25_js_tb_narrow.js, removed 2026-11-07); the program's code is beside the step list, in 2D. ----
(function(){
  if(!document.getElementById('stg-nr')||!window.TB||!window.TBX)return;const {cl,mix,lerp}=S3;
  const N=TB.narrow,esc=TBX.esc;
  const PROGS={p1:{after:'helper returns "v is string"',before:'helper returns boolean'},p2:{after:'discriminated union',before:'one type, optional fields'},
    p3:{after:'one version'},p4:{after:'name never reassigned',before:'name reassigned later'}};
  let prog='p1';
  const isAlias=m=>/^[A-Z]\w*$/.test(m);
  // the members each expression can ever have in one version (first-appearance order); an alias such as Event or Reply stands for all of them
  function universe(d){const U={};d.steps.forEach(s=>{const u=U[s.expr]=U[s.expr]||[];TBX.members(s.type).forEach(m=>{if(m!=='never'&&!isAlias(m)&&!u.includes(m))u.push(m)})});
    d.steps.forEach(s=>{const u=U[s.expr];if(!u.length)TBX.members(s.type).forEach(m=>u.push(m))});return U}
  function alive(d,U,i){const s=d.steps[Math.min(i,d.steps.length-1)],ms=TBX.members(s.type);if(s.type==='never')return new Set();
    if(ms.length===1&&isAlias(ms[0])&&U[s.expr].length>1&&!U[s.expr].includes(ms[0]))return new Set(U[s.expr]);return new Set(ms)}
  // an object member is labelled by its tag's literal ("text"); the step list gives the full type
  const short=m=>{const o=m.match(/^\{ (\w+): ("[^"]*")/);if(o)return o[2];return m.length>18?m.slice(0,16)+'…':m};
  function colourOf(P,m,idx){if(m==='null'||m==='undefined')return P.mute;const C=[P.c1,P.c2,P.c3,P.c4,P.c6,P.c5];return C[idx%C.length]}
  function plate(R,d,U,k,e,z,title,isFront){const P=R.P,n=d.steps.length,i=Math.min(k,n-1),pi=Math.max(0,Math.min(k-1,n-1)),s=d.steps[i],ps=d.steps[pi],final=k>=n;
    R.glass([-3.6,0,z-.75],[7.2,0,0],[0,0,1.5],{c:isFront?P.acc:P.mute,nu:10,nv:2,a:.6,th:.04});
    R.label([-3.6,0,z],title,{al:'right',dx:-8,dy:14,fs:12,b:1,c:isFront?P.acc:P.mute});
    const narrowW=R.W<520;
    const drawSet=(st,a,grow)=>{const u=U[st.expr],live=alive(d,U,d.steps.indexOf(st)),prevLive=grow?alive(d,U,d.steps.indexOf(ps)):live,cnt=u.length,sp=Math.min(1.9,6.2/Math.max(1,cnt));
      R.label([-3.6,0,z],st.expr,{mono:true,fs:15,b:1,al:'right',dx:-8,dy:-6,c:P.ink,a});
      u.forEach((m,j)=>{const x=(j-(cnt-1)/2)*sp,on=live.has(m),was=prevLive.has(m),t=grow?S3.ease(e):1,h=lerp(was?.7:.06,on?.7:.06,t),c=colourOf(P,m,j);
        R.box([x,.04,z],[Math.min(.95,sp*.72),h,.8],{fill:on?mix(P.paper,c,.55):mix(P.paper,c,.12),a:a*(on?1:.45),fa:on?1:.5,shadow:false});
        R.label([x,.04+h,z],short(m),{mono:true,fs:12,b:on,c:on?P.ink:P.mute,a:a*(on?1:.55),dy:narrowW&&j%2?-25:-10});
        if(on&&!final)R.flowArc([-3.4,.25,z],[x,h+.08,z],.35+.05*j,{c:isFront?P.acc:P.mute,a:a*(isFront?.9:.65),r:.065,n:7,speed:1.2})});
      if(st.type==='never'&&!final)R.label([0,.9,z],'never: nothing left',{fs:13,b:1,c:P.good,a:a*(grow?e:1)})};
    if(!final&&k>0&&ps.expr!==s.expr){drawSet(ps,1-cl(e*2,0,1),false);drawSet(s,cl(e*2-1,0,1),false)}else drawSet(s,1,!final&&k>0);
    if(final){const err=d.tsc.filter(l=>/^narrow\.ts\(/.test(l)),lines=err.map(l=>+l.match(/\((\d+),/)[1]);
      R.label([-3.4,0,z+.75],err.length?'tsc: '+err.length+' error'+(err.length>1?'s':'')+', line'+(lines.length>1?'s ':' ')+lines.join(' and '):'tsc: no errors'+(d.run?' · node prints '+d.run.trim():''),{al:'left',fs:13,b:1,dy:15,c:err.length?P.bad:P.good,a:e})}
  }
  function draw(R,k,e){const a=N[prog+'_after'],b=N[prog+'_before'];R.grid(-4.5,4.5,-2.8,2.6,.5);
    const ua=universe(a);plate(R,a,ua,k,e,b?1.3:0,b?'after':'',true);
    if(b){const ub=universe(b);plate(R,b,ub,k,e,-1.3,'before',false)}}
  // the program's code, beside the step list: the version that narrows, the current line marked, tsc's error lines underlined at the verdict
  function code(k){const el=document.getElementById('tbn-code');if(!el)return;const a=N[prog+'_after'],b=N[prog+'_before'],n=a.steps.length,final=k>=n,s=final?null:a.steps[k];
    const errs=d=>new Set(d.tsc.map(l=>{const m=l.match(/^narrow\.ts\((\d+),/);return m?+m[1]:0}));
    const row=(l,j,cur,bad)=>'<span class="ln'+(cur?' cur':'')+(bad?' err':'')+'"><i>'+(j+1)+'</i>'+(TBX.hl(l)||' ')+'</span>';
    let h='<div class="tbn-lab">after · '+esc(PROGS[prog].after)+'</div><div class="tb-er">'+a.code.map((l,j)=>row(l,j,s&&s.line===j+1,final&&errs(a).has(j+1))).join('')+'</div>';
    if(b){const bs=final?null:b.steps[k],same=new Set(a.code);h+='<div class="tbn-lab" style="margin-top:8px">before · '+esc(PROGS[prog].before)+': the lines that differ</div><div class="tb-er">'+
      b.code.map((l,j)=>same.has(l)?'':row(l,j,bs&&bs.line===j+1,final&&errs(b).has(j+1))).join('')+'</div>'}
    el.innerHTML=h}
  const st=S3.stage({id:'stg-nr',list:'sx-nr-p1',fig:'Fig. 2 · a type as a set, cut down line by line',cam:[.14,.78],bounds:()=>N[prog+'_before']?[[-3.7,0,-2.1],[3.7,1.0,2.4]]:[[-3.7,0,-.9],[3.7,1.0,1.1]],aspect:.62,dur:1300,hold:4800,draw,
    margin:w=>w<520?[14,10,14,62]:[20,18,16,80],onStep:k=>code(k),
    // on a phone the card is taller than wide: look further down so the plates spread vertically instead of floating in a band
    view:()=>innerWidth<520?{cam:[.1,1.08]}:null});
  const C=document.getElementById('tbn-prog');
  if(C)C.addEventListener('click',ev=>{const btn=ev.target.closest('button');if(!btn)return;C.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn));
    prog=btn.dataset.m;document.querySelectorAll('ol[id^="sx-nr-"]').forEach(l=>l.hidden=l.id!=='sx-nr-'+prog);st.list('sx-nr-'+prog)});
  code(0);
})();
