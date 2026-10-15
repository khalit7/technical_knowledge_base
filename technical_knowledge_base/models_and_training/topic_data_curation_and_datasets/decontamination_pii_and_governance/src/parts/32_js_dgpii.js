// ---- PII detector lab (t-dgpii) ----
(function(){
  const E=RD.esc,$=id=>document.getElementById(id),P=DG.pii;if(!P||!$('pl-rows'))return;
  const NOT_ID={DATE_TIME:1,URL:1,NRP:1};
  let det='datatrove';
  const short={EMAIL_ADDRESS:'EMAIL',PHONE_NUMBER:'PHONE',IP_ADDRESS:'IP',CREDIT_CARD:'CARD',IBAN_CODE:'IBAN',US_SSN:'ID',US_PASSPORT:'ID',UK_NINO:'ID',US_DRIVER_LICENSE:'ID',US_BANK_NUMBER:'ID'};
  function spans(r){const th=+$('pl-th').value,ids=$('pl-ty').value==='ids';
    return (r.det[det]||[]).filter(x=>det!=='presidio'||(x.p>=th&&!(ids&&x.t.split('/').every(t=>NOT_ID[t]))))}
  const ov=(a,b)=>a.s<b.e&&b.s<a.e;
  function render(){
    $('pl-thv').textContent=(+$('pl-th').value).toFixed(2);
    const pres=det==='presidio';$('pl-th').disabled=!pres;$('pl-ty').disabled=!pres;
    const masked=$('pl-view').value==='masked';
    let found={},tot={},fa=0,faN=0,h='';
    P.rows.forEach(r=>{const sp=spans(r);
      r.gold.forEach(g=>{tot[g.t]=(tot[g.t]||0)+1;if(sp.some(x=>ov(x,g)))found[g.t]=(found[g.t]||0)+1});
      sp.forEach(x=>{if(!r.gold.some(g=>ov(x,g)))fa++});
      // build marked text: boundaries from gold and spans
      const cuts=new Set([0,r.text.length]);r.gold.concat(sp).forEach(x=>{cuts.add(x.s);cuts.add(x.e)});
      const cs=[...cuts].sort((a,b)=>a-b);let s='';
      if(masked){let pos=0;sp.slice().sort((a,b)=>a.s-b.s).forEach(x=>{if(x.s<pos)return;s+=E(r.text.slice(pos,x.s))+'<span class="mask">&lt;'+E(short[x.t.split('/')[0]]||x.t.split('/')[0])+'&gt;</span>';pos=x.e});s+=E(r.text.slice(pos))}
      else for(let i=0;i+1<cs.length;i++){const a=cs[i],b=cs[i+1],seg={s:a,e:b};if(a===b)continue;
        const g=r.gold.find(x=>ov(x,seg)),d=sp.find(x=>ov(x,seg));const t=E(r.text.slice(a,b));
        if(g&&d)s+='<span class="hit" title="'+E(g.t)+' found as '+E(d.t)+'">'+t+'</span>';
        else if(g)s+='<span class="miss" title="'+E(g.t)+' missed">'+t+'</span>';
        else if(d)s+='<span class="fa" title="flagged as '+E(d.t)+'">'+t+'</span>';
        else s+=t;
        if(g&&b===g.e)s+='<span class="tg">'+E(g.t)+'</span>'}
      h+='<div class="pl-row"><span class="id">'+r.id+'</span>'+s+(r.neg?'<span class="neg">hard negative: '+E(r.neg)+'</span>':'')+'</div>'});
    $('pl-rows').innerHTML=h;
    const nf=Object.values(found).reduce((a,b)=>a+b,0),nt=Object.values(tot).reduce((a,b)=>a+b,0);
    $('pl-stats').innerHTML=RD.stat('recall',Math.round(100*nf/nt)+'%',nf+' of '+nt+' gold spans')+RD.stat('false alarms',fa,'detections overlapping no gold span')+
      RD.stat('missed types',Object.keys(tot).filter(t=>!found[t]).join(', ')||'none','no span of this type found')+RD.stat('best type',Object.keys(tot).sort((a,b)=>(found[b]||0)/tot[b]-(found[a]||0)/tot[a])[0],'highest recall');
  }
  $('pl-det').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;det=b.dataset.m;$('pl-det').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
  ['pl-th','pl-ty','pl-view'].forEach(id=>$(id).addEventListener('input',render));
  // real text
  (function(){const R=P.real||{},dets=Object.keys(R);if(!dets.length){$('pl-real').innerHTML='<p class="small">Not run yet.</p>';return}
    const types=[...new Set(dets.flatMap(d=>Object.keys(R[d].spans||{})))].sort();
    let h='<div class="tw"><table><thead><tr><th>Detector, set</th>'+types.map(t=>'<th class="num">'+E(t)+'</th>').join('')+'</tr></thead><tbody>';
    dets.forEach(d=>{h+='<tr><td>'+E(d)+'</td>'+types.map(t=>'<td class="num">'+((R[d].spans||{})[t]||'')+'</td>').join('')+'</tr>'});
    $('pl-real').innerHTML=h+'</tbody></table></div><p class="small">Cells: detections (spans). '+E(P.real_note||'')+'</p>'})();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-dgpii']=[render];
  render();
})();
