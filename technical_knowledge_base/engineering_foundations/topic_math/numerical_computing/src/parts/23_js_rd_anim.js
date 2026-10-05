// ---- Reading tab animations: naive against Kahan summation (float16), naive against stable softmax (any format) ----
(function(){
  const $=id=>document.getElementById(id),S=FP.show,Pn=(v,k)=>(v<0||Object.is(v,-0))?'('+S(v,k)+')':S(v,k);
  const lane=(nm,v,f,cls,note)=>'<div class="lane '+(cls||'')+'"><span class="nm">'+nm+'</span>'+FP.bitsHTML(FP.enc(v,f).bits,f,{sm:true})+'<span class="val">'+S(v,9)+(note?' <span class="mute small">'+note+'</span>':'')+'</span></div>';
  const kind=v=>Number.isNaN(v)?'nan':(Math.abs(v)===Infinity?'inf':'ok');
  // ---------- Kahan ----------
  const f16=FP.F.fp16,XS=[2048].concat(Array(10).fill(0.4)).map(v=>FP.rnd(v,f16));
  const EX=FP.fsum(XS);
  function kahanTrace(mode){const tr=[{s:0,c:0}];let s=0,c=0;
    XS.forEach((x,i)=>{if(mode==='naive'){const t=FP.add(s,x,f16);tr.push({x,s:t,exact:s+x,lost:(s+x)-t});s=t}
      else{const y=FP.sub(x,c,f16),t=FP.add(s,y,f16),c2=FP.sub(FP.sub(t,s,f16),y,f16);tr.push({x,y,t,s:t,c:c2,cprev:c,sprev:s});s=t;c=c2}});return tr}
  let km='naive',KT=kahanTrace(km);
  function kdraw(i){
    const r=KT[i],exactSoFar=FP.fsum(XS.slice(0,i));
    let h='<div class="op">inputs: '+XS.map((x,j)=>j<i?'<b>'+S(x,8)+'</b>':(j===i?'<span style="text-decoration:underline">'+S(x,8)+'</span>':'<span class="mute">'+S(x,8)+'</span>')).join(', ')+'</div>';
    h+=lane('sum s',r.s,f16,i&&Math.abs(r.s-exactSoFar)>0.5?'nan':'ok','exact so far '+S(exactSoFar,9));
    if(km==='kahan')h+=lane('c (lost)',r.c,f16,'','minus what the last addition dropped');
    $('rd-kahStage').innerHTML=h;
    let cap;
    if(i===0)cap='<div class="t">Start</div><p>s = 0'+(km==='kahan'?', c = 0':'')+'. Eleven numbers will be added in float16, where the gap between numbers at 2048 is 2.</p>';
    else if(i===1)cap='<div class="t">Add 2048</div><p>2048 is exactly representable; the sum is 2048.</p>';
    else if(km==='naive')cap='<div class="t">Add '+S(r.x,8)+'</div><p>The exact sum '+S(r.exact,9)+' is less than half a gap (1) above 2048, so it rounds back to '+S(r.s)+'. Lost this step: '+S(r.lost,8)+'. Every 0.4 is absorbed the same way: the naive sum never moves.</p>';
    else cap='<div class="t">Add '+S(r.x,8)+' with the correction</div><p>y = x − c = '+S(r.x,8)+' − '+Pn(r.cprev,8)+' = '+S(r.y,8)+'; t = s + y = '+S(r.sprev,9)+' + '+Pn(r.y,8)+' rounds to '+S(r.t,9)+'; c = (t − s) − y = '+S(r.t-r.sprev,8)+' − '+Pn(r.y,8)+' = '+S(r.c,8)+'. '+(r.t!==r.sprev?'The carried amount was large enough to move the sum by one gap.':'Nothing reached the sum yet, but c remembers it.')+'</p>';
    $('rd-kahCap').innerHTML=cap;
    const fin=KT[KT.length-1].s;
    $('rd-kahCnt').innerHTML=RD.stat('Sum now',S(r.s,9),'after '+i+' of 11 numbers')+RD.stat('Exact so far',S(exactSoFar,9),'math.fsum')+RD.stat('Final ('+(km==='naive'?'naive':'Kahan')+')',i===KT.length-1?S(fin,9):'…','exact '+S(EX,9)+'; nearest float16 2052');
  }
  const KA=RD.anim({card:'rd-kahCard',ctl:'rd-kahCtl',n:KT.length,draw:kdraw,ms:1300,label:'Summation step'});
  RD.seg($('rd-kahMode'),m=>{km=m;KT=kahanTrace(km);KA.reset(KT.length);KA.play()});
  // ---------- softmax ----------
  const Z=[1000,999,0],NM=['cat','dog','sat'],TGT=2;
  let sm='naive',sf='fp32';
  function smTrace(){
    const f=FP.F[sf],z=Z.map(v=>FP.rnd(v,f)),st=[];
    st.push({t:'Store the logits',rows:z.map((v,i)=>['z<sub>'+NM[i]+'</sub>',v,i===1&&v!==999?'999 is not a '+f.name+' number':'']),p:'The three logits rounded to '+f.name+'. '+(z[1]!==999?'Between 512 and 1024 '+f.name+'\'s gap is '+S(FP.ulp(999,f))+', so 999 is stored as '+S(z[1])+': the difference between cat and dog is already gone.':'All three are exact in '+f.name+'.')});
    if(sm==='naive'){
      const e=z.map(v=>FP.exp(v,f));
      e.forEach((v,i)=>st.push({t:'e<sup>z</sup> for '+NM[i],rows:[['e<sup>z<sub>'+NM[i]+'</sub></sup>',v,'']],p:'e<sup>'+S(z[i])+'</sup> '+(v===Infinity?'is about 10<sup>'+Math.round(z[i]/Math.LN10)+'</sup>, beyond '+f.name+'\'s largest number e<sup>'+S(Math.log(f.max),5)+'</sup>: it rounds to infinity (exponent all ones, fraction 0).':'= '+S(v)+', fine.')}));
      const s=FP.add(FP.add(e[0],e[1],f),e[2],f);
      st.push({t:'Sum the exponentials',rows:[['sum',s,'']],p:'inf + inf + 1 = inf. The denominator is infinite.'});
      const p=e.map(v=>FP.div(v,s,f));
      st.push({t:'Divide',rows:p.map((v,i)=>['p<sub>'+NM[i]+'</sub>',v,'']),p:'inf / inf is NaN (exponent all ones, fraction not 0); 1 / inf is 0. The probabilities are NaN, NaN, 0.'});
      const L=-FP.log(p[TGT],f),g=p.map((v,i)=>FP.sub(v,i===TGT?1:0,f));
      st.push({t:'Loss and gradient',rows:[['loss',L,'−ln p<sub>sat</sub>']].concat(g.map((v,i)=>['∂L/∂z<sub>'+NM[i]+'</sub>',v,''])),p:'−ln 0 = inf for the loss, and the gradient p − onehot is NaN, NaN, −1: one optimiser step with it makes every weight NaN. PyTorch measured the same: loss inf, gradient [nan, nan, nan].'});
    }else{
      const m=Math.max(...z),d=z.map(v=>FP.sub(v,m,f));
      st.push({t:'Subtract the largest logit',rows:d.map((v,i)=>['z<sub>'+NM[i]+'</sub> − m',v,'']),p:'m = '+S(m)+'. Every shifted logit is 0 or negative, so every exponential will lie in (0, 1]. The subtraction is exact here.'});
      const e=d.map(v=>FP.exp(v,f));
      st.push({t:'Exponentiate',rows:e.map((v,i)=>['e<sup>z−m</sup> '+NM[i],v,i===2?'underflows to 0: harmless':'']),p:'e<sup>0</sup> = 1, e<sup>'+S(d[1])+'</sup> = '+S(e[1],8)+', and e<sup>−1000</sup> underflows to 0, smaller than anything that could change the sum.'});
      const s=FP.add(FP.add(e[0],e[1],f),e[2],f);
      st.push({t:'Sum',rows:[['sum',s,'between 1 and 3']],p:'The denominator is '+S(s,8)+': no overflow is possible because the largest term is exactly 1.'});
      const p=e.map(v=>FP.div(v,s,f));
      st.push({t:'Divide',rows:p.map((v,i)=>['p<sub>'+NM[i]+'</sub>',v,'']),p:'p = ('+p.map(v=>S(v,6)).join(', ')+'). Finite and summing to 1 (to the format\'s precision).'});
      const ls=FP.log(s,f),lp=d.map(v=>FP.sub(v,ls,f));
      st.push({t:'Log-softmax',rows:lp.map((v,i)=>['ln p<sub>'+NM[i]+'</sub>',v,'']),p:'ln p = (z − m) − ln(sum) with ln(sum) = '+S(ls,8)+'. ln p<sub>sat</sub> = '+S(lp[2],8)+' even though p<sub>sat</sub> itself underflowed to 0: the log never sees the 0.'});
      const L=FP.sub(0,lp[TGT],f),g=p.map((v,i)=>FP.sub(v,i===TGT?1:0,f));
      st.push({t:'Loss and gradient',rows:[['loss',L,'−ln p<sub>sat</sub>']].concat(g.map((v,i)=>['∂L/∂z<sub>'+NM[i]+'</sub>',v,''])),p:'A huge but honest loss, '+S(L,8)+', and a finite gradient p − onehot. PyTorch\'s fused cross_entropy measured the same: 1000.3132, [0.7311, 0.2689, −1].'});
    }
    return st;
  }
  let ST=smTrace();
  function smdraw(i){
    const f=FP.F[sf];let h='';
    for(let j=0;j<=i;j++){const s=ST[j];h+='<div class="op"'+(j<i?' style="opacity:.55"':'')+'>'+(j+1)+'. '+s.t+'</div>';
      if(j===i||j>=i-1)s.rows.forEach(r=>{h+=lane(r[0],r[1],f,kind(r[1]),r[2])})}
    $('rd-smStage').innerHTML=h;
    $('rd-smCap').innerHTML='<div class="t">'+(sm==='naive'?'Naive':'Stable')+', '+f.name+': '+ST[i].t+'</div><p>'+ST[i].p+'</p>';
    let ni=0,nn=0,nf=0;for(let j=0;j<=i;j++)ST[j].rows.forEach(r=>{const k=kind(r[1]);if(k==='inf')ni++;else if(k==='nan')nn++;else nf++});
    $('rd-smCnt').innerHTML=RD.stat('Finite values',nf,'so far')+RD.stat('Infinities',ni?'<span class="bad">'+ni+'</span>':0,'')+RD.stat('NaNs',nn?'<span class="bad">'+nn+'</span>':0,'')+RD.stat('Step',(i+1)+' of '+ST.length,'');
  }
  const SA=RD.anim({card:'rd-smCard',ctl:'rd-smCtl',n:ST.length,draw:smdraw,ms:1700,label:'Softmax step'});
  const re=()=>{ST=smTrace();SA.reset(ST.length);SA.play()};
  RD.seg($('rd-smMode'),m=>{sm=m;re()});RD.seg($('rd-smFmt'),m=>{sf=m;re()});
  window.NC_ANIM={smTrace:()=>smTrace(),setSm:(m,f)=>{sm=m;sf=f;ST=smTrace();SA.reset(ST.length)},kahan:m=>kahanTrace(m)};
})();
