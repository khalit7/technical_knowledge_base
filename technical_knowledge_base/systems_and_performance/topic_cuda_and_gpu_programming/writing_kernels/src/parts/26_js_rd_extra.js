// ---- Reading section 4: the softmax ladder (root Kernel lab runs, window.WKL.softmax) and the passes of residual + RMSNorm ----
(function(){
  const L=window.WKL,esc=RD.esc;
  const bx=document.getElementById('wk-smx');
  if(bx&&L&&L.softmax){
    const order=['E','EC','S1','S2','S3','S4','S5','S6','L'],by={};L.softmax.forEach(c=>by[c.step]=c);
    const copy=512*1048576/164.7e9*1e3; // 512 MiB at the lab's measured copy rate, 164.7 GB/s
    const rows=order.filter(k=>by[k]).map(k=>[by[k].name,by[k].ms,/MLX|eager/.test(by[k].name)?'var(--c4)':'var(--c1)'])
      .concat([['plain copy of the same bytes (derived)',copy,'var(--dim)']]);
    const mx=Math.max(...rows.map(r=>r[1]));
    bx.innerHTML=rows.map(r=>'<div class="row"><span class="nm">'+esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*r[1]/mx).toFixed(1)+'%;background:'+r[2]+'"></span></span><span class="val">'+r[1].toFixed(2)+' ms</span></div>').join('')+
      '<div class="wk-leg"><span style="--sw:var(--c1)">hand-written rungs</span><span style="--sw:var(--c4)">MLX eager, compiled or library</span><span style="--sw:var(--dim)">copy, for scale</span></div>';
  }
  const host=document.getElementById('wk-pass');
  function pass(){
    const W=Math.min(640,RD.width(host)),rowH=104,H=2*rowH+6;
    const RC='var(--c1)',WC='var(--c2)';
    let s='<defs>'+[['r',RC],['w',WC]].map(([k,c])=>'<marker id="wk-ah-'+k+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="'+c+'"/></marker>').join('')+'</defs>';
    function row(y0,title,kernels){
      const mem=y0+20,kt=y0+70;
      s+=RD.t(0,y0+11,title,{fs:12,w:700});
      s+='<rect x="0" y="'+mem+'" width="'+W+'" height="20" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(W-6,mem+14,'global memory',{a:'end',fs:11,fill:'var(--mute)'});
      kernels.forEach(k=>{const cx=W*k.at,bw=Math.min(W*0.4,k.w);
        s+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+kt+'" width="'+bw.toFixed(1)+'" height="24" rx="5" fill="var(--acc2)" stroke="var(--acc)"/>'+RD.t(cx.toFixed(1),kt+16,k.name,{a:'middle',fs:11,w:600});
        const n=k.io.length,sp=Math.min(30,(bw-16)/Math.max(1,n-1));
        k.io.forEach((io,j)=>{const x=cx+(j-(n-1)/2)*sp,rd=io[1]==='r';
          s+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(rd?mem+21:kt-1)+'" y2="'+(rd?kt-2:mem+22)+'" stroke="'+(rd?RC:WC)+'" stroke-width="2" marker-end="url(#wk-ah-'+(rd?'r':'w')+')"/>'+
            RD.t((x+3).toFixed(1),mem+38,io[0],{fs:11,w:600,fill:rd?RC:WC})});
      });
    }
    row(0,'Separate kernels: 5 passes over the activations',[{name:'add',at:0.27,w:120,io:[['x','r'],['r','r'],['h','w']]},{name:'rms_norm',at:0.72,w:110,io:[['h','r'],['y','w']]}]);
    row(rowH,'Fused: 4 passes, h never read back',[{name:'add + rms_norm',at:0.5,w:190,io:[['x','r'],['r','r'],['h','w'],['y','w']]}]);

    host.innerHTML=RD.svg(W,H,s,'Residual add and RMSNorm: separate kernels move 5 passes, the fused kernel 4')+
      '<div class="wk-leg"><span style="--sw:var(--c1)">read from global memory</span><span style="--sw:var(--c2)">written to global memory</span></div>';
  }
  if(host){pass();RD.onRender(pass);RD.onResize(pass)}
})();
