// ---- Scene (Fig. 4): seq2seq on the digit-copy toy, the fixed vector against Bahdanau attention (renderer v2) ----
// The two trained GRU encoder-decoders (S2S in 25_js_s2s.js, outputs equal to PyTorch's on 8 references, check_page.mjs) on the digits
// the reader types (default: 12 digits of pi). Back: the encoder states, one strip of 32 numbers per digit (blue +, orange -);
// right: the outputs, one per row; floor: the attention weights, one row per output (the alignment matrix as a bar field).
// The step list's numbers are static spans (data-s2) for the default digits, rewritten here for whatever is typed; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-s2s')||!window.S3||!window.S2S)return;const {at,off,lerp,mix}=S3;
  const HN=S2S.H,lab=y=>y===S2S.EOS?'end':String(y);
  let X=[3,1,4,1,5,9,2,6,5,3,5,8],D=null;
  function compute(){const L=X.length,fx=S2S.fixed.decode(X,L+1),at=S2S.attention.decode(X,L+1);
    const ok=r=>r.out.map((y,t)=>y===(t<L?X[t]:S2S.EOS));fx.ok=ok(fx);at.ok=ok(at);
    const fr=fx.ok.slice(0,L).filter(Boolean).length,ar=at.ok.slice(0,L).filter(Boolean).length,fw=fx.ok.slice(0,L).indexOf(false);
    const ts=fw>=0?fw:Math.floor(L/2),row=at.atts[ts],tj=row.indexOf(Math.max(...row));
    const XS=Math.min(.62,8.4/L),DZ=Math.min(.42,5.2/(L+1));
    D={L,fx,at,fr,ar,fw,ts,tj,XS,DZ,mx:Math.max(...fx.hs.flat().map(Math.abs),...at.hs.flat().map(Math.abs))};
    const F={L:L,H:HN,L2:L,L3:L,L4:L,L5:L,fr,ar,t:ts+1,tw:Math.round(100*row[tj])+'%',tj:tj+1,tx:X[tj],
      fwc:fw>=0?'; the first wrong one is output '+(fw+1)+', where it wrote '+lab(fx.out[fw])+' for '+X[fw]:fr===L?'; this string fits':''};
    document.querySelectorAll('[data-s2]').forEach(e=>{if(F[e.dataset.s2]!=null)e.textContent=F[e.dataset.s2]});
    const o=$('sa-out');if(o)o.textContent='Fixed vector: '+fx.out.map(lab).join(' ')+' ('+fr+' of '+L+' right) · Attention: '+at.out.map(lab).join(' ')+' ('+ar+' of '+L+' right)';
    window.SQ_S2S={D,F,X:X.slice()};return D}
  compute();
  const ZE=-2.1,ZF0=-.95,HS=1.45,YS=.12,HB=.85;
  function draw(R,k,e){const P=R.P,{L,fx,at:atn,XS,DZ,ts}=D,x=j=>(j-(L-1)/2)*XS,xo=x(L-1)+XS/2+.8,z=t=>ZF0+t*DZ,narrow=R.W<520;
    R.grid(-6,6.5,-2.8,ZF0+(L+1)*DZ+.6,.5);
    const pos=mix(P.paper,P.c1,.95),neg=mix(P.paper,P.c2,.95);
    const att=k>=3,hsx=att?atn.hs:fx.hs,ch=HS/HN;
    // the encoder: input digits and one strip of states per digit, built left to right in step 1
    const built=k===0?e*L:L;
    for(let j=0;j<L;j++){const ap=Math.max(0,Math.min(1,built-j)),dim=k>=1&&k<=2&&j<L-1?.18:1,a=ap*dim;
      R.box([x(j),0,ZE+.62],[XS*.7,.22,.32],{fill:P.paper,a:Math.max(.25,ap)});R.label([x(j),.22,ZE+.62],String(X[j]),{serif:true,fs:L>18?12:13.5,dy:-9,a:Math.max(.4,ap)});
      if(a<=.01)continue;const h=hsx[j],x0=x(j)-XS*.34,x1=x(j)+XS*.34;
      R.box([x(j),0,ZE],[XS*.78,YS,.22],{a,shadow:false});
      for(let u=0;u<HN;u++){const v=h[u]/D.mx,y0=YS+u*ch;R.quad([[x0,y0,ZE+.12],[x1,y0,ZE+.12],[x1,y0+ch,ZE+.12],[x0,y0+ch,ZE+.12]],{fill:mix(P.paper,v>=0?P.c1:P.c2,Math.min(1,Math.abs(v))*.95),edge:false,a})}
      if(k===0&&j>0&&ap>0)R.flow([[x(j-1)+XS*.3,YS+HS+.12,ZE+.1],[x(j)-XS*.3,YS+HS+.12,ZE+.1]],{c:P.c1,a:ap,r:.045,n:2,speed:.8})}
    if(k===1||k===2){const a=k===1?e:1;R.box([x(L-1),YS+HS,ZE+.12],[XS*.86,.04,.06],{fill:P.acc,a});
      R.label([x(L-1),YS+HS+.05,ZE],'h'+String(L).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d])+' · the only vector passed on',{mono:true,fs:12.5,b:1,al:'right',dx:4,dy:-12,c:P.acc,a,wide:1})}
    // the outputs, one per row on the right
    const outs=att?atn:fx,showOut=t=>k===2?Math.min(1,Math.max(0,e*1.3*(L+1)-t)):k===3?(t===ts?e:0):k===5?Math.min(1,Math.max(0,e*1.3*(L+1)-t)):0;
    for(let t=0;t<=L;t++){const a=showOut(t);R.box([xo,0,z(t)],[.42,.22,DZ*.7],{fill:a>0?mix(P.paper,outs.ok[t]?P.good:P.bad,.55):P.paper,a:Math.max(.14,a)});
      if(a>0)R.label([xo,.22,z(t)],lab(outs.out[t]),{serif:true,fs:13,b:1,al:'left',dx:14,c:outs.ok[t]?P.good:P.bad,a})}
    // the fixed vector: every output reads the same last state
    if(k===2)for(let t=0;t<=L;t++){const a=Math.min(1,Math.max(0,e*1.3*(L+1)-t));if(a>0)R.flowArc([x(L-1),YS+HS,ZE+.15],[xo,.24,z(t)],.5,{c:P.acc,a:a*.75,r:.045,n:4,speed:1.2})}
    // attention: the weights of each output row, as columns over the source positions
    if(att){const rows=k===3?[ts]:[...Array(L+1).keys()],ar=t=>k===3?e:k===4?Math.min(1,Math.max(0,e*1.25*(L+1)-t)):1;
      rows.forEach(t=>{const w=atn.atts[t],a=ar(t);if(a<=0)return;const hl=k===3||t===ts;
        w.forEach((v,j)=>{if(v<.01)return;R.box([x(j),0,z(t)],[XS*.62,Math.max(.012,v*HB*a),DZ*.62],{fill:mix(P.paper,P.c3,.25+.75*Math.min(1,v*1.6)),a:hl?1:.85,shadow:false,lw:.5})});
        if(k===3){w.forEach((v,j)=>{if(v<.02)return;R.flowArc([x(j),YS+HS*.5,ZE+.15],[xo,.24,z(t)],.35,{c:P.c3,a:.3+.7*Math.min(1,v*2),r:.035+.05*v,n:Math.max(2,Math.round(2+12*v)),speed:1.1})});
          R.label([x(D.tj),w[D.tj]*HB,z(t)],Math.round(100*w[D.tj])+'%',{mono:true,fs:12.5,b:1,dy:-11,c:P.c3})}});
      if(k===3)R.label([xo,.22,z(ts)],'output '+(ts+1),{mono:true,fs:12,al:'left',dx:28,dy:-8,c:P.mute,a:e,wide:1})}
    // tallies and row labels
    if(k===2)R.label([xo,.3,z(L)],D.fr+' of '+L+' right',{mono:true,fs:12.5,b:1,al:'left',dx:30,dy:14,c:P.ink,a:e,wide:1});
    if(k===5)R.label([xo,.3,z(L)],D.ar+' of '+L+' right',{mono:true,fs:12.5,b:1,al:'left',dx:30,dy:14,c:P.ink,a:e,wide:1});
    const LX=x(0)-XS/2-.25;
    R.label([LX,0,ZE+.62],'input digits',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});
    R.label([LX,YS+HS*.6,ZE],'encoder states · 32 each',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});
    if(att)R.label([LX,0,z(Math.floor(L/2))],'attention weights · a row per output',{al:'right',dx:-6,mono:true,fs:12,c:P.c3,grp:'row'});
    if(k>=2)R.label([xo,.25,z(0)-.15],att?'outputs · attention':'outputs · fixed vector',{mono:true,fs:12,b:1,dy:-24,al:'left',c:P.ink,wide:1})
  }
  function B(){const {L,XS,DZ}=D,x0=-(L-1)/2*XS-XS/2,x1=(L-1)/2*XS+XS/2+1.4;return [[x0-.2,0,ZE-.2],[x1,1.75,ZF0+(L+1)*DZ]]}
  const st=S3.stage({id:'stg-s2s',list:'sx-s2s',fig:'Fig. 4 · two trained encoder-decoders copy digits',cam:[-.3,.7],bounds:()=>B(),aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,12,8]:[20,16,14,200],
    view:k=>k>=3?{cam:[-.2,.98],bounds:[[B()[0][0],0,ZE-.2],[B()[1][0],.9,B()[1][2]]]}:k<=1?{cam:[-.35,.55],bounds:[[B()[0][0],0,ZE-.2],[B()[1][0],1.8,ZF0+.4]]}:null});
  // the reader's digits
  const inp=$('sa-in'),msg=$('sa-msg');
  function setX(x){X=x;inp.value=x.join('');msg.textContent='';compute();if(st)st.list('sx-s2s')}
  inp.value=X.join('');
  inp.addEventListener('change',e=>{const v=e.target.value.replace(/\s/g,'');if(!/^[0-9]{2,30}$/.test(v)){msg.textContent='Type 2 to 30 digits.';return}setX(v.split('').map(Number))});
  let seed=12345;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  $('sa-rand').addEventListener('click',()=>{const n=+$('sa-len').value;setX(Array.from({length:n},()=>Math.floor(rnd()*10)))});
  $('sa-len').addEventListener('input',e=>{$('sa-lenv').textContent=e.target.value});
  window.__sa={setX,get D(){return D}};
})();
