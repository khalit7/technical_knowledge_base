// ---- mHC: Sinkhorn-Knopp towards a doubly stochastic matrix (illustrative matrix) ----
(function(){
  let seed=3,M0;
  function newM(){const r=mulberry32(seed++);M0=Array.from({length:4},()=>Array.from({length:4},()=>0.05+r()*(r()<0.3?2.5:1)))}
  function norm2(M){let v=[1,1,1,1];for(let it=0;it<200;it++){const w=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)w[i]+=M[i][j]*v[j];const u=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)u[j]+=M[i][j]*w[i];const n=Math.hypot(...u);v=u.map(x=>x/n)}const w=[0,0,0,0];for(let i=0;i<4;i++)for(let j=0;j<4;j++)w[i]+=M[i][j]*v[j];return Math.hypot(...w)}
  function draw(){
    const n=+$('skN').value;$('skNv').textContent=n;
    let M=M0.map(r=>r.slice());
    for(let k=0;k<n;k++){M=M.map(r=>{const s=r.reduce((a,c)=>a+c,0);return r.map(x=>x/s)});for(let j=0;j<4;j++){let s=0;for(let i=0;i<4;i++)s+=M[i][j];for(let i=0;i<4;i++)M[i][j]/=s}}
    const rs=M.map(r=>r.reduce((a,c)=>a+c,0)),cs=[0,1,2,3].map(j=>M.reduce((a,r)=>a+r[j],0)),mx=Math.max(...M.flat());
    let h='<table class="mx">';
    M.forEach((r,i)=>{h+='<tr>'+r.map(x=>'<td style="background:color-mix(in srgb,var(--acc) '+(10+80*x/mx).toFixed(0)+'%,var(--bg))">'+x.toFixed(2)+'</td>').join('')+'<td class="s">Σ '+rs[i].toFixed(2)+'</td></tr>'});
    h+='<tr>'+cs.map(c=>'<td class="s">Σ '+c.toFixed(2)+'</td>').join('')+'<td class="s"></td></tr></table>';
    $('skM').innerHTML=h;
    const dev=Math.max(...rs.map(x=>Math.abs(x-1)),...cs.map(x=>Math.abs(x-1)));
    $('skOut').innerHTML='<div class="stat"><div class="k">Largest row or column error</div><div class="v">'+dev.toFixed(3)+'</div><div class="d">0 means doubly stochastic</div></div><div class="stat"><div class="k">Spectral norm ‖B‖₂</div><div class="v">'+norm2(M).toFixed(3)+'</div><div class="d">at most 1 once doubly stochastic: no amplification</div></div>';
  }
  newM();$('skN').addEventListener('input',draw);$('skNew').addEventListener('click',()=>{newM();draw()});draw();
})();

// ---- GRPO: group-relative advantages ----
(function(){
  let G=4,r=[1,0,0,1];
  $('grG').innerHTML=[2,4,8].map(g=>'<button data-g="'+g+'"'+(g===G?' class="on"':'')+'>Group of '+g+'</button>').join('');
  $('grG').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{G=+b.dataset.g;$('grG').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));r=Array.from({length:G},(_,i)=>i%3===0?1:0);draw()}));
  function draw(){
    $('grR').innerHTML=r.map((v,i)=>'<button data-i="'+i+'" class="'+(v?'r1':'')+'" aria-label="completion '+(i+1)+' reward '+v+'">r'+(i+1)+' = '+v+'</button>').join('');
    $('grR').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;r[i]=1-r[i];draw()}));
    const m=r.reduce((a,c)=>a+c,0)/G,sd=Math.sqrt(r.reduce((a,c)=>a+(c-m)**2,0)/G);
    const A=r.map(v=>sd>0?(v-m)/sd:0),amax=Math.max(1,...A.map(Math.abs));
    $('grBars').innerHTML=A.map((a,i)=>'<div class="row"><span class="nm">Completion '+(i+1)+'</span><span class="track"><span style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--mute)"></span><span class="fill" style="left:'+(a<0?50+50*a/amax:50).toFixed(1)+'%;width:'+(50*Math.abs(a)/amax).toFixed(1)+'%;background:'+(a<0?'var(--bad)':'var(--good)')+'"></span></span><span class="val">'+(sd>0?(a>0?'+':'')+a.toFixed(2):'0')+'</span></div>').join('');
    $('grNote').innerHTML='Mean '+m.toFixed(3)+', standard deviation '+sd.toFixed(3)+' (dividing by <i>G</i>). '+(sd>0?'The advantages sum to zero: the correct answers are pushed up by as much as the wrong ones are pushed down.':'Every reward is the same, so every advantage is 0 / 0: implementations add a small constant to the denominator and the group contributes no policy gradient, '+G+' rollouts spent for nothing (<a href="https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56" target="_blank" rel="noopener noreferrer">RL for LLMs</a>).');
  }
  draw();
})();
