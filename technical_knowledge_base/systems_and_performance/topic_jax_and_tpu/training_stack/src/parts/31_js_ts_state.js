// ---- Reading section 1: the split stepper (was the State inspector tab) ----
(function(){
  const U=TSU,D=U.D,N=D.nnx,root=document.getElementById('si-card');if(!root)return;
  const FILTERS=Object.keys(N.E2.plain.groups);
  const TYC={Param:'var(--c1)',RngCount:'var(--c2)',RngKey:'var(--c2)',StepCount:'var(--c4)'};
  let model='plain',filter=FILTERS[0];
  function leaves(){
    if(model==='scan'){const st=N.E7.stacked_leaves.map(l=>[l.path,l.type,l.shape,l.size,l.dtype]);
      return N.leaves.filter(l=>!l[0].startsWith('blocks')).concat(st).sort((a,b)=>a[0]<b[0]?-1:1)}
    return N.leaves.concat(N.E2[model].extra)}
  function inFirst(path,type){
    if(model!=='scan')return N.E2[model].groups[filter].first.indexOf(path)>=0;
    if(filter==='nnx.Param')return type==='Param';if(filter==='nnx.RngState')return false;
    if(filter.indexOf('kernel')>=0)return path.indexOf('kernel')>=0;if(filter.indexOf('attn')>=0)return type==='Param'&&path.indexOf('attn')>=0;
    if(filter.indexOf('Not')>=0)return type!=='Param';return false}
  function modOf(p){const s=p.split('.');return s[0]==='blocks'&&model!=='scan'?s[0]+'.'+s[1]:s[0]}
  function mods(){const out=[];leaves().forEach(l=>{const m=modOf(l[0]);if(out.indexOf(m)<0)out.push(m)});return out}
  const maxSize=65536*4;
  function row(l,g){const w=Math.max(1,Math.sqrt(l[3]/maxSize)*100);
    return '<div class="si-row"><span class="p">'+U.esc(l[0])+'</span><span class="ty" style="color:'+(TYC[l[1]]||'var(--ink)')+'">'+l[1]+'</span><span class="sh">'+(l[2].length?U.shape(l[2]):'scalar')+'</span><span><div class="bar" style="width:'+w.toFixed(1)+'%;background:'+(g===1?'var(--c3)':g===2?'var(--c5)':'var(--dim)')+'"></div></span></div>'}
  function draw(i){
    const L=leaves(),M=mods(),done=M.slice(0,i);
    let o='',a='',b='',na=0,nb=0,sa=0,sb=0;
    M.forEach(m=>{if(done.indexOf(m)>=0)return;const ls=L.filter(l=>modOf(l[0])===m),n=ls.reduce((a,l)=>a+l[3],0);
      o+='<div class="si-row"><span class="p">'+U.esc(m)+'</span><span class="ty">'+ls.length+' leaves</span><span class="sh">'+U.int(n)+'</span><span><div class="bar" style="width:'+Math.max(1,Math.sqrt(n/(4*maxSize))*100).toFixed(1)+'%"></div></span></div>'});
    L.forEach(l=>{const m=modOf(l[0]);if(done.indexOf(m)<0)return;
      if(inFirst(l[0],l[1])){a+=row(l,1);na++;sa+=l[3]}else{b+=row(l,2);nb++;sb+=l[3]}});
    document.getElementById('si-obj').innerHTML=o||'<span class="small mute">empty: every module visited</span>';
    document.getElementById('si-g1').innerHTML=a||'<span class="small mute">nothing yet</span>';
    document.getElementById('si-g2').innerHTML=b||'<span class="small mute">nothing yet</span>';
    document.getElementById('si-h2').innerHTML='group 1: <code>'+U.esc(filter)+'</code>';
    const cap=document.getElementById('si-cap');
    cap.innerHTML=i===0?'Before: one Python object, '+L.length+' leaves in '+M.length+' top-level parts. Press play: <code>nnx.split(model, '+U.esc(filter)+', ...)</code> visits them in path order.':
      i<M.length?'Visiting <code>'+U.esc(M[i-1])+'</code>: each Variable goes to the first filter that matches it; '+(M.length-i)+' parts left.':
      'After: graphdef plus two states. '+na+' leaves ('+U.int(sa)+' numbers) matched the filter; '+nb+' ('+U.int(sb)+') fell to <code>...</code>.'+(model==='scan'?' (Scanned model: group membership derived from the filter rule, the leaves themselves are measured.)':'');
    document.getElementById('si-stats').innerHTML=RD.stat('leaves',L.length,model==='scan'?'stacked on a layer axis':'')+RD.stat('group 1',na,U.int(sa)+' numbers')+RD.stat('rest',nb,U.int(sb)+' numbers');
  }
  const seg=document.getElementById('si-filter');
  seg.innerHTML=FILTERS.map((f,i)=>'<button data-m="'+U.esc(f)+'"'+(i===0?' class="on"':'')+'>'+U.esc(f)+'</button>').join('');
  const A=RD.anim({card:'si-card',ctl:'si-ctl',n:mods().length+1,draw,ms:700,label:'Split step'});
  RD.seg(document.getElementById('si-model'),v=>{model=v;A.reset(mods().length+1)});
  RD.seg(seg,v=>{filter=v;A.reset(mods().length+1)});
  // static attributes and optimizer sample
  const SA=N.E1.static_attr_values;
  U.table('si-static',[['Attribute'],['Values seen']],Object.keys(SA).map(k=>['<code>'+U.esc(k)+'</code>',SA[k].map(v=>'<code>'+U.esc(v)+'</code>').join(', ')]));
  U.table('si-opt',[['Path'],['Type'],['Shape']],N.E9.sample.map(l=>['<code>'+U.esc(l.path)+'</code>',l.type,l.shape.length?U.shape(l.shape):'scalar']));
})();
