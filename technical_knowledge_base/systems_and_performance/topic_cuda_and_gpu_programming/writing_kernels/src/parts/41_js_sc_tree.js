// ---- Scenes, Figs. 2 and 3: reduce and scan on a toy GPU, level by level (renderer v2) ----
// The model is window.WKT (24_js_rd_treemodel.js, mirrored by src/tree_model.py): 16 values, warps of 4 lanes, 4 shared-memory banks.
// Each state of the array is a row of bars (height = value) standing in depth: the input at the back, each step's result one row
// nearer the viewer; dots flow from the value a thread reads to the one it writes. A row in shared memory sits on a teal glass strip
// with a barrier line in front of it; a row produced by shuffles has no strip (registers, no barrier). Under each value a lamp
// shows its lane: green working, orange idle in a warp that issued, grey not issued. Fig. 2 (#stg-red): R1, R2, R3 and the warp
// shuffle; Fig. 3 (#stg-scan): Hillis-Steele and Blelloch. Steps: the ol.sx lists sx-red-<mode> and sx-scan-<mode>.
(function(){
  if(!window.S3||!window.WKT)return;const {mix}=S3,T=window.WKT;
  const NAMES={r1:'Interleaved (R1)',r2:'Strided (R2)',r3:'Sequential (R3)',r5:'Warp shuffle',hs:'Scan: Hillis-Steele',bl:'Scan: Blelloch'};
  const XS=.46,X=t=>(t-(T.N-1)/2)*XS,DZ=1.3,Zr=i=>i*DZ,H=2.1/48;
  const WCK=['c1','c3','c2','c4'];
  function make(id,listPre,cntId,modes,fig){
    if(!document.getElementById(id))return null;
    let mode=modes[0],RUN=T.run(mode);const cnt=document.getElementById(cntId);
    function laneState(st,t){if(!st)return '';const w=Math.floor(t/T.WS);
      const act=st.kind==='shfl'?t<st.lanes:st.ops.some(o=>o.t===t);
      const issued=st.kind==='shfl'?t<st.lanes:st.ops.some(o=>Math.floor(o.t/T.WS)===w);return act?'act':issued?'idle':''}
    function row(R,i,a,cur){const P=R.P,v=RUN.states[i],st=i>0?RUN.S[i-1]:null,z=Zr(i),smem=!st||st.kind==='smem';
      if(smem)R.glass([X(0)-XS/2,.005,z-.26],[T.N*XS,0,0],[0,0,.52],{c:P.c6,a:a*.8,nu:T.N,nv:1,th:.02});
      for(let t=0;t<T.N;t++){const w=Math.floor(t/T.WS),c=P[WCK[w]];
        R.box([X(t),0,z],[.3,.04,.3],{a,shadow:false,lw:.6});
        const h=Math.max(.012,v[t]*H);R.box([X(t),.04,z],[.22,h,.22],{fill:mix(P.paper,c,.6),a,shadow:false,lw:.6});
        if(cur){R.label([X(t),.04+h,z],String(v[t]),{mono:true,fs:12,b:1,dy:-10,a,c:P.ink});
          const ls=laneState(st,t);if(st)R.box([X(t),0,z+.3],[.3,.03,.08],{fill:ls==='act'?P.good:ls==='idle'?P.bad:P.dim,a,shadow:false,edge:false})}}
      if(cur&&st&&st.kind==='smem')R.line([[X(0)-.25,.02,z+.42],[X(T.N-1)+.25,.02,z+.42]],{c:P.bad,w:2,dash:[6,4],a});
    }
    function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-1.6,13.6,.5);
      // the current row and the one it was computed from at full strength; earlier rows recede
      for(let i=0;i<=k;i++){const a=i===k?e:i===k-1?1:.18;if(a>.01)row(R,i,a,i===k)}
      if(k===0){for(let t=0;t<T.N;t++)R.label([X(t),0,.3],'b'+(t%T.NB),{mono:true,fs:12,c:P.mute,dy:10,wide:1});
        for(let w=0;w<T.N/T.WS;w++)R.label([X(w*T.WS+1.5),0,.5],'warp '+w,{mono:true,fs:12.5,b:1,c:P[WCK[w]],dy:22,wide:1})}
      if(k>0){const st=RUN.S[k-1],z0=Zr(k-1),z1=Zr(k),prev=RUN.states[k-1],sh=st.kind==='shfl';
        st.ops.forEach(o=>{if(o.zero||o.s<0)return;const c=sh?P.c3:o.swap?P.c2:P.acc,h0=.06+prev[o.s]*H;
          R.flowArc([X(o.s),h0,z0],[X(o.d),.08,z1],.45+.05*Math.abs(o.s-o.d),{c,a:e,r:.075,n:7,speed:1.4})});
        const lab=sh?'shuffle: registers, no barrier':'shared memory, then __syncthreads()';
        R.label([0,0,z1+.55],lab,{mono:true,fs:12.5,b:1,dy:12,c:sh?P.c3:P.c6,a:e,wide:1});
        if(st.ops.some(o=>o.zero))R.label([X(T.N-1),.1,z1],'set to 0',{mono:true,fs:12,b:1,c:P.c2,dy:-26,a:e})}
    }
    const view=k=>({cam:[.1,.62],bounds:[[-4.1,0,Zr(Math.max(0,k-1))-.6],[4.1,2.2,Zr(k)+.9]]});
    const st=S3.stage({id,list:listPre+mode,fig,cam:[.1,.62],bounds:[[-4.1,0,-.6],[4.1,2.2,2.2]],aspect:.6,dur:1300,hold:4400,draw,view,
      margin:w=>w<520?[18,10,14,10]:[20,16,22,16],onStep:k=>counts(k)});
    function counts(k){if(!cnt)return;const c={adds:0,idle:0,barrier:0,shfl:0,tx:0,worst:1};for(let j=0;j<k;j++){const x=RUN.cs[j];['adds','idle','barrier','shfl','tx'].forEach(q=>c[q]+=x[q]);c.worst=Math.max(c.worst,x.worst)}
      cnt.innerHTML=RD.stat('Additions',c.adds)+RD.stat('Idle lanes',c.idle)+RD.stat('Barriers',c.barrier)+RD.stat('Shuffles',c.shfl)+RD.stat('Shared-mem transactions',c.tx)+RD.stat('Worst bank conflict',c.worst+'-way')}
    const chips=document.getElementById(id+'-m');
    if(chips)RD.seg(chips,m=>{mode=m;RUN=T.run(m);modes.forEach(x=>{const l=document.getElementById(listPre+x);if(l)l.hidden=x!==m});st.list(listPre+m);table()});
    counts(0);
    (window.WKSTG=window.WKSTG||{})[id]=st;
    return st;
  }
  make('stg-red','sx-red-','tr-cnt',['r1','r2','r3','r5'],'Fig. 2 · one block sums 16 values');
  make('stg-scan','sx-scan-','sc-cnt',['hs','bl'],'Fig. 3 · two scans of the same 16 values');
  // the totals of all six on the same input (closed table in section 2)
  function table(){const t=document.getElementById('tr-tab');if(!t)return;
    t.innerHTML='<tr><th>Method</th><th class="num">steps</th><th class="num">additions</th><th class="num">active lanes</th><th class="num">idle lanes</th><th class="num">barriers</th><th class="num">shuffles</th><th class="num">smem transactions</th><th class="num">worst conflict</th></tr>'+
      ['r1','r2','r3','r5','hs','bl'].map(m=>{const x=T.run(m).tot;return '<tr><td>'+NAMES[m]+'</td><td class="num">'+x.steps+'</td><td class="num">'+x.adds+'</td><td class="num">'+x.active+'</td><td class="num">'+x.idle+'</td><td class="num">'+x.barrier+'</td><td class="num">'+x.shfl+'</td><td class="num">'+x.tx+'</td><td class="num">'+x.worst+'-way</td></tr>'}).join('')}
  table();
})();
