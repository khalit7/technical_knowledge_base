// ---- Reading: measured results of the memory task (accuracy against length; gradient reaching step k) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('mr'))return;
  const M=SQ.mem,L=M.lens,F=(v,d)=>v.toFixed(d);
  const COL={rnn:'var(--c2)',gru:'var(--c4)',lstm:'var(--c3)'},NM={rnn:'plain RNN',gru:'GRU',lstm:'LSTM'};
  const st={view:'acc',tmax:50};
  function axes(W,H,ml,mb,mt,mr){return {x0:ml,x1:W-mr,y0:mt,y1:H-mb}}
  function draw(){
    const box=$('mr-svg'),W=RD.width(box),H=Math.round(Math.min(280,Math.max(210,W*.42))),ml=42,mr=12,mt=10,mb=34,a=axes(W,H,ml,mb,mt,mr);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Memory task results">';
    if(st.view==='acc'){
      const lx=v=>a.x0+(a.x1-a.x0)*(Math.log(v)-Math.log(L[0]))/(Math.log(L[L.length-1])-Math.log(L[0])),ly=v=>a.y1-(a.y1-a.y0)*v;
      for(const v of [0,.25,.5,.75,1])s+='<line x1="'+a.x0+'" x2="'+a.x1+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"'+(v===.25?' stroke-dasharray="3 3"':'')+'/><text x="'+(a.x0-5)+'" y="'+(ly(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+Math.round(v*100)+'%</text>';
      L.forEach(v=>s+='<text x="'+lx(v)+'" y="'+(a.y1+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'</text>');
      s+='<text x="'+a.x1+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">test sequence length (log scale)</text><text x="'+(a.x0+4)+'" y="'+(ly(.25)-3)+'" font-size="9.5" fill="var(--mute)">chance</text>';
      s+='<rect x="'+lx(5)+'" y="'+a.y0+'" width="'+Math.max(0,lx(st.tmax)-lx(5))+'" height="'+(a.y1-a.y0)+'" fill="var(--soft)" opacity=".8"/><text x="'+(lx(5)+4)+'" y="'+(a.y0+11)+'" font-size="9.5" fill="var(--mute)">trained on 5 to '+st.tmax+'</text>';
      ['rnn','gru','lstm'].forEach((k,ki)=>{const r=M.summ[k+'_'+st.tmax];
        r.acc.forEach(acc=>{s+='<path d="'+acc.map((v,i)=>(i?'L':'M')+lx(L[i]).toFixed(1)+' '+(ly(v)+ki*1.2).toFixed(1)).join('')+'" fill="none" stroke="'+COL[k]+'" stroke-width="1.8" opacity=".75"/>';
          acc.forEach((v,i)=>s+='<circle cx="'+lx(L[i]).toFixed(1)+'" cy="'+(ly(v)+ki*1.2).toFixed(1)+'" r="2.3" fill="'+COL[k]+'"/>')})});
    }else{
      const g=['rnn','gru','lstm'].map(k=>M.summ[k+'_50'].gi),T=g[0].length,YL=-30,lx=k=>a.x0+(a.x1-a.x0)*k/(T-1),ly=v=>a.y0+(a.y1-a.y0)*(Math.max(YL,Math.min(0.5,v))-0.5)/(YL-0.5);
      for(let v=0;v>=YL;v-=6)s+='<line x1="'+a.x0+'" x2="'+a.x1+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(a.x0-5)+'" y="'+(ly(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(v===0?'1':'1e'+v)+'</text>';
      for(let k=0;k<=100;k+=20)s+='<text x="'+lx(T-1-k)+'" y="'+(a.y1+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+k+'</text>';
      s+='<text x="'+a.x1+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">steps back from the answer</text>';
      ['rnn','gru','lstm'].forEach((k,ki)=>{s+='<path d="'+g[ki].map((v,i)=>(i?'L':'M')+lx(i).toFixed(1)+' '+ly(v).toFixed(1)).join('')+'" fill="none" stroke="'+COL[k]+'" stroke-width="2"/>'});
    }
    box.innerHTML=s+'</svg>';
    // read-out
    if(st.view==='acc'){const r=k=>M.summ[k+'_'+st.tmax],mean=a=>a.reduce((x,y)=>x+y,0)/a.length,at=(k,len)=>{const i=L.indexOf(len);return mean(r(k).acc.map(a=>a[i]))};
      $('mr-n').innerHTML=['rnn','gru','lstm'].map(k=>RD.stat(NM[k]+', length 200',F(100*at(k,200),0)+'%','mean of 3 seeds; best learning rate '+r(k).lr)).join('');
    }else{const g=k=>M.summ[k+'_50'].gi,v=k=>g(k)[g(k).length-51];
      $('mr-n').innerHTML=['rnn','gru','lstm'].map(k=>RD.stat(NM[k]+', 50 steps back','10<sup>'+(v(k)<0?'&minus;':'')+F(Math.abs(v(k)),1)+'</sup>','relative to the gradient at the answer, untrained')).join('');}
  }
  function seg(id,key,cb){$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st[key]=isNaN(+b.dataset.v)?b.dataset.v:+b.dataset.v;[...$(id).children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});cb&&cb();draw()})}
  seg('mr-view','view',()=>{$('mr-tm').style.display=st.view==='acc'?'':'none'});seg('mr-tm','tmax');
  RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,150)});
})();
