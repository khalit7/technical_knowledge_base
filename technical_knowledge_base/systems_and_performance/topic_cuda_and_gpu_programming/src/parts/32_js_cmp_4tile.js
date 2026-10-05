// ---- Compiler explorer: 3. naive vs tiled, animated over the real inner-loop SASS ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-tile'))return;
  let mode='naive',arch='sm_90a';
  X.$('cmp-tile-a').innerHTML=D.archs.map(a=>'<button data-m="'+a+'"'+(a===arch?' class="on"':'')+'>'+a+'</button>').join('');
  const L=()=>{const kid=mode==='naive'?'k2_matmul_naive':'k3_matmul_tiled',lp=D.loops[kid][arch],S=D.kernels.find(k=>k.id===kid).arch[arch].sass;
    return {lines:S.slice(lp.r[0],lp.r[1]+1).map(l=>l[0]).filter(t=>!/^\.L_x_\d+:$/.test(t)),note:lp.note}};
  const bytesOf=t=>{const op=(t.replace(/^@!?U?P\w+\s+/,'').split(' ')[0]||'');const m=op.match(/\.(64|128)(\.|$)/);return m?(+m[1]/8):4};
  function counts(lines,upto){const c={ldg:0,lds:0,ffma:0,gB:0,sB:0,other:0,sts:0,bar:0};
    for(let j=0;j<=upto&&j<lines.length;j++){const t=lines[j],op=X.opOf(t);
      if(op==='LDG'){c.ldg++;c.gB+=bytesOf(t)}else if(op==='LDS'){c.lds++;c.sB+=bytesOf(t)}else if(op==='FFMA')c.ffma++;else if(op==='STS')c.sts++;else if(op==='BAR')c.bar++;else c.other++}
    return c}
  function draw(i){
    const lp=L(),lines=lp.lines,n=lines.length,el=X.$('cmp-tile-svg'),W=X.width(el);
    const per=Math.max(4,Math.floor((W-8)/Math.min(n,64))),cols=Math.max(1,Math.floor((W-8)/per)),rows=Math.ceil(n/cols),cw=per-2,ch=18;
    let s='';
    lines.forEach((t,j)=>{const op=X.opOf(t),c=X.catOf(op),x=4+(j%cols)*per,y=4+Math.floor(j/cols)*(ch+4);
      s+='<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+ch+'" rx="2" fill="'+X.CAT[c][1]+'" opacity="'+(j<=i?1:.22)+'"'+(j===i?' stroke="var(--ink)" stroke-width="2"':'')+'><title>'+X.esc(t)+'</title></rect>'});
    const H=8+rows*(ch+4);
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Instructions of one loop iteration">'+s+'</svg>';
    const c=counts(lines,i),T=counts(lines,n-1);
    X.$('cmp-tile-cap').innerHTML='<b>Instruction '+(i+1)+' of '+n+':</b> <code>'+X.esc(lines[i])+'</code><br>So far this iteration: <b>'+c.ldg+'</b> global loads ('+c.gB+' B per thread), <b>'+c.lds+'</b> shared loads ('+c.sB+' B), <b>'+c.ffma+'</b> FFMA'+(c.sts?', '+c.sts+' shared stores':'')+(c.bar?', '+c.bar+' barriers':'')+'.'+
      '<br>Whole iteration: '+T.ffma+' FFMA for '+T.gB+' bytes from global memory per thread = <b>'+(T.ffma?(T.gB/T.ffma).toFixed(T.gB/T.ffma<1?3:1):'n/a')+' bytes per multiply-add</b>'+(T.lds?' (and '+(T.sB/T.ffma).toFixed(2)+' bytes from shared memory)':'')+'.';
    X.$('cmp-tile-code').innerHTML=lines.map((t,j)=>{const op=X.opOf(t);return '<span class="cmp-ln'+(j===i?' on':'')+'"><span class="n">'+(j+1)+'</span>'+X.esc(t).replace(op,'<span class="op cmp-k-'+X.catOf(op)+'">'+op+'</span>')+'</span>'}).join('');
    const pre=X.$('cmp-tile-code'),cur=pre.children[i];if(cur)pre.scrollTop=Math.max(0,cur.offsetTop-pre.offsetTop-60);
    X.$('cmp-tile-note').innerHTML=lp.note||'';
  }
  const A=X.anim({card:'cmp-tile',ctl:'cmp-tile-ctl',n:L().lines.length,draw,ms:500,label:'Instruction'});
  X.seg(X.$('cmp-tile-mode'),m=>{mode=m;A.reset(L().lines.length)});
  X.seg(X.$('cmp-tile-a'),m=>{arch=m;A.reset(L().lines.length)});
  X.onResize(()=>A.redraw());
})();
