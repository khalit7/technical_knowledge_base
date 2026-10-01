// ---- The table: search, lab, year, weights and kind filters, sortable columns ----
(function(){
  const R=ROWS,tb=$('tb').querySelector('tbody'),esc=RH.esc;
  const KT=['flagship','reasoning','moe','dense','multimodal','small','hybrid-attention','encoder-decoder'];
  const KN={'moe':'MoE','hybrid-attention':'hybrid attention','encoder-decoder':'encoder-decoder'};
  const kn=k=>KN[k]||k;
  const st={q:'',lab:'',year:'',w:'',k:new Set(),s:'d',dir:-1,sz:'t'};
  $('tbLab').innerHTML+=RH.LABS.slice().sort().map(l=>'<option>'+esc(l)+'</option>').join('');
  $('tbK').innerHTML=KT.map(k=>'<button data-k="'+k+'" aria-pressed="false">'+kn(k)+' ('+R.filter(r=>r.k.includes(k)).length+')</button>').join('');
  const hi=(s,q)=>{s=esc(s);if(!q)return s;const re=new RegExp('('+esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');return s.replace(re,'<mark>$1</mark>')};
  const szv=r=>st.sz==='a'?(r.a!=null?r.a:(r.moe?null:r.t)):st.sz==='sp'?(r.t==null?null:(r.sp||1)):r.t;
  function key(r){switch(st.s){case 'd':return r.sk+String(1000+r.i);case 'm':return r.m.toLowerCase();case 'l':return r.l.toLowerCase()+r.sk;
    case 'w':return (r.o?'0':'1')+RH.LIC[r.lc]+r.sk;case 'n':return r.n.toLowerCase();case 'z':return szv(r)}}
  function match(r){const q=st.q.toLowerCase();
    if(q&&![r.m,r.l,r.n,r.lic||'',r.o?'open':'closed',r.sz,r.d,r.k.map(kn).join(' ')].join(' | ').toLowerCase().includes(q))return false;
    if(st.lab&&r.l!==st.lab)return false;if(st.year&&r.y!==st.year)return false;
    if(st.w==='o'&&!r.o)return false;if(st.w==='c'&&r.o)return false;
    if(['perm','cond','own','nc'].includes(st.w)&&r.lc!==st.w)return false;
    for(const k of st.k)if(!r.k.includes(k))return false;return true}
  function render(){
    let rs=R.filter(match);
    rs.sort((a,b)=>{let x=key(a),y=key(b);
      if(st.s==='z'){if(x==null&&y==null)return a.sk<b.sk?-1:1;if(x==null)return 1;if(y==null)return -1;return st.dir*(x-y)||(a.sk<b.sk?-1:1)}
      return st.dir*(x<y?-1:x>y?1:0)});
    const q=st.q;
    tb.innerHTML=rs.map(r=>'<tr'+(r.fix?' style="box-shadow:inset 0 -2px 0 var(--bad)"':'')+'>'+
      '<td class="d">'+r.d+(r.d.length===7?' <span class="kt" style="display:inline">(month)</span>':'')+'</td>'+
      '<td class="m">'+hi(r.m,q)+'<span class="kt">'+r.k.map(kn).join(', ')+'</span></td>'+
      '<td class="lb" data-h="Lab">'+(q?hi(r.l,q):RH.labLink(r.l))+'</td>'+
      '<td data-h="Weights">'+(r.o?'<span class="w-o">open</span>'+(r.lic?' ('+hi(r.lic,q)+')':''):'<span class="w-c">closed</span>')+'</td>'+
      '<td class="sz" data-h="Size">'+(r.t==null?'<span class="mute">'+(r.o?'n/a':'not disclosed')+'</span>':hi(r.sz,q)+(r.da?' <span class="kt" style="display:inline">(active derived)</span>':'')+(r.moe?'<span class="kt">sparsity '+r.sp.toFixed(1)+'</span>':''))+'</td>'+
      '<td data-h="Why it matters">'+hi(r.n,q)+' '+A(r.u,'source')+(r.fix?'<span class="fx">Corrected here: '+esc(r.fix)+' '+A(r.fu,'source')+'</span>':'')+'</td></tr>').join('')||'<tr><td colspan="6" class="mute">No rows match these filters.</td></tr>';
    const no=rs.filter(r=>r.o).length;
    $('tbCount').textContent=rs.length+' of '+R.length+' rows ('+no+' open, '+(rs.length-no)+' closed)';
    $('tb').querySelectorAll('th').forEach(th=>th.setAttribute('aria-sort',th.dataset.s===st.s?(st.dir>0?'ascending':'descending'):'none'));
    $('tbSortM').value=['d','m','l','w','z'].includes(st.s)?st.s:'d';$('tbDir').textContent=st.dir>0?'Ascending':'Descending'}
  const sync=()=>{$('tbQ').value=st.q;$('tbLab').value=st.lab;$('tbYear').value=st.year;$('tbW').value=st.w;$('tbSz').value=st.sz;
    $('tbK').querySelectorAll('button').forEach(b=>{const on=st.k.has(b.dataset.k);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})};
  let tq;$('tbQ').addEventListener('input',e=>{clearTimeout(tq);tq=setTimeout(()=>{st.q=e.target.value.trim();render()},120)});
  $('tbLab').addEventListener('change',e=>{st.lab=e.target.value;render()});
  $('tbYear').addEventListener('change',e=>{st.year=e.target.value;render()});
  $('tbW').addEventListener('change',e=>{st.w=e.target.value;render()});
  $('tbSz').addEventListener('change',e=>{st.sz=e.target.value;if(st.s==='z')render()});
  $('tbK').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;st.k.has(k)?st.k.delete(k):st.k.add(k);sync();render()}));
  $('tb').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const s=th.dataset.s;if(st.s===s)st.dir=-st.dir;else{st.s=s;st.dir=(s==='d'||s==='z')?-1:1}render()}));
  $('tbSortM').addEventListener('change',e=>{st.s=e.target.value;st.dir=(st.s==='d'||st.s==='z')?-1:1;render()});
  $('tbDir').addEventListener('click',()=>{st.dir=-st.dir;render()});
  $('tbReset').addEventListener('click',()=>{Object.assign(st,{q:'',lab:'',year:'',w:'',s:'d',dir:-1,sz:'t'});st.k.clear();sync();render()});
  // other tabs call this to filter the table: {lab, year, w, k:[...], q}
  window.__tbSet=f=>{st.q=f.q||'';st.lab=f.lab||'';st.year=f.year||'';st.w=f.w||'';st.k=new Set(f.k||[]);if(f.s){st.s=f.s;st.dir=f.dir||-1}sync();render()};
  sync();render();
})();
