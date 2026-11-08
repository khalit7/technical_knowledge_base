// ---- Reading, Step 6 (Fig. 2): a back-of-the-envelope estimate, fleet sized for the average against the busy hour (every input illustrative; src/read/recompute.py a6) ----
window.RDSIM=window.RDSIM||{};
RDSIM.E={users:10e6,dau_frac:0.10,msgs_per_dau:10,out_tok:400,in_tok:1000,peak_x:2.0,tok_per_gpu:2000,stream_s:10,bytes_per_msg:2000,headroom:1.2};
RDSIM.A6_SHAPE=[0.4,0.3,0.25,0.25,0.3,0.4,0.55,0.75,0.95,1.1,1.2,1.25,1.25,1.2,1.15,1.15,1.2,1.3,1.45,1.65,1.85,2.0,1.3,0.8];
RDSIM.a6=function(){const E=RDSIM.E,dau=E.users*E.dau_frac,msgs=dau*E.msgs_per_dau,avg=msgs/86400,peak=avg*E.peak_x,ta=avg*E.out_tok,tp=peak*E.out_tok;
  const sd=msgs*2*E.bytes_per_msg/1e9;
  return {dau,msgs,avg_rps:Math.round(avg*10)/10,peak_rps:Math.round(peak*10)/10,tok_avg:Math.round(ta),tok_peak:Math.round(tp),
    gpu_avg:Math.ceil(ta/E.tok_per_gpu),gpu_peak:Math.ceil(tp*E.headroom/E.tok_per_gpu),streams:Math.round(peak*E.stream_s),store_day_gb:Math.round(sd*10)/10,store_year_tb:Math.round(sd*365/1000*10)/10,_ta:ta}};
RDSIM.a6day=function(g){const r=RDSIM.a6(),E=RDSIM.E,capT=g*E.tok_per_gpu,dem=RDSIM.A6_SHAPE.map(s=>s*r._ta);
  return {hours_over:dem.filter(d=>d>capT).length,idle_gpu_hours:Math.round(10*dem.reduce((s,d)=>s+Math.max(0,capT-d),0)/E.tok_per_gpu)/10,dem,capT}};
