// ---- Reading, section 4: Model Runner V1 against V2 on the same event (toggle-compare; mechanism from the MRV2 design doc and V1's gpu_input_batch.py at v0.31.0; requests illustrative) ----
(function(){
  const el=document.getElementById('vl-mr');if(!el)return;
  const cap=document.getElementById('vl-mr-cap'),cnt=document.getElementById('vl-mr-cnt');
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fs:11.5},o||{}));
  const KIND={A:'decode',B:'finished',C:'decode',D:'decode',E:'prefill'};
  const M={
    v1:{after:['A','D','C','E'],hot:[1,3],input:['A','D','C','E'],gather:[0,1,2,3],same:true,
      cap:'<div class="t">V1: the state rows are the model input</div><p>E fills B\'s empty row 1; the attention backend wants decodes before prefills, so rows 1 and 3 are swapped and D\'s whole state (token ids, block table, sampling settings) is copied. A backup copy of every request\'s state, <span class="mono">CachedRequestState</span>, is kept because rows can be overwritten while a request is still active.</p>'},
    v2:{after:['A','E','C','D'],hot:[1],input:['A','C','D','E'],gather:[0,2,3,1],same:false,
      cap:'<div class="t">V2: rows stay put, the input is gathered</div><p>E takes B\'s freed row 1 for its whole life and nothing else moves. The step\'s input is gathered from rows 0, 2, 3, 1 on the GPU, in whatever order the attention backend asks for; no backup copy is needed.</p>'}};
  let mode='v1';
  function draw(){const o=M[mode],w=RD.width(el),gap=Math.min(56,w*.1),cw=(w-2*gap)/3,rh=26,y0=(w<520?34:22),X=[0,cw+gap,2*(cw+gap)];
    let b='';const hd=['step N: state rows','step N+1: state rows','step N+1: model input'];
    hd.forEach((h,i)=>{const p=w<520?h.split(': '):[h];p.forEach((t,k)=>b+=T(X[i],12+k*13,t,{w:600,fs:11}))});
    const box=(x,y,r,lab,cls,dash)=>'<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+(rh-4)+'" rx="4" class="'+cls+'"'+(dash?' style="stroke-dasharray:4 3"':'')+'></rect>'+T(x+7,y+15,lab,{fs:11});
    ['A','B','C','D'].forEach((r,i)=>{b+=box(X[0],y0+i*rh,i,(w<520?'':'row ')+i+': '+r+(w<520?'':' ('+(r==='B'?'finishes':'decode')+')'),r==='B'?'bxh':'bx',r==='B')});
    o.after.forEach((r,i)=>{b+=box(X[1],y0+i*rh,i,(w<520?'':'row ')+i+': '+r+(w<520?'':' ('+KIND[r]+')'),o.hot.indexOf(i)>=0?'bxa':'bx')});
    o.input.forEach((r,i)=>{b+=box(X[2],y0+i*rh,i,r+(w<520?'':' ('+KIND[r]+')')+(o.same?'':(w<520?' ←'+o.gather[i]:'  ← row '+o.gather[i])),o.same?'bxh':'bx',o.same)});
    // links state -> input
    o.gather.forEach((g,i)=>{b+='<line x1="'+(X[1]+cw+2)+'" y1="'+(y0+g*rh+11)+'" x2="'+(X[2]-2)+'" y2="'+(y0+i*rh+11)+'" class="ar"'+(o.same?' stroke-dasharray="3 3"':'')+'></line>'});
    b+=T(X[1]+cw+gap/2,y0+4*rh+12,o.same?'same memory':'GPU gather',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y0+4*rh+18,b,'model runner rows before and after one request finishes and one joins');
    cap.innerHTML=o.cap;
    cnt.innerHTML=RD.stat('State rows written',mode==='v1'?'2':'1',mode==='v1'?'rows 1 and 3 (E, then the swap with D)':'row 1 (E)')+RD.stat('Backup copy of request state',mode==='v1'?'yes':'none',mode==='v1'?'CachedRequestState':'preemption is treated as completion')+RD.stat('Model input',mode==='v1'?'the state rows':'gathered',mode==='v1'?'layout and order fixed by the state':'from fixed rows, on the GPU');
  }
  RD.seg(document.getElementById('vl-mr-seg'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
