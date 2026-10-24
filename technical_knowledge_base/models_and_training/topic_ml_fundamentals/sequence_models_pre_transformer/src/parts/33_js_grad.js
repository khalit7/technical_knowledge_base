// ---- Reading: the gradient travelling back from the answer, plain RNN (before) against LSTM (after), untrained networks ----
// Data: grad_init from model/train_memory.py (PyTorch autograd), exported by export_data.py as SQ.mem.summ[<cell>_50].gi:
// log10 of the gradient norm at each of 100 steps, relative to the last step (the answer), averaged over 256 sequences.
(function(){
  const $=id=>document.getElementById(id);
  if(!$('gt'))return;
  const S=SQ.mem.summ,CELLS=['rnn','gru','lstm'],G={},T=S.rnn_50.gi.length;
  CELLS.forEach(k=>G[k]=S[k+'_50'].gi);
  const COL={rnn:'var(--c2)',gru:'var(--c4)',lstm:'var(--c3)'},NM={rnn:'plain RNN',gru:'GRU',lstm:'LSTM'};
  const at=(k,back)=>G[k][T-1-back];
  const FLOOR=-29.9,YL=-24;
  // average factor per step between 10 and 50 steps back (derived from the recorded curve)
  const fac=k=>Math.pow(10,(at(k,50)-at(k,10))/40);
  const st={mode:'all'};const N=21,K=s=>Math.min(T-1,s*5);
  const sup=v=>v<=FLOOR?'0 (recorded)':(v>-0.05?'1':'10<sup>&minus;'+Math.abs(v).toFixed(1)+'</sup>');
  let anim;
  function draw(s){
    const box=$('gt-svg'),W=RD.width(box),narrow=W<520,H=narrow?230:260,ml=narrow?40:46,mr=narrow?58:70,mt=12,mb=34;
    const x0=ml,x1=W-mr,y0=mt,y1=H-mb,back=K(s);
    const X=t=>x0+(x1-x0)*t/(T-1),Y=v=>y0+(y1-y0)*(Math.min(0,Math.max(YL,v)))/YL;
    let g='';
    for(let v=0;v>=YL;v-=6)g+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(x0-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+(v===0?'1':'1e'+v)+'</text>';
    for(let b=0;b<T;b+=narrow?25:20)g+='<text x="'+X(T-1-b)+'" y="'+(y1+14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+b+'</text>';
    g+='<text x="'+x1+'" y="'+(H-3)+'" font-size="11" text-anchor="end" fill="var(--mute)">steps back from the answer (it travels left)</text>';
    // the answer and the cursor
    g+='<line x1="'+X(T-1-back)+'" x2="'+X(T-1-back)+'" y1="'+y0+'" y2="'+y1+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".55"/>';
    g+='<text x="'+X(T-1)+'" y="'+(y0-2)+'" font-size="11" text-anchor="end" fill="var(--mute)">answer "?"</text>';
    const labs=[];
    CELLS.forEach(k=>{
      const on=st.mode==='all'||st.mode===k;
      // ghost of the whole curve for comparison, then the revealed part
      let d='';for(let b=0;b<T;b++){const v=at(k,b);if(v<=FLOOR)break;d+=(b?'L':'M')+X(T-1-b).toFixed(1)+' '+Y(v).toFixed(1)}
      g+='<path d="'+d+'" fill="none" stroke="'+COL[k]+'" stroke-width="1.2" stroke-dasharray="2 3" opacity=".35"/>';
      if(!on)return;
      let r='';for(let b=0;b<=back;b++){const v=at(k,b);if(v<=FLOOR)break;r+=(b?'L':'M')+X(T-1-b).toFixed(1)+' '+Y(v).toFixed(1)}
      g+='<path d="'+r+'" fill="none" stroke="'+COL[k]+'" stroke-width="2.6"/>';
      const v=at(k,back),px=X(T-1-back),py=Y(v<=FLOOR?YL:v);
      g+='<circle cx="'+px+'" cy="'+py+'" r="4" fill="'+COL[k]+'"/>';
      labs.push({k,y:py});
    });
    // labels on the figure, at the right margin, pushed apart
    labs.sort((a,b)=>a.y-b.y);for(let i=1;i<labs.length;i++)if(labs[i].y-labs[i-1].y<13)labs[i].y=labs[i-1].y+13;
    labs.forEach(l=>g+='<text x="'+(x1+6)+'" y="'+(l.y+4)+'" font-size="11" font-weight="600" fill="'+COL[l.k]+'">'+NM[l.k]+'</text>');
    box.innerHTML=RD.svg(W,H,g,'Gradient norm against steps back from the answer');
    // caption
    let t,p;const r=at('rnn',back),l=at('lstm',back),gr=at('gru',back);
    if(s===0){t='At the answer';p='The gradient of the loss with respect to the last hidden state is the unit: every value below is relative to it. Step back to send it through the recurrence.'}
    else if(back<=10){t=back+' steps back';p='Each step multiplies by one Jacobian. On average the plain RNN loses a factor of '+fac('rnn').toFixed(2)+' per step, the GRU '+fac('gru').toFixed(2)+', the LSTM '+fac('lstm').toFixed(2)+' (derived from the curves between 10 and 50 steps back): the curves are straight lines on a log scale, which is what "exponential" means.'}
    else if(back<50){t=back+' steps back';p='Plain RNN '+sup(r)+', LSTM '+sup(l)+': a constant factor per step compounds. The gap is already '+(l-r).toFixed(1)+' orders of magnitude.'}
    else if(back===50){t='50 steps back: the key of a 50-symbol sequence';p='This is what the training signal must cross to teach the network to store the key: '+sup(r)+' for the plain RNN, '+sup(gr)+' for the GRU, '+sup(l)+' for the LSTM, '+(l-r).toFixed(1)+' orders of magnitude apart. Untrained, the LSTM\'s forget gates start near σ(1) &asymp; 0.73 on its cell path.'}
    else if(r>FLOOR){t=back+' steps back';p='Plain RNN '+sup(r)+', LSTM '+sup(l)+'. Even the LSTM is far below 1: the gate path protects the gradient, it does not keep it whole until training opens the forget gates.'}
    else{t=back+' steps back';p='The plain RNN\'s recorded gradient is now exactly zero (beyond 86 steps); the LSTM\'s is still '+sup(l)+'.'}
    $('gt-cap').innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    $('gt-cnt').innerHTML=CELLS.map(k=>RD.stat(NM[k]+', '+back+' steps back',sup(at(k,back)),'factor per step &asymp; '+fac(k).toFixed(2))).join('');
  }
  RD.seg($('gt-mode'),m=>{st.mode=m;[...$('gt-mode').children].forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));anim.reset(N)});
  anim=RD.anim({card:'gt',ctl:'gt-ctl',n:N,draw,ms:700,label:'Steps back from the answer'});
  RD.onResize(()=>anim.redraw());
})();