(function(){
  const svg=document.getElementById('rd-est-svg');if(!svg)return;
  const list=document.getElementById('rd-est-list'),cnt=document.getElementById('rd-est-cnt'),leg=document.getElementById('rd-est-leg');
  let mode='avg';const r=RDSIM.a6(),E=RDSIM.E;const f=n=>Math.round(n).toLocaleString('en-US'),f1=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
  const L=(c,t)=>'<span style="--sw:var('+c+')">'+t+'</span>';
  function lines(){const g=mode==='avg'?r.gpu_avg:r.gpu_peak;return [
    ['Registered users','10,000,000','assumed'],
    ['Active each day','1,000,000','10,000,000 × 10%'],
    ['Messages a day',f(r.msgs),'1,000,000 × 10'],
    ['Average requests a second',f1(r.avg_rps),f(r.msgs)+' ÷ 86,400 s'],
    ['Busy-hour requests a second',f1(r.peak_rps),f1(r.avg_rps)+' × 2'],
    ['Output tokens a second','average '+f(r.tok_avg)+', busy hour '+f(r.tok_peak),'requests × 400 tokens'],
    ['GPUs',String(g),mode==='avg'?f(r.tok_avg)+' ÷ 2,000 tokens/s per GPU (sized for the average)':f(r.tok_peak)+' × 1.2 headroom ÷ 2,000 tokens/s per GPU'],
    ['Open streams in the busy hour',f(r.streams),'Little\'s law: '+f1(r.peak_rps)+' req/s × 10 s each'],
    ['New text stored',r.store_day_gb+' GB a day, '+r.store_year_tb+' TB a year',f(r.msgs)+' × 2 messages × 2 KB'],
    ['The day, hour by hour','see the chart','demand against the fleet\'s capacity']]}
  function draw(i){
    const ls=lines(),g=mode==='avg'?r.gpu_avg:r.gpu_peak,d=RDSIM.a6day(g);
    list.innerHTML='<table class="rd-est-t"><tbody>'+ls.map((l,k)=>'<tr style="opacity:'+(k<=i?1:.3)+(k===i?';background:var(--hl)':'')+'"><td>'+l[0]+'</td><td style="text-align:right;min-width:6em"><b>'+(k<=i?l[1]:'?')+'</b></td></tr>').join('')+'</tbody></table>';
    const W=Math.max(280,Math.min(820,RD.width(svg)));let b='';
    if(i>=5){const H=150,x0=34,bw=(W-x0-4)/24,maxv=r.tok_peak*1.35,Y=v=>8+(H-30)*(1-v/maxv);
      d.dem.forEach((v,h)=>{const over=i>=6&&v>d.capT;b+='<rect x="'+(x0+h*bw+1)+'" y="'+Y(v)+'" width="'+Math.max(1,bw-2)+'" height="'+(Y(0)-Y(v))+'" fill="var('+(i>=9&&over?'--bad':'--c6')+')" opacity="'+(i>=9?1:.45)+'"/>';
        if(h%(bw<16?6:3)===0)b+=RD.t(x0+h*bw+bw/2,H-8,h+'h',{fs:9.5,a:'middle',fill:'var(--mute)'})});
      if(i>=6){b+='<line x1="'+x0+'" x2="'+W+'" y1="'+Y(d.capT)+'" y2="'+Y(d.capT)+'" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 3"/>'+RD.t(x0+4,Y(d.capT)-5,g+' GPUs: '+f(d.capT)+' tokens/s',{fs:10,w:600})}
      b+=RD.t(0,Y(0)+4,'0',{fs:10})+RD.t(0,Y(r.tok_peak)+4,f(r.tok_peak/1000)+'k',{fs:9.5});
      svg.innerHTML=RD.svg(W,H,b,'Hourly output-token demand over an illustrative day against the capacity of the chosen GPU fleet');
      leg.innerHTML=L('--c6','tokens per second needed, each hour (illustrative shape)')+(i>=9?L('--bad','hours above capacity'):'')+(i>=6?'<span style="--sw:var(--ink)">fleet capacity</span>':'');
    } else {svg.innerHTML=RD.svg(W,150,'<rect x="0.5" y="0.5" width="'+(W-1)+'" height="149" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>'+RD.t(W/2,80,'The day, hour by hour, appears at step 6',{fs:11,a:'middle',fill:'var(--mute)'}),'Placeholder for the daily demand chart');leg.innerHTML='&nbsp;'}
    cnt.innerHTML=RD.stat('Busy-hour requests/s',i>=4?f1(r.peak_rps):'?','')+RD.stat('Busy-hour tokens/s',i>=5?f(r.tok_peak):'?','')+RD.stat('GPUs',i>=6?g:'?',mode==='avg'?'sized for the average':'sized for the peak')+RD.stat('Hours over capacity',i>=9?d.hours_over+' of 24':'?',i>=9?'idle GPU-hours: '+f(d.idle_gpu_hours)+' of '+f(g*24):'');
  }
  // the step list on the left (sx-est, static HTML) explains every step; items 7 and 10 hold one span per mode, and a mode switch shows its spans and replays
  const an=RD.anim({card:'rd-est-card',ctl:'rd-est-ctl',n:10,ms:3400,draw,label:'Estimate step',list:'sx-est'});
  RD.seg(document.getElementById('rd-est-seg'),m=>{mode=m;document.querySelectorAll('#sx-est .m-avg,#sx-est .m-peak').forEach(x=>{x.hidden=!x.classList.contains('m-'+m)});an.reset(10)});
  RD.onResize(()=>an.redraw());
})();
