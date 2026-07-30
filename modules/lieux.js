/* ======================================================================
   GRIMOIRE — modules/lieux.js
   Lieux.

   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.

   PRINCIPE : un lieu ne stocke QUE ce qu'il déclare lui-même.
     — l.parent      : son lieu supérieur (les enfants sont recalculés) ;
     — les factions présentes vivent sur la faction  (f.lieux) ;
     — les personnages liés vivent sur le personnage (p.lieux) ;
     — les événements liés vivent sur l'événement    (e.lieux).
   Rien n'existe en double, donc rien ne peut diverger.
   ====================================================================== */

// LIEUX
const L_FIELDS=['nom','desc','sens','climat','gouv','archi','faune','flore','ressources','hist','hab','magie'];

/* Hiérarchie conseillée, portée par la liste des types du formulaire :
   Région → Ville / cité → Bâtiment / lieu précis → Sous-lieu.
   C'est une indication de lecture, jamais une contrainte : n'importe quel
   lieu peut être rattaché à n'importe quel autre, sauf à lui-même ou à
   l'un de ses propres sous-lieux. */

/* ---------- Population / Occupants : une amorce adaptée au lieu ---------- */
const L_HAB_TYPE={
  'Région':'Peuples, clans, populations de la région…',
  'Royaume / empire':'Sujets, noblesse, peuples vassaux…',
  'Ville / cité':'Bourgeois, marchands, guildes, gardes…',
  'Village':'Paysans, artisans, familles du bourg…',
  'Forêt / nature':'Dryades, esprits des bois, bêtes, ermites…',
  'Donjon / ruines':'Gardiens, morts-vivants, pillards…',
  'Temple / sanctuaire':'Prêtres, novices, pèlerins…',
  'Montagne / gouffre':'Nains, ermites, créatures des profondeurs…',
  'Mer / île':'Marins, pêcheurs, sirènes, naufragés…',
  'Dimension / plan astral':'Entités, esprits, voyageurs égarés…',
  'Bâtiment / lieu précis':'Occupants, personnel, résidents…',
  'Sous-lieu':'Qui s’y trouve d’ordinaire…'
};
/* Le nom du lieu l'emporte sur le type quand il est parlant */
const L_HAB_NOM=[
  [['academie','ecole','universite','college','institut','conservatoire'],'Étudiants, professeurs, maîtres, personnel…'],
  [['chateau','palai','forteresse','citadelle','manoir'],'Famille royale, courtisans, gardes, serviteurs…'],
  [['bibliotheque','archive','scriptorium'],'Bibliothécaires, copistes, chercheurs…'],
  [['temple','sanctuaire','abbaye','monastere','chapelle','cathedrale'],'Prêtres, novices, pèlerins, gardiens du culte…'],
  [['taverne','auberge','relai'],'Aubergiste, habitués, voyageurs de passage…'],
  [['port','havre','quai'],'Marins, dockers, capitaines, contrebandiers…'],
  [['mine','carriere','galerie'],'Mineurs, contremaîtres, créatures des profondeurs…'],
  [['prison','cachot','geole','bagne'],'Prisonniers, geôliers, gardes…'],
  [['foret','bois','bosquet','clairiere'],'Dryades, esprits des bois, bêtes, ermites…'],
  [['marche','bazar','halle'],'Marchands, chalands, voleurs à la tire…'],
  [['caserne','garnison','fort'],'Soldats, officiers, recrues…'],
  [['tour','beffroi'],'Occupants de la tour, gardiens, mages…'],
  [['laboratoire','atelier','forge'],'Artisans, apprentis, alchimistes…']
];
function lieuHabPlaceholder(){
  const inp=document.getElementById('l-hab');if(!inp)return;
  const nom=crNorm((document.getElementById('l-nom')||{}).value||'');
  const type=(document.getElementById('l-type')||{}).value||'';
  let ph='';
  L_HAB_NOM.forEach(([mots,txt])=>{if(!ph&&mots.some(m=>nom.indexOf(m)>=0))ph=txt;});
  if(!ph)ph=L_HAB_TYPE[type]||'Qui y vit, qui l’occupe…';
  inp.placeholder=ph;
}

/* ================= ARBORESCENCE =================
   Seul l.parent est enregistré. Les « lieux enfants » sont toujours
   recalculés, de sorte que les deux fiches montrent forcément la même
   chose — c'est la même donnée, lue des deux côtés. */
