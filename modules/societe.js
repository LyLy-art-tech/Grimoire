/* ======================================================================
   GRIMOIRE — modules/societe.js
   Société & civilisation — 8 sous-onglets : vue d'ensemble, traditions,
   noblesse, éducation, économie, mode, gastronomie, langues.

   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   Dépend de magie.js (moteur de formulaire générique MG_SPECS).
   ====================================================================== */

function SOD(){if(!S.societe||typeof S.societe!=='object'||Array.isArray(S.societe))S.societe={};return S.societe;}

/* Illustration de la vue d'ensemble — rangée dans blah/Photos/, à côté de app/
   (le nom du fichier sur le disque est bien « sociéte.png ») */
const SO_ILLUS='../Photos/soci%C3%A9te.png';

/* Les pages « simples » : pas de fiches, juste des blocs de texte.
   [clé, icône, titre, couleur, [ [clé du champ, libellé], … ] ] */
const SO_PAGES=[
  {k:'education',   ic:'🎓', t:'Éducation',        c:'green',
   desc:"Comment on apprend : écoles, académies, examens et diplômes.",
   champs:[['age',"Âge d’entrée"],['duree','Durée'],['examens','Examens'],['academies','Académies'],['diplomes','Diplômes']]},
  {k:'economie',    ic:'💰', t:'Économie',         c:'amber',
   desc:"Ce qui fait tourner le monde : monnaie, commerce, impôts et métiers.",
   champs:[['monnaie','Monnaie'],['commerce','Commerce'],['impots','Impôts'],['metiers','Métiers'],['banques','Banques']]},
  {k:'mode',        ic:'👗', t:'Mode & vêtements', c:'pink',
   desc:"Ce que l’on porte, et ce que cela dit de son rang.",
   champs:[['classes','Vêtements selon les classes'],['uniformes','Uniformes'],['bijoux','Bijoux'],['couleurs','Couleurs symboliques']]},
  {k:'gastronomie', ic:'🍽', t:'Gastronomie',      c:'coral',
   desc:"Ce que l’on mange et ce que l’on boit, du quotidien au festin.",
   champs:[['plats','Plats typiques'],['boissons','Boissons'],['rares','Aliments rares']]},
  {k:'langues',     ic:'🗣️', t:'Langues & écriture',c:'blue',
   desc:"Comment on se parle et comment on écrit.",
   champs:[['langues','Langues'],['alphabet','Alphabet'],['dialectes','Dialectes']]}
];
const SO_PAGE={};SO_PAGES.forEach(p=>{SO_PAGE[p.k]=p;});

/* Images fournies pour les cases, rangées dans blah/Photos/Société/case/.
   Une image téléversée depuis la carte prend le pas sur celle-ci. */
const SO_IMG='../Photos/Soci%C3%A9t%C3%A9/case/';
const SO_FICHIERS={
  traditions:'tradition.png',
  noblesse:'hi%C3%A9rarchie.png',
  education:'%C3%A9tudes.png',
  economie:'monaie.png',
  mode:'mode.png',
  gastronomie:'gastronomie.png',
  langues:'Langue%20et%20%C3%A9criture.png'
};
function soFichier(k){return SO_FICHIERS[k]?SO_IMG+SO_FICHIERS[k]:'';}

/* Les cartes de la vue d'ensemble — une par sous-onglet.
   Leur image se téléverse directement depuis la carte (voir imgPick). */
const SO_CARTES=[
  {k:'traditions', ic:'🎭', t:'Traditions & coutumes', tag:'Rites',   c:'purple',
   desc:"Fêtes, rites et usages : ce que l’on répète, et pourquoi.",
   meta:()=>{const n=(SOD().traditions||[]).length;return n+' tradition'+(n>1?'s':'');}},
  {k:'noblesse',   ic:'👑', t:'Noblesse & titres',     tag:'Rangs',   c:'amber',
   desc:"Qui commande à qui : titres, privilèges et règles de succession.",
   meta:()=>{const n=(SOD().titres||[]).length;return n+' titre'+(n>1?'s':'');}}
].concat(SO_PAGES.map(p=>({k:p.k,ic:p.ic,t:p.t,tag:p.t.split(' ')[0],c:p.c,desc:p.desc,
   meta:()=>{const o=SOD()[p.k]||{};const n=p.champs.filter(([ch])=>String(o[ch]||'').trim()).length;
     return n+' / '+p.champs.length+' rubrique'+(p.champs.length>1?'s':'')+' remplie'+(n>1?'s':'');}})));

