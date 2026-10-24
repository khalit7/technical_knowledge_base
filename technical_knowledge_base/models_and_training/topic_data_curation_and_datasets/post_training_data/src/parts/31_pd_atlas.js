// ---- Dataset atlas (tab t-pdat) ----
(function(){
const P=window.PD,E=RD.esc,$=id=>document.getElementById(id),{f0,pc}=window.PDU;
const KC={'SFT':'var(--c1)','Preference':'var(--c2)','Verifiable reward':'var(--c3)','Environment':'var(--c4)'};
const A=P.atlas;let kind='all',sel=A[0].key;
function bars(el,rows,mx){mx=mx||Math.max(...rows.map(r=>r[1]),1e-9);el.innerHTML=rows.map(r=>'<div><span class="nm" title="'+E(r[0])+'">'+E(r[0])+'</span><span class="tr"><span style="width:'+(100*r[1]/mx).toFixed(2)+'%;background:'+(r[2]||'var(--acc)')+'"></span></span><span class="v">'+(r[3]!=null?r[3]:f0(r[1]))+'</span></div>').join('')}
function timeline(){const el=$('pa-tl');const w=RD.width(el),h=170,y0=2022,y1=2025.99;const kinds=Object.keys(KC);const L=Math.min(110,w*0.28),Rr=w-12;
  const X=y=>L+(Rr-L)*(y-y0)/(y1-y0);let s='';
  for(let y=2022;y<=2025;y++){s+='<line x1="'+X(y)+'" x2="'+X(y)+'" y1="10" y2="'+(h-22)+'" stroke="var(--line)"/>'+RD.t(X(y)+3,h-8,y,{fs:11,fill:'var(--mute)'})}
  kinds.forEach((k,i)=>{const yy=28+i*34;s+=RD.t(4,yy+4,k,{fs:11,fill:'var(--mute)'});
    const ds=A.filter(a=>a.kind===k);ds.forEach((d,j)=>{const cx=X(d.year+0.12+0.76*((j%5)/5)),cy=yy+(j%2?7:-7);
      s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy+'" r="'+(d.key===sel?7:5)+'" fill="'+KC[k]+'" opacity="'+(kind==='all'||kind===k?1:.2)+'" stroke="'+(d.key===sel?'var(--ink)':'none')+'" stroke-width="2" data-k="'+d.key+'"><title>'+E(d.name)+' ('+d.year+')</title></circle>'})});
  el.innerHTML=RD.svg(w,h,s,'Datasets by year and kind');
  el.querySelectorAll('circle').forEach(c=>c.addEventListener('click',()=>{sel=c.dataset.k;render()}))}
function list(){$('pa-list').innerHTML=A.filter(a=>kind==='all'||a.kind===kind).map(a=>'<button style="--kc:'+KC[a.kind]+'" data-k="'+a.key+'" class="'+(a.key===sel?'sel':'')+'">'+E(a.name)+'<small>'+E(a.kind)+', '+a.year+(a.full?', '+f0(a.full)+' rows':'')+'</small></button>').join('');
  $('pa-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sel=b.dataset.k;render()}))}
function rowsHtml(rs){return rs.map(r=>'<div class="pa-row"><div class="l">prompt</div><div class="t">'+E(r.p)+'</div><div class="l">response</div><div class="t">'+E(r.r)+'</div></div>').join('')}
function detail(){const a=A.find(x=>x.key===sel);let h='<h3>'+E(a.name)+'</h3><div class="small mute">'+E(a.kind)+', '+a.year+'. <code>'+E(a.repo)+'</code>'+(a.rev?' @ '+E(a.rev):'')+'. Licence: '+E(a.lic)+'. '+E(a.note)+'.</div>';
  h+='<div class="out" id="pa-stats"></div><div id="pa-extra"></div>';$('pa-det').innerHTML=h;const st=$('pa-stats'),ex=$('pa-extra');
  const S=[];if(a.full)S.push(RD.stat('Rows in the full set',f0(a.full),'Hugging Face statistics'));
  const lin=P.lin.find(x=>x.key===a.key);
  if(lin){S.push(RD.stat('Rows measured',f0(lin.n)),RD.stat('Median answer tokens',f0(lin.r_tok),'p90 '+f0(lin.r_tok90)),RD.stat('Median prompt tokens',f0(lin.p_tok)),RD.stat('Tokens with loss',pc(lin.trained,1,0),'tulu template'),RD.stat('Exact duplicate prompts',f0(lin.exact)),RD.stat('Rows in near-duplicate clusters',f0(lin.near),'MinHash J &ge; 0.8, of '+f0(lin.near_n)),RD.stat('English (first user turn)',pc(lin.en,lin.n,0)));
    ex.innerHTML='<div class="pd-lab" style="font-size:11.5px;font-weight:600;color:var(--mute);text-transform:uppercase;margin-top:6px">First word of the prompt, top 8 ('+f0(lin.fwd)+' distinct)</div><div class="rd-bars" id="pa-fw"></div>'+(P.atlas_rows[a.key]?'<div class="pd-lab" style="font-size:11.5px;font-weight:600;color:var(--mute);text-transform:uppercase">Real rows (seeded sample; trimmed)</div>'+rowsHtml(P.atlas_rows[a.key]):'');
    bars($('pa-fw'),lin.fw.map(x=>[x[0]||'(none)',x[1],'var(--c1)']))}
  const pf=P.pref.sets[a.key];
  if(pf){S.push(RD.stat('Pairs measured',f0(pf.n)),RD.stat('Chosen is longer',pc(pf.chosen_longer_share,1,0),'of '+f0(pf.diff)+' pairs with different lengths'),RD.stat('Identical chosen and rejected',f0(pf.identical)));
    if(pf.ratings)S.push(RD.stat('Ties (same rating)',f0(pf.ratings.ties),'of '+f0(pf.ratings.n)+' rated'));
    const exs=(P.pref.examples[a.key]||[]).slice(0,2);ex.innerHTML='<p class="small">Pairs, length bias by gap and every sampled pair: the Pair inspector block in {{Reading|#t-read}}, section 5.</p>'+exs.map(e=>'<div class="pa-row"><div class="l">prompt</div><div class="t">'+E(e.prompt)+'</div><div class="l">chosen ('+f0(e.lc)+' tokens)</div><div class="t">'+E(e.chosen)+'</div><div class="l">rejected ('+f0(e.lr)+' tokens)</div><div class="t">'+E(e.rejected)+'</div></div>').join('');}
  if(a.key==='olmo2'){const m=P.mix.find(x=>x.key==='olmo2');ex.innerHTML='<div class="rd-bars" id="pa-mx"></div>';bars($('pa-mx'),m.skills.filter(s=>s[1]).map(s=>[s[0],s[1]]))}
  if(a.where==='env'||a.key==='nebius'){const e=P.env;const t=a.key==='swe_gym'?e.gym:a.key==='swe_rebench'?e.reb:null;
    if(t){S.push(RD.stat('Repositories',f0(t.repos)),RD.stat('Median files changed',f0(t.files['0.5'])),RD.stat('Median FAIL_TO_PASS',f0(t.f2p['0.5']),f0(t.f2p_one)+' tasks with exactly one'),RD.stat('Median PASS_TO_PASS',f0(t.p2p['0.5'])));
      if(a.key==='swe_gym'){const g=e.gym_example;ex.innerHTML='<div class="pa-row"><div class="l">'+E(g.instance_id)+' ('+E(g.repo)+', '+E(g.created_at)+')</div><div class="t">'+E(g.problem)+'</div><div class="l">gold patch</div><div class="t">'+E(g.patch)+'</div><div class="l">FAIL_TO_PASS</div><div class="t">'+E(g.f2p.join('\n'))+'</div></div>'}
      else ex.innerHTML='<div class="rd-bars" id="pa-yr"></div>',bars($('pa-yr'),t.years.map(y=>[y[0],y[1],'var(--c4)']))}
    else{const n=e.nebius;S.push(RD.stat('Trajectories measured',f0(n.n)),RD.stat('Resolved',f0(n.resolved),pc(n.resolved,n.n)),RD.stat('Median agent turns',f0(n.turns['0.5'])),RD.stat('Tokens the agent wrote',pc(n.role_tok.ai,n.role_tok.ai+n.role_tok.user+n.role_tok.system,0)));
      ex.innerHTML='<div class="rd-bars" id="pa-cmd"></div>';bars($('pa-cmd'),n.cmds.slice(0,10).map(c=>[c[0],c[1],'var(--c4)']))}}
  if(a.key==='swe_traj'){const t=P.env.swegym_traj;ex.innerHTML+='<p class="small">Tool calls in the assistant turns: '+t.functions.map(f=>E(f[0])+' '+f0(f[1])).join(', ')+'.</p>'}
  if(a.key==='dolci_rl'){const r=P.rl;ex.innerHTML='<p class="small">Sample of '+f0(r.sample_rows)+' rows: '+Object.entries(r.sources).map(([k,v])=>E(k.split('/')[1])+' '+f0(v)).join(', ')+'. Pass rates (of up to 8 rollouts) in the sample:</p><div class="rd-bars" id="pa-rl"></div>';
    const lab=['0','up to 1/8','up to 2/8','up to 3/8','up to 4/8','up to 5/8','above 5/8'];const tot=[0,0,0,0,0,0,0];Object.values(r.passrate).forEach(v=>v.hist.forEach((x,i)=>tot[i]+=x));bars($('pa-rl'),tot.map((x,i)=>[lab[i],x,i===0?'var(--bad)':'var(--c3)']))}
  if(a.key==='code'&&P.code){const c=P.code;S.push(RD.stat('Median tests per problem',f0(c.tests_q['0.5'])),RD.stat('Problems with one test',f0(c.one_test),'of '+f0(c.file_rows)),RD.stat('Mutants surviving all tests',pc(c.survived,c.mutants,0)))}
  if(a.key==='if_multi'){const q=P.quality;ex.innerHTML='<p class="small">Each row keeps the id of the SFT row its prompt came from; constraints per prompt are 1 to 5. See Reading, section 8.</p>'}
  if(a.key==='rlvr')ex.innerHTML='<p class="small">Measured on the root page\'s {{Post-training data lab|n:3c65c17b0d0d811fa5ecda8d365ab00f}} (checkers on reference solutions, near-duplicate IF prompts, the comma labels).</p>';
  st.innerHTML=S.join('')}
function table(){$('pa-table').innerHTML='<table><thead><tr><th>Dataset</th><th>Kind</th><th>Year</th><th class="num">Rows (full)</th><th>Licence</th><th>Repository</th></tr></thead><tbody>'+A.map(a=>'<tr><td>'+E(a.name)+'</td><td>'+E(a.kind)+'</td><td>'+a.year+'</td><td class="num">'+(a.full?f0(a.full):'see note')+'</td><td class="small">'+E(a.lic)+'</td><td class="small"><code>'+E(a.repo)+'</code></td></tr>').join('')+'</tbody></table><p class="small mute">HH-RLHF: 160,800 training rows across all its subsets; helpful-base and harmless-base are 43,835 and 42,537 of them (counted here).</p>'}
function render(){timeline();list();detail()}
RD.seg($('pa-kind'),m=>{kind=m;const f=A.filter(a=>kind==='all'||a.kind===kind);if(!f.find(a=>a.key===sel))sel=f[0].key;render()});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-pdat']=[render];
RD.tabLinks($('pa-det'));table();render();
})();
