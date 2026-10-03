// ---- Sampler lab tab ----
(function(){
  const $=id=>document.getElementById(id);
  const P=SD.LAB.prompts;
  const NAMES={capital:'Capital of Australia',story:'Lighthouse story opening',cat:'Name for a grey kitten',pattern:'Continue red, blue, ...'};
  const PRE=[
    ['Model distribution (T 1, no truncation)',{T:1,k:0,p:1,m:0,y:1,r:1,a:0,f:0,o:'first'}],
    ['Greedy (T 0)',{T:0,k:0,p:1,m:0,y:1,r:1,a:0,f:0,o:'first'}],
    ['Chat rule of thumb (T 0.7, top-p 0.9)',{T:0.7,k:0,p:0.9,m:0,y:1,r:1,a:0,f:0,o:'first'}],
    ['llama.cpp defaults (T 0.8 last, top-k 40, top-p 0.95, min-p 0.05)',{T:0.8,k:40,p:0.95,m:0.05,y:1,r:1,a:0,f:0,o:'last'}],
    ['Qwen3 thinking (T 0.6, top-p 0.95, top-k 20)',{T:0.6,k:20,p:0.95,m:0,y:1,r:1,a:0,f:0,o:'first'}],
    ['DeepSeek-R1 evaluation (T 0.6, top-p 0.95)',{T:0.6,k:0,p:0.95,m:0,y:1,r:1,a:0,f:0,o:'first'}],
    ['T 2, top-p 0.95',{T:2,k:0,p:0.95,m:0,y:1,r:1,a:0,f:0,o:'first'}],
    ['T 2, min-p 0.1',{T:2,k:0,p:1,m:0.1,y:1,r:1,a:0,f:0,o:'first'}],
    ['Typical 0.5 (T 1)',{T:1,k:0,p:1,m:0,y:0.5,r:1,a:0,f:0,o:'first'}],
    ['Repetition penalty 1.3 (T 1)',{T:1,k:0,p:1,m:0,y:1,r:1.3,a:0,f:0,o:'first'}]
  ];
  const st={q:0,pos:0,rows:15,o:'first',seed:1};
  P.forEach((p,i)=>$('lb-q').insertAdjacentHTML('beforeend','<option value="'+i+'">'+NAMES[p.k]+'</option>'));
  PRE.forEach((p,i)=>$('lb-pre').insertAdjacentHTML('beforeend','<option value="'+i+'">'+p[0]+'</option>'));
  $('lb-pre').insertAdjacentHTML('beforeend','<option value="-1">Custom</option>');
  function fillPos(){const p=P[st.q];$('lb-pos').innerHTML=p.pos.map((x,i)=>'<option value="'+i+'">'+(i+1)+': after "'+(x.s.length>24?'…'+x.s.slice(-24):x.s||'(start)').replace(/[<>&"]/g,'').replace(/\n/g,' ')+'"</option>').join('');$('lb-pos').value=st.pos}
  const sl={T:'lb-T',k:'lb-k',p:'lb-p',m:'lb-m',y:'lb-y',r:'lb-r',a:'lb-a',f:'lb-f'};
  function setPreset(i){const c=PRE[i][1];Object.keys(sl).forEach(k=>$(sl[k]).value=c[k]);st.o=c.o;segSet('lb-ord',c.o);render()}
  function segSet(id,m){$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m))}
  function cfg(){const v=k=>+$(sl[k]).value;return {T:v('T'),k:v('k'),p:v('p'),minp:v('m'),typ:v('y'),rep:v('r'),pres:v('a'),freq:v('f'),order:st.o}}
  function entries(){const pos=P[st.q].pos[st.pos];const E=SD.entries(pos);
    // presence and frequency count generated tokens; the repetition penalty counts the whole context
    E.forEach((e,i)=>{if(!e.tail){e.cr=pos.c[i];e.cg=pos.g[i]}});return E}
  function runAll(c){
    // apply the two kinds of count separately: repetition penalty on context counts, presence/frequency on generated counts
    const E=entries();
    const E2=E.map(e=>{if(e.tail)return e;let l=e.l;if(e.cr>0&&c.rep!==1)l=l>0?l/c.rep:l*c.rep;if(e.cg>0)l-=c.pres+c.freq*e.cg;return Object.assign({},e,{l,c:0})});
    const R=SD.run(E2,Object.assign({},c,{rep:1,pres:0,freq:0}));
    R.raw=SD.run(E,{T:1,k:0,p:1,minp:0,typ:1,order:'first'}).raw;
    return {E,R};
  }
  let last=null;
  function render(){
    const c=cfg();
    $('lb-Tv').textContent=c.T>0?c.T.toFixed(2):'0 (greedy)';$('lb-kv').textContent=c.k?c.k:'off';$('lb-pv').textContent=c.p>=1?'off':c.p.toFixed(2);
    $('lb-mv').textContent=c.minp>0?c.minp.toFixed(2):'off';$('lb-yv').textContent=c.typ>=1?'off':c.typ.toFixed(2);$('lb-rv').textContent=c.rep===1?'off':c.rep.toFixed(2);
    $('lb-av').textContent=c.pres?c.pres.toFixed(1):'off';$('lb-fv').textContent=c.freq?c.freq.toFixed(1):'off';
    const p=P[st.q],pos=p.pos[st.pos];
    $('lb-ctx').innerHTML='<span class="q">User: '+RD.esc(p.q)+'</span>\nAssistant: '+RD.esc(pos.s)+'<span class="nw"> ? </span>';
    const {E,R}=runAll(c);last={E,R};
    const vocab=E.reduce((a,e)=>a+e.n,0);
    $('lb-out').innerHTML=RD.stat('Tokens kept',SD.fmtN(R.kept),'of '+SD.fmtN(vocab))+RD.stat('Mass kept',SD.fmtP(R.mass),'before renormalising')+
      RD.stat('Effective choices',R.eff<10?R.eff.toFixed(2):SD.fmtN(R.eff),'exp(entropy) of the final distribution')+
      RD.stat('Top token now',SD.fmtP(Math.max(...R.fin.filter((x,i)=>!E[i].tail))),'model at T 1: '+SD.fmtP(R.raw[0]))+
      RD.stat('Outside top 10',SD.fmtP(R.out10),'chance a draw lands there');
    let h='<div class="hd">token</div><div class="hd">probability: grey before cut, blue final</div><div class="hd v">final</div>';
    for(let i=0;i<Math.min(st.rows,E.filter(e=>!e.tail).length);i++){const e=E[i];
      const cls=(R.keep[i]?'':' cut')+(e.cr>0?' ctx':'');
      h+='<div class="nm'+cls+'" title="raw p '+SD.fmtP(R.raw[i])+(e.cr?'; in context '+e.cr+'x':'')+'"><span class="tk">'+SD.vis(e.t)+'</span></div><div class="tr"><div class="g" style="width:'+(R.pre[i]*100).toFixed(1)+'%"></div><div class="f" style="width:'+(R.fin[i]*100).toFixed(1)+'%"></div>'+(R.cut[i]?'<span class="x">'+R.cut[i]+'</span>':'')+'</div><div class="v">'+(R.keep[i]?SD.fmtP(R.fin[i]):'cut')+'</div>'}
    let rp=0,rf=0,rk=0,rn=0;for(let i=st.rows;i<E.length;i++){rp+=R.pre[i];rf+=R.fin[i];rk+=R.keep[i];rn+=E[i].n}
    h+='<div class="nm tail"><span class="tk">'+SD.fmtN(rn)+' other tokens</span></div><div class="tr"><div class="g" style="width:'+(rp*100).toFixed(1)+'%"></div><div class="f" style="width:'+(rf*100).toFixed(1)+'%"></div></div><div class="v">'+SD.fmtP(rf)+'<br><span class="small mute">'+(rk>=10000?(rk/1000).toFixed(0)+'k':SD.fmtN(rk))+' kept</span></div>';
    $('lb-list').innerHTML=h;$('lb-chips').innerHTML='';$('lb-drawn').textContent='';
  }
  function draw200(){if(!last)return;const {E,R}=last;st.seed++;const c=SD.draw(R,200,st.seed);
    const items=Object.entries(c).map(([i,n])=>[+i,n]).sort((a,b)=>b[1]-a[1]);
    let tailN=0,distinct=0;items.forEach(([i,n])=>{if(E[i].tail)tailN+=n;distinct++});
    $('lb-chips').innerHTML=items.filter(([i])=>!E[i].tail).slice(0,24).map(([i,n])=>'<span><span class="tk">'+SD.vis(E[i].t)+'</span> <b>'+n+'</b></span>').join('')+(tailN?'<span>tokens outside the top 60 <b>'+tailN+'</b></span>':'');
    $('lb-drawn').textContent='200 draws (seed '+st.seed+'): '+items.filter(([i])=>!E[i].tail).length+' distinct tokens from the top 60'+(tailN?', '+tailN+' from the rest':'')+'.'}
  $('lb-q').addEventListener('change',e=>{st.q=+e.target.value;st.pos=0;fillPos();render()});
  $('lb-pos').addEventListener('change',e=>{st.pos=+e.target.value;render()});
  $('lb-pre').addEventListener('change',e=>{const i=+e.target.value;if(i>=0)setPreset(i)});
  Object.values(sl).forEach(id=>$(id).addEventListener('input',()=>{$('lb-pre').value='-1';render()}));
  $('lb-ord').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.o=b.dataset.m;segSet('lb-ord',st.o);$('lb-pre').value='-1';render()}));
  $('lb-rows').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.rows=+b.dataset.m;segSet('lb-rows',b.dataset.m);render()}));
  $('lb-draw').addEventListener('click',draw200);
  fillPos();$('lb-pre').value='0';setPreset(0);
  (window.TAB_RENDER=window.TAB_RENDER||{});(TAB_RENDER['t-lab']=TAB_RENDER['t-lab']||[]).push(render);
})();
