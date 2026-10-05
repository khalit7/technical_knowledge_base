// ---- Part 3 (rs): CLI replay tab: recorded sessions, predict the exit code first ----
(function(){
  const D=window.RS_DATA,term=document.getElementById('rs-cli-term');if(!D||!term)return;
  const S=D.cli,CODES=[0,1,2,3,101];let i=0,timer=0,score={right:0,seen:{}};
  const $=id=>document.getElementById(id);
  function show(){
    clearTimeout(timer);const s=S[i],typing=$('rs-cli-type').checked&&!RD.RM;
    $('rs-cli-pos').textContent=(i+1)+' / '+S.length;$('rs-cli-title').textContent=s.title;$('rs-cli-why').textContent='';
    $('rs-cli-guess').innerHTML='<span class="small">Exit code?</span>'+CODES.map(c=>'<button data-c="'+c+'">'+c+'</button>').join('')+'<button data-c="skip">just show me</button>';
    let k=0;const full='$ '+s.cmd;
    function step(){term.innerHTML='<span class="rs-cmd">'+RS.esc(full.slice(0,k))+'</span>';if(k<full.length){k+=2;timer=setTimeout(step,18)}}
    if(typing)step();else term.innerHTML='<span class="rs-cmd">'+RS.esc(full)+'</span>';
  }
  function reveal(g){
    clearTimeout(timer);const s=S[i];
    term.innerHTML='<span class="rs-cmd">$ '+RS.esc(s.cmd)+'</span>\n'+RS.esc(s.out)+'\n<span class="'+(s.code?'rs-st':'rs-cmd')+'">[exit '+s.code+']</span>';
    term.classList.toggle('rs-bad',s.code!==0);
    let v='';if(g!=='skip'){const ok=+g===s.code;if(!(s.id in score.seen)){score.seen[s.id]=ok;if(ok)score.right++}v=ok?'Right: '+s.code+'. ':'Not quite: it was '+s.code+'. '}
    $('rs-cli-why').textContent=v+s.why;
    [...$('rs-cli-guess').querySelectorAll('button')].forEach(b=>{b.disabled=true;if(b.dataset.c===String(s.code))b.classList.add('on')});
    $('rs-cli-score').innerHTML='<span>score <b>'+score.right+' / '+Object.keys(score.seen).length+'</b></span>';
  }
  $('rs-cli-guess').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled)reveal(b.dataset.c)});
  $('rs-cli-next').addEventListener('click',()=>{i=(i+1)%S.length;term.classList.remove('rs-bad');show()});
  $('rs-cli-prev').addEventListener('click',()=>{i=(i+S.length-1)%S.length;term.classList.remove('rs-bad');show()});
  $('rs-cli-type').addEventListener('change',show);
  let first=true;RS.reg('t-rs-cli',()=>{if(first){first=false;show()}});
})();
