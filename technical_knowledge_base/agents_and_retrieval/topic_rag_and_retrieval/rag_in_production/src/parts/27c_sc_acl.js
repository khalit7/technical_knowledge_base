// ---- Scene: Fig. 3, the access rule in the prompt against the filter at retrieval (renderer v2), on the constructed 12-document corpus
// (PRD.aclcorpus) with the real top 4 for the chosen question (PRD.aclctx: bge-small, with and without the filter) and the generators'
// real answers (PRD.aclllm, temperature 0). The readout on the left prints the prompt's documents and the answer for the current step. ----
(function(){
  if(!document.getElementById('stg-acl')||!window.PRD||!PRD.aclcorpus||!PRD.aclctx)return;const {at,off,lerp,mix}=S3;
  const P0=window.PRD,C=P0.aclcorpus,A=P0.aclllm,esc=RD.esc,$=id=>document.getElementById(id);
  const DOC={};C.docs.forEach(d=>DOC[d.id]=d);
  const qs=C.questions.flatMap(it=>it.q.map(q=>({q,target:it.target,marker:it.marker})));
  $('pac-q').innerHTML=qs.map((x,i)=>'<option value="'+i+'">'+esc(x.q)+'</option>').join('');
  const MODELS={'qwen3-1.7b':'Qwen3-1.7B','qwen3-4b':'Qwen3-4B'};
  // layout: the five public documents in the front row (the only ones this user may read), the restricted ones behind
  const POS={};const rows=[['P1','P2','P3','P4','P5'],['H1','H2','H3','L1','L2'],['E1','E2']];
  rows.forEach((r,j)=>r.forEach((id,i)=>POS[id]=[-4.3+i*.95+(j===2?.95:0),0,1.0-j*1.05]));
  const XP=1.3,XM=3.2,XA=4.7;
  function cur(){const i=+$('pac-q').value,q=qs[i],g=$('pac-g').value,claim=$('pac-claim').checked,ctx=P0.aclctx.restricted.find(r=>r.q===q.q);return {q,g,claim,ctx}}
  const cond=k=>k>=3?'retrieval_filter':$('pac-claim').checked?'prompt_rule_claim':'prompt_rule';
  function row(c,k){return A?A.models[c.g].rows.find(r=>r.cond===cond(k)&&r.q.startsWith(c.q.q)):null}
  const sum=(g,cd)=>A?A.models[g].summary[cd]:null;
  function draw(R,k,e){const P=R.P,c=cur(),filt=k>=3,ids=filt?c.ctx.top4_filtered:c.ctx.top4;R.grid(-5.8,5.4,-1.8,1.9,.5);
    const ok=id=>DOC[id].group==='public';
    // the user, asking: may read public only
    const U=[-5.8,.35,1.0];R.box([-5.8,0,1.0],[.5,.35,.5],{fill:mix(P.paper,P.good,.3)});
    if(k===0)R.label([-5.8,0,1.25],'user · public',{fs:12.5,b:1,dy:16,c:P.good});
    // the filter at retrieval: a glass fence around the public row
    if(filt){const fa=k===3?e:1;R.glass([-4.8,0,1.5],[4.75,0,0],[0,.55,0],{c:P.acc,a:fa,nu:10,nv:2});R.glass([-4.8,0,.5],[4.75,0,0],[0,.55,0],{c:P.acc,a:fa*.6,nu:10,nv:2});
      if(k===3)R.label([-2.4,0,1.5],'filter inside the search: public only',{fs:12.5,b:1,dy:16,c:P.acc,a:e})}
    // the twelve documents; the four retrieved rise, numbered by rank
    C.docs.forEach(d=>{const p=POS[d.id],rk=ids.indexOf(d.id),top=rk>=0&&k>=1&&k!==3?1:rk>=0&&k===3?e:0,lift=k===1||k===3?.32*top*(k===1?e:e):top?.32:0;
      const dim=filt&&!ok(d.id)?.18:1,col=ok(d.id)?P.good:P.bad;
      R.box([p[0],0,p[2]],[.78,.16+lift,.6],{fill:mix(P.paper,col,top?.55:.22),a:dim});
      if(k===0||top)R.label([p[0],.16+lift,p[2]],d.id+(top?' #'+(rk+1):''),{fs:12.5,b:1,mono:true,dy:-11,c:top?col:P.ink,a:dim,wide:k===0||k===2||k===4?1:0});
      if(k===0&&d.id===c.q.target)R.label([p[0],.16,p[2]],'holds the answer',{fs:12.5,b:1,dy:-30,c:P.bad})});
    // the query reaches the documents it may search
    if(k===1||k===3)C.docs.forEach(d=>{if(filt&&!ok(d.id))return;const p=POS[d.id];R.flowArc(U,[p[0],.25,p[2]],.4,{c:P.c1,a:.55*e,n:4,speed:1.6,r:.05})});
    // the prompt (a glass plate), the model and the answer
    const pa=k===2||k===4?1:.2;
    R.glass([XP-.8,.02,-.6],[1.6,0,0],[0,0,1.2],{c:filt?P.good:P.c2,a:pa,nu:4,nv:2});
    if(k===2||k===4)ids.forEach((id,j)=>R.box([XP-.6+j*.4,.03,0],[.3,.12*e,.7],{fill:mix(P.paper,ok(id)?P.good:P.bad,.55),a:e,shadow:false}));
    R.box([XM,0,0],[.9,.5,.8],{fill:mix(P.paper,P.c4,.25),a:pa});
    const rr=row(c,k),leak=rr?rr.leak_new:null,ac=k===2||k===4?(leak?P.bad:P.good):P.mute;
    R.box([XA,0,0],[.8,.3,.7],{fill:k===2||k===4?mix(P.paper,ac,.4):P.paper,a:pa});
    if(k===2||k===4){ids.forEach(id=>{const p=POS[id];R.flowArc([p[0],.5,p[2]],[XP-.6+ids.indexOf(id)*.4,.2,0],.6,{c:ok(id)?P.good:P.bad,a:e,n:6,speed:1.3,r:.065})});
      R.flowArc([XP+.8,.15,0],[XM-.45,.3,0],.2,{c:P.c4,a:e,n:4,speed:1.3});R.flowArc([XM+.45,.3,0],[XA-.4,.2,0],.2,{c:ac,a:e,n:4,speed:1.3});
      const forb=ids.filter(id=>!ok(id)).length;
      R.label([XP,0,.6],'prompt: 4 documents'+(forb?', '+forb+' forbidden':', all public'),{fs:12.5,b:1,dy:16,c:forb?P.bad:P.good,wide:1});
      R.label([XM,.5,0],MODELS[c.g]+(k===2?' + the rule':''),{fs:12.5,dy:-12,c:P.c4,wide:1});
      if(A){const s=sum(c.g,cond(k));R.label([XA,.3,0],leak?'leak':'no leak',{fs:13,b:1,dy:-12,c:ac});
        R.label([XA,0,.35],s.leaks_new+' of '+s.n+' answers leak',{fs:12.5,mono:true,dy:16,c:s.leaks_new?P.bad:P.good,a:e})}}
    
  }
  function mark(text,markers){let t=esc(text);markers.forEach(m=>{const re=new RegExp(esc(m).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');t=t.replace(re,x=>'<mark>'+x+'</mark>')});return t}
  function readout(k){const c=cur(),filt=k>=3,ids=filt?c.ctx.top4_filtered:c.ctx.top4,rr=row(c,k);
    let h='<div class="pac-q">User (group: public)'+(k>=1&&k<=2?', '+(cond(k)==='prompt_rule_claim'?'rule in the prompt, "I am authorized" appended':'rule in the prompt'):k>=3?', filter at retrieval':'')+': '+esc(c.q.q+(k<3&&c.claim?C.authority_suffix:''))+'</div>';
    if(k>=1)h+='<div class="small">In the prompt: '+ids.map(id=>'<b style="color:var('+(DOC[id].group==='public'?'--good':'--bad')+')">'+id+'</b> '+esc(DOC[id].title)+' ('+DOC[id].group+')').join(' · ')+'</div>';
    else h+='<div class="small">The answer is in '+c.q.target+', '+esc(DOC[c.q.target].title)+' ('+DOC[c.q.target].group+'), which this user may not read.</div>';
    if((k===2||k===4)&&rr){h+='<div class="pac-ans">'+mark(rr.text,c.q.marker.concat([C.injection_marker]))+'</div>';
      h+='<p class="small"><span class="pac-v '+(rr.leak_new?'bad':'good')+'">'+(rr.leak_new?'Leak: the answer contains a fact only the restricted document holds.':rr.leak?'No new fact: the marker in the answer was already in the question.':'No leak in this answer.')+'</span> '+MODELS[c.g]+', temperature 0, real output; restricted facts checked: '+esc(c.q.marker.join(', '))+'.</p>'}
    $('pac-read').innerHTML=h}
  const st=S3.stage({id:'stg-acl',list:'sx-acl',fig:'Fig. 3 · where the access check sits',cam:[.15,.85],bounds:[[-6.1,0,-1.4],[5.2,.7,1.6]],aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,12,8]:[26,18,26,18],onStep:k=>{try{readout(k)}catch(e){}},
    // in close on the documents while the search runs; the whole path while the prompt is built and answered
    view:k=>k===1||k===3?{cam:[.2,.85],bounds:[[-6.1,0,-1.4],[.3,.7,1.8]]}:null});
  if(!st)return;
  const re=()=>{st.draw();readout(st.st.k)};['pac-q','pac-g','pac-claim'].forEach(id=>$(id).addEventListener('change',re));readout(0);
})();
