// ---- Part 1 (In depth), Predict the output tab: drills recorded by q_drills.py ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  if(!$('pa-dr-list'))return;
  const SEC={'names':['pa-s1','1. Names'],'data model':['pa-s2','2. Data model'],'iterators':['pa-s3','3. Iterators'],'functions':['pa-s4','4. Functions'],'classes':['pa-s5','5. Classes'],'exceptions':['pa-s7','7. Exceptions'],'async':['pa-s10','10. asyncio'],'internals':['pa-s11','11. Internals']};
  const KEY='pa-drill-score';
  let marks={};try{marks=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){marks={}}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(marks))}catch(e){}};
  const D=PA.drills,topics=['all'].concat([...new Set(D.map(d=>d.topic))]);
  let topic='all';
  $('pa-dr-topics').innerHTML=topics.map(t=>'<button data-t="'+esc(t)+'"'+(t==='all'?' class="on"':'')+'>'+esc(t)+' <span class="mute">'+(t==='all'?D.length:D.filter(d=>d.topic===t).length)+'</span></button>').join('');
  function render(){
    $('pa-dr-list').innerHTML=D.map((d,i)=>{if(topic!=='all'&&d.topic!==topic)return '';const s=SEC[d.topic]||['pa-s0',''];const m=marks[i];
      return '<div class="pa-dr'+(m?' '+m:'')+'" data-i="'+i+'"><h3>'+(i+1)+'. '+esc(d.title)+'<span class="tp">'+esc(d.topic)+'</span></h3>'+
      '<pre class="pa-code">'+esc(d.code)+'</pre>'+
      '<textarea aria-label="Your prediction" placeholder="Your prediction (optional, not saved)"></textarea>'+
      '<div class="acts"><button class="rv">Reveal</button><button class="ok">I got it</button><button class="miss">I missed it</button><span class="why">Explained in <a href="#" data-sec="'+s[0]+'">section '+esc(s[1])+'</a></span></div>'+
      '<div class="ans" hidden><div class="pa-olab">real output, Python 3.14.8</div><pre class="pa-out">'+esc(d.out)+'</pre></div></div>'}).join('');
    score();
  }
  function score(){const v=Object.values(marks),ok=v.filter(x=>x==='ok').length,ms=v.filter(x=>x==='miss').length;
    $('pa-dr-score').innerHTML='<span>right: <b>'+ok+'</b></span><span>missed: <b>'+ms+'</b></span><span>not marked: <b>'+(D.length-ok-ms)+'</b></span>'}
  $('pa-dr-topics').addEventListener('click',e=>{const b=e.target.closest('button[data-t]');if(!b)return;topic=b.dataset.t;
    $('pa-dr-topics').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
  $('pa-dr-list').addEventListener('click',e=>{const card=e.target.closest('.pa-dr');if(!card)return;const i=+card.dataset.i;
    const a=e.target.closest('a[data-sec]');if(a){e.preventDefault();window.SHOW_TAB&&window.SHOW_TAB('t-pa-read',true);const s=$(a.dataset.sec);if(s)s.scrollIntoView({block:'start'});return}
    if(e.target.closest('.rv')){const ans=card.querySelector('.ans');ans.hidden=!ans.hidden;e.target.textContent=ans.hidden?'Reveal':'Hide';return}
    const m=e.target.closest('.ok')?'ok':e.target.closest('.miss')?'miss':null;if(!m)return;
    marks[i]=marks[i]===m?undefined:m;if(!marks[i])delete marks[i];save();card.classList.remove('ok','miss');if(marks[i])card.classList.add(marks[i]);
    card.querySelector('.ans').hidden=false;card.querySelector('.rv').textContent='Hide';score()});
  $('pa-dr-all').addEventListener('click',()=>$('pa-dr-list').querySelectorAll('.pa-dr').forEach(c=>{c.querySelector('.ans').hidden=false;c.querySelector('.rv').textContent='Hide'}));
  $('pa-dr-hide').addEventListener('click',()=>$('pa-dr-list').querySelectorAll('.pa-dr').forEach(c=>{c.querySelector('.ans').hidden=true;c.querySelector('.rv').textContent='Reveal'}));
  $('pa-dr-reset').addEventListener('click',()=>{marks={};save();render()});
  render();
})();
