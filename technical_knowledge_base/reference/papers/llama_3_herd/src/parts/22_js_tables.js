// ---- The paper's tables, rebuilt ----
(function(){if(!$('t2Tab'))return;
  // Table 2 by size class, with intervals
  function t2(){const T=TB.t2,cls=+$('t2C').value,mark=$('t2I').checked,idx=T.models.map((m,i)=>i).filter(i=>T.size_class[i]===cls),llama=idx.find(i=>T.models[i].startsWith('Llama'));
    let s='<div class="tw"><table class="t2"><thead><tr><th>Benchmark</th>'+idx.map(i=>'<th class="num">'+T.models[i]+'</th>').join('')+'</tr></thead><tbody>';
    T.rows.forEach(r=>{const vals=idx.map(i=>num(r.v[i])),best=Math.max(...vals.filter(v=>v!=null)),lv=num(r.v[llama]),lc=ciFor(r.bench,T.models[llama],lv);
      s+='<tr><td>'+r.bench+'</td>'+idx.map((i,j)=>{const v=vals[j];let cl='num';
        if(mark&&i!==llama&&v!=null&&lv!=null&&lc){const oc=ciFor(r.bench,T.models[i],v),h=Math.sqrt(lc.h**2+(oc?oc.h:lc.h)**2);if(Math.abs(v-lv)<=h)cl+=' in'}
        const ci=i===llama&&lc?' <span class="small mute">±'+lc.h.toFixed(1)+'</span>':'';
        return '<td class="'+cl+'">'+(v===best?'<b>'+r.v[i]+'</b>':r.v[i])+ci+'</td>'}).join('')+'</tr>'});
    $('t2Tab').innerHTML=s+'</tbody></table></div>'}
  ['t2C','t2I'].forEach(i=>$(i).addEventListener('input',t2));t2();
  // Figure 17
  (function(){let s='<div class="tw"><table><thead><tr><th>Capability</th>'+Object.keys(TB.f17.panels).map(k=>'<th class="num">vs '+k+'</th>').join('')+'</tr></thead><tbody>';
    const rows=TB.f17.panels['GPT-4o'].map(r=>r.row);
    rows.forEach((name,i)=>{s+='<tr><td>'+name+'</td>'+Object.values(TB.f17.panels).map(P=>{const r=P[i],sep=r.win_ci[1]<r.loss_ci[0]||r.loss_ci[1]<r.win_ci[0],d=r.win-r.loss;
      return '<td class="num">'+r.win.toFixed(1)+' / '+r.loss.toFixed(1)+' <span class="flag '+(sep?(d>0?'g':'b'):'')+'">'+(sep?(d>0?'win':'loss'):'tie')+'</span></td>'}).join('')+'</tr>'});
    const cnt=P=>{let w=0,l=0,t=0;P.forEach(r=>{const sep=r.win_ci[1]<r.loss_ci[0]||r.loss_ci[1]<r.win_ci[0];if(!sep)t++;else if(r.win>r.loss)w++;else l++});return w+(w===1?' win, ':' wins, ')+t+(t===1?' tie, ':' ties, ')+l+(l===1?' loss':' losses')};
    s+='<tr><td><b>Separated</b></td>'+Object.values(TB.f17.panels).map(P=>'<td class="num"><b>'+cnt(P)+'</b></td>').join('')+'</tr>';
    $('t17Tab').innerHTML=s+'</tbody></table></div><p class="small mute">Cells: win % / loss % of the 405B.</p>'})();
  // Table 3 with the recount
  (function(){const P=RC.params,M=['8B','70B','405B'];let s='<div class="tw"><table><thead><tr><th></th>'+M.map(m=>'<th class="num">'+m+'</th>').join('')+'</tr></thead><tbody>';
    TB.t3.rows.forEach(r=>{s+='<tr><td>'+r[0]+'</td>'+(r[1].length===1?'<td class="num" colspan="3">'+latexLR(r[1][0])+'</td>':r[1].map(v=>'<td class="num">'+latexLR(v)+'</td>').join(''))+'</tr>'});
    const row=(n,f)=>'<tr><td>'+n+'</td>'+M.map(m=>'<td class="num">'+f(P[m])+'</td>').join('')+'</tr>';
    s+=row('<i>Attention per layer</i>',p=>bil(p.attn_per_layer))+row('<i>Feed-forward per layer</i>',p=>bil(p.mlp_per_layer))+row('<i>Embedding + output</i>',p=>bil(p.embed_and_head))+row('<b>Parameters, recounted</b>',p=>'<b>'+pB(p.total)+'</b>')+row('<i>KV cache per token, BF16</i>',p=>fmt(p.kv_bytes_per_token_bf16/1024)+' KiB');
    $('t3Tab').innerHTML=s+'</tbody></table></div>'})();
  // Table 4 checked
  (function(){let s='<div class="tw"><table><thead><tr>'+TB.t4.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">TP×CP×PP×DP</th><th class="num">Tokens/batch</th><th class="num">MFU recomputed</th></tr></thead><tbody>';
    TB.t4.rows.forEach((r,i)=>{const c=RC.t4[i];s+='<tr>'+r.map(v=>'<td class="num">'+v+'</td>').join('')+'<td class="num up">'+fmt(c.product)+'</td><td class="num up">'+fmt(c.tokens_per_batch)+'</td><td class="num '+(Math.abs(c.mfu_recomputed-c.mfu_stated)>0.5?'dn':'up')+'">'+c.mfu_recomputed.toFixed(1)+'%</td></tr>'});
    $('t4Tab').innerHTML=s+'</tbody></table></div>'})();
  // Table 5 checked
  (function(){let s='<div class="tw"><table><thead><tr><th>Component</th><th>Category</th><th class="num">Count</th><th class="num">Printed %</th><th class="num">Count / 419</th></tr></thead><tbody>';
    TB.t5.rows.forEach(r=>{const p=+r[2]/419*100,bad=Math.abs(p-num(r[3]))>0.06;s+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num '+(bad?'dn':'up')+'">'+p.toFixed(1)+'%</td></tr>'});
    s+='<tr><td><b>Total</b></td><td></td><td class="num"><b>'+RC.t5.sum_counts+'</b></td><td class="num dn"><b>'+RC.t5.sum_pct.toFixed(1)+'%</b></td><td class="num"><b>100.0%</b></td></tr>';
    $('t5Tab').innerHTML=s+'</tbody></table></div>'})();
  // Tables 6 and 7
  (function(){const h=(t,cols)=>'<div class="stkt">'+t+'</div><div class="tw"><table><thead><tr>'+cols.map((c,i)=>'<th'+(i?' class="num"':'')+'>'+c+'</th>').join('')+'</tr></thead><tbody>';
    let s=h('Table 6: human preference data',TB.t6.cols);TB.t6.rows.forEach(r=>{s+='<tr>'+r.map((v,i)=>'<td'+(i?' class="num"':'')+'>'+v+'</td>').join('')+'</tr>'});s+='</tbody></table></div>';
    s+=h('Table 7: SFT data',TB.t7.cols.concat(['SFT tokens (derived)']));TB.t7.rows.forEach(r=>{const tk=RC.t7_token_share[r[0]];s+='<tr>'+r.map((v,i)=>'<td'+(i?' class="num"':'')+'>'+v+'</td>').join('')+'<td class="num">'+(tk!=null?tk.toFixed(1)+'%':'100%')+'</td></tr>'});
    $('t67Tab').innerHTML=s+'</tbody></table></div>';setH('t7avg',fmt(RC.t7_weighted_tokens,1))})();
  // Table 15
  (function(){let s='<div class="tw"><table><thead><tr>'+TB.t15.cols.map((c,i)=>'<th'+(i?' class="num"':'')+'>'+c+'</th>').join('')+'</tr></thead><tbody>';
    TB.t15.rows.forEach(r=>{const g=num(r[4]);s+='<tr>'+r.map((v,i)=>'<td'+(i?' class="num'+(i>1&&num(v)!=null&&num(v)>=5?' dn':'')+'"':'')+'>'+v+'</td>').join('')+'</tr>'});
    $('t15Tab').innerHTML=s+'</tbody></table></div><p class="small mute">Red: an estimated gain of 5 points or more.</p>'})();
  // Table 21 with implied N
  (function(){const T=TB.t21;let s='<div class="tw"><table><thead><tr><th>Model</th>'+T.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
    T.rows.forEach(r=>{s+='<tr><td>'+r[0]+'</td>'+r.slice(1).map((c,ci)=>{const v=num(c[0]),h=c[1]!=null?+c[1]:null;const n=[0,4].includes(ci)&&v!=null&&h&&v<100?Math.round(1.96**2*(v/100)*(1-v/100)/(h/100)**2):null;return '<td class="num">'+c[0]+(h!=null?' <span class="small mute">±'+h+'</span>':'')+(n?'<br><span class="small mute">N≈'+fmt(n)+'</span>':'')+'</td>'}).join('')+'</tr>'});
    $('t21Tab').innerHTML=s+'</tbody></table></div>'})();})();
