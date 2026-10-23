// ---- Reading sections 5 to 7 : measured results, with every run in closed blocks (LO.srv, LO.ollama, LO.cpu, LO.q.mlx) ----
(function(){
  if(!window.LO)return;
  const $=id=>document.getElementById(id),f=(v,d)=>v==null?'&ndash;':Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const med=a=>{const s=a.filter(x=>x!=null).slice().sort((x,y)=>x-y);return s.length?(s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2):null};
  const tbl=(head,rows)=>'<div class="tw"><table><thead><tr>'+head.map((h,i)=>'<th'+(i?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const S=LO.srv||{};
  // slots chart (Reading) and table (lab)
  function slots(){
    const el=$('lo-slots-svg');const D=S.slots;if(!D)return;
    const rows=D.map(d=>({np:d.np,tput:med(d.runs.map(r=>r.out_tok_per_s)),tpot:med(d.runs.map(r=>r.tpot_p50))*1000,ttft:med(d.runs.map(r=>r.ttft_p50)),lo:Math.min(...d.runs.map(r=>r.out_tok_per_s)),hi:Math.max(...d.runs.map(r=>r.out_tok_per_s)),load:d.load_before[0]}));
    if(el){const W=Math.max(300,Math.min(860,RD.width(el))),H=W<480?200:220,L=40,R=40,T=16,B=34,n=rows.length,bw=(W-L-R)/n;
      const nice=v=>{const m=Math.pow(10,Math.floor(Math.log10(v)));return [1,2,2.5,5,10].map(k=>k*m).find(k=>k>=v)};
      const ym=nice(Math.max(...rows.map(r=>r.hi))*1.1/4)*4,y2m=nice(Math.max(...rows.map(r=>r.tpot))*1.1/4)*4;
      const Y=v=>T+(H-T-B)*(1-v/ym),Y2=v=>T+(H-T-B)*(1-v/y2m);
      let b='';[0,0.25,0.5,0.75,1].forEach(t=>{const v=ym*t;b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,Math.round(v),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(W-R+4,Y2(y2m*t)+4,Math.round(y2m*t),{fs:10,fill:'var(--c2)'})});
      rows.forEach((r,i)=>{const x=L+bw*i+bw*0.2,w=bw*0.6;b+='<rect x="'+x+'" y="'+Y(r.tput)+'" width="'+w+'" height="'+(Y(0)-Y(r.tput))+'" fill="var(--c1)" opacity=".8"/><line x1="'+(x+w/2)+'" x2="'+(x+w/2)+'" y1="'+Y(r.lo)+'" y2="'+Y(r.hi)+'" stroke="var(--ink)"/>'+RD.t(x+w/2,H-B+14,r.np+(r.np>1?' slots':' slot'),{a:'middle',fs:10.5})});
      b+='<polyline fill="none" stroke="var(--c2)" stroke-width="2" points="'+rows.map((r,i)=>(L+bw*i+bw/2)+','+Y2(r.tpot)).join(' ')+'"/>'+rows.map((r,i)=>'<circle cx="'+(L+bw*i+bw/2)+'" cy="'+Y2(r.tpot)+'" r="4" fill="var(--c2)"/>').join('');
      b+=RD.t(L,T-4,'output tok/s, all users (bars)',{fs:10.5,fill:'var(--c1)'})+RD.t(W-R,T-4,'ms per token, one user (line)',{a:'end',fs:10.5,fill:'var(--c2)'});
      el.innerHTML=RD.svg(W,H,b,'slots sweep');
      $('lo-slots-note').innerHTML='Median of two seeds (whiskers: both). '+rows.map(r=>r.np+' slot'+(r.np>1?'s':'')+': '+f(r.tput,0)+' tok/s, '+f(r.tpot,1)+' ms per token, TTFT '+f(r.ttft,2)+' s').join('; ')+'. More slots batch more users per step: total throughput rises while each user\'s tokens come slower; with one slot, users wait their turn (long TTFT).'}
    if($('lo-sv-slots'))$('lo-sv-slots').innerHTML=tbl(['slots','output tok/s (seeds)','median TTFT s','median ms/token','p90 TTFT s','load before'],D.map(d=>[d.np,d.runs.map(r=>f(r.out_tok_per_s,0)).join(', '),f(med(d.runs.map(r=>r.ttft_p50)),2),f(med(d.runs.map(r=>r.tpot_p50))*1000,1),f(med(d.runs.map(r=>r.ttft_p90)),2),f(d.load_before[0],1)]))+'<p class="small mute">Command: <code>'+RD.esc(D[0].cmd)+'</code>, with -np varied. Load: the parent\'s loadgen.py, closed loop, 8 users, 32 requests, 400-word prompts, 128 tokens.</p>';
  }
  function texts(){
    const put=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
    if(S.unified)put('lo-sv-uni',S.unified.html);
    if(S.ctxshift){put('lo-cs-res',S.ctxshift.summary);put('lo-sv-cs',S.ctxshift.html)}
    if(LO.reuse){put('lo-cr-res','<p class="small"><span class="meas">Measured here</span>: '+LO.reuse.summary+'</p>');put('lo-sv-cr',LO.reuse.html)}
    if(S.router){put('lo-rt-res',S.router.summary);put('lo-sv-rt',S.router.html)}
    if(S.metrics){put('lo-met',S.metrics.html);put('lo-sv-met',S.metrics.full)}
    if(S.defaults)put('lo-sv-def',S.defaults.html);
    if(LO.ollama){put('lo-ol-res',LO.ollama.html);put('lo-ol-note',LO.ollama.note);put('lo-sv-ol',LO.ollama.full)}
    if(LO.cpu)put('lo-sv-cpu',LO.cpu.html);
    if(LO.mlxres){put('lo-mx-res',LO.mlxres.html);put('lo-mx-note',LO.mlxres.note)}
  }
  texts();slots();
  RD.onRender(slots);RD.onResize(slots);
})();
