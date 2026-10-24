// ---- Reading hero: the write path and the read path sharing one index, with one request's time (measured end to end)
// and cost (published prices, cost_model.py's defaults) drawn to scale. Static: nothing moves.
(function(){
const host=document.getElementById('prd-hero');if(!host)return;
const P=window.PRD,S=P.e2e&&P.e2e.summary,d=P.costdef;
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
function draw(){
  const W=RD.width(host),narrow=W<560,fs=narrow?10.5:11.5;
  const gap=narrow?9:20,n=6,bw=(W-gap*(n-1))/n,bh=narrow?40:34;
  const ink=css('--ink'),mute=css('--mute'),line=css('--line'),acc=css('--acc'),bad=css('--bad'),soft=css('--soft'),bg=css('--bg');
  const X=i=>i*(bw+gap);let g='';
  const box=(i,y,l1,l2,col,o)=>{o=o||{};const x=X(i);
    let t='<rect x="'+(x+0.5)+'" y="'+(y+0.5)+'" width="'+(bw-1)+'" height="'+bh+'" rx="6" fill="'+(o.fill||bg)+'" stroke="'+col+'" stroke-width="'+(o.sw||1.6)+'"/>';
    t+=RD.t(x+bw/2,y+(l2?bh/2-2:bh/2+4),l1,{a:'middle',fs,fill:o.tc||ink,w:o.w});
    if(l2)t+=RD.t(x+bw/2,y+bh/2+11,l2,{a:'middle',fs:fs-1,fill:o.tc||mute});return t};
  const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+mute+'" stroke-width="1.3" marker-end="url(#prd-ar)"/>';
  g+='<defs><marker id="prd-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L8,4L0,8z" fill="'+mute+'"/></marker></defs>';
  // write path
  const yw=18;g+=RD.t(0,11,narrow?'write path, per change':'write path: minutes per changed document',{fs:fs,fill:mute,w:600});
  g+=box(0,yw,'source',narrow?'changes':'document changes',line)+box(1,yw,'chunk,',narrow?'embed':'hash, embed',css('--c1'))+box(2,yw,'index',narrow?'one model':'one model per index',ink,{fill:soft,w:600});
  g+=arrow(X(0)+bw,yw+bh/2,X(1)-1,yw+bh/2)+arrow(X(1)+bw,yw+bh/2,X(2)-1,yw+bh/2);
  const wx=X(3)+2;
  g+=RD.t(wx,yw+11,'freshness lag (2)',{fs:fs-0.5,fill:ink})+RD.t(wx,yw+(narrow?24:24),'model upgrade (3)',{fs:fs-0.5,fill:ink})+RD.t(wx,yw+(narrow?37:37),'deletes reach every copy (4)',{fs:fs-0.5,fill:ink});
  // read path
  const yr=yw+bh+40;g+=RD.t(0,yr-8,narrow?'read path, per question':'read path: seconds per question',{fs:fs,fill:mute,w:600});
  g+='<line x1="'+(X(2)+bw/2)+'" y1="'+(yw+bh)+'" x2="'+(X(2)+bw/2)+'" y2="'+(yr-1)+'" stroke="'+ink+'" stroke-width="1.6" marker-end="url(#prd-ar)"/>';
  const rs=narrow?[['question','',line],['embed','',css('--c1')],['search','ACL filter',acc],['rerank','K pairs',css('--c4')],['generate','prefill',css('--c2')],['answer','cited',line]]:[['question','+ user',line],['embed','query',css('--c1')],['search','ACL filter',acc],['rerank','K pairs',css('--c4')],['generate','prefill, decode',css('--c2')],['answer','+ citations',line]];
  rs.forEach((r,i)=>{g+=box(i,yr,r[0],r[1],r[2],i===2?{sw:3,tc:acc,w:600}:{});if(i)g+=arrow(X(i-1)+bw,yr+bh/2,X(i)-1,yr+bh/2)});
  g+=RD.t(X(4)+bw/2,yr+bh+13,'untrusted text in',{a:'middle',fs:fs-1,fill:bad})+RD.t(X(2)+bw/2,yr+bh+13,'access (5, 6)',{a:'middle',fs:fs-1,fill:acc});
  // time and cost to scale
  let y=yr+bh+34;const bH=22;
  const bar=(title,parts,unit)=>{let t=RD.t(0,y,title,{fs:fs,fill:ink,w:600});y+=6;const tot=parts.reduce((a,x)=>a+x[1],0);let x=0;
    parts.forEach(p=>{const w=W*p[1]/tot;t+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(w,p[1]>0?1.5:0)+'" height="'+bH+'" fill="'+css(p[2])+'"/>';
      const lab=p[0]+' '+p[3];if(w>lab.length*fs*0.56+8)t+=RD.t(x+w/2,y+bH/2+4,lab,{a:'middle',fs:fs-0.5,fill:bg});
      else if(w>p[3].length*fs*0.56+6)t+=RD.t(x+w/2,y+bH/2+4,p[3],{a:'middle',fs:fs-0.5,fill:bg});x+=w});
    y+=bH+13;t+=RD.t(0,y,unit,{fs:fs-1,fill:mute});y+=20;return t};
  if(S){const sum=S.embed.p50+S.search.p50+S.rerank.p50+S.ttft.p50,rest=Math.max(0,S.wall_to_first_token.p50-sum);
    g+=bar('Time to first token, '+Math.round(S.wall_to_first_token.p50).toLocaleString('en-US')+' ms (p50, measured)',
      [['embed',S.embed.p50,'--c1',Math.round(S.embed.p50)+''],['search',S.search.p50,'--c3',''],['rerank',S.rerank.p50,'--c4',Math.round(S.rerank.p50)+''],['prefill',S.ttft.p50,'--c2',Math.round(S.ttft.p50).toLocaleString('en-US')+' ms'],['',rest,'--dim','']],
      narrow?'search 0.9 ms is too thin to see':'search ('+S.search.p50+' ms) is too thin to see; the grey sliver is overhead between stages');}
  if(d){const embed=d.q_tok*d.p_embed/1e6,rer=(d.q_tok*d.K+d.K*d.chunk_tok)*d.p_rerank/1e6,sc=d.sys_cached?d.sys_tok:0;
    const gen=((d.sys_tok-sc+d.k*d.chunk_tok+d.q_tok)*d.p_in+sc*d.p_cached+d.out_tok*d.p_out)/1e6,mon=(d.n_chunks*d.chunk_tok*d.churn*d.p_embed/1e6+d.n_chunks*d.dims*4/1e9*d.p_gb_month)/d.queries_month,tot=embed+rer+gen+mon;
    const pc=x=>Math.round(100*x/tot)+'%';
    g+=bar('Cost per query, $'+tot.toFixed(4)+' (published prices)',[['embed',embed,'--c1',''],['',mon,'--c5',''],['rerank',rer,'--c4',pc(rer)],['generate',gen,'--c2',pc(gen)]],
      narrow?'storage and re-embedding: '+pc(mon)+'; query embedding under 0.1%':'storage and re-embedding spread over queries: '+pc(mon)+'; query embedding under 0.1%');}
  host.innerHTML=RD.svg(W,y-8,g,'The write path and the read path share one index; one request\'s time and cost by stage');
}
RD.onRender(draw);RD.onResize(draw);draw();
})();