function soDefaults(){return{
  pages:{vue:"La société rassemble tout ce qui fait tenir un monde debout : ce que l'on fête, qui commande, comment on apprend, ce que l'on porte et ce que l'on mange.\n\nChaque domaine a son sous-onglet. Les traditions et les titres de noblesse ont leurs propres fiches ; les autres domaines tiennent sur une page."},
  resume:{titre:'La société',badges:[['Traditions vivantes','purple'],['Noblesse héréditaire','amber'],['Monnaie commune','green']]}
};}

function soInit(){
  const C=SOD();
  ['traditions','titres','cards'].forEach(k=>{if(!Array.isArray(C[k]))C[k]=[];});
  if(!C.pages||typeof C.pages!=='object'||Array.isArray(C.pages))C.pages={};
  if(!C.resume||typeof C.resume!=='object'||Array.isArray(C.resume))C.resume={};
  if(!Array.isArray(C.resume.badges))C.resume.badges=[];
  SO_PAGES.forEach(p=>{if(!C[p.k]||typeof C[p.k]!=='object'||Array.isArray(C[p.k]))C[p.k]={};});
  if(C.soSeeded)return;
  const D=soDefaults();
  if(!String(C.pages.vue||'').trim())C.pages.vue=D.pages.vue;
  if(!C.resume.titre)C.resume.titre=D.resume.titre;
  if(!C.resume.badges.length)C.resume.badges=D.resume.badges;
  C.soSeeded=true;
  save();
}
function loadSociete(){soInit();renderSociete();}
function renderSociete(){
  soRenderVue();soRenderTraditions();soRenderNoblesse();
  SO_PAGES.forEach(p=>soRenderPage(p));
}
function switchSocieteTab(id,el){
  document.querySelectorAll('#page-societe .subpanel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#page-societe .subtab').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById('societe-panel-'+id);
  if(panel)panel.classList.add('active');
  if(el)el.classList.add('active');
}
function soGo(k,flashId){
  navigateTo('societe');
  switchSocieteTab(k,document.querySelector('#page-societe .subtab[data-so="'+k+'"]'));
  const m=document.querySelector('.main');if(m)m.scrollTo(0,0);window.scrollTo(0,0);
  if(flashId)setTimeout(()=>flashCard(flashId),60);
}
/* Les images (bannières des cartes, schéma de hiérarchie) sont rangées dans
   une liste, ce qui permet de les exclure du localStorage comme les autres. */
function soImg(k){
  const C=SOD();
  if(!Array.isArray(C.cards))C.cards=[];
  let c=C.cards.find(x=>x&&x.id===k);
  if(!c){c={id:k};C.cards.push(c);}
  return c;
}

/* ---------- 1. VUE D'ENSEMBLE ---------- */
function soRenderVue(){
  const C=SOD(),R=C.resume||{};
  const badges=(R.badges||[]).map(b=>mgPill(b[0],b[1])).join('');
  const nbT=(C.traditions||[]).length,nbN=(C.titres||[]).length;
  const remplies=SO_PAGES.reduce((n,p)=>{const o=C[p.k]||{};return n+p.champs.filter(([ch])=>String(o[ch]||'').trim()).length;},0);
  const total=SO_PAGES.reduce((n,p)=>n+p.champs.length,0);
  const stats=[[nbT,'Tradition'+(nbT>1?'s':'')],[nbN,'Titre'+(nbN>1?'s':'')+' de noblesse'],[remplies+' / '+total,'Rubriques remplies']]
    .map(s=>`<div><div class="mg-stat-num">${s[0]}</div><div class="mg-stat-lab">${mgEsc(s[1])}</div></div>`).join('');

  const cartes=SO_CARTES.map(c=>{
    // image téléversée si elle existe, sinon celle fournie dans Photos/Société/case/
    const p=mgP(c.c),img=soImg(c.k).image||soFichier(c.k);
    const fond=img
      ? `background-image:url('${img}')`
      : `background:linear-gradient(135deg,rgba(${p.rgb},0.30),rgba(${p.rgb},0.08))`;
    return `<div class="mg-page-card" onclick="soGo('${c.k}')">
      <div class="mg-banner" style="border-bottom-color:rgba(${p.rgb},0.28);background:linear-gradient(135deg,rgba(${p.rgb},0.22),rgba(${p.rgb},0.08))">
        <span class="mg-banner-img" style="${fond}"></span>
        ${img?'':`<span style="position:absolute;left:15px;top:50%;transform:translateY(-50%);font-size:30px;line-height:1">${mgEsc(c.ic)}</span>`}
        <span class="mg-banner-tag" style="color:${p.v}">${mgEsc(c.tag)}</span>
        <button class="mg-icon-btn mg-edit" style="position:absolute;right:9px;bottom:7px;z-index:3"
          onclick="imgPick('societeCarte','${c.k}',event)" title="Choisir l’image de la carte">📷</button>
      </div>
      <div class="mg-page-body">
        <div class="mg-page-title">${mgEsc(c.ic)} ${mgEsc(c.t)}</div>
        <div class="mg-page-meta">${mgEsc(c.meta())}</div>
        <div class="mg-page-desc">${mgEsc(c.desc)}</div>
        <div class="mg-page-link" style="border-color:rgba(${p.rgb},0.35);color:${p.v};background:rgba(${p.rgb},0.08)"><span>Voir la page</span><span>→</span></div>
      </div>
    </div>`;
  }).join('');

  mgSet('so-vue',`
  <div class="card card-accent-left" style="border-left-color:var(--c-societe)">
    ${mgHead('🌍 '+mgEsc(R.titre||'La société'),mgEditBtn("mgOpenForm('soResume')",'Modifier le résumé'))}
    <div class="mg-hero">
      <div>
        <div class="mg-prose">${mgPara((C.pages||{}).vue)}</div>
        ${badges?`<div class="mg-chips" style="margin-top:14px">${badges}</div>`:''}
        <div class="mg-stats">${stats}</div>
      </div>
      ${mgImgSrc(SO_ILLUS,'Société')}
    </div>
  </div>

  <div class="grid-auto">${cartes}</div>`);
}

