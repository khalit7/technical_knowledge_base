// ---- Section 8 (graph): k-hop timings on four engines (log scale), the counts, the raw queries, shortest path ----
(function(){
  const G=NQ.graph; if(!G)return;
  const el=id=>document.getElementById(id), f0=n=>Math.round(n).toLocaleString('en-US');
  const H=[1,2,3,4], E=[['pg','recursive_cte','Postgres, recursive CTE','var(--c1)'],['pg','join_per_hop','Postgres, one DISTINCT join per hop','var(--c3)'],['neo4j',null,'Neo4j '+(G.neo4j_version||''),'var(--c4)'],['kuzu',null,'Kuzu '+((G.kuzu||{}).version||''),'var(--c2)']];
  const val=(e,k)=>{const o=e[1]?G[e[0]][e[1]]:G[e[0]];const v=o&&(o[k]||o[String(k)]);return v?v.ms_p50:null};
  function chart(){
    const svg=el('rd-g-svg'), w=RD.width(svg), one=w<560, h=one?262:230, x0=46, x1=w-24, y0=16, y1=h-(one?86:58);
    const lo=Math.log10(0.1), hi=Math.log10(10000);
    const X=k=>x0+(k-1)*(x1-x0)/3, Y=v=>y1-(Math.log10(v)-lo)/(hi-lo)*(y1-y0);
    let s='';
    [0.1,1,10,100,1000,10000].forEach(v=>{s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(x0-4,Y(v)+4,v>=1000?(v/1000)+' s':v+' ms',{a:'end',fs:10,fill:'var(--mute)'})});
    H.forEach(k=>{s+=RD.t(X(k),y1+15,k+' hop'+(k>1?'s':''),{a:k===4?'end':k===1?'start':'middle',fs:10.5})});
    E.forEach((e,i)=>{const pts=H.map(k=>[k,val(e,k)]).filter(p=>p[1]!=null);
      s+='<polyline fill="none" stroke="'+e[3]+'" stroke-width="2" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3.5" fill="'+e[3]+'"/>'});
      const lx=one?8:8+(i%2)*(w/2), ly=one?h-62+i*15:h-26+Math.floor(i/2)*14;
      s+='<rect x="'+lx+'" y="'+(ly-8)+'" width="10" height="10" fill="'+e[3]+'"/>'+RD.t(lx+14,ly+1,e[2],{fs:10.5})});
    svg.innerHTML=RD.svg(w,h,s,'Median time to count users within k hops, log scale');
  }
  chart(); RD.onResize(chart); RD.onRender(chart);
  const cnt=k=>{const c=G.pg.counts[k]||G.pg.counts[String(k)];return c?Math.round(c.reduce((a,b)=>a+b,0)/c.length):null};
  el('rd-g-tab').innerHTML='<table><tr><th>Hops</th><th class="num">Users reached (mean)</th>'+E.map(e=>'<th class="num">'+e[2]+'</th>').join('')+'</tr>'+
    H.map(k=>'<tr><td>'+k+'</td><td class="num">'+f0(cnt(k))+'</td>'+E.map(e=>{const v=val(e,k);return '<td class="num">'+(v==null?'n/a':v+' ms')+'</td>'}).join('')+'</tr>').join('')+'</table>'+
    '<p class="small mute">Median of 10 users after a warm-up run; the slowest of the 10 is in the data. Counts are identical in all four engines. Kuzu at 4 hops: median '+(val(E[3],4)||'n/a')+' ms, slowest '+(((G.kuzu||{})[4]||(G.kuzu||{})['4']||{}).ms_max||'n/a')+' ms: its variable-length match enumerates paths before the DISTINCT.</p>';
  const best4=Math.min(val(E[0],4),val(E[1],4)), n4=val(E[2],4);
  const s4=el('rd-g-4'); if(s4)s4.textContent=n4<best4?Math.round((1-n4/best4)*100)+'% faster':Math.round((n4/best4-1)*100)+'% slower';
  const pf=(G.neo4j&&G.neo4j.profile_3hops)||[];
  el('rd-g-raw').textContent='-- Postgres, recursive CTE (k = 3)\n'+(G.pg.sql_recursive||'')+'\n\n-- Postgres, one DISTINCT join per hop (k = 2)\n'+(G.pg.sql_join_per_hop_2||'')+
    '\n\n-- Postgres plan of the recursive CTE, 3 hops, first user\n'+(G.pg.plan_recursive_3||[]).map(p=>p.node+': rows '+p.rows+', loops '+p.loops+', buffers '+p.buffers).join('\n')+
    '\n\n// Cypher (Neo4j)\n'+((G.neo4j||{}).cypher||'')+'\n\n// PROFILE, 3 hops\n'+pf.map(p=>p.op+': rows '+p.rows+', db hits '+p.dbHits).join('\n');
  const sp=G.pg_shortest, ns=(G.neo4j||{}).shortest;
  el('rd-g-sp').innerHTML=sp?'<table><tr><th>Method</th><th>Path found</th><th class="num">Time</th></tr>'+
    '<tr><td>Neo4j <code>shortestPath</code></td><td>'+(ns?ns.path.join(' - '):'')+'</td><td class="num">'+(ns?ns.ms+' ms':'')+'</td></tr>'+
    '<tr><td>Postgres recursive CTE carrying the path, stops at the first hit</td><td>'+(sp.recursive_path?sp.recursive_path.join(' - '):(sp.recursive_error||'none'))+'</td><td class="num">'+(sp.recursive_ms||[]).filter(x=>x!=null).map(x=>x+' ms').join(', ')+'</td></tr>'+
    '<tr><td>Postgres, breadth-first search from the client: one query per hop, visited set in the app</td><td>'+(sp.bfs.path||[]).join(' - ')+' ('+f0(sp.bfs.visited)+' users visited)</td><td class="num">'+sp.bfs.ms_p50+' ms</td></tr></table>'+
    '<p class="small mute">Any shortest path is correct; different methods may return different paths of the same length. The recursive CTE times are three consecutive runs.</p>':'<p class="small mute">(not measured)</p>';
})();
