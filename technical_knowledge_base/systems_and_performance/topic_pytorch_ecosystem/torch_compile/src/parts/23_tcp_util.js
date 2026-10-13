// ---- torch.compile from the user's side: shared helpers (data in window.TCP, 22_tcp_data.js) ----
window.TU=(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const comma=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const mb=b=>(b/1e6).toFixed(2)+' MB';
  const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):0};
  // horizontal bars: rows [{nm, ml, v, txt, col, hl}]
  function bars(el,rows,max){
    max=max||Math.max(...rows.map(r=>r.v))||1;
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm">'+r.nm+(r.ml?'<span class="ml">'+r.ml+'</span>':'')+'</div><div class="track"><div class="fill" style="width:'+Math.max(0.5,100*r.v/max).toFixed(2)+'%;background:'+(r.col||'var(--acc)')+'"></div></div><div class="val">'+r.txt+'</div></div>').join('');
  }
  // segmented control from options [[value,label]]
  function seg(el,opts,f,start){
    el.innerHTML=opts.map(o=>'<button data-m="'+o[0]+'"'+(o[0]===start?' class="on"':'')+'>'+o[1]+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
    f(start);
  }
  const table=(head,rows)=>'<thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td'+(typeof c==='number'?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  // predict-then-reveal: every .pr[data-ok] on the page; the answer text is already in .ans
  function wirePredict(root){
    (root||document).querySelectorAll('.pr[data-ok]').forEach(el=>{
      const ok=+el.dataset.ok,ans=el.querySelector('.ans'),base=ans.innerHTML;
      el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
        el.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
        if(+b.dataset.a!==ok)b.classList.add('wrong');ans.hidden=false;ans.innerHTML=(+b.dataset.a===ok?'<b>Right.</b> ':'<b>Not quite.</b> ')+(ans.dataset.html||base)});
    });
  }
  return {$,esc,comma,mb,med,bars,seg,table,stat,wirePredict};
})();
