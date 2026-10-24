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

