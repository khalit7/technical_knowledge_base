// ---- The paper's tables, rebuilt ----
function scatterLog(el,pts,o){fit(el,w=>{const H=o.h||250,pl=44,pr=16,pt=12,pb=40,lg=Math.log10;
  const X=v=>pl+(w-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0])),Y=v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));let s='';
  for(let v=o.y[0];v<=o.y[1]+1e-9;v+=o.ystep)s+=ln2(pl,Y(v),w-pr,Y(v),v===0?'var(--mute)':'var(--line)')+tx(pl-5,Y(v)+4,o.yf?o.yf(v):v,{fs:11,a:'end',c:'var(--mute)'});
  o.xt.forEach(([v,l])=>{s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((pl+w-pr)/2,H-4,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  const P=pts.map(p=>({x:X(p.x),y:Y(p.y),t:p.t,c:p.c,raw:p}));if(o.line){let d='';P.forEach((p,i)=>d+=(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1));s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="1.6"/>'}
  placeLabels(P,w,H-pb);P.forEach(p=>{s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4" fill="'+(p.c||'var(--acc)')+'"><title>'+p.t+'</title></circle>'+tx(p.lx,p.ly,p.t,{fs:11,a:p.la})});
  el.innerHTML=svgW(w,H,s,o.label||'chart')})}
const num=v=>v==='-'?null:parseFloat(v);
const dfmt=(d)=>d==null?'-':(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(1);

// Table 1
(function(){const T=TB.t1,gpt=T.rows[2].v.map(num),sota=T.rows[0].v.map(num);
  function table(){const m=$('tb1M').value;let h='<table><thead><tr><th>System</th>'+T.cols.map((c,i)=>'<th class="num">'+c+'<div class="small mute">'+T.train[i]+'</div></th>').join('')+'</tr></thead><tbody>';
    T.rows.forEach(r=>{h+='<tr><td>'+r.n+'</td>'+r.v.map((v,i)=>{const x=num(v);if(m==='v')return '<td class="num">'+v+'</td>';const b=m==='g'?gpt[i]:sota[i];return '<td class="num">'+dfmt(x-b)+'</td>'}).join('')+'</tr>'});
    $('tb1T').innerHTML=h+'</tbody></table>';
    const A=RC.glue_average;$('tb1N').innerHTML='Average recomputed as the mean of the nine printed columns (MNLI m and mm both count): '+Object.entries(A).map(([k,v])=>k+' '+v.recomputed.toFixed(2)+' (printed '+v.printed+')').join('; ')+'. All five reproduce to the printed precision. '+TB.t1.note+' Metrics: '+T.cols.slice(0,9).map((c,i)=>c+' '+T.metric[i]).join(', ')+' (CoLA is Matthews correlation in the '+A2('https://arxiv.org/abs/1804.07461','GLUE benchmark')+').'}
  function chart(){const c=$('tb1C').value,L=T.rows[4].v.map(num),B=T.rows[3].v.map(num);const pts=[];
    [0,2,3,4,5,6,7,8].forEach(i=>{const y=c==='lg'?L[i]-gpt[i]:c==='bg'?B[i]-gpt[i]:L[i]-B[i];pts.push({x:T.trainN[i],y,t:T.cols[i].replace('-m','')+' '+dfmt(y)})});
    scatterLog($('tb1Chart'),pts,{x:[1500,600000],y:c==='lb'?[0,10]:[-2,16],ystep:2,xt:[[2500,'2.5k'],[10000,'10k'],[100000,'100k'],[400000,'400k']],xl:'training examples (log scale)',yf:v=>(v>0?'+':'')+v,label:'GLUE gains by training-set size'})}
  $('tb1M').addEventListener('change',table);$('tb1C').addEventListener('change',chart);onTab('t-tables',()=>{table();chart()})})();
function A2(u,t){return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>'}

// Tables 2 to 4
(function(){function go(){const k=$('tb2S').value,T=TB[k];
  const items=T.rows.map(r=>{const v=r.v.map(num);const tf=k==='t4'?(v[1]!=null?v[1]:v[0]):(v[3]!=null?v[3]:v[1]);const lab=k==='t4'?(v[1]!=null?'test':'dev'):(v[3]!=null?'test':'dev');
    return {t:r.n.replace('BERT-Large','BERT-L').replace('BERT-Base','BERT-B'),p:tf,lab:tf.toFixed(1)+' '+lab,c:/BERT/.test(r.n)?'var(--c1)':/Human/.test(r.n)?'var(--good)':'var(--dim)'}});
  hbars($('tb2Chart'),T.title,items,{max:100,lw:200,rw:70});
  let h='<table><thead><tr><th>System</th><th>Group</th>'+T.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach(r=>{h+='<tr><td>'+r.n+'</td><td class="small mute">'+(r.g||'')+'</td>'+r.v.map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>'});
  const S=RC.squad11,extra=k==='t2'?'Derived: +'+S.over_top+' F1 over the top leaderboard ensemble; a single model with TriviaQA beats it by '+S.single_vs_top_ensemble+'; without TriviaQA the dev loss is '+S.no_triviaqa_loss.single_dev_em+' to '+S.no_triviaqa_loss.ensemble_dev_f1+' (EM and F1, single and ensemble), the paper\'s "0.1-0.4". The text\'s "+1.3 F1 as a single system" compares with a leaderboard single system that Table 2 does not list, so it cannot be checked here.':
    k==='t3'?'Derived: +'+RC.squad20_gain+' F1 over the best previous system (78.0).':'Derived: +'+RC.swag.over_esim_elmo+' over ESIM+ELMo and +'+RC.swag.over_gpt+' over GPT.';
  $('tb2T').innerHTML=h+'</tbody></table><p class="small mute">'+T.note+' '+extra+'</p>'}
  $('tb2S').addEventListener('change',go);onTab('t-tables',go)})();

// Table 5
(function(){function go(){const T=TB.t5,m=$('tb5M').value,base=T.rows[0].v.map(num);
  let h='<table><thead><tr><th>Dev set</th>'+T.cols.map((c,i)=>'<th class="num">'+c+' ('+T.metric[i]+')</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach((r,ri)=>{h+='<tr><td>'+r.n+'</td>'+r.v.map((v,i)=>'<td class="num">'+(m==='v'||ri===0?v:dfmt(num(v)-base[i]))+'</td>').join('')+'</tr>'});
  $('tb5T').innerHTML=h+'</tbody></table><p class="small mute">'+T.note+'</p>'}
  $('tb5M').addEventListener('change',go);onTab('t-tables',go)})();

// Table 6 and the parameter recount
(function(){function go(){const T=TB.t6,k=+$('tb6M').value,P=RC.t6_params;
  const pts=T.rows.map((r,i)=>({x:P[i],y:num(r.v[k]),t:'L'+r.v[0]+' H'+r.v[1]+' A'+r.v[2]}));
  const ys=pts.map(p=>p.y),lo=Math.floor(Math.min(...ys)-1),hi=Math.ceil(Math.max(...ys)+.5);
  scatterLog($('tb6Chart'),pts,{x:[35e6,450e6],y:[lo,hi],ystep:k===3?.5:Math.max(1,Math.round((hi-lo)/6)),xt:[[50e6,'50M'],[100e6,'100M'],[200e6,'200M'],[400e6,'400M']],xl:'parameters, recounted by this page (log scale)',line:true,label:'Table 6'});
  let h='<table><thead><tr>'+T.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">Parameters (recounted)</th></tr></thead><tbody>';
  T.rows.forEach((r,i)=>{h+='<tr>'+r.v.map(v=>'<td class="num">'+v+'</td>').join('')+'<td class="num">'+fM(P[i])+'</td></tr>'});
  $('tb6T').innerHTML=h+'</tbody></table><p class="small mute">'+T.note+' Mean dev accuracy of 5 fine-tuning restarts. The 6-layer rows with 3 and 12 heads have the same parameters: heads split <i>H</i>, they do not add weights.</p>'}
  function pc(){const V=+$('pcV').value,hd=$('pcH').checked,p=RC.params;const b=V===30522?p.base_30522:p.base_30000,l=V===30522?p.large_30522:p.large_30000;
    const B=b+(hd?p.base_heads:0),L=l+(hd?p.large_heads:0);
    $('pcOut').innerHTML=stat('BERT-Base',fM(B),'paper 110M; ModernBERT Table 2: 110M')+stat('BERT-Large',fM(L),'paper 340M; ModernBERT Table 2: 330M')+stat('OpenAI GPT',fM(p.gpt1),'from its configuration, vocabulary 40,478')}
  $('tb6M').addEventListener('change',go);$('pcV').addEventListener('change',pc);$('pcH').addEventListener('change',pc);onTab('t-tables',()=>{go();pc()})})();

// Table 7
onTab('t-tables',()=>{const T=TB.t7;hbars($('tb7Chart'),T.title+' (dev F1)',T.rows.filter(r=>r.v[0]!=='-').map(r=>({t:r.n,p:num(r.v[0]),lab:r.v[0],c:r.g==='Fine-tuning'?'var(--c1)':r.g==='Prior'?'var(--dim)':'var(--c3)'})),{max:100,lw:190,rw:44})});

// Table 8
(function(){function go(){const T=TB.t8,m=$('tb8M').value,base=T.rows[0].v.map(num);
  let h='<table><thead><tr>'+T.cols.map((c,i)=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach((r,ri)=>{h+='<tr>'+r.v.map((v,i)=>'<td class="num">'+(i<3||m==='v'||ri===0?v:dfmt(num(v)-base[i]))+'</td>').join('')+'</tr>'});
  $('tb8T').innerHTML=h+'</tbody></table><p class="small mute">'+T.note+'</p>'}
  $('tb8M').addEventListener('change',go);onTab('t-tables',go)})();

// Figure 5 points
onTab('t-tables',()=>{const F=RC.fig5;let h='<table><thead><tr><th>Steps (thousands)</th>'+F.steps_k.map(x=>'<th class="num">'+x+'</th>').join('')+'</tr></thead><tbody>';
  h+='<tr><td>Masked LM</td>'+F.mlm.map(v=>'<td class="num">'+v.toFixed(1)+'</td>').join('')+'</tr><tr><td>Left to right</td>'+F.ltr.map(v=>'<td class="num">'+v.toFixed(1)+'</td>').join('')+'</tr>';
  $('tf5T').innerHTML=h+'</tbody></table>'});