/* ---------- 2. TRADITIONS & COUTUMES ----------
   Même présentation que le bestiaire : une grille de cartes verticales, et
   la fiche détaillée qui prend la place de la grille quand on en ouvre une. */
let soTradOuverte=null;
function soOpenTradition(id){
  closeAllModals();soGo('traditions');
  soTradOuverte=id;soRenderTraditions();
  const m=document.querySelector('.main');if(m)m.scrollTo(0,0);window.scrollTo(0,0);
}
function soFermerTradition(){soTradOuverte=null;soRenderTraditions();}
function soRenderTraditions(){
  const C=SOD(),ts=C.traditions||[];
  if(soTradOuverte){
    const t=ts.find(x=>x.id===soTradOuverte);
    if(t){mgSet('so-traditions',soTraditionFiche(t));return;}
    soTradOuverte=null;   // la tradition a été supprimée
  }
  const cartes=ts.map(t=>rpgCardHTML({
    kind:'tradition',id:t.id,domId:'so-trad-'+t.id,
    nom:t.nom,sous:t.frequence||'',couleur:t.couleur||'purple',
    image:t.image,fallback:mgEsc(t.icone||'🎭'),
    onclick:`soOpenTradition('${t.id}')`,
    compteurs:lkCompteCarte('tradition',t.id),
    actions:`<button onclick="event.stopPropagation();mgOpenForm('soTradition','${t.id}')" title="Modifier la tradition">✎</button>`
      +`<button onclick="imgPick('tradition','${t.id}',event)" title="Changer l’image">📷</button>`
  })).join('');

  mgSet('so-traditions',`
  <div class="mg-section-title">
    <div class="mg-head-t">🎭 Traditions & coutumes</div>
    <span style="font-size:12px;color:var(--text3)">${ts.length} tradition${ts.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('soTradition')",'Ajouter une tradition')}</span>
  </div>
  ${ts.length?`<div class="cr-cards">${cartes}</div>`:mgEmpty('Aucune tradition enregistrée.')}`);
}
function soTraditionFiche(t){
  const blocs=[['origine','Origine'],['deroulement','Déroulement'],
               ['participants','Participants'],['frequence','Fréquence']]
    .filter(b=>String(t[b[0]]||'').trim())
    .map(b=>`<div class="cr-block"><div class="cr-block-t">${mgEsc(b[1])}</div><div class="cr-block-d">${mgEsc(t[b[0]])}</div></div>`).join('');
  const ligne=(lab,tags,vide)=>`<div class="cr-link-row"><span class="cr-link-lab">${mgEsc(lab)}</span><div class="tag-row" style="flex:1">${tags.length?tags.join(''):`<span class="cr-auto">${mgEsc(vide)}</span>`}</div></div>`;
  return `
  <div style="display:flex;gap:9px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <button class="btn btn-sm" onclick="soFermerTradition()">← Retour aux traditions</button>
    <span style="margin-left:auto">${mgEditBtn("mgOpenForm('soTradition','"+t.id+"')",'Modifier la tradition')}</span>
  </div>
  ${ficheHeadHTML({
    kind:'tradition',id:t.id,imgKind:'tradition',
    nom:t.nom,type:t.frequence||'',
    badges:t.icone?mgPill(t.icone+' Tradition',t.couleur||'purple'):'',
    image:t.image,fallback:mgEsc(t.icone||'🎭'),couleur:t.couleur||'purple',
    stats:lkStats('tradition',t.id),onStat:`flashCard('so-trad-liens')`,
    resume:t.desc,resumeVide:'Pas encore de description — clique sur ✎ pour la remplir.'
  })}
  ${blocs?`<div class="cr-grid" style="margin-bottom:16px">${blocs}</div>`:''}
  <div class="card" style="margin-bottom:0" id="so-trad-liens">
    ${mgHead('🔗 Liens','')}
    ${ligne('Lieux',lieuTags(t.lieux),'Aucun lieu lié')}
    ${ligne('Personnages',persoTags(t.persos),'Aucun personnage concerné')}
    ${ligne('Dieux',dieuTags(t.dieux),'Aucun dieu concerné')}
    ${ligne('Espèces',crEspeceTags(t.especes),'Aucune espèce concernée')}
    ${ligne('Événements',crEventTags(t.events),'Aucun événement lié')}
    <div class="cr-auto" style="margin-top:9px">Ces liens se règlent sur cette fiche, et apparaissent aussitôt sur les fiches d’en face.</div>
  </div>`;
}

