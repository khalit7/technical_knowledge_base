// ---- Distributed PyTorch child: shared helpers for every tab (DU) ----
window.DU=(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const comma=n=>Math.round(n).toLocaleString('en-US');
  const mb=(b,d)=>(b/1e6).toFixed(d==null?2:d)+' MB';
  const kib=b=>b>=1048576?(b/1048576)+' MiB':(b/1024)+' KiB';
  const sci=(v,d)=>{if(v===0)return '0';const e=Math.floor(Math.log10(Math.abs(v)));const m=v/Math.pow(10,e);return m.toFixed(d==null?1:d)+'e'+e};
  const med=a=>{const s=[...a].sort((x,y)=>x-y);const n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):NaN};
  const table=(head,rows)=>'<thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const set=(id,html)=>{const e=$(id);if(e)e.innerHTML=html};
  // segmented buttons
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // predict-then-reveal: every .pr[data-ok]; the answer text is already in .ans
  function wirePredict(root){
    (root||document).querySelectorAll('.pr[data-ok]').forEach(el=>{
      if(el.dataset.wired)return;el.dataset.wired=1;
      const ok=+el.dataset.ok,ans=el.querySelector('.ans');
      el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
        el.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
        if(+b.dataset.a!==ok)b.classList.add('wrong');
        if(!ans.dataset.base)ans.dataset.base=ans.innerHTML;
        ans.hidden=false;ans.innerHTML=(+b.dataset.a===ok?'<b>Right.</b> ':'<b>Not quite.</b> ')+ans.dataset.base});
    });
  }
  const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const onTab=(id,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)};
  // redraw f on resize while the tab is visible
  function onResize(tab,f){let t=0;addEventListener('resize',()=>{const r=$(tab);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  const PL={'Shard(dim=0)':'S(0)','Shard(dim=1)':'S(1)','Replicate()':'R'};
  const pl=s=>{s=String(s);return PL[s]||s.replace(/^_StridedShard\(dim=(\d+), sf=(\d+)\)$/,'_S($1, $2)')};
  const opName=o=>o==='reduce_scatter'?'reduce-scatter':o.replace(/_/g,'-');
  return {$,esc,comma,mb,kib,sci,med,table,set,seg,wirePredict,W,onTab,onResize,pl,opName};
})();