function lieuById(id){return (S.lieux||[]).find(x=>x.id===id)||null;}
function lieuEnfants(id){return (S.lieux||[]).filter(l=>l.parent===id);}
/* Chaîne des lieux supérieurs, du plus haut au plus proche */
function lieuAncetres(id){
  const out=[],vus=[id];
  let cur=lieuById(id);
  while(cur&&cur.parent&&vus.indexOf(cur.parent)<0){
    const p=lieuById(cur.parent);if(!p)break;
    vus.push(p.id);out.unshift(p);cur=p;
  }
  return out;
}
/* Tous les sous-lieux, à n'importe quelle profondeur — sert à interdire les boucles */
function lieuDescendants(id){
  const out=[];
  (function marche(x){
    lieuEnfants(x).forEach(c=>{if(out.indexOf(c.id)<0){out.push(c.id);marche(c.id);}});
  })(id);
  return out;
}
/* Les lieux qu'on peut choisir comme parent d'un lieu donné */
function lieuxParentPossibles(moi){
  const interdits=moi?[moi].concat(lieuDescendants(moi)):[];
  return (S.lieux||[]).filter(l=>interdits.indexOf(l.id)<0);
}

/* ================= RELATIONS CALCULÉES ================= */
/* Factions présentes : celles qui déclarent ce lieu dans « Lieux associés » */
function factionsDansLieu(id){
  return (S.factions||[]).filter(f=>Array.isArray(f.lieux)&&f.lieux.indexOf(id)>=0);
}
/* Personnages liés : ceux qui déclarent ce lieu dans « Lieux liés », avec leur rôle */
function persosDansLieu(id){
  return (S.personnages||[]).map(p=>{
    const l=lienDe(p.lieux,id);
    return l?{p,role:l.role||''}:null;
  }).filter(Boolean);
}
/* Événements liés : ceux qui déclarent ce lieu dans leurs lieux */
function eventsDansLieu(id){
  return (S.evenements||[]).filter(e=>Array.isArray(e.lieux)&&e.lieux.indexOf(id)>=0);
}
/* Rend le lien lieu↔événement réciproque, comme syncPersoLinks pour les personnages :
   la liste reste enregistrée UNIQUEMENT sur l'événement. */
function syncEventLieux(lieuId,eventIds){
  (S.evenements||[]).forEach(e=>{
    const arr=Array.isArray(e.lieux)?e.lieux.slice():[];
    const at=arr.indexOf(lieuId),veut=eventIds.indexOf(e.id)>=0;
    if(veut&&at<0)arr.push(lieuId);
    if(!veut&&at>=0)arr.splice(at,1);
    e.lieux=arr;
  });
}

/* ================= REPRISE DES ANCIENNES FICHES =================
   Idempotent : une fiche déjà reprise n'a plus ces propriétés. */
function migrateLieux(){
  let touche=false;
  (S.lieux||[]).forEach(l=>{
    // les factions présentes vivent désormais uniquement sur la faction
    if(l.factions!==undefined){
      (Array.isArray(l.factions)?l.factions:[]).forEach(fid=>{
        const f=(S.factions||[]).find(x=>x.id===fid);if(!f)return;
        if(!Array.isArray(f.lieux))f.lieux=[];
        if(f.lieux.indexOf(l.id)<0)f.lieux.push(l.id);
      });
      delete l.factions;touche=true;
    }
    // l'ancien texte libre « Événements historiques liés » rejoint l'histoire du lieu,
    // pour que rien de ce qui avait été écrit ne se perde
    if(l.events!==undefined){
      const txt=String(l.events||'').trim();
      if(txt)l.hist=(String(l.hist||'').trim()?String(l.hist).trim()+'\n\n':'')+'Événements historiques (ancienne note) : '+txt;
      delete l.events;touche=true;
    }
    if(l.parent===undefined){l.parent='';touche=true;}
    // un parent supprimé ne doit pas laisser une référence morte
    if(l.parent&&!(S.lieux||[]).some(x=>x.id===l.parent)){l.parent='';touche=true;}
  });
  // une boucle (A dans B, B dans A) rendrait l'arborescence impossible à afficher
  (S.lieux||[]).forEach(l=>{
    if(l.parent&&lieuDescendants(l.id).indexOf(l.parent)>=0){l.parent='';touche=true;}
  });
  if(touche)save();
}

