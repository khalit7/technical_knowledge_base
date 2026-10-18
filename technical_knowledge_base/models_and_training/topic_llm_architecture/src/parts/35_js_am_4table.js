// ---- Architecture map: filterable, sortable table of every model, with a detail card ----
(function(){
  const A=window.AM;if(!A||!A.$('am-tw'))return;
  const {$,esc,rows,fmtB,num}=A;
  const SEQ=131072;
  const on={att:new Set(A.ATT.map(a=>a[0])),ffn:new Set(A.FFN.map(a=>a[0])),lic:new Set(Object.keys(A.LIC))};
  let q='',sortK='dt',sortD=1,sel=null;
  const pnum=s=>{const m=String(s||'').match(/([\d.]+)\s*([MBT])/);return m?parseFloat(m[1])*{M:1e6,B:1e9,T:1e12}[m[2]]:null};
  const seq=r=>r.kv?(r.kvw||r.kv)*SEQ:null;
  const posS=r=>{if(r.pos.indexOf('A')>=0)return 'learned';const n=r.pos.split('').filter(c=>c==='N').length,a=r.pos.replace(/-/g,'').length;
    if(a&&n===a)return 'NoPE';let s=r.pos.indexOf('P')>=0?(r.dc?'decoupled RoPE':'partial RoPE'):'RoPE';if(n)s+=', NoPE in '+n;return s};
  const normS=r=>({pre:'pre',post:'post',sandwich:'pre + post',parallel:'pre, parallel'}[r.nk]||r.nk)+' '+(r.nt||'').replace(' (zero-centred)',', zero-centred').replace(' (no bias)','')+(r.qk?', QK-norm':'');
  const ffnS=r=>(r.ffa||'')+(r.E?', '+r.E+' / top-'+r.k+(r.sh?' + '+r.sh:''):'');
  const mixS=r=>r.mix.indexOf('H')>=0?'parallel hybrid':r.hr?'hybrid '+r.hr:r.mix.indexOf('D')>=0?'sparse attention':'attention';
  const hay=r=>[r.n,r.lab,r.att,r.ffa,r.nt,r.sparse,r.new,r.posnote,r.lic,r.qk?'QK-norm qk norm':'',/N/.test(r.pos)?'NoPE':'',r.mix.indexOf('S')>=0?'sliding window SWA':'',r.dc?'MLA latent':'',r.E?'MoE experts':'dense',r.tied?'tied embeddings':''].join(' ').toLowerCase();
  const COLS=[
    ['n','Model',r=>'<b>'+esc(r.n)+'</b><span class="am-sub">'+esc(r.lab)+'</span>',r=>r.n,'mh'],
    ['dt','Released',r=>esc(r.dt),r=>r.dt,'d'],
    ['att','Attention',r=>'<i class="am-dot" style="background:'+A.colAtt(r.attk)+';margin-right:4px"></i>'+esc(r.att),r=>r.attk+r.att,''],
    ['kv','KV / token',r=>r.kv?fmtB(r.kv):'n/a',r=>r.kv==null?Infinity:r.kv,'n'],
    ['seq','KV, one 128K sequence',r=>r.kv?((r.ctxc||0)<SEQ?'<span class="mute">'+fmtB(seq(r))+'</span><span class="am-sub">past its '+num(r.ctxc)+' context</span>':fmtB(seq(r))+(r.kvw<r.kv?'<span class="am-sub">windows credited</span>':'')):'n/a',r=>r.kv==null?Infinity:seq(r),'n'],
    ['pos','Position',r=>esc(posS(r))+(r.theta&&typeof r.theta==='number'?'<span class="am-sub">base '+num(r.theta)+'</span>':''),r=>posS(r),''],
    ['norm','Norm',r=>esc(normS(r)),r=>normS(r),''],
    ['ffn','FFN',r=>'<i class="am-dot" style="background:'+A.colFfn(r.ffk)+';margin-right:4px"></i>'+esc(ffnS(r)),r=>r.ffk+(r.E||0),''],
    ['mix','Mixer',r=>esc(mixS(r)),r=>mixS(r),''],
    ['shape','Layers x width',r=>r.L+' x '+num(r.D)+'<span class="am-sub">'+r.H+' heads'+(r.Hkv&&r.Hkv!==r.H?', '+r.Hkv+' KV':'')+', dim '+r.dh+'</span>',r=>r.L*1e6+r.D,'n'],
    ['V','Vocab',r=>num(r.V)+(r.tied?'<span class="am-sub">tied</span>':''),r=>r.V,'n'],
    ['ctx','Context',r=>A.ctx(r),r=>r.ctxc||0,''],
    ['tot','Parameters',r=>A.params(r),r=>pnum(r.tot)||0,''],
    ['lic','Licence',r=>'<span class="am-tag" style="color:'+({permissive:'var(--open)',custom:'var(--c5)',research:'var(--bad)',closed:'var(--closed)'}[r.lk])+'">'+esc(r.lic)+'</span>',r=>r.lk+r.lic,'']
  ];
  function chips(id,list,set,lab){
    const el=$(id);el.innerHTML=list.map(a=>'<button data-v="'+esc(a[0])+'">'+(a[1]?'<i class="am-dot" style="background:var('+a[1]+')"></i>':'')+esc(lab?lab(a):a[0])+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.v;
      if(set.has(v)&&set.size===list.length){set.clear();set.add(v)}else if(set.has(v)){set.delete(v);if(!set.size)list.forEach(a=>set.add(a[0]))}else set.add(v);
      el.querySelectorAll('button').forEach(x=>x.classList.toggle('off',!set.has(x.dataset.v)));render()})}
  chips('am-f-att',A.ATT,on.att);chips('am-f-ffn',A.FFN,on.ffn);
  chips('am-f-lic',Object.keys(A.LIC).map(k=>[k,null]),on.lic,a=>A.LIC[a[0]]);
  $('am-f-q').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();render()});
  function render(){
    const col=COLS.find(c=>c[0]===sortK);
    const v=rows.filter(r=>on.att.has(r.attk)&&on.ffn.has(r.ffk)&&on.lic.has(r.lk)&&(!q||q.split(/\s+/).every(w=>hay(r).indexOf(w)>=0)))
      .sort((a,b)=>{const x=col[3](a),y=col[3](b);return (x<y?-1:x>y?1:0)*sortD});
    $('am-f-n').textContent=v.length+' of '+rows.length+' models';
    let h='<table class="am-t"><thead><tr>'+COLS.map(c=>'<th data-k="'+c[0]+'" class="'+(c[4]==='mh'?'mh':'')+'" aria-sort="'+(c[0]===sortK?(sortD>0?'ascending':'descending'):'none')+'">'+c[1]+(c[0]===sortK?(sortD>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr></thead><tbody>';
    v.forEach(r=>{h+='<tr data-id="'+r.id+'"'+(sel===r.id?' class="hl"':'')+'>'+COLS.map(c=>'<td class="'+(c[4]||'')+'">'+c[2](r)+'</td>').join('')+'</tr>'});
    if(!v.length)h+='<tr><td colspan="'+COLS.length+'">No model matches these filters.</td></tr>';
    $('am-tw').innerHTML=h+'</tbody></table>';
  }
  $('am-tw').addEventListener('click',e=>{const th=e.target.closest('th[data-k]');if(th){const k=th.dataset.k;if(k===sortK)sortD=-sortD;else{sortK=k;sortD=1}render();return}
    const tr=e.target.closest('tr[data-id]');if(!tr)return;sel=tr.dataset.id;$('am-det').innerHTML=A.detail(A.byId[sel]);render();$('am-det').scrollIntoView({block:'nearest'})});
  A.tabLinks($('am-det'));
  render();
  $('am-det').innerHTML='<p class="small mute">Click a row for its card: layer strip, every axis, and the sources.</p>';
  window.AM.pnum=pnum;window.AM.seq=seq;
})();
