// ---- Tables tab: Table 1 (paper and blog), Figure 5 numbers, Figures 6, 7, 8, 10, and every check ----
(function(){if(!$('t-tables'))return;
  let ver='paper',srt='paper';
  function t1(){const T=PT.t1,rows=T.rows.map((r,i)=>({r,i,v:ver==='blog'?T.blog[r[0]]:r[3]}));
    rows.forEach(o=>{o.g=[0,1,2].map(m=>o.v[2*m]-o.v[2*m+1]);o.mg=o.g.reduce((a,b)=>a+b,0)/3});
    if(srt==='gap')rows.sort((a,b)=>b.mg-a.mg);
    const M=['GLM-5.2: Prime | Pi-mono','Opus 5: Prime | Claude Code','GPT-5.6 Sol: Prime | Codex'];
    let h='<table><thead><tr><th>Task</th><th>Setting</th>'+M.map(m=>'<th class="num">'+m+'</th>').join('')+'<th class="num">mean gap</th></tr></thead><tbody>';
    rows.forEach(o=>{h+='<tr><td>'+(o.r[2]?A(o.r[2],o.r[0]):o.r[0])+'</td><td class="small">'+o.r[1]+'</td>';
      [0,1,2].forEach(m=>{const a=o.v[2*m],b=o.v[2*m+1],d=o.g[m],c=d>=0.02?'var(--good)':d<=-0.02?'var(--bad)':'var(--mute)';
        const diff=T.blog[o.r[0]][2*m+1]!==o.r[3][2*m+1]||T.blog[o.r[0]][2*m]!==o.r[3][2*m];
        h+='<td class="num"'+(diff?' style="outline:2px solid var(--bad);outline-offset:-2px"':'')+'>'+a.toFixed(3).replace(/^0/,'')+' | '+b.toFixed(3).replace(/^0/,'')+' <span style="color:'+c+';font-weight:600">'+(d>0?'+':'')+d.toFixed(3)+'</span></td>'});
      h+='<td class="num">'+(o.mg>0?'+':'')+o.mg.toFixed(3)+'</td></tr>'});
    const wins=rows.reduce((a,o)=>a+o.g.filter(d=>d>0).length,0);
    h+='</tbody></table><p class="small">'+(ver==='blog'?'Blog version (5 August 2026): ':'arXiv v1 (24 August 2026): ')+'Prime Agent higher in '+wins+' of 27 pairs; '+rows.reduce((a,o)=>a+o.g.filter(d=>Math.abs(d)<0.02).length,0)+' gaps under 0.02.'+(ver==='blog'?' The blog had Codex at 0.500 on OOLONG; the paper has 0.900.':'')+'</p>';
    $('t1Tab').innerHTML=h}
  segBind('t1V',m=>{ver=m;t1()});segBind('t1S',m=>{srt=m;t1()});
  function f5(){const F=PT.fig5;let h='<table><thead><tr><th>Run</th><th class="num">score</th><th class="num">printed</th><th class="num">output tokens per game</th><th class="num">estimated API cost</th></tr></thead><tbody>';
    Object.entries(F.runs).forEach(([n,r])=>{const t=r.tokens?r.tokens[r.tokens.length-1][0]:null,c=r.cost[r.cost.length-1][0];h+='<tr><td>'+n+'</td><td class="num">'+r.cost[r.cost.length-1][1].toFixed(2)+'</td><td class="num">'+F.printed[n]+'</td><td class="num">'+(t?fmt(t):'not in panel A')+'</td><td class="num">$'+fmt(c)+'</td></tr>'});
    Object.entries(F.refs).forEach(([n,r])=>{const tp=F.ref_token_points[n];h+='<tr><td class="mute">'+n+' (external)</td><td class="num">'+r.score.toFixed(2)+'</td><td class="num">'+r.printed+'</td><td class="num">'+(tp?fmt(tp[tp.length-1][0]):'')+'</td><td class="num">'+(r.cost?'$'+fmt(r.cost):'')+'</td></tr>'});
    $('f5Tab').innerHTML=h+'</tbody></table>'}
  function f6(){const F=PT.fig6,P=RC.fig6;let h='<table><thead><tr><th>Model</th><th>Harness</th><th class="num">experiments</th><th class="num">training runs</th><th class="num">per 100 (printed)</th><th class="num">recomputed</th></tr></thead><tbody>';
    F.forEach(r=>{h+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+fmt(r[3])+'</td><td class="num">'+r[4]+'</td><td class="num">'+(100*r[2]/r[3]).toFixed(2)+'</td></tr>'});
    h+='</tbody></table><p class="small">'+P.map(p=>p.model+', Prime Agent against '+p.vs+': rate ratio '+p.rate_ratio+'× (raw counts '+p.count_ratio+'×), one-sided exact p '+(p.p_one_sided<0.001?'< 0.001':p.p_one_sided.toFixed(3))).join('. ')+'. The test treats experiments as independent across a model\'s runs and takes the hand classification as given.</p>';
    $('f6Tab').innerHTML=h;(function(){const host=$("f6Svg");fit(host,w=>{const lw=Math.min(190,w*.42),bh=18,H=F.length*(bh+6)+8;let s='';const bx=v=>lw+(w-lw-110)*v/8;
      F.forEach((r,i)=>{const y=4+i*(bh+6),pr=r[1]==='Prime Agent';s+=tx(lw-6,y+13,(i===0||F[i-1][0]!==r[0]?r[0]+', ':'')+r[1],{fs:11,a:'end',w:pr?700:null});s+=rc(lw,y,bx(r[4])-lw,bh,pr?'var(--c2)':'var(--dim)',{r:3})+tx(bx(r[4])+4,y+13,r[4]+' ('+r[2]+'/'+r[3]+')',{fs:11})});
      host.innerHTML=svgW(w,H,s,'Figure 6')})})()}
  let emu='genesis';
  function f7(w){const E=PT.fig7[emu],S=E.series,C={'Prime Agent + Sol':['var(--c2)',null],'Codex + Sol':['var(--c2)','6 4'],'Prime Agent + Opus 5':['var(--c4)',null],'Claude Code + Opus 5':['var(--c4)','2 4']};
    const pl=34,pr=10,pt=8,H=230,pb=34,pw=w-pl-pr,ph=H-pt-pb,X=v=>pl+pw*v/E.xmax_usd,Y=v=>pt+ph*(1-v);let s='';
    [0,.5,1].forEach(v=>{s+=ln2(pl,Y(v),pl+pw,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
    s+=tx(pl,H-16,'$0',{fs:11,c:'var(--mute)'})+tx(pl+pw,H-16,'$'+E.xmax_usd,{fs:11,a:'end',c:'var(--mute)'})+tx(pl+pw/2,H-4,'estimated cost',{fs:11,a:'middle',c:'var(--mute)'});
    Object.entries(S).forEach(([n,P],j)=>{const [c,da]=C[n];s+='<path d="'+P.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+(Y(p[1])+(j%2?2:-2)).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2.2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'});
    const lg=legend(Object.keys(S).map(n=>[n+' '+S[n][S[n].length-1][1].toFixed(3),C[n][0],C[n][1]]),pl,H+14,w-pl);
    $('f7Svg').innerHTML=svgW(w,H+lg.h+4,s+lg.s,'Figure 7 decoded')}
  segBind('f7M',m=>{emu=m;refit($('f7Svg'))});
  function f8(){const F=PT.fig8,P=RC.fig8;let h='<table><thead><tr><th>Model, budget</th><th>Harness</th><th class="num">solved</th><th class="num">printed</th><th class="num">recomputed</th></tr></thead><tbody>';
    F.forEach(r=>{h+='<tr><td>'+r[0]+', '+r[1]+'</td><td>'+r[2]+'</td><td class="num">'+r[3]+' / '+r[4]+'</td><td class="num">'+r[5]+'%</td><td class="num">'+(100*r[3]/r[4]).toFixed(1)+'%</td></tr>'});
    $('f8Tab').innerHTML=h+'</tbody></table><p class="small">'+P.map(p=>p.model+': Prime Agent '+(p.diff_pts>0?'+':'')+p.diff_pts+' points ('+(p.tasks>0?'+':'')+p.tasks+' tasks), standard error of the difference about '+p.se_pts+' points if the two runs were independent samples').join('; ')+'. The paper calls the gap "no large observed gap".</p>'}
  let pan='states',all=false;
  function f10(w){const P=PT.fig10.panels[pan],MC={'GLM-5.2':'var(--c3)','Opus 5':'var(--c4)','GPT-5.6 Sol':'var(--c2)'};
    let xmax=45,ymax={states:2500,rooms:25,gems:5}[pan];if(all){Object.values(P).forEach(s=>s.forEach(p=>{xmax=Math.max(xmax,p[0]);ymax=Math.max(ymax,p[1])}))}
    const pl=40,pr=10,pt=8,H=240,pb=34,pw=w-pl-pr,ph=H-pt-pb,X=v=>pl+pw*v/xmax,Y=v=>pt+ph*(1-v/ymax);let s='';
    [0,.5,1].forEach(f=>{const v=ymax*f;s+=ln2(pl,Y(v),pl+pw,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
    const xt=all?[0,50,100,150,200]:[0,15,30,45];xt.forEach(v=>{if(v<=xmax)s+=tx(X(v),H-16,'$'+v,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx(pl+pw/2,H-4,'estimated token cost (USD)',{fs:11,a:'middle',c:'var(--mute)'});
    if(all)s+=rc(X(45),pt,pw+pl-X(45),ph,'var(--soft)',{r:0,op:.6})+tx(X(45)+4,pt+14,'clipped in the paper',{fs:11,c:'var(--mute)'});
    Object.entries(P).forEach(([k,ser])=>{const [mdl,who]=k.split(' | '),c=MC[mdl],pts=all?ser:ser.filter(p=>p[0]<=45.01);
      if(!all){const nx=ser.find(p=>p[0]>45.01),lp=pts[pts.length-1];if(nx&&lp&&lp[0]<45)pts.push([45,lp[1]+(nx[1]-lp[1])*(45-lp[0])/(nx[0]-lp[0])])}
      s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="'+(who==='Prime Agent'?2.4:1.6)+'"'+(who==='Prime Agent'?'':' stroke-dasharray="5 4"')+'/>'});
    const lg=legend([['GLM-5.2','var(--c3)'],['Opus 5','var(--c4)'],['GPT-5.6 Sol','var(--c2)'],['Prime Agent','var(--ink)'],['comparison','var(--ink)','5 4']],pl,H+14,w-pl);
    $('f10Svg').innerHTML=svgW(w,H+lg.h+4,s+lg.s,'Figure 10 decoded')}
  segBind('f10P',m=>{pan=m;refit($('f10Svg'))});$('f10All').addEventListener('change',e=>{all=e.target.checked;refit($('f10Svg'))});
  function chk(){const C=RC.checks.concat(PT.figchecks.map(c=>({what:c.what,got:c.decoded,want:c.printed,ok:c.ok,where:'decoded vector figure'})));
    let h='<table><thead><tr><th>Check</th><th class="num">this page</th><th class="num">paper or source</th><th></th></tr></thead><tbody>';
    C.forEach(c=>{h+='<tr><td>'+c.what+'<div class="small mute">'+(c.where||'')+(c.note?' · '+c.note:'')+'</div></td><td class="num">'+c.got+'</td><td class="num">'+c.want+'</td><td>'+(c.ok?'<span class="ok">reproduces</span>':'<span style="color:var(--bad)">differs</span>')+'</td></tr>'});
    $('chkTab').innerHTML=h+'</tbody></table><p class="small">'+C.filter(c=>c.ok).length+' of '+C.length+' checks reproduce. Not checkable: Best@3 (99.97%), the other two ARC runs, every nanoGPT record, and Table 1 itself (no traces released).</p>'}
  onTab('t-tables',()=>{t1();f5();f6();fit($('f7Svg'),f7);f8();fit($('f10Svg'),f10);chk()});
})();
