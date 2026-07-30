/* ======================================================================
   GRIMOIRE — modules/liens.js
   L'onglet « Liens » commun à toutes les fiches.

   Rien n'est stocké ici : tout est recalculé à l'affichage à partir des
   champs déjà saisis ailleurs. Une faction ne garde donc pas la liste de
   ses membres — ce sont les personnages dont le champ « factions » pointe
   vers elle. Aucune donnée n'existe en double, donc rien ne peut diverger.

   Chargé par index.html en <script src> classique.
   ====================================================================== */

/* [clé, icône, titre] — l'ordre est celui de l'affichage */
const LIENS_SECTIONS=[
  ['persos',    '👥','Personnages liés'],
  ['factions',  '⚔','Factions liées'],
  ['lieux',     '📍','Lieux liés'],
  ['events',    '📜','Événements liés'],
  ['artefacts', '✨','Artefacts liés'],
  ['dieux',     '🙏','Dieux liés'],
  ['creatures', '🐉','Créatures liées'],
  ['lois',      '⚖️','Lois liées'],
  ['traditions','🎭','Traditions liées'],
  ['chapitres', '📖','Chapitres où ils apparaissent']
];

/* Où vivent les entités, et dans quelle section elles s'affichent */
const LK_COL={
  perso:     ()=>S.personnages||[],
  faction:   ()=>S.factions||[],
  lieu:      ()=>S.lieux||[],
  event:     ()=>S.evenements||[],
  artefact:  ()=>MGD().artefacts||[],
  dieu:      ()=>S.dieux||[],
  espece:    ()=>CRD().especes||[],
  loi:       ()=>LOD().lois||[],
  tradition: ()=>SOD().traditions||[],
  chapitre:  ()=>S.chapitres||[]
};
const LK_SECTION={perso:'persos',faction:'factions',lieu:'lieux',event:'events',artefact:'artefacts',
  dieu:'dieux',espece:'creatures',loi:'lois',tradition:'traditions',chapitre:'chapitres'};

/* ============ LE REGISTRE DES LIENS ============
   Chaque ligne décrit UN champ de liaison enregistré : qui le porte, et vers
   quoi il pointe. Le calcul lit ensuite ce registre dans les DEUX sens, si
   bien que la réciprocité est garantie par construction : ajouter une ligne
   ici suffit à faire apparaître le lien des deux côtés, sans rien dupliquer.
     de       : type d'entité qui porte le champ
     champ    : nom de la propriété
     vers     : type d'entité visée
     scalaire : le champ contient un seul identifiant, pas une liste
     ids      : extraction sur mesure (liste d'objets, par exemple) */
const LK_LIENS=[
  {de:'perso',    champ:'factions',  vers:'faction', ids:p=>idsDe(p.factions)},
  {de:'perso',    champ:'lieux',     vers:'lieu',    ids:p=>idsDe(p.lieux)},
  {de:'perso',    champ:'artefacts', vers:'artefact'},
  {de:'faction',  champ:'chef',      vers:'perso',   scalaire:true},
  {de:'faction',  champ:'lieux',     vers:'lieu'},
  {de:'faction',  champ:'rels',      vers:'faction', ids:f=>(Array.isArray(f.rels)?f.rels:[]).map(r=>r&&r.id)},
  {de:'lieu',     champ:'parent',    vers:'lieu',    scalaire:true},
  {de:'event',    champ:'persos',    vers:'perso'},
  {de:'event',    champ:'lieux',     vers:'lieu'},
  {de:'event',    champ:'factions',  vers:'faction'},
  {de:'dieu',     champ:'rels',      vers:'dieu',    ids:g=>(Array.isArray(g.rels)?g.rels:[]).map(r=>Array.isArray(r)?r[0]:null)},
  {de:'dieu',     champ:'artefacts', vers:'artefact'},
  {de:'dieu',     champ:'especeId',  vers:'espece',  scalaire:true},
  {de:'dieu',     champ:'lieux',     vers:'lieu'},
  {de:'dieu',     champ:'events',    vers:'event'},
  {de:'espece',   champ:'factions',  vers:'faction'},
  {de:'espece',   champ:'lieux',     vers:'lieu'},
  {de:'espece',   champ:'events',    vers:'event'},
  {de:'espece',   champ:'dieuId',    vers:'dieu',    scalaire:true},
  {de:'espece',   champ:'rels',      vers:'espece',  ids:e=>(Array.isArray(e.rels)?e.rels:[]).map(r=>Array.isArray(r)?r[0]:null)},
  {de:'tradition',champ:'especes',   vers:'espece'},
  {de:'loi',      champ:'persos',    vers:'perso'},
  {de:'loi',      champ:'events',    vers:'event'},
  {de:'loi',      champ:'lois',      vers:'loi'},
  {de:'tradition',champ:'lieux',     vers:'lieu'},
  {de:'tradition',champ:'persos',    vers:'perso'},
  {de:'tradition',champ:'dieux',     vers:'dieu'},
  {de:'tradition',champ:'events',    vers:'event'}
];
/* Identifiants visés par une entité pour une ligne du registre */
function lkSortants(e,l){
  if(l.ids)return (l.ids(e)||[]).filter(Boolean);
  if(l.scalaire)return e[l.champ]?[e[l.champ]]:[];
  return Array.isArray(e[l.champ])?e[l.champ].filter(Boolean):[];
}

