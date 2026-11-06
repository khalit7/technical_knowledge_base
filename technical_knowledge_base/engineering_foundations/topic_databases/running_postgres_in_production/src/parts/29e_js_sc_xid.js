// ---- Scene, Fig. 6 (section 6): the 32-bit transaction ID as the circle it is, to scale (renderer v2) ----
// The ring is 2^32 IDs; the arc from the oldest unfrozen XID (datfrozenxid) to now is the age, coloured by the PostgreSQL 18 thresholds; the
// wraparound point is half a turn (2^31) from the oldest unfrozen XID. Ages at steps 1 to 4 are illustrative; steps 5 to 7 use the run's numbers
// from window.RPG.wraparound (the warning's 3,000,299, the refused age 2,144,483,647, the fixed age under 300).
(function(){
  const L31=2147483648,L32=2*L31;
  // the zone of an age, used by the step text and checked against recompute.py
  window.RPG_XID=age=>age>=L31-3e6?'stop':age>=L31-40e6?'warn':age>=1.6e9?'failsafe':age>=200e6?'aggressive':'normal';
  if(!document.getElementById('stg-xid')||!window.RPG)return;const {at,off,lerp,mix}=S3;
  const W=RPG.wraparound||{},WS=W.steps||{},num=(t,re)=>{const m=String(t||'').match(re);return m?+m[1]:0};
  const warnLeft=num(WS.warning&&WS.warning.out,/within (\d+) transactions/)||3000299,refAge=num(WS.ages&&WS.ages.out,/\|\s*(\d{9,})\s*\|/)||2144483647;
  const fixAge=Math.max(...String((WS.fix&&WS.fix.out)||'').split('\n').map(l=>num(l,/\|\s*(\d+)\s*\|/)))||288,gid=((WS.holders&&WS.holders.out||'').match(/\|\s*([\w-]+)\s*\|\s*\d{9,}/)||[])[1]||'refund-42';
  const R1=1.95,R2=2.55,TO=Math.PI*.82,th=a=>TO-2*Math.PI*a/L32,pt=(r,t,y)=>[r*Math.cos(t),y||0,r*Math.sin(t)];
  const TH=[[200e6,'200M · aggressive'],[500e6,'500M · warn'],[1e9,'1B · page'],[1.6e9,'1.6B · failsafe'],[L31-40e6,'40M left · warnings']];
  const zoneCol=(P,a)=>a<200e6?P.c3:a<1.6e9?P.c5:a<L31-40e6?P.c2:P.bad;
  // age at each step (k, eased e): illustrative before the run, the run's numbers after
  function age(k,e){return k===0?150e6:k===1?lerp(190e6,25e6,e):k===2?200e6:k===3?lerp(200e6,1.62e9,e):k===4?L31-warnLeft:k===5?refAge:lerp(refAge,fixAge,Math.min(1,e*1.4))}
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  function draw(R,k,e){const P=R.P;R.grid(-3.6,3.6,-3.4,3.4,.5);
    const A=age(k,e),N=48*4,T2=2*Math.PI,zoom=k===4||k===5;
    // where the oldest unfrozen XID sits: freezing (step 2) and the fix (step 7) move it up to now; now itself never goes back
    const to=k===1?TO-T2*(190e6-A)/L32:k===6?TO-T2*(refAge-A)/L32:TO,tn=to-T2*A/L32;
    // the ring: IDs from the oldest unfrozen XID to now are coloured by how old they are
    for(let i=0;i<N;i++){const t0=TO-i/N*T2,t1=TO-(i+1)/N*T2,a0=(((to-(t0+t1)/2)%T2)+T2)%T2/T2*L32,inAge=a0<A;
      let fill=P.paper;if(inAge)fill=mix(P.paper,zoneCol(P,a0),.65);
      R.quad([pt(R1,t0,.01),pt(R2,t0,.01),pt(R2,t1,.01),pt(R1,t1,.01)],{fill,a:1,ea:.25,lw:.5})}
    // the partial last segment of the age arc
    // step 1: from now, half the circle is the past and half the future
    const pa=k===0?e:0;
    if(pa>0){for(let i=0;i<48;i++){const u0=i/48,u1=(i+1)/48,t0=tn+Math.PI*u0,t1=tn+Math.PI*u1,f0=tn-Math.PI*u1,f1=tn-Math.PI*u0;
        R.quad([pt(1.25,t0,.02),pt(1.75,t0,.02),pt(1.75,t1,.02),pt(1.25,t1,.02)],{fill:mix(P.paper,P.acc,.35),a:pa,edge:false});
        R.quad([pt(1.25,f0,.02),pt(1.75,f0,.02),pt(1.75,f1,.02),pt(1.25,f1,.02)],{fill:mix(P.paper,P.c4,.18),a:pa,edge:false})}
      R.label(pt(1.5,tn+Math.PI/2,0),'past · 2³¹ IDs',{fs:12.5,b:1,c:P.acc,a:pa});R.label(pt(1.5,tn-Math.PI/2,0),'future · 2³¹ IDs',{fs:12.5,b:1,c:P.c4,a:pa})}
    // markers: the oldest unfrozen XID, now, and the wraparound point half a turn from the oldest
    const tw=to+Math.PI,hold=k>=3&&k<=5;
    R.box(pt(2.25,to),[.12,.55,.12],{fill:hold?mix(P.paper,P.bad,.6):mix(P.paper,P.mute,.3),a:k===0?.4:1,lw:1});
    R.label(pt(2.25,to,.55),hold?'oldest unfrozen · held by '+gid:'oldest unfrozen XID',{fs:12.5,b:1,c:hold?P.bad:P.mute,dy:k===6?22:-10,a:zoom||k===1?0:k===0?.4:1});
    R.box(pt(2.25,tn),[.14,.8,.14],{fill:mix(P.paper,P.acc,.5),lw:1.2,ec:P.acc});R.ball(pt(2.25,tn,.88),.11,{c:P.acc});
    R.label(pt(2.25,tn,.95),'now',{fs:13,b:1,c:P.acc,dy:-12});
    const wa=k>=1&&k!==0?1:0;
    if(wa){const p1=pt(R1-.15,tw,0),p2=pt(R2+.15,tw,0);R.quad([p1,p2,[p2[0],.7,p2[2]],[p1[0],.7,p1[2]]],{fill:mix(P.paper,P.bad,.55),a:.85,ec:P.bad,lw:1.2});
      R.label(pt(R2+.15,tw,.7),'wraparound point · 2³¹ from the oldest',{fs:12.5,b:1,c:P.bad,dy:-10,a:k>=4&&k<=5?0:1})}
    // the thresholds, measured from the oldest unfrozen XID
    if(k>=2&&k<=5)TH.forEach(([a,t],i)=>{const tt=to-2*Math.PI*a/L32,col=a>=1.6e9?P.c2:a>=L31-40e6?P.bad:a>=500e6&&a<=1e9?P.mute:P.c5;
      R.line([pt(R2,tt,.02),pt(R2+.35,tt,.02)],{c:col,w:2});if(!(k>=4&&a<L31-40e6))R.label(pt(R2+.4,tt,0),t,{fs:12,c:col,b:1,al:Math.cos(tt)>0?'left':'right',dx:Math.cos(tt)>0?6:-6,grp:'thr'})});
    // the age, read out in the middle
    if(zoom)R.label(pt(R1-.2,tw,0),'age '+fmt(A),{al:'right',dx:-10,fs:14,b:1,mono:true,c:P.bad});
    if(zoom)R.label(pt(R1-.2,tw,0),k===4?'warning: '+fmt(warnLeft)+' left':'writes refused',{al:'right',dx:-10,dy:20,fs:12.5,b:1,c:P.bad});
    if(!zoom)R.label([0,0,0],'age '+(A>=1e6?fmt(A/1e6)+' million':fmt(A)),{fs:15,b:1,mono:true,c:k>=4&&k<=5?P.bad:P.ink,dy:-6});
    if(!zoom)R.label([0,0,0],k===4?'"must be vacuumed within '+fmt(warnLeft)+'"':k===5?'"not accepting commands"':k===6?'ROLLBACK PREPARED, VACUUM (FREEZE)':k===3?'frozen at '+gid+'; the age grows':'',{fs:12.5,c:k===6?P.good:P.bad,dy:16});
    if(k===1)R.label(pt(R2+.3,to+.35,0),'VACUUM freezes: the oldest moves up',{al:Math.cos(to)>0?'left':'right',fs:12.5,b:1,c:P.c3,a:e});
  }
  const full={cam:[.0,1.0],bounds:[[-2.7,0,-2.7],[2.7,.9,2.7]]},Wpt=pt(2.25,TO+Math.PI);
  S3.stage({id:'stg-xid',list:'sx-xid',fig:'Fig. 6 · Postgres warns only in the last 2% of the range',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[24,140,20,140],
    // steps 5 and 6 move in close on the wraparound point: the last 40 million IDs are a sliver of the circle
    view:k=>k===4||k===5?{cam:[.0,.95],bounds:[[Wpt[0]-.9,0,Wpt[2]-.9],[Wpt[0]+.9,.9,Wpt[2]+.9]]}:full});
})();