/* ---------- 3. NOBLESSE & TITRES ---------- */
function soRenderNoblesse(){
  const C=SOD(),ns=C.titres||[],hier=soImg('hierarchie').image;
  const fiches=ns.map(t=>{
    const p=mgP(t.couleur||'amber');
    const blocs=[['role','Rôle'],['privileges','Privilèges'],['obligations','Obligations'],['succession','Succession']]
      .filter(b=>String(t[b[0]]||'').trim())
      .map(b=>`<div class="cr-block"><div class="cr-block-t">${mgEsc(b[1])}</div><div class="cr-block-d">${mgEsc(t[b[0]])}</div></div>`).join('');
    return `<div class="cr-fiche" id="so-titre-${t.id}" style="border-left-color:${p.v}">
      <div class="cr-fiche-head">
        <span class="cr-portrait" style="width:56px;height:56px;font-size:26px;background:rgba(${p.rgb},0.15);color:${p.v};border:1px solid rgba(${p.rgb},0.28)">${mgEsc(t.icone||'👑')}</span>
        <div style="flex:1;min-width:0"><div class="mg-name w" style="font-size:16px">${mgEsc(t.nom)}</div></div>
        ${mgActs("mgOpenForm('soTitre','"+t.id+"')",'Modifier le titre')}
      </div>
      ${blocs?`<div class="cr-grid">${blocs}</div>`
        :`<div style="font-size:12px;color:var(--text3);font-style:italic">Fiche encore vide — clique sur ✎ pour la remplir.</div>`}
    </div>`;
  }).join('');

  mgSet('so-noblesse',`
  <div class="card">
    ${mgHead('Hiérarchie','')}
    <div class="cr-schema" onclick="imgPick('societeHierarchie','hierarchie',event)" title="Cliquer pour choisir une image">
      ${hier
        ? `<img src="${hier}" alt="Hiérarchie de la noblesse">`
        : `<div style="font-size:30px;line-height:1;margin-bottom:8px">👑</div>
           <div style="font-size:12px;color:var(--text2)">Cliquer pour choisir une image</div>
           <div style="font-size:11px;color:var(--text3);margin-top:3px">Un arbre des rangs, un schéma, un tableau…</div>`}
    </div>
    ${hier?`<div style="margin-top:9px;display:flex;gap:7px">
      <button class="btn btn-sm" onclick="imgPick('societeHierarchie','hierarchie',event)">Remplacer</button>
      <button class="btn btn-danger btn-sm" onclick="imgRemove('societeHierarchie','hierarchie',event)">Retirer</button></div>`:''}
  </div>

  <div class="mg-section-title">
    <div class="mg-head-t">👑 Titres</div>
    <span style="font-size:12px;color:var(--text3)">${ns.length} titre${ns.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('soTitre')",'Ajouter un titre')}</span>
  </div>
  ${ns.length?fiches:mgEmpty('Aucun titre enregistré.')}`);
}

