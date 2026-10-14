// ---- Parser viewer (t-ingview): real outputs of every parser on one page, with the page's checks (data: ING.view) ----
(function(){
  const V=window.ING&&ING.view;const sel=document.getElementById('ing-v-page');if(!V||!sel)return;
  let pi=0,par=V.parsers.includes('docling')?'docling':V.parsers[0];
  sel.innerHTML=V.pages.map((p,i)=>'<option value="'+i+'">'+RD.esc(p.label)+'</option>').join('');
  const chips=document.getElementById('ing-v-parsers');
  chips.innerHTML=V.parsers.map(p=>'<button data-p="'+p+'"'+(p===par?' class="on"':'')+'>'+RD.esc(V.names[p]||p)+'</button>').join('');
  chips.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;par=b.dataset.p;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  sel.addEventListener('change',()=>{pi=+sel.value;draw()});
  const allBox=document.getElementById('ing-v-all');allBox.addEventListener('change',draw);
  // normalise like the checks do (whitespace, quotes, dashes, Markdown marks), keeping a map back to the raw text
  function normMap(s){const out=[],map=[];let sp=false;for(let i=0;i<s.length;i++){let c=s[i];
      if('*_#|`'.includes(c))c=' ';if('\u2018\u2019'.includes(c))c="'";if('\u201c\u201d'.includes(c))c='"';if('\u2013\u2014\u2212'.includes(c))c='-';
      if(/\s/.test(c)){if(sp)continue;sp=true;c=' '}else sp=false;out.push(c.toLowerCase());map.push(i)}return [out.join(''),map]}
  function marks(txt,needles){
    const [n,map]=normMap(txt);const spans=[];
    needles.forEach(([s,bad])=>{const q=normMap(s)[0].trim();if(q.length<3)return;
      let at=n.indexOf(q);let len=q.length;
      if(at<0&&q.length>40){at=n.indexOf(q.slice(0,40));len=40}
      if(at>=0)spans.push([map[at],map[Math.min(map.length-1,at+len-1)]+1,bad])});
    spans.sort((a,b)=>a[0]-b[0]);let h='',pos=0;
    spans.forEach(([a,b,bad])=>{if(a<pos)return;h+=RD.esc(txt.slice(pos,a))+'<mark'+(bad?' class="bad"':'')+'>'+RD.esc(txt.slice(a,b))+'</mark>';pos=b});
    return h+RD.esc(txt.slice(pos));
  }
  function draw(){
    const p=V.pages[pi];
    document.getElementById('ing-v-about').innerHTML=p.about;
    document.getElementById('ing-v-img').innerHTML='<img alt="Page image: '+RD.esc(p.label)+'" src="'+p.img+'">';
    const txt=p.outputs[par]||'';
    const needles=[];p.tests.forEach(t=>(t.needles||[]).forEach(s=>needles.push([s,t.type==='absent'])));
    document.getElementById('ing-v-out').innerHTML=(txt?marks(txt,needles):'<span class="mute">(empty output)</span>')+(p.truncated&&p.truncated[par]?'\n<span class="mute">[cut here for size: the full output is '+p.full_len[par].toLocaleString()+' characters]</span>':'');
    const ps=allBox.checked?V.parsers:[par];
    let h='<table class="tst"><thead><tr><th>Check</th>'+ps.map(x=>'<th class="num">'+RD.esc(V.names[x]||x)+'</th>').join('')+'</tr></thead><tbody>';
    p.tests.forEach(t=>{h+='<tr><td>'+t.desc+'</td>'+ps.map(x=>{const r=t.res[x];return '<td class="num">'+(r===undefined?'':r?'<span class="ok">pass</span>':'<span class="no">fail</span>')+'</td>'}).join('')+'</tr>'});
    const sum=x=>{const n=p.tests.filter(t=>t.res[x]!==undefined).length,k=p.tests.filter(t=>t.res[x]).length;return k+'/'+n};
    h+='<tr><td><b>Passed</b></td>'+ps.map(x=>'<td class="num"><b>'+sum(x)+'</b></td>').join('')+'</tr></tbody></table>';
    document.getElementById('ing-v-tests').innerHTML=h;
  }
  draw();
})();