function lkUniq(a){return a.filter((v,i)=>v&&a.indexOf(v)===i);}
function lkVide(){const o={};LIENS_SECTIONS.forEach(s=>{o[s[0]]=[];});return o;}

/* Nom de l'entité, pour la recherche dans le texte des chapitres */
function lkNom(kind,id){
  const e=lkEntite(kind,id);
  return e?(e.nom||e.titre||''):'';
}
function lkEntite(kind,id){
  const col=LK_COL[kind];
  return col?(col()||[]).find(x=>x&&x.id===id)||null:null;
}
/* Chapitres qui citent un nom dans leur titre, résumé, notes, point de vue ou lieux.
   Même comparaison souple que le bestiaire : casse, accents et ponctuation ignorés. */
function lkChapitres(nom){
  const cible=crNorm(nom);
  if(!cible||cible.length<3)return[];
  return (S.chapitres||[]).filter(c=>
    crNorm([c.titre,c.resume,c.notes,c.pdv,c.lieux].filter(Boolean).join(' ')).indexOf(cible)>=0
  ).map(c=>c.id);
}

/* ============ LE CALCUL ============
   Rien n'est stocké : tout est relu à chaque affichage. */
function calcLiens(kind,id){
  const o=lkVide(),ent=lkEntite(kind,id);
  if(!ent)return o;
  const ajoute=(k,ids)=>{const s=LK_SECTION[k];if(s&&o[s])o[s]=o[s].concat((ids||[]).filter(Boolean));};

  /* 1. Le registre, lu dans les deux sens — c'est lui qui assure la réciprocité */
  LK_LIENS.forEach(l=>{
    // ce que cette fiche déclare
    if(l.de===kind)  ajoute(l.vers,lkSortants(ent,l));
    // et, symétriquement, tout ce qui la déclare
    if(l.vers===kind)ajoute(l.de,(LK_COL[l.de]()||[]).filter(e=>e&&lkSortants(e,l).indexOf(id)>=0).map(e=>e.id));
  });

  /* 2. Les liens qui ne passent pas par un champ d'identifiants */
  if(kind==='perso'){
    // relations entre personnages (l'autre bout de la relation)
    ajoute('perso',(S.relations||[]).map(r=>r.a===id?r.b:(r.b===id?r.a:'')));
    // espèce reconnue d'après le champ « Espèce / race »
    ajoute('espece',(CRD().especes||[]).filter(e=>crMatch(ent.espece,crAliases(e))).map(e=>e.id));
    // artefacts dont il est le détenteur (désigné par son nom)
    ajoute('artefact',(MGD().artefacts||[]).filter(x=>x.proprietaire&&crNorm(x.proprietaire)===crNorm(ent.nom)).map(x=>x.id));
    // chapitre de première apparition
    if(ent.firstChap){
      const c=(S.chapitres||[]).find(x=>String(x.num||'').trim()===String(ent.firstChap).trim());
      if(c)ajoute('chapitre',[c.id]);
    }
  }
  if(kind==='espece'){
    // personnages de l'espèce, et ce que leur appartenance entraîne
    const li=crLinks(ent);
    ajoute('perso',li.persos.map(p=>p.id));
    ajoute('faction',li.factions);ajoute('lieu',li.lieux);ajoute('event',li.events);
    ajoute('artefact',li.artefacts);ajoute('dieu',li.dieux);
  }
  // réciproque des deux lignes ci-dessus, pour que factions et lieux voient ces espèces
  if(kind==='faction')ajoute('espece',(CRD().especes||[]).filter(e=>crLinks(e).factions.indexOf(id)>=0).map(e=>e.id));
  if(kind==='lieu')   ajoute('espece',(CRD().especes||[]).filter(e=>crLinks(e).lieux.indexOf(id)>=0).map(e=>e.id));

  /* 3. Chapitres : repérés par mention du nom dans leur texte */
  ajoute('chapitre',lkChapitres(lkNom(kind,id)));

  // une entité ne se lie jamais à elle-même, et chaque lien n'apparaît qu'une fois
  const moi=LK_SECTION[kind];
  if(moi&&o[moi])o[moi]=o[moi].filter(x=>x!==id);
  LIENS_SECTIONS.forEach(s=>{o[s[0]]=lkUniq(o[s[0]]);});
  return o;
}

