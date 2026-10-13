// ---- Making training fast: shared helpers for the Reading tab's visuals (data in window.FST, 22_fst_data.js) ----
window.FU=(function(){
  const $=id=>document.getElementById(id);
  const mb=b=>(b/1e6).toFixed(1)+' MB';
  const f1=v=>(+v).toFixed(1), f2=v=>(+v).toFixed(2);
  const ms=v=>(v>=100?(+v).toFixed(0):v>=10?(+v).toFixed(1):(+v).toFixed(2))+' ms';
  const comma=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  // horizontal bars: rows [{nm, ml (small line), v, txt, col, hl}]
  function bars(el,rows,max){
    max=max||Math.max(...rows.map(r=>r.v))||1;
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm">'+r.nm+(r.ml?'<span class="ml">'+r.ml+'</span>':'')+'</div><div class="track"><div class="fill" style="width:'+Math.max(0.5,100*r.v/max).toFixed(2)+'%;background:'+(r.col||'var(--acc)')+'"></div></div><div class="val">'+r.txt+'</div></div>').join('');
  }
  // segmented control: el gets buttons for opts [[value,label]]; f(value); returns setter
  function seg(el,opts,f,start){
    el.innerHTML=opts.map(o=>'<button data-m="'+o[0]+'"'+(o[0]===start?' class="on"':'')+'>'+o[1]+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
    f(start);
  }
  // predict-then-reveal: el has .opts buttons with data-a; right index; answer html
  function predict(id,right,html){
    const el=$(id);if(!el)return;const ans=el.querySelector('.ans');
    el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      el.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===right)x.classList.add('right')});
      if(+b.dataset.a!==right)b.classList.add('wrong');ans.hidden=false;ans.innerHTML=(+b.dataset.a===right?'<b>Right.</b> ':'<b>Not quite.</b> ')+html});
  }
  const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
  const load=l=>l?('load average '+l[0].toFixed(1)):'';
  return {$,mb,f1,f2,ms,comma,bars,seg,predict,med,load};
})();
