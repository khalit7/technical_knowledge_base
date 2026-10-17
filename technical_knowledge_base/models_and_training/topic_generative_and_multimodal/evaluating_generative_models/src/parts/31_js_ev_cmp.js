// ---- Metric comparator tab ----
(function(){
  const {E,SET,MET,fmt,val,col,ticks,lg}=EVH;const t=RD.t;const $=id=>document.getElementById(id);
  const st={m:'fid',y:'log',on:new Set(E.sets.map(s=>s.k)),ni:2};
  $('ev-c-sets').innerHTML=E.sets.map(s=>'<label><input type="checkbox" data-k="'+s.k+'" checked><span style="color:'+s.color+'">'+RD.esc(s.short)+'</span></label>').join('');
  $('ev-c-sets').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;e.target.checked?st.on.add(k):st.on.delete(k);draw()});
  function draw(){
    const host=$('ev-c-svg'),W=Math.min(820,RD.width(host)),H=Math.round(Math.min(400,Math.max(260,W*0.55)));
    const L=52,R=W<480?12:96,T=10,B=34,ks=E.sets.filter(s=>st.on.has(s.k)).map(s=>s.k);let b='';
    const v=(k,n)=>{const a=val(k,st.m,n);if(st.y!=='gap')return a;const r=val('real',st.m,n);return {mean:a.mean-r.mean,min:a.min-r.mean,max:a.max-r.mean}};
    if(!ks.length){host.innerHTML='<p class="mute">Pick at least one set.</p>';return}
    let lo=1e9,hi=-1e9;ks.forEach(k=>E.ns.forEach(n=>{const a=v(k,n);lo=Math.min(lo,a.min);hi=Math.max(hi,a.max)}));
    const logy=st.y==='log'&&lo>0;let sy;
    if(logy){lo*=0.8;hi*=1.25;sy=y=>T+(1-(lg(Math.max(y,lo))-lg(lo))/(lg(hi)-lg(lo)))*(H-T-B);ticks(lo,hi).forEach(y=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(y)+'" y2="'+sy(y)+'" stroke="var(--line)"/>'+t(L-4,sy(y)+4,fmt(y),{a:'end',fs:10.5,fill:'var(--mute)'})})}
    else{lo=Math.min(0,lo);const pad=(hi-lo)*0.08;hi+=pad;sy=y=>T+(1-(y-lo)/(hi-lo))*(H-T-B);for(let i=0;i<=5;i++){const y=lo+(hi-lo)*i/5;b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(y)+'" y2="'+sy(y)+'" stroke="var(--line)"/>'+t(L-4,sy(y)+4,fmt(y),{a:'end',fs:10.5,fill:'var(--mute)'})}
      if(lo<0)b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(0)+'" y2="'+sy(0)+'" stroke="var(--ink)"/>'}
    const xs=n=>L+(lg(n)-lg(200))/(lg(12500)-lg(200))*(W-L-R);
    E.ns.forEach(n=>{b+=t(xs(n),H-B+14,n.toLocaleString('en-US'),{a:'middle',fs:W<480?9:10.5,fill:'var(--mute)'})});
    b+=t((L+W-R)/2,H-4,'generated samples N (log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    const lab=[];
    ks.forEach(k=>{const c=col(k);let p='';E.ns.forEach((n,i)=>{const a=v(k,n);p+=(i?'L':'M')+xs(n).toFixed(1)+' '+sy(a.mean).toFixed(1);b+='<line x1="'+xs(n)+'" x2="'+xs(n)+'" y1="'+sy(a.min)+'" y2="'+sy(a.max)+'" stroke="'+c+'" stroke-width="3" opacity=".5"/>'});
      b+='<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="1.8"/>';if(R>40){let y=sy(v(k,10000).mean)+4;while(lab.some(q=>Math.abs(q-y)<11))y+=11;lab.push(y);b+=t(W-R+4,y,RD.esc(SET[k].short),{fs:10.5,fill:c})}});
    host.innerHTML=RD.svg(W,H,b,MET[st.m].name+' against sample count');
    $('ev-c-note').innerHTML=E.notes[st.m];
    rank();
  }
  function rank(){const n=E.ns[st.ni];$('ev-c-nv').textContent=n.toLocaleString('en-US');
    const MS=E.sets.filter(s=>s.model).map(s=>s.k),MK=['fid','kid','fd_dino','cmmd','fd_clf'];
    const R=(m,nn)=>{const o=MS.slice().sort((a,b)=>val(a,m,nn).mean-val(b,m,nn).mean);const r={};o.forEach((k,i)=>r[k]=i+1);return r};
    const now={},big={};MK.forEach(m=>{now[m]=R(m,n);big[m]=R(m,10000)});
    $('ev-c-rank').innerHTML='<thead><tr><th>Set</th>'+MK.map(m=>'<th class="num">'+MET[m].name+'</th>').join('')+'</tr></thead><tbody>'+
      MS.map(k=>'<tr><td style="color:'+col(k)+'">'+RD.esc(SET[k].short)+'</td>'+MK.map(m=>'<td class="num'+(now[m][k]!==now.fid[k]?' up':'')+'">'+fmt(val(k,m,n).mean,MET[m].dp)+' ('+now[m][k]+')</td>').join('')+'</tr>'+
        '<tr><td class="small mute">rank at 10,000</td>'+MK.map(m=>'<td class="num small '+(big[m][k]!==now[m][k]?'up':'same')+'">'+big[m][k]+'</td>').join('')+'</tr>').join('')+'</tbody>';}
  RD.seg($('ev-c-met'),m=>{st.m=m;draw()});RD.seg($('ev-c-y'),m=>{st.y=m;draw()});
  $('ev-c-n').addEventListener('input',e=>{st.ni=+e.target.value;rank()});
  $('ev-c-strips').innerHTML=E.sets.map(s=>'<div><b style="color:'+s.color+'">'+RD.esc(s.label)+'</b><img src="'+s.strip3+'" alt="'+RD.esc(s.label)+'"></div>').join('');
  $('ev-c-gen').innerHTML='<thead><tr><th>Set</th><th>How it was made</th><th class="num">sampling time, 10,000 images</th><th class="num">FD (classifier), 1,000 balanced, cross-check</th><th class="num">the lab\'s value</th></tr></thead><tbody>'+
    E.sets.map(s=>'<tr><td style="color:'+s.color+'">'+RD.esc(s.short)+'</td><td>'+RD.esc(s.what)+'</td><td class="num">'+(s.sec!=null?fmt(s.sec,0)+' s':'n/a')+'</td><td class="num">'+fmt(s.fd1k,1)+'</td><td class="num">'+(s.lab||'')+'</td></tr>').join('')+'</tbody>';
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-evcmp']=window.TAB_RENDER['t-evcmp']||[]).push(draw);
  addEventListener('resize',()=>{const tb=$('t-evcmp');if(tb&&!tb.hidden)draw()});
})();
