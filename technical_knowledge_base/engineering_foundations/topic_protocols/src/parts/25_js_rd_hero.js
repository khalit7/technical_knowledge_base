// ---- Reading tab, the hero: one request's journey, a stepper over the eight protocols (captions are static HTML) ----
(function(){
  const card=document.getElementById('rd-jr');if(!card)return;
  card.classList.add('js-on');
  const lis=[...card.querySelectorAll('#rd-jr-steps li')],caps=[...card.querySelectorAll('#rd-jr-cap>div')];
  const rt=document.getElementById('rd-jr-rt');
  // round trips spent before the first byte of the answer, after step i (DNS counted as uncached)
  const RT=[0,1,2,3,4,4,4,4,4];
  function draw(i){
    lis.forEach((li,k)=>{li.classList.toggle('on',k+1===i);li.classList.toggle('done',k+1<i)});
    caps.forEach(c=>c.classList.toggle('on',+c.dataset.i===i));
    rt.textContent=i===0?'Step through the eight protocols, or press play.':'Round trips before the first byte of the answer can arrive, with an uncached name: '+RT[i]+(i>4?' (the answer then streams back over the same connection)':'');
  }
  const A=RD.anim({card:'rd-jr',ctl:'rd-jr-ctl',n:9,ms:2600,draw,label:'Journey step'});
  lis.forEach(li=>li.addEventListener('click',()=>A.go(+li.dataset.i)));
})();
