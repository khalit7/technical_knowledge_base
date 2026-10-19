// ---- Release history: the table (the shared filters, sortable columns, search highlighted) ----
(function(){
  const RH=window.RH,R=RH.ROWS,$=id=>document.getElementById(id),esc=RH.esc,kn=RH.kn,tb=$('tb').querySelector('tbody');
  const st={s:'d',dir:-1,sz:'t'};
  const hi=(s,q)=>{s=esc(s);if(!q)return s;const re=new RegExp('('+esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');return s.replace(re,'<mark>$1</mark>')};
  const szv=r=>st.sz==='a'?(r.a!=null?r.a:(r.moe?null:r.t)):st.sz==='sp'?(r.t==null?null:(r.sp||1)):r.t;
  function key(r){switch(st.s){case 'd':return r.sk+String(1000+r.i);case 'm':return r.m.toLowerCase();case 'l':return r.l.toLowerCase()+r.sk;
    case 'w':return (r.o?'0':'1')+RH.LIC[r.lc]+r.sk;case 'n':return r.n.toLowerCase();case 'z':return szv(r)}}
  function render(){
    const rs=R.filter(RH.match);
    rs.sort((a,b)=>{const x=key(a),y=key(b);
      if(st.s==='z'){if(x==null&&y==null)return a.sk<b.sk?-1:1;if(x==null)return 1;if(y==null)return -1;return st.dir*(x-y)||(a.sk<b.sk?-1:1)}
      return st.dir*(x<y?-1:x>y?1:0)});
    const q=RH.f.q;
    tb.innerHTML=rs.map(r=>'<tr'+(r.fix?' style="box-shadow:inset 0 -2px 0 var(--bad)"':'')+'>'+
      '<td class="d">'+r.d+(r.d.length===7?' <span class="kt" style="display:inline">(month)</span>':'')+'</td>'+
      '<td class="m">'+hi(r.m,q)+'<span class="kt">'+r.k.map(kn).join(', ')+'</span></td>'+
      '<td class="lb" data-h="Lab">'+(q?hi(r.l,q):RH.labLink(r.l))+'</td>'+
      '<td data-h="Weights">'+(r.o?'<span class="w-o">open</span>'+(r.lic?' ('+hi(r.lic,q)+')':''):'<span class="w-c">closed</span>')+'</td>'+
      '<td class="sz" data-h="Size">'+(r.t==null?'<span class="mute">'+(r.o?'n/a':'not disclosed')+'</span>':hi(r.sz,q)+(r.da?' <span class="kt" style="display:inline">(active derived)</span>':'')+(r.moe?'<span class="kt">sparsity '+r.sp.toFixed(1)+'</span>':''))+'</td>'+
      '<td data-h="Why it matters">'+hi(r.n,q)+' '+RH.A(r.u,'source')+(r.dn?'<span class="kt">Date note: '+esc(r.dn)+'</span>':'')+(r.fix?'<span class="fx">Corrected here: '+esc(r.fix)+' '+RH.A(r.fu,'source')+'</span>':'')+'</td></tr>').join('')||'<tr><td colspan="6" class="mute">No rows match these filters.</td></tr>';
    const no=rs.filter(r=>r.o).length;
    $('tbCount').textContent=rs.length+' of '+R.length+' rows ('+no+' open, '+(rs.length-no)+' closed)'+(RH.active()?', filtered: '+RH.fText().replace(/&quot;/g,'"'):'');
    $('tb').querySelectorAll('th').forEach(th=>th.setAttribute('aria-sort',th.dataset.s===st.s?(st.dir>0?'ascending':'descending'):'none'));
    $('tbSortM').value=['d','m','l','w','z'].includes(st.s)?st.s:'d';$('tbDir').textContent=st.dir>0?'Ascending':'Descending';$('tbSz').value=st.sz}
  $('tbSz').addEventListener('change',e=>{st.sz=e.target.value;if(st.s==='z')render()});
  $('tb').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const s=th.dataset.s;if(st.s===s)st.dir=-st.dir;else{st.s=s;st.dir=(s==='d'||s==='z')?-1:1}render()}));
  $('tbSortM').addEventListener('change',e=>{st.s=e.target.value;st.dir=(st.s==='d'||st.s==='z')?-1:1;render()});
  $('tbDir').addEventListener('click',()=>{st.dir=-st.dir;render()});
  RH.onFilter(render);render();
})();
