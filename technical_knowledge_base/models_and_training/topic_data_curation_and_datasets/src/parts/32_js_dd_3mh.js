// ---- Dedup lab: MinHash on measured pairs (estimate check, bands/rows explorer, big settings, labelled pairs, clusters)
(function(){
  const D=window.DD,X=window.DDX,$=X.$;if(!D||!$('t-dedup'))return;
  // decode pairs: [i, j, jaccard, hex mask of 112 bits]
  const P=D.pairs.map(p=>{const h=p[3],m=new Uint8Array(112);for(let k=0;k<14;k++){const v=parseInt(h.substr(2*k,2),16);for(let b=0;b<8;b++)m[8*k+b]=(v>>(7-b))&1}
    let e=0;for(let k=0;k<112;k++)e+=m[k];return {i:p[0],j:p[1],J:p[2],m,est:e/112}});
  const fw=D.scurve.fw;
  $('dd-mh-stats').innerHTML=X.stat('pairs of documents',X.fmt(D.npairs),'all compared exactly')+
    X.stat('pairs with Jaccard 0.8 or more',X.fmt(fw.pairs_above_08),'of which byte-identical shingle sets: '+X.fmt(D.big.rw20x450.pairs_J_eq_1))+
    X.stat('candidates under 14 × 8',X.fmt(fw.candidates),'missed at 0.8 or more: '+fw.missed_above_08+'; below 0.5: '+fw.cand_below_05)+
    X.stat('clusters / documents removed',D.clusters.n+' / '+D.clusters.removed,'run0 removed '+D.clusters.run0_removed+'; '+D.clusters.docs+' documents in clusters');

  // ---- estimate vs truth
  function est(){const el=$('dd-est'),W=X.width(el),H=Math.min(300,Math.max(220,W*0.5)),L=42,R=10,T=10,B=34;
    const x=X.lin(0,1,L,W-R),y=X.lin(0,1,H-B,T);let g='';
    for(let v=0;v<=1.001;v+=0.25){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+X.t(L-5,y(v)+4,v.toFixed(2),{a:'end',fill:'var(--mute)'})+X.t(x(v),H-B+15,v.toFixed(2),{a:'middle',fill:'var(--mute)'})}
    let up='',dn='';for(let k=0;k<=100;k++){const s=k/100,sd=2*Math.sqrt(s*(1-s)/112);up+=(k?'L':'M')+x(s).toFixed(1)+' '+y(Math.min(1,s+sd)).toFixed(1);dn=' L'+x(s).toFixed(1)+' '+y(Math.max(0,s-sd)).toFixed(1)+dn}
    g+='<path d="'+up+dn.replace(/^ L/,' L')+' Z" fill="var(--acc2)" opacity=".7"/>';
    g+='<line x1="'+x(0)+'" y1="'+y(0)+'" x2="'+x(1)+'" y2="'+y(1)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    let out=0,nin=0,low=0;P.forEach(p=>{const sd=2*Math.sqrt(p.J*(1-p.J)/112);if(p.J<0.05)low++;else if(p.J<0.999){nin++;if(Math.abs(p.est-p.J)>sd+1e-9)out++}g+='<circle cx="'+x(p.J).toFixed(1)+'" cy="'+y(p.est).toFixed(1)+'" r="2.6" fill="var(--c2)" opacity=".55"/>'});
    g+=X.t((L+W-R)/2,H-3,'true Jaccard similarity of the pair',{a:'middle',fill:'var(--mute)',fs:10.5});
    g+=X.t(L+4,T+10,'share of 112 MinHash values equal',{fill:'var(--mute)',fs:10.5});
    el.innerHTML=X.svg(W,H,g,'MinHash estimate against true Jaccard for 856 pairs');
    $('dd-est-note').textContent='Of the '+nin+' pairs with Jaccard between 0.05 and 1 (exclusive), '+out+' ('+X.pct(out/nin)+') fall outside the band, close to the 5% a binomial estimate puts there. The '+low+' pairs below 0.05 sit above the diagonal by selection: they are embedded only because 2 or more of their values agree.';}
  est();X.onRender(est);

  // ---- bands and rows explorer
  const bS=$('dd-sc-b'),rS=$('dd-sc-r'),tS=$('dd-sc-t');
  const Pf=(s,b,r)=>1-Math.pow(1-Math.pow(s,r),b);
  function cand(p,b,r){for(let k=0;k<b;k++){let ok=1;for(let q=0;q<r;q++)if(!p.m[k*r+q]){ok=0;break}if(ok)return 1}return 0}
  function clamp(src){let b=+bS.value,r=+rS.value;if(b*r>112){if(src==='b')r=Math.floor(112/b);else b=Math.floor(112/r)}r=Math.max(2,r);b=Math.max(1,b);bS.value=b;rS.value=r}
  function sc(){const b=+bS.value,r=+rS.value,tg=+tS.value;$('dd-sc-bv').textContent=b;$('dd-sc-rv').textContent=r;$('dd-sc-tv').textContent=tg.toFixed(2);
    const bins=[];for(let k=0;k<20;k++)bins.push({n:0,c:0});
    let nc=0,miss=0,above=0,below=0;P.forEach(p=>{const c=cand(p,b,r);const k=Math.min(19,Math.floor(p.J*20+1e-9));bins[k].n++;bins[k].c+=c;nc+=c;if(p.J>=tg){above++;if(!c)miss++}else if(c)below++});
    const el=$('dd-sc'),W=X.width(el),H=Math.min(290,Math.max(220,W*0.45)),L=40,R=10,T=10,B=34;const x=X.lin(0,1,L,W-R),y=X.lin(0,1,H-B,T);let g='';
    for(let v=0;v<=1.001;v+=0.25)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+X.t(L-5,y(v)+4,Math.round(v*100)+'%',{a:'end',fill:'var(--mute)'});
    for(let v=0;v<=1.001;v+=0.2)g+=X.t(x(v),H-B+15,v.toFixed(1),{a:'middle',fill:'var(--mute)'});
    g+='<line x1="'+x(tg)+'" x2="'+x(tg)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    let d='';for(let k=0;k<=200;k++){const s=k/200;d+=(k?'L':'M')+x(s).toFixed(1)+' '+y(Pf(s,b,r)).toFixed(1)}g+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    bins.forEach((q,k)=>{if(!q.n)return;const rr=Math.max(3,Math.min(11,2.2*Math.sqrt(q.n)));g+='<circle cx="'+x(k/20+0.025).toFixed(1)+'" cy="'+y(q.c/q.n).toFixed(1)+'" r="'+rr.toFixed(1)+'" fill="var(--c2)" opacity=".75" stroke="var(--bg)"><title>Jaccard '+(k/20).toFixed(2)+' to '+((k+1)/20).toFixed(2)+': '+q.c+' of '+q.n+' pairs are candidates</title></circle>'});
    g+=X.t((L+W-R)/2,H-3,'true Jaccard similarity (0.05 bins; dot area = pairs)',{a:'middle',fill:'var(--mute)',fs:10.5});
    el.innerHTML=X.svg(W,H,g,'Candidate rate against Jaccard for '+b+' bands of '+r+' rows');
    $('dd-sc-out').innerHTML=X.stat('hashes per document',b*r,b+' bands × '+r+' rows')+X.stat('threshold (1/b)^(1/r)',Math.pow(1/b,1/r).toFixed(2),'steepest point of the curve')+
      X.stat('candidate pairs',X.fmt(nc),'of '+X.fmt(D.npairs)+' pairs')+X.stat('missed at ≥ '+tg.toFixed(2),miss+' of '+above,above?X.pct(miss/above)+' of those pairs':'')+X.stat('candidates below '+tg.toFixed(2),below,'pairs a Jaccard check would reject');}
  bS.addEventListener('input',()=>{clamp('b');$('dd-sc-pre').value='';sc()});rS.addEventListener('input',()=>{clamp('r');$('dd-sc-pre').value='';sc()});tS.addEventListener('input',sc);
  $('dd-sc-pre').addEventListener('change',e=>{if(!e.target.value)return;const v=e.target.value.split(',');bS.value=v[0];rS.value=v[1];sc()});
  sc();X.onRender(sc);

  // ---- big settings table
  const G=D.big;const rowB=(nm,s,note)=>'<tr><td>'+nm+'</td><td class="num">'+s.b+' × '+s.r+'</td><td class="num">'+X.fmt(s.hashes)+'</td><td class="num">'+(100*Pf(0.75,s.b,s.r)).toFixed(1)+'%</td><td class="num">'+(100*Pf(0.8,s.b,s.r)).toFixed(1)+'%</td><td class="num">'+s.candidates+'</td><td class="num">'+s.cand_J_ge_08+' of '+s.pairs_J_ge_08+'</td><td class="num">'+s.cand_J_lt_08+'</td><td>'+note+'</td></tr>';
  const fwb={b:14,r:8,hashes:112,candidates:fw.candidates,cand_J_ge_08:fw.pairs_above_08-fw.missed_above_08,pairs_J_ge_08:fw.pairs_above_08,cand_J_lt_08:fw.candidates-(fw.pairs_above_08-fw.missed_above_08)};
  $('dd-big').innerHTML='<thead><tr><th>setting</th><th class="num">b × r</th><th class="num">hashes</th><th class="num">P at 0.75</th><th class="num">P at 0.8</th><th class="num">candidates</th><th class="num">at J ≥ 0.8</th><th class="num">below 0.8</th><th>after</th></tr></thead><tbody>'+
    rowB('FineWeb (datatrove default)',fwb,'clusters as they are')+rowB('Dolma 3 web',G.d3web,'true-Jaccard check at 0.8 keeps '+G.d3web.after_jaccard_check)+rowB('RefinedWeb, as its formula implies',G.rw450x20,'')+rowB('RefinedWeb, as its prose reads',G.rw20x450,'only identical sets')+'</tbody>';

  // ---- labelled boundary pairs
  const LB=D.cmp.labelled;
  const ls=D.cmp.label_summary;
  $('dd-lab-sum').textContent='Of the 35 pairs, '+ls.B.n+' are B, '+ls.S.n+' S, '+ls.T.n+' T and '+ls.D.n+' D; 14 × 8 makes candidates of '+ls.B.cand+' B, '+ls.S.cand+' S, '+ls.T.cand+' T and '+ls.D.cand+' D pairs.';
  function lab(f){const rows=LB.filter(r=>f==='all'||(f==='D'&&r.label==='D')||(f==='cand'&&r.cand)||(f==='miss'&&!r.cand));
    $('dd-lab').innerHTML='<thead><tr><th>kind</th><th>hosts</th><th class="num">Jaccard</th><th class="num">estimate</th><th class="num">cosine</th><th>14×8</th><th>same cluster</th><th>removed by run0</th><th>should one go?</th><th>what they are</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td><span class="dd-k '+r.label+'">'+r.label+'</span></td><td style="overflow-wrap:anywhere;min-width:9em">'+X.esc(r.ha)+'<br>'+X.esc(r.hb)+'</td><td class="num">'+r.j.toFixed(3)+'</td><td class="num">'+r.est.toFixed(2)+'</td><td class="num">'+r.cos.toFixed(2)+'</td><td>'+(r.cand?'candidate':'no')+'</td><td>'+(r.same_cluster?'yes':'no')+'</td><td>'+(r.dropped.length===2?'both':r.dropped.length===1?(r.dropped[0]===r.a?'first':'second'):'neither')+'</td><td>'+r.remove+'</td><td style="min-width:12em">'+X.esc(r.note)+'</td></tr>').join('')+'</tbody>'}
  X.seg($('dd-lab-f'),lab);lab('all');

  // ---- clusters
  const CD=D.clDesc,CI=D.clIdx,rm=new Set(D.run0Removed);
  const pj={};P.forEach(p=>{pj[p.i+','+p.j]=p.J});
  const Jof=(a,b)=>pj[Math.min(a,b)+','+Math.max(a,b)]||0;
  const kinds={B:'boilerplate or extraction failure',S:'same text copied',T:'template, item differs',M:'same page, several URLs',D:'different content, shared template'};
  const kc={B:'var(--c2)',S:'var(--c1)',T:'var(--c5)',M:'var(--c6)',D:'var(--c4)'};
  const agg={};CD.forEach(c=>{agg[c[0]]=agg[c[0]]||{n:0,d:0};agg[c[0]].n++;agg[c[0]].d+=c[2]});
  X.bars($('dd-cl-kinds'),Object.keys(kinds).filter(k=>agg[k]).map(k=>[kinds[k]+' ('+agg[k].n+(agg[k].n===1?' cluster)':' clusters)'),agg[k].d,kc[k],agg[k].d+' docs']),Math.max(...Object.values(agg).map(a=>a.d)));
  const order=CD.map((c,i)=>i).sort((a,b)=>CD[b][2]-CD[a][2]);
  $('dd-cl-list').innerHTML=order.map(i=>'<button data-c="'+i+'"><span class="dd-k '+CD[i][0]+'">'+CD[i][0]+'</span>'+CD[i][2]+' docs: '+X.esc(CD[i][1])+'</button>').join('');
  function cl(i){$('dd-cl-list').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.c===i));
    const g=CI[i];const js=[];for(let a=0;a<g.length;a++)for(let b=a+1;b<g.length;b++)js.push(Jof(g[a],g[b]));
    const mn=Math.min(...js),mean=js.reduce((s,v)=>s+v,0)/js.length;
    const keep=g.filter(x=>!rm.has(x)).length;
    $('dd-cl-det').innerHTML='<h3><span class="dd-k '+CD[i][0]+'">'+CD[i][0]+'</span>'+X.esc(CD[i][1])+'</h3><div class="kv"><dt>documents</dt><dd>'+g.length+' ('+keep+' kept, '+(g.length-keep)+' removed)</dd><dt>pairs inside</dt><dd>'+js.length+'</dd><dt>true Jaccard</dt><dd>min '+mn.toFixed(2)+', mean '+mean.toFixed(2)+'</dd><dt>kind</dt><dd>'+kinds[CD[i][0]]+'</dd></div>'+(mn<0.6?'<p class="small" style="color:var(--bad)">Some members are far below the 0.72 threshold: they joined through other members (chaining).</p>':'')}
  $('dd-cl-list').addEventListener('click',e=>{const b=e.target.closest('button');if(b)cl(+b.dataset.c)});cl(order[0]);
})();
