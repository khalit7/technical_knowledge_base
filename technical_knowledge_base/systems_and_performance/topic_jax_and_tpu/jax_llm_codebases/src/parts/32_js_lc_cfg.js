// ---- Config explorer tab (t-lccfg) ----
(function(){
  const U=LCU,esc=U.esc,$=id=>document.getElementById(id),C=LC.cfg;
  const GH='https://github.com/AI-Hypercomputer/maxtext/blob/1a95d1e5371021aab8d0574c53d2cca425474318/src/maxtext/configs/base.yml#L';
  $('cf-layers').innerHTML=[['1. base.yml',U.num(C.base_lines)+' lines, '+U.num(C.base_keys)+' keys, every default'],['2. models/&lt;model_name&gt;.yml',C.n_models+' files; may not be contradicted by 3 unless override_model_config'],
    ['3. key=value, kwargs','command line or Python call'],['4. M_&lt;KEY&gt; environment','last word; refuses a key also set by 3'],['pydantic MaxTextConfig',U.num(C.n_fields)+' fields after derivation']].map((x,i)=>'<div><b>'+x[0]+'</b>'+x[1]+'</div>').join('');
  let grp='all',q='',sel='remat_policy';
  const fmt=v=>v==null?'':(Array.isArray(v)?'['+v.join(', ')+']':String(v));
  function list(){const rows=C.rows.filter(r=>(grp==='all'||r.group===grp)&&(!q||(r.key+' '+r.what+' '+r.comment).toLowerCase().includes(q)));
    $('cf-list').innerHTML=rows.map(r=>'<div class="cf-it'+(r.key===sel?' sel':'')+'" data-k="'+r.key+'" role="option" tabindex="0" aria-selected="'+(r.key===sel)+'"><code>'+esc(r.key)+'</code><span class="d">'+esc(r.default)+'</span></div>').join('')||'<div class="cf-it mute">No flag matches.</div>';
    if(!rows.find(r=>r.key===sel)&&rows.length)sel=rows[0].key;det()}
  function det(){const r=C.rows.find(x=>x.key===sel);if(!r){$('cf-det').innerHTML='';return}
    const models=C.models.map(m=>'<tr><td>'+esc(m)+'</td><td><code>'+esc(r.models[m]!=null?r.models[m]:'')+'</code>'+(r.models[m]==null?'<span class="mute small">(default)</span>':'')+'</td></tr>').join('');
    $('cf-det').innerHTML='<h4><code>'+esc(r.key)+'</code></h4><p>'+esc(r.what)+'</p>'+
      '<dl class="kv"><dt>Default</dt><dd><code>'+esc(r.default)+'</code></dd><dt>Line</dt><dd><a href="'+GH+r.line+'" target="_blank" rel="noopener noreferrer"><code>base.yml:'+r.line+'</code></a></dd>'+
      (r.runex!=null?'<dt>Running example</dt><dd><code>'+esc(fmt(r.runex))+'</code></dd>':'')+'</dl>'+
      (r.comment?'<div class="cf-q"><b>Comment beside it:</b> '+esc(r.comment)+'</div>':'')+(r.above?'<div class="cf-q"><b>Comment above it:</b> '+esc(r.above)+'</div>':'')+
      '<div class="tw"><table class="rd-cmp narrow"><thead><tr><th>Model file</th><th>Value</th></tr></thead><tbody>'+models+'</tbody></table></div>'}
  $('cf-list').addEventListener('click',e=>{const it=e.target.closest('.cf-it[data-k]');if(!it)return;sel=it.dataset.k;list()});
  $('cf-list').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const it=e.target.closest('.cf-it[data-k]');if(it){e.preventDefault();sel=it.dataset.k;list()}}});
  $('cf-q').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();list()});
  U.seg($('cf-grp'),m=>{grp=m;list()});
  list();
})();