/* ---------- 4 à 8. PAGES SIMPLES ---------- */
function soRenderPage(p){
  const o=SOD()[p.k]||{},pal=mgP(p.c);
  const blocs=p.champs.map(([k,l])=>`
    <div class="card card-accent-left" style="border-left-color:${pal.v}">
      ${mgHead(mgEsc(l),'')}
      <div class="mg-prose">${mgPara(o[k])}</div>
    </div>`).join('');
  mgSet('so-'+p.k,`
  <div class="mg-section-title">
    <div class="mg-head-t">${mgEsc(p.ic)} ${mgEsc(p.t)}</div>
    <span style="margin-left:auto">${mgEditBtn("mgOpenForm('so_"+p.k+"')",'Modifier '+p.t)}</span>
  </div>
  ${blocs}`);
}

/* ---------- Formulaires ---------- */
Object.assign(MG_SPECS,{
  soResume:{title:'Société — résumé',store:SOD,after:renderSociete,
    load:()=>{const C=SOD();return{titre:C.resume.titre,texte:C.pages.vue,badges:C.resume.badges};},
    save:d=>{const C=SOD();C.resume.titre=d.titre;C.pages.vue=d.texte;C.resume.badges=d.badges;},
    fields:[
      {k:'titre',l:'Titre',t:'text'},
      {k:'texte',l:'Texte — une ligne vide sépare deux paragraphes',t:'area',h:170},
      {k:'badges',l:'Étiquettes',t:'rows',cols:[{t:'text',ph:'Libellé'},{t:'pal'}]}
    ]},
  soTradition:{title:'Tradition / coutume',list:'traditions',req:'nom',store:SOD,after:renderSociete,
    fields:[
      {k:'nom',l:'Nom *',t:'text',ph:'La Nuit des Lanternes',oi:"imgSyncPick('tradition')"},
      {k:'image',l:'Image de la tradition',t:'img',kind:'tradition',
       ph:'Grande image affichée sur la carte et en tête de fiche. Sans image, l’icône ci-dessous est utilisée.'},
      {k:'icone',l:'Icône (utilisée sans image)',t:'text',ph:'🎭',oi:"imgSyncPick('tradition')"},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'desc',l:'Description',t:'area',h:110},
      {k:'origine',l:'Origine',t:'area',h:90},
      {k:'deroulement',l:'Déroulement',t:'area',h:110},
      {k:'participants',l:'Participants',t:'area',h:90},
      {k:'frequence',l:'Fréquence',t:'text',ph:'Chaque solstice d’hiver'},
      {k:'lieux',l:'Lieux',t:'pick',src:()=>S.lieux,tags:ids=>lieuTags(ids),empty:'Aucun lieu créé'},
      {k:'persos',l:'Personnages concernés',t:'pick',src:()=>S.personnages,tags:ids=>persoTags(ids),empty:'Aucun personnage créé'},
      {k:'dieux',l:'Dieux concernés',t:'pick',src:()=>S.dieux||[],tags:ids=>dieuTags(ids),empty:'Aucun dieu créé'},
      {k:'especes',l:'Espèces concernées — la tradition apparaîtra aussitôt sur leur fiche du bestiaire',t:'pick',
        src:()=>CRD().especes||[],tags:ids=>crEspeceTags(ids),empty:'Aucune espèce créée dans le bestiaire'},
      {k:'events',l:'Événements liés',t:'pick',src:()=>S.evenements,tags:ids=>crEventTags(ids),empty:'Aucun événement créé'}
    ]},
  soTitre:{title:'Titre de noblesse',list:'titres',req:'nom',store:SOD,after:renderSociete,
    fields:[
      {k:'nom',l:'Nom *',t:'text',ph:'Duc / Duchesse'},
      {k:'icone',l:'Icône',t:'text',ph:'👑'},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'role',l:'Rôle',t:'area',h:100},
      {k:'privileges',l:'Privilèges',t:'area',h:100},
      {k:'obligations',l:'Obligations',t:'area',h:100},
      {k:'succession',l:'Succession',t:'area',h:100}
    ]}
});
/* Une fiche de formulaire par page simple */
SO_PAGES.forEach(p=>{
  MG_SPECS['so_'+p.k]={title:p.t,store:SOD,after:renderSociete,
    load:()=>Object.assign({},SOD()[p.k]||{}),
    save:d=>{SOD()[p.k]=d;},
    fields:p.champs.map(([k,l])=>({k,l,t:'area',h:110}))};
});
