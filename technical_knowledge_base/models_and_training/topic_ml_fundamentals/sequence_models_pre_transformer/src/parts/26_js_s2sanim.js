// ---- Reading: the same digits through seq2seq with one fixed vector, then with attention (animated) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('sa'))return;
  const H=S2S.H,F=(v,d)=>v.toFixed(d);
  const st={mode:'fixed',x:[3,1,4,1,5,9,2,6,5,3,5,8]};
  let R,steps,anim;
  const RUN=SQ.s2s.runs.find(r=>r.model==='fixed'&&r.seed===0),acc=n=>RUN.seq_acc_int8[SQ.s2s.lens.indexOf(n)],zero=SQ.s2s.lens.find(n=>n>6&&RUN.seq_acc_int8[SQ.s2s.lens.indexOf(n)]===0);
  function build(){const m=S2S[st.mode],L=st.x.length;R=m.decode(st.x,L+1);R.L=L;R.ok=R.out.map((y,t)=>y===(t<L?st.x[t]:S2S.EOS));
    steps=[];for(let j=0;j<L;j++)steps.push(['e',j]);for(let t=0;t<=L;t++)steps.push(['d',t]);steps.push(['end',L])}
  const cs=v=>{const x=Math.max(-1,Math.min(1,v));return x>=0?'color-mix(in srgb,var(--c1) '+Math.round(x*90)+'%,var(--bg))':'color-mix(in srgb,var(--c2) '+Math.round(-x*90)+'%,var(--bg))'};
  const lab=y=>y===S2S.EOS?'end':String(y);
  function draw(i){
    const [kind,k]=steps[i],L=R.L,att=st.mode==='attention',box=$('sa-svg'),W=RD.width(box),ml=58,mr=6,cw=(W-ml-mr)/(L+1),ch=2.1,dg=Math.min(22,cw-1);
    let y=2,s='';const cx=j=>ml+(j+.5)*cw;
    // input digits and encoder states
    s+='<text x="0" y="'+(y+14)+'" font-size="11" fill="var(--mute)">input</text>';
    st.x.forEach((d,j)=>{const done=kind!=='e'||j<=k;s+='<rect x="'+(cx(j)-dg/2)+'" y="'+y+'" width="'+dg+'" height="20" rx="3" fill="var(--soft)" stroke="'+(kind==='e'&&j===k?'var(--ink)':'var(--line)')+'" opacity="'+(done?1:.4)+'"/>'+(cw>=10?'<text x="'+cx(j)+'" y="'+(y+14)+'" font-size="'+Math.min(12,cw-2)+'" text-anchor="middle">'+d+'</text>':'')});
    y+=24;s+='<text x="0" y="'+(y+H*ch/2)+'" font-size="11" fill="var(--mute)">encoder</text><text x="0" y="'+(y+H*ch/2+12)+'" font-size="11" fill="var(--mute)">states</text>';
    R.hs.forEach((h,j)=>{if(kind==='e'&&j>k)return;const dim=!att&&kind!=='e'&&j<L-1;for(let u=0;u<H;u++)s+='<rect x="'+(cx(j)-dg/2)+'" y="'+(y+u*ch)+'" width="'+dg+'" height="'+(ch+.2)+'" fill="'+cs(h[u])+'" opacity="'+(dim?.25:1)+'"/>'});
    const ey=y+H*ch;y=ey+46;
    // decoder outputs
    const tcur=kind==='d'?k:kind==='end'?L:-1;
    if(tcur>=0&&kind==='d'){const tx=cx(tcur);
      if(att){const a=R.atts[tcur];a.forEach((w,j)=>{if(w<.01)return;s+='<line x1="'+cx(j)+'" y1="'+(ey+1)+'" x2="'+tx+'" y2="'+(y-1)+'" stroke="var(--c3)" stroke-width="'+(0.6+5*w).toFixed(2)+'" opacity="'+(0.25+0.75*w).toFixed(2)+'"/>'})}
      else s+='<line x1="'+cx(L-1)+'" y1="'+(ey+1)+'" x2="'+tx+'" y2="'+(y-1)+'" stroke="var(--c2)" stroke-width="3"/>'}
    s+='<text x="0" y="'+(y+14)+'" font-size="11" fill="var(--mute)">output</text>';
    for(let t=0;t<=L;t++){if(t>tcur)break;const ok=R.ok[t];s+='<rect x="'+(cx(t)-dg/2)+'" y="'+y+'" width="'+dg+'" height="20" rx="3" fill="'+(ok?'color-mix(in srgb,var(--good) 25%,var(--bg))':'color-mix(in srgb,var(--bad) 30%,var(--bg))')+'" stroke="'+(t===tcur&&kind==='d'?'var(--ink)':'none')+'"/>'+(cw>=10?'<text x="'+cx(t)+'" y="'+(y+14)+'" font-size="'+Math.min(t===L?9:12,cw-2)+'" text-anchor="middle">'+lab(R.out[t])+'</text>':'')}
    y+=26;
    // alignment matrix (attention) or the note for the fixed vector
    if(att){const sz=Math.min(cw,12),top=y+4;s+='<text x="0" y="'+(top+10)+'" font-size="11" fill="var(--mute)">weights</text><text x="0" y="'+(top+23)+'" font-size="10" fill="var(--mute)">row: output</text><text x="0" y="'+(top+35)+'" font-size="10" fill="var(--mute)">col: input</text>';
      for(let t=0;t<=Math.min(tcur,L);t++){const a=R.atts[t];a.forEach((w,j)=>s+='<rect x="'+(cx(j)-cw/2+.3)+'" y="'+(top+t*sz)+'" width="'+(cw-.6)+'" height="'+(sz-.6)+'" fill="color-mix(in srgb,var(--c3) '+Math.round(w*95)+'%,var(--bg))"/>')}
      y=top+(L+1)*sz+6}
    else{s+='<text x="'+ml+'" y="'+(y+12)+'" font-size="11" fill="var(--mute)">'+(W<560?'Each output reads the same '+H+' numbers.':'Every output step reads the same '+H+' numbers: the last encoder state.')+'</text>';y+=20}
    box.innerHTML='<svg viewBox="0 0 '+W+' '+y+'" width="'+W+'" height="'+y+'" role="img" aria-label="Encoder states, decoder outputs and attention weights">'+s+'</svg>';
    // caption and counters
    let t1,t2;
    if(kind==='e'){t1='Encoder, digit '+(k+1)+' of '+L;t2='The encoder reads "'+st.x[k]+'" and updates its state, h<sub>'+(k+1)+'</sub> = GRU(h<sub>'+k+'</sub>, x<sub>'+(k+1)+'</sub>): one column of '+H+' numbers per digit. '+(att?'All '+L+' columns will stay available to the decoder.':'Only the last column will reach the decoder; everything about the first digits has to survive inside it.')}
    else if(kind==='d'){const a=R.atts[k],ok=R.ok[k],want=k<L?st.x[k]:'end';
      if(att){const j=a.indexOf(Math.max(...a));t1='Decoder, output '+(k+1)+' of '+(L+1);t2='Scores every encoder state against the decoder state, e<sub>j</sub> = v · tanh(W s + U h<sub>j</sub>), and takes a softmax: '+F(100*a[j],1)+'% of the weight is on input '+(j+1)+' ("'+st.x[j]+'"). The context is the weighted sum of the columns, so the right digit is read directly. Output "'+lab(R.out[k])+'" (wanted "'+want+'"), probability '+F(R.prob[k],3)+'.'}
      else{t1='Decoder, output '+(k+1)+' of '+(L+1);t2='The decoder sees its own state and the same vector h<sub>'+L+'</sub> at every step (Cho et al. 2014 feed it at every step, as here). Output "'+lab(R.out[k])+'" (wanted "'+want+'"), probability '+F(R.prob[k],3)+'. '+(ok?'':'Wrong: the digit was squeezed out of the '+H+' numbers.')}}
    else{const right=R.ok.slice(0,L).filter(Boolean).length;t1=right===L&&R.ok[L]?'All '+L+' digits copied':right+' of '+L+' digits right';
      t2=(att?'With attention the decoder reads each input state directly; on this model every training length up to 20 comes out whole (see the chart below).':'One vector of '+H+' numbers had to carry '+L+' digits. On 1,000 test strings per length this model copies '+F(100*acc(6),1)+'% of 6-digit strings whole, '+F(100*acc(10),1)+'% of 10-digit ones and none from '+zero+' digits on (chart below).')+' Switch to '+(att?'Fixed vector':'Attention')+' to run the same digits through the other model.'}
    $('sa-cap').innerHTML='<div class="t">'+t1+'</div><p>'+t2+'</p>';
    const done=kind==='e'?0:Math.min(k+(kind==='d'?1:0),L+1),right=R.ok.slice(0,Math.min(done,L)).filter(Boolean).length;
    $('sa-cnt').innerHTML=RD.stat('Numbers the decoder can read',att?(H*L).toLocaleString('en-GB'):String(H),att?H+' × '+L+' encoder states':'one state, whatever the length')+RD.stat('Digits right so far',right+' of '+Math.min(done,L),'')+RD.stat('Step',(i+1)+' of '+steps.length,kind==='e'?'encoding':kind==='d'?'decoding':'done');
  }
  function reset(){build();if(anim)anim.reset(steps.length)}
  function setX(x){st.x=x;$('sa-in').value=x.join('');$('sa-msg').textContent='';reset()}
  $('sa-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;[...$('sa-mode').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});reset();anim.play()});
  $('sa-in').addEventListener('change',e=>{const v=e.target.value.replace(/\s/g,'');if(!/^[0-9]{2,30}$/.test(v)){$('sa-msg').textContent='Type 2 to 30 digits.';return}setX(v.split('').map(Number))});
  let seed=12345;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  $('sa-rand').addEventListener('click',()=>{const n=+$('sa-len').value;setX(Array.from({length:n},()=>Math.floor(rnd()*10)))});
  $('sa-len').addEventListener('input',e=>{$('sa-lenv').textContent=e.target.value});
  $('sa-in').value=st.x.join('');
  build();anim=RD.anim({card:'sa',ctl:'sa-ctl',n:steps.length,draw,ms:900,label:'Step of the translation'});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>anim.redraw(),150)});
  window.__sa={st,get R(){return R},setX};
})();
