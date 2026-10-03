// ---- Reading: model-wise double descent with random ReLU features on the digits, and ridge removing the peak (data: double_descent.py) ----
(function(){
  const card=document.getElementById('dd-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const L=DD.lams,cols=['var(--c2)','var(--c5)','var(--c4)','var(--c6)','var(--c1)','var(--mute)'];
  const st={m:'mse',on:{0:true,2:true,best:true}};
  const nm=i=>i==='best'?'best λ at each width':(L[i]===0?'λ = 0 (minimum norm)':'λ = '+(L[i]>=0.01?L[i]:L[i].toExponential(0).replace('e-','e−')));
  $('dd-l').innerHTML=[...L.map((_,i)=>i),'best'].map(i=>'<label><input type="checkbox" data-i="'+i+'"'+(st.on[i]?' checked':'')+'> <span class="sw" style="background:'+(i==='best'?'var(--c3)':cols[i])+'"></span>'+nm(i)+'</label>').join('');
  function draw(){const el=$('dd-plot');const key=st.m==='mse'?'test_mse':'test_err',ok=st.m==='mse'?'opt_mse':'opt_err';
    const lx=DD.D.map(d=>Math.log10(d)),lines=[];let ymax=0;
    L.forEach((_,i)=>{if(!st.on[i])return;const ys=DD[key][i];lines.push({xs:lx,ys,c:cols[i],w:2});ys.forEach(v=>{ymax=Math.max(ymax,v)})});
    if(st.on.best){lines.push({xs:lx,ys:DD[ok],c:'var(--c3)',w:3});DD[ok].forEach(v=>{ymax=Math.max(ymax,v)})}
    const cap=st.m==='mse'?Math.min(ymax*1.05,3):Math.min(1,ymax*1.05);
    const nx=Math.log10(DD.n),txt=[];
    if(st.on[0]&&st.m==='mse'){const ys=DD[key][0],mx=Math.max(...ys);if(mx>cap){const k=ys.indexOf(mx);txt.push({x:lx[k]-0.07,y:cap*0.9,s:'peak '+mx.toFixed(1)+' ('+DD.D[k]+' features) ↑',a:'end',c:'var(--c2)'})}}
    PL.chart({el,id:'dd',x:[Math.log10(4),Math.log10(2500)],y:[0,cap||1],lines,txt,xt:[1,Math.log10(DD.n),3],xf:v=>Math.abs(v-nx)<1e-9?'n = '+DD.n:Math.round(Math.pow(10,v)).toLocaleString('en-US'),
      yf:v=>st.m==='mse'?PL.fmt(v):Math.round(v*100)+'%',bands:[{x0:nx-0.012,x1:nx+0.012,c:'var(--ink)',o:.12}],xl:'number of random features (log scale)',yl:st.m==='mse'?'test squared error':'test error',label:'Double descent'});
  }
  $('dd-m').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));st.m=b.dataset.v;draw()});
  $('dd-l').addEventListener('change',e=>{const i=e.target.dataset.i;st.on[i]=e.target.checked;draw()});
  RD.onRender(draw);addEventListener('resize',()=>{if(card.offsetParent)draw()});draw();
})();