/* ============ COMPTEURS DE LIENS ============
   Les cartes des listes et les en-têtes de fiche affichent des chiffres : ce
   sont exactement ceux de l'onglet Liens, comptés par le même calcul. Aucun
   risque qu'un compteur annonce autre chose que ce que la fiche montrera. */
const LK_COURT={persos:'Personnages',factions:'Factions',lieux:'Lieux',events:'Événements',
  artefacts:'Artefacts',dieux:'Dieux',creatures:'Espèces',lois:'Lois',
  traditions:'Traditions',chapitres:'Chapitres'};
/* Sections mises en avant dans l'en-tête d'une fiche, même à zéro */
const LK_VEDETTES={
  perso:    ['factions','lieux','persos','events','chapitres'],
  lieu:     ['persos','factions','lieux','events','chapitres'],
  faction:  ['persos','lieux','factions','events','chapitres'],
  espece:   ['persos','factions','lieux','events','artefacts'],
  tradition:['lieux','persos','dieux','creatures','events']
};
/* [{k, ico, lab, n}] pour toutes les sections, dans l'ordre d'affichage */
function lkCompte(kind,id){
  const o=calcLiens(kind,id);
  return LIENS_SECTIONS.map(([k,ico])=>({k,ico,lab:LK_COURT[k]||k,n:(o[k]||[]).length}));
}
/* Les compteurs à montrer sur une carte de liste : les non vides, les plus parlants d'abord */
function lkCompteCarte(kind,id,max){
  const tout=lkCompte(kind,id),ordre=LK_VEDETTES[kind]||[];
  const rang=c=>{const i=ordre.indexOf(c.k);return i<0?ordre.length:i;};
  return tout.filter(c=>c.n>0).sort((a,b)=>rang(a)-rang(b)).slice(0,max||4);
}
/* Les tuiles de l'en-tête : les sections vedettes (même à zéro) puis les autres non vides */
function lkStats(kind,id){
  const tout=lkCompte(kind,id),ordre=LK_VEDETTES[kind]||[];
  const vedettes=ordre.map(k=>tout.find(c=>c.k===k)).filter(Boolean);
  const reste=tout.filter(c=>c.n>0&&ordre.indexOf(c.k)<0);
  return vedettes.concat(reste);
}

