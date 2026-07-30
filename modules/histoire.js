/* ======================================================================
   GRIMOIRE — modules/histoire.js
   Histoire du monde — chronologie, événements et mythes.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

// Les anciens grands champs « Événements fondateurs / Guerres / Légendes » deviennent
// des événements de la frise et des cartes mythe (une seule fois, sans rien perdre).
function migrateHistoire(){
  const hi=S.histoire||{};
  if(hi.migrated)return;
  let moved=false;
  const push=(titre,type,desc)=>{if(!(desc||'').trim())return;S.evenements.push({id:uid(),date:'',annee:'',titre,type,desc:desc.trim(),persos:[],lieux:[],factions:[]});moved=true;};
  push('Événements fondateurs','fondation',hi.fondateurs);
  push('Guerres & conflits majeurs','guerre',hi.conflits);
  if((hi.mythes||'').trim()){S.mythes.push({id:uid(),texte:hi.mythes.trim()});moved=true;}
  S.histoire=Object.assign({},hi,{fondateurs:'',conflits:'',mythes:'',migrated:true});
  if(moved||!hi.migrated)save();
}
function saveHistoire(){S.histoire=Object.assign({},S.histoire,{ere:document.getElementById('h-ere').value,actuel:document.getElementById('h-actuel').value});save();}
function loadHistoire(){if(!S.histoire)return;['ere','actuel'].forEach(f=>{const e=document.getElementById('h-'+f);if(e)e.value=S.histoire[f]||'';});}

// === CHRONOLOGIE : ÉVÉNEMENTS DATÉS ===
const EVT_TYPES={
  guerre:{label:'Guerre',tag:'tag-red',icon:'⚔',color:'#d4736a'},
  naissance:{label:'Naissance',tag:'tag-green',icon:'✿',color:'#7cb87c'},
  mort:{label:'Mort',tag:'tag-purple',icon:'†',color:'#a89ef7'},
  decouverte:{label:'Découverte',tag:'tag-blue',icon:'✧',color:'#5b9cf6'},
  catastrophe:{label:'Catastrophe',tag:'tag-coral',icon:'☄',color:'#e07b54'},
  politique:{label:'Politique',tag:'tag-amber',icon:'⚖',color:'#c4a35a'},
  fondation:{label:'Fondation',tag:'tag-teal',icon:'⌂',color:'#4db8a4'},
  magie:{label:'Magie',tag:'tag-purple',icon:'✦',color:'#a89ef7'},
  prophetie:{label:'Prophétie',tag:'tag-pink',icon:'◈',color:'#b87cc8'},
  rencontre:{label:'Rencontre',tag:'tag-teal',icon:'⟷',color:'#4db8a4'},
  autre:{label:'Autre',tag:'tag-blue',icon:'•',color:'#5b9cf6'}
};
function fillEventTypes(value){
  const s=document.getElementById('e-type');if(!s)return;
  s.innerHTML=Object.keys(EVT_TYPES).map(k=>`<option value="${k}">${EVT_TYPES[k].icon} ${EVT_TYPES[k].label}</option>`).join('');
  s.value=EVT_TYPES[value]?value:'autre';
}
// Tri : l'année numérique si elle est donnée, sinon le premier nombre trouvé dans la date.
// Les événements sans aucun repère chiffré restent à la fin, dans leur ordre d'ajout.
function evtSortKey(e){
  const a=String(e.annee===0?0:(e.annee||'')).trim().replace(',','.');
  if(a!==''&&!isNaN(Number(a)))return Number(a);
  const m=String(e.date||'').match(/-?\d+(?:[.,]\d+)?/);
  return m?Number(m[0].replace(',','.')):null;
}
function sortedEvents(){
  const rows=S.evenements.map((e,i)=>({e,i,k:evtSortKey(e)}));
  const dated=rows.filter(r=>r.k!==null).sort((x,y)=>x.k-y.k||x.i-y.i);
  return dated.concat(rows.filter(r=>r.k===null)).map(r=>r.e);
}
function saveEvent(){
  const titre=document.getElementById('e-titre').value.trim();if(!titre)return;
  const editId=document.getElementById('e-edit-id').value;
  const e={id:editId||uid(),titre,date:document.getElementById('e-date').value.trim(),annee:document.getElementById('e-annee').value.trim(),
    type:document.getElementById('e-type').value,desc:document.getElementById('e-desc').value,
    persos:readPickList('e-persos'),lieux:readPickList('e-lieux'),factions:readPickList('e-factions')};
  if(editId){const i=S.evenements.findIndex(x=>x.id===editId);if(i>=0)S.evenements[i]=e;}else S.evenements.push(e);
  save();closeModal('event');renderTimeline();updateStats();
}
function delEvent(id){S.evenements=S.evenements.filter(x=>x.id!==id);save();renderTimeline();updateStats();}
/* La liste des événements — c'est ici qu'on les gère (ajout, modification,
   suppression). La frise, elle, reste une lecture chronologique. */