/* ================= ÉDITEURS DE LA FICHE ================= */
let lParentDraft='',lEventsDraft=[];

/* Prépare l'arborescence et les événements à l'ouverture de la fiche */
function lieuEditInit(l){
  lParentDraft=(l&&l.parent)||'';
  lEventsDraft=l?eventsDansLieu(l.id).map(e=>e.id):[];
  renderLieuParent();renderLieuEnfants();renderLieuEvents();
  renderLieuPersos();renderLieuFactions();
  lieuHabPlaceholder();
}

/* ---------- Lieu parent ---------- */
function renderLieuParent(){
  const box=document.getElementById('l-parent-box');if(!box)return;
  const moi=(document.getElementById('l-edit-id')||{}).value||'';
  fillDatalist('l-parent-src',lieuxParentPossibles(moi).filter(l=>l.id!==lParentDraft));
  const p=lieuById(lParentDraft);
  if(!p){
    box.innerHTML='<div class="f-vide">Aucun lieu parent — ce lieu est une racine de l’arborescence.</div>';
    return;
  }
  const fil=lieuAncetres(p.id).concat([p]);
  box.innerHTML=`<div class="lh-parent">
    <div class="lh-fil">${fil.map((l,i)=>`${i?'<span class="lh-sep">›</span>':''}<span class="tag tag-blue link-tag" onclick="lieuOuvrir('${l.id}')" title="Enregistre la fiche puis ouvre ce lieu">◎ ${esc(l.nom||'Sans nom')}</span>`).join('')}</div>
    <button type="button" class="btn btn-danger btn-sm" onclick="lieuDelParent()" title="Détacher">✕</button>
  </div>`;
}
function lieuSetParent(){
  const inp=document.getElementById('l-parent-q');if(!inp)return;
  const moi=(document.getElementById('l-edit-id')||{}).value||'';
  const l=trouveParNom(lieuxParentPossibles(moi),inp.value);
  if(!l){
    alert('Aucun lieu ne correspond à ce nom.\n\nVérifie l’orthographe, ou crée d’abord le lieu.\nUn lieu ne peut être rattaché ni à lui-même, ni à l’un de ses propres sous-lieux.');
    return;
  }
  lParentDraft=l.id;inp.value='';
  renderLieuParent();renderLieuEnfants();
}
function lieuDelParent(){lParentDraft='';renderLieuParent();renderLieuEnfants();}

/* ---------- Lieux enfants (jamais saisis : toujours recalculés) ---------- */
function renderLieuEnfants(){
  const box=document.getElementById('l-enfants-box');if(!box)return;
  const moi=(document.getElementById('l-edit-id')||{}).value||'';
  if(!moi){
    box.innerHTML='<div class="f-vide">Enregistre d’abord la fiche : ses sous-lieux apparaîtront ensuite tout seuls.</div>';
    return;
  }
  const arbre=lieuArbreHTML(moi,[moi]);
  if(!arbre){
    box.innerHTML='<div class="f-vide">Aucun lieu enfant — ouvre un autre lieu et choisis celui-ci comme « Lieu parent ».</div>';
    return;
  }
  const racine=lieuById(moi);
  box.innerHTML=`<div class="lh-tree">
    <div class="lh-racine">◎ ${esc((racine&&racine.nom)||'Ce lieu')}</div>
    ${arbre}
  </div>`;
}
function lieuArbreHTML(id,vus){
  return lieuEnfants(id).map(c=>{
    const boucle=vus.indexOf(c.id)>=0;
    const sous=boucle?'':lieuArbreHTML(c.id,vus.concat([c.id]));
    const n=lieuEnfants(c.id).length;
    const sst=[c.type||'Type non précisé',n?`${n} sous-lieu${n>1?'x':''}`:''].filter(Boolean).join(' · ');
    return `<div class="lh-branch">
      <div class="lk-card lh-card" onclick="lieuOuvrir('${c.id}')" title="Enregistre la fiche puis ouvre ce lieu">
        <span class="lk-ico lh-ico">◎</span>
        <div style="min-width:0"><div class="lk-t">${esc(c.nom||'Sans nom')}</div><div class="lk-s">${esc(sst)}</div></div>
      </div>
      ${sous}
    </div>`;
  }).join('');
}