/* ============ LES CARTES MINIATURES ============ */
function lkCarte(ico,coul,titre,sous,onclick){
  const p=mgP(coul);
  return `<div class="lk-card" onclick="${onclick}" title="${esc(titre)}">
    <span class="lk-ico" style="background:rgba(${p.rgb},0.15);color:${p.v}">${ico}</span>
    <div style="min-width:0"><div class="lk-t">${esc(titre)}</div>${sous?`<div class="lk-s">${esc(sous)}</div>`:''}</div>
  </div>`;
}
const LK_RENDU={
  persos:id=>{
    const p=(S.personnages||[]).find(x=>x.id===id);if(!p)return'';
    const col=p.color||'purple';
    const ico=p.image?`<img class="ava-img" src="${p.image}" alt="">`:mgEsc(mgInitials(p.nom));
    return lkCarte(ico,col,p.nom||'Sans nom',[p.role,p.espece].filter(Boolean).join(' · '),`openPerso('${id}')`);
  },
  factions:id=>{
    const f=(S.factions||[]).find(x=>x.id===id);if(!f)return'';
    const ico=f.image?`<img class="ava-img" src="${f.image}" alt="">`:'⚔';
    return lkCarte(ico,'amber',f.nom||'Sans nom',f.type||'',`openFaction('${id}')`);
  },
  lieux:id=>{
    const l=(S.lieux||[]).find(x=>x.id===id);if(!l)return'';
    return lkCarte('◎','blue',l.nom||'Sans nom',l.type||'',`openLieu('${id}')`);
  },
  events:id=>{
    const e=(S.evenements||[]).find(x=>x.id===id);if(!e)return'';
    const t=(typeof EVT_TYPES!=='undefined'&&(EVT_TYPES[e.type]||EVT_TYPES.autre))||{icon:'⌛',label:''};
    const quand=e.date||((e.annee||e.annee===0)?String(e.annee):'');
    return lkCarte(t.icon,'amber',e.titre||'Sans titre',[t.label,quand].filter(Boolean).join(' · '),`openEvenement('${id}')`);
  },
  artefacts:id=>{
    const a=(MGD().artefacts||[]).find(x=>x.id===id);if(!a)return'';
    const ico=a.image?`<img class="ava-img" src="${a.image}" alt="">`:mgEsc(a.icone||'💎');
    const r=(typeof MG_RARETE!=='undefined'&&MG_RARETE[a.rarete])||null;
    return lkCarte(ico,'pink',a.nom||'Sans nom',[r&&r.l,a.proprietaire].filter(Boolean).join(' · '),`mgGo('artefacts')`);
  },
  dieux:id=>{
    const g=(S.dieux||[]).find(x=>x.id===id);if(!g)return'';
    const ico=g.image?`<img class="ava-img" src="${g.image}" alt="">`:mgEsc(g.icone||'☀');
    return lkCarte(ico,g.couleur||'amber',g.nom||'Sans nom',g.titre||'',`ouvrirDieu('${id}')`);
  },
  creatures:id=>{
    const e=(CRD().especes||[]).find(x=>x.id===id);if(!e)return'';
    const ico=e.image?`<img class="ava-img" src="${e.image}" alt="">`:mgEsc(e.icone||'🐾');
    return lkCarte(ico,e.couleur||crT(e.type)[2],e.nom||'Sans nom',crT(e.type)[1],`crGo('bestiaire');crOpenEspece('${id}')`);
  },
  lois:id=>{
    const l=(LOD().lois||[]).find(x=>x.id===id);if(!l)return'';
    const ico=l.image?`<img class="ava-img" src="${l.image}" alt="">`:mgEsc(l.icone||'⚖');
    return lkCarte(ico,l.couleur||loD(l.domaine)[2],l.nom||'Sans nom',loD(l.domaine)[1],`loGo('code','lo-loi-${id}')`);
  },
  traditions:id=>{
    const t=(SOD().traditions||[]).find(x=>x.id===id);if(!t)return'';
    return lkCarte(mgEsc(t.icone||'🎭'),t.couleur||'purple',t.nom||'Sans nom',t.frequence||'',`soGo('traditions','so-trad-${id}')`);
  },
  chapitres:id=>{
    const c=(S.chapitres||[]).find(x=>x.id===id);if(!c)return'';
    return lkCarte('▤','green','Ch. '+(c.num||'?')+(c.titre?' — '+c.titre:''),c.statut||'',`openChapitre('${id}')`);
  }
};

/* ============ LE PANNEAU ============ */
function liensHTML(kind,id){
  if(!id)return `<div class="f-vide">Enregistre d’abord la fiche : ses liens apparaîtront ensuite tout seuls.</div>`;
  const o=calcLiens(kind,id);
  let total=0;
  const blocs=LIENS_SECTIONS.map(([k,ico,titre])=>{
    const cartes=o[k].map(LK_RENDU[k]).filter(Boolean);
    if(!cartes.length)return'';
    total+=cartes.length;
    return `<div class="lk-sec">
      <div class="lk-h">${ico} ${esc(titre)} <span class="lk-n">${cartes.length}</span></div>
      <div class="lk-grid">${cartes.join('')}</div>
    </div>`;
  }).join('');
  if(!total)return `<div class="f-vide">Rien n’est encore relié à cette fiche. Les liens apparaîtront d’eux-mêmes dès que d’autres fiches la mentionneront.</div>`;
  return `<div class="lk-note">Tout ce qui suit est calculé automatiquement à partir des autres fiches — rien à saisir ici.</div>${blocs}`;
}

/* ---------- Onglets Fiche / Liens des modales ---------- */
const LK_MODALES={perso:{prefixe:'p',kind:'perso'},faction:{prefixe:'f',kind:'faction'},lieu:{prefixe:'l',kind:'lieu'}};
function switchFicheTab(modale,onglet,el){
  const cfg=LK_MODALES[modale];if(!cfg)return;
  document.querySelectorAll('#modal-'+modale+' .mo-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#modal-'+modale+' .mo-tab').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById(cfg.prefixe+'-panel-'+onglet);
  if(panel)panel.classList.add('active');
  if(el)el.classList.add('active');
  if(onglet==='liens'){
    const id=(document.getElementById(cfg.prefixe+'-edit-id')||{}).value||'';
    panel.innerHTML=liensHTML(cfg.kind,id);
  }
}
/* Remet l'onglet « Fiche » en avant à chaque ouverture de modale */
function resetFicheTab(modale){
  const cfg=LK_MODALES[modale];if(!cfg)return;
  const tabs=document.querySelectorAll('#modal-'+modale+' .mo-tab');
  if(tabs.length)switchFicheTab(modale,'fiche',tabs[0]);
}
