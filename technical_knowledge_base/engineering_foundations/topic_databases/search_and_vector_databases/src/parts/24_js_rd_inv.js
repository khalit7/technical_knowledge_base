// ---- Reading: building an inverted index step by step, then answering one query (against a LIKE scan) ----
// Data: six real Quora questions, lexemes from Postgres to_tsvector('english') (measured, src/inputs/m3_tiny.json).
(function(){
  const D=window.SV&&SV.tiny;if(!D||!document.getElementById('invCard'))return;
  const docs=D.docs,ql=D.query_lexemes.map(x=>x[0]);
  const esc=RD.esc;let mode='index',seq=[];
  function postingsUpTo(k){const P={};for(let d=0;d<k;d++)for(const [lx,pos] of docs[d].lexemes){(P[lx]=P[lx]||[]).push([d+1,pos])}return P}
  function build(){seq=[];
    if(mode==='index'){
      seq.push({k:0,t:'An empty index',p:'Six stored questions (left). The index (right) will map every word to the list of questions that contain it: its postings list.'});
      for(let k=1;k<=docs.length;k++)seq.push({k:k,newd:k,t:'Add question '+k,p:'Postgres turns the text into lexemes (lower case, stop words such as "how", "do", "i", "in", "the" dropped, endings stemmed). Each lexeme gets this question\'s number appended to its postings list, with the word positions (for phrase queries).'});
      seq.push({k:docs.length,q:true,t:'The query is tokenised the same way',p:'"'+esc(D.query)+'" becomes the lexemes '+ql.map(x=>'<code>'+esc(x)+'</code>').join(', ')+'. The same tokeniser must run at index time and at query time, or nothing matches.'});
      seq.push({k:docs.length,q:true,look:true,t:'Look up '+ql.length+' postings lists, never the texts',p:'Each query lexeme is one lookup in the sorted dictionary; its postings list names the matching questions directly. Questions in no list are never read.'});
      seq.push({k:docs.length,q:true,look:true,rank:true,t:'Rank the matches',p:'A question can match one lexeme or several. Ranking (BM25, next section) orders them; here the order uses BM25 with k1 1.2 and b 0.75.'});
    }else{
      seq.push({scan:0,t:'No index: LIKE \'%invest%\'',p:'Without an inverted index, the database must read every stored text and look for the substring, character by character.'});
      for(let k=1;k<=docs.length;k++)seq.push({scan:k,t:'Read question '+k,p:'The whole text is read and compared. A substring test also knows nothing about words: "invest" matches "investing" here only because it is a prefix; "shares" would not match "share".'});
    }}
  function draw(i){const s=seq[i]||seq[0];const box=document.getElementById('invBox');let L='<div class="cap">Stored questions</div><table class="mini">';
    const P=postingsUpTo(s.k||0);const hitDocs=new Set();if(s.look)ql.forEach(l=>(P[l]||[]).forEach(p=>hitDocs.add(p[0])));
    const rank=s.rank?SV.bm25(docs.map(d=>d.lexemes),ql,1.2,.75):null;
    docs.forEach((d,j)=>{const n=j+1;let cls='';if(mode==='index'){if(s.newd===n)cls='hl';else if(n>(s.k||0))cls='dim';if(s.look&&!hitDocs.has(n))cls='dim'}else{if(n===s.scan)cls='hl';else if(n>s.scan)cls='dim'}
      L+='<tr class="'+cls+'"><td class="key">'+n+'</td><td style="white-space:normal">'+esc(d.text)+(rank?' <b>'+rank.scores[j].toFixed(2)+'</b>':'')+'</td></tr>'});
    L+='</table>';
    let Rh='';
    if(mode==='index'){const keys=Object.keys(P).sort();Rh='<div class="cap">Inverted index: lexeme, then postings (question:positions)</div><table class="mini"><tr><th>Lexeme</th><th>Postings</th></tr>';
      keys.forEach(kx=>{const on=s.look&&ql.includes(kx),nw=s.newd&&P[kx].some(p=>p[0]===s.newd);
        Rh+='<tr class="'+(on?'hl':'')+'"><td class="key">'+esc(kx)+'</td><td>'+P[kx].map(p=>(p[0]===s.newd?'<b>':'')+p[0]+':'+p[1].join(',')+(p[0]===s.newd?'</b>':'')).join(' ')+'</td></tr>'});
      if(!keys.length)Rh+='<tr><td colspan="2" class="mute">empty</td></tr>';Rh+='</table>'}
    else{const chars=docs.slice(0,s.scan).reduce((a,d)=>a+d.text.length,0);Rh='<div class="cap">Work done</div><p class="small">Questions read: <b>'+s.scan+'</b> of '+docs.length+'<br>Characters compared: <b>'+chars+'</b></p>'}
    box.innerHTML='<div class="tbls"><div>'+L+'</div><div>'+Rh+'</div></div>';
    document.getElementById('invCap').innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>';
    let read,post;if(mode==='index'){read=s.look?hitDocs.size:0;post=s.look?ql.reduce((a,l)=>a+(P[l]||[]).length,0):0}else{read=s.scan;post=0}
    document.getElementById('invCnt').innerHTML=RD.stat('Texts read at query time',mode==='index'?(s.look?'0':'0'):read,'of '+docs.length)+RD.stat('Postings entries read',post,'')+RD.stat('Questions matched',mode==='index'?(s.look?hitDocs.size:'not yet'):'substring test','')}
  build();
  const A=RD.anim({card:'invCard',ctl:'invCtl',n:seq.length,draw:draw,ms:1500,label:'Index step'});
  RD.seg(document.getElementById('invSeg'),m=>{mode=m;build();A.reset(seq.length);A.play()});
})();
