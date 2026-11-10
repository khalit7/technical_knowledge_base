// ---- Reading section 2 (moved from the retired Router tab on 2026-10-23): the sequence coloured by expert,
// and which tokens each expert takes on held-out text. All from recorded router outputs (window.MXD.runs[*].seq/special). ----
(function(){
  const M=window.MX;if(!M||!window.RD||!M.$('rt-txt'))return;const {D,$,f,pct,tx,svg,esc,EC}=M;
  const RUNS=['none','moe8','bias','sbias','moe16s'].filter(k=>D.runs[k]&&D.runs[k].seq);
  const R8=RUNS.filter(k=>D.runs[k].seq.E===8);
  if(!R8.length)return;
  const L=D.runs[R8[0]].seq.top.length,TOK=[1,2,3,4,5,6,7,8];
  const st={run:R8.includes('moe8')?'moe8':R8[0],lay:0};
  // the 8-token stepper is Fig. 3 (43_js_sc_route.js) since 2026-11-09
  // whole sequence coloured by first choice ------------------------------------------------------------------------
  const s2={run:st.run,lay:0,tok:null};
  function txt(){const r=D.runs[s2.run].seq,E=r.E,k=r.k,top=r.top[s2.lay];let h='';
    for(let t=1;t<D.pieces.length;t++){const e=parseInt(top[t*k],16);h+='<span data-t="'+t+'" style="background:'+EC[e]+'66"'+(t===s2.tok?' class="sel"':'')+'>'+esc(M.piece(t))+'</span>'}
    $('rt-txt').innerHTML=h;$('rt-leg').innerHTML=Array.from({length:E},(_,e)=>'<span style="--sw:'+EC[e]+'">E'+e+'</span>').join('')+'<span class="mute" style="--sw:transparent">'+esc(D.runs[s2.run].label)+', layer '+(s2.lay+1)+'</span>';
    tokInfo()}
  function tokInfo(){if(s2.tok===null){$('rt-tok').innerHTML='<span class="mute">Tap a piece of text.</span>';return}
    const r=D.runs[s2.run].seq,k=r.k,t=s2.tok;
    $('rt-tok').innerHTML='<b>'+esc(M.piece(t))+'</b> (position '+t+'): '+r.top.map((L_,l)=>'layer '+(l+1)+' &rarr; '+L_.slice(t*k,t*k+k).split('').map((c,j)=>'<span style="color:'+EC[parseInt(c,16)]+';font-weight:600">E'+parseInt(c,16)+'</span>'+(j===0?' ('+f(r.w1[l][t],2)+')':'')).join(' + ')).join('; ')}
  $('rt-txt').addEventListener('click',e=>{const sp=e.target.closest('span[data-t]');if(!sp)return;s2.tok=+sp.dataset.t;txt()});
  M.seg($('rt-run2'),RUNS.map(k=>[k,D.runs[k].short]),s2.run,m=>{s2.run=m;txt()});
  M.seg($('rt-lay2'),Array.from({length:L},(_,i)=>[String(i),'layer '+(i+1)]),'0',m=>{s2.lay=+m;txt()});
  txt();
  // specialisation ----------------------------------------------------------------------------------------------------
  const s3={run:st.run,lay:0};
  function spec(){const r=D.runs[s3.run];if(!r.special){$('rt-sp').innerHTML='';return}const sp=r.special[s3.lay];
    $('rt-det').innerHTML='<b>'+esc(r.label)+', layer '+(s3.lay+1)+'</b>: determinism '+f(sp.det,3)+' (1/'+sp.ex.length+' = '+f(1/sp.ex.length,3)+' if routing ignored the token id).';
    $('rt-sp').innerHTML=sp.ex.map((toks,e)=>'<div style="--sw:'+EC[e]+'"><b>E'+e+'</b> '+(toks.length?toks.map(t=>'<code>'+M.show(t[0])+'</code> '+pct(t[2],0)).join(', '):'<span class="mute">no first-choice tokens</span>')+'</div>').join('')}
  M.seg($('rt-run3'),RUNS.filter(k=>D.runs[k].special).map(k=>[k,D.runs[k].short]),s3.run,m=>{s3.run=m;spec()});
  M.seg($('rt-lay3'),Array.from({length:L},(_,i)=>[String(i),'layer '+(i+1)]),'0',m=>{s3.lay=+m;spec()});
  spec();
})();
