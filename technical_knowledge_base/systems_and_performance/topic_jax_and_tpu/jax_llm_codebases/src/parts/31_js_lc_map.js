// ---- Codebase map tab (t-lcmap) ----
(function(){
  const U=LCU,esc=U.esc,$=id=>document.getElementById(id),D=LC.map;
  const GC={config:'var(--c5)',model:'var(--c1)',sharding:'var(--c4)',train:'var(--c3)',post:'var(--c2)',data:'var(--c6)',ckpt:'var(--mute)',serve:'var(--ink)',other:'var(--dim)'};
  const GN={config:'configuration',model:'model',sharding:'sharding',train:'train step and optimiser',post:'post-training',data:'data',ckpt:'checkpoints',serve:'serving',other:'other'};
  const RN={maxtext:'MaxText',tunix:'Tunix',levanter:'Levanter (Marin lib/levanter)'};
  const mx=Math.max(...D.components.map(c=>c.lines));
  let concern='all',sel=null;
  function where(w){if(!w)return '';if(w.startsWith('lc-s-'))return '<a href="#" data-sec="s-'+w.slice(5)+'">Reading tab, section "'+({cfg:'1. Config',model:'2. The model',shard:'3. Sharding',step:'4. The train step',tunix:'7. Tunix',lev:'8. Levanter',serve:'9. Serving'}[w.slice(5)]||w)+'"</a>';
    const P={training_stack:['The JAX training stack','3c65c17b0d0d817ea0ace9a2ca8677ec'],pallas:['Pallas kernels','3fa5c17b0d0d817699fcf65d085402e7']}[w];
    return P?'<a href="https://app.notion.com/p/'+P[1]+'" target="_blank" rel="noopener noreferrer">'+P[0]+'</a>':''}
  function detail(c){if(!c){$('mp-det').innerHTML='<p class="mute">Click a row.</p>';return}
    const syms=c.symbols.length?c.symbols.map(s=>'<div class="mp-sym">'+U.ref(s.key)+' <code>'+esc(s.text)+'</code></div>').join(''):'<div class="mp-sym mute">No symbol quoted on this page.</div>';
    $('mp-det').innerHTML='<h4>'+RN[c.repo]+': <code>'+esc(c.name)+'</code> <span class="lc-tag" style="color:'+GC[c.group]+';border-color:'+GC[c.group]+'">'+GN[c.group]+'</span></h4><p>'+esc(c.role)+'</p>'+
      '<dl class="kv"><dt>Size</dt><dd>'+U.num(c.files)+(c.files===1?' file, ':' files, ')+U.num(c.lines)+' lines</dd>'+(c.pytorch?'<dt>PyTorch counterpart</dt><dd>'+esc(c.pytorch)+'</dd>':'')+(c.where?'<dt>Taught</dt><dd>'+where(c.where)+'</dd>':'')+'<dt>Paths</dt><dd><code>'+c.paths.map(esc).join('</code>, <code>')+'</code></dd></dl>'+
      '<div class="small"><b>Symbols worth reading</b>'+syms+'</div>'}
  function render(){
    $('mp-repos').innerHTML=['maxtext','tunix','levanter'].map(r=>{const rows=D.components.filter(c=>c.repo===r);const tot=D.totals_py[r];
      return '<div class="mp-repo"><h3>'+RN[r]+' <span class="small mute">'+esc(D.commits[r])+'; '+U.num(tot.files)+' Python files, '+U.num(tot.lines)+' lines</span></h3>'+
        rows.map(c=>'<div class="mp-row'+(sel===c.id?' sel':'')+(concern!=='all'&&c.group!==concern?' dim':'')+'" data-id="'+c.id+'" role="button" tabindex="0" aria-label="'+esc(RN[r]+' '+c.name)+'"><span class="nm">'+esc(c.name)+'</span><span class="mp-track"><span class="mp-fill" style="width:'+(100*c.lines/mx).toFixed(1)+'%;background:'+GC[c.group]+'"></span></span><span class="v">'+U.num(c.lines)+'</span></div>').join('')+'</div>'}).join('');
    $('mp-leg').innerHTML=Object.keys(GC).map(g=>'<span><i style="background:'+GC[g]+'"></i>'+GN[g]+'</span>').join('');
    detail(D.components.find(c=>c.id===sel));
  }
  $('mp-repos').addEventListener('click',e=>{const r=e.target.closest('.mp-row');if(!r)return;sel=r.dataset.id;render()});
  $('mp-repos').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const r=e.target.closest('.mp-row');if(r){e.preventDefault();sel=r.dataset.id;render()}}});
  $('mp-det').addEventListener('click',e=>{const a=e.target.closest('a[data-sec]');if(!a)return;e.preventDefault();document.querySelector('#tabs button[data-t="t-read"]').click();const s=document.getElementById(a.dataset.sec);if(s)s.scrollIntoView({block:'start'})});
  U.seg($('mp-concern'),m=>{concern=m;if(m!=='all'){const f=D.components.find(c=>c.group===m);if(f)sel=f.id}render()});
  sel='mt_sharding';render();
})();
