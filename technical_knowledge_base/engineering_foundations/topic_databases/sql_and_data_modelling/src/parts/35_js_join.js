// ---- Reading, section 2: seven joins (and NOT IN) on the same two small tables, computed in the page ----
(function(){
  const out=document.getElementById('rd-join-out');if(!out)return;
  const esc=RD.esc;
  const U=[[1,'Ada','US'],[2,'Ben','GB'],[3,'Chen','IN'],[4,'Dara',null],[5,'Eli','US']];
  const M0=[['US','United States'],['GB','United Kingdom'],['DE','Germany']];
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
  let mode='inner';
  function rows(withNull){
    const M=withNull?M0.concat([[null,'(code unknown)']]):M0;const R=[];
    const pair=(u,m)=>({u,m});
    if(mode==='cross'){U.forEach(u=>M.forEach(m=>R.push(pair(u,m))));return R}
    if(mode==='semi')return U.filter(u=>M.some(m=>eq(m[0],u[2]))).map(u=>pair(u,null));
    if(mode==='anti')return U.filter(u=>!M.some(m=>eq(m[0],u[2]))).map(u=>pair(u,null));
    if(mode==='notin'){ // three-valued logic: x NOT IN (list) is true only if x <> every item is true
      return U.filter(u=>{if(u[2]===null)return false;let unknown=false;for(const m of M){if(m[0]===null){unknown=true;continue}if(m[0]===u[2])return false}return !unknown}).map(u=>pair(u,null))}
    const usedM=new Set();
    U.forEach(u=>{const ms=M.filter(m=>eq(m[0],u[2]));
      if(ms.length)ms.forEach(m=>{usedM.add(m);R.push(pair(u,m))});
      else if(mode==='left'||mode==='full')R.push(pair(u,null))});
    if(mode==='right'){const R2=R.slice();M.forEach(m=>{if(!usedM.has(m))R2.push(pair(null,m))});
      // keep RIGHT JOIN's natural order: by market
      return M.flatMap(m=>R2.filter(r=>r.m===m))}
    if(mode==='full')M.forEach(m=>{if(!usedM.has(m))R.push(pair(null,m))});
    return R}
  const CAP={
    inner:'Only matched pairs. Chen (IN is not a market) and Dara (no country) vanish; US appears twice because two users match it.',
    left:'Every user, matched or not; where no market matches, the market columns are NULL. Chen and Dara are kept.',
    right:'Every market, matched or not: Germany has no users and appears with NULL user columns. Chen and Dara are gone again.',
    full:'Both sides kept: the unmatched users (Chen, Dara) and the unmatched market (Germany). The join for reconciling two lists.',
    cross:'Every user with every market, no condition: 5 x 3 = 15 rows (5 x 4 with the NULL market). Useful for grids, a disaster when a join condition is forgotten.',
    semi:'Users with at least one matching market, each once, however many markets match. A plain JOIN would repeat a user per match.',
    anti:'Users with no matching market: Chen and Dara. NOT EXISTS asks "is there a matching row?", so a NULL anywhere does not change the answer.',
    notin:'Looks like the anti join, but Dara is missing even now: her country is NULL, and NULL NOT IN (...) is unknown, not true.'};
  const CAPN={notin:'With a NULL in the list, every comparison against it is unknown, so no row can pass: zero rows. NOT EXISTS (try "anti") is unaffected.',
    anti:'Still Chen and Dara: NOT EXISTS ignores the NULL market, because NULL = anything never matches.'};
  function cell(v,cls){return '<td class="'+(v===null?'nul':'')+'"'+(cls?' style="background:'+cls+'"':'')+'>'+(v===null?'NULL':esc(v))+'</td>'}
  function draw(){
    const withNull=document.getElementById('rd-join-null').checked;
    document.getElementById('rd-join-sql').textContent=SQL[mode];
    const R=rows(withNull);const two=!['semi','anti','notin'].includes(mode);
    const lc='color-mix(in srgb,var(--c1) 16%,transparent)',rc='color-mix(in srgb,var(--c2) 16%,transparent)';
    let h='<div class="tw2"><table class="rt"><tr><th>u.id</th><th>u.name</th><th>u.country</th>'+(two?'<th>m.code</th><th>m.name</th>':'')+'</tr>';
    R.forEach(r=>{const u=r.u||[null,null,null],m=r.m||[null,null];
      h+='<tr>'+cell(u[0],r.u?lc:'')+cell(u[1],r.u?lc:'')+cell(u[2],r.u?lc:'')+(two?cell(m[0],r.m?rc:'')+cell(m[1],r.m?rc:''):'')+'</tr>'});
    h+='</table></div><div class="leg"><span style="--sw:color-mix(in srgb,var(--c1) 40%,transparent)">from users</span>'+(two?'<span style="--sw:color-mix(in srgb,var(--c2) 40%,transparent)">from markets</span>':'')+'<span>'+R.length+' row'+(R.length===1?'':'s')+'</span></div>';
    out.innerHTML=h;
    document.getElementById('rd-join-cap').textContent=(withNull&&CAPN[mode])?CAPN[mode]:CAP[mode];
  }
  RD.seg(document.getElementById('rd-join-mode'),m=>{mode=m;draw()});
  document.getElementById('rd-join-null').addEventListener('change',draw);
  draw();
})();