/* ---------- Personnages liés (calculés depuis p.lieux) ---------- */
function renderLieuPersos(){
  const box=document.getElementById('l-persos-box');if(!box)return;
  const moi=(document.getElementById('l-edit-id')||{}).value||'';
  if(!moi){
    box.innerHTML='<div class="f-vide">Enregistre d’abord la fiche : les personnages liés apparaîtront ensuite tout seuls.</div>';
    return;
  }
  const rows=persosDansLieu(moi);
  if(!rows.length){
    box.innerHTML='<div class="f-vide">Aucun personnage — ajoute ce lieu dans « Lieux liés » sur la fiche d’un personnage.</div>';
    return;
  }
  box.innerHTML=`<div class="lk-grid">${rows.map(({p,role})=>{
    const ico=p.image?`<img class="ava-img" src="${p.image}" alt="">`:mgEsc(mgInitials(p.nom));
    const sous=[pRoleLieu(role)||'Rôle non précisé',p.role].filter(Boolean).join(' · ');
    return lkCarte(ico,p.color||'purple',p.nom||'Sans nom',sous,`lieuOuvrirPerso('${p.id}')`);
  }).join('')}</div>`;
}

/* ---------- Factions présentes (calculées depuis f.lieux) ---------- */
function renderLieuFactions(){
  const box=document.getElementById('l-factions-box');if(!box)return;
  const moi=(document.getElementById('l-edit-id')||{}).value||'';
  if(!moi){
    box.innerHTML='<div class="f-vide">Enregistre d’abord la fiche : les factions présentes apparaîtront ensuite toutes seules.</div>';
    return;
  }
  const fs=factionsDansLieu(moi);
  if(!fs.length){
    box.innerHTML='<div class="f-vide">Aucune faction — ajoute ce lieu dans « Lieux associés » sur la fiche d’une faction.</div>';
    return;
  }
  box.innerHTML=`<div class="lk-grid">${fs.map(f=>{
    const ico=f.image?`<img class="ava-img" src="${f.image}" alt="">`:'⚔';
    const sous=[f.type||'',f.lieuPrincipal===moi?'⭐ siège principal':''].filter(Boolean).join(' · ');
    return lkCarte(ico,'amber',f.nom||'Sans nom',sous,`lieuOuvrirFaction('${f.id}')`);
  }).join('')}</div>`;
}

/* ---------- Événements historiques liés (enregistrés sur l'événement) ---------- */
function lieuEventsDispo(){
  return (S.evenements||[]).map(e=>({id:e.id,nom:e.titre||''}))
    .filter(e=>e.nom&&lEventsDraft.indexOf(e.id)<0);
}
function renderLieuEvents(){
  const box=document.getElementById('l-events-box');if(!box)return;
  fillDatalist('l-event-src',lieuEventsDispo());
  if(!lEventsDraft.length){
    box.innerHTML='<div class="f-vide">Aucun événement — cherche un événement de la chronologie par son titre ci-dessus.</div>';
    return;
  }
  box.innerHTML=`<div class="lh-evts">${lEventsDraft.map((id,i)=>{
    const e=(S.evenements||[]).find(x=>x.id===id);
    const t=(e&&EVT_TYPES[e.type])||EVT_TYPES.autre;
    const quand=e?(e.date||((e.annee||e.annee===0)?String(e.annee):'')):'';
    return `<div class="lh-evt">
      <span class="lh-evt-ico" style="background:${t.color}22;color:${t.color}">${t.icon}</span>
      <span class="lh-evt-t link-tag" onclick="lieuOuvrirEvent('${id}')" title="Enregistre la fiche puis ouvre cet événement">${esc((e&&e.titre)||'Événement supprimé')}</span>
      ${quand?`<span class="lh-evt-d">${esc(quand)}</span>`:''}
      <button type="button" class="btn btn-danger btn-sm" onclick="lieuDelEvent(${i})" title="Retirer">✕</button>
    </div>`;
  }).join('')}</div>`;
}
function lieuAddEvent(){
  const inp=document.getElementById('l-event-q');if(!inp)return;
  const e=trouveParNom(lieuEventsDispo(),inp.value);
  if(!e){
    alert('Aucun événement ne correspond à ce titre.\n\nVérifie l’orthographe, ou crée d’abord l’événement dans l’onglet Histoire → Chronologie.');
    return;
  }
  lEventsDraft.push(e.id);inp.value='';renderLieuEvents();
}
function lieuDelEvent(i){lEventsDraft.splice(i,1);renderLieuEvents();}

