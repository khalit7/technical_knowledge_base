// ---- Reading, how low is a real update: every linear matrix of SmolLM2-135M, base to Instruct ----
(function(){
  const $=id=>document.getElementById(id);if(!$('hm'))return;
  const M=PF_DATA.mods,cells=PF_DATA.cells,S=PF_DATA.modsum; // cell: [layer, module index, rel, r50, r90, e16, e64]
  const short=['q','k','v','o','gate','up','down'];
  const minDim=m=>Math.min(S[M[m]].shape[0],S[M[m]].shape[1]);
  const relMax=Math.max(...cells.map(c=>c[2]));
  const MEAS={
    r90:{v:c=>c[4]/minDim(c[1]),lab:c=>'rank '+c[4]+' of '+minDim(c[1])+' ('+Math.round(100*c[4]/minDim(c[1]))+'%)',leg:'rank for 90% of the update, as a share of the most it could be'},
    rel:{v:c=>c[2]/relMax,lab:c=>(100*c[2]).toFixed(1)+'% of ‖W₀‖',leg:'‖ΔW‖ / ‖W₀‖ (darkest = '+(100*relMax).toFixed(0)+'%)'},
    e16:{v:c=>c[5],lab:c=>(100*c[5]).toFixed(0)+'% held at rank 16',leg:'share of the update\'s squared size a rank-16 matrix could hold'}};
  let mode='r90',sel=null;
  function draw(){
    const el=$('hmP'),W=Math.max(300,RD.width(el)-14),lw=46,top=30,cw=Math.min(70,(W-lw)/7),ch=11,H=top+30*ch+8;
    const me=MEAS[mode];
    let h='<svg viewBox="0 0 '+(lw+7*cw)+' '+H+'" width="'+(lw+7*cw)+'" height="'+H+'" role="img" aria-label="Heatmap of the update for every layer and matrix">';
    h+='<text x="'+(lw+2*cw)+'" y="11" text-anchor="middle" font-size="10.5" fill="var(--mute)">attention</text><text x="'+(lw+5.5*cw)+'" y="11" text-anchor="middle" font-size="10.5" fill="var(--mute)">MLP</text><line x1="'+(lw+4*cw)+'" x2="'+(lw+4*cw)+'" y1="2" y2="'+(H-6)+'" stroke="var(--mute)"/>';
    short.forEach((s,j)=>{h+='<text x="'+(lw+cw*j+cw/2)+'" y="25" text-anchor="middle" font-size="11.5" fill="var(--ink)">'+s+'</text>'});
    for(let l=0;l<30;l+=5)h+='<text x="'+(lw-6)+'" y="'+(top+l*ch+9)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">layer '+l+'</text>';
    cells.forEach((c,i)=>{const x=lw+c[1]*cw,y=top+c[0]*ch,v=Math.max(0,Math.min(1,me.v(c)));
      h+='<rect data-i="'+i+'" x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(cw-1)+'" height="'+(ch-1)+'" fill="var(--c1)" fill-opacity="'+(0.06+0.94*v).toFixed(3)+'" stroke="'+(sel===i?'var(--ink)':'none')+'" stroke-width="2" style="cursor:pointer"><title>layer '+c[0]+' '+M[c[1]]+': '+me.lab(c)+'</title></rect>'});
    el.innerHTML=h+'</svg><div class="small mute" style="margin-top:4px">Colour: '+me.leg+'.</div>';
    $('hmM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  }
  function detail(i){const c=cells[i],s=S[M[c[1]]].shape;
    $('hmD').innerHTML='<b>Layer '+c[0]+', '+M[c[1]]+'</b> ('+s[0]+' × '+s[1]+'): update '+(100*c[2]).toFixed(1)+'% of the weight\'s size; 50% of it in '+c[3]+' directions, 90% in '+c[4]+'; a rank-16 matrix could hold '+(100*c[5]).toFixed(0)+'%, rank 64 '+(100*c[6]).toFixed(0)+'%.'}
  function table(){
    let h='<thead><tr><th>Matrix</th><th class="num">Shape (out × in)</th><th class="num">Median rank for 50%</th><th class="num">Median rank for 90%</th><th class="num">Mean share at rank 16</th></tr></thead><tbody>';
    M.forEach((m,j)=>{const s=S[m];h+='<tr><td>'+m+'</td><td class="num">'+s.shape[0]+' × '+s.shape[1]+'</td><td class="num">'+s.r50+'</td><td class="num">'+s.r90+' of '+minDim(j)+'</td><td class="num">'+Math.round(100*s.e16)+'%</td></tr>'});
    $('hmT').innerHTML=h+'</tbody>'}
  $('hmP').addEventListener('click',e=>{const r=e.target.closest('rect[data-i]');if(!r)return;sel=+r.dataset.i;detail(sel);draw()});
  $('hmM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;draw()});
  RD.onRender(draw);addEventListener('resize',draw);
  table();draw();
})();
