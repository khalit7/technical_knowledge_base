// ---- Fit and speed tab (t-fit). Data: LO.models (the parent's planner), LO.hw, LO.fitcfg (gen_data.py) ----
(function(){
  const tab=document.getElementById('t-fit');if(!tab||!window.LO||!LO.models||!LO.fitcfg)return;
  const $=id=>document.getElementById(id),C=LO.fitcfg,CTX=[2048,4096,8192,16384,32768,65536,131072,262144];
  const fill=(el,arr)=>{el.innerHTML=arr.map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join('')};
  fill($('lo-fit-hw'),LO.hw.map(h=>[h.k,h.name]));
  fill($('lo-fit-m'),LO.models.map(m=>[m.k,m.name]));
  fill($('lo-fit-q'),C.quants.map((q,i)=>[i,q.name]));
  fill($('lo-fit-e'),C.effs.map((e,i)=>[i,e.name]));
  $('lo-fit-m').value='q4';$('lo-fit-q').value=String(C.quants.findIndex(q=>q.def));
  const gb=v=>v>=100?Math.round(v)+' GB':v>=10?v.toFixed(1)+' GB':v.toFixed(2)+' GB';
  const fmtCtx=v=>v>=1024?(v/1024)+'K':String(v);
  function calc(){
    const h=LO.hw.find(x=>x.k===$('lo-fit-hw').value),m=LO.models.find(x=>x.k===$('lo-fit-m').value),q=C.quants[+$('lo-fit-q').value];
    const kvb=+$('lo-fit-kv').value,ctx=CTX[+$('lo-fit-c').value],U=+$('lo-fit-u').value,eff=C.effs[+$('lo-fit-e').value].v,split=$('lo-fit-sp').value;
    const bpw=q.native?null:q.bpw;
    const wBytes=q.native?m.native_gb*1e9:m.Pg*bpw/8;
    const readW=q.native?m.native_gb*1e9*(m.Pact/m.P):m.Pact*bpw/8; // bytes of weights read per token (active parameters)
    const kvTok=m.kv_tok_f16*kvb/16;
    const kvAll=kvTok*ctx*U;
    const margin=h.kind==='gpu'?C.gpu_margin*(h.n||1):0, compute=C.compute_gb*1e9;
    const usable=h.kind==='mac'?h.mem*1e9*C.mac_ws_frac:h.kind==='gpu'?h.mem*1e9-margin:h.mem*1e9*C.mac_ws_frac;
    const need=wBytes+kvAll+compute;
    const fits=need<=usable;
    // one decode step: weights read once for all users, plus every user's KV at mean position ctx/2
    const bw=h.bw*1e9*((h.n===2&&split==='tensor')?2:1)*eff;
    const stepBytes=readW+kvTok*(ctx/2)*U;
    const perUser=bw/stepBytes, agg=perUser*U;
    // prefill: only where a calibration point exists
    const pf=C.prefill[h.k];const ttft=pf?2*m.Pact*Math.min(ctx,8192)/pf.flops:null;
    $('lo-fit-cv').textContent=fmtCtx(ctx)+' tokens';
    $('lo-fit-v').innerHTML=fits?'<span class="ok">Fits</span>: '+gb(need/1e9)+' of '+gb(usable/1e9)+' usable':'<span class="no">Does not fit</span>: needs '+gb(need/1e9)+', '+gb(usable/1e9)+' usable'+(m.moe?' (a mixture of experts can keep experts in system RAM: <code>--n-cpu-moe</code>, slower)':' (fewer bits, shorter context, or a bigger machine)');
    // bar
    const el=$('lo-fit-svg'),W=Math.max(300,Math.min(860,RD.width(el))),H=74,L=8,R=8;
    const mx=Math.max(need,usable,h.mem*1e9)*1.04,X=v=>L+(W-L-R)*v/mx;
    let b='',x0=L;[[wBytes,'var(--c1)','weights'],[kvAll,'var(--c3)','KV cache'],[compute,'var(--c5)','buffers']].forEach(([v,c,n])=>{const w=X(v)-L;b+='<rect x="'+x0.toFixed(1)+'" y="16" width="'+Math.max(0,w).toFixed(1)+'" height="24" fill="'+c+'"/>';if(w>60)b+=RD.t(x0+4,32,n,{fs:10.5,fill:'var(--bg)'});x0+=w});
    b+='<line x1="'+X(usable)+'" x2="'+X(usable)+'" y1="8" y2="48" stroke="var(--bad)" stroke-width="2"/>'+RD.t(Math.min(X(usable),W-R-4),60,'usable '+gb(usable/1e9),{a:X(usable)>W-120?'end':'middle',fs:10.5,fill:'var(--bad)'});
    b+='<line x1="'+X(h.mem*1e9)+'" x2="'+X(h.mem*1e9)+'" y1="8" y2="48" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(Math.min(X(h.mem*1e9),W-R-2),8,'installed '+h.mem+' GB',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'memory');
    $('lo-fit-out').innerHTML=RD.stat('weights',gb(wBytes/1e9),q.native?'as released':bpw.toFixed(2)+' bits per weight &times; '+(m.Pg/1e9).toFixed(1)+'B')+
      RD.stat('KV cache',gb(kvAll/1e9),(kvTok/1024).toFixed(0)+' KiB per token &times; '+fmtCtx(ctx)+' &times; '+U)+
      RD.stat('generation, per user','~'+(perUser>=100?Math.round(perUser):perUser.toFixed(1))+' tok/s',gb(stepBytes/1e9)+' read per step at '+Math.round(bw/1e9)+' GB/s effective')+
      (U>1?RD.stat('all users together','~'+Math.round(agg)+' tok/s','one read of the weights serves '+U):'')+
      RD.stat('prompt of '+fmtCtx(Math.min(ctx,8192))+' tokens',ttft==null?'not calibrated':'~'+(ttft>=10?Math.round(ttft):ttft.toFixed(1))+' s',ttft==null?'no measured point for this machine':pf.src);
    $('lo-fit-note').innerHTML='Reads per token: the active weights ('+(m.Pact/1e9).toFixed(1)+'B parameters'+(m.moe?' of '+(m.P/1e9).toFixed(0)+'B: a mixture of experts reads only the routed experts':'')+') plus the KV cache up to the current position (mean '+fmtCtx(ctx/2)+'). Margin: '+(h.kind==='gpu'?'llama.cpp\'s --fit leaves 1,024 MiB per GPU, plus about '+C.compute_gb+' GB of compute buffers.':'Metal\'s recommended working set ('+Math.round(C.mac_ws_frac*100)+'% of memory on this laptop), less about '+C.compute_gb+' GB of buffers.')+' Bandwidth: '+h.bw+' GB/s, <a href="'+h.src+'" target="_blank" rel="noopener noreferrer">source</a>.'+(h.bwnote?' ('+h.bwnote+')':'')+(h.n===2?' Two cards: memory '+h.mem+' GB in total; '+(split==='tensor'?'tensor split assumes both cards read at once and ignores the PCIe exchange: an upper bound.':'layer split: each token passes card 1 then card 2, so one user sees one card\'s bandwidth.'):'');
  }
  ['lo-fit-hw','lo-fit-m','lo-fit-q','lo-fit-kv','lo-fit-u','lo-fit-e','lo-fit-sp'].forEach(id=>$(id).addEventListener('change',calc));
  $('lo-fit-c').addEventListener('input',calc);
  function check(){
    const rows=C.check||[];if(!rows.length){$('lo-fit-chk').innerHTML='';return}
    $('lo-fit-chk').innerHTML='<p class="small">The rule with the measured efficiency ('+Math.round(C.effs[0].v*100)+'% of 200 GB/s, from the fastest file) against each measured file on this laptop, short context:</p><div class="tw"><table><thead><tr><th>File</th><th class="num">GB read</th><th class="num">predicted tok/s</th><th class="num">measured tok/s</th><th class="num">measured / predicted</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r.name+'</td><td class="num">'+r.gb.toFixed(2)+'</td><td class="num">'+r.pred.toFixed(0)+'</td><td class="num">'+r.meas.toFixed(1)+'</td><td class="num">'+(r.meas/r.pred*100).toFixed(0)+'%</td></tr>').join('')+'</tbody></table></div><p class="small mute">F16 and Q8_0 reach the line by construction or close to it; the 4-bit and smaller K-quants and i-quants fall short because unpacking them costs arithmetic this GPU does not have to spare at batch 1 (section 1). On GPUs with far more arithmetic per byte, such as the RTX 5090, small types come much closer to the line (64% for Q4_0 on the scoreboard, section 8).</p>';
  }
  function all(){calc();check()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-fit']=window.TAB_RENDER['t-fit']||[]).push(all);
  let rt=0;addEventListener('resize',()=>{if(tab.hidden)return;clearTimeout(rt);rt=setTimeout(calc,80)});
})();
