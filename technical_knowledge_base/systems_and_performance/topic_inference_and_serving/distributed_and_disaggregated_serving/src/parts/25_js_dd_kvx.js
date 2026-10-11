// ---- Reading: KV cache transfer per request (window.DDC.kvmods, links, prefill_ms) ----
(function(){
  const C=window.DDC,el=document.getElementById('dd-kvx');if(!el||!C)return;
  const m=document.getElementById('dd-kvx-m'),p=document.getElementById('dd-kvx-p'),pv=document.getElementById('dd-kvx-pv'),out=document.getElementById('dd-kvx-out');
  C.kvmods.forEach(k=>m.insertAdjacentHTML('beforeend','<option value="'+k.k+'"'+(k.k==='l70'?' selected':'')+'>'+RD.esc(k.name)+'</option>'));
  const PS=[500,1000,2000,4000,8000,16000,32000];
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?0:d});
  function go(){
    const k=C.kvmods.find(z=>z.k===m.value),P=PS[+p.value],by=k.kv_tok*P;pv.textContent=fmt(P)+' tokens';
    const sz=by>=2**30?fmt(by/2**30,2)+' GiB':fmt(by/2**20,0)+' MiB';
    let h='<div class="tw"><table class="dd-tbl"><tr><th>Link</th><th class="num">Transfer</th>'+(k.k==='l70'?'<th class="num">Share of the prefill</th>':'')+'</tr>';
    C.links.forEach(l=>{const ms=by/l.Bps*1e3;h+='<tr><td>'+RD.esc(l.name)+'</td><td class="num">'+(ms<10?fmt(ms,1):fmt(ms))+' ms</td>'+(k.k==='l70'?'<td class="num">'+fmt(100*ms/C.prefill_ms[String(P)]||0,1)+'%</td>':'')+'</tr>'});
    h+='</table></div>';
    const pre=k.k==='l70'&&C.prefill_ms[String(P)]?'<p class="small">Prefill of '+fmt(P)+' tokens on one H200 (Capacity planner model): '+fmt(C.prefill_ms[String(P)])+' ms.</p>':'';
    out.innerHTML='<div class="dd-five">'+RD.stat('KV per token',fmt(k.kv_tok/1024,1)+' KiB',k.L+' layers')+RD.stat('Cache to move',sz,fmt(P)+' tokens')+'</div>'+h+pre;
  }
  m.addEventListener('change',go);p.addEventListener('input',go);go();
})();
