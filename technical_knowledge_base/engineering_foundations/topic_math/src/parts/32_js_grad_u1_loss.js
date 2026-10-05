// ---- Gradient lab: 1. loss explorer ----
(function(){
  const U=GLU,$=U.$,G=GL;
  const S={loss:'mse',z:[2,1,0],zs:1.5,ymse:1,half:true,ybce:1,t:2,eps:0.1,gamma:2,lh:-5,sel:2};
  const TOK=['cat','dog','sat'];
  const scalar=()=>S.loss==='mse'||S.loss==='bce';
  const opts=()=>({y:S.loss==='mse'?S.ymse:S.ybce,half:S.half,t:S.t,eps:S.eps,gamma:S.gamma});
  const zin=()=>scalar()?[S.zs]:S.z.slice();
  const Lf=v=>G.LOSS[S.loss].L(v,opts());
  function ctl(){let h='';
    if(scalar()){h+='<label>Raw output <i>z</i>: <b id="gl-zsV"></b><input type="range" id="gl-zs" min="-6" max="6" step="0.01" value="'+S.zs+'" aria-label="Raw output z"></label>';
      if(S.loss==='mse')h+='<label>Target <i>y</i>: <b id="gl-ymV"></b><input type="range" id="gl-ym" min="-3" max="3" step="0.1" value="'+S.ymse+'" aria-label="Target y"></label><label class="gl-inl"><input type="checkbox" id="gl-half"'+(S.half?' checked':'')+'> use the ½ convention</label>';
      else h+='<label>Label <i>y</i><select id="gl-yb"><option value="1"'+(S.ybce===1?' selected':'')+'>1 (yes)</option><option value="0"'+(S.ybce===0?' selected':'')+'>0 (no)</option></select></label>';}
    else{TOK.forEach((n,i)=>{h+='<label>Logit z<sub>'+(i+1)+'</sub> ('+n+'): <b id="gl-zV'+i+'"></b><input type="range" id="gl-z'+i+'" min="-5" max="5" step="0.01" value="'+S.z[i]+'" aria-label="Logit for '+n+'"></label>'});
      h+='<label>Correct token<select id="gl-tok">'+TOK.map((n,i)=>'<option value="'+i+'"'+(S.t===i?' selected':'')+'>'+n+'</option>').join('')+'</select></label>';
      if(S.loss==='ls')h+='<label>Smoothing ε: <b id="gl-epsV"></b><input type="range" id="gl-eps" min="0" max="0.5" step="0.01" value="'+S.eps+'" aria-label="Smoothing epsilon"></label>';
      if(S.loss==='focal')h+='<label>Focus γ: <b id="gl-gamV"></b><input type="range" id="gl-gam" min="0" max="5" step="0.1" value="'+S.gamma+'" aria-label="Focal gamma"></label>';
      h+='<label>Plot the loss against<select id="gl-sel">'+TOK.map((n,i)=>'<option value="'+i+'"'+(S.sel===i?' selected':'')+'>z'+(i+1)+' ('+n+')</option>').join('')+'</select></label>';}
    h+='<label>Nudge size <i>h</i> = <b id="gl-hV"></b><input type="range" id="gl-h" min="-12" max="-1" step="1" value="'+S.lh+'" aria-label="Nudge size exponent"></label>';
    h+='<div><button id="gl-lreset">Back to the worked example (sat correct)</button>'+(scalar()?'':' <button id="gl-l4h" title="The old page\'s worked example: the same logits, with cat as the correct token">Four-hats example (cat correct, loss 0.408)</button>')+'</div>';
    $('gl-lossCtl').innerHTML=h;
    const on=(id,fn)=>{const el=$(id);if(el)el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input',()=>{fn(el);draw()})};
    on('gl-zs',el=>S.zs=+el.value);on('gl-ym',el=>S.ymse=+el.value);on('gl-half',el=>S.half=el.checked);on('gl-yb',el=>S.ybce=+el.value);
    [0,1,2].forEach(i=>on('gl-z'+i,el=>S.z[i]=+el.value));on('gl-tok',el=>S.t=+el.value);on('gl-eps',el=>S.eps=+el.value);on('gl-gam',el=>S.gamma=+el.value);
    on('gl-sel',el=>S.sel=+el.value);on('gl-h',el=>S.lh=+el.value);
    const f4=$('gl-l4h');if(f4)f4.addEventListener('click',()=>{Object.assign(S,{z:[2,1,0],t:0,sel:0,lh:-5});ctl();draw()});
    $('gl-lreset').addEventListener('click',()=>{Object.assign(S,{z:[2,1,0],zs:S.loss==='mse'?1.5:2,ymse:1,half:true,ybce:1,t:2,eps:0.1,gamma:2,lh:-5,sel:2});ctl();draw()});
  }
  function draw(){const v=zin(),o=opts(),L=Lf(v),an=G.LOSS[S.loss].g(v,o),h=Math.pow(10,S.lh),nu=G.numgrad(Lf,v,h),pr=G.LOSS[S.loss].pred(v),tg=G.LOSS[S.loss].targ(o);
    const set=(id,s)=>{const el=$(id);if(el)el.textContent=s};
    set('gl-zsV',U.f(S.zs,2));set('gl-ymV',U.f(S.ymse,1));[0,1,2].forEach(i=>set('gl-zV'+i,U.f(S.z[i],2)));set('gl-epsV',U.f(S.eps,2));set('gl-gamV',U.f(S.gamma,1));set('gl-hV','10^'+S.lh);
    const hv=$('gl-hV');if(hv)hv.innerHTML='10<sup>'+String(S.lh).replace('-','−')+'</sup>';
    const maxd=Math.max(...an.map((a,i)=>Math.abs(a-nu[i])));
    let extra='';if(S.loss==='focal'){extra=U.stat('Weight <i>w</i>',U.f(G.focalW(pr[S.t],S.gamma),3),'gradient = w × (p − y)')}
    if(S.loss==='mse')extra=U.stat('Gradient formula',S.half?'ŷ − y':'2(ŷ − y)',S.half?'with the ½':'without the ½');
    $('gl-lossOut').innerHTML=U.stat('Loss',U.f(L,4),S.loss==='mse'?'squared miss':'nats ('+U.f(L/Math.LN2,3)+' bits)')+extra+
      U.stat('Analytic vs numerical, largest gap',U.e(maxd,1),maxd<1e-6?'<span class="gl-ok">agree</span>':'<span class="gl-bad">differ: h is too large or too small</span>');
    const rows=scalar()?['output']:['cat','dog','sat'];
    const cols=scalar()?['<i>z</i>']:rows.map((r,i)=>'z<sub>'+(i+1)+'</sub> ('+r+')');
    const line=(nm,arr,fn,b)=>'<tr><td>'+nm+'</td>'+arr.map((v,i)=>'<td class="num">'+(b?'<b>':'')+fn(v,i)+(b?'</b>':'')+'</td>').join('')+'</tr>';
    let tb='<tr><th></th>'+cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>'+
      line('prediction',pr,v=>U.f(v,4))+line('target',tg,v=>U.f(v,4))+line('prediction \u2212 target',pr,(v,i)=>U.f(v-tg[i],4))+
      line('analytic gradient',an,v=>U.f(v,4),true)+line('numerical gradient',nu,v=>U.f(v,6))+line('gap',an,(v,i)=>U.e(Math.abs(v-nu[i]),1));
    $('gl-lossTbl').innerHTML=tb;
    curve(v,o,an);fdPlot(v);
  }
  // loss against one input, with the tangent line from the analytic gradient
  function curve(v,o,an){const el=$('gl-curve'),W=Math.min(U.width(el),460),H=200,pad={l:40,r:10,t:10,b:28};const k=scalar()?0:S.sel;
    const lo=-6,hi=6,xs=[];for(let i=0;i<=120;i++)xs.push(lo+(hi-lo)*i/120);
    const ys=xs.map(x=>{const w=v.slice();w[k]=x;return Lf(w)}).map(y=>isFinite(y)?y:NaN);
    const ymax=Math.max(0.5,Math.min(12,Math.max(...ys.filter(isFinite))));
    const X=x=>pad.l+(x-lo)/(hi-lo)*(W-pad.l-pad.r),Y=y=>pad.t+(1-Math.min(y,ymax*1.05)/(ymax*1.05))*(H-pad.t-pad.b);
    let b='';for(let gx=-6;gx<=6;gx+=2){b+=U.ln(X(gx),pad.t,X(gx),H-pad.b,'var(--line)')+U.t(X(gx),H-pad.b+14,String(gx).replace('-','−'),{a:'middle',fs:10,c:'var(--mute)'})}
    [0,ymax/2,ymax].forEach(yy=>{b+=U.ln(pad.l,Y(yy),W-pad.r,Y(yy),'var(--line)')+U.t(pad.l-4,Y(yy)+3,U.f(yy,1),{a:'end',fs:10,c:'var(--mute)'})});
    b+=U.pl(xs.map((x,i)=>[X(x),Y(ys[i])]).filter(p=>isFinite(p[1])),'var(--c1)',{w:2});
    const x0=v[k],y0=Lf(v),s=an[k],d=1.6;b+=U.pl([[X(x0-d),Y(Math.max(0,y0-s*d))],[X(x0+d),Y(Math.max(0,y0+s*d))]],'var(--c2)',{w:1.6,dash:'5 3'});
    b+=U.dot(X(x0),Y(y0),4,'var(--c2)');
    b+=U.t(W-pad.r,pad.t+10,'slope '+U.f(s,3),{a:'end',fs:11,c:'var(--c2)'});
    b+=U.t((pad.l+W-pad.r)/2,H-2,scalar()?'z':'z'+(k+1)+' ('+['cat','dog','sat'][k]+'), others fixed',{a:'middle',fs:10.5,c:'var(--mute)'});
    el.innerHTML=U.svg(W,H,b,'Loss curve with tangent line')}
  // error of the central difference against h, for the plotted input
  function fdPlot(v){const el=$('gl-fdPlot'),W=Math.min(U.width(el),460),H=200,pad={l:44,r:10,t:10,b:28};const k=scalar()?0:S.sel;
    const an=G.LOSS[S.loss].g(v,opts())[k];const pts=[];for(let p=-12;p<=-1;p+=0.25){const h=Math.pow(10,p);const n=G.numgrad(Lf,v,h)[k];pts.push([p,Math.log10(Math.max(Math.abs(n-an),1e-17))])}
    const X=p=>pad.l+(p+12)/11*(W-pad.l-pad.r),Y=q=>pad.t+(1-(q+17)/17)*(H-pad.t-pad.b);
    let b='';for(let p=-12;p<=-1;p+=2)b+=U.ln(X(p),pad.t,X(p),H-pad.b,'var(--line)')+U.t(X(p),H-pad.b+14,'1e'+String(p).replace('-','−'),{a:'middle',fs:10,c:'var(--mute)'});
    [-16,-12,-8,-4,0].forEach(q=>{b+=U.ln(pad.l,Y(q),W-pad.r,Y(q),'var(--line)')+U.t(pad.l-4,Y(q)+3,'1e'+String(q).replace('-','−'),{a:'end',fs:10,c:'var(--mute)'})});
    b+=U.pl(pts.map(p=>[X(p[0]),Y(p[1])]),'var(--c3)',{w:1.8});
    const cur=Math.log10(Math.max(Math.abs(G.numgrad(Lf,v,Math.pow(10,S.lh))[k]-an),1e-17));b+=U.dot(X(S.lh),Y(cur),4.5,'var(--c2)');
    b+=U.t(X(-11.8),Y(-1),'← rounding error',{fs:10,c:'var(--mute)'})+U.t(X(-1.2),Y(-1),'formula error →',{a:'end',fs:10,c:'var(--mute)'});
    b+=U.t((pad.l+W-pad.r)/2,H-2,'nudge size h',{a:'middle',fs:10.5,c:'var(--mute)'});
    el.innerHTML=U.svg(W,H,b,'Finite difference error against h')}
  // the three canonical pairs at their worked examples, side by side
  function canon(){const r=[['MSE, identity output','z = 1.5, y = 1',G.LOSS.mse.pred([1.5])[0],1,G.LOSS.mse.g([1.5],{y:1,half:true})[0]],
      ['BCE, sigmoid','z = 2, y = 1',G.sig(2),1,G.LOSS.bce.g([2],{y:1})[0]],
      ['Softmax CE (sat entry)','z = (2, 1, 0), sat',G.softmax([2,1,0])[2],1,G.LOSS.ce.g([2,1,0],{t:2})[2]]];
    $('gl-canon').innerHTML='<tr><th>pair</th><th>input</th><th class="num">prediction</th><th class="num">target</th><th class="num">prediction − target</th><th class="num">gradient</th></tr>'+
      r.map(x=>'<tr><td>'+x[0]+'</td><td>'+x[1].replace(/-/g,'−')+'</td><td class="num">'+U.f(x[2],3)+'</td><td class="num">'+x[3]+'</td><td class="num">'+U.f(x[2]-x[3],3)+'</td><td class="num"><b>'+U.f(x[4],3)+'</b></td></tr>').join('')}
  U.seg($('gl-lossSeg'),m=>{S.loss=m;if(m==='mse')S.zs=1.5;if(m==='bce')S.zs=2;document.querySelectorAll('#t-grad .gl-der').forEach(d=>d.classList.toggle('on',d.dataset.l===m));ctl();draw()});
  ctl();canon();draw();U.onRender(draw);U.onResize(draw);
})();
