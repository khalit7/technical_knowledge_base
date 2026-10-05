// ---- Protocol atlas: which protocol when (four questions, one recommendation with its reason) ----
(function(){
  const A=window.AT,D=A.D,E=A.E,$=A.$,esc=A.esc,md=A.md;
  let ans={};try{ans=JSON.parse(A.store.get('at-ans','{}'))||{}}catch(e){ans={}}
  if(!ans.who)ans={who:'user',flow:'server',where:'public',client:'program'};
  const asked=q=>!q.only||q.only.indexOf(ans.who)>=0;
  function match(){
    for(const r of D.rules){let ok=true;for(const k in r.when){if(ans[k]!==r.when[k]){ok=false;break}
        const q=D.questions.find(x=>x.id===k);if(q&&!asked(q)){ok=false;break}}
      if(ok)return r}
    return null;
  }
  function render(){
    let h='';
    D.questions.forEach((q,i)=>{if(!asked(q))return;
      h+='<div class="at-q" role="group" aria-label="'+esc(q.q)+'"><div class="qq">'+(i+1)+'. '+esc(q.q)+'</div><div class="at-opts">'+
        q.opts.map(o=>'<button type="button" data-q="'+q.id+'" data-a="'+o[0]+'" class="'+(ans[q.id]===o[0]?'on':'')+'" aria-pressed="'+(ans[q.id]===o[0])+'">'+esc(o[1])+'</button>').join('')+'</div></div>';
    });
    $('at-qs').innerHTML=h;
    $('at-qs').querySelectorAll('button[data-q]').forEach(b=>b.addEventListener('click',()=>{ans[b.dataset.q]=b.dataset.a;A.store.set('at-ans',JSON.stringify(ans));render()}));
    const r=match();
    if(!r){$('at-rec').innerHTML='<div class="at-rec">Answer the questions above.</div>';return}
    const main=r.pick[0],p=A.path(main);
    let o='<div class="at-rec"><div class="small mute">Recommendation</div><div class="say">'+md(r.say)+'</div>'+
      '<dl class="at-kv"><dt>Why</dt><dd>'+md(r.why)+'</dd><dt>Avoid</dt><dd>'+md(r.avoid)+'</dd><dt>Who is calling</dt><dd>'+md(r.auth)+'</dd>'+
      '<dt>Protocols</dt><dd><span class="at-mini">'+r.pick.map(A.chipBtn).join('')+'</span></dd>'+
      (p.length>1?'<dt>On the wire</dt><dd><span class="at-path">'+p.map(x=>esc(E[x].name)).join('<span class="a"> on </span>')+'</span></dd>':'')+'</dl>';
    if(r.pick.length>1){const a=r.pick[0],b=r.pick.find(x=>x!==a&&E[x].group===E[a].group)||r.pick[1];
      o+='<p class="small">Open any protocol for its full entry, or <a href="#" data-at-cmp="'+a+'|'+b+'">compare '+esc(E[a].name)+' with '+esc(E[b].name)+'</a>.</p>'}
    $('at-rec').innerHTML=o+'</div>';
    const c=$('at-rec').querySelector('[data-at-cmp]');
    if(c)c.addEventListener('click',ev=>{ev.preventDefault();const [x,y]=c.dataset.atCmp.split('|');A.store.set('at-cmp',x+'|'+y);A.showView('cmp')});
  }
  A.vrender.choose=render;
})();
