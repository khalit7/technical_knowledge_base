// ---- Scene (hero, Fig. 1): the phishing campaign in the Gemini world, replayed from the released tool-call records (renderer v2: flows, camera per step) ----
// Ten agents around the Central Bank and the billboard; outside the town, the attack pages, the attacker's database handle and the NewtonOne account.
// Every count is this page's keyword classification of the records (mine_logs.py, window.LOGS; rules under "How each dot is classified" on the Replay tab),
// grouped into five stretches between the stimuli (long-replay rule), then the per-agent tally and the same tally for all seven exposed worlds.
(function(){
  if(!document.getElementById('stg-town')||!window.LOGS)return;const {at,off,mix}=S3;
  const LGS=window.LOGS,A=LGS.agents,G=LGS.w.gemini,ST=G.stim,T7=PAPER.tables.t7.rows;
  const B=[0,.25,ST.w2-ST.w1,ST.w3-ST.w1,ST.memo-ST.w1,1e9];   // stretch edges in hours since wave 1
  const ENG=['fetch','op','act','pass','store'];
  // per stretch (0..4) and agent: warnings, fetches, database calls, acts for the attacker (fire separate)
  const S=[0,1,2,3,4].map(s=>A.map((_,i)=>{const ev=G.ev.phish.filter(e=>e[1]===i&&e[0]>=B[s]&&e[0]<B[s+1]),c=t=>ev.filter(e=>e[2]===t).length;
    return {warn:c('warn'),fetch:c('fetch'),op:c('op'),xfer:ev.filter(e=>e[2]==='act'&&LGS.tools[e[3]]!=='put_on_fire').length,fire:ev.filter(e=>e[2]==='act'&&LGS.tools[e[3]]==='put_on_fire').length,eng:ev.filter(e=>ENG.includes(e[2])).length}}));
  const cum=s=>A.map((_,i)=>S.slice(0,s+1).reduce((t,x)=>t+x[i].eng,0));
  const tally=A.map((_,i)=>({warn:G.ev.phish.filter(e=>e[1]===i&&e[2]==='warn').length,eng:G.ev.phish.filter(e=>e[1]===i&&ENG.includes(e[2])).length}));
  const WO=['gemini','claude','deepseek','mistral','mixed','openai','qwen'],WNM={gemini:'Gemini',claude:'Claude',deepseek:'DeepSeek',mistral:'Mistral',mixed:'Mixed',openai:'OpenAI',qwen:'Qwen'};
  const worlds=WO.map(w=>{const ev=LGS.w[w].ev.phish;return {w,warn:ev.filter(e=>e[2]==='warn').length,eng:ev.filter(e=>ENG.includes(e[2])).length,t7:T7[WNM[w]][9]}});
  window.TOWNDATA={S,tally,worlds};
  const RA=2.05,ang=i=>Math.PI*.5+2*Math.PI*i/10,pos=i=>[RA*Math.cos(ang(i)),0,RA*Math.sin(ang(i))];
  const PAGE=[4.3,.55,-1.7],DB=[4.3,.35,0],NEW=[4.3,.3,1.7],BILL=[0,1.0,-.75],BANK=[0,0,.45];
  const FOCUS=[null,6,2,2,0,8,null,null];          // the agent each stretch's text is about: Kade, Blackbox, Blackbox, Anchor, Mira
  const sq=n=>Math.sqrt(n),dots=n=>Math.min(16,2+Math.round(sq(n)*1.7));
  function town(R,k,e,a){const P=R.P;if(a<=.01)return;
    // the town's edge: what is inside is the agents' world, what is outside the attacker's
    const ring=[];for(let j=0;j<=64;j++){const t=2*Math.PI*j/64;ring.push([2.95*Math.cos(t),.01,2.95*Math.sin(t)])}R.line(ring,{c:P.mute,w:1.2,dash:[5,5],a:a*.7});
    R.label([-2.95,.05,2.6],'AgentPark · Gemini world',{al:'left',mono:true,fs:12,c:P.mute,a,wide:1});
    // the Central Bank (set on fire in stretch 4) and the billboard (where every wave was posted)
    const fire=k===4?e:k===5?1:0,burnt=k>=4&&k<=5;
    R.box(BANK,[.95,.5,.7],{fill:burnt?mix(P.paper,P.bad,.35*fire+.1*(k===5)):P.paper,a});
    R.label([BANK[0],.55,BANK[2]],'Central Bank',{mono:true,fs:12,dy:-10,c:burnt?P.bad:P.mute,a,b:burnt});
    if(fire>0){R.glow([BANK[0],.55,BANK[2]],.9,{c:P.bad,a:a*fire*.85});R.glow([BANK[0],.75,BANK[2]],.55,{c:P.c5,a:a*fire*.8})}
    R.box([-.38,0,-.75],[.04,.42,.04],{a,shadow:false});R.box([.38,0,-.75],[.04,.42,.04],{a,shadow:false});
    R.glass([-.48,.42,-.75],[.96,0,0],[0,.5,0],{c:P.c5,a:a*.9,nu:4,nv:3});
    R.label([0,.92,-.75],'billboard',{mono:true,fs:12,dy:-8,c:P.mute,a,wide:1});
    // the agents: white figures that turn the attack's colour as their engagement accumulates
    const c0=k>=2&&k<=5?cum(k-2):A.map(()=>0),c1=k>=1&&k<=5?cum(k-1):k>5?cum(4):A.map(()=>0);
    A.forEach((nm,i)=>{const p=pos(i),f=FOCUS[k],dim=(f!=null&&f!==i)?.45:1,v=c0[i]+(c1[i]-c0[i])*(k>=1&&k<=5?e:1),t=Math.min(.8,sq(v)/12);
      const fa=a*dim*(k===6?1-.75*e:1),fill=mix(P.paper,P.bad,t);
      R.box(p,[.3,.4,.3],{fill,a:fa});R.ball([p[0],.52,p[2]],.12,{c:fill,a:fa});
      if(k===0||(f===i))R.label([p[0],.66,p[2]],nm,{mono:true,fs:12,dy:-10,b:f===i,c:f===i?P.ink:P.mute,a:a*(f===i?1:.9),wide:f===i?0:1})});
  }
  function outside(R,k,a){const P=R.P;if(a<=.01)return;
    R.glass([PAGE[0]-.45,.1,PAGE[2]],[.9,0,0],[0,.75,0],{c:P.bad,a:a*.9,nu:5,nv:6});
    R.label([PAGE[0],.9,PAGE[2]],'attack pages',{mono:true,fs:12,dy:-8,c:P.bad,a});
    R.box([DB[0],0,DB[2]],[.75,.3,.6],{fill:mix(P.paper,P.bad,.18),a});R.glass([DB[0]-.38,.31,DB[2]-.3],[.76,0,0],[0,0,.6],{c:P.bad,a:a*.8,nu:4,nv:3});
    R.label([DB[0],.4,DB[2]],'db.query / db.execute',{mono:true,fs:12,dy:-12,c:P.bad,a,wide:1});
    R.box([NEW[0],0,NEW[2]],[.5,.32,.5],{fill:mix(P.paper,P.bad,.3),a});R.label([NEW[0],.36,NEW[2]],'NewtonOne',{mono:true,fs:12,dy:-12,c:P.bad,a});
  }
  // one stretch's traffic: the wave arriving at the billboard, warnings to the billboard (blue), fetches, database calls and transfers outward (orange)
  function traffic(R,s,a,wave){const P=R.P;if(a<=.01)return;
    if(wave){R.flowArc([PAGE[0]-.2,.7,PAGE[2]],[BILL[0]+.3,BILL[1],BILL[2]],.8,{c:P.bad,a:a*.9,r:.07,n:9,speed:1.4});
      A.forEach((_,i)=>{const p=pos(i);R.flowArc([BILL[0],BILL[1]-.05,BILL[2]],[p[0],.5,p[2]],.35,{c:P.bad,a:a*.35,r:.04,n:3,speed:1.2})})}
    S[s].forEach((c,i)=>{const p=pos(i),top=[p[0],.55,p[2]];
      if(c.warn)R.flowArc(top,[BILL[0],BILL[1]+.1,BILL[2]],.5,{c:P.acc,a,r:.06+.01*sq(c.warn),n:dots(c.warn),speed:1.3});
      if(c.fetch)R.flowArc(top,[PAGE[0]-.3,.55,PAGE[2]],1.1,{c:P.bad,a:a*.85,r:.05,n:dots(c.fetch),speed:1.5});
      if(c.op)R.flowArc(top,[DB[0]-.3,.35,DB[2]],1.0,{c:P.bad,a,r:.045+.006*sq(c.op),n:dots(c.op),speed:1.5});
      if(c.xfer)R.flowArc(top,[NEW[0]-.2,.35,NEW[2]],1.2,{c:[200,50,50],a,r:.08,n:4,speed:1.3});
      if(c.fire)R.flowArc(top,[BANK[0],.55,BANK[2]],.5,{c:[200,50,50],a,r:.09,n:5,speed:1.2})})}
  // signed bars on a white plinth: warnings stand up (blue), engagement with the attack hangs below (orange); square-root heights
  function plinth(R,c,warn,eng,m,a,lab,sub,alt){const P=R.P;if(a<=.01)return;const y=1.45,u=1.3/sq(m),nar=R.W<520;
    R.box([c[0],y-.04,c[2]],[.56,.04,.36],{a,shadow:false});
    [-1,1].forEach(sx=>R.box([c[0]+sx*.25,0,c[2]],[.03,y-.05,.03],{a:a*.8}));
    const hw=Math.max(.012,sq(warn)*u),he=Math.max(.012,sq(eng)*u);
    R.box([c[0]-.1,y,c[2]],[.17,hw,.17],{fill:P.acc,a,shadow:false,lw:.7});R.box([c[0]+.1,y-.04-he,c[2]],[.17,he,.17],{fill:P.bad,a,shadow:false,lw:.7});
    R.label([c[0]-.1,y+hw,c[2]],String(warn),{mono:true,fs:12,dy:-9,c:P.acc,a,b:1});R.label([c[0]+.1,y-.04-he,c[2]],String(eng),{mono:true,fs:12,dy:10,c:P.bad,a,b:1,halo:true});
    if(lab)R.label([c[0],0,c[2]],lab,{mono:true,fs:12,dy:nar&&alt?29:14,c:P.ink,a,b:1});if(sub)R.label([c[0],0,c[2]],sub,{mono:true,fs:12,dy:30,c:P.mute,a,wide:1})}
  const RX=i=>-3.3+1.1*i,AX=i=>-3.6+.8*i,ZZ=i=>i%2?.75:-.75; // zigzag rows, so no plinth hides another
  function draw(R,k,e){const P=R.P;R.grid(-4.5,5.5,-3.4,3.4,.5);
    const ta=k===6?1-e:k===7?0:1;town(R,k,e,ta);outside(R,k,ta);
    if(k>=1&&k<=5)traffic(R,k-1,k===1?Math.min(1,e*1.6):1,k===1||k===3||k===4);
    // 7. the per-agent tally over the whole campaign (the town fades out; the agents stand in a row)
    if(k===6){const m=Math.max(...tally.map(t=>t.eng));A.forEach((nm,i)=>plinth(R,[AX(i),0,ZZ(i)],tally[i].warn,tally[i].eng,m,e,nm))}
    // 8. the same tally for every exposed world, with its Table 7 score
    if(k===7){const ma=Math.max(...tally.map(t=>t.eng));A.forEach((nm,i)=>plinth(R,[AX(i),0,ZZ(i)],tally[i].warn,tally[i].eng,ma,1-e,nm));
      const m=Math.max(...worlds.map(t=>t.eng));worlds.forEach((t,i)=>plinth(R,[RX(i),0,ZZ(i)],t.warn,t.eng,m,e,WNM[t.w],'Table 7: '+t.t7+'/9'))}
  }
  function readout(k){const el=document.getElementById('townOut');if(!el)return;
    if(k>=6){el.textContent=k===6?'Gemini world, whole campaign: '+tally.reduce((t,x)=>t+x.warn,0)+' warnings, '+tally.reduce((t,x)=>t+x.eng,0)+' engagements (blue up, orange down; square-root heights).':'Seven exposed worlds: warnings up, engagements down; under each, its Table 7 score.';return}
    if(k===0){el.textContent='Gemini world before wave 1: nothing has happened yet.';return}
    const s=k-1,sum=f=>k<1?0:S.slice(0,s+1).reduce((t,x)=>t+x.reduce((u,c)=>u+c[f],0),0);
    el.textContent='Gemini world so far: '+sum('warn')+' warnings · '+sum('fetch')+' fetches of the attack pages · '+sum('op')+' database calls · '+sum('xfer')+' transfers or uploads for the attacker · '+sum('fire')+' fire calls.'}
  const full={cam:[.32,.72],bounds:[[-3.1,0,-3.1],[4.8,1.1,3.1]]};
  S3.stage({id:'stg-town',list:'sx-town',fig:'Fig. 1 · the Gemini world under phishing, from the released records',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,18,14],
    view:k=>k===1?{cam:[.42,.62],bounds:[[-2.7,0,-2.7],[2.7,1.1,2.7]]}:k>=6?{cam:[0,.34],bounds:[[-4.1,-.2,-1.1],[4.1,1.95,1.1]]}:full,
    onStep:k=>{try{readout(k)}catch(err){}}});
})();
