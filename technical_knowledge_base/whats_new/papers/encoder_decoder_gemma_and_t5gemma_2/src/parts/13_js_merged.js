// ---- Merged attention (T5Gemma 2, Equations 1 to 5), computed live on small random weights ----
(function(){
  const m=4,n=6,d=8,dh=4;let seed=7,W=null;
  function gauss(r){const u=Math.max(1e-12,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  const mat=(r,a,b)=>Array.from({length:a},()=>Array.from({length:b},()=>gauss(r)));
  const mul=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((t,v,k)=>t+v*B[k][j],0)));
  const dot=(a,b)=>a.reduce((t,v,i)=>t+v*b[i],0);
  function init(){const r=mulberry32(seed);const X=mat(r,m,d),H=mat(r,n,d),Wq=mat(r,d,dh),Wk=mat(r,d,dh),Wv=mat(r,d,dh);
    W={X,H,Q:mul(X,Wq),Kx:mul(X,Wk),Kh:mul(H,Wk),Vx:mul(X,Wv),Vh:mul(H,Wv)}}
  const sm=a=>{const mx=Math.max(...a),e=a.map(v=>Math.exp(v-mx)),s=e.reduce((t,v)=>t+v,0);return e.map(v=>v/s)};
  function compute(row,bias){const q=W.Q[row-1],sc=1/Math.sqrt(dh);
    const ls=W.Kx.slice(0,row).map(k=>dot(q,k)*sc),lc=W.Kh.map(k=>dot(q,k)*sc+bias);
    const pm=sm(ls.concat(lc)),ps=sm(ls),pc=sm(lc);
    const out=(ws,V)=>V[0].map((_,j)=>ws.reduce((t,w,i)=>t+w*V[i][j],0));
    const om=out(pm,W.Vx.slice(0,row).concat(W.Vh)),os_=out(ps,W.Vx.slice(0,row)).map((v,j)=>v+out(pc,W.Vh)[j]);
    const nrm=a=>Math.sqrt(dot(a,a));
    return {pm,ps,pc,enc:pm.slice(row).reduce((t,v)=>t+v,0),cos:dot(om,os_)/(nrm(om)*nrm(os_)),nm:nrm(om),ns:nrm(os_)}}
  function render(){const host=$('mgx');if(!host||!W)return;const row=+$('mgR').value,bias=+$('mgB').value;
    $('mgRv').textContent=row;$('mgBv').textContent=(bias>0?'+':'')+bias;
    const r=compute(row,bias);
    fit(host,w=>{const narrow=w<560;const cell=Math.min(22,Math.floor((narrow?w:w*0.42)/(m+n+1)));
      let s='';const gx=0,gy=18;s+=tx(gx,12,'Mask M: '+m+' decoder rows × ('+m+' + '+n+') keys',{fs:11,c:'var(--mute)'});
      for(let i=0;i<m;i++)for(let j=0;j<m+n;j++){const vis=j<m?j<=i:true;const cur=i===row-1;
        s+=rc(gx+j*cell,gy+i*cell,cell-2,cell-2,vis?(j<m?'var(--acc)':'var(--c4)'):'var(--line)',{r:2,op:vis?(cur?1:.45):1,s:cur?'var(--ink)':null})}
      s+=tx(gx,gy+m*cell+13,'decoder keys',{fs:11,c:'var(--acc)'})+tx(gx+m*cell,gy+m*cell+13,'encoder keys',{fs:11,c:'var(--c4)'});
      // bars
      const bx=narrow?0:gx+(m+n)*cell+24,by=narrow?gy+m*cell+34:0,bw=w-bx,bh=narrow?150:Math.max(150,gy+m*cell+20);
      const keys=row+n,colw=Math.max(8,Math.min(26,(bw-30)/(keys*2+2)));const base=by+bh-26,hmax=bh-52;
      s+=tx(bx,by+12,'Weights over the '+keys+' visible keys for decoder token '+row,{fs:11,c:'var(--mute)'});
      for(let i=0;i<keys;i++){const isE=i>=row,x=bx+20+i*(colw*2+2);
        const vm=r.pm[i],vs=isE?r.pc[i-row]:r.ps[i];
        s+=rc(x,base-vm*hmax,colw,vm*hmax,isE?'var(--c4)':'var(--acc)',{r:1});
        s+=rc(x+colw,base-vs*hmax,colw,vs*hmax,'none',{r:1,s:isE?'var(--c4)':'var(--acc)',sw:1.3,da:'3 2'});}
      s+=ln2(bx+16,base,bx+20+keys*(colw*2+2),base,'var(--line)');
      s+=tx(bx+16,base+14,'1',{fs:11,c:'var(--mute)'})+tx(bx+20+row*(colw*2+2)-2,base+14,'|',{fs:11,c:'var(--mute)'})+tx(bx+20+(keys-1)*(colw*2+2),base+14,String(keys),{fs:11,c:'var(--mute)'});
      const lg=legend([['merged (one softmax)','var(--ink)'],['separate (two softmaxes)','var(--mute)','3 2']],bx,base+28,bw);
      s+=lg.s;host.innerHTML=svgW(w,Math.max(gy+m*cell+20,by+bh+lg.h+6),s,'Merged attention weights')});
    $('mgO').innerHTML=stat('Encoder share, merged',(100*r.enc).toFixed(1)+'%','of one softmax shared with '+row+' decoder token'+(row>1?'s':''))+
      stat('Encoder share, separate','100% + 100%','two softmaxes, each summing to 1, added through two branches')+
      stat('Output agreement','cos '+r.cos.toFixed(3),'merged against separate, same weights; norms '+r.nm.toFixed(2)+' and '+r.ns.toFixed(2))}
  function go(){if(!W)init();render()}
  PRED_REVEAL['pr-merge']=go;
  ['mgR','mgB'].forEach(id=>$(id).addEventListener('input',()=>{if(W)render()}));
  $('mgNew').addEventListener('click',()=>{seed=(seed*7919+13)%100003;init();render()});
})();
