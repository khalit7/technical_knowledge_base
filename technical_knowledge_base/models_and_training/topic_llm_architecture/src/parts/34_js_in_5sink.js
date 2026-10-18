// Inside a real model: attention sinks (weight on token 0 by layer; the sliding-window before/after animation).
(function(){
  const I=window.IN;if(!I)return;const D=I.D,f=I.fmt,$=I.$;
  // ---- sink by layer ----
  (function(){const box=$('in-sksvg');if(!box)return;let m='smol';
    const mean=r=>r.reduce((a,b)=>a+b,0)/r.length;
    function draw(){const w=I.width(box);let series,n,note;
      if(m==='tiny'){const T=D.tiny;if(!T)return;series=[{y:T.before.sink.map(mean),c:'var(--dim)',dots:1},{y:T.after.sink.map(mean),c:'var(--c1)',dots:1}];n=6;
        note='Tiny GPT, running sequence (256 tokens, which starts with &lt;|endoftext|&gt;): at most '+f(Math.max(...T.after.sink.map(mean)),3)+' per layer after 1,500 steps; no sink has formed. Grey: at initialisation (weights are near uniform, so token 0 gets about the average share).'}
      else{const S=D[m];if(!S)return;series=[{y:S.sink_layer,c:'var(--c1)',dots:1}];if(S.abl.eot_first.sink_mass_by_layer)series.push({y:S.abl.eot_first.sink_mass_by_layer,c:'var(--c2)',dash:'4 3'});n=S.L;
        note=(m==='smol'?'SmolLM2-135M':'Qwen3-0.6B')+', running text ('+S.T+' tokens), mean over heads of the weight on token 0, queries from position 8. Dashed: the same with &lt;|endoftext|&gt; prepended (weight on that token).'}
      box.innerHTML=I.line({w,h:200,series,ymin:0,ymax:1,yticks:[0,.25,.5,.75,1],xticks:Array.from({length:n},(_,i)=>i).filter(i=>i%(n>10?(w<480?6:3):1)===0).map(i=>({x:i,l:String(i)})),xlab:'layer',ylab:'weight on token 0',label:'Attention on the first token by layer'})+
        (m==='tiny'?'<div class="in-leg"><span><i style="background:var(--dim)"></i>initialisation</span><span><i style="background:var(--c1)"></i>trained</span></div>':'<div class="in-leg"><span><i style="background:var(--c1)"></i>text as tokenised</span><span><i style="background:var(--c2)"></i>&lt;|endoftext|&gt; first</span></div>');
      $('in-sknote').innerHTML=note+' <span class="in-lbl m">measured here</span>'}
    I.seg($('in-skm'),v=>{m=v;draw()});I.onRender(draw);draw();
  })();
  // ---- window animation ----
  (function(){const S=D.smol;const box=$('in-wnsvg');if(!S||!box)return;
    const C=S.win_curves,W=S.win.W,NS=S.win.n_sink,TT=S.win.T,nb=C.full.length;
    const rules=[['full','full attention','var(--dim)'],['window','window '+W+' only','var(--bad)'],['window_sink','window '+W+' + first '+NS,'var(--good)']];
    function draw(i){const q=(i+1)*32-1,w=I.width(box),pl=46,bw=w-pl-10;let b='';const X=k=>pl+k/TT*bw;
      rules.slice(1).forEach((r,j)=>{const y=8+j*26;b+=I.t(pl-4,y+13,j?'+'+NS:'win',{a:'end',fs:10.5,fill:'var(--mute)'});
        b+='<rect x="'+pl+'" y="'+y+'" width="'+bw+'" height="16" fill="var(--soft)" stroke="var(--line)"/>';
        const lo=Math.max(0,q-W+1);b+='<rect x="'+X(lo)+'" y="'+y+'" width="'+Math.max(1.5,X(q+1)-X(lo))+'" height="16" fill="'+r[2]+'" opacity=".8"/>';
        if(j===1&&lo>0)b+='<rect x="'+X(0)+'" y="'+y+'" width="'+Math.max(2,X(NS)-X(0))+'" height="16" fill="'+r[2]+'"/>';
        b+='<line x1="'+X(q+1)+'" x2="'+X(q+1)+'" y1="'+(y-2)+'" y2="'+(y+18)+'" stroke="var(--ink)" stroke-width="1.5"/>'});
      b+=I.t(pl,70,'0',{fs:10.5,fill:'var(--mute)'})+I.t(X(q+1),70,'query '+(q+1),{a:q>TT*0.8?'end':'middle',fs:10.5})+I.t(pl+bw,70,String(TT),{a:'end',fs:10.5,fill:'var(--mute)'});
      const strip=I.svg(w,76,b,'Keys visible to the query under each rule');
      const cut=v=>v.map((x,k)=>k<=i?x:null);
      const chart=I.line({w,h:200,series:rules.map(r=>({x:C[r[0]].map((_,k)=>k*32+16),y:cut(C[r[0]]),c:r[2],dots:0,sw:r[0]==='full'?3:2})),xmin:0,xmax:TT,ymin:0,ymax:Math.ceil(Math.max(...C.window)+0.5),
        xticks:[0,256,512,768,1024].map(x=>({x,l:String(x)})),vlines:[{x:W,label:'window full'}],xlab:'position in the text',ylab:'loss per 32 tokens',label:'Loss by position under three rules'});
      box.innerHTML=strip+chart+'<div class="in-leg">'+rules.map(r=>'<span><i style="background:'+r[2]+'"></i>'+r[1]+'</span>').join('')+'</div>';
      const m=k=>{const v=C[k].slice(0,i+1);return v.reduce((a,b)=>a+b,0)/v.length};
      $('in-wncap').innerHTML='Tokens '+(i*32+1)+' to '+(q+1)+'. Mean loss so far: full '+f(m('full'),2)+', window only <b>'+f(m('window'),2)+'</b>, window + first '+NS+' <b>'+f(m('window_sink'),2)+'</b>. '+
        (q<W?'The window still contains the start of the text, so all three rules see exactly the same keys and give the same loss.':i<4?'The first tokens have just left the window: without them, every head that parked weight on token 0 must spread it over recent tokens instead.':'Window only stays about '+f(m('window')-m('full'),1)+' nats per token worse than full attention; four kept tokens bring it back within '+f(m('window_sink')-m('full'),2)+'. The remaining gap is real context the window cannot see.')}
    const a=I.anim({card:'in-wn',ctl:'in-wnctl',n:nb,draw,ms:900,label:'Query block'});
    I.onRender(()=>a&&a.redraw());
  })();
})();