/* ---------- Ouvrir une fiche liée sans rien perdre ---------- */
function lieuOuvrirSiEnregistre(fn){
  if(!document.getElementById('l-nom').value.trim()){
    alert('Donne d’abord un nom au lieu pour pouvoir l’enregistrer.');return;
  }
  if(saveLieu())fn();
}
function lieuOuvrir(id){lieuOuvrirSiEnregistre(()=>openLieu(id));}
function lieuOuvrirPerso(id){lieuOuvrirSiEnregistre(()=>openPerso(id));}
function lieuOuvrirFaction(id){lieuOuvrirSiEnregistre(()=>openFaction(id));}
function lieuOuvrirEvent(id){lieuOuvrirSiEnregistre(()=>openEvenement(id));}

/* ================= ENREGISTREMENT ================= */
function saveLieu(){
  const nom=document.getElementById('l-nom').value.trim();if(!nom)return false;
  const editId=document.getElementById('l-edit-id').value;
  const prev=editId?lieuById(editId):null;
  const l={id:editId||uid(),type:document.getElementById('l-type').value,parent:'',
    image:imgResolve('lieu',prev&&prev.image),fichiers:modalFiles.lieu};
  L_FIELDS.forEach(f=>l[f]=document.getElementById('l-'+f).value);
  l.nom=nom;
  // un lieu ne peut être rattaché ni à lui-même, ni à l'un de ses propres sous-lieux
  const interdits=[l.id].concat(lieuDescendants(l.id));
  l.parent=(lParentDraft&&interdits.indexOf(lParentDraft)<0&&lieuById(lParentDraft))?lParentDraft:'';
  if(editId){const i=S.lieux.findIndex(x=>x.id===editId);if(i>=0)S.lieux[i]=l;}else S.lieux.push(l);
  syncEventLieux(l.id,lEventsDraft.slice());
  imgDraftClear('lieu');
  save();closeModal('lieu');
  renderLieux();renderPersos();renderFactions();renderTimeline();updateStats();
  return true;
}
function delLieu(id){
  const mort=lieuById(id);
  const grandParent=(mort&&mort.parent)||'';
  S.lieux=S.lieux.filter(x=>x.id!==id);
  // les sous-lieux remontent d'un cran plutôt que de sortir de l'arborescence
  S.lieux.forEach(x=>{if(x.parent===id)x.parent=grandParent;});
  S.personnages.forEach(p=>{if(Array.isArray(p.lieux))p.lieux=p.lieux.filter(x=>(x&&typeof x==='object'?x.id:x)!==id);});
  S.factions.forEach(f=>{
    if(Array.isArray(f.lieux))f.lieux=f.lieux.filter(x=>x!==id);
    if(f.lieuPrincipal===id)f.lieuPrincipal='';
  });
  S.evenements.forEach(e=>{if(Array.isArray(e.lieux))e.lieux=e.lieux.filter(x=>x!==id);});
  save();renderLieux();renderPersos();renderFactions();renderTimeline();updateStats();
}

/* ================= AFFICHAGE DE LA LISTE ================= */
function renderLieux(){
  migrateLieux();
  const el=document.getElementById('lieu-list');
  if(!S.lieux.length){el.className='';el.innerHTML='<div class="empty"><div class="empty-icon">◎</div>Aucun lieu défini</div>';return;}
  el.className='cr-cards';
  el.innerHTML=S.lieux.map(l=>{
    const anc=lieuAncetres(l.id);
    return rpgCardHTML({
      kind:'lieu',id:l.id,domId:'lcard-'+l.id,
      nom:l.nom,sous:l.type||'',couleur:'blue',
      image:l.image,fallback:mgEsc(mgInitials(l.nom)),
      onclick:`openModal('lieu','${l.id}')`,
      badge:anc.length?mgEsc(anc[anc.length-1].nom):'',
      compteurs:lkCompteCarte('lieu',l.id),
      actions:`<button onclick="event.stopPropagation();openModal('lieu','${l.id}')" title="Modifier">✎</button>`
        +`<button onclick="imgPick('lieu','${l.id}',event)" title="Changer l’image">📷</button>`
        +`<button onclick="event.stopPropagation();delLieu('${l.id}')" title="Supprimer">✕</button>`
    });
  }).join('');
}
