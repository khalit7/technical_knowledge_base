// ---- The toy task's grammar and its rule-based reference translation (mirrors grammar.py) ----
(function(g){
  const DET={the:'ka',a:'na'},ADJ={big:'gran',small:'pik',red:'rusa',young:'vetu',happy:'jolo'},
    NOUN={dog:'vor',cat:'miska',bird:'pilo',man:'tano',woman:'selu',child:'kiri',fish:'oma',horse:'durak'},
    PLACE={house:'kesa',tree:'bamo',river:'ruvi',car:'zimo'},VERB={saw:'vidar',chased:'kurat',liked:'amir',found:'trovi',helped:'pomag'},
    PREP={near:'pres',under:'sub',behind:'zad'},OBJ='su';
  const LEX=Object.assign({},DET,ADJ,NOUN,PLACE,VERB,PREP);
  const GLOSS={};Object.keys(LEX).forEach(k=>GLOSS[LEX[k]]=k);GLOSS[OBJ]='(object marker)';GLOSS['</s>']='(end)';
  const kind=w=>w in DET?'det':w in ADJ?'adj':w in NOUN?'noun':w in PLACE?'place':w in VERB?'verb':w in PREP?'prep':'?';
  function parseNP(w,i){const det=w[i++],adjs=[];while(w[i] in ADJ)adjs.push(w[i++]);return [{det,adjs,noun:w[i]},i+1]}
  const trNP=n=>[NOUN[n.noun]||PLACE[n.noun]].concat(n.adjs.slice().reverse().map(a=>ADJ[a]),[DET[n.det]]);
  function translate(w){let [s,i]=parseNP(w,0);const v=w[i++];let o;[o,i]=parseNP(w,i);let pp=[];
    if(i<w.length){const p=w[i];let pl;[pl,i]=parseNP(w,i+1);pp=trNP(pl).concat([PREP[p]])}
    return trNP(s).concat(pp,trNP(o),[OBJ,VERB[v]])}
  // which source word each target word translates (null for the object marker)
  function align(w){const np=st=>{let j=st;const det=j++,ad=[];while(w[j] in ADJ)ad.push(j++);return [[j].concat(ad.reverse(),[det]),j+1]};
    let [s,i]=np(0);const v=i++;let o;[o,i]=np(i);let pp=[];if(i<w.length){const p=i;let pl;[pl,i]=np(i+1);pp=pl.concat([p])}
    return s.concat(pp,o,[null,v])}
  // which words may come next: a finite-state view of the grammar (state = slot reached so far)
  function next(w){const st=state(w);return st.allowed}
  function state(w){// walk the sentence: NP(subject) V NP(object) [P NP(place)]
    let ph=0,i=0;const seq=[];// ph: 0 subj, 1 verb, 2 obj, 3 prep-or-end, 4 place, 5 end
    let inNP=false,adjs=0;
    for(const x of w){
      if(ph===0||ph===2||ph===4){if(!inNP){inNP=true;adjs=0}else if(x in ADJ)adjs++;else{inNP=false;ph++}}
      else if(ph===1)ph=2;else if(ph===3)ph=4}
    let allowed=[],done=false;
    const npNext=(nouns)=>{if(!inNP)return Object.keys(DET);const used=w.slice(w.length-adjs);return (adjs<2?Object.keys(ADJ).filter(a=>used.indexOf(a)<0):[]).concat(Object.keys(nouns))};
    if(ph===0)allowed=npNext(NOUN);else if(ph===1)allowed=Object.keys(VERB);else if(ph===2)allowed=npNext(NOUN);
    else if(ph===3){allowed=Object.keys(PREP);done=true}else if(ph===4)allowed=npNext(PLACE);else done=true;
    return {allowed,done}}
  function sample(r){const np=nouns=>{const u=r(),k=u<0.4?0:u<0.75?1:2,ad=Object.keys(ADJ).slice(),out=[pick(r,Object.keys(DET))];for(let i=0;i<k;i++)out.push(ad.splice(Math.floor(r()*ad.length),1)[0]);out.push(pick(r,Object.keys(nouns)));return out};
    let s=np(NOUN).concat([pick(r,Object.keys(VERB))],np(NOUN));if(r()<0.5)s=s.concat([pick(r,Object.keys(PREP))],np(PLACE));return s}
  // every distinct sentence equally likely: 1, 5, 20 for zero, one, two adjectives; a place phrase 624 times in 625
  function sampleU(r){const np=nouns=>{const u=r()*26,k=u<1?0:u<6?1:2,ad=Object.keys(ADJ).slice(),out=[pick(r,Object.keys(DET))];for(let i=0;i<k;i++)out.push(ad.splice(Math.floor(r()*ad.length),1)[0]);out.push(pick(r,Object.keys(nouns)));return out};
    let s=np(NOUN).concat([pick(r,Object.keys(VERB))],np(NOUN));if(r()<624/625)s=s.concat([pick(r,Object.keys(PREP))],np(PLACE));return s}
  const pick=(r,a)=>a[Math.floor(r()*a.length)];
  g.LANG={translate,align,next,state,sample,sampleU,kind,GLOSS,LEX,DET,ADJ,NOUN,PLACE,VERB,PREP,OBJ};
})(typeof window!=='undefined'?window:globalThis);
