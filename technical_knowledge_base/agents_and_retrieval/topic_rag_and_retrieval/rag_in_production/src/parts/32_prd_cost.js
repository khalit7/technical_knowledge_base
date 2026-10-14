// ---- Cost calculator (t-prdcost): the formulas of src/cost_model.py ----
(function(){
const P=window.PRD,PR=P.prices,D=P.costdef,esc=RD.esc,$=id=>document.getElementById(id);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
const usd=x=>x===0?'$0':x<0.0001?'$'+x.toExponential(2):x<0.01?'$'+x.toFixed(5):x<100?'$'+x.toFixed(2):'$'+Math.round(x).toLocaleString('en-US');
const big=x=>x>=1e9?(x/1e9).toFixed(x>=1e10?0:1)+' billion':x>=1e6?(x/1e6).toFixed(x>=1e7?0:1)+' million':Math.round(x).toLocaleString('en-US');
const opt=(sel,items,lab,def)=>{$(sel).innerHTML=items.map((x,i)=>'<option value="'+i+'"'+(i===def?' selected':'')+'>'+esc(lab(x))+'</option>').join('')};
opt('pco-em',PR.embed_per_mtok,x=>x.name+', $'+x.usd+'/M tokens',0);
const RR=[{name:'none',kind:'none'}].concat(PR.rerank.filter(x=>x.usd_per_mtok!=null||x.usd_per_1k_requests!=null));
opt('pco-rr',RR,x=>x.kind==='none'?'no reranker':x.name+(x.usd_per_mtok!=null?', $'+x.usd_per_mtok+'/M tokens':', $'+x.usd_per_1k_requests+' per 1,000 requests'),RR.findIndex(x=>x.name==='Voyage rerank-3'));
opt('pco-llm',PR.llm_per_mtok,x=>x.name+', $'+x.in+' in / $'+x.out+' out',PR.llm_per_mtok.findIndex(x=>x.name==='OpenAI gpt-5-mini'));
opt('pco-inst',PR.instances_usd_per_hour,x=>x.name+', $'+x.usd+'/h',0);
const KS=[['embed','query embedding','--c1'],['rerank','reranking','--c4'],['generate','generation','--c2'],['corpus','re-embedding (monthly, per query)','--c3'],['storage','vector storage (monthly, per query)','--c5']];
function cost(o){
  const q=o.q_tok,embed=q*o.p_embed/1e6;
  const rerank=o.rr_kind==='req'?(o.K>0?o.p_req/1000:0):(q*o.K+o.K*o.chunk_tok)*o.p_rerank/1e6;
  const sc=o.sys_cached?o.sys_tok:0;
  const gen=((o.sys_tok-sc+o.k*o.chunk_tok+q)*o.p_in+sc*o.p_cached+o.out_tok*o.p_out)/1e6;
  const corpus=o.n_chunks*o.chunk_tok*o.churn*o.p_embed/1e6/o.queries_month;
  const gb=o.n_chunks*o.dims*4/1e9,storage=gb*o.p_gb_month/o.queries_month;
  return {embed,rerank,generate:gen,corpus,storage,total:embed+rerank+gen+corpus+storage,gb,initial_embed:o.n_chunks*o.chunk_tok*o.p_embed/1e6};
}
window.PRD_COST=cost;
function read(){
  const e=PR.embed_per_mtok[+$('pco-em').value],r=RR[+$('pco-rr').value],l=PR.llm_per_mtok[+$('pco-llm').value];
  return {queries_month:Math.round(Math.pow(10,+$('pco-q').value)),n_chunks:Math.round(Math.pow(10,+$('pco-n').value)),chunk_tok:+$('pco-ct').value,churn:+$('pco-ch').value,
    dims:+$('pco-d').value,q_tok:+$('pco-qt').value,K:r.kind==='none'?0:+$('pco-K').value,k:+$('pco-k2').value,sys_tok:+$('pco-s').value,sys_cached:$('pco-sc').checked?1:0,out_tok:+$('pco-o').value,
    p_embed:e.usd,p_rerank:r.usd_per_mtok||0,p_req:r.usd_per_1k_requests||0,rr_kind:r.kind==='none'?'none':(r.usd_per_mtok!=null?'tok':'req'),p_in:l.in,p_cached:l.cached,p_out:l.out,p_gb_month:+$('pco-gb').value};
}
function draw(){
  const o=read(),c=cost(o);
  $('pco-qv').textContent=big(o.queries_month);$('pco-nv').textContent=big(o.n_chunks);$('pco-ctv').textContent=o.chunk_tok;$('pco-chv').textContent=Math.round(o.churn*100)+'%';
  $('pco-qtv').textContent=o.q_tok;$('pco-kv').textContent=$('pco-K').value;$('pco-k2v').textContent=o.k;$('pco-sv').textContent=o.sys_tok;$('pco-ov').textContent=o.out_tok;$('pco-gbv').textContent='$'+o.p_gb_month.toFixed(2);
  const out=$('pco-out');out.dataset.total=c.total.toPrecision(6);
  out.innerHTML=RD.stat('Cost per query',usd(c.total),'all stages')+RD.stat('Per month',usd(c.total*o.queries_month),big(o.queries_month)+' queries')+
    RD.stat('First full embedding',usd(c.initial_embed),big(o.n_chunks*o.chunk_tok)+' tokens, once')+RD.stat('Vectors stored',c.gb.toFixed(c.gb<10?1:0)+' GB','float32, index overhead excluded');
  $('pco-bar').innerHTML=KS.map(k=>c[k[0]]>0?'<span style="width:'+(100*c[k[0]]/c.total)+'%;background:var('+k[2]+')" title="'+k[1]+'">'+(c[k[0]]/c.total>0.09?Math.round(100*c[k[0]]/c.total)+'%':'')+'</span>':'').join('');
  $('pco-leg').innerHTML=KS.map(k=>'<span><svg width="10" height="10"><rect width="10" height="10" fill="'+css(k[2])+'"/></svg>'+k[1]+'</span>').join('');
  const gin=o.sys_tok+o.k*o.chunk_tok+o.q_tok,rtok=o.q_tok*o.K+o.K*o.chunk_tok;
  const rows=[['query embedding',o.q_tok+' tokens',c.embed],['reranking',o.rr_kind==='none'?'none':o.rr_kind==='req'?'1 request, K = '+o.K:rtok.toLocaleString('en-US')+' tokens (query &times; K + K chunks)',c.rerank],
    ['generation',gin.toLocaleString('en-US')+' in ('+(o.sys_cached?o.sys_tok+' cached':'none cached')+'), '+o.out_tok+' out',c.generate],
    ['re-embedding',Math.round(o.churn*100)+'% of '+big(o.n_chunks*o.chunk_tok)+' tokens a month',c.corpus],['storage',c.gb.toFixed(1)+' GB a month',c.storage]];
  $('pco-tab').innerHTML='<table><thead><tr><th>Stage</th><th>What is billed</th><th class="num">per query</th><th class="num">share</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+usd(r[2])+'</td><td class="num">'+(100*r[2]/c.total).toFixed(1)+'%</td></tr>').join('')+'</tbody></table>';
  // self-host break-even
  const sh=$('pco-sh').value,inst=PR.instances_usd_per_hour[+$('pco-inst').value],mi=+$('pco-mi').value;$('pco-miv').textContent=mi;
  const month=mi*inst.usd*730,api=c[sh],be=api>0?month/api:Infinity;
  $('pco-sh-out').innerHTML=RD.stat('Machines per month',usd(month),mi+' &times; $'+inst.usd+' &times; 730 h')+RD.stat('API cost of this stage',usd(api*o.queries_month)+' / month',usd(api)+' per query')+
    RD.stat('Break-even volume',isFinite(be)?big(be)+' queries/month':'never (stage costs nothing)',isFinite(be)?(o.queries_month>be?'above it now: self-hosting is cheaper':'below it now: the API is cheaper'):'');
}
// sources table
$('pco-src').innerHTML='<table><thead><tr><th>Item</th><th>Price</th><th>Source (read '+esc(PR.fetched)+')</th></tr></thead><tbody>'+
  PR.embed_per_mtok.map(x=>'<tr><td>'+esc(x.name)+'</td><td>$'+x.usd+' / M tokens'+(x.free?' ('+esc(x.free)+')':'')+'</td><td><a href="'+x.url+'" target="_blank" rel="noopener noreferrer">pricing page</a></td></tr>').join('')+
  PR.rerank.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+(x.usd_per_mtok!=null?'$'+x.usd_per_mtok+' / M tokens, counted as '+esc(x.count):x.usd_per_1k_requests!=null?'$'+x.usd_per_1k_requests+' / 1,000 requests':esc(x.note))+'</td><td><a href="'+x.url+'" target="_blank" rel="noopener noreferrer">pricing page</a></td></tr>').join('')+
  PR.llm_per_mtok.map(x=>'<tr><td>'+esc(x.name)+'</td><td>$'+x.in+' in, $'+x.cached+' cached, $'+x.out+' out, per M tokens</td><td><a href="'+x.url+'" target="_blank" rel="noopener noreferrer">pricing page</a></td></tr>').join('')+
  PR.vector_db.map(x=>'<tr><td>'+esc(x.name)+'</td><td>$'+x.storage_usd_per_gb_month+' / GB-month; read units $'+x.read_units_usd_per_m.join('&ndash;')+' / M; write units $'+x.write_units_usd_per_m.join('&ndash;')+' / M; minimum $'+x.minimum_usd_month+' / month</td><td><a href="'+x.url+'" target="_blank" rel="noopener noreferrer">pricing page</a></td></tr>').join('')+
  PR.instances_usd_per_hour.map(x=>'<tr><td>'+esc(x.name)+'</td><td>$'+x.usd+' / hour ('+esc(x.note)+')</td><td><a href="'+x.url+'" target="_blank" rel="noopener noreferrer">listing</a></td></tr>').join('')+'</tbody></table>';
$('t-prdcost').querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',draw);el.addEventListener('change',draw)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-prdcost']=[draw];
draw();
})();
