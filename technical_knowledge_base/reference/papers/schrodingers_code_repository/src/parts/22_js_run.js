// ---- Transform a repository: Level 2 and Level 3 run live on the Django excerpt ----
(function(){
  const R=window.REPO,EX=R.ex;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const st={seed:1,fig:false};
  let cur=null;
  function compute(){const map=st.fig?R.fig.mapping:SR.tokenMapping(R.lex.candidates,R.tokens,st.seed);const fm=SR.forwardMap(R.keys,map);cur={map,fm};return cur}
  window.TP_STATE=()=>({seed:st.seed,fig:st.fig,map:cur.map,fm:cur.fm});
  // the same replacement as SR.apply, but marking what changed
  const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function hl(text,fm){const ks=Object.keys(fm).sort((a,b)=>b.length-a.length);let parts=[text];
    if(ks.length){const re=new RegExp('\\b('+ks.map(escRe).join('|')+')\\b','g');parts=[];let last=0,m;while((m=re.exec(text))){parts.push(text.slice(last,m.index));parts.push({o:m[0],n:fm[m[0]]});last=m.index+m[0].length}parts.push(text.slice(last))}
    return parts.map(p=>{if(typeof p!=='string')return '<mark title="was '+esc(p.o)+'">'+esc(p.n)+'</mark>';
      return esc(p).replace(/(^|[^\w-])django(?![\w-])/gi,(mm,pre)=>pre+'<mark title="was django">'+R.lex.identity.django+'</mark>')}).join('')}
  function markTargets(text){const ks=R.keys.slice().sort((a,b)=>b.length-a.length);const re=new RegExp('\\b('+ks.map(escRe).join('|')+')\\b','g');
    let out='',last=0,m;while((m=re.exec(text))){out+=esc(text.slice(last,m.index))+'<mark>'+esc(m[0])+'</mark>';last=m.index+m[0].length}return out+esc(text.slice(last))}
  const pre=(h,cls)=>'<pre class="codeb'+(cls?' '+cls:'')+'">'+h+'</pre>';
  const code0=()=>EX.files[0].text;
  // ---- Level 3 drawing ----
  const TR=EX.top_run,NT=TR.names.length;
  const edges=[];TR.deps.forEach((d,i)=>d.forEach(p=>edges.push([p,i])));
  function l3svg(w,k,e){const order=SR.topoOrder({length:NT,deps:TR.deps},st.seed);const pos=new Array(NT);order.forEach((u,i)=>pos[u]=i);
    const rh=16,top=24,H=top+NT*rh+10,arcW=Math.min(120,w*.22),bx=arcW+8,bw=Math.min(260,w-bx-70);
    const t=k<2?0:(k===2?e:1);
    const y=i=>top+(i*(1-t)+pos[i]*t)*rh;
    let s=tx(bx,14,k<2?'File order (lines '+TR.start[0]+' to '+(TR.start[NT-1]+TR.lines[NT-1]-1)+')':'Sampled order, seed '+st.seed,{fs:11,c:'var(--mute)'});
    if(k>=1)edges.forEach(([p,c],j)=>{const y1=y(p)+rh/2-2,y2=y(c)+rh/2-2,dx=12+((j*37)%Math.max(20,arcW-14));const ok=y2>y1;
      s+='<path d="M'+bx+' '+y1.toFixed(1)+' C'+(bx-dx)+' '+y1.toFixed(1)+' '+(bx-dx)+' '+y2.toFixed(1)+' '+bx+' '+y2.toFixed(1)+'" fill="none" stroke="'+(ok?'var(--c3)':'#d33')+'" stroke-width="1" opacity=".55"/>'});
    TR.names.forEach((n,i)=>{const yy=y(i);const moved=k>=2&&pos[i]!==i;
      s+=rc(bx,yy,bw,rh-3,moved?'var(--soft)':'var(--bg)',{s:'var(--line)',r:3})+tx(bx+5,yy+10.5,n,{fs:11,c:n==='Field'?'var(--acc)':null,w:n==='Field'?700:null})+tx(bx+bw+6,yy+10.5,TR.lines[i]+' lines',{fs:11,c:'var(--mute)'})});
    return svgW(w,H,s,'Level 3 reordering of the top-level definitions of fields/__init__.py')}
  function l3counts(){const order=SR.topoOrder({length:NT,deps:TR.deps},st.seed);const pos=new Array(NT);order.forEach((u,i)=>pos[u]=i);
    const viol=edges.filter(([p,c])=>pos[p]>pos[c]).length,moved=order.filter((u,i)=>u!==i).length;
    const FR=EX.field_run,mo=SR.topoOrder({length:FR.names.length,deps:FR.deps},st.seed);const ci=FR.names.indexOf('contribute_to_class');
    return {viol,moved,ci,cnew:mo.indexOf(ci),nm:FR.names.length}}
  // ---- the step animation ----
  const S2=[{t:'The code as Django ships it',c:'Two excerpts of the real repository at the task\'s base commit: <code>Field.contribute_to_class</code> and its neighbours in <code>django/db/models/fields/__init__.py</code> (lines 742 to 786), where the fix goes.'},
    {t:'Find the repository\'s own names',c:'The released extractor walks the syntax tree of every Django file and keeps classes, public functions, modules, files, directories, module variables and class attributes; it drops Python builtins, keywords, third-party names and a list of common words. Highlighted: the 40 targets in this excerpt. <code>self</code>, <code>name</code> and <code>getattr</code> are reserved; <code>attname</code> is only ever an instance attribute, so it is not a target and survives.'},
    {t:'Split each name into tokens',c:'<code>tokenize_identifier</code> splits on underscores, dots and case changes. Every target is rebuilt from tokens, so one token maps the same way everywhere: whatever <code>get</code> becomes, it becomes in every name.'},
    {t:'Draw one word per token, from the seed',c:'For each of the 47 tokens, in alphabetical order, the candidate list is shuffled by the seeded generator and the first word not used yet is taken (<code>create_token_mapping</code>). Bold is this seed\'s choice; a star marks a word the paper itself shows.'},
    {t:'Rebuild every name in its original style',c:'<code>reconstruct_identifier</code> keeps CamelCase, snake_case, UPPER_CASE and file suffixes. Its one quirk is visible in Figure 4: a multi-word replacement inside a CamelCase name keeps its underscore, so <code>CharField</code> with char &#8594; character_unit becomes <code>Character_unitField</code>.'},
    {t:'What the agent sees',c:'Every observation is translated before the agent reads it and every command translated back before it runs. Hover a highlighted name to see the original. The project name itself becomes <code>working_repository</code> (the code\'s Level 1).'}];
  const S3=[{t:'35 definitions in file order',c:'<code>fields/__init__.py</code> has one long run of top-level definitions: three helper functions, <code>Field</code> and 31 field classes. Level 3 may reorder them only within this run; the imports and assignments around it are anchors.'},
    {t:'Which definitions must come first',c:'A class cannot be defined before its base class (or a metaclass, decorator or default argument it names). The released code finds these definition-time dependencies in the syntax tree: green arcs, base above subclass.'},
    {t:'Sample an order that respects them',c:'A random topological sort: repeatedly pick, uniformly, one definition whose dependencies are already placed. The released code retries up to 32 times until the order differs from the original.'},
    {t:'Check the result',c:'Every arc still points downwards (a red arc would mean a broken import). In the paper the variant is then kept only if all Pass-to-Pass tests still pass and the Fail-to-Pass test still fails.'}];
  function drawL2(k,e,w){const c=cur;let h='';
    if(k===0)h=pre(esc(code0()))+'<p class="small mute">'+EX.tree.slice(0,12).map(esc).join(' · ')+' ...</p>';
    else if(k===1)h=pre(markTargets(code0()));
    else if(k===2){const ks=R.keys.filter(x=>!/\.py$/.test(x)).slice(0,24);h='<div class="tokl">'+ks.map(x=>'<span class="tk"><b>'+esc(x)+'</b> &#8594; '+SR.tokenize(x).map(t=>'<i>'+esc(t.toLowerCase())+'</i>').join(' | ')+'</span>').join('')+'</div><p class="small mute">24 of the 40 targets shown; files are split the same way (base.py &#8594; base).</p>'}
    else if(k===3){h='<div class="tokl">'+R.tokens.map(t=>{const cs=R.lex.candidates[t];return '<span class="tk"><b>'+t+'</b>: '+cs.map(x=>{const on=c.map[t]===x,fig=R.lex.attested[t]===x;return (on?'<u>':'')+esc(x)+(fig?'*':'')+(on?'</u>':'')}).join(', ')+'</span>'}).join('')+'</div>'}
    else if(k===4){h='<div class="tokl">'+R.keys.map(x=>'<span class="tk">'+esc(x)+' &#8594; <b>'+esc(c.fm[x]||x)+'</b></span>').join('')+'</div>'}
    else h=pre(hl(code0(),c.fm))+'<p class="small">'+EX.tree.filter(p=>/fields\/__init__|base\.py/.test(p)).map(p=>hl(p,c.fm)).join(' · ')+'</p>';
    return '<div class="tpview" style="opacity:'+(.35+.65*e).toFixed(2)+'">'+h+'</div>'}
  const anim=makeAnim({id:'tp',mode:'l2',modes:{l2:S2,l3:S3},dur:3200,
    draw:(m,k,e,w)=>m==='l2'?drawL2(k,e,w):l3svg(w,k,e),
    counters:(m,k,e)=>{if(m==='l2'){const n=Object.keys(cur.fm).length,pr=R.prose_renamed.filter(x=>cur.fm[x]).length;
        return stat('Targets in this excerpt','40','of '+fmt(R.counts.classes+R.counts.functions)+' class and function targets in Django')+stat('Renamed with this '+(st.fig?'preset':'seed'),n+' of 40',st.fig?'only the tokens Figure 4 shows change':'tokens left as-is keep their name')+stat('Words renamed inside the issue prose',pr+' of '+R.prose_renamed.length,R.prose_renamed.join(', '))}
      const q=l3counts();return stat('Definitions moved',q.moved+' of '+NT,'seed '+st.seed)+stat('Dependency arcs broken',q.viol+' of '+edges.length,'must be 0')+stat('contribute_to_class','method '+(q.ci+1)+' &#8594; '+(q.cnew+1),'of the '+q.nm+' methods of Field, same seed')}});
  function refresh(){compute();$('tpSv').textContent=st.seed+(st.fig?' (Level 2 uses the Figure 4 preset)':'');if(anim)anim.draw();grep();table()}
  $('tpS').addEventListener('input',e=>{st.seed=+e.target.value;st.fig=false;refresh()});
  $('tpFig').addEventListener('click',()=>{st.fig=!st.fig;$('tpFig').classList.toggle('on',st.fig);refresh()});
  // ---- search in both views ----
  function views(){const o=[].concat(EX.issue.split('\n'),EX.tree,EX.files[0].text.split('\n'),EX.files[1].text.split('\n'));
    return {o,n:o.map(l=>SR.apply(l,cur.fm,true))}}
  function grep(){const q=$('gq').value,out=$('gOut');let re;try{re=new RegExp(q)}catch(err){out.innerHTML='<p class="small no">Not a valid regular expression.</p>';return}
    if(!q){out.innerHTML='';return}const v=views();
    const col=(lines,lab)=>{const hits=lines.filter(l=>re.test(l));return '<div><div class="small"><b>'+lab+'</b>: '+hits.length+' matching line'+(hits.length===1?'':'s')+'</div>'+pre(hits.slice(0,6).map(l=>esc(l.trim().slice(0,90))).join('\n')||'<span class="mute">(none)</span>','sm')+'</div>'};
    out.innerHTML='<div class="cols2">'+col(v.o,'Original view')+col(v.n,'Renamed view, '+(st.fig?'Figure 4 preset':'seed '+st.seed))+'</div>'}
  $('gq').addEventListener('input',grep);
  $('gChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('gq').value=b.dataset.q;grep()}));
  function table(){
    $('mapNote').innerHTML=st.fig?'Figure 4 preset: only the renamings the paper prints are applied; other tokens keep their word. The project name django becomes working_repository in every view.':'Seed '+st.seed+' with this page\'s illustrative lexicon. The project name django becomes working_repository in every view.';
    $('mapTbl').innerHTML='<table><thead><tr><th>Django name</th><th>Tokens</th><th>Becomes</th></tr></thead><tbody>'+R.keys.map(k=>'<tr><td><code>'+esc(k)+'</code></td><td class="small">'+SR.tokenize(k).map(t=>esc(t.toLowerCase())).join(' | ')+'</td><td><code>'+esc(cur.fm[k]||k)+'</code>'+(cur.fm[k]?'':' <span class="small mute">(unchanged)</span>')+'</td></tr>').join('')+'</tbody></table>'}
  const L=EX.files[0].text.split('\n');const i0=L.findIndex(l=>l.includes('if self.choices is not None'));
  $('l4code').textContent=L.slice(i0,i0+3).join('\n')+'\n\n# the gold patch (applied by the agent, not by Level 4):\n'+EX.gold_patch.split('\n').filter(l=>/^[+-] /.test(l)).join('\n');
  compute();grep();table();
  onTab('t-run',()=>{refit($('tpSvg'))});
})();
