// ---- Reading tab: naive against Kahan summation (float16, a 2D animation with step lists), and the softmax traces (naive and stable, any format) that the 3D stage of section 7 draws ----
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
  // the steps group the eleven additions into explained stretches (the step lists sx-kahN and sx-kahK): each step shows the state after CNT[mode][i] additions
  const CNT={naive:[0,1,2,11],kahan:[0,1,2,3,4,8,9,11]};
  function kdraw(i){
    const n=CNT[km][i],r=KT[n],exactSoFar=FP.fsum(XS.slice(0,n)),prev=i?CNT[km][i-1]:0;
    let h='<div class="op">inputs: '+XS.map((x,j)=>j<prev?'<b>'+S(x,8)+'</b>':(j<n?'<b style="text-decoration:underline">'+S(x,8)+'</b>':'<span class="mute">'+S(x,8)+'</span>')).join(', ')+'</div>';
    h+=lane('sum s',r.s,f16,n&&Math.abs(r.s-exactSoFar)>0.5?'nan':'ok','exact so far '+S(exactSoFar,9));
    if(km==='kahan')h+=lane('c (lost)',r.c,f16,'','minus what the last addition dropped');
    $('rd-kahStage').innerHTML=h;
    const fin=KT[KT.length-1].s;
    $('rd-kahCnt').innerHTML=RD.stat('Sum now',S(r.s,9),'after '+n+' of 11 numbers')+RD.stat('Exact so far',S(exactSoFar,9),'math.fsum')+RD.stat('Final ('+(km==='naive'?'naive':'Kahan')+')',n===11?S(fin,9):'…','exact '+S(EX,9)+'; nearest float16 2052');
  }
  const KA=RD.anim({card:'rd-kahCard',ctl:'rd-kahCtl',n:CNT.naive.length,draw:kdraw,ms:4200,label:'Summation step',list:'sx-kahN'});
  RD.seg($('rd-kahMode'),m=>{km=m;KT=kahanTrace(km);$('sx-kahN').hidden=m!=='naive';$('sx-kahK').hidden=m==='naive';KA.reset(CNT[m].length,m==='naive'?'sx-kahN':'sx-kahK')});
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
  window.NC_ANIM={smTrace:()=>smTrace(),setSm:(m,f)=>{sm=m;sf=f},trace:(m,f)=>{const o=[sm,sf];sm=m;sf=f;const t=smTrace();[sm,sf]=o;return t},kahan:m=>kahanTrace(m),lane,kind};
})();
