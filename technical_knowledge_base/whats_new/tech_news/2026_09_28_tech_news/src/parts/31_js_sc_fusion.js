// ---- Scene: one illustrative twelve-turn coding session, three ways, and the prompt cache (renderer v2) ----
// Rows in depth: one model throughout (back, its columns are the tallest), a router switching models mid-session, and Devin Fusion's lead and
// sidekick (front, two rows).
// Columns along the row are turns 1 to 12; each column is the input that model reads on that turn, drawn to one token scale:
// the pale part is read from that model's prompt cache, the solid part is processed at full price (outlined in red when it is a full
// re-read after a model switch). A glass plate at the head of each row is the provider's cache for that model; dots stream from it into
// the column while the turn reads it, and red dots carry the history into a column that misses. The session sizes (20K to start, 4K a turn,
// an 8K sidekick prompt plus a 2K brief, a 2K result) are illustrative, as before (the 2D lanes this replaced); the mechanism is Cognition's.
(function(){
  if(!document.getElementById('stg-fusion'))return;const {at,lerp,mix}=S3;
  const S0=20,D=4; // thousands of tokens
  const lin=(model,from,to,row)=>{const o=[];for(let i=from;i<=to;i++)o.push({x:i,row,model,ctx:S0+D*(i-1)});return o};
  const warm=u=>Object.assign(u,{cached:u.ctx-D,fresh:D});
  const ONE=lin('F',1,12,0).map(u=>u.x===1?Object.assign(u,{cached:0,fresh:u.ctx}):warm(u));
  const ROUTE=[...lin('F',1,6,1),...lin('C',7,9,1),...lin('F',10,12,1)].map(u=>u.x===1?Object.assign(u,{cached:0,fresh:u.ctx}):u.x===7||u.x===10?Object.assign(u,{cached:0,fresh:u.ctx,miss:1}):warm(u));
  const FU=[];
  [1,2,3,4].forEach(i=>FU.push({x:i,row:2,model:'F',ctx:S0+D*(i-1),cached:i===1?0:S0+D*(i-2),fresh:i===1?S0:D}));FU[3].brief=1;
  for(let i=5;i<=10;i++){const ctx=10+D*(i-5);FU.push({x:i,row:3,model:'C',ctx,cached:i===5?0:ctx-D,fresh:i===5?ctx:D})}
  FU.push({x:11,row:2,model:'F',ctx:S0+D*3+2,cached:S0+D*3,fresh:2,result:1});
  FU.push({x:12,row:2,model:'F',ctx:S0+D*4+2,cached:S0+D*3+2,fresh:D});
  const SESS=[['one',ONE],['route',ROUTE],['fusion',FU]];
  // steps: the turns each one plays (to = last turn drawn at its end); the last step adds up the sessions
  const STEPS=[{to:1,f:[0,1,2,3]},{to:4,f:[0,1,2]},{to:6,f:[2,3]},{to:7,f:[1]},{to:9,f:[1,3]},{to:10,f:[1]},{to:12,f:[2,3]},{to:12,f:[0,1,2,3],sum:1}];
  // totals over the turns up to t (for the step list, the table under it and src/check_stages.mjs)
  function sums(turns,t){let c=0,f=0,m=0;turns.forEach(u=>{if(u.x<=t){c+=u.cached;f+=u.fresh;if(u.miss)m++}});return {cached:c,fresh:f,total:c+f,hit:c+f?Math.round(100*c/(c+f)):0,miss:m}}
  const HK=2.3/64,XC=i=>-4.15+(i-1)*.78,CW=.5,ZR=[-2.15,-.65,.85,1.95],XP=-5.55;
  const ROWN=['one model throughout','switch models mid-session','Fusion: lead (frontier)','Fusion: sidekick (cheaper)'];
  const ROWS=['one model','switching','Fusion lead','sidekick'];
  function draw(R,k,e){const P=R.P,narrow=R.W<520,S=STEPS[k],from=k?STEPS[k-1].to:0,shown=from+(S.to-from)*e,col={F:P.c1,C:P.c3};
    R.grid(-6.4,5.2,-2.9,2.7,.5);
    const ra=r=>S.f.includes(r)?1:.3;
    // the rows' floors and the cache plates at their heads
    ZR.forEach((z,r)=>{const a=ra(r);R.quad([[XC(1)-.45,0,z-.38],[XC(12)+.45,0,z-.38],[XC(12)+.45,0,z+.38],[XC(1)-.45,0,z+.38]],{fill:P.soft,a:.7*a+.1,ec:P.line});
      R.label([XP-.55,.35,z],narrow?ROWS[r]:ROWN[r],{fs:12.5,al:'right',dx:-8,b:a===1,c:a===1?P.ink:P.mute,grp:'rows'})});
    // which model each row is on at turn t, and whether its cache is warm (holds this session's prefix)
    function plate(r,model,warmNow,a){const z=ZR[r],c=col[model],x0=model==='C'&&r===1?XP+.42:XP-.3;
      R.glass([x0,.05,z-.3],[0,0,.6],[0,.75,0],{c,a:(warmNow?.9:.25)*a,nu:2,nv:4})}
    const cur=Math.max(1,Math.ceil(shown-1e-9));
    const rowModel=(turns,r,t)=>{let m=null;turns.forEach(u=>{if(u.row===r&&u.x<=t)m=u.model});return m};
    SESS.forEach(([nm,turns])=>{
      turns.forEach(u=>{const g=cl01(shown-(u.x-1));if(g<=0)return;const z=ZR[u.row],x=XC(u.x),a=ra(u.row)*(u.x===cur&&k<7?1:.85),c=col[u.model];
        const hc=u.cached*HK*g,hf=u.fresh*HK*g;
        if(hc>.003)R.box([x,0,z],[CW,hc,CW],{fill:mix(P.paper,c,.28),a,shadow:false,lw:.6});
        if(hf>.003)R.box([x,hc,z],[CW,hf,CW],{fill:u.miss?mix(P.paper,P.bad,.75):mix(P.paper,c,.8),a,shadow:false,lw:u.miss?1.6:.6,ec:u.miss?P.bad:undefined});
        // the turn being played: dots from the cache into the pale part, red dots carrying the history into a miss
        if(u.x===cur&&g>0&&g<1.0001&&S.f.includes(u.row)&&k<7){
          if(u.cached>0)R.flowArc([XP-.1,.45,z],[x,Math.max(.15,hc*.6),z],.35,{c,n:Math.max(3,Math.round(u.cached/6)),r:.06,speed:1.4});
          if(u.miss)R.flowArc([x-.78,(u.ctx-D)*HK*.8,z],[x,hf*.5,z],.5,{c:P.bad,n:12,r:.08,speed:1.5})}
        if(u.miss&&g>.6)R.label([x,(u.ctx)*HK*g,z],narrow||u.x!==cur||k===7?u.ctx+'K':u.ctx+'K re-read',{mono:true,fs:12,dy:-9,b:1,c:P.bad,a:ra(u.row)===1?1:.5});
      });
    });
    // cache plates: one per model a row uses
    plate(0,'F',cur>=1,ra(0));
    plate(1,'F',!(cur>=7&&cur<10),ra(1));plate(1,'C',cur>=7,ra(1));
    plate(2,'F',true,ra(2));plate(3,'C',cur>=5,ra(3));
    // Fusion's hand-offs: the brief (turn 4 to 5) and the result (turn 10 to 11)
    const fu4=FU[3],fu10=FU[9];
    if(shown>4&&shown<=7)R.flowArc([XC(4),fu4.ctx*HK,ZR[2]],[XC(5),10*HK,ZR[3]],.5,{c:P.c4,n:5,r:.07,speed:1.2,a:k===2?1:.5});
    if(shown>4&&k>=2)R.label([(XC(4)+XC(5))/2,.9,(ZR[2]+ZR[3])/2],'brief 2K',{fs:12,dy:-6,c:P.c4,a:k===2?1:.55,wide:1});
    if(shown>10)R.flowArc([XC(10),fu10.ctx*HK,ZR[3]],[XC(11),FU[10].ctx*HK,ZR[2]],.5,{c:P.c4,n:5,r:.07,speed:1.2,a:k===6?1:.4});
    if(shown>10)R.label([(XC(10)+XC(11))/2,1.5,(ZR[2]+ZR[3])/2],'result 2K',{fs:12,dy:-6,c:P.c4,a:k===6?1:.55,wide:1});
    // turn numbers along the front row
    for(let i=1;i<=12;i++)R.label([XC(i),0,ZR[3]+.45],(i===1&&!narrow?'turn ':'')+i,{fs:12,dy:12,c:P.mute,a:i<=cur?1:.4,al:i===1&&!narrow?'right':undefined,dx:i===1&&!narrow?8:0});
    // the session sums at the end of each row (wide screens; on a phone the table under the step list carries them)
    if(S.sum&&!narrow)[[ONE,0],[ROUTE,1],[FU,2]].forEach(([t,r])=>{const s=sums(t,12);R.label([XC(12)+.5,.2,r===2?(ZR[2]+ZR[3])/2:ZR[r]],(narrow?'':'Σ ')+s.total+'K, '+s.hit+'% cached',{mono:true,fs:12.5,b:1,al:'left',dx:6,c:r===1?P.bad:P.c1,a:e})});
  }
  function cl01(v){return Math.max(0,Math.min(1,v))}
  // the table under the step list: every session at the end of the current step
  function table(k){const t=STEPS[k].to,el=document.getElementById('fuTab');if(!el)return;
    const rows=[['One model throughout',ONE],['Switch models mid-session',ROUTE],['Fusion: lead + sidekick',FU]].map(([n,tu])=>{const s=sums(tu,t);
      return '<tr><td>'+n+'</td><td class="num">'+s.cached+'K</td><td class="num">'+s.fresh+'K</td><td class="num">'+s.hit+'%</td><td class="num">'+s.miss+'</td></tr>'}).join('');
    el.innerHTML='<caption class="small mute">After turn '+t+' of this illustrative session</caption><thead><tr><th>Session</th><th class="num">From cache</th><th class="num">Full price</th><th class="num">Cache hit</th><th class="num">Full re-reads</th></tr></thead><tbody>'+rows+'</tbody>'}
  const full={cam:[.2,.82],bounds:[[-6.1,0,-2.6],[4.9,2.4,2.5]]};
  const near={cam:[.2,.7],bounds:[[XC(3)-.5,0,ZR[1]-.7],[XC(11)+.5,2.4,ZR[1]+.7]]};
  S3.stage({id:'stg-fusion',list:'sx-fusion',fig:'Fig. · one illustrative session, three ways',cam:full.cam,bounds:full.bounds,aspect:.45,dur:1700,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,140,10,150],onStep:k=>table(k),
    view:k=>(k===3||k===5)&&innerWidth>=520?near:full}); // on a phone the close view would crop the rows, so it keeps the full view
  window.TN_FUSION={ONE,ROUTE,FU,STEPS,sums}; // read by src/check_stages.mjs
})();
