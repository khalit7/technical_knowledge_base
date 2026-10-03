// ---- Tables tab: sortable tables, ablation switcher, noise chart, figures 5 and 6, checks ----
(function(){
  const TB=PAPER.tables,FG=PAPER.figs,RC=PAPER.rc;
  const n=s=>{const v=parseFloat(String(s).replace(/[,%*k×]/g,''));return isNaN(v)?null:v};
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  // a sortable table: cols, rows (arrays of cell html), numeric sort keys from the text
  function table(host,cols,rows,o){o=o||{};let key=-1,dir=1;
    const draw=()=>{const R=rows.slice();if(key>=0)R.sort((a,b)=>{const x=n(a[key].replace(/<[^>]+>/g,'')),y=n(b[key].replace(/<[^>]+>/g,''));if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x-y)*dir});
      $(host).innerHTML=(o.cap?'<p class="small"><b>'+o.cap+'</b></p>':'')+'<table><thead><tr>'+cols.map((c,i)=>'<th class="'+(i&&!o.text?'num':'')+'" data-i="'+i+'" style="cursor:pointer" title="Sort">'+c+(key===i?(dir>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>'+R.map(r=>'<tr>'+r.map((c,i)=>'<td class="'+(i&&!o.text?'num':'')+'">'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
      $(host).querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const i=+th.dataset.i;if(key===i)dir=-dir;else{key=i;dir=-1}draw()}))};
    draw()}
  const withSd=(t,i,j,v)=>t.sd&&t.sd[i]&&t.sd[i][j]?v+'<span class="mute small"> ± '+t.sd[i][j]+'</span>':v;
  // Table 3
  function t3(){const t=TB.t3,same=$('t3Same').checked,meas=$('t3Meas').checked,base=t.rows[0];
    const rows=t.rows.filter(r=>!same||r[1]==='Qwen3.5-27B'||r[8]==='base').map(r=>{const out=[r[8]==='ours'?'<b>'+r[0]+'</b>':esc(r[0]),r[1],r[2],r[3]];
      [4,5,6,7].forEach(j=>{let c=r[j];if(meas&&c!=='–'&&!/\*/.test(c)&&r[8]==='synth')c='<span class="mute">('+c+')</span>';
        const d=n(r[j])!=null&&n(base[j])!=null&&r!==base?n(r[j])-n(base[j]):null;out.push(c+(d!=null?'<br><span class="small mute">Δ '+(d>=0?'+':'')+d.toFixed(1)+'</span>':''))});return out});
    table('t3Tab',t.cols,rows)}
  ['t3Same','t3Meas'].forEach(id=>$(id).addEventListener('change',t3));t3();
  // ablations
  const ABN={t4:'re-solving against imitation',t5:'agentic completion',t6:'verifier filtering',t7:'breadth (Cross-WS)',t8:'trajectory profiles',t9:'depth (Multi-Round) on EvoCode-Bench v2',t10:'budget allocation',t11:'SWE to terminal transfer'};
  function ab(k){const t=TB[k];$('abTitle').innerHTML=A(PAPER.meta.ax+'#'+t.at,t.title.split(':')[0])+': '+esc(t.title.split(':').slice(1).join(':'))+'.';
    table('abTab',t.cols,t.rows.map((r,i)=>r.map((c,j)=>j?withSd(t,i,j,c):esc(c))))}
  segBind('abM',ab);ab('t4');
  // noise chart
  function nz(w){const N=RC.noise,narrow=w<620,lw=narrow?4:Math.min(300,w*.5),pw=w-lw-(narrow?90:100),sx=v=>lw+pw*(Math.max(-9,v)+9)/22;const x0=sx(0),rh=narrow?40:24;let s='';
    [0,2].forEach(v=>{s+=ln2(sx(v),4,sx(v),N.length*rh+8,v?'var(--bad)':'var(--mute)',{da:v?'4 3':null})});
    s+=tx(sx(2)+4,N.length*rh+22,'2 standard errors',{fs:11,c:'var(--bad)'});
    N.forEach((r,i)=>{const y=8+i*rh,by=narrow?y+18:y+3,c=Math.abs(r.z)>=2?'var(--c3)':'var(--dim)';const nm=narrow?(r.cmp.length>58?r.cmp.slice(0,57)+'…':r.cmp):(r.cmp.length>46?r.cmp.slice(0,45)+'…':r.cmp);
      s+='<g><title>'+esc(r.cmp)+': '+r.a+' vs '+r.b+', difference '+r.d+', standard error '+r.se+'. Paper: '+esc(r.paper)+'</title>'+(narrow?tx(4,y+12,esc(nm),{fs:11}):tx(lw-8,y+13,esc(nm),{fs:11,a:'end'}))+rc(Math.min(x0,sx(r.z)),by,Math.abs(sx(r.z)-x0),14,c,{r:2})+tx(Math.max(x0,sx(r.z))+5,by+11,'z '+r.z+' ('+(r.d>0?'+':'')+r.d+')',{fs:11})+'</g>'});
    $('nzPlot').innerHTML=svgW(w,N.length*rh+28,s,'Ablation differences in standard errors')}
  onTab('t-tables',()=>fit($('nzPlot'),nz));
  // sources
  const t12=TB.t12.rows,t14=TB.t14.rows;
  table('srcTab',['Source corpus','Pool','Licence','Trajectories','Environments','Judged','Sufficient','Sufficient (%)'],t12.slice(0,-1).map(r=>{const k=t14.find(x=>r[0].startsWith(x[0]));return [esc(r[0]),r[1],r[2],r[3],r[4],k?k[1]:'',k?k[2]:'',k?k[3]:'']}),{cap:A(PAPER.meta.ax+'#A1.T12','Table 12')+' joined with '+A(PAPER.meta.ax+'#A2.T14','Table 14')+' (judged after decontamination and deduplication; one reconstruction per SWE repository)'});
  table('t2Tab',TB.t2.cols,TB.t2.rows,{cap:A(PAPER.meta.ax+'#S4.T2','Table 2')+': '+TB.t2.title.split(': ')[1]});
  table('t13Tab',TB.t13.cols,TB.t13.rows,{cap:A(PAPER.meta.ax+'#A1.T13','Table 13')+': '+TB.t13.title.split(': ')[1]});
  table('t19Tab',TB.t19.cols,TB.t19.rows,{cap:A(PAPER.meta.ax+'#A6.T19','Table 19')+': '+TB.t19.title.split(': ')[1]});
  table('t17Tab',TB.t17.cols,TB.t17.rows,{cap:A(PAPER.meta.ax+'#A5.T17','Table 17')+': '+TB.t17.title.split(': ')[1]});
  table('tbT1',TB.t1.cols,TB.t1.rows.map(r=>r.map(c=>esc(c))),{cap:A(PAPER.meta.ax+'#S1.T1','Table 1')+': '+TB.t1.title.split(': ')[1]+'. Env. counts source repositories or workspaces, or independently built environments; Tasks the reported task or training-instance count'});
  // figures
  let f5m='lang';
  function f5(w){const d=f5m==='lang'?FG.fig5_language:FG.fig5_domain,lw=Math.min(140,w*.35),pw=w-lw-60,sx=v=>pw*v/90;let s='';
    d.forEach((r,i)=>{const y=4+i*24;s+=tx(lw-8,y+14,r.k,{fs:11.5,a:'end'})+rc(lw,y+3,sx(r.pct),16,'var(--acc)',{r:3})+tx(lw+sx(r.pct)+6,y+15,r.pct.toFixed(1)+'%',{fs:11.5,w:600})});
    $('f5Plot').innerHTML=svgW(w,d.length*24+8,s,'Figure 5')}
  segBind('f5M',m=>{f5m=m;refit($('f5Plot'))});
  function f6(w){const d=FG.fig6,lw=Math.min(190,w*.45),pw=w-lw-56,sx=v=>lw+pw*(v+5)/22;let s='';
    [-5,0,5,10,15].forEach(v=>{s+=ln2(sx(v),2,sx(v),d.length*22+6,v?'var(--line)':'var(--mute)')+tx(sx(v),d.length*22+20,(v>0?'+':'')+v,{fs:11,a:'middle',c:'var(--mute)'})});
    d.forEach((r,i)=>{const y=6+i*22,step=100/(6*r.n),whole=Math.abs(r.delta/step-Math.round(r.delta/step))<0.06;
      s+=tx(lw-8,y+12,r.cat+' (n='+r.n+')',{fs:11.5,a:'end',w:i?null:600})+rc(Math.min(sx(0),sx(r.delta)),y+2,Math.max(1,Math.abs(sx(r.delta)-sx(0))),14,r.delta>=0?'var(--c3)':'var(--c2)',{r:2})+tx(Math.max(sx(0),sx(r.delta))+5,y+13,(r.delta>0?'+':'')+r.delta.toFixed(1)+(i&&!whole?' ◦':''),{fs:11})});
    s+=tx(lw,d.length*22+34,'◦ not a whole number of task-runs',{fs:11,c:'var(--mute)'});
    $('f6Plot').innerHTML=svgW(w,d.length*22+40,s,'Figure 6')}
  onTab('t-tables',()=>{fit($('f5Plot'),f5);fit($('f6Plot'),f6)});
  // checks
  const C=RC.checks;
  table('chkTab',['Claim','Printed','Recomputed','Verdict','Where'],C.map(c=>[esc(c.claim)+(c.note&&c.note!=='[]'?'<br><span class="small mute">'+esc(c.note)+'</span>':''),esc(c.printed),esc(c.got),c.ok?(/derived/.test(c.note)||/not stated/.test(c.printed)?'<span class="mute">derived</span>':'<span style="color:var(--good)">reproduces</span>'):'<span style="color:var(--bad)">does not</span>',(/^[SA]\d/.test(c.where)?A(PAPER.meta.ax+'#'+c.where,c.where):esc(c.where))]),{text:1,cap:C.filter(c=>c.ok).length+' of '+C.length+' checks pass; '+C.filter(c=>!c.ok).length+' do not (each explained)'});
})();
