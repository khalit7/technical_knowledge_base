// ---- Scene (Fig. 4): one injected page through a naive agent and through the Muse agent's layers (Meta's description of 8 September 2026):
// the per-user VM as a glass case, the runtime cell as a tinted case inside it, the security services outside the cell, Sentinel at the VM's edge,
// the Muse app outside. Dots stream along each request's path. The task, the page, the attacker and the token strings are illustrative. ----
(function(){
  if(!document.getElementById('stg-ag'))return;const {lerp,mix}=S3;
  let mode='muse';
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,4*e)):lerp(a,b,Math.max(0,2*e-1))};
  // boxes: [x, z, w, h, d, name]; the VM and the cell are cases drawn separately
  const BX={muse:{app:[-4.35,.5,.55,1.0,.14,'Muse app'],agent:[-1.75,.75,1.45,.42,.85,'Agent harness'],brow:[-1.75,-.8,1.45,.32,.85,'Browser sub-agent'],
      authd:[.45,1.15,1.15,.3,.55,'hatch-authd'],priv:[.45,.4,1.15,.22,.5,'privsep workers'],safe:[.45,-.35,1.15,.22,.5,'hatch-safety'],sent:[2.05,-.3,.55,.85,2.4,'Sentinel'],
      hotel:[4.35,-1.0,1.1,.5,.8,'hotel.example'],att:[4.35,1.1,1.1,.5,.8,'attacker.example']},
    naive:{app:[-4.35,.5,.55,1.0,.14,'Chat app'],agent:[-1.2,.6,1.6,.5,.9,'Agent'],brow:[-1.2,-.85,1.6,.32,.85,'Built-in browser'],
      hotel:[4.35,-1.0,1.1,.5,.8,'hotel.example'],att:[4.35,1.1,1.1,.5,.8,'attacker.example']}};
  const SUB={muse:{app:'your phone',agent:'token srg_7f3… (surrogate)',brow:'accessibility tree, no page JavaScript',authd:'real credentials',priv:'connector code',safe:'classifiers',sent:'allow · deny · ask',hotel:'booking site',att:'waiting'},
    naive:{app:'your phone',agent:'token ya29… (real), card number',brow:'raw DOM, scripts run',hotel:'booking site',att:'waiting'}};
  // per step: [boxes in focus, packets [[path of box names], colour key, label, stops at the end]]
  const STEP={muse:[[['app','agent'],[[['app','agent'],'acc','book a hotel']]],
      [['brow','sent','hotel'],[[['brow','sent','hotel'],'mute','GET'],[['hotel','sent','brow'],'bad','page + hidden text']]],
      [['agent','brow','authd'],[[['brow','agent'],'bad','injected instruction']]],
      [['agent','sent'],[[['agent','sent'],'bad','POST to attacker.example',1]]],
      [['sent','app'],[[['sent','app'],'c5','approve?'],[['app','sent'],'good','deny']]],
      [['att','sent'],[]],
      [['agent','sent','hotel','authd','app'],[[['agent','sent','hotel'],'good','checkout'],[['sent','app'],'c5','exact details?']]]],
    naive:[[['app','agent'],[[['app','agent'],'acc','book a hotel']]],
      [['agent','brow','hotel'],[[['brow','hotel'],'mute','GET'],[['hotel','brow','agent'],'bad','page + hidden text']]],
      [['agent'],[]],
      [['agent','att'],[[['agent','att'],'bad','POST token + inbox']]],
      [['agent','app'],[[['agent','app'],'c5','approve?'],[['brow','agent'],'bad','"already approved"']]],
      [['att'],[]],
      [['agent','hotel'],[[['agent','hotel'],'c5','card number typed into the page']]]]};
  const VM={muse:[-3.05,2.45],naive:[-2.4,2.45]};
  function draw(R,k,e,st){const inC=p=>{const q=R.p(p);return q[2]>0&&q[0]>2&&q[0]<R.W-2&&q[1]>2&&q[1]<R.H-2},lab=(p,t,o)=>{if(inC(p))R.label(p,t,o)};const P=R.P,m=mode,mu=m==='muse',Bx=BX[m],S=STEP[m],foc=S[k][0];R.grid(-5.2,5.4,-2.4,2.4,.5);
    const fA=n=>tw(st,e,s=>S[s][0].includes(n)?1:.38),fL=n=>la(st,e,s=>S[s][0].includes(n)?1:0);
    // the VM (or the naive agent's server) as a glass case; the runtime cell inside it
    const [v0,v1]=VM[m];R.box([(v0+v1)/2,0,0],[v1-v0,1.45,3.7],{fill:mix(P.paper,P.mute,.15),fa:.07,ea:.55,a:1,shadow:false,lw:1.1});
    lab([v0,1.45,-1.85],mu?'Muse Secure VM: one per user, in the cloud':'Agent server',{al:'left',dx:4,dy:-12,fs:12.5,b:1,c:P.mute});
    if(mu){R.box([-1.75,0,0],[2.15,1.05,3.3],{fill:mix(P.paper,P.acc,.35),fa:.1,ec:P.acc,ea:.8,a:1,shadow:false,lw:1.1});
      lab([-2.8,1.05,-1.65],'runtime cell',{al:'left',dx:4,dy:-11,fs:12.5,b:1,c:P.acc})}
    else{R.box([.6,0,.3],[1.4,.02,2.4],{fill:P.paper,fa:.05,ea:.4,a:.8,shadow:false});{const na=la(st,e,s=>s===0||s===3?1:0);if(na>.01)lab([.6,.02,-.9],'no separate services: secrets live in the agent',{fs:12,dy:-8,c:P.mute,a:na,wide:1})}}
    // state on the boxes for this step
    const red=n=>(n==='hotel'&&k>=1&&k<=5)||(n==='agent'&&k>=2&&k<=3)||(!mu&&n==='att'&&k>=3)||(mu&&n==='sent'&&(k===3||k===4)),grn=n=>(mu&&n==='sent'&&k===6)||(mu&&n==='app'&&k===4);
    const sub=n=>{if(mu){if(n==='sent')return k===3||k===4?'answer: ASK, halted':k===6?'allow; swaps in the real card':SUB.muse.sent;if(n==='att')return k>=5?'received nothing':'waiting';if(n==='agent'&&k>=2&&k<=5)return 'fooled; tainted: read your inbox';if(n==='app'&&k===4)return 'approval card';if(n==='hotel'&&k>=1&&k<=5)return 'hidden instruction'}
      else{if(n==='att')return k>=3?'has token + inbox':'waiting';if(n==='agent'&&k>=2&&k<=5)return 'fooled; holds the real token';if(n==='hotel'&&k>=1&&k<=5)return 'hidden instruction'}return SUB[m][n]};
    Object.entries(Bx).forEach(([n,[x,z,w,h,d,nm]])=>{const a=fA(n),c=red(n)?mix(P.paper,P.bad,.55):grn(n)?mix(P.paper,P.good,.55):n==='sent'?mix(P.paper,P.c5,.35):P.paper;
      R.box([x,0,z],[w,h,d],{fill:c,a,lw:.9,shadow:n!=='app'});
      const sl=fL(n);if(sl>.01){ // name and note stand above the box's back top edge, off its own top
        lab([x,h,z-d/2],nm,{fs:12.5,b:1,dy:-27,c:P.ink,a:sl,grp:'ag'});lab([x,h,z-d/2],sub(n),{fs:12,dy:-11,c:red(n)?P.bad:grn(n)?P.good:P.mute,a:sl,grp:'ag'})}});
    // packets: dots stream along each request's path while the step is about it
    const cen=n=>{const b=Bx[n];return [b[0],Math.min(.32,b[3]*.6),b[1]]};
    S[k][1].forEach(([path,ck,txt,stop],j)=>{const pts=path.map(cen),c=P[ck]||P.ink,a=Math.min(1,Math.max(0,e*1.6-j*.3));if(a<=.01)return;
      // a packet stopped at Sentinel ends short of it
      if(stop){const p0=pts[pts.length-2],p1=pts[pts.length-1];pts[pts.length-1]=[p1[0]-Bx[path[path.length-1]][2]/2-.05,p1[1],p0[2]+(p1[2]-p0[2])*.9]}
      R.flow(pts,{c,a,r:.065,n:Math.max(6,Math.round(pts.length*5)),speed:1.3});
      const mi=pts.length>2?pts[1]:[(pts[0][0]+pts[1][0])/2,pts[0][1],(pts[0][2]+pts[1][2])/2];
      lab(mi,txt,{fs:12.5,b:1,c,dy:-14,a:la(st,e,s=>s===k?1:0)*a,grp:'ag'});
      if(stop&&e>=.9)lab(pts[pts.length-1],'stopped',{fs:13,b:1,c:P.bad,al:'right',dx:-6,dy:16})});
  }
  const W={cam:[.16,.58],bounds:[[-4.8,0,-2],[5.0,1.5,2]]};
  const V={muse:[{cam:[.22,.56],bounds:[[-4.8,0,-1.8],[.2,1.3,1.8]]},{cam:[.16,.56],bounds:[[-2.6,0,-1.9],[5.0,1.3,1.6]]},{cam:[.25,.56],bounds:[[-3.0,0,-1.8],[1.2,1.2,1.8]]},
      {cam:[.2,.56],bounds:[[-2.8,0,-1.8],[2.7,1.2,1.8]]},W,W,W],
    naive:[{cam:[.22,.56],bounds:[[-4.8,0,-1.8],[.6,1.3,1.8]]},{cam:[.16,.56],bounds:[[-2.6,0,-1.9],[5.0,1.3,1.6]]},{cam:[.25,.56],bounds:[[-2.6,0,-1.8],[1.4,1.2,1.8]]},
      {cam:[.18,.56],bounds:[[-2.6,0,-1.9],[5.0,1.3,1.9]]},W,W,W]};
  const stg=S3.stage({id:'stg-ag',list:'sx-ag-muse',fig:'Fig. 4 · one injected page, two agent designs',cam:W.cam,bounds:W.bounds,aspect:.46,dur:1500,hold:5600,draw,
    margin:w=>w<520?[24,8,16,8]:[30,16,18,16],view:k=>V[mode][k]});
  const seg=document.getElementById('agM');
  if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    ['muse','naive'].forEach(n=>{const l=document.getElementById('sx-ag-'+n);if(l)l.hidden=n!==mode});
    document.getElementById('stg-ag').querySelector('.stg-top span').textContent='Fig. 4 · '+(mode==='muse'?'one injected page, Muse\'s design':'one injected page, a naive agent');
    stg.list('sx-ag-'+mode)}));
})();
