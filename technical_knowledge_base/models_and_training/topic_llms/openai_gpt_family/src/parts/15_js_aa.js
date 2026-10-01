// ---- Reading: one index, four rulers (never joined across versions) ----
(function(){
  const R=[
    ['v4.1','before 4 September','{{Trending Topics|@tt2}}',[['Claude Fable 5.1',66],['GPT-6 Astra',61],['GPT-5.6 Sol',61]]],
    ['v4.2','4 September','{{AA|@aa42}}, {{Trending Topics|@tt2}}',[['Claude Fable 5.1',57],['GPT-6 Astra',55],['GPT-5.6 Sol',51,'derived']]],
    ['v4.3','7 September, read 8 September','{{Trending Topics|@tt2}}',[['GPT-6 Astra',53],['Claude Fable 5.1',53],['Claude Opus 5',51],['GPT-5.6 Sol',47]]],
    ['v4.3.2','methodology of 19 September, read 1 October','{{AA leaderboard|@aalb}}',[['Claude Opus 5.5','57.6'],['Claude Fable 5.1','53.4'],['GPT-6 Astra','52.7'],['GPT-6.1 Sol','51.8'],['GPT-5.6 Sol','47.0']]]];
  const col=n=>n.startsWith('GPT')?'var(--closed)':'var(--dim)';
  $('aaRul').innerHTML=R.map(([v,d,src,rows])=>'<div class="sp"><div class="n">Index '+v+'</div><p class="small mute" style="margin:0 0 4px">'+d+' · '+src+'</p><div class="bars">'+rows.map(([n,x,f])=>'<div class="row'+(n==='GPT-6 Astra'?' hl':'')+'"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*(+x)/70)+'%;background:'+col(n)+'"></span></span><span class="val">'+x+(f?'*':'')+'</span></div>').join('')+'</div></div>').join('');
})();
