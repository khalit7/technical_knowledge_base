// ---- Tab: Same text, ten tokenizers ----
(function(){
  const {pieces,chips,esc,TK,SHORT,LAB,fmt,te}=TKV,EX=TD.ex,FL=TD.fl;
  const $=id=>document.getElementById(id);
  // 1. one sentence
  const ORDER=Object.keys(EX);let cur='eng_Latn';
  $('lsPick').innerHTML=ORDER.map(c=>'<button data-c="'+c+'"'+(c===cur?' class="on"':'')+'>'+esc(c==='code'?'Python code':EX[c].name.replace(/ \(.*\)$/,''))+'</button>').join('');
  $('lsPick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.c;$('lsPick').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw1()});
  function draw1(){const e=EX[cur],en=EX.eng_Latn;
    $('lsText').innerHTML='<p><b>'+esc(e.name)+'</b> ('+te.encode(e.text).length+' bytes, '+Array.from(e.text).length+' characters): <span style="white-space:pre-wrap">'+esc(e.text)+'</span></p>';
    let h='';
    TK.forEach(k=>{const p=pieces(e.text,e.t[k]),n=p.length,ne=pieces(en.text,en.t[k]).length;
      h+='<div class="trow"><div class="nm">'+SHORT[k]+'<small>'+esc(LAB[k].replace(/^[^(]*\(|\)$/g,''))+'</small></div><div>'+chips(p)+(Array.isArray(e.t[k])?'<span class="small mute">This tokenizer normalises the text (Unicode NFC) before splitting, so its pieces are shown as text.</span>':'')+'</div><div class="n">'+n+(cur!=='eng_Latn'&&cur!=='code'?'<div class="small mute" style="font-weight:400">'+(n/ne).toFixed(1)+'×</div>':'')+'</div></div>'});
    h+='<div class="trow"><div class="nm">UTF-8 bytes<small>ByT5</small></div><div class="small mute">one id per byte</div><div class="n">'+te.encode(e.text).length+'</div></div>';
    $('lsRows').innerHTML=h}
  draw1();

  // 2. all languages
  const ix=Object.fromEntries(TK.map((k,i)=>[k,4+i]));ix.bytes=3;ix.chars=2;
  const NAMES=Object.assign({bytes:'UTF-8 bytes (ByT5)',chars:'Characters (UTF-32, CANINE)'},Object.fromEntries(TK.map(k=>[k,LAB[k]])));
  const opts=[...TK,'bytes','chars'].map(k=>'<option value="'+k+'">'+esc(NAMES[k])+'</option>').join('');
  $('lfA').innerHTML=opts;$('lfB').innerHTML=opts;$('lfA').value='cl100k';$('lfB').value='o200k';
  const eng=FL.find(r=>r[0]==='eng_Latn');
  const prem=(r,k)=>r[ix[k]]/eng[ix[k]];
  const med=a=>{const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
  function draw2(){const a=$('lfA').value,b=$('lfB').value,q=$('lfQ').value.trim().toLowerCase(),so=$('lfS').value;
    const P=FL.map(r=>({r,a:prem(r,a),b:prem(r,b)}));
    const st=k=>{const v=P.map(x=>x[k]);return {med:med(v),g2:v.filter(x=>x>2).length,g3:v.filter(x=>x>3).length,max:Math.max(...v),arg:P[v.indexOf(Math.max(...v))].r[1],tot:FL.reduce((s,r)=>s+r[ix[k==='a'?a:b]],0)}};
    const A=st('a'),B=st('b');
    const sv=(x,y,d)=>x.toFixed(d)+' / '+y.toFixed(d);
    $('lfStats').innerHTML=RD.stat('Median premium',sv(A.med,B.med,2),'over 204 languages')+RD.stat('Languages over 2×',A.g2+' / '+B.g2)+RD.stat('Languages over 3×',A.g3+' / '+B.g3)+RD.stat('Worst',A.max.toFixed(2)+' / '+B.max.toFixed(2),esc(A.arg)+' / '+esc(B.arg))+RD.stat('Tokens, all languages',(A.tot/1e6).toFixed(2)+'M / '+(B.tot/1e6).toFixed(2)+'M');
    let L=P.filter(x=>!q||x.r[1].toLowerCase().includes(q)||x.r[0].toLowerCase().includes(q));
    if(so==='a')L.sort((x,y)=>y.a-x.a);else if(so==='d')L.sort((x,y)=>(y.a/y.b)-(x.a/x.b));else L.sort((x,y)=>x.r[1].localeCompare(y.r[1]));
    const mx=Math.max(...P.map(x=>Math.max(x.a,x.b)));
    $('lfList').innerHTML='<div class="bars">'+L.map(x=>'<div class="row'+(x.r[0]==='eng_Latn'?' hl':'')+'" title="'+esc(x.r[0])+'"><span class="nm">'+esc(x.r[1])+'</span><span class="track" style="height:16px"><span class="fill" style="height:8px;width:'+(100*x.a/mx).toFixed(1)+'%;background:var(--c2)"></span><span class="fill" style="top:8px;height:8px;width:'+(100*x.b/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+x.a.toFixed(2)+'<br>'+x.b.toFixed(2)+'</span></div>').join('')+(L.length?'':'<p class="small mute">No language matches.</p>')+'</div>';
    $('lfNote').innerHTML='Orange: '+esc(NAMES[a])+'; blue: '+esc(NAMES[b])+'. Premium = tokens for the language ÷ tokens for English, same tokenizer. Defaults reproduce Petrov et al.\'s published token counts exactly, independently, for '+Object.entries(TD.petrov).map(([k,v])=>k+' '+v[0]+'/'+v[1]).join(', ')+' (@@PETROV@@). Their paper quotes GPT-2 and cl100k premiums such as Shan 18.76 and 15.05, Burmese 16.89 and 11.70, Portuguese 1.94 and 1.48, which these bars show. Language names follow their table.'.replace('@@PETROV@@','<a href="https://github.com/AleksandarPetrov/tokenization-fairness/blob/main/assets/tokenization_lengths.csv" target="_blank" rel="noopener noreferrer">tokenization_lengths.csv</a>')}
  ['lfA','lfB','lfS'].forEach(id=>$(id).addEventListener('change',draw2));$('lfQ').addEventListener('input',draw2);
  draw2();

  // 3. GPT-4o table
  const G=TD.g4o;let ok=0;
  $('g4Tab').innerHTML='<table class="wide"><thead><tr><th>Language</th><th>Sentence</th><th class="num">cl100k published</th><th class="num">recomputed</th><th class="num">o200k published</th><th class="num">recomputed</th><th class="num">Fewer tokens</th></tr></thead><tbody>'+
    G.map(g=>{const m=g[2]===g[3]&&g[4]===g[5];if(m)ok++;
      return '<tr><td>'+esc(g[0])+'</td><td style="min-width:16em">'+esc(g[1])+(g[6]?' <span class="small mute">(dash shown as an en dash; counted with the original)</span>':'')+'</td><td class="num">'+g[2]+'</td><td class="num"'+(g[2]!==g[3]?' style="color:var(--bad);font-weight:600"':'')+'>'+g[3]+'</td><td class="num">'+g[4]+'</td><td class="num"'+(g[4]!==g[5]?' style="color:var(--bad);font-weight:600"':'')+'>'+g[5]+'</td><td class="num">'+(g[2]/g[4]).toFixed(1)+'×</td></tr>'}).join('')+'</tbody></table>';
  $('g4Note').innerHTML=ok+' of '+G.length+' rows reproduce exactly, independently. Persian (63 against 61 with cl100k) and Japanese (38 and 27 against 37 and 26) do not; a character in the archived page differing from what OpenAI tokenized is a plausible cause (Japanese uses a full-width digit and dash, Persian a Persian digit) but <span class="ill">unconfirmed</span>. "Fewer tokens" is the published ratio, as OpenAI rounded it.';
})();
