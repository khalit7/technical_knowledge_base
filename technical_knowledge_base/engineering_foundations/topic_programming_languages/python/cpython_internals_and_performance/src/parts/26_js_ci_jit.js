// ---- Section 5: the JIT on and off (from the language page's 42_js_pb_read_d.js and the Runtime lab's part 3, 44_js_pb_lab.js) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.PB||!PB.jit||!$('ci-jit-tbl'))return;
  const J=PB.jit.runs,V=['3.13','3.14','3.15'],C=['char_loop','float_loop','objects','gen_pipeline','json_count'],F=CIU.fmt;
  const CN={char_loop:'Character loop (the token counter)',float_loop:'Float arithmetic loop',objects:'Small objects and method calls',gen_pipeline:'Generator pipeline',json_count:'json.loads plus token counting'};
  const r=(v,c)=>J[v+'|'+c+'|0'].median_s/J[v+'|'+c+'|1'].median_s;
  const col=x=>x>=1.1?'var(--good)':x<=0.91?'var(--bad)':'var(--mute)';
  const cat=x=>x<0.9?0:x<1.15?1:x<1.8?2:3,cr=cat(r('3.15','char_loop'));
  CIU.drill($('ci-pr-jit'),'Predict: with <code>PYTHON_JIT=1</code> on 3.15.0rc3, how much faster is the token counter\'s character loop?',
    [{t:'Slower',right:cr===0},{t:'About the same (within 10%)',right:cr===1},{t:'1.2x to 1.8x faster',right:cr===2},{t:'1.8x or more',right:cr===3}],
    'Measured: '+F(r('3.15','char_loop'),2)+'x ('+F(J['3.15|char_loop|0'].median_s*1000,0)+' ms off, '+F(J['3.15|char_loop|1'].median_s*1000,0)+' ms on). On 3.14 the same loop: '+F(r('3.14','char_loop'),2)+'x. The table has all five workloads.');
  $('ci-jit-tbl').innerHTML='<thead><tr><th>Workload (JIT on vs off)</th>'+V.map(v=>'<th class="n">'+v+'</th>').join('')+'</tr></thead><tbody>'+
    C.map(c=>'<tr><td>'+CN[c]+'</td>'+V.map(v=>{const x=r(v,c);return '<td class="n" style="color:'+col(x)+'">'+F(x,2)+'x</td>'}).join('')+'</tr>').join('')+'</tbody>';
  $('ci-jit-note').textContent='Speed-up = time with PYTHON_JIT=0 divided by time with PYTHON_JIT=1; green 1.1x or better, red 0.91x or worse, grey within noise. Median of 3 processes x 7 timed repeats, Apple M1 Pro, load average '+CIU.la(PB.jit.loadavg_start)+' at the start. Every time is in the closed block below.';
  // every run (the Runtime lab's table)
  $('ci-jit-all').innerHTML='<thead><tr><th>Workload</th>'+V.map(v=>'<th class="n">'+v+' off</th><th class="n">'+v+' on</th><th class="n">ratio</th>').join('')+'</tr></thead><tbody>'+
    C.map(c=>'<tr><td>'+CN[c]+'</td>'+V.map(v=>{const a=J[v+'|'+c+'|0'],b=J[v+'|'+c+'|1'],x=a.median_s/b.median_s;
      return '<td class="n" title="runs: '+a.all_s.join(', ')+'">'+F(a.median_s*1000,0)+' ms</td><td class="n" title="runs: '+b.all_s.join(', ')+(b.jit_enabled_reported===true?'; sys._jit.is_enabled() True':'')+'">'+F(b.median_s*1000,0)+' ms</td><td class="n" style="color:'+col(x)+'">'+F(x,2)+'x</td>'}).join('')+'</tr>').join('')+'</tbody>';
  const jon=Object.entries(J).filter(([k])=>k.endsWith('|1')&&!k.startsWith('3.13')).every(([,v])=>v.jit_enabled_reported===true);
  $('ci-jit-load').textContent='Load average '+CIU.la(PB.jit.loadavg_start)+' at the start, '+CIU.la(PB.jit.loadavg_end)+' at the end. sys._jit.is_enabled() reported True in every 3.14 and 3.15 "on" run: '+(jon?'yes':'no')+'. Hover a time for the three process medians.';
})();
