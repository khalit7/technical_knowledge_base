// ---- Load-test lab: every request of the stall experiment, and the percentiles of every run ----
(function(){
  const root=document.getElementById('t-load');if(!root||!window.PRD||!PRD.co)return;
  const CO=PRD.co,NAME={closed_no:'Closed loop, no stall',closed_yes:'Closed loop, 5 s stall',poisson_no:'Open loop, no stall',poisson_yes:'Open loop, 5 s stall'};
  let cur='closed_yes';
  const seg=document.getElementById('ll-run');seg.innerHTML=Object.keys(NAME).filter(k=>CO.req[k]).map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+NAME[k]+'</button>').join('');
  RD.seg(seg,v=>{cur=v;dots()});
  function dots(){
    const el=document.getElementById('ll-dots'),w=RD.width(el),L=40,h=240,R=CO.req[cur],run=CO.runs[cur].find(r=>r.rep===1);
    const T=Math.max(...Object.values(CO.req).map(a=>Math.max(...a.map(r=>r[0]))))*1.03,x=v=>L+(w-L-10)*v/T,lo=Math.log10(0.1),hi=Math.log10(10),y=v=>10+(h-40)*(1-(Math.log10(Math.max(0.1,Math.min(10,v)))-lo)/(hi-lo));
    let s='';if(run.stall_s)s+='<rect x="'+x(run.stall_s[0])+'" y="10" width="'+(x(run.stall_s[1])-x(run.stall_s[0]))+'" height="'+(h-40)+'" fill="var(--hl)" opacity=".7"/>';
    [0.1,0.3,1,3,10].forEach(v=>{s+='<line x1="'+L+'" x2="'+(w-10)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,v+' s',{a:'end',fs:10,fill:'var(--mute)'})});
    for(let v=0;v<=T;v+=10)s+=RD.t(x(v),h-16,v+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    s+=RD.t(w-10,h-2,'time sent (s); latency end to end (log)',{a:'end',fs:10,fill:'var(--mute)'});
    R.forEach(r=>{s+='<circle cx="'+x(r[0]).toFixed(1)+'" cy="'+y(r[1]).toFixed(1)+'" r="2.6" fill="'+(r[1]>1?'var(--bad)':'var(--c1)')+'" opacity=".8"/>'});
    el.innerHTML=RD.svg(w,h,s,'Latency against send time, '+NAME[cur]);
    document.getElementById('ll-cap').textContent=NAME[cur]+', first repeat: '+R.length+' requests, '+run.over1s+' above one second, median '+run.e2e_p50.toFixed(2)+' s, p99 '+run.e2e_p99.toFixed(2)+' s'+(run.stall_s?'; the shaded band is the freeze, '+run.stall_s[0].toFixed(1)+' to '+run.stall_s[1].toFixed(1)+' s after launch (the generator starts its clock a fraction of a second later, after one warm-up request).':'.');
  }
  function table(){
    let h='<tr><th>Run</th><th class="num">Repeat</th><th class="num">Requests/s achieved</th><th class="num">p50</th><th class="num">p90</th><th class="num">p99</th><th class="num">Max</th><th class="num">Above 1 s</th><th class="num">Sent during the freeze</th></tr>';
    Object.keys(NAME).forEach(k=>(CO.runs[k]||[]).forEach(r=>{
      h+='<tr><td>'+NAME[k]+'</td><td class="num">'+r.rep+'</td><td class="num">'+r.req_s.toFixed(2)+'</td><td class="num">'+r.e2e_p50.toFixed(2)+' s</td><td class="num">'+r.e2e_p90.toFixed(2)+' s</td><td class="num">'+r.e2e_p99.toFixed(2)+' s</td><td class="num">'+r.e2e_max.toFixed(2)+' s</td><td class="num">'+r.over1s+'</td><td class="num">'+(r.sent_in_stall==null?'':r.sent_in_stall)+'</td></tr>';
      if(r.corr)h+='<tr><td class="mute">&nbsp;&nbsp;corrected as wrk2 would <span class="der">derived</span></td><td class="num">'+r.rep+'</td><td class="num"></td><td class="num">'+r.corr.p50.toFixed(2)+' s</td><td class="num">'+r.corr.p90.toFixed(2)+' s</td><td class="num">'+r.corr.p99.toFixed(2)+' s</td><td class="num"></td><td class="num">'+(r.corr.n-r.n)+' added</td><td class="num"></td></tr>'}));
    document.getElementById('ll-tab').innerHTML=h;
    document.getElementById('ll-note').textContent='Latency is end to end (send to last token) as loadgen.py measures it. The correction adds, for each closed-loop sample L above the run\'s normal interval E between one user\'s requests (E = 2 users / the no-stall run\'s requests per second), the samples L-E, L-2E, ... down to E: the requests that user would have sent while waiting (HdrHistogram\'s recordValueWithExpectedInterval, the idea behind wrk2). Machine load average during the runs: about 3 to 4.';
  }
  RD.onRender(()=>{dots();table()},'t-load');RD.onResize(dots,'t-load');
})();
