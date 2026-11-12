// ---- Reading, Silent data corruption: one bit flipped in the running example (window.FT.sdc) ----
(function(){
const D=window.FT.sdc, $=id=>document.getElementById(id), E=RD.esc;
if(!$('sd-card'))return;
let KIND='grad',BIT='hi';
const key=()=>KIND+'_'+BIT;
const sci=x=>x===null||x===undefined?'n/a':(Math.abs(x)>=1e4||(Math.abs(x)<1e-3&&x!==0))?(+x).toExponential(2).replace('e+','e'):(+x).toPrecision(4);
const BITTXT={lo:'bit 3 (a low mantissa bit: changes the value in its 7th significant digit)',mid:'bit 27 (an exponent bit: multiplies or divides the value by 2<sup>16</sup>)',hi:'bit 30 (the top exponent bit: multiplies a value below 2 by 2<sup>128</sup>)'};
// the step lists beside Fig. 3 (40-series scene 42_js_sc_sdc.js draws the stage): run-specific numbers filled into their spans
function fillText(){
  const r=D.runs[key()],f=r.flip;
  document.querySelectorAll('.sd-flip').forEach(x=>x.innerHTML=BITTXT[BIT]+': '+sci(f.before)+' became '+sci(f.after));
  const loss=r.nan_step?'Replica '+f.rank+'\'s forward pass overflows at step '+r.nan_step+': its loss is NaN, its NaN gradient is averaged into everyone\'s, and at step '+(r.nan_step+1)+' every replica\'s loss is NaN (measured). The loud case.':(r.first_diff===null?'No logged number changes: the global loss equals the clean run\'s at all 200 steps (measured).':'The global loss first differs from the clean run at step '+r.first_diff+', by at most '+sci(r.max_abs_diff)+' over '+r.n_diff+' steps (measured): far below the step-to-step noise of the loss.');
  document.querySelectorAll('.sd-loss').forEach(x=>x.innerHTML=loss);
  document.querySelectorAll('.sd-rep').forEach(x=>x.innerHTML=r.replay?'Replaying steps '+(r.replay.from+1)+' to '+r.replay.to+' from the step-'+r.replay.from+' checkpoint on healthy hardware points at replica '+r.replay.first[1]+' at step '+r.replay.first[0]+', the first computation that used the bad weight.':'Not needed here: the NaN itself is the alarm.');
  document.querySelectorAll('.sd-fin').forEach(x=>x.innerHTML='Final global loss '+(r.final===null?'NaN':sci(r.final))+' against '+sci(r.final_clean)+' clean.');
  $('sd-bitx').innerHTML='This run: '+E(r.label)+'.';
}
window.FTSDC={get kind(){return KIND},get bit(){return BIT},run:()=>D.runs[key()],sci};
const stg=()=>(window.FTSTG||{})['stg-sdc'];

function drawDiff(){
  const r=D.runs[key()],el=$('sd-diff'),w=RD.width(el),H=150,l=46,b=22,t=8;
  const xs=[],n=r.diff.length,x0=100;
  const sx=(w-l-8)/(n-x0);
  const ly=v=>{const lv=Math.log10(Math.max(v,1e-9));return t+(H-t-b)*(1-(lv+9)/9)};
  let s='';
  [-9,-6,-3,0].forEach(e=>{const y=ly(Math.pow(10,e));s+='<line x1="'+l+'" x2="'+(w-6)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(l-4,y+4,'1e'+e,{fs:10.5,a:'end',fill:'var(--mute)'})});
  for(let j=x0;j<n;j++){
    const d=r.diff[j],x=l+(j-x0)*sx;
    if(d===null){s+='<rect x="'+x.toFixed(1)+'" y="'+t+'" width="'+Math.max(sx,1).toFixed(1)+'" height="'+(H-t-b)+'" fill="var(--bad)" opacity=".35"/>';continue}
    if(d!==0)s+='<rect x="'+x.toFixed(1)+'" y="'+ly(Math.abs(d)).toFixed(1)+'" width="'+Math.max(sx-.5,1).toFixed(1)+'" height="'+(H-b-ly(Math.abs(d))).toFixed(1)+'" fill="var(--c5)"/>';
  }
  const xf=l+(r.flip.step-1-x0)*sx;s+='<line x1="'+xf+'" x2="'+xf+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--bad)" stroke-dasharray="3 2"/>';
  [101,120,150,200].forEach(st=>s+=RD.t(l+(st-1-x0)*sx,H-6,st,{fs:10.5,a:'middle',fill:'var(--mute)'}));
  el.innerHTML=RD.svg(w,H,s,'Absolute difference of the global loss from the clean run, steps 101 to 200, log scale');
}
function drawTable(){
  const runs=['grad_lo','grad_mid','grad_hi','w_lo','w_mid','w_hi'];
  const v=(x,txt)=>x===null||x===undefined?'<td class="bad">missed</td>':'<td class="ok">'+(txt||('step '+x))+'</td>';
  let t='<div class="tw"><table class="ft-tbl"><thead><tr><th>Bit flipped</th><th>Loss-spike detector</th><th>Gradient-norm monitor</th><th>Cross-replica weight checksum</th><th>Replay from the step-100 checkpoint</th></tr></thead><tbody>';
  runs.forEach(k=>{const r=D.runs[k];
    t+='<tr'+(k===key()?' style="background:var(--acc2)"':'')+'><td>'+E(r.label)+'</td>'+v(r.spike_first)+v(r.norm_first,r.norm_first===null?null:'step '+r.norm_first+(r.gnorm_flip>1e3?' (norm '+sci(r.gnorm_flip)+')':''))+v(r.cks_first)+(r.replay?v(r.replay.first?r.replay.first[0]:null,'replica '+(r.replay.first||[])[1]+', step '+(r.replay.first||[])[0]):'<td>not run (the NaN is loud)</td>')+'</tr>'});
  t+='</tbody></table></div>';
  $('sd-tbl').innerHTML=t;
}
function all(){fillText();drawDiff();drawTable();const t=stg();if(t)t.draw()}
RD.seg($('sd-kind'),m=>{KIND=m;$('sx-sdc-grad').hidden=m!=='grad';$('sx-sdc-w').hidden=m==='grad';all();const t=stg();if(t)t.list(m==='grad'?'sx-sdc-grad':'sx-sdc-w')});
RD.seg($('sd-bit'),m=>{BIT=m;all()});
RD.onRender(all);RD.onResize(all);all();
})();
