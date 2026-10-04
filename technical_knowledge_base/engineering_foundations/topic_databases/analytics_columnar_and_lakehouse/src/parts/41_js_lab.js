// ---- Parquet lab tab: 36 measured files (D.lab) ----
(function(){
  const L=D.lab,$=id=>document.getElementById(id);
  const st={sort:'time',rg:'100000',comp:'snappy',q:'chat'};
  const QN={all:'Tokens per model',day:'One day',chat:'One chat',model:'One model'};
  const SC={time:'var(--c1)',model:'var(--c2)',chat:'var(--c3)',random:'var(--c4)'};
  const mb=b=>b>=1e8?(b/1e6).toFixed(0)+' MB':b>=1e6?(b/1e6).toFixed(1)+' MB':(b/1e3).toFixed(0)+' KB';
  const find=()=>L.files.find(f=>f.sort===st.sort&&String(f.rg)===st.rg&&f.comp===st.comp);
  function draw(){
    const f=find();if(!f)return;
    $('labStats').innerHTML=RD.stat('File size',mb(f.bytes),'all 7 columns')+RD.stat('Row groups',f.row_groups.toLocaleString(),'up to '+f.rows_per_rg_max.toLocaleString()+' rows each')+RD.stat('Write time',f.write_s+' s','sort and write, DuckDB');
    let h='<table><thead><tr><th>Query</th><th class="num">Row groups read</th><th class="num">Bytes read (measured)</th><th class="num">Needed per footer</th><th class="num">Median time</th></tr></thead><tbody>';
    ['chat','day','model','all'].forEach(k=>{const q=f.q[k];
      h+='<tr><td>'+QN[k]+'</td><td class="num">'+q.rg_kept.toLocaleString()+' / '+f.row_groups.toLocaleString()+'</td><td class="num"><b>'+mb(q.read_bytes)+'</b></td><td class="num">'+mb(q.need_bytes)+'</td><td class="num">'+q.ms.toFixed(1)+' ms</td></tr>'});
    $('labTable').innerHTML=h+'</tbody></table>';
    const best=L.files.reduce((a,b)=>b.q[st.q].read_bytes<a.q[st.q].read_bytes?b:a);
    $('labNote').innerHTML='Fewest bytes for "'+QN[st.q]+'" of all 36: sorted by '+best.sort+', '+best.rg.toLocaleString()+' rows per group, '+best.comp+' ('+mb(best.q[st.q].read_bytes)+').';
    plot();
  }
  function plot(){
    const el=$('labPlot'),W=RD.width(el),H=Math.round(Math.min(320,Math.max(220,W*0.5))),m={l:56,r:12,t:10,b:34};
    const xs=L.files.map(f=>f.bytes),ys=L.files.map(f=>f.q[st.q].read_bytes);
    const x0=0,x1=Math.max(...xs)*1.05,ly0=Math.log10(Math.min(...ys)/1.5),ly1=Math.log10(Math.max(...ys)*1.5);
    const X=v=>m.l+(v-x0)/(x1-x0)*(W-m.l-m.r),Y=v=>H-m.b-(Math.log10(v)-ly0)/(ly1-ly0)*(H-m.t-m.b);
    let b='';
    for(let e=Math.floor(ly0);e<=Math.ceil(ly1);e++)for(const mm of [1,2,5]){const v=mm*Math.pow(10,e),lv=Math.log10(v);if(lv<ly0||lv>ly1)continue;const y=Y(v);b+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(m.l-4,y+4,mb(v),{a:'end',fs:10,fill:'var(--mute)'})}
    [0,250e6,500e6,750e6,1000e6].forEach(v=>{if(v>x1)return;const x=X(v);b+='<line x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(H-m.b)+'" stroke="var(--line)"/>'+RD.t(x,H-m.b+14,v?(v/1e6)+' MB':'0',{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RD.t((W+m.l)/2,H-4,'file size',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const cur=find();
    L.files.forEach(f=>{const x=X(f.bytes),y=Y(f.q[st.q].read_bytes),r=f.rg===10000?3:f.rg===100000?4.5:6;
      b+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+SC[f.sort]+'" fill-opacity="0.75"><title>'+f.sort+', '+f.rg+' rows, '+f.comp+': '+mb(f.bytes)+' file, '+mb(f.q[st.q].read_bytes)+' read</title></circle>'});
    if(cur)b+='<circle cx="'+X(cur.bytes)+'" cy="'+Y(cur.q[st.q].read_bytes)+'" r="10" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    el.innerHTML=RD.svg(W,H,b,'Bytes read against file size for 36 Parquet files');
    $('labLeg').innerHTML=Object.keys(SC).map(k=>'<span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="'+SC[k]+'"/></svg>sorted by '+k+'</span>').join('').replace('sorted by random','shuffled')+'<span>dot size: rows per row group</span>';
  }
  RD.seg($('labSort'),v=>{st.sort=v;draw()});RD.seg($('labRg'),v=>{st.rg=v;draw()});RD.seg($('labComp'),v=>{st.comp=v;draw()});RD.seg($('labQ'),v=>{st.q=v;draw()});
  $('labSqls').innerHTML=Object.keys(QN).map(k=>'<b>'+QN[k]+'</b>: <code>'+RD.esc(L.queries[k])+'</code>').join('; ');
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(draw);
  addEventListener('resize',()=>{const t=$('t-lab');if(t&&!t.hidden)plot()});
  draw();
})();
