// ---- The paper's tables, rebuilt ----
onTab('t-tables',function(){if(window.__tbDone)return;window.__tbDone=1;
  const AXL=(at,t)=>A(PAPER.meta.ax+'#'+at,t);
  const WL=at=>{let m;if((m=at.match(/^[SA]\d+\.T(\d+)$/)))return 'Table '+(at==='A4.T5'?5:at==='A5.T6'?6:m[1]);if((m=at.match(/^S\d+\.F(\d+)$/)))return 'Figure '+m[1];if(at==='A3.SS3')return 'App. C.3';if(at==='A4.SS1')return 'App. D.1';if((m=at.match(/^A1\.SS(\d+)$/)))return 'App. A.'+m[1];return '§'+at.replace(/^S/,'').replace(/\.SS/,'.')};
  // Table 1
  (function(){let mode='v';const R=TB.t1.rows,cols=TB.t1.cols.concat(['OOD avg. (this page)']);
    const rows=R.map(r=>{const v=r.slice(1).map(Number);return [r[0]].concat(v,[(v[2]+v[3]+v[4])/3])});const h0=rows[0];
    function draw(){const best=cols.map((c,j)=>Math.max(...rows.map(r=>r[j+1])));
      let h='<table><thead><tr><th>Method</th>'+cols.map((c,j)=>'<th class="num">'+c+(j<2?'<br><span class="mute small">in distribution</span>':j<5?'<br><span class="mute small">out of distribution</span>':'')+'</th>').join('')+'</tr></thead><tbody>';
      rows.forEach((r,i)=>{h+='<tr'+(r[0].startsWith('RRSI')?' style="background:var(--acc2)"':'')+'><td>'+r[0]+'</td>'+r.slice(1).map((v,j)=>{const d=v-h0[j+1];const txt=mode==='v'||i===0?(j===5?v.toFixed(2):v.toFixed(1)):(d>=0?'+':'−')+Math.abs(d).toFixed(j===5?2:1);
        return '<td class="num"'+(mode==='d'&&i>0&&d<0?' style="color:var(--bad)"':'')+'>'+(v===best[j]?'<b>'+txt+'</b>':txt)+'</td>'}).join('')+'</tr>'});
      $('tb1T').innerHTML=h+'</tbody></table>'}
    segBind('tb1M',m=>{mode=m;draw()});draw()})();
  // Table 2
  (function(){const R=TB.t2.rows,h0=R[0].slice(1).map(Number);let h='<table><thead><tr><th>Variant</th>'+TB.t2.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
    R.forEach((r,i)=>{h+='<tr'+(r[0]==='RRSI'?' style="background:var(--acc2)"':'')+'><td>'+r[0]+'</td>'+r.slice(1).map((v,j)=>{const d=+v-h0[j];return '<td class="num">'+v+(i?'<br><span class="mute small">'+(d>=0?'+':'−')+Math.abs(d).toFixed(j===3?2:1)+(j===3?' (× '+(+v/h0[3]).toFixed(2)+')':'')+'</span>':'')+'</td>'}).join('')+'</tr>'});
    $('tb2T').innerHTML=h+'</tbody></table>'})();
  // Tables 3 and 4 with the whole-trial check
  (function(){const cnt=(v,n)=>{const k=Math.round(v/100*n);return Math.round(k/n*1000)/10===v?k+' / '+n:'<span class="no">not k / '+n+'</span>'};
    let h='<table><thead><tr><th>Policy</th><th>Benchmark</th><th class="num">H<sub>0</sub></th><th class="num">RRSI</th><th class="num">Δ</th><th class="num">As counts</th></tr></thead><tbody>';
    TB.t3.rows.forEach(r=>{const n=r[1].startsWith('SWE')?500:178;h+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td><td class="num">'+cnt(+r[2],n)+', '+cnt(+r[3],n)+'</td></tr>'});
    TB.t4.rows.forEach(r=>{h+='<tr><td>'+r[0]+'</td><td>Terminal-Bench 2.1 (Table 4)</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+cnt(+r[1],178)+', '+cnt(+r[2],178)+'</td></tr>'});
    $('tb3T').innerHTML=h+'</tbody></table><p class="small">Relative gain for the unseen Flash Lite: 3.4 / 11.2 = '+(3.4/11.2*100).toFixed(1)+'% (paper: 30.4%). The Opus champion is logged at '+RC.runs.coding_opus.end+' / 178 = '+(RC.runs.coding_opus.end/1.78).toFixed(1)+'% in the released record.</p>'})();
  // Table 5 plus the within-band weights from the repository, and every round's budget
  (function(){let h='<table><thead><tr>'+TB.t5.cols.map((c,j)=>'<th'+(j>1?' class="num"':'')+'>'+c+'</th>').join('')+'</tr></thead><tbody>';
    TB.t5.rows.forEach(r=>{h+='<tr><td class="mono">'+r[0]+'</td><td>'+r[1]+'</td>'+r.slice(2).map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>'});
    [['w_s','within-band score weight','0','1414','244'],['w_c','within-band token weight','15','15','2'],['w_n','within-band novelty weight','0.5','0.5','0.5']].forEach(r=>{h+='<tr style="color:var(--mute)"><td class="mono">'+r[0]+'</td><td>'+r[1]+' (repository config, not in Table 5)</td>'+r.slice(2).map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>'});
    $('tb5T').innerHTML=h+'</tbody></table>';
    $('tb5B').innerHTML='<table><thead><tr><th>Instance</th><th>Edit budget b<sub>t</sub> for t = 0, 1, ..., T − 1 (Eq. 4)</th></tr></thead><tbody>'+Object.entries(RC.budgets).map(([k,v])=>'<tr><td>'+k+'</td><td class="mono" style="overflow-wrap:anywhere">'+v.join(' ')+'</td></tr>').join('')+'</tbody></table>'})();
  // Table 6 against the records
  (function(){const recs=[['coding_opus','r0A'],['coding_opus','r0B'],['coding_opus','r8B'],['eng','it2']];
    let h='<table class="t3"><thead><tr><th>Domain / round</th><th class="chg">Change</th><th class="chg">Printed outcome</th><th class="chg">Released record</th></tr></thead><tbody>';
    TB.t6.rows.forEach((r,i)=>{const [rid,cid]=recs[i],c=RUN[rid].c.find(x=>x.id===cid);h+='<tr><td>'+r[0]+'<br><span class="mute small">'+cid+'</span></td><td class="chg">'+esc(r[1])+'</td><td class="chg">'+esc(r[2])+'</td><td class="chg">'+esc(c.why)+'</td></tr>'});
    $('t6T').innerHTML=h+'</tbody></table><p class="small mute">'+AXL('A5.T6','Table 6')+'. R0-B is "rejected by cost rule" with a gain of +1.69 points, which is inside the run\'s band, so the within-band rule (Eq. 17, <i>w</i><sub>s</sub> = 0) decided it; under Eq. 7 its 26.1% would have been allowed. R8-B is below the floor at the run\'s δ of 0.034 and at Table 5\'s 0.017 alike.</p>'})();
  // Noise bars
  (function(){const N=RC.noise,mx=15;let h='';N.forEach(n=>{const sel=/evolve/.test(n.b);h+='<div class="row"><div class="nm" title="'+n.n+'">'+n.b+'</div><div class="track"><div class="fill" style="width:'+(n.d/mx*100)+'%;background:'+(sel?CO:CB)+';opacity:'+(sel?.6:1)+'"></div>'+(n.se?'<div class="se" style="left:0;width:'+(n.se/mx*100)+'%"></div>':'')+'</div><div class="val">+'+n.d.toFixed(1)+(n.se?' <span class="mute">± '+n.se.toFixed(1)+'</span>':'')+'</div></div>'});
    $('noiseB').innerHTML=h+'<p class="small">z = gain / standard error: '+N.filter(n=>n.z!=null).map(n=>n.b+' '+n.z.toFixed(2)).join('; ')+'. Frontier-Eng and JobBench: '+N.filter(n=>n.z==null).map(n=>n.n).join('; ')+'.</p>'})();
  // Every check
  (function(){let f='all';function draw(){const C=RC.checks.filter(c=>f==='all'||!c.ok);
    $('chkT').innerHTML='<p class="small">'+RC.checks.filter(c=>c.ok).length+' of '+RC.checks.length+' checks reproduce; '+RC.checks.filter(c=>!c.ok).length+' do not.</p><table class="t3"><thead><tr><th class="chg">Claim</th><th>Where</th><th class="chg">Printed</th><th class="chg">Recomputed</th><th>Verdict</th></tr></thead><tbody>'+
      C.map(c=>'<tr><td class="chg">'+esc(c.claim)+(c.note?'<br><span class="mute small">'+esc(c.note)+'</span>':'')+'</td><td>'+(/^(S|A)\d/.test(c.where)?AXL(c.where,WL(c.where)):c.where)+'</td><td class="chg">'+esc(c.printed)+'</td><td class="chg">'+esc(c.recomputed)+'</td><td>'+(c.ok?'<span class="ok">reproduces</span>':'<span class="no">does not</span>')+'</td></tr>').join('')+'</tbody></table>'}
    segBind('chkM',m=>{f=m;draw()});draw()})();
});
