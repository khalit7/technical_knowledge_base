// ---- Protocol atlas: compare two protocols field by field ----
(function(){
  const A=window.AT,D=A.D,E=A.E,$=A.$,esc=A.esc,md=A.md;
  const full=D.entries.filter(e=>!e.brief);
  const FIELDS=[['Layer',e=>esc(A.G[e.group].label)],['In one line',e=>md(e.plain)],['Problem it solves',e=>md(e.problem)],
    ['Typical path',e=>A.path(e.id).map(x=>esc(E[x].name)).join(' on ')],['Since',e=>e.year?String(e.year):'no single date'],['Standards body',e=>esc(e.body)],
    ['Current version',e=>md(e.cur)],['Adds to each message',e=>md(e.adds)],['What it costs',e=>md(e.costs)],['When not to use it',e=>md(e.not_when)],
    ['Replaced',e=>md(e.replaces)],['Competes with',e=>md(e.competes)],['Where you meet it',e=>'<ul>'+e.meet.map(m=>'<li>'+md(m)+'</li>').join('')+'</ul>'],
    ['How it fails',e=>md(e.fail.symptom)+' '+md(e.fail.cause)],['See it',e=>md(e.fail.see)]];
  let pair=(A.store.get('at-cmp','sse|ws')||'sse|ws').split('|');
  function fill(){
    const o=full.map(e=>'<option value="'+e.id+'">'+esc(e.name)+'</option>').join('');
    $('at-ca').innerHTML=o;$('at-cb').innerHTML=o;
    $('at-ca').addEventListener('change',ev=>{pair[0]=ev.target.value;render()});
    $('at-cb').addEventListener('change',ev=>{pair[1]=ev.target.value;render()});
    $('at-swap').addEventListener('click',()=>{pair=[pair[1],pair[0]];render()});
    $('at-pairs').innerHTML='<span class="small mute" style="align-self:center">Common pairs:</span>'+Object.keys(D.pairs).map(k=>{const [a,b]=k.split('|');
      return '<button type="button" data-pair="'+k+'">'+esc(E[a].name)+' / '+esc(E[b].name)+'</button>'}).join('');
    $('at-pairs').querySelectorAll('[data-pair]').forEach(b=>b.addEventListener('click',()=>{pair=b.dataset.pair.split('|');render()}));
  }
  function render(){
    if(!E[pair[0]]||E[pair[0]].brief)pair[0]='sse';if(!E[pair[1]]||E[pair[1]].brief)pair[1]='ws';
    A.store.set('at-cmp',pair.join('|'));
    $('at-ca').value=pair[0];$('at-cb').value=pair[1];
    const a=E[pair[0]],b=E[pair[1]];
    $('at-pairs').querySelectorAll('[data-pair]').forEach(x=>{const k=x.dataset.pair;x.classList.toggle('on',k===[a.id,b.id].sort().join('|'))});
    let h='';
    const note=D.pairs[[a.id,b.id].sort().join('|')];
    if(a.id===b.id)h+='<div class="at-pair">Pick two different protocols.</div>';
    else if(note)h+='<div class="at-pair"><b>In short.</b> '+md(note)+'</div>';
    // shared layers along the two typical paths
    const pa=A.path(a.id),pb=A.path(b.id),shared=pa.filter(x=>pb.indexOf(x)>=0);
    if(a.id!==b.id)h+='<p class="small">'+(shared.length?'Both end up on <b>'+shared.map(x=>esc(E[x].name)).join(', ')+'</b>; they differ above that.':'Their typical paths share no layer.')+'</p>';
    h+='<div class="at-cmp"><div class="h h0"></div><div class="h">'+A.chipBtn(a.id)+'</div><div class="h">'+A.chipBtn(b.id)+'</div>';
    FIELDS.forEach(f=>{h+='<div class="k">'+esc(f[0])+'</div><div>'+f[1](a)+'</div><div>'+f[1](b)+'</div>'});
    h+='</div>';
    $('at-cmpout').innerHTML=h;
  }
  fill();
  A.vrender.cmp=()=>{const s=(A.store.get('at-cmp','sse|ws')||'sse|ws').split('|');if(s.length===2)pair=s;render()};
})();
