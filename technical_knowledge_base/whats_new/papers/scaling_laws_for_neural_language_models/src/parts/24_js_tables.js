// ---- The paper's tables, rebuilt ----
(function(){const T=PAPER.tables,RC=PAPER.rc,ax=a=>'<a href="'+PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">';
  const pw=s=>String(s).replace(/10\^(-?\d+)/g,'10<sup>$1</sup>').replace(/\^\(([^)]*)\)/g,'<sup>$1</sup>').replace(/\^([A-Za-zα_]+(?:\^min)?|-?[0-9.]+)/g,'<sup>$1</sup>').replace(/_([A-Za-z*]+)/g,'<sub>$1</sub>');
  // Table 1 calculator
  const V=50257;
  let dEx=null;const rd=v=>{const d=Math.pow(2,v);return d<64?Math.round(d):Math.round(d/16)*16};
  function t1(){const L=+$('t1L').value,d=dEx||rd(+$('t1D').value),c=Math.pow(2,+$('t1C').value);
    $('t1Lv').textContent=L;$('t1Dv').textContent=fmt(d);$('t1Cv').textContent=fmt(c);
    const da=d,ff=4*d,rows=[['Embed',(V+c)*d,4*d],['Attention: QKV',L*d*3*da,2*L*d*3*da],['Attention: Mask',0,2*L*c*da],['Attention: Project',L*da*d,2*L*da*d],['Feedforward',L*2*d*ff,2*L*2*d*ff],['De-embed',0,2*d*V]];
    const N=2*d*L*(2*da+ff),Cf=2*N+2*L*c*da;
    let h='<thead><tr><th>Operation</th><th class="num">Parameters</th><th class="num">FLOPs per token (forward)</th></tr></thead><tbody>';
    rows.forEach(r=>h+='<tr><td>'+r[0]+'</td><td class="num">'+(r[1]?sci(r[1],2):'none')+'</td><td class="num">'+sci(r[2],2)+'</td></tr>');
    h+='<tr><td><b>Total (non-embedding)</b></td><td class="num"><b>'+sci(N,3)+'</b></td><td class="num"><b>'+sci(Cf,3)+'</b></td></tr></tbody>';$('t1T').innerHTML=h;
    const emb=(V+c)*d,tr=6*N;
    $('t1O').innerHTML='<i>N</i> = 12 × '+L+' × '+fmt(d)+'² = <b>'+sci(12*L*d*d,3)+'</b> non-embedding parameters (Eq. 2.1). Embeddings add '+sci(emb,2)+' ('+(100*emb/(N+emb)).toFixed(1)+'% of all parameters), the share that makes small models look different when counted in. '+
      'Attention over the context is '+(100*(2*L*c*da)/Cf).toFixed(1)+'% of the forward pass (<i>n</i><sub>ctx</sub>/12<i>d</i><sub>model</sub> = '+(c/(12*d)).toFixed(3)+'); the de-embedding (output layer, left out of <i>C</i> = 6<i>N</i>) would add '+(100*2*d*V/(2*N)).toFixed(1)+'% to the 2<i>N</i> forward FLOPs. Training: 6<i>N</i> = '+sci(tr,2)+' FLOPs per token.'}
  ['t1L','t1C'].forEach(i=>$(i).addEventListener('input',t1));$('t1D').addEventListener('input',()=>{dEx=null;t1()});
  $('t1P').addEventListener('change',()=>{const [l,d,c]=$('t1P').value.split(',').map(Number);$('t1L').value=l;$('t1D').value=Math.log2(d);$('t1C').value=Math.log2(c);dEx=d;t1()});
  // Tables 2 to 6
  const kv=(t,id)=>{$(id).innerHTML='<thead><tr><th>Parameter</th>'+t.cols.map(c=>'<th class="num">'+pw(c)+'</th>').join('')+'</tr></thead><tbody><tr><td>Value</td>'+t.vals.map(v=>'<td class="num">'+pw(v)+'</td>').join('')+'</tr></tbody>'};
  kv(T.t2,'t2T');kv(T.t3,'t3T');
  $('t4T').innerHTML='<thead><tr>'+T.t4.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>'+T.t4.rows.map(r=>'<tr>'+r.map(c=>'<td>'+pw(c)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  $('t5T').innerHTML='<thead><tr><th>Power law</th><th>Scale</th></tr></thead><tbody>'+T.t5.rows.map(r=>'<tr><td>'+pw(r[0])+'</td><td>'+pw(r[1])+'</td></tr>').join('')+'</tbody>';
  $('t6T').innerHTML='<thead><tr><th>Value</th><th>Power</th><th>Scale</th></tr></thead><tbody>'+T.t6.rows.map(r=>'<tr><td>'+pw(r[0])+'</td><td>'+pw(r[1])+'</td><td>'+pw(r[2])+'</td></tr>').join('')+'</tbody>';
  function t6(){const C=Math.pow(10,+$('t6C').value/10);$('t6Cv').innerHTML=C>=0.01&&C<1e4?(C<1?C.toFixed(2):fmt(C,C<10?1:0)):sci(C,1);
    const N=1.3e9*Math.pow(C,0.73),B=2e6*Math.pow(C,0.24),S=5.4e3*Math.pow(C,0.03),D=2e10*Math.pow(C,0.27);
    $('t6O').innerHTML=stat('N<sub>opt</sub>',sci(N,2),'parameters')+stat('B',sci(B,2),'tokens per batch')+stat('S<sub>min</sub>',fmt(S,0),'steps (lower bound)')+stat('D<sub>opt</sub>',sci(D,2),'tokens, '+(D/N).toFixed(D/N<1?2:1)+' per parameter')+
      '<p class="small" style="margin:6px 0 0">FLOPs: '+sci(C*8.64e19,2)+' (<i>C</i><sub>min</sub>; at the critical batch the run uses twice that). For comparison, 20 tokens per parameter (Chinchilla) at the same 2<i>C</i><sub>min</sub> FLOPs would be '+sci(Math.sqrt(2*C*8.64e19/120),2)+' parameters.</p>'}
  $('t6C').addEventListener('input',t6);
  // Every derived number
  const f=(k,d)=>{const v=RC[k].v;return typeof v==='number'?(Math.abs(v)>=1e4||Math.abs(v)<1e-3?sci(v,d==null?2:d):v.toFixed(d==null?3:d)):''};
  const rows=[
   ['Loss factor for 2× N','double_N',4,'0.95','S1.SS2','ok'],
   ['Data growth for 8× N (8<sup>0.74</sup>)','eight_x',2,'roughly 5×','S1.SS1','ok'],
   ['α<sub>N</sub>/α<sub>D</sub> from Eq. 1.1 and 1.2','N_over_D_exp',2,'0.74 ("<i>D</i> ∝ <i>N</i><sup>0.74</sup>")','S1.SS2','no','The text derives <i>N</i><sup>0.74</sup> from Eq. 1.1 and 1.2, but 0.076/0.095 = 0.80; 0.74 is Table 2\'s 0.076/0.103.'],
   ['α<sub>N</sub>/α<sub>D</sub> from Table 2','N_over_D_exp_t2',3,'0.74','S4.T2','ok'],
   ['α<sub>C</sub><sup>min</sup> = 1/(1/α<sub>S</sub> + 1/α<sub>B</sub> + 1/α<sub>N</sub>)','alphaCmin_pred',3,'0.054 (Eq. 6.4); 0.052 (Eq. B.7)','S6.E4','no','Eq. 6.4 prints 0.054 for a formula that gives 0.052 (as Eq. B.7 prints); with Table 3\'s α<sub>N</sub> = 0.077 it is still only 0.052.'],
   ['Predicted <i>N</i> exponent α<sub>C</sub><sup>min</sup>/α<sub>N</sub>','pN_pred',2,'0.71 (Eq. 6.5)','S6.E5','no','Eq. 6.5\'s 0.71 is 0.054/0.076; with the correct 0.052 it is 0.68, still within 7% of the fitted 0.73.'],
   ['Predicted <i>B</i> exponent α<sub>C</sub><sup>min</sup>/α<sub>B</sub>','pB_pred',3,'0.24 (fitted)','S1.SS2','ok'],
   ['Predicted <i>S</i> exponent α<sub>C</sub><sup>min</sup>/α<sub>S</sub>','pS_pred',3,'0.03 (fitted); "closely matches"','S1.SS2','mid','Predicted 0.068 against the fitted 0.03: both small, but a factor of two apart.'],
   ['<i>B</i><sub>crit</sub> ∝ <i>L</i><sup>−1/α<sub>B</sub></sup>','B_L_exp',2,'4.8','S6.SS1','ok'],
   ['Loss drop that doubles <i>B</i><sub>crit</sub>','Bcrit_13pct',3,'13%','S5.F10','ok'],
   ['<i>B</i><sub>crit</sub> at <i>L</i> = 3.0 (tokens)','Bcrit_L3.0',2,'"roughly 1-2 million tokens at convergence for the largest models"','S1.SS1','mid','Eq. 5.3 gives 1.1M at L = 3.0 but 4.0M at L = 2.3, Eq. 1.1\'s converged loss for 1.5B parameters.'],
   ['<i>B</i><sub>crit</sub> at <i>L</i> = 2.3 (tokens)','Bcrit_L2.3',2,'(same claim)','S5.E3','mid'],
   ['Relative penalty behind <i>D</i> ≳ 5 × 10<sup>3</sup> <i>N</i><sup>0.74</sup>','overfit_thresh',4,'seed variation "roughly 0.02"','S4.E4','ok'],
   ['Largest <i>N</i> without overfitting on WebText2','wt2_tokens_ok_N',2,'"smaller than 10<sup>9</sup>"','S4.SS2','ok'],
   ['Tokens in a standard run (2.5 × 10<sup>5</sup> × 2<sup>19</sup>)','std_tokens',2,'not stated','S2.SS2','ok'],
   ['Passes over WebText2 in a standard run','std_epochs',2,'not discussed','S2.SS3','mid','Derived: about 5.7 passes over the 2.29 × 10<sup>10</sup> tokens; the paper does not discuss data repetition.'],
   ['f = α<sub>N</sub>/α<sub>S</sub>','f_eff',3,'about 10%','A2.E5','ok'],
   ['Eq. B.12, parameter ratio','B12',2,'2.7','A2.E12','ok'],
   ['Eq. B.13, step ratio','B13',3,'0.13','A2.E13','ok'],
   ['Eq. B.14, compute ratio','B14',3,'0.35; "65% less compute"','A2.E14','ok'],
   ['Fewer parameter updates, 1/B.13','B13_inv',2,'7.7×','A2.SS3','mid','1/0.133 = 7.5×, not 7.7× (7.7 would be 1/0.13, the rounded value).'],
   ['Eq. B.16 at 0.6× optimal size','B16_0.6',3,'within 20%','A2.E16','ok'],
   ['Eq. B.16 at 2.2× optimal size','B16_2.2',3,'within 20%','A2.E16','ok'],
   ['Eq. B.17 at 2.2×','B17_2.2',3,'45% fewer steps','A2.E17','ok'],
   ['Eq. 6.7 prefactor, 2 · 8.64 × 10<sup>19</sup>/(6 <i>N</i><sub>e</sub>)','eq67_pref',2,'4 × 10<sup>10</sup> (Eq. 6.7); 2 × 10<sup>10</sup> (Table 6)','S6.E7','no','Eq. 6.7 prints 4 × 10<sup>10</sup> tokens; its own formula with Table 6\'s N<sub>e</sub> gives 2.2 × 10<sup>10</sup>, which Table 6 prints as 2 × 10<sup>10</sup>.'],
   ['<i>D</i> ∝ <i>C</i><sub>min</sub><sup>0.74 × 0.73</sup>','eq66_exp',2,'0.54','S6.E6','ok'],
   ['<i>L</i>(<i>D</i>(<i>C</i><sub>min</sub>)) exponent 0.095 × 0.27','LD_C_exp',3,'0.03','S6.SS3','ok'],
   ['Crossing with the printed Eq. 6.7 (PF-days)','cross_printed',0,'~10<sup>4</sup> PF-days, L* ~ 1.7','S6.E8','no','With the printed 4 × 10<sup>10</sup> the crossing is at 1.1 × 10<sup>5</sup> PF-days and 1.49 nats; with the consistent 2.2 × 10<sup>10</sup> it is 1.7 × 10<sup>4</sup> and 1.63, near the paper\'s numbers. The paper warns of an order of magnitude either way.'],
   ['Crossing with Table 6\'s prefactor (PF-days)','cross_table6',0,'~10<sup>4</sup> PF-days, L* ~ 1.7','S6.E8','ok'],
   ['One PF-day (FLOPs)','pfday',2,'8.64 × 10<sup>19</sup>','S1.SS3','ok'],
   ['Tokens per word','tok_per_word',2,'1.4','S6.SS3','ok'],
   ['<i>N</i> of GPT-2 (48, 1600)','N_48_1600',2,'1.5B ("the (48, 1600) model")','S3.F5','ok'],
   ['Kaplan\'s optimal <i>N</i> at 10<sup>21</sup> FLOPs (<i>C</i><sub>min</sub> = <i>C</i>/2)','kaplan_N_1e21',3,'4.68 billion (Chinchilla, Appendix D.4)','','ok'],
   ['GPT-3 training compute 6 × 175B × 300B','gpt3_C',3,'3.14 × 10<sup>23</sup> (GPT-3, Appendix D)','','ok']];
  let h='<thead><tr><th>Quantity</th><th>Recomputed</th><th>Formula</th><th>Paper</th><th></th></tr></thead><tbody>',no='';
  rows.forEach(r=>{const e=RC[r[1]];let v;if(r[1].startsWith('cross_')){v=sci(e.v.C,1)+' PF-days, L = '+e.v.L.toFixed(2)}else v=f(r[1],r[2]);
    const st=r[5]==='ok'?'<td class="okc">reproduces</td>':r[5]==='no'?'<td class="noc">does not</td>':'<td class="mid">partly</td>';
    h+='<tr><td>'+r[0]+'</td><td class="num">'+v+'</td><td class="small mute">'+e.how+'</td><td>'+(r[4]?ax(r[4])+r[3]+'</a>':r[3])+'</td>'+st+'</tr>';
    if(r[6])no+='<li>'+r[6]+'</li>'});
  $('t9T').innerHTML=h+'</tbody>';$('t9N').innerHTML=no;
  dEx=1600;onTab('t-tables',()=>{t1();t6()});
})();
