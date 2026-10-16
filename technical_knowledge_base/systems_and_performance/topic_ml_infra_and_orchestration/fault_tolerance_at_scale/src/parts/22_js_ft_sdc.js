// ---- Reading, Silent data corruption: one bit flipped in the running example (window.FT.sdc) ----
(function(){
const D=window.FT.sdc, $=id=>document.getElementById(id), E=RD.esc;
if(!$('sd-card'))return;
let KIND='grad',BIT='hi';
const key=()=>KIND+'_'+BIT;
const sci=x=>x===null||x===undefined?'n/a':(Math.abs(x)>=1e4||(Math.abs(x)<1e-3&&x!==0))?(+x).toExponential(2).replace('e+','e'):(+x).toPrecision(4);
const BITTXT={lo:'bit 3 (a low mantissa bit: changes the value in its 7th significant digit)',mid:'bit 27 (an exponent bit: multiplies or divides the value by 2<sup>16</sup>)',hi:'bit 30 (the top exponent bit: multiplies a value below 2 by 2<sup>128</sup>)'};
// frames of the animation
const FR=6;
function drawAnim(i){
  const r=D.runs[key()],f=r.flip,el=$('sd-anim'),w=RD.width(el);
  const narrow=w<520,bw=narrow?(w-18)/2:(w-30)/4,bh=78,gap=10,rows=narrow?2:1;
  const H=rows*(bh+gap)+70;let s='';
  const bad=k=>{ // is replica k's state corrupted at this frame?
    if(KIND==='grad')return i>=2;           // after the all-reduce every replica holds the bad average
    return k===f.rank&&i>=2;};
  const gbad=k=>KIND==='grad'&&k===f.rank&&i>=1;
  for(let k=0;k<4;k++){
    const col=narrow?k%2:k,row=narrow?Math.floor(k/2):0,x=4+col*(bw+gap),y=row*(bh+gap);
    const stroke=(gbad(k)||bad(k))?'var(--bad)':'var(--line)';
    s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="'+stroke+'" stroke-width="'+((gbad(k)||bad(k))?2:1)+'"/>';
    s+=RD.t(x+8,y+17,'replica '+k+(k===f.rank?' (faulty chip)':''),{fs:12,w:600});
    const lg=i<1?'local gradient: ok':(gbad(k)?'local gradient: 1 bit flipped':'local gradient: ok');
    s+=RD.t(x+8,y+36,lg,{fs:11,fill:gbad(k)?'var(--bad)':'var(--mute)'});
    let wt='weights: identical';
    if(i>=2)wt=KIND==='grad'?'weights: identical (all wrong)':(k===f.rank?'weights: 1 bit differs':'weights: identical');
    s+=RD.t(x+8,y+53,wt,{fs:11,fill:bad(k)?'var(--bad)':'var(--mute)'});
    if(i>=3)s+=RD.t(x+8,y+70,'checksum '+(KIND==='grad'?'matches':(k===f.rank?'DIFFERS':'matches')),{fs:11,w:600,fill:(KIND!=='grad'&&k===f.rank)?'var(--bad)':'var(--good)'});
  }
  const yb=rows*(bh+gap)+4;
  s+='<rect x="4" y="'+yb+'" width="'+(w-8)+'" height="22" rx="6" fill="'+(i===1||i===2?'var(--acc2)':'var(--soft)')+'" stroke="var(--line)"/>';
  s+=RD.t(w/2,yb+15,'gradient all-reduce (average over the 4 replicas)'+(KIND==='grad'&&i>=1?': carries the flipped value to everyone':''),{fs:11.5,a:'middle'});
  s+=RD.t(4,yb+44,['step 120: each replica computes gradients on its rows','step 120: one bit flips on replica '+f.rank,'step 120: optimiser step','step 120: replicas compare weight checksums','step 121 to 200: training continues','step 200: the end of the run'][i],{fs:12,w:600});
  el.innerHTML=RD.svg(w,H,s,'Four replicas of the running example and where one flipped bit goes');
  const flipTxt=(KIND==='grad'?'the largest element of replica '+f.rank+'\'s local gradient bucket':'one weight of the first MLP layer on replica '+f.rank)+', '+BITTXT[BIT]+': '+sci(f.before)+' became '+sci(f.after);
  const cap=[
    'Four data-parallel replicas hold identical weights and each computes gradients on its own quarter of the batch. Nothing is wrong yet.',
    'A bit flips in '+flipTxt+'. Nothing raises an error: there is no ECC on an arithmetic result.',
    KIND==='grad'?'The all-reduce averages the bad gradient into everyone\'s, and every replica applies the same wrong update. The replicas stay identical to each other: they are all wrong together.':'The flip happened after the all-reduce, in one replica\'s memory: replica '+f.rank+' now holds a different weight from the other three, and DDP will never notice, because it only averages gradients.',
    KIND==='grad'?'Cross-replica checksums agree at every step (measured: '+(r.cks_first===null?'never disagreed':'disagreed at '+r.cks_first)+'). A checksum comparison cannot see a corruption that happened before the all-reduce.':'The checksums disagree at step '+r.cks_first+', the step of the flip (measured): comparing replicas catches corruption that happened after the all-reduce, on one replica.',
    r.nan_step?'Replica '+f.rank+'\'s forward pass overflows at step '+r.nan_step+': its loss is NaN, its NaN gradient is averaged into everyone\'s, and at step '+(r.nan_step+1)+' every replica\'s loss is NaN (measured). The loud case.':(r.first_diff===null?'No logged number changes: the global loss equals the clean run\'s at all 200 steps (measured).':'The global loss first differs from the clean run at step '+r.first_diff+', by at most '+sci(r.max_abs_diff)+' over '+r.n_diff+' steps (measured): far below the step-to-step noise of the loss.'),
    'Final global loss '+(r.final===null?'NaN':sci(r.final))+' against '+sci(r.final_clean)+' clean. '+(r.replay?'Replaying steps '+(r.replay.from+1)+' to '+r.replay.to+' from the step-'+r.replay.from+' checkpoint on healthy hardware and comparing each replica\'s local-gradient fingerprint with the logged one points at replica '+r.replay.first[1]+' at step '+r.replay.first[0]+(r.replay.first_step_ranks.length===1?', and only there':'')+'.':'Here the NaN itself is the alarm.')];
  $('sd-cap').innerHTML=cap[i];
}
let A;
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
function all(){if(A)A.redraw();drawDiff();drawTable()}
RD.seg($('sd-kind'),m=>{KIND=m;all()});
RD.seg($('sd-bit'),m=>{BIT=m;all()});
A=RD.anim({card:'sd-card',ctl:'sd-ctl',n:FR,draw:drawAnim,ms:2200,label:'Frame'});
RD.onRender(all);RD.onResize(all);all();
})();
