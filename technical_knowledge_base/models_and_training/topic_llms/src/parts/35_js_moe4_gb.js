// ---- Balancing scope: the same routing judged per micro-batch and over the global batch ----
(function(){
  const MOE=window.MOE;if(!MOE)return;const {$,onTab,fmt,fmtBytes,svgEl,bx,stat,A,logFrame,sup}=MOE;
  if(!$('moeGb'))return;
  const st={s:0.7};
  $('moeGbCtl').innerHTML='<label>Specialisation: share of a domain\'s tokens sent to its own expert <b id="moeGbV"></b><input type="range" id="moeGbS" min="0.25" max="1" step="0.05" value="0.7"></label>';
  const aux=f=>4*f.reduce((a,v)=>a+v*v,0);
  function draw(){const s=st.s,o=(1-s)/3;$('moeGbV').textContent=s.toFixed(2);
    const mb=[0,1,2,3].map(m=>[0,1,2,3].map(e=>e===m?s:o)),g=[0,1,2,3].map(e=>mb.reduce((a,m)=>a+m[e],0)/4);
    const micro=mb.reduce((a,m)=>a+aux(m),0)/4,glob=aux(g);
    const W=Math.max(320,Math.min(720,$('moeGbSvg').clientWidth||680)),nar=W<520,groups=5,gw=(W-20)/groups,H=nar?156:146,pt=22,ch=H-pt-22;let sv='';
    const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    [...mb,g].forEach((f,j)=>{const x0=10+j*gw,bw=(gw-14)/4;
      sv+='<text x="'+(x0+gw/2-4)+'" y="14" font-size="'+(nar?9.5:11)+'" text-anchor="middle" font-weight="600">'+(j<4?(nar?'MB '+(j+1):'micro-batch '+(j+1)):(nar?'global':'global batch'))+'</text>';
      sv+='<line x1="'+x0+'" x2="'+(x0+gw-10)+'" y1="'+(pt+ch*(1-0.25))+'" y2="'+(pt+ch*(1-0.25))+'" stroke="var(--ink)" stroke-dasharray="3 2" stroke-opacity=".5"/>';
      f.forEach((v,e)=>{sv+='<rect x="'+(x0+e*bw)+'" y="'+(pt+ch*(1-v))+'" width="'+(bw-2)+'" height="'+(ch*v)+'" fill="'+cols[e]+'"><title>expert '+(e+1)+': '+(v*100).toFixed(0)+'%</title></rect>'});
      sv+='<text x="'+(x0+gw/2-4)+'" y="'+(H-4)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">ℒ = '+aux(f).toFixed(2)+'α</text>'});
    $('moeGbSvg').innerHTML=svgEl(W,H,sv,'Expert shares per micro-batch and over the global batch')+'<p class="q" style="margin:4px 0 0">Bars: share of each expert in the batch (dashed line: 25%, perfectly even).</p>';
    $('moeGbOut').innerHTML=stat('Micro-batch loss (mean)',micro.toFixed(2)+'α','penalises the specialisation')+stat('Global-batch loss',glob.toFixed(2)+'α','the same routing, perfectly balanced overall')+stat('Penalty on specialisation',(micro-glob).toFixed(2)+'α','what micro-batch scope pushes against')+
      '<p class="q" style="flex-basis:100%">Formula: ℒ = <i>N</i> Σ <i>f<sub>i</sub> P<sub>i</sub></i> with <i>P<sub>i</sub></i> = <i>f<sub>i</sub></i>, in units of <i>α</i>; <i>N</i> = 4. Default 0.70: micro-batch 4 × (0.7² + 3 × 0.1²) = 2.08α, global 1.00α (recompute.py). Illustrative inputs; the paper\'s measured effects are in the text above.</p>'}
  $('moeGbS').addEventListener('input',e=>{st.s=+e.target.value;draw()});
  let lw=0;addEventListener('resize',()=>{const w=$('moeGbSvg').clientWidth;if(w&&Math.abs(w-lw)>30){lw=w;draw()}});
  onTab(()=>{lw=$('moeGbSvg').clientWidth;draw()});
})();
