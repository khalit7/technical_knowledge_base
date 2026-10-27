// ---- The figures-rebuilt tab: tables from tables.json and inputs/recompute.json ----
(function(){
  if(!window.PAPER||!$('t-tables'))return;
  const TB=PAPER.tables,RC=PAPER.rc,f1=(v,d)=>v==null?'':(+v).toFixed(d==null?1:d),pm=(v,e,d)=>f1(v,d)+(e!=null?' ± '+f1(e,d):'');
  const tbl=(head,rows,num)=>'<div class="tw"><table><thead><tr>'+head.map((h,i)=>'<th'+(num&&num[i]?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(num&&num[i]?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  // claims
  $('tbClaimsOut').innerHTML='<ul class="chk">'+RC.claims.map(c=>'<li><span class="vd '+(c.new?'mid':c.holds?'ok':'no')+'">'+(c.new?'not in the text':c.holds?'holds':'does not hold as written')+'</span> '+c.claim[0].toUpperCase()+c.claim.slice(1)+'. <span class="small mute">'+c.detail+'.</span></li>').join('')+'</ul>';
  // Figure 1
  const base=TB.F1.scatter.find(s=>s.config==='untrained baseline');
  $('tbF1Out').innerHTML=tbl(['setting','LR','task accuracy (%)','OOD score (%)','OOD change','sparsity (%)'],
    ['OnPD F-KL','OnPD R-KL','OffPD F-KL','OffPD R-KL'].flatMap(k=>['1e-5','5e-5'].map(l=>{const b=TB.F1.bars_id.find(x=>x.config===k&&x.lr===l),s=TB.F1.bars_sparsity.find(x=>x.config===k&&x.lr===l);
      const o=TB.F1.scatter.filter(x=>x.config===k).sort((a,c)=>Math.abs(a.id-b.value)-Math.abs(c.id-b.value))[0];
      return [k,l==='1e-5'?'10⁻⁵':'5×10⁻⁵',pm(b.value,b.sem,2),pm(o.ood,o.sem_ood,2),(o.ood-base.ood>0?'+':'')+(o.ood-base.ood).toFixed(2),pm(s.value,s.sem,2)]})).concat([['untrained student','','',pm(base.ood,base.sem_ood,2),'','']]),[0,0,1,1,1,1]);
  // Figure 3
  (function(){let m=0;const draw=()=>{const P=TB.F3[m],ks=['forward 1e-5','forward 5e-5','reverse 1e-5','reverse 5e-5'];
    $('tbF3Out').innerHTML=tbl(['λ'].concat(ks.map(k=>k.replace('1e-5','10⁻⁵').replace('5e-5','5×10⁻⁵'))),P[ks[0]].map((r,i)=>[(r[0]>0?'+':'')+(r[0]+0).toFixed(1)].concat(ks.map(k=>pm(P[k][i][1],P[k][i][2],2)))),[1,1,1,1,1])};
    segBind('tbF3M',v=>{m=+v;draw()});draw()})();
  // Figure 5
  (function(){const g=n=>TB.F5.find(p=>p.panel===n).rows_lambda_p1_sem_p10_sem,ns=['Countdown-3 forward','Countdown-3 reverse','Countdown-4E forward','Countdown-4E reverse'];
    $('tbF5Out').innerHTML=tbl(['λ'].concat(ns.flatMap(n=>[n.replace('Countdown-','CD-')+' p@1',n.replace('Countdown-','CD-')+' p@10'])),g(ns[0]).map((r,i)=>[(r[0]>0?'+':'')+(r[0]+0).toFixed(1)].concat(ns.flatMap(n=>{const x=g(n)[i];return [f1(x[1],1),f1(x[3],1)]}))),[1,1,1,1,1,1,1,1,1])})();
  // Table 2
  $('tbT2Out').innerHTML=tbl(['teacher','dataset','accuracy (%)','response length (tokens)'],TB.t2.map(r=>[r[0],r[1],r[2],r[3]+' ± '+r[4]]),[0,0,1,1]);
  // A.12
  $('tbA12Out').innerHTML=tbl(['KL','rollouts','LR','original (%)','swapped (%)','change'],TB.a12.map(r=>[r[0],r[1],r[2].replace('1e-5','10⁻⁵').replace('5e-5','5×10⁻⁵'),r[3],r[4],((r[4]-r[3])>0?'+':'')+(r[4]-r[3]).toFixed(1)]),[0,0,0,1,1,1]);
  // Table 6
  const t=RC.t6,sci=v=>v==null?'not disclosed':(v/Math.pow(10,Math.floor(Math.log10(v)))).toFixed(1).replace('.0','')+' × 10'+sup(Math.floor(Math.log10(v)));
  $('tbT6Out').innerHTML=tbl(['stage','checkpoint','method','learning rate'],TB.t6.map(r=>[r[0],r[1],r[2],r[3]?sci(+r[3]):'not disclosed']),[0,0,0,1])
    +'<p class="small">Recomputed: SFT mean '+sci(t.sft_mean)+', median '+sci(t.sft_median)+'; RL and preference (nine with a disclosed rate) mean '+sci(t.rl_mean)+', median '+sci(t.rl_median)+'. The medians differ by a factor of '+t.ratio_median.toFixed(0)+', matching the paper\'s note.</p>';
})();
