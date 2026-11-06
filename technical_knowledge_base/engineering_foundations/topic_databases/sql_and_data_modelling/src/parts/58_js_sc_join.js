// ---- Scene, Fig. 2 (section 2): every join is the same grid of pairs; the kinds differ only in what they keep (renderer v2) ----
// Five users (one with no country) against three markets (one with no users), illustrative; step 9 adds a market whose code is NULL.
// Pairs where ON is true stand up as green blocks, pairs involving a NULL show U (unknown); what a join keeps streams into the result stack.
// The SQL and the result table on the left follow the step (computed here by the same rules; src/check_stages.mjs checks the row counts).
(function(){
  if(!document.getElementById('stg-join'))return;const {at,off,lerp,mix,cl}=S3;
  const esc=RD.esc;
  const U=[[1,'Ada','US'],[2,'Ben','GB'],[3,'Chen','IN'],[4,'Dara',null],[5,'Eli','US']];
  const M0=[['US','United States'],['GB','United Kingdom'],['DE','Germany']],MN=[null,'(code unknown)'];
  const MODES=['cross','inner','left','right','full','semi','anti','notin','notin'];
  const SQL={
    inner:'SELECT u.id, u.name, u.country, m.code, m.name\nFROM users u JOIN markets m ON m.code = u.country;',
    left:'SELECT u.id, u.name, u.country, m.code, m.name\nFROM users u LEFT JOIN markets m ON m.code = u.country;',
    right:'SELECT u.id, u.name, u.country, m.code, m.name\nFROM users u RIGHT JOIN markets m ON m.code = u.country;',
    full:'SELECT u.id, u.name, u.country, m.code, m.name\nFROM users u FULL JOIN markets m ON m.code = u.country;',
    cross:'SELECT u.id, u.name, u.country, m.code, m.name\nFROM users u CROSS JOIN markets m;',
    semi:'SELECT u.id, u.name, u.country FROM users u\nWHERE EXISTS (SELECT 1 FROM markets m WHERE m.code = u.country);',
    anti:'SELECT u.id, u.name, u.country FROM users u\nWHERE NOT EXISTS (SELECT 1 FROM markets m WHERE m.code = u.country);',
    notin:'SELECT u.id, u.name, u.country FROM users u\nWHERE u.country NOT IN (SELECT code FROM markets);'};
  const eq=(a,b)=>a!==null&&b!==null&&a===b; // SQL equality: NULL matches nothing
  // the rows a join returns, as {u, m} pairs (m null for semi and anti joins and for unmatched users; u null for unmatched markets)
  function rows(mode,withNull){const M=withNull?M0.concat([MN]):M0,R=[];
    if(mode==='cross'){U.forEach(u=>M.forEach(m=>R.push({u,m})));return R}
    if(mode==='semi')return U.filter(u=>M.some(m=>eq(m[0],u[2]))).map(u=>({u,m:null}));
    if(mode==='anti')return U.filter(u=>!M.some(m=>eq(m[0],u[2]))).map(u=>({u,m:null}));
    if(mode==='notin') // three-valued logic: x NOT IN (list) is true only if x <> item is true for every item
      return U.filter(u=>{if(u[2]===null)return false;let unk=false;for(const m of M){if(m[0]===null){unk=true;continue}if(m[0]===u[2])return false}return !unk}).map(u=>({u,m:null}));
    const used=new Set();U.forEach(u=>{const ms=M.filter(m=>eq(m[0],u[2]));if(ms.length)ms.forEach(m=>{used.add(m);R.push({u,m})});else if(mode==='left'||mode==='full')R.push({u,m:null})});
    if(mode==='right'){M.forEach(m=>{if(!used.has(m))R.push({u:null,m})});return M.flatMap(m=>R.filter(r=>r.m===m))}
    if(mode==='full')M.forEach(m=>{if(!used.has(m))R.push({u:null,m})});return R}
  const NS=MODES.length,count=MODES.map((m,k)=>rows(m,k===8).length);
  window.CHK=Object.assign(window.CHK||{},{join:{modes:MODES,count,anti_null:rows('anti',true).length}});
  // geometry: users down the z axis, markets across x; a ghost column (NULLs for unmatched users) and a ghost row (NULLs for unmatched markets)
  const z=i=>-1.2+i*.6,x=j=>-1.15+j*1.05,XG=x(3),ZG=z(5)+.05,RX=4.2,RZ=0;
  function draw(R,k,e){const P=R.P,mode=MODES[k],wn=k===8,M=wn?M0.concat([MN]):M0;R.grid(-3.6,5,-2.6,2.6,.5);
    const K=rows(mode,wn),rowMode=['semi','anti','notin'].includes(mode),ea=Math.min(1,e*1.4);
    // the two tables as labelled blocks: users on the left, markets at the back
    U.forEach((u,i)=>{const kept=rowMode&&K.some(r=>r.u===u),drop=rowMode&&!kept;
      R.box([-2.55,0,z(i)],[1.3,.2,.46],{fill:kept?mix(P.paper,P.good,.45*ea):u[2]===null?mix(P.paper,P.c5,.35):mix(P.paper,P.c1,.22),a:drop?lerp(1,.35,ea):1});
      R.label([-2.55,.2,z(i)],u[1]+' · '+(u[2]===null?'NULL':u[2]),{fs:12.5,b:1,dy:-10,c:u[2]===null?P.c5:P.ink,a:drop?.5:1});
      if(kept)R.flowArc([-1.9,.18,z(i)],[RX,.25,RZ],.6,{c:P.good,a:ea,r:.06,n:9,speed:1.6})});
    M.forEach((m,j)=>{const na=j===3?e:1;R.box([x(j),0,-2.0],[.82,.2,.46],{fill:m[0]===null?mix(P.paper,P.c5,.4):mix(P.paper,P.c2,.25),a:na});
      R.label([x(j),.2,-2.0],m[0]===null?'NULL':m[0],{fs:12.5,b:1,mono:true,dy:-10,c:m[0]===null?P.c5:P.ink,a:na})});
    R.label([-2.55,0,z(4)],'users',{fs:12,c:P.mute,dy:22,wide:1});R.label([x(2)+.6,.2,-2.0],'markets',{fs:12,c:P.mute,al:'left',dx:6,dy:-10,wide:1});
    // the grid of pairs
    U.forEach((u,i)=>M.forEach((m,j)=>{const na=j===3?e:1,on=eq(m[0],u[2]),un=u[2]===null||m[0]===null;
      const kept=mode==='cross'||(['inner','left','right','full'].includes(mode)&&on);
      if(k>=1&&on){R.box([x(j),0,z(i)],[.8,.26,.44],{fill:mix(P.paper,P.good,.55),a:na});R.label([x(j),.26,z(i)],'TRUE',{fs:12,b:1,c:P.good,dy:-9,a:na,wide:1})}
      else{R.box([x(j),0,z(i)],[.8,.04,.44],{fill:k>=1&&un?mix(P.paper,P.c5,.3):P.paper,a:na*(rowMode?.7:1),shadow:false});
        if(k>=1&&un)R.label([x(j),.04,z(i)],'U',{fs:13,b:1,c:P.c5,a:na})}
      if(kept){R.glow([x(j),.2,z(i)],.42,{c:P.acc,a:ea*.55});R.flowArc([x(j),on?.28:.06,z(i)],[RX,.25,RZ],.5+.08*j,{c:P.acc,a:ea*.85,r:.05,n:7,speed:1.5})}}));
    // NULL-padded rows: unmatched users get a ghost market (LEFT, FULL); unmatched markets a ghost user (RIGHT, FULL)
    if(mode==='left'||mode==='full')U.forEach((u,i)=>{if(M.some(m=>eq(m[0],u[2])))return;
      R.quad([[XG-.4,.02,z(i)-.22],[XG+.4,.02,z(i)-.22],[XG+.4,.02,z(i)+.22],[XG-.4,.02,z(i)+.22]],{fill:mix(P.paper,P.acc,.15),a:ea,dash:[4,3],ec:P.acc});
      R.label([XG,.02,z(i)],'NULLs',{fs:12,mono:true,c:P.acc,a:ea});R.flowArc([XG,.06,z(i)],[RX,.25,RZ],.4,{c:P.acc,a:ea*.85,r:.05,n:6,speed:1.5})});
    if(mode==='right'||mode==='full')M.forEach((m,j)=>{if(U.some(u=>eq(m[0],u[2])))return;
      R.quad([[x(j)-.4,.02,ZG-.22],[x(j)+.4,.02,ZG-.22],[x(j)+.4,.02,ZG+.22],[x(j)-.4,.02,ZG+.22]],{fill:mix(P.paper,P.acc,.15),a:ea,dash:[4,3],ec:P.acc});
      R.label([x(j),.02,ZG],'NULLs',{fs:12,mono:true,c:P.acc,a:ea});R.flowArc([x(j),.06,ZG],[RX,.25,RZ],.5,{c:P.acc,a:ea*.85,r:.05,n:6,speed:1.5})});
    // the result: one slab per row returned
    const n=K.length;for(let r=0;r<n;r++)R.box([RX,r*.11,RZ],[.95,.09,.6],{fill:mix(P.paper,rowMode?P.good:P.acc,.35),a:cl(ea*n-r,0,1),shadow:r===0,lw:.5});
    if(!n)R.quad([[RX-.47,.01,RZ-.3],[RX+.47,.01,RZ-.3],[RX+.47,.01,RZ+.3],[RX-.47,.01,RZ+.3]],{a:1,dash:[4,3],ec:P.bad});
    R.label([RX,n*.11,RZ],n+' row'+(n===1?'':'s'),{fs:14,b:1,dy:-12,c:n?P.ink:P.bad});
  }
  function table(k){const mode=MODES[k],wn=k===8,R=rows(mode,wn),two=!['semi','anti','notin'].includes(mode);
    const lc='color-mix(in srgb,var(--c1) 16%,transparent)',rc='color-mix(in srgb,var(--c2) 16%,transparent)',cell=(v,c)=>'<td class="'+(v===null?'nul':'')+'"'+(c?' style="background:'+c+'"':'')+'>'+(v===null?'NULL':esc(v))+'</td>';
    let h='<div class="tw2"><table class="rt"><tr><th>u.id</th><th>u.name</th><th>u.country</th>'+(two?'<th>m.code</th><th>m.name</th>':'')+'</tr>';
    R.forEach(r=>{const u=r.u||[null,null,null],m=r.m||[null,null];h+='<tr>'+cell(u[0],r.u?lc:'')+cell(u[1],r.u?lc:'')+cell(u[2],r.u?lc:'')+(two?cell(m[0],r.m?rc:'')+cell(m[1],r.m?rc:''):'')+'</tr>'});
    if(!R.length)h+='<tr><td colspan="3" class="nul">(no rows)</td></tr>';
    document.getElementById('rd-join-out').innerHTML=h+'</table></div>';
    document.getElementById('rd-join-sql').textContent=(wn?'-- markets now holds a row whose code is NULL\n':'')+SQL[mode]}
  S3.stage({id:'stg-join',list:'sx-join',fig:'Fig. 2 · five users × three markets, every pair (illustrative)',cam:[.42,.82],bounds:[[-3.3,0,-2.3],[4.7,.5,2.2]],aspect:.48,dur:1300,hold:4600,draw,
    margin:w=>w<520?[16,8,12,8]:[18,16,14,16],onStep:k=>{try{table(k)}catch(err){}},
    // the row-filter joins (semi, anti, NOT IN) look at the users' column; the others at the whole grid
    view:k=>k>=5?{cam:[.55,.78],bounds:[[-3.3,0,-2.3],[4.7,.5,1.6]]}:null});
})();