function renderEventList(){
  const el=document.getElementById('event-list');if(!el)return;
  if(!S.evenements.length){
    el.className='';
    el.innerHTML='<div class="empty"><div class="empty-icon">⌛</div>Aucun événement</div>';
    return;
  }
  el.className='grid-auto';
  el.innerHTML=sortedEvents().map(e=>{
    const t=EVT_TYPES[e.type]||EVT_TYPES.autre;
    const links=persoTags(e.persos).concat(lieuTags(e.lieux),factionTags(e.factions));
    const quand=e.date||((e.annee||e.annee===0)?String(e.annee):'');
    return `<div class="mg-card" id="elist-${e.id}">
      <div class="mg-card-h">
        <span class="mg-glyph" style="background:${t.color}22;color:${t.color}">${t.icon}</span>
        <div style="min-width:0;flex:1">
          <div class="mg-name w">${esc(e.titre||'Sans titre')}</div>
          <div class="mg-role">${esc(quand)||'Date non précisée'}</div>
        </div>
        <div style="display:flex;gap:3px">
          <button class="btn btn-ghost btn-sm" onclick="openModal('event','${e.id}')" title="Modifier">✎</button>
          <button class="btn btn-danger btn-sm" onclick="delEvent('${e.id}')" title="Supprimer">✕</button>
        </div>
      </div>
      <div class="mg-chips" style="margin-bottom:9px"><span class="tag ${t.tag}" style="font-size:10px">${t.icon} ${t.label}</span></div>
      ${e.desc?`<div style="font-size:12.5px;color:var(--text2);line-height:1.55">${esc(trunc(e.desc,130))}</div>`:''}
      ${links.length?`<div class="tag-row" style="margin-top:9px">${links.join('')}</div>`:''}
    </div>`;
  }).join('');
}

/* La page Histoire a deux espaces distincts pour les événements :
   — « Chronologie » : la frise, lecture seule, ordonnée dans le temps ;
   — « Événements »  : la liste, où on les ajoute, modifie et supprime.
   renderTimeline() alimente les deux, pour que tous les appels existants
   (ajout, suppression, import…) restent valables. */
function renderTimeline(){
  renderEventList();
  const el=document.getElementById('event-timeline');if(!el)return;
  if(!S.evenements.length){el.className='';el.innerHTML='<div class="empty"><div class="empty-icon">⌛</div>Aucun événement — ajoute-les depuis la carte « Événements » ci-dessous.</div>';return;}
  el.className='timeline';
  el.innerHTML=sortedEvents().map(e=>{
    const t=EVT_TYPES[e.type]||EVT_TYPES.autre;
    const links=persoTags(e.persos).concat(lieuTags(e.lieux),factionTags(e.factions));
    return`<div class="tl-item" id="ecard-${e.id}" style="--evt-color:${t.color}">
      <div class="tl-dot">${t.icon}</div>
      ${e.date?`<div class="tl-date">${e.date}</div>`:''}
      <div class="tl-card" style="cursor:pointer" onclick="openModal('event','${e.id}')" title="Ouvrir cet événement">
        <div class="tl-head">
          <span class="tl-title">${e.titre}</span>
          <span class="tag ${t.tag}" style="font-size:10px">${t.icon} ${t.label}</span>
        </div>
        ${e.desc?`<div class="tl-desc">${e.desc}</div>`:''}
        ${links.length?`<div class="tag-row" style="margin-top:9px">${links.join('')}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

// === MYTHES & LÉGENDES ===
function saveMythe(){
  const texte=document.getElementById('my-texte').value.trim();if(!texte)return;
  const editId=document.getElementById('my-edit-id').value;
  if(editId){const i=S.mythes.findIndex(x=>x.id===editId);if(i>=0)S.mythes[i]={id:editId,texte};}
  else S.mythes.push({id:uid(),texte});
  save();closeModal('mythe');renderMythes();
}
function delMythe(id){S.mythes=S.mythes.filter(x=>x.id!==id);save();renderMythes();}
function renderMythes(){
  const el=document.getElementById('mythe-list');if(!el)return;
  if(!S.mythes.length){el.className='';el.innerHTML='<div class="empty"><div class="empty-icon">◈</div>Aucun mythe ni légende pour l’instant</div>';return;}
  el.className='grid-auto';
  el.innerHTML=S.mythes.map(m=>`<div class="mythe-card">
    <div class="mythe-text">${m.texte}</div>
    <div class="mythe-actions"><button class="btn btn-ghost btn-sm" onclick="openModal('mythe','${m.id}')">✎</button><button class="btn btn-danger btn-sm" onclick="delMythe('${m.id}')">✕</button></div>
  </div>`).join('');
}

