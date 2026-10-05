// ---- Reading s4: a block tree sum with and without __syncthreads(), toy block of 16 threads in two warps of 8 ----
(function(){
  const fig=document.getElementById('pm-rc-fig');if(!fig)return;
  const cap=document.getElementById('pm-rc-cap'),cnt=document.getElementById('pm-rc-cnt');
  const X=[3,1,4,1,5,9,2,6,5,3,5,8,9,7,9,3];
  function sim(bar){
    const st=[];let s=new Array(16).fill(null),stale=0,owner=new Array(16).fill(-1);
    const push=(o)=>st.push(Object.assign({s:s.slice(),owner:owner.slice(),stale},o));
    const store=(w)=>{for(let t=8*w;t<8*w+8;t++){s[t]=X[t];owner[t]=w}};
    const level=(k)=>{const rd=[];const p=s.slice();for(let t=0;t<k;t++){const a=p[t]===null?0:p[t],b=p[t+k];if(b===null){stale++;rd.push(t+k)}s[t]=a+(b===null?0:b);owner[t]=0}return rd};
    push({t:'Start',p:'Both warps issue their load of x from global memory. Shared memory s[0..15] is empty.',w0:'loading x[0..7]',w1:'loading x[8..15]',arr:0});
    store(0);
    if(bar){
      push({t:'Warp 0 stores and waits',p:'Warp 0\'s load arrived: s[0..7] written. It reaches __syncthreads() and waits: 8 of 16 threads have arrived.',w0:'waiting at the barrier',w1:'still loading (slow memory)',arr:8});
      store(1);
      push({t:'Warp 1 stores; the barrier opens',p:'Warp 1\'s load arrives late, s[8..15] written, it reaches the barrier: 16 of 16 arrived, everyone continues.',w0:'released',w1:'released',arr:16});
      [8,4,2,1].forEach((k,i)=>{level(k);push({t:'Level k = '+k,p:'Threads 0 to '+(k-1)+' add s[t + '+k+'] into s[t], then all 16 meet at __syncthreads() again.',w0:'adding, then barrier',w1:k===8?'idle (t ≥ 8), at the barrier':'idle, at the barrier',arr:16,hi:k})});
      push({t:'Result: 80',p:'Thread 0 writes s[0] = 80, the correct sum.',w0:'done',w1:'done',arr:16,res:s[0]});
    }else{
      push({t:'Warp 0 stores and runs on',p:'Warp 0\'s load arrived: s[0..7] written. There is no barrier, so it goes straight to the first level.',w0:'running',w1:'still loading (slow memory)',arr:0});
      const rd=level(8);
      push({t:'Level k = 8 reads empty slots',p:'Threads 0 to 7 read s[8..15] before warp 1 has written them: 8 stale reads, each taking an empty value (0 here; real shared memory holds leftovers).',w0:'level 8',w1:'still loading',arr:0,stale_at:rd,hi:8});
      store(1);level(4);
      push({t:'Warp 1 stores, too late',p:'Warp 1\'s values land in s[8..15] now, after they were needed. Warp 0 runs level 4.',w0:'level 4',w1:'stored, done',arr:0,hi:4});
      level(2);push({t:'Level k = 2',p:'Warp 0 continues on its own partial sums.',w0:'level 2',w1:'done',arr:0,hi:2});
      level(1);push({t:'Level k = 1',p:'s[0] now holds the sum of the first 8 values only.',w0:'level 1',w1:'done',arr:0,hi:1});
      push({t:'Result: '+s[0]+' (should be 80)',p:'Thread 0 writes '+s[0]+'. Nothing crashed; the answer is simply wrong, and with different timing it would be wrong differently.',w0:'done',w1:'done',arr:0,res:s[0]});
    }
    return st}
  const D={bar:sim(true),nobar:sim(false)};
  window.PM_RC=D; // the page check reads the end states: 80 with the barrier, 31 and 8 stale reads without
  let mode='bar';
  function draw(i){
    const S=D[mode][i];
    let h='<div class="pm-lanes">'+X.map((_,t)=>'<div>'+t+'</div>').join('')+'</div>';
    h+='<div class="pm-row"><span class="small mute">x (global)</span><div class="pm-mem">'+X.map((v,t)=>'<div class="'+(t<8?'w0':'w1')+'">'+v+'</div>').join('')+'</div></div>';
    h+='<div class="pm-row"><span class="small mute">s (shared)</span><div class="pm-mem">'+S.s.map((v,t)=>{
      const cls=[];if(v===null)cls.push('emp');else cls.push(S.owner[t]===1?'w1':'w0');if(S.stale_at&&S.stale_at.indexOf(t)>=0)cls.push('stale');
      return '<div class="'+cls.join(' ')+'">'+(v===null?'·':v)+'</div>'}).join('')+'</div></div>';
    h+='<div class="pm-row"><span class="small mute">warp 0 (t 0-7)</span><span class="small">'+S.w0+'</span></div>';
    h+='<div class="pm-row"><span class="small mute">warp 1 (t 8-15)</span><span class="small">'+S.w1+'</span></div>';
    fig.innerHTML=h;
    cap.innerHTML='<div class="t">'+S.t+'</div><p>'+S.p+'</p>';
    cnt.innerHTML=RD.stat('Step',(i+1)+' / '+D[mode].length)+RD.stat('At the barrier',mode==='bar'?S.arr+' / 16':'no barrier')+
      RD.stat('Stale reads',S.stale)+RD.stat('Result',S.res===undefined?'...':S.res,S.res===undefined?'':(S.res===80?'correct':'wrong: want 80'))}
  const A=RD.anim({card:'pm-rc-card',ctl:'pm-rc-ctl',n:D.bar.length,draw,ms:1700,label:'Race step'});
  RD.seg(document.getElementById('pm-rc-mode'),m=>{mode=m;A.reset(D[m].length);A.play()});
})();
