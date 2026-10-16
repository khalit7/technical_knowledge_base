// ---- Tool map (t-map, Topic: ml-infra-and-orchestration; adapted from the JAX topic's Tool map): helpers, status legend, the tool table and the detail panel ----
window.TM=(function(){
  const D=window.TM_DATA,$=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const byId={};D.tools.forEach(t=>byId[t.id]=t);
  const LAY={hpc:'HPC schedulers',k8s:'Kubernetes batch',orch:'Runtimes and platforms',launch:'Launchers',cloud:'Clusters and clouds',storage:'Storage',obs:'Observability',flow:'Workflows',track:'Tracking and registries'};
  const ST={active:'active: releases or real commits in the last months',maintained:'maintained: fixes and occasional releases, no notice',
    maintenance:'maintenance mode: the owners say so; new work pointed elsewhere',quiet:'quiet: no release or commit in over a year, or no release in years, no notice',
    deprecated:'deprecated: owners announced retirement or replacement',archived:'archived or shut down: read-only on GitHub, or the service is gone',
    commercial:'commercial: a product or service with no public repository to date'};
  const stTag=s=>'<span class="tm-st s-'+s+'">'+s+'</span>';
  const ver=m=>m.ver?esc(m.ver)+(m.verDate?' <span class="sub2">'+m.verDate+'</span>':''):'<span class="mute">no releases</span>';
  const link=(t,u)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  function detail(t){
    const m=t.m,rows=[];
    rows.push(['Status',stTag(t.status)+' '+esc(t.why)]);
    rows.push(['Owner',esc(t.owner)]);
    if(m.ver)rows.push(['Latest release',esc(m.ver)+' ('+m.verDate+', '+link(m.verSrc.indexOf('pypi.org')>0?'PyPI':m.verSrc.indexOf('github.com')>0?'GitHub':'release notes',m.verSrc)+')'+(m.first?'; first PyPI release '+m.first:'')]);
    if(m.ghRel&&m.ghRel!==m.ver)rows.push(['GitHub release',esc(m.ghRel)+' ('+m.ghRelDate+')']);
    const ow=D.own.filter(o=>o[0]===t.id);if(ow.length)rows.push(['Owner changes',ow.map(o=>o[1]+': '+esc(o[3])+' ('+link('source',o[4])+')').join('; ')]);
    if(m.commit)rows.push(['Last commit',m.commit+': <span class="mute">'+esc(m.commitMsg)+'</span>']);
    if(m.repo)rows.push(['Repository',link(m.repo,'https://github.com/'+m.repo)+(m.archived?' (archived)':'')+(m.repo!==t.repo?' <span class="mute">(the old address '+esc(t.repo)+' redirects here)</span>':'')+(m.created?'; created '+m.created:'')]);
    rows.push(['Licence',esc(m.lic||'not stated')]);
        rows.push(['What it does',esc(t.what)]);
    rows.push(['Use it when',esc(t.when)]);
    if(t.avoid)rows.push(['Avoid when',esc(t.avoid)]);
    rows.push(['Verdict','<span class="tm-j">judgement</span> '+esc(t.verdict)]);
    rows.push(['Sources',t.src.map(s=>link(s[0],s[1])).join('; ')]);
    return '<h3>'+esc(t.name)+' '+stTag(t.status)+'</h3><p class="small">'+esc(t.one)+'</p><dl class="kv">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('')+'</dl>';
  }
  function show(el,id){const t=byId[id];if(!t)return;el.hidden=false;el.innerHTML=detail(t);}
  // ---- legend and filters ----
  $('tm-sleg').innerHTML=Object.keys(ST).map(s=>'<span>'+stTag(s)+' '+esc(ST[s].split(': ')[1])+'</span>').join('');
  const F={lay:'all',st:'all',q:'',sort:'lay',dir:1};
  function chips(el,key,vals){el.insertAdjacentHTML('beforeend',['all'].concat(vals).map(v=>'<button data-v="'+v+'"'+(v==='all'?' class="on"':'')+'>'+(v==='all'?'all':(LAY[v]||v))+'</button>').join(''));
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));F[key]=b.dataset.v;table();});}
  chips($('tm-flay'),'lay',Object.keys(LAY));
  chips($('tm-fstat'),'st',Object.keys(ST).filter(s=>D.tools.some(t=>t.status===s)));
  $('tm-q').addEventListener('input',e=>{F.q=e.target.value.trim().toLowerCase();table();});
  const COLS=[['name','Tool'],['lay','Layer'],['status','Status'],['ver','Latest release'],['commit','Last commit'],['lic','Licence'],['one','What it is']];
  const ORD=Object.keys(LAY),SO=Object.keys(ST);
  const key=(t,k)=>k==='lay'?ORD.indexOf(t.layer)*1000+D.tools.indexOf(t):k==='status'?SO.indexOf(t.status):k==='name'?t.name.toLowerCase():k==='ver'?(t.m.verDate||''):k==='commit'?(t.m.commit||''):k==='lic'?(t.m.lic||''):t.one;
  let sel=null;
  function table(){
    let L=D.tools.filter(t=>(F.lay==='all'||t.layer===F.lay)&&(F.st==='all'||t.status===F.st)&&
      (!F.q||(t.name+' '+t.owner+' '+t.one+' '+t.what+' '+t.when+' '+t.id).toLowerCase().indexOf(F.q)>=0));
    L.sort((a,b)=>{const x=key(a,F.sort),y=key(b,F.sort);return (x<y?-1:x>y?1:0)*F.dir});
    $('tm-cnt').textContent=L.length+' of '+D.tools.length+' tools shown';
    $('tm-ttab').innerHTML='<thead><tr>'+COLS.map(c=>'<th data-k="'+c[0]+'"'+(c[0]==='name'?' class="mh"':'')+'>'+c[1]+(F.sort===c[0]?(F.dir>0?' &#9650;':' &#9660;'):'')+'</th>').join('')+'</tr></thead><tbody>'+
      L.map(t=>'<tr data-k="'+t.id+'"'+(t.id===sel?' class="hl"':'')+'><td class="mh"><b>'+esc(t.name)+'</b><span class="sub2">'+esc(t.owner)+'</span></td><td>'+LAY[t.layer]+'</td><td>'+stTag(t.status)+'</td><td class="n">'+ver(t.m)+'</td><td class="n">'+(t.m.commit||'<span class="mute">none</span>')+'</td><td>'+esc(t.m.lic)+'</td><td>'+esc(t.one)+'</td></tr>').join('')+
      (L.length?'':'<tr><td colspan="7" class="mute">No tool matches.</td></tr>')+'</tbody>';
  }
  $('tm-ttab').addEventListener('click',e=>{const th=e.target.closest('th[data-k]');if(th){const k=th.dataset.k;F.dir=F.sort===k?-F.dir:1;F.sort=k;table();return}
    const tr=e.target.closest('tr[data-k]');if(!tr)return;sel=tr.dataset.k;table();show($('tm-det'),sel);
    const d=$('tm-det');if(d.scrollIntoView)d.scrollIntoView({block:'nearest'});});
  table();
  // open a tool from anywhere in the tab (picker chips, animation slots)
  function open(id){const L=$('tm-flay').querySelector('button');if(L)L.click();const S=$('tm-fstat').querySelector('button');if(S)S.click();
    $('tm-q').value='';F.q='';sel=id;table();show($('tm-det'),id);const r=document.querySelector('#tm-ttab tr[data-k="'+id+'"]');
    if(r&&r.scrollIntoView)r.scrollIntoView({block:'center'});}
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-map']=window.TAB_RENDER['t-map']||[]).push(f)};
  return {D,$,esc,byId,stTag,show,open,link,LAY,RM,onRender,ver};
})();
