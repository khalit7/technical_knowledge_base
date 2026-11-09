// ---- Scene: Fig. 2, fix the key (stg-key, renderer v2) ----
// MMLU-Redux mode: the 100 sampled questions of one subject as a field of cubes, coloured by MMLU-Redux 2.0's per-item error labels
// (window.KR.redux.seq, dataset order), the flawed ones lifted out; ten HELM models as rows of bars re-sorted by score before and after
// (MMLU-Redux Table 2, window.KR.redux.t2). HLE-Verified mode: the 2,500 questions as three stacks to scale (668 verified, 1,143 revised,
// 689 uncertain) and seven models before and after (HLE-Verified Table 2, window.KR.hlev.t2). Every number is the page's data.
(function(){
  if(!document.getElementById('stg-key')||!window.S3||!window.KR)return;const {mix,lerp,cl}=S3;
  const K=window.KR,RX=K.redux,E=KU.esc,A=KU.a,SUBJ=RX.t2subj,SUBJK=RX.seqSubj,MODELS=Object.keys(RX.t2),HV=K.hlev,HM=Object.keys(HV.t2);
  const SHORT={'Claude 3.5 Sonnet (20240620)':'Claude 3.5 Sonnet','Claude 3 Opus (20240229)':'Claude 3 Opus','Llama 3.1 Instruct Turbo (405B)':'Llama 3.1 405B','GPT-4o (2024-05-13)':'GPT-4o',
    'Gemini 1.5 Pro (001)':'Gemini 1.5 Pro (001)','GPT-4 (0613)':'GPT-4 (0613)','Qwen2 Instruct (72B)':'Qwen2 72B','GPT-4 Turbo (2024-04-09)':'GPT-4 Turbo',
    'Gemini 1.5 Pro (0409 preview)':'Gemini 1.5 Pro (0409)','Llama 3.1 Instruct Turbo (70B)':'Llama 3.1 70B','Grok 4.1 fast reasoning':'Grok 4.1 fast','Qwen3-Max-Thinking':'Qwen3-Max'};
  const sh=n=>SHORT[n]||n,TYPES={w:'bad',n:'c5',m:'c4',q:'c6',p:'c1',e:'mute'};
  let mode='mmlu',si=0;
  // ---- what each step shows, from the data ----
  function mm(){const k=si,codes=RX.seq[SUBJK[si]].split(''),fl=codes.filter(c=>c!=='o').length,wk=codes.filter(c=>c==='w').length;
    const before={},after={},rb={},ra={};MODELS.forEach(m=>{const [a,r0,c,r1]=RX.t2[m][k];before[m]=a;after[m]=c;rb[m]=r0;ra[m]=r1});
    let mv=null;MODELS.forEach(m=>{const d=Math.abs(rb[m]-ra[m]);if(!mv||d>mv.d)mv={m,d}});
    const lead=v=>Object.keys(v).sort((a,b)=>v[b]-v[a])[0];
    return {codes,fl,wk,ok:100-fl,before,after,rb,ra,mv:mv.m,l0:lead(before),l1:lead(after),moved:MODELS.filter(m=>rb[m]!==ra[m]).length}}
  function hl(){const T=HV.t2,col=j=>{const o={};HM.forEach(m=>o[m]=T[m][j]/100);return o};return {v0:col(0),v4:col(4),v6:col(6),v2:col(2),c:[1,1,5,7,3].map(j=>HM.map(m=>T[m][j]))}}
  const NOTE={0:'In virology items 73 to 99, 27 in a row, all carry a wrong key.',2:'In college chemistry items 77 to 97, 21 in a row, carry a wrong key.'};
  function fillList(){const d=mm(),s=SUBJ[si],set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t};
    document.querySelectorAll('#sx-key-mmlu .ky-s').forEach(e=>e.textContent=s.toLowerCase());
    set('ky-v-fl',d.fl);set('ky-v-wk',d.wk);set('ky-v-note',NOTE[si]||'');set('ky-v-ok',d.ok);
    set('ky-v-mv',sh(d.mv)+' moves furthest, from #'+d.rb[d.mv]+' to #'+d.ra[d.mv]+' ('+d.before[d.mv].toFixed(2)+' to '+d.after[d.mv].toFixed(2)+')');
    set('ky-v-l0',sh(d.l0)+' ('+d.before[d.l0].toFixed(2)+')');set('ky-v-l1',sh(d.l1)+' ('+d.after[d.l1].toFixed(2)+')');set('ky-v-n',d.moved+' of 10');
    window.KRS=window.KRS||{};KRS.key={subj:s,fl:d.fl,wk:d.wk,ok:d.ok,mv:sh(d.mv),r0:d.rb[d.mv],r1:d.ra[d.mv],l0:sh(d.l0),l1:sh(d.l1),moved:d.moved}}
  // the readout under the chips: the counts of the step being shown
  function readout(k){const cnt=document.getElementById('ky-cnt'),src=document.getElementById('ky-src');if(!cnt)return;
    if(mode==='mmlu'){const d=mm(),s=SUBJ[si],v=k>=3?d.after:d.before;
      cnt.innerHTML=KU.stat('Questions scored',k>=2?d.ok:100,s)+KU.stat('Flagged',k>=1?d.fl:'?',k>=1?d.wk+' wrong keys':'not yet audited')+
        KU.stat('Models whose rank changed',k>=3?d.moved+' of 10':'?')+KU.stat('Top score',Math.round(100*Math.max(...Object.values(v)))+'%');
      src.innerHTML='Per-item labels: '+A('MMLU-Redux 2.0','https://huggingface.co/datasets/edinburgh-dawg/mmlu-redux-2.0')+' ('+s.toLowerCase()+' configuration). Scores and ranks: '+A('Gema et al., Table 2','https://arxiv.org/abs/2406.04127')+'. One cube per question.'}
    else{const d=hl(),v=[d.v0,d.v0,d.v4,d.v6,d.v2][k],ce=d.c[k];
      cnt.innerHTML=KU.stat('Questions',k===0?'2,500':'668 / 1,143 / 689','verified / revised / uncertain')+KU.stat('Leader',E(sh(Object.keys(v).sort((a,b)=>v[b]-v[a])[0])))+
        KU.stat('Calibration error, range',Math.min(...ce)+' to '+Math.max(...ce),'RMS, lower is better')+KU.stat('Share of items revised (implied)',k>=3?(100*K.rc.hlev_share_range[0]).toFixed(0)+' to '+(100*K.rc.hlev_share_range[1]).toFixed(0)+'%':'?','full gain ÷ subset gain, derived');
      src.innerHTML='Counts and scores: '+A('HLE-Verified, Table 2','https://arxiv.org/abs/2602.13964')+' (text-only HLE, five rollouts per item, each model\'s default decoding). Its prose states full-set gains that differ from the table for six of seven models; the table is used here. Stacks to scale.'}}
  // ---- the scene ----
  const XB=-4.4,BL=3.6,FX=1.05,FP=.33,win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const rowsZ=(n,i)=>{const p=n>8?.5:.6;return -((n-1)*p)/2+i*p};
  // the scores and their order at a step, for either mode
  function vals(k){if(mode==='mmlu'){const d=mm();return k>=3?d.after:d.before}const d=hl();return [d.v0,d.v0,d.v4,d.v6,d.v2][k]}
  const order=v=>{const o={};Object.keys(v).sort((a,b)=>v[b]-v[a]).forEach((m,i)=>o[m]=i);return o};
  function bars(R,P,k,e,pk){const names=mode==='mmlu'?MODELS:HM,n=names.length,v1=vals(k),v0=vals(pk),o1=order(v1),o0=order(v0),d=mode==='mmlu'?mm():null;
    const t=e,colr=mode==='mmlu'?(k>=3?P.c4:P.c1):(k===2?P.bad:k>=3?P.c4:P.c1),T=HV.t2;
    names.forEach(m=>{const z=lerp(rowsZ(n,o0[m]),rowsZ(n,o1[m]),t),v=lerp(v0[m],v1[m],t),len=Math.max(.02,v*BL);
      let a=1,c=colr,b=false;
      if(mode==='mmlu'&&k===4){const hot=m===d.mv;a=hot||m===d.l1?1:.3;if(hot)c=P.q;b=hot||m===d.l1}
      R.box([XB+len/2,0,z],[len,.16,.26],{fill:mix(P.paper,c,.55),a,shadow:false});
      R.label([XB,0,z],sh(m),{al:'right',dx:-8,fs:12,grp:'rows',b,a:Math.max(.45,a)});
      let lab;if(mode==='mmlu'){const r=k>=3?d.ra[m]:d.rb[m],mvd=d.rb[m]-d.ra[m];lab=v1[m].toFixed(2)+' #'+r+(k>=3&&mvd?(mvd>0?' ▲':' ▼')+Math.abs(mvd):'')}
      else{lab=(100*v1[m]).toFixed(1)+'%';if(k===3)lab+=' +'+(T[m][6]-T[m][4]).toFixed(1);if(k===4)lab+=' +'+(T[m][2]-T[m][0]).toFixed(1)}
      R.label([XB+len,.17,z],lab,{al:'left',dx:6,mono:true,fs:12,b,c:k>=3&&mode==='hle'?P.c4:P.ink,a:Math.max(.45,a)*(k!==pk&&e<1?win(e,.8,1):1)})});
    R.label([XB+BL/2,0,rowsZ(n,n-1)+.3],mode==='mmlu'?(k>=3?'score on the '+d.ok+' correct items · HELM rank':'score on all 100 sampled items · HELM rank'):['raw text-only HLE','raw text-only HLE','raw, only the items later revised','the same items after revision','full text-only set after HLE-Verified'][k],{fs:12,dy:12,c:P.mute,wide:1});
    return names.map(m=>[XB+lerp(v0[m],v1[m],t)*BL,lerp(rowsZ(n,o0[m]),rowsZ(n,o1[m]),t)])}
  function drawMM(R,P,k,e,pk){const d=mm();
    d.codes.forEach((c,i)=>{const x=FX+(i%10)*FP,z=-1.5+Math.floor(i/10)*FP,flaw=c!=='o';
      let fill=P.paper,y=0,a=1;
      if(k>=1)fill=flaw?mix(P.paper,P[TYPES[c]]||P.mute,.8):mix(P.paper,P.good,.5);
      if(k===1&&pk===0)fill=mix(P.paper,fill,win(e,(i%10)/20,(i%10)/20+.5));
      if(flaw&&k>=2){const u=k===2?e:1;y=.95*u;a=1-.8*u}
      R.box([x,y,z],[.25,.2,.25],{fill,a:a*(k===4?(pk===3?1-e:0):1),shadow:false,lw:.6})});
    if(k!==4)R.label([FX+FP*4.5,0,1.75],k>=2?d.ok+' of 100 kept':'100 sampled '+SUBJ[si].toLowerCase()+' questions',{fs:12.5,b:1,dy:12,c:k>=2?P.good:P.ink});
    if(k>=2&&k!==4)R.label([FX+FP*4.5,1.0,-1.65],d.fl+' flagged, lifted out',{fs:12,c:P.bad,a:k===2?e:1,dy:-6,wide:1});
    const ends=bars(R,P,k,e,pk);
    if(k===3){ends.forEach(([x,z])=>R.flowArc([FX+FP*4.5,.2,0],[x,.1,z],.6,{c:P.c4,a:.55,r:.045,n:5,speed:1.4}))}}
  function drawHL(R,P,k,e,pk){const C=[['verified',668,P.good],['revised',1143,P.c1],['uncertain',689,P.c5]],sep=k>=1?(k===1&&pk===0?e:1):0;
    C.forEach(([n,c,col],j)=>{const h=c/1143*1.5,x=lerp(1.6+j*.72,1.25+j*1.2,sep),rev=j===1;
      let z=0,y=0,a=1,f=k===0?P.paper:mix(P.paper,col,.5);
      if(rev&&(k===2||k===3)){const u=k===2&&pk!==3?e:1;z=.75*u;y=.15*u;if(k===3)f=mix(P.paper,P.c4,.55)}
      if(!rev&&(k===2||k===3))a=.25;
      R.box([x,y,z],[.7,h,.7],{fill:f,a,shadow:y<.05});
      if(k>=1){const la=Math.max(.4,a)*(k===1&&pk===0?e:1);R.label([x,y+h,z],c.toLocaleString('en-GB'),{fs:12.5,b:1,dy:-11,a:la,c:rev&&k===3?P.c4:P.ink});R.label([x,y,z+.35],n,{fs:12,dy:12,a:la,c:P.mute})}});
    if(k===0)R.label([2.37,1.5,0],'2,500 questions',{fs:12.5,b:1,dy:-11});
    const ends=bars(R,P,k,e,pk);
    if(k===3)ends.forEach(([x,z])=>R.flowArc([2.35,.5,.75],[x,.1,z],.5,{c:P.c4,a:.6,r:.05,n:5,speed:1.4}))}
  function draw(R,k,e,st){const P=R.P,pk=st&&st.pk!=null&&Math.abs(st.pk-k)<=1?st.pk:k;R.grid(-5.2,4.8,-2.7,2.7,.5);(mode==='mmlu'?drawMM:drawHL)(R,P,k,e,pk)}
  const full={cam:[.12,1.0],bounds:[[-4.5,0,-2.5],[4.2,1.0,2.4]]};
  const st=S3.stage({id:'stg-key',list:'sx-key-mmlu',fig:'Fig. 2 · fix the key, same model outputs',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,16,150],
    view:k=>k===4&&mode==='mmlu'?{cam:[.08,1.0],bounds:[[-4.5,0,-2.5],[.6,.3,2.4]]}:full,onStep:k=>{try{readout(k)}catch(err){}}});
  const subj=document.getElementById('ky-subj');
  subj.innerHTML=SUBJ.map((s,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+s+'</button>').join('');
  KU.seg(subj,m=>{si=+m;fillList();st.list('sx-key-mmlu')});
  KU.seg(document.getElementById('ky-mode'),m=>{mode=m;subj.style.display=m==='mmlu'?'':'none';
    document.getElementById('sx-key-mmlu').hidden=m!=='mmlu';document.getElementById('sx-key-hle').hidden=m==='mmlu';st.list(m==='mmlu'?'sx-key-mmlu':'sx-key-hle')});
  fillList();readout(0);
})();
