// ---- Scene (Fig. 2): one sentence under three objectives, renderer v2. Tokens are blocks: the text on the back row, the encoder's input in the middle,
// the decoder's target in front. Picked tokens turn red and lift; kept tokens and sentinels slide down into the input, the dropped spans into the target
// (dots flow along each move); then the encoder reads the input and the decoder writes the target; the last step is to scale at 512 tokens of text.
// Data: FIG and FIG_TOK (20_data.js: the paper's Figure 2 and Table 3 examples), the i.i.d. rows recomputed from the mask with the ported T5 functions
// (12_js_t5core.js: T5.sentinelize, T5.targetsFromSpans), the 512-token lengths L512 (23_js_run.js: T5.lenIid, T5.lenSpans) and the scores sgOf (Tables 5 and 7).
(function(){
  if(!document.getElementById('stg-span'))return;const {at,off,lerp,mix}=S3;
  const n=FIG_TOK.length,X0=-5,x=i=>X0+i,ZT=-2.1,ZI=0,ZG=2.1,BW=.86,BH=.3,BD=.55;
  // build each mode's input and target rows as items {t, kind, src}; src: the text positions it comes from (or, for a target sentinel, the input item)
  function rows(m){const F=FIG[m],mask=F.mask.map(Boolean),inp=[],tgt=[];
    if(m==='bert'){F.inp.forEach((t,i)=>inp.push({t:t.replace(/^~/,''),kind:t==='<M>'?'mask':/^~/.test(t)?'rnd':'tok',src:[i]}));FIG_TOK.forEach((t,i)=>tgt.push({t,kind:'tok',src:[i],from:'text'}))}
    else{const a=T5.sentinelize(FIG_TOK,mask).out,b=T5.targetsFromSpans(FIG_TOK,mask);
      // the scene's rows are the ported functions' output; for the baseline they must equal Figure 2 token for token
      const got=[a.map(q=>q.s||q.t).join(' '),b.map(q=>q.s||q.t).join(' ')],want=[F.inp.join(' '),F.tgt.join(' ')];
      if(got[0]!==want[0]||got[1]!==want[1])__jsErr('span stage: the ported T5 functions do not reproduce the '+m+' example');
      let i=0;a.forEach(q=>{if(q.sent){const s=[];while(i<n&&!mask[i])i++;while(i<n&&mask[i])s.push(i++);inp.push({t:q.s,kind:'sent',src:s})}else{while(i<n&&mask[i])i++;inp.push({t:q.t,kind:'tok',src:[i++]})}});
      const picked=mask.map((v,j)=>v?j:-1).filter(j=>j>=0);let p=0;
      b.forEach(q=>{if(q.sent){const j=inp.findIndex(u=>u.t===q.s);tgt.push({t:q.s,kind:'sent',inp:j})}else tgt.push({t:q.t,kind:'tok',src:[picked[p++]],from:'text'})})}
    return {mask,inp,tgt}}
  const RW={iid:rows('iid'),bert:rows('bert'),span:rows('span')};
  let mode='iid';
  const NAME={bert:'BERT-style',iid:'i.i.d., replace spans',span:'random spans (T5)'};
  function block(R,p,it,a,o){const P=R.P;o=o||{};const fill=o.fill||(it.kind==='sent'?mix(P.paper,P.acc,.42):it.kind==='mask'?mix(P.paper,P.c5,.45):P.paper);
    R.box(p,[BW,BH,BD],{fill,a,lw:.8});
    if(it.kind==='rnd')R.line([[p[0]-BW*.32,p[1]+BH+.01,p[2]+BD/2],[p[0]+BW*.32,p[1]+BH+.01,p[2]+BD/2]],{c:P.bad,w:2,a});
    const lab=o.lab!=null?o.lab:it.t,alt=R.W<640&&o.idx%2===1;if(R.W<520&&a<.6)return; // on a phone only the rows in focus keep their words
   
    R.label([p[0],p[1]+BH,p[2]],lab,{fs:12.5,mono:it.kind!=='tok',b:it.kind==='sent'||o.b,c:o.c||(it.kind==='rnd'?P.bad:it.kind==='sent'?P.acc:P.ink),dy:alt?-27:-11,a:Math.max(a,.001)>.05?Math.min(1,a+.15):0})}
  function draw(R,k,e){const P=R.P,W=RW[mode],red=mix(P.paper,P.bad,.6);R.grid(-6.5,6.5,-3.2,3.3,.5);
    // 1. the text, its picked tokens lifting and turning red
    const ta=k<=1?1:k===2?lerp(1,.45,e):k===3?.45:k===4?.25:.25*(1-e);
    FIG_TOK.forEach((t,i)=>{const pk=W.mask[i],u=pk?(k===1?e:k>=1?1:0):0;
      block(R,[x(i),.22*u,ZT],{t,kind:'tok'},ta,{idx:i,fill:pk&&u>0?mix(P.paper,P.bad,.6*u):P.paper,c:pk&&u>.5?P.bad:P.ink,b:pk&&u>.5})});
    // 2. the input: each item slides down from where it came from (a run of picked tokens merges into one sentinel)
    const ia=k<2?0:k===2?e:k===3?.5:k===4?1:1-e;
    W.inp.forEach((it,j)=>{const sx=it.src.reduce((s,i)=>s+x(i),0)/it.src.length,u=k===2?e:1,p=[lerp(sx,x(j),u),lerp(.22,0,u)*(it.kind==='tok'?0:1),lerp(ZT,ZI,u)];
      block(R,p,it,ia,{idx:j});
      if(k===2)it.src.forEach(i=>R.flowArc([x(i),.4,ZT],[x(j),.35,ZI],.6,{c:it.kind==='tok'?P.c1:P.bad,a:Math.min(1,e*1.6)*.8,r:.05,speed:1.4,n:5}))});
    // 3. the target: the dropped tokens come down from the text, each sentinel from its partner in the input
    const ga=k<3?0:k===3?e:k===4?1:1-e;
    W.tgt.forEach((it,j)=>{let s;if(it.kind==='sent')s=it.inp>=0?[x(it.inp),ZI]:[x(W.inp.length),ZI];else s=[x(it.src[0]),ZT];
      const u=k===3?e:1,p=[lerp(s[0],x(j),u),0,lerp(s[1],ZG,u)],wr=k===4?(j+.5)/W.tgt.length<=e+.02:k>4;
      block(R,p,it,ga,{idx:j,fill:k===4||k>4?(wr?(it.kind==='sent'?mix(P.paper,P.acc,.42):mix(P.paper,P.c2,.3)):mix(P.paper,P.line,.4)):undefined});
      if(k===3){const a0=it.kind==='sent'?[s[0],.35,ZI]:[s[0],.45,ZT];R.flowArc(a0,[x(j),.35,ZG],.7,{c:it.kind==='sent'?P.acc:P.c2,a:Math.min(1,e*1.6)*.8,r:.05,speed:1.4,n:5})}});
    // 4. the encoder reads the whole input both ways, the decoder writes the target one token at a time, reading the encoder through cross-attention
    if(k===4){const ni=W.inp.length,ng=W.tgt.length,ea=Math.min(1,e*1.8),Y=1.0;
      R.glass([X0-.5,Y,ZI-.45],[ni,0,0],[0,0,.9],{c:P.c1,a:ea,nu:ni,nv:1,th:.04});R.glass([X0-.5,Y,ZG-.45],[ng,0,0],[0,0,.9],{c:P.c2,a:ea,nu:ng,nv:1,th:.04});
      W.inp.forEach((_,j)=>R.flow([[x(j),.35,ZI],[x(j),Y,ZI]],{c:P.c1,a:ea*.8,r:.045,n:3,speed:.8}));
      const ec=[X0-.5+ni/2,Y+.05,ZI],dc=[X0-.5+ng/2,Y+.05,ZG];[-1,0,1].forEach(d=>R.flowArc([ec[0]+d*ni/4,Y+.05,ZI],[dc[0]+d*ng/4,Y+.05,ZG],.55,{c:P.c3,a:ea*.75,r:.05,n:6,speed:1.2}));
      const wj=Math.min(ng-1,Math.floor(e*ng));R.flow([[x(wj),Y,ZG],[x(wj),.35,ZG]],{c:P.c2,a:ea,r:.05,n:3,speed:.8});
      R.label([X0-.5+ni,Y,ZI-.45],'encoder · reads '+ni+', both ways',{al:'right',dy:-12,fs:12.5,b:1,c:P.c1,a:ea,wide:1});
      R.label([X0-.5+ng,Y,ZG+.45],'decoder · writes '+ng+', one at a time',{al:'left',dx:8,dy:6,fs:12.5,b:1,c:P.c2,a:ea,wide:1})}
    // row names (wide screens; on a phone the step text names the rows)
    if(k<5)[['text',ZT,ta],['input · encoder',ZI,Math.max(ia,.001)],['target · decoder',ZG,Math.max(ga,.001)]].forEach(([t,z,a])=>{if(a>.05)R.label([X0-.6,.15,z],t,{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:Math.min(1,a+.3),grp:'row'})});
    // 5. to scale: per 512 tokens of text, input (blue) and target (orange) for the three objectives; this mode at full strength
    if(k===5){const S=11/512;['bert','iid','span'].forEach((o,r)=>{const z=[ZT,ZI,ZG][r],L=L512[o],on=o===mode,a=e*(on?1:.3);
        R.box([X0-.5+L.inp*S*e/2,0,z-.24],[Math.max(.01,L.inp*S*e),.22,.34],{fill:mix(P.paper,P.c1,.55),a,lw:.7});
        R.box([X0-.5+L.tgt*S*e/2,0,z+.24],[Math.max(.01,L.tgt*S*e),.22,.34],{fill:mix(P.paper,P.c2,.6),a,lw:.7});
        R.label([X0-.6,.1,z],NAME[o],{al:'right',dx:-6,fs:12.5,b:on,c:on?P.ink:P.mute,a:Math.max(.55,a),grp:'row'});
        R.label([X0-.5+L.inp*S*e,.22,z-.24],'input '+(o==='iid'?L.inp.toFixed(1):L.inp),{al:'left',dx:6,dy:-4,mono:true,fs:12,c:P.c1,a:on?e:e*.6});
        R.label([X0-.5+L.tgt*S*e,.22,z+.24],'target '+(o==='iid'?L.tgt.toFixed(1):L.tgt)+(on?' · SuperGLUE '+sgOf(SG_ROW[o][0],SG_ROW[o][1]):''),{al:'left',dx:6,dy:12,mono:true,fs:12,b:on,c:P.c2,a:on?e:e*.6})})}
  }
  const full={cam:[.1,.95],bounds:[[-5.7,0,-2.5],[5.5,.6,2.5]]},enc={cam:[.1,.95],bounds:[[-5.7,0,-2.5],[5.5,1.15,2.5]]};
  const st=S3.stage({id:'stg-span',list:'sx-sp-iid',fig:'Fig. 2 · one sentence, three objectives',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,12,10]:[18,14,14,118],
    // the last step looks at the three length bars from a little higher
    view:k=>k===5?{cam:[.08,1.0],bounds:[[-5.7,0,-2.6],[6.4,.5,2.6]]}:k===4?enc:full});
  segBind('spM',m=>{mode=m;$('spM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));
    ['iid','bert','span'].forEach(q=>$('sx-sp-'+q).hidden=q!==m);if(st)st.list('sx-sp-'+m)});
})();
