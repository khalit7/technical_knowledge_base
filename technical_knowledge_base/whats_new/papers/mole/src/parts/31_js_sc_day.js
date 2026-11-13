// ---- Scene: one test day of the daily audit (renderer v2), from the released corpus: 29 April 2026, test day 3 of the GPT-5.3 single-day corpus ----
// Every number comes from window.AUDIT through AUD (12_js_audit.js): the 142 active accounts by access group, their audit events, the robust
// z-score and peer-fit scores with all 20 features (the same arithmetic check_page.mjs compares with Python), each account's rank, and the five
// completed harms. Steps: the organisation, events into the monitor, one score each, the ranked queue (ten a row, the first row reviewed),
// the reveal, and peer-fit re-ranking the same day. check_stages.mjs checks the numbers the step list states against what this computes.
(function(){
  if(!document.getElementById('stg-day')||typeof AUD==='undefined')return;const {at,lerp,mix}=S3;
  const DAY=2,D=AUD.D,ALL=[...Array(AUD.NF).keys()];
  const TH={'01_ip_theft':'IP theft','02_credential_exfil':'credential exfil.','03_priv_esc':'privilege esc.','04_fraud':'fraud','05_sabotage':'sabotage','06_weight_exfil':'weight exfil.','07_eval_manip':'eval. manip.','08_data_poisoning':'data poisoning','09_release_manip':'release manip.','10_safety_sabotage':'safety sabotage'};
  let A=null;
  function compute(){if(A)return A;const rz=AUD.rankAll('z',ALL)[DAY],rp=AUD.rankAll('peer',ALL)[DAY],by=new Map();
    rz.forEach(x=>by.set(x.r,{r:x.r,zs:x.s,zr:x.rank}));rp.forEach(x=>{const o=by.get(x.r);o.ps=x.s;o.pr=x.rank});
    const acc=[...by.values()],ORDER=['ml-research','infra-admins','ops','eval-reviewers'],blocks={};
    acc.forEach(o=>{const g=D.groups[D.info[o.r.a][0]];o.g=ORDER.includes(g)?g:'other';(blocks[o.g]=blocks[o.g]||[]).push(o)});
    // the access groups side by side, seven accounts a row; the two accounts outside the four big groups share a small block
    const CELL=.36,COLS=7,GAP=.62,names=ORDER.concat(['other']).filter(g=>blocks[g]);let w=0;
    const wid=g=>Math.min(COLS,blocks[g].length)*CELL;names.forEach((g,i)=>w+=wid(g)+(i?GAP:0));let x0=-w/2;const BL=[];
    names.forEach(g=>{const bw=wid(g),calls=blocks[g].reduce((s,o)=>s+o.r.n,0);blocks[g].forEach((o,j)=>{o.gp=[x0+(j%COLS+.5)*CELL,1.3-Math.floor(j/COLS)*CELL]});
      BL.push({g,n:blocks[g].length,calls,cx:x0+bw/2,z:1.3-(Math.ceil(blocks[g].length/COLS)-1)*CELL/2,back:1.3-(Math.ceil(blocks[g].length/COLS)-1)*CELL});x0+=bw+GAP});
    const harms=acc.filter(o=>o.r.pos).sort((a,b)=>a.zr-b.zr);
    const top=Math.max(...acc.map(o=>Math.max(o.zs,o.ps)));
    return A={acc,BL,harms,top,n:acc.length,events:acc.reduce((s,o)=>s+o.r.n,0),zc:harms.filter(o=>o.zr<=10).length,pc:harms.filter(o=>o.pr<=10).length}}
  // the queue: ten accounts a row, the reviewed row at the back, so the tallest bars never hide the rest
  const QX=.56,QZ=.44,rk=r=>[((r-1)%10-4.5)*QX,-3.1+Math.floor((r-1)/10)*QZ];
  const HS=.82,MON=[-1.8,.15,-3.3],SEC=[4.4,-3.1];
  window.MOLE_DAY=()=>{const T=compute();return {date:D.days[DAY],n:T.n,events:T.events,zc:T.zc,pc:T.pc,top:T.top,
    harms:T.harms.map(o=>({a:D.accts[o.r.a],th:o.r.th,zr:o.zr,pr:o.pr,g:o.g})),groups:T.BL.map(b=>[b.g,b.n,b.calls])}};
  function draw(R,k,e){const P=R.P,T=compute(),narrow=R.W<520;
    R.grid(-7,7,-5,3.4,.5);
    const qa=k>=3?at(k,e,3):0;           // how far the accounts have moved into the queue
    const pa=k>=5?e:0;                     // peer-fit replacing the z-score
    // the review plate under the first row of the queue, and the security team behind it
    if(k>=3){const a=at(k,e,3),[xa,za]=rk(1),[xb]=rk(10);R.glass([xa-.36,.005,za-.3],[xb-xa+.72,0,0],[0,0,.6],{c:P.acc,a:a*.9,nu:10,nv:1});
      R.label([xa-.4,.05,za],narrow?'reviewed':'reviewed today: the top 10',{al:'right',dx:-6,fs:12.5,b:1,c:P.acc,a,grp:'h'});
      R.box([SEC[0],0,SEC[1]],[1.1,.5,.7],{a:a*.95});R.label([SEC[0],.5,SEC[1]],'security team',{fs:12,dy:-12,c:P.ink,a});
      if(k>=3)for(let i=1;i<=10;i++){const [x,z]=rk(i);R.flowArc([x,.3,z],[SEC[0]-.4,.35,SEC[1]],.55,{c:P.acc,a:a*.6,r:.045,n:3,speed:.9})}}
    // the monitor: a glass plate the audit events stream into
    const ma=k===0?0:k<=2?(k===1?Math.min(1,e*1.6):1):k===3?1-e:0;
    if(ma>0){R.glass([MON[0],MON[1],MON[2]],[3.6,0,0],[0,1.3,0],{c:P.c1,a:ma,nu:10,nv:4});
      R.label([0,1.55,MON[2]],pa>0?'peer-fit':'robust z-score monitor',{fs:13,b:1,c:P.c1,a:ma,dy:-6})}
    if(k===1||k===2)T.BL.forEach(b=>R.flowArc([b.cx,.2,b.back-.15],[Math.max(-1.6,Math.min(1.6,b.cx*.3)),.7,MON[2]+.06],.6,{c:P.c1,a:k===1?e:.55,r:.055,n:Math.max(3,Math.round(b.calls/900)),speed:1.2}));
    // the accounts: a block each, then a bar as tall as its score; they move into the queue and, for peer-fit, re-sort
    T.acc.forEach(o=>{let p=o.gp;if(qa>0){const q=rk(o.zr);p=[lerp(o.gp[0],q[0],qa),lerp(o.gp[1],q[1],qa)]}
      if(pa>0){const a=rk(o.zr),b=rk(o.pr);p=[lerp(a[0],b[0],pa),lerp(a[1],b[1],pa)]}
      const s=lerp(o.zs,o.ps,pa),grow=k<2?0:k===2?e:1,h=Math.max(.1,lerp(.1,s*HS,grow));
      const r=pa>0?lerp(o.zr,o.pr,pa):o.zr,rev=k>=4?(o.r.pos?1:0):0;
      let fill=P.paper,a=1;
      if(k>=4){if(o.r.pos){const caught=(k>=5?(pa>.5?o.pr:o.zr):o.zr)<=10;fill=caught?P.good:P.bad}else a=r<=10?.95:.28}
      if(k===4&&rev)fill=mix(P.paper,fill,e);
      R.box([p[0],0,p[1]],[.26,h,.26],{fill,a,shadow:false,lw:.6})});
    // labels: the access groups while the accounts stand in them, the harms once revealed
    if(k<=2||(k===3&&e<.5)){const a=k===3?1-2*e:1;T.BL.forEach(b=>{const nm=b.g==='other'?(narrow?'+2':'2 others'):narrow?b.g.split('-')[0]:b.g;
      R.label([b.cx,0,1.3+.35],nm+' '+b.n,{fs:12,dy:12,c:P.ink,a,mono:true})})}
    if(k>=4){const a=k===4?e:1;T.harms.forEach(o=>{const r=k>=5?(pa>.5?o.pr:o.zr):o.zr,q=pa>0?[lerp(rk(o.zr)[0],rk(o.pr)[0],pa),lerp(rk(o.zr)[1],rk(o.pr)[1],pa)]:rk(o.zr),
        h=lerp(o.zs,o.ps,pa)*HS,caught=r<=10;
      R.label([q[0],h,q[1]],TH[o.r.th]+' · rank '+r+(caught?' ✓':' ✗'),{fs:12,b:1,al:q[0]>0?'left':'right',dx:q[0]>0?8:-8,c:caught?P.good:P.bad,a,grp:'h'})})}
  }
  const GV={cam:[.18,.62],bounds:[[-6.4,0,-3.4],[6.4,1.8,2.1]]},QV={cam:[.22,.88],bounds:[[-3.3,0,-3.6],[5.1,1.9,3.3]]};
  const st=S3.stage({id:'stg-day',list:'sx-day',fig:'Fig. 1 · 29 April 2026 in the released corpus',cam:GV.cam,bounds:GV.bounds,aspect:.66,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,16,16],
    view:k=>k<=2?GV:QV});
  window.MOLE_DAY_STAGE=st;
})();
