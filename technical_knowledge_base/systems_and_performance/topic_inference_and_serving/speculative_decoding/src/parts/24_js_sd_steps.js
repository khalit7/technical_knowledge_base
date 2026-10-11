// ---- Reading section 2: a real answer, step by step (accepted guesses green, target tokens blue) ----
(function(){
  const D=SD.D,S=D.steps,box=document.getElementById('sd-steps-txt');if(!box||!S)return;
  const names=Object.keys(S);let cur=names.includes('code_edit')?'code_edit':names[0];
  const label={code_edit:'Code edit',summarize:'Summary',story:'Story',list:'List',sea:'One sentence',animal:'Animal fact'};
  function draw(){const st=S[cur];let h='',tok=0,acc=0,dr=0;
    st.forEach(([ts,n,k],i)=>{dr+=k;ts.forEach((t,j)=>{const g=j<n;h+='<span style="background:'+(g?'var(--open2)':'var(--acc2)')+'">'+SD.esc(t)+'</span>';tok++;if(g)acc++});
      h+='<span style="color:var(--mute)">|</span>'});
    box.innerHTML=h;
    document.getElementById('sd-steps-cnt').innerHTML=RD.stat('Tokens',tok)+RD.stat('Target passes (steps)',st.length)+RD.stat('Tokens per pass',SD.fmt(tok/st.length,2))+RD.stat('Accepted guesses',SD.fmt(100*acc/dr,0)+'%','of '+dr+' guessed');
  }
  SD.segs(document.getElementById('sd-steps-p'),names.map(n=>[n,label[n]||n]),cur,m=>{cur=m;draw()});
  draw();
})();
