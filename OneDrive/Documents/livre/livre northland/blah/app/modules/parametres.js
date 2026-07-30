/* ======================================================================
   GRIMOIRE — modules/parametres.js
   Paramètres et projet — fiche du roman, statistiques, mode lecteur,
      export et import du fichier .json.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

// DATA SAVERS
function saveRoman(){S.roman={titre:document.getElementById('r-titre').value,genre:document.getElementById('r-genre').value,ton:document.getElementById('r-ton').value,pitch:document.getElementById('r-pitch').value,themes:document.getElementById('r-themes').value,synopsis:document.getElementById('r-synopsis').value};document.getElementById('sb-titre').textContent=S.roman.titre||'Mon roman';document.getElementById('sb-genre').textContent=S.roman.genre||'Fantasy';save();}
function loadRoman(){if(!S.roman)return;['titre','genre','ton','pitch','themes','synopsis'].forEach(f=>{const e=document.getElementById('r-'+f);if(e)e.value=S.roman[f]||'';});document.getElementById('sb-titre').textContent=S.roman.titre||'Mon roman';document.getElementById('sb-genre').textContent=S.roman.genre||'Fantasy';}
// MODE LECTEUR — masque les champs « secrets » des fiches
function applyReader(on){
  document.body.classList.toggle('reader',!!on);
  const b=document.getElementById('reader-btn');
  if(b){b.classList.toggle('btn-primary',!!on);b.style.setProperty('--section-color','var(--c-perso)');b.textContent=on?'👁 Mode lecteur actif':'👁 Mode lecteur';}
}
function toggleReader(){
  const on=!document.body.classList.contains('reader');
  applyReader(on);
  try{localStorage.setItem('grimoire_reader',on?'1':'0');}catch(e){}
}
document.addEventListener('DOMContentLoaded',()=>{let on=false;try{on=localStorage.getItem('grimoire_reader')==='1';}catch(e){}applyReader(on);});

// STATS
function updateStats(){
  const m={perso:S.personnages.length,rel:S.relations.length,fac:S.factions.length,chap:S.chapitres.length,idee:S.idees.length,lieux:S.lieux.length,evt:S.evenements.length};
  Object.entries(m).forEach(([k,v])=>{const e=document.getElementById('nb-'+k);if(e)e.textContent=v;});
  document.getElementById('ms-perso').textContent=m.perso;
  document.getElementById('ms-chap').textContent=m.chap;
  document.getElementById('ms-lieux').textContent=m.lieux;
  document.getElementById('ms-idees').textContent=m.idee;
  document.getElementById('nb-perso').textContent=m.perso;
  document.getElementById('nb-rel').textContent=m.rel;
  document.getElementById('nb-fac').textContent=m.fac;
  document.getElementById('nb-chap').textContent=m.chap;
  document.getElementById('nb-idee').textContent=m.idee;
}

function renderAvancement(){
  const el=document.getElementById('avancement-content');
  if(!S.chapitres.length){el.innerHTML='<div class="empty"><div class="empty-icon">▤</div>Pas encore de chapitres</div>';return;}
  const total=S.chapitres.length;
  const finals=S.chapitres.filter(c=>c.statut==='final').length;
  const rediges=S.chapitres.filter(c=>c.statut==='redige').length;
  const pct=Math.round((finals+rediges*0.6)/total*100);
  const by={idee:0,brouillon:0,redige:0,final:0};
  S.chapitres.forEach(c=>by[c.statut]=(by[c.statut]||0)+1);
  el.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:7px;color:var(--text2)"><span>Progression globale</span><span style="color:var(--c-accueil);font-weight:500">${pct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:var(--c-accueil)"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px">${[['idee','Idées','st-idee'],['brouillon','Brouillons','st-brouillon'],['redige','Rédigés','st-redige'],['final','Finals','st-final']].map(([s,l,t])=>`<span class="tag ${t}">${by[s]||0} ${l}</span>`).join('')}</div>`;
}

function exportData(){
  // JSON.stringify(S) — donc l'export contient bien TOUT, images comprises.
  // (indenter un gros fichier d'images le double inutilement : on n'indente
  //  que s'il n'y a pas d'image)
  const n=imgCount();
  const blob=new Blob([JSON.stringify(S,null,n?0:2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const titre=(S.roman&&S.roman.titre?S.roman.titre.replace(/\s+/g,'_'):'grimoire');
  a.download=titre+'_sauvegarde.json';
  a.click();
  URL.revokeObjectURL(a.href);
  imgExported=true;imgUpdateNotice();   // les images sont désormais dans un fichier
}

function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(typeof data!=='object'||Array.isArray(data))throw new Error();
      S=data;
      normalizeState();
      migrateHistoire();
      save();
      renderAll();
      // ce qui vient d'être importé est déjà dans un fichier : rien à re-exporter
      imgExported=true;imgUpdateNotice();
      const n=imgCount();
      alert('Données importées avec succès !'+(n?`\n\n${n} image${n>1?'s':''} restaurée${n>1?'s':''}.`:''));
    }catch(err){alert('Fichier invalide. Assure-toi d\'utiliser un fichier exporté depuis ce dashboard.');}
    e.target.value='';
  };
  reader.readAsText(file);
}

