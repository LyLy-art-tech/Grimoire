/* ======================================================================
   GRIMOIRE — modules/creatures.js
   Créatures — bestiaire en 4 sous-onglets (dépend de magie.js pour MG_SPECS).
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

/* =========================================================================
   MODULE CRÉATURES — le bestiaire, en 4 sous-onglets.
   Tout est rangé dans S.creatures, donc sauvegardé dans le localStorage comme
   le reste du Grimoire (seules les images de fiche restent en session + .json).
   Le module réutilise les briques visuelles de la page Magie (mg-card, mg-head,
   mg-pill, mg-stats…) : même glassmorphism, mêmes thèmes, aucune couleur en dur
   — tout passe par les variables --c-creature de la charte.
   ========================================================================= */
function CRD(){if(!S.creatures||typeof S.creatures!=='object'||Array.isArray(S.creatures))S.creatures={};return S.creatures;}

/* Illustration de la vue d'ensemble — hébergée sur GitHub Pages (voir IMG_BASE) */
const CR_IMG=IMG_BASE+'creatures.png';

const CR_TYPES=[
  ['humanoide',  'Humanoïde',      'teal'],
  ['metamorphe', 'Métamorphe',     'purple'],
  ['hybride',    'Hybride',        'amber'],
  ['immortel',   'Immortel',       'blue'],
  ['bete',       'Bête / animale', 'green'],
  ['esprit',     'Esprit / entité','pink'],
  ['mortvivant', 'Mort-vivant',    'slate'],
  ['elementaire','Élémentaire',    'coral'],
  ['divin',      'Divin',          'red'],
  ['autre',      'Autre',          'slate']
];
const CR_TYPE={};CR_TYPES.forEach(t=>{CR_TYPE[t[0]]=t;});
function crT(k){return CR_TYPE[k]||CR_TYPE.autre;}

/* Statut d'une espèce (remplace l'ancien « état de conservation ») */
const CR_STATUTS=[
  ['commune',     'Commune',      'green'],
  ['rare',        'Rare',         'amber'],
  ['quasieteinte','Quasi-éteinte','coral'],
  ['eteinte',     'Éteinte',      'slate'],
  ['legendaire',  'Légendaire',   'purple'],
  ['mythique',    'Mythique',     'pink'],
  ['inconnue',    'Inconnue',     'slate']
];
const CR_STAT={};CR_STATUTS.forEach(c=>{CR_STAT[c[0]]=c;});
function crS(k){return CR_STAT[k]||null;}
const CR_INTEL=[['','— non précisé —'],['oui','Intelligente'],['partielle','Semi-intelligente'],['non','Non intelligente']];
const CR_INTEL_L={oui:['Intelligente','teal'],partielle:['Semi-intelligente','amber'],non:['Non intelligente','slate']};

/* Relations entre espèces. Le 4e élément est la relation inverse : toutes ces
   relations se lisent pareil dans les deux sens, mais la colonne est gardée
   comme pour les dieux, au cas où une relation asymétrique serait ajoutée. */
const CR_REL_TYPES=[
  ['allies',      'Alliés',            'green', 'allies'],
  ['ennemis',     'Ennemis',           'red',   'ennemis'],
  ['sacres',      'Sacrés',            'purple','sacres'],
  ['neutres',     'Neutres',           'slate', 'neutres'],
  ['predateur',   'Prédateur / Proie', 'coral', 'predateur'],
  ['symbiotiques','Symbiotiques',      'teal',  'symbiotiques'],
  ['rivaux',      'Rivaux',            'amber', 'rivaux']
];
const CR_REL={};CR_REL_TYPES.forEach(t=>{CR_REL[t[0]]=t;});
function crRelT(k){return CR_REL[k]||CR_REL.neutres;}
function crRelInverse(k){return crRelT(k)[3];}

/* Sous-onglets internes d'une fiche d'espèce */
const CR_ONGLETS=[
  ['infos','📋 Informations techniques'],['lore','📖 Lore'],['liens','🔗 Liens']
];
/* Informations techniques affichées en tableau : [clé, libellé, icône] */
const CR_INFOS=[
  ['taille','Taille','↕'],['vie','Espérance de vie','⧗'],['regime','Régime alimentaire','🍖'],
  ['langage','Langues','🗣'],['affinitesNat','Affinités naturelles','✦']
];

function crDefaults(){return{
  pages:{vue:"Le bestiaire rassemble toutes les espèces qui peuplent le monde : ce qu'elles sont, où elles vivent, ce dont elles sont capables.\n\nChaque espèce a sa fiche dans l'onglet « Bestiaire ». Les règles communes à toutes les espèces sont réunies dans « Concepts généraux », et le vocabulaire propre au bestiaire dans le « Glossaire »."},
  concepts:[
    {id:uid(),icone:'🧠',couleur:'teal',  titre:'Espèces intelligentes et non-intelligentes',texte:''},
    {id:uid(),icone:'🌘',couleur:'purple',titre:'Règles de transformation',                 texte:''},
    {id:uid(),icone:'⚖',couleur:'amber', titre:'Hiérarchie inter-espèces',                 texte:''},
    {id:uid(),icone:'⚭',couleur:'pink',  titre:'Reproduction entre espèces différentes',   texte:''},
    {id:uid(),icone:'📖',couleur:'blue',  titre:'Notions générales du bestiaire',           texte:''}
  ]
};}
function crInit(){
  const C=CRD();
  ['especes','concepts','glossaire'].forEach(k=>{if(!Array.isArray(C[k]))C[k]=[];});
  if(!C.pages||typeof C.pages!=='object'||Array.isArray(C.pages))C.pages={};
  if(C.crSeeded)return;
  const D=crDefaults();
  if(!String(C.pages.vue||'').trim())C.pages.vue=D.pages.vue;
  if(!C.concepts.length)C.concepts=D.concepts;
  C.crSeeded=true;
  save();
}
/* Reprise des anciennes fiches d'espèce. Idempotent : une fiche déjà reprise
   n'a plus ces propriétés, rien n'est donc converti deux fois. */
const CR_STATUT_REPRISE={commune:'commune',repandue:'commune',rare:'rare',tresrare:'rare',
  menacee:'quasieteinte',quasieteinte:'quasieteinte',eteinte:'eteinte',mythique:'mythique'};
/* Ajoute un ancien texte à la suite d'un autre, sans jamais rien écraser */
function crFusion(cible,titre,texte){
  const t=String(texte||'').trim();if(!t)return cible;
  const c=String(cible||'').trim();
  return c?c+'\n\n'+titre+' : '+t:t;
}
function crMigre(){
  const C=CRD();let touche=false;
  (C.especes||[]).forEach(e=>{
    // « État de conservation » devient « Statut »
    if(e.conservation!==undefined){
      if(!e.statut)e.statut=CR_STATUT_REPRISE[e.conservation]||'';
      delete e.conservation;touche=true;
    }
    // « Anatomie » devient « Apparence »
    if(e.anatomie!==undefined){
      e.apparence=crFusion(e.apparence,'Anatomie',e.anatomie);
      delete e.anatomie;touche=true;
    }
    // « Forces » devient « Résistances »
    if(e.forces!==undefined){
      e.resistances=crFusion(e.resistances,'Forces',e.forces);
      delete e.forces;touche=true;
    }
    // « Transformations possibles » rejoint « Capacités & pouvoirs »
    if(e.transformations!==undefined){
      e.capacites=crFusion(e.capacites,'Transformations possibles',e.transformations);
      delete e.transformations;touche=true;
    }
  });
  if(touche)save();
}
function loadCreatures(){crInit();crMigre();renderCreatures();}
function renderCreatures(){crRenderVue();crRenderBestiaire();crRenderConcepts();crRenderGlossaire();}
function switchCreatureTab(id,el){
  document.querySelectorAll('#page-creatures .subpanel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#page-creatures .subtab').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById('creatures-panel-'+id);
  if(panel)panel.classList.add('active');
  if(el)el.classList.add('active');
}
/* Va sur un sous-onglet (et éventuellement met en évidence une fiche) */
function crGo(k,flashId){
  navigateTo('creatures');
  switchCreatureTab(k,document.querySelector('#page-creatures .subtab[data-cr="'+k+'"]'));
  const m=document.querySelector('.main');if(m)m.scrollTo(0,0);window.scrollTo(0,0);
  if(flashId)setTimeout(()=>flashCard(flashId),60);
}

/* ---------- Liens automatiques ----------
   Un personnage appartient à une espèce si le champ « Espèce / race » de sa
   fiche correspond au nom de l'espèce ou à l'une de ses variantes. La
   comparaison ignore la casse, les accents, la ponctuation et le pluriel, et
   accepte un nom composé (« elfe noir » est reconnu comme un « elfe »). */
function crNorm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/s$/,'');
}
function crAliases(e){
  const out=[crNorm(e.nom)];
  String(e.variantes||'').split(/[\n,;]+/).forEach(v=>{const n=crNorm(v);if(n)out.push(n);});
  return out.filter(Boolean);
}
function crMatch(espece,aliases){
  const n=crNorm(espece);if(!n)return false;
  const mots=n.split(' ');
  return aliases.some(a=>n===a||mots.indexOf(a)>=0);
}
function crPersos(e){
  const al=crAliases(e);if(!al.length)return[];
  return (S.personnages||[]).filter(p=>crMatch(p.espece,al));
}
/* Personnages + factions + lieux + événements + artefacts + dieux rattachés à
   une espèce. Tout est déduit des personnages de l'espèce et des autres fiches,
   et complété par les liens ajoutés à la main sur la fiche. Rien n'est stocké
   en double : la liste est recalculée à chaque affichage. */
function crLinks(e){
  const persos=crPersos(e),ids=persos.map(p=>p.id);
  const uniq=a=>a.filter((v,i)=>v&&a.indexOf(v)===i);
  const from=(k,extra)=>uniq([].concat.apply([],persos.map(p=>idsDe(p[k]))).concat(Array.isArray(extra)?extra:[]));
  const evs=uniq((S.evenements||[])
    .filter(ev=>(Array.isArray(ev.persos)?ev.persos:[]).some(x=>ids.indexOf(x)>=0))
    .map(ev=>ev.id)
    .concat(Array.isArray(e.events)?e.events:[]));
  // artefacts : ceux que portent les personnages de l'espèce, plus ceux dont
  // le détenteur est nommé sur la fiche de l'artefact
  const noms=persos.map(p=>crNorm(p.nom));
  const arts=uniq(from('artefacts').concat(
    (MGD().artefacts||[]).filter(a=>a.proprietaire&&noms.indexOf(crNorm(a.proprietaire))>=0).map(a=>a.id)));
  // dieux : le dieu protecteur déclaré ici, plus ceux qui déclarent cette espèce
  const dieux=uniq([e.dieuId].concat(
    (S.dieux||[]).filter(g=>g&&g.especeId===e.id).map(g=>g.id)));
  return {persos,factions:from('factions',e.factions),lieux:from('lieux',e.lieux),
    events:evs,artefacts:arts,dieux};
}

/* ---------- Relations entre espèces ----------
   Enregistrées uniquement sur la fiche qui les déclare (e.rels), sous la forme
   [idEspèce, type]. La fiche d'en face les relit dans l'autre sens : le lien
   est donc réciproque sans que rien soit saisi ni stocké deux fois. */
function crRels(e){
  const lignes=(Array.isArray(e.rels)?e.rels:[]).filter(r=>Array.isArray(r)&&r[0]&&r[0]!==e.id);
  const out=lignes.map(r=>({id:r[0],type:r[1]||'neutres',propre:true}));
  (CRD().especes||[]).forEach(o=>{
    if(!o||o.id===e.id)return;
    (Array.isArray(o.rels)?o.rels:[]).forEach(r=>{
      if(!Array.isArray(r)||r[0]!==e.id)return;
      if(out.some(x=>x.id===o.id))return;            // déjà déclarée de ce côté-ci
      out.push({id:o.id,type:crRelInverse(r[1]||'neutres'),propre:false,via:o.nom||''});
    });
  });
  return out.filter(r=>(CRD().especes||[]).some(x=>x.id===r.id));
}
/* Badges cliquables vers une autre espèce */
function crEspeceTags(ids){
  return (Array.isArray(ids)?ids:[]).map(id=>{
    const e=(CRD().especes||[]).find(x=>x.id===id);if(!e)return'';
    const p=mgP(e.couleur||crT(e.type)[2]);
    return `<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="crOpenEspece('${e.id}');event.stopPropagation()">${mgEsc(e.icone||'🐾')} ${esc(e.nom||'Sans nom')}</span>`;
  }).filter(Boolean);
}

/* ---------- Traditions ----------
   Le lien est enregistré uniquement sur la tradition (t.especes, onglet
   Société) ; l'espèce le relit, donc les deux fiches montrent la même chose. */
function crTraditions(e){
  return (SOD().traditions||[]).filter(t=>Array.isArray(t.especes)&&t.especes.indexOf(e.id)>=0);
}
function crTraditionTags(ts){
  return (ts||[]).map(t=>{
    const p=mgP(t.couleur||'purple');
    return `<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="soGo('traditions','so-trad-${t.id}');event.stopPropagation()">${mgEsc(t.icone||'🎭')} ${esc(t.nom||'Sans nom')}</span>`;
  });
}
function crEventTags(ids){
  return (Array.isArray(ids)?ids:[]).map(id=>{
    const ev=(S.evenements||[]).find(x=>x.id===id);if(!ev)return'';
    const t=(typeof EVT_TYPES!=='undefined'&&(EVT_TYPES[ev.type]||EVT_TYPES.autre))||{icon:'⌛'};
    return `<span class="tag tag-amber link-tag" style="font-size:11px" onclick="openEvenement('${ev.id}');event.stopPropagation()">${t.icon} ${esc(ev.titre||'Sans titre')}</span>`;
  }).filter(Boolean);
}
function openEvenement(id){closeAllModals();navigateTo('histoire');flashCard('ecard-'+id);}
/* Carte d'espèce verticale, style carte de RPG : l'image occupe toute la carte
   et se fond vers le bas, le nom en grand puis le type se lisent par-dessus.
   Sans image, la même carte affiche l'icône de l'espèce en grand.
   `onclick` : ce que fait un clic sur le corps de la carte. */
function crRpgCard(e,onclick){
  return rpgCardHTML({
    kind:'espece',id:e.id,domId:'cr-esp-'+e.id,
    nom:e.nom,sous:crT(e.type)[1],couleur:e.couleur||crT(e.type)[2],
    image:e.image,fallback:mgEsc(e.icone||'🐾'),onclick,
    compteurs:lkCompteCarte('espece',e.id),
    actions:`<button onclick="event.stopPropagation();mgOpenForm('espece','${e.id}')" title="Modifier l’espèce">✎</button>`
      +`<button onclick="imgPick('espece','${e.id}',event)" title="Changer l’image">📷</button>`
  });
}
function crPortrait(e,size){
  const p=mgP(e.couleur||crT(e.type)[2]),s=size||64;
  return `<span class="cr-portrait" style="width:${s}px;height:${s}px;font-size:${Math.round(s/2.2)}px;background:rgba(${p.rgb},0.15);color:${p.v};border:1px solid rgba(${p.rgb},0.28)">${imgInner(e.image,mgEsc(e.icone||'🐾'))}</span>`;
}

/* ---------- 1. VUE D'ENSEMBLE ---------- */
function crRenderVue(){
  const C=CRD(),es=C.especes||[],persos=S.personnages||[];
  const rows=es.map(e=>({e,persos:crPersos(e)}));
  const lies=new Set();rows.forEach(r=>r.persos.forEach(p=>lies.add(p.id)));
  const top=rows.slice().sort((a,b)=>b.persos.length-a.persos.length).filter(r=>r.persos.length);
  const maxN=top.length?top[0].persos.length:0;

  const stats=[
    [es.length,'Espèce'+(es.length>1?'s':'')+' recensée'+(es.length>1?'s':'')],
    [lies.size,'Personnage'+(lies.size>1?'s':'')+' rattaché'+(lies.size>1?'s':'')],
    [Math.max(0,persos.length-lies.size),'Sans espèce reconnue'],
    [(C.concepts||[]).length,'Concepts'],
    [(C.glossaire||[]).length,'Termes au glossaire']
  ].map(s=>`<div><div class="mg-stat-num">${s[0]}</div><div class="mg-stat-lab">${mgEsc(s[1])}</div></div>`).join('');

  const classement=top.length?top.slice(0,5).map(r=>{
    const p=mgP(r.e.couleur||crT(r.e.type)[2]);
    return `<div style="margin-bottom:11px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:var(--text);cursor:pointer" onclick="crGo('bestiaire','cr-esp-${r.e.id}')">${mgEsc(r.e.icone||'🐾')} ${mgEsc(r.e.nom)}</span>
        <span style="color:${p.v};font-weight:500">${r.persos.length}</span>
      </div>
      ${mgBar(maxN?Math.round(r.persos.length*100/maxN):0,p.v)}
    </div>`;
  }).join(''):`<div style="font-size:12px;color:var(--text3)">Aucun personnage n’est encore rattaché à une espèce. Renseigne le champ « Espèce / race » d’un personnage avec le nom d’une espèce du bestiaire.</div>`;

  mgSet('cr-vue',`
  <div class="card card-accent-left" style="border-left-color:var(--c-creature)">
    ${mgHead('🐾 Le bestiaire',mgEditBtn("mgOpenForm('crIntro')",'Modifier le texte'))}
    <div class="mg-hero">
      <div>
        <div class="mg-prose">${mgPara((C.pages||{}).vue)}</div>
        ${stats?`<div class="mg-stats">${stats}</div>`:''}
      </div>
      ${mgImgSrc(CR_IMG,'Créatures')}
    </div>
  </div>

  <div class="grid-2" style="align-items:start">
    <div class="card" style="margin-bottom:0">
      ${mgHead('Espèces les plus représentées','')}
      ${classement}
    </div>
    <div class="card" style="margin-bottom:0">
      ${mgHead('Répartition par type','')}
      ${(function(){
        const par={};es.forEach(e=>{const k=crT(e.type)[0];par[k]=(par[k]||0)+1;});
        const ks=Object.keys(par);
        if(!ks.length)return '<div style="font-size:12px;color:var(--text3)">Aucune espèce pour l’instant.</div>';
        return ks.map(k=>`<div class="mg-kv"><span>${mgEsc(crT(k)[1])}</span><span>${par[k]}</span></div>`).join('');
      })()}
    </div>
  </div>`);
}

/* ---------- 2. BESTIAIRE ---------- */
let crFiltre='__all__';
function crSetFiltre(k){crFiltre=k;crRenderBestiaire();}
function crRenderBestiaire(){
  const C=CRD(),all=C.especes||[];
  // une espèce ouverte : on affiche sa page détaillée à la place de la liste
  if(crOuverte){
    const e=all.find(x=>x.id===crOuverte);
    if(e){mgSet('cr-bestiaire',crFicheHtml(e));return;}
    crOuverte=null;   // l'espèce a été supprimée
  }
  const shown=crFiltre==='__all__'?all:all.filter(e=>crT(e.type)[0]===crFiltre);
  const used=CR_TYPES.filter(t=>all.some(e=>crT(e.type)[0]===t[0]));
  const filters=[['__all__','Toutes','slate']].concat(used).map(([k,l,c])=>{
    const p=mgP(c),on=k===crFiltre,n=k==='__all__'?all.length:all.filter(e=>crT(e.type)[0]===k).length;
    return `<button class="mg-filter" onclick="crSetFiltre('${k}')" style="${on?`border-color:${p.v};background:rgba(${p.rgb},0.16);color:${p.v};font-weight:500`:''}">${k==='__all__'?'':`<span class="mg-filter-dot" style="background:${p.v}"></span>`}<span>${mgEsc(l)}</span><span class="mg-filter-n">${n}</span></button>`;
  }).join('');

  // la grille de cartes EST le bestiaire : un clic ouvre la page détaillée
  const cartes=shown.map(e=>crRpgCard(e,`crOpenEspece('${e.id}')`)).join('');

  mgSet('cr-bestiaire',`
  <div class="mg-filters">
    <span class="mg-head-t">Type</span>
    <div class="mg-filter-row">${filters}</div>
    <span class="mg-count"><span>${shown.length} espèce${shown.length>1?'s':''}</span>${mgAddBtn("mgOpenForm('espece')",'Ajouter une espèce')}</span>
  </div>
  ${shown.length?`<div class="cr-cards">${cartes}</div>`:mgEmpty(all.length?'Aucune espèce de ce type.':'Aucune espèce dans le bestiaire.')}`);
}

/* ---------- 2 bis. FICHE D'ESPÈCE — page détaillée style RPG ---------- */
let crOuverte=null,crOnglet='infos',crTousMembres=false;

function crOpenEspece(id){
  closeAllModals();navigateTo('creatures');
  switchCreatureTab('bestiaire',document.querySelector('#page-creatures .subtab[data-cr="bestiaire"]'));
  crOuverte=id;crOnglet='infos';crTousMembres=false;crRenderBestiaire();
  const m=document.querySelector('.main');if(m)m.scrollTo(0,0);window.scrollTo(0,0);
}
function crFermer(){crOuverte=null;crRenderBestiaire();}
function crSetOnglet(k){crOnglet=k;crRenderBestiaire();}
function crVoirMembres(){crTousMembres=!crTousMembres;crRenderBestiaire();}
/* Un clic sur un chiffre de la barre ouvre l'onglet Liens, où tout est détaillé */
function crFocusLien(){
  if(crOnglet!=='liens'){crOnglet='liens';crRenderBestiaire();}
}
/* Affinités magiques : les types de magie déclarés sur la fiche */
function crAffinites(e){
  const ids=Array.isArray(e.affinites)?e.affinites:[];
  return (MGD().types||[]).filter(t=>ids.indexOf(t.id)>=0);
}
function crAffiniteTags(e){
  return crAffinites(e).map(t=>{
    const p=mgP(t.couleur);
    return `<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="mgGo('types')">${mgEsc(t.icone||'✦')} ${esc(t.nom)}</span>`;
  });
}

function crFicheHtml(e){
  const p=mgP(e.couleur||crT(e.type)[2]);
  const L=crLinks(e),aff=crAffinites(e);
  const stat=crS(e.statut),intel=CR_INTEL_L[e.intelligente];

  /* --- En-tête : portrait à gauche, statistiques et résumé à droite --- */
  const badges=[mgPill(crT(e.type)[1],e.couleur||crT(e.type)[2])]
    .concat(intel?[mgPill(intel[0],intel[1])]:[])
    .concat(e.esprit?[mgPill('☯ '+e.esprit,'purple')]:[])
    .concat(stat?[mgPill('◈ '+stat[1],stat[2])]:[]).join('');
  const symbole=imgWrap(
    `<span class="cr-sym" style="color:${p.v};border-color:rgba(${p.rgb},0.35)">${imgInner(e.symbole,mgEsc(e.icone||'❖'))}</span>`,
    'especeSymbole',e.id,'le symbole de l’espèce');
  const entete=ficheHeadHTML({
    kind:'espece',id:e.id,imgKind:'espece',
    nom:e.nom,sousTitre:e.latin,type:crT(e.type)[1],badges,
    image:e.image,fallback:mgEsc(e.icone||'🐾'),couleur:e.couleur||crT(e.type)[2],
    stats:lkStats('espece',e.id).concat([{ico:'✦',n:aff.length,lab:'Affinités magiques'}]),
    onStat:'crFocusLien()',
    resume:e.desc,resumeVide:'Pas encore de résumé — clique sur ✎ pour en écrire un.',
    coin:symbole
  });

  /* --- Sous-onglets internes --- */
  const onglets=`<div class="cr-tabs">
    ${CR_ONGLETS.map(([k,lab])=>`<button class="subtab${crOnglet===k?' active':''}" onclick="crSetOnglet('${k}')">${mgEsc(lab)}</button>`).join('')}
  </div>`;

  /* --- Contenu de l'onglet actif --- */
  /* Une ligne du tableau des informations : la valeur peut être du HTML (badge) */
  const kv=(ico,lab,html)=>html?`<div class="mg-kv"><span>${mgEsc(ico)} ${mgEsc(lab)}</span><span>${html}</span></div>`:'';
  const bloc=(titre,val,coul)=>String(val||'').trim()
    ? `<div class="cr-block" style="border-left:2px solid ${coul}"><div class="cr-block-t">${mgEsc(titre)}</div><div class="cr-block-d">${mgEsc(val)}</div></div>`:'';
  const carteTexte=(titre,val,vide,dernier)=>`<div class="card"${dernier?' style="margin-bottom:0"':''}>
      ${mgHead(mgEsc(titre),'')}
      ${String(val||'').trim()?`<div class="mg-prose">${mgPara(val)}</div>`
        :`<div style="font-size:12px;color:var(--text3);font-style:italic">${mgEsc(vide)}</div>`}
    </div>`;
  const ligne=(lab,tags,vide)=>`<div class="cr-link-row"><span class="cr-link-lab">${mgEsc(lab)}</span><div class="tag-row" style="flex:1">${tags.length?tags.join(''):`<span class="cr-auto">${mgEsc(vide)}</span>`}</div></div>`;

  let corps='';
  if(crOnglet==='infos'){
    const infos=CR_INFOS.filter(i=>String(e[i[0]]||'').trim())
      .map(i=>kv(i[2],i[1],mgEsc(e[i[0]]))).join('')
      +kv('🧠','Intelligence',intel?mgPill(intel[0],intel[1]):'')
      +kv('◈','Statut',stat?mgPill(stat[1],stat[2]):'')
      +kv('🙏','Dieu protecteur',dieuTags([e.dieuId]).join(''));

    /* Relations entre espèces — celles déclarées ici et celles déclarées d'en face */
    const rels=crRels(e);
    const relsHtml=rels.length?`<div class="cr-rels">${rels.map(r=>{
      const o=(CRD().especes||[]).find(x=>x.id===r.id),t=crRelT(r.type),pr=mgP(t[2]);
      const pe=mgP((o&&o.couleur)||crT(o&&o.type)[2]);
      return `<div class="cr-rel">
        <span class="cr-rel-esp" style="background:rgba(${pe.rgb},0.15);color:${pe.v}" onclick="crOpenEspece('${r.id}')" title="Ouvrir la fiche de cette espèce">${mgEsc((o&&o.icone)||'🐾')} ${mgEsc((o&&o.nom)||'Espèce supprimée')}</span>
        <span class="cr-rel-t" style="background:rgba(${pr.rgb},0.15);color:${pr.v}">${mgEsc(t[1])}</span>
        ${r.propre?'':`<span class="cr-auto">déclarée par ${mgEsc(r.via||'l’autre fiche')}</span>`}
      </div>`;
    }).join('')}</div>`
      :`<div style="font-size:12px;color:var(--text3);font-style:italic">Aucune relation déclarée — clique sur ✎ pour en ajouter.</div>`;

    corps=`
    <div class="grid-2" style="align-items:start;margin-bottom:16px">
      <div class="card" style="margin-bottom:0">
        ${mgHead('Informations clés','')}
        ${infos||'<div style="font-size:12px;color:var(--text3)">Aucune information renseignée — clique sur ✎ pour les ajouter.</div>'}
      </div>
      <div class="card" style="margin-bottom:0">
        ${mgHead('Habitats principaux','')}
        <div class="cr-block-d">${mgEsc(e.habitat)||'<span style="color:var(--text3);font-style:italic">Non renseigné.</span>'}</div>
      </div>
    </div>

    <div class="card">
      ${mgHead('Affinités magiques','')}
      <div class="tag-row">${crAffiniteTags(e).join('')||'<span class="cr-auto">Aucune affinité magique déclarée — clique sur ✎ pour en ajouter.</span>'}</div>
    </div>

    ${(String(e.resistances||'').trim()||String(e.faiblesses||'').trim())?`<div class="cr-grid" style="margin-bottom:16px">
      ${bloc('Résistances',e.resistances,'var(--c-chap)')}
      ${bloc('Faiblesses',e.faiblesses,'var(--c-factions)')}
    </div>`:''}

    <div class="card">
      ${mgHead('Relations avec les autres espèces','')}
      ${relsHtml}
      ${String(e.relsEvo||'').trim()?`<div style="margin-top:13px">
        <div class="cr-block-t">Évolution des relations</div>
        <div class="mg-prose">${mgPara(e.relsEvo)}</div></div>`:''}
      <div class="cr-auto" style="margin-top:9px">Une relation saisie ici apparaît aussi sur la fiche de l’autre espèce — elle n’est enregistrée qu’une fois.</div>
    </div>

    <div class="card">
      ${mgHead('Traditions liées','')}
      <div class="tag-row">${crTraditionTags(crTraditions(e)).join('')||'<span class="cr-auto">Aucune tradition — ouvre une tradition dans l’onglet Société et rattache-lui cette espèce.</span>'}</div>
      <div class="cr-auto" style="margin-top:9px">Calculé automatiquement à partir des traditions de l’onglet Société.</div>
    </div>

    ${carteTexte('Mode de reproduction',e.reproduction,'Non renseigné.')}
    ${carteTexte('Variantes connues',e.variantes,'Aucune variante connue. Elles servent aussi à reconnaître les personnages de l’espèce.',true)}`;
  }else if(crOnglet==='lore'){
    corps=`
    ${carteTexte('Résumé',e.desc,'Pas encore de résumé.')}
    ${carteTexte('Apparence',e.apparence,'Couleurs, pelage, ailes, yeux, silhouette… rien n’est encore décrit.')}
    ${carteTexte('Organisation sociale',e.social,'Non renseignée.')}
    ${carteTexte('Culture',e.culture,'Non renseignée.')}
    ${carteTexte('Histoire & origine',e.histoire,'Non renseignée.')}
    ${carteTexte('Capacités & pouvoirs',e.capacites,'Non renseignées.')}

    <div class="card" style="margin-bottom:0">
      ${mgHead('Schéma de transformation','')}
      <div class="cr-schema" onclick="imgPick('especeSchema','${e.id}',event)" title="Cliquer pour choisir une image">
        ${e.schema
          ? `<img src="${e.schema}" alt="Schéma de transformation">`
          : `<div style="font-size:30px;line-height:1;margin-bottom:8px">🌘</div>
             <div style="font-size:12px;color:var(--text2)">Cliquer pour choisir une image</div>
             <div style="font-size:11px;color:var(--text3);margin-top:3px">Un schéma, un croquis, une planche d’évolution…</div>`}
      </div>
      ${e.schema?`<div style="margin-top:9px;display:flex;gap:7px">
        <button class="btn btn-sm" onclick="imgPick('especeSchema','${e.id}',event)">Remplacer</button>
        <button class="btn btn-danger btn-sm" onclick="imgRemove('especeSchema','${e.id}',event)">Retirer</button></div>`:''}
    </div>`;
  }else{
    const membres=L.persos;
    const vus=crTousMembres?membres:membres.slice(0,8);
    const avatars=vus.map(m=>{
      const c=COLORS[m.color||'purple'];
      return `<div class="cr-membre" onclick="openPerso('${m.id}')" title="${esc(m.nom)}">
        <div class="avatar ${c.av}" style="width:44px;height:44px">${imgInner(m.image,mgInitials(m.nom))}</div>
        <div class="cr-membre-n">${mgEsc(trunc(m.nom,16))}</div></div>`;
    }).join('');

    corps=`
    <div class="card">
      ${mgHead('Membres connus','')}
      ${membres.length?`<div class="cr-membres">${avatars}</div>
        ${membres.length>8?`<button class="btn btn-sm" style="margin-top:12px" onclick="crVoirMembres()">${crTousMembres?'Réduire la liste':'Voir tous les membres ('+membres.length+')'}</button>`:''}`
        :`<div style="font-size:12px;color:var(--text3)">Aucun personnage de cette espèce. Renseigne « Espèce / race » sur la fiche d’un personnage avec le nom de l’espèce ou l’une de ses variantes.</div>`}
    </div>

    <div class="card">
      ${mgHead('Aperçu des rattachements','')}
      ${ligne('Personnages',persoTags(L.persos.map(x=>x.id)),'Aucun personnage de cette espèce')}
      ${ligne('Factions',factionTags(L.factions),'Aucune faction liée')}
      ${ligne('Lieux habités',lieuTags(L.lieux),'Aucun lieu lié')}
      ${ligne('Événements',crEventTags(L.events),'Aucun événement lié')}
      ${ligne('Artefacts',artefactTags(L.artefacts),'Aucun artefact lié')}
      ${ligne('Dieux',dieuTags(L.dieux),'Aucun dieu associé')}
      ${ligne('Espèces liées',crEspeceTags(crRels(e).map(r=>r.id)),'Aucune autre espèce liée')}
      ${ligne('Traditions',crTraditionTags(crTraditions(e)),'Aucune tradition liée')}
      <div class="cr-auto" style="margin-top:9px">Tout est recalculé depuis les autres fiches — rien à saisir ici.</div>
    </div>

    <div class="card" style="margin-bottom:0">${mgHead('🔗 Toutes les fiches reliées','')}${liensHTML('espece',e.id)}</div>`;
  }

  return `
  <div style="display:flex;gap:9px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <button class="btn btn-sm" onclick="crFermer()">← Retour au bestiaire</button>
    <span style="margin-left:auto">${mgEditBtn("mgOpenForm('espece','"+e.id+"')",'Modifier l’espèce')}</span>
  </div>

  ${entete}
  ${onglets}
  ${corps}`;
}

/* ---------- 3. CONCEPTS GÉNÉRAUX ---------- */
function crRenderConcepts(){
  const C=CRD(),cs=C.concepts||[];
  const blocs=cs.map(c=>{
    const p=mgP(c.couleur||'teal');
    return `<div class="card card-accent-left" style="border-left-color:${p.v}">
      ${mgHead(`<span style="color:${p.v}">${mgEsc(c.icone||'◈')}</span> ${mgEsc(c.titre)}`,mgEditBtn("mgOpenForm('crConcept','"+c.id+"')",'Modifier ce concept'))}
      <div class="mg-prose">${mgPara(c.texte)}</div>
    </div>`;
  }).join('');
  mgSet('cr-concepts',`
  <div class="mg-section-title">
    <div class="mg-head-t">Règles communes à toutes les espèces</div>
    <span style="font-size:12px;color:var(--text3)">${cs.length} concept${cs.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('crConcept')",'Ajouter un concept')}</span>
  </div>
  ${cs.length?blocs:mgEmpty('Aucun concept défini.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-creature)" onclick="mgOpenForm('crConcept')">+ Ajouter un concept</button>`)}`);
}

/* ---------- 4. GLOSSAIRE ---------- */
function crRenderGlossaire(){
  const C=CRD(),g=(C.glossaire||[]).slice();
  g.sort((a,b)=>String(a.terme||'').localeCompare(String(b.terme||''),'fr',{sensitivity:'base'}));
  let lettre='',html='';
  g.forEach(t=>{
    const ini=(crNorm(t.terme)[0]||'#').toUpperCase();
    if(ini!==lettre){lettre=ini;html+=`<div class="cr-letter">${mgEsc(lettre)}</div>`;}
    let lien='';
    if(t.lienId){
      const esp=(C.especes||[]).find(x=>x.id===t.lienId);
      const con=(C.concepts||[]).find(x=>x.id===t.lienId);
      if(esp)lien=`<span class="tag tag-pink link-tag" style="font-size:11px" onclick="crGo('bestiaire','cr-esp-${esp.id}')">${mgEsc(esp.icone||'🐾')} ${mgEsc(esp.nom)}</span>`;
      else if(con)lien=`<span class="tag tag-teal link-tag" style="font-size:11px" onclick="crGo('concepts')">${mgEsc(con.icone||'◈')} ${mgEsc(con.titre)}</span>`;
    }
    html+=`<div class="cr-entry">
      <div style="flex:1;min-width:0">
        <div class="cr-entry-t">${mgEsc(t.terme)}</div>
        <div class="cr-entry-d">${mgEsc(t.def)||'<span style="color:var(--text3);font-style:italic">Pas encore de définition.</span>'}</div>
        ${lien?`<div class="tag-row" style="margin-top:7px">${lien}</div>`:''}
      </div>
      ${mgActs("mgOpenForm('crTerme','"+t.id+"')",'Modifier ce terme')}
    </div>`;
  });
  mgSet('cr-glossaire',`
  <div class="mg-section-title">
    <div class="mg-head-t">Termes du bestiaire</div>
    <span style="font-size:12px;color:var(--text3)">${g.length} terme${g.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('crTerme')",'Ajouter un terme')}</span>
  </div>
  ${g.length?`<div class="card">${html}</div>`:mgEmpty('Le glossaire est vide.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-creature)" onclick="mgOpenForm('crTerme')">+ Ajouter un terme</button>`)}`);
}

/* ---------- Formulaires du module (moteur générique de la page Magie) ---------- */
Object.assign(MG_SPECS,{
  crIntro:{title:'Bestiaire — texte de présentation',store:CRD,after:renderCreatures,
    load:()=>({texte:(CRD().pages||{}).vue}),
    save:d=>{const C=CRD();if(!C.pages)C.pages={};C.pages.vue=d.texte;},
    fields:[{k:'texte',l:'Texte — une ligne vide sépare deux paragraphes',t:'area',h:170}]},
  espece:{title:'Espèce',list:'especes',req:'nom',store:CRD,after:renderCreatures,
    fields:[
      {k:'nom',l:'Nom *',t:'text',ph:'Elfes des brumes',oi:"imgSyncPick('espece')"},
      {k:'latin',l:'Nom latin (affiché en italique sous le nom)',t:'text',ph:'Homo sylvaticus nebularis'},
      {k:'image',l:'Illustration de l’espèce',t:'img',ph:'Grande image affichée en fond de l’en-tête. Sans image, l’icône ci-dessous est utilisée.'},
      {k:'symbole',l:'Symbole de l’espèce',t:'img',kind:'especeSymbole',ph:'Petit blason affiché en haut à droite de la fiche.'},
      {k:'icone',l:'Icône (utilisée sans image)',t:'text',ph:'🐾',oi:"imgSyncPick('espece')"},
      {k:'type',l:'Type',t:'select',opts:()=>CR_TYPES.map(t=>[t[0],t[1]])},
      {k:'esprit',l:'Lien avec un esprit',t:'text',ph:'Liée à Fenrhal, le Loup blanc'},
      {k:'couleur',l:'Couleur',t:'pal'},

      /* --- 📋 Informations techniques --- */
      {k:'taille',l:'📋 Taille',t:'text',ph:'1,70 m à 1,90 m'},
      {k:'vie',l:'📋 Espérance de vie',t:'text',ph:'300 à 400 ans'},
      {k:'intelligente',l:'📋 Intelligence',t:'select',opts:()=>CR_INTEL},
      {k:'regime',l:'📋 Régime alimentaire',t:'text',ph:'Omnivore, à dominante végétale'},
      {k:'langage',l:'📋 Langues',t:'text',ph:'Sylvain ancien, commun'},
      {k:'affinitesNat',l:'📋 Affinités naturelles',t:'text',ph:'Air et eau'},
      {k:'statut',l:'📋 Statut',t:'select',opts:()=>[['','— non précisé —']].concat(CR_STATUTS.map(c=>[c[0],c[1]]))},
      {k:'dieuId',l:'📋 Dieu protecteur',t:'select',
        opts:()=>[['','— aucun —']].concat((S.dieux||[]).map(g=>[g.id,g.nom||'Sans nom']))},
      {k:'affinites',l:'📋 Affinités magiques — types de magie',t:'pick',
        src:()=>MGD().types||[],tags:ids=>ids.map(id=>{const t=(MGD().types||[]).find(x=>x.id===id);if(!t)return'';const p=mgP(t.couleur);
          return `<span class="tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}">${mgEsc(t.icone||'✦')} ${esc(t.nom)}</span>`;}).filter(Boolean),
        empty:'Aucun type de magie déclaré dans l’onglet Magie'},
      {k:'resistances',l:'📋 Résistances',t:'area',h:80},
      {k:'faiblesses',l:'📋 Faiblesses',t:'area',h:80},
      {k:'habitat',l:'📋 Habitats principaux',t:'area',h:90},
      {k:'reproduction',l:'📋 Mode de reproduction',t:'area',h:90},
      {k:'variantes',l:'📋 Variantes connues — une par ligne (elles servent aussi à reconnaître les personnages)',t:'area',h:80},
      {k:'rels',l:'📋 Relations avec les autres espèces — cherche une espèce par son nom',t:'rows',
        cols:[{t:'refq',cle:'espece',w:'200px',ph:'Nom d’une espèce…',
               src:()=>(CRD().especes||[]).filter(x=>x.id!==(mgForm&&mgForm.id))},
              {t:'sel',w:'175px',opts:()=>CR_REL_TYPES.map(t=>[t[0],t[1]])}]},
      {k:'relsEvo',l:'📋 Évolution des relations — comment elles ont changé au fil du temps',t:'area',h:100},

      /* --- 📖 Lore --- */
      {k:'desc',l:'📖 Résumé',t:'area',h:110},
      {k:'apparence',l:'📖 Apparence',t:'area',h:90,ph:'Couleurs, pelage, ailes, yeux, silhouette…'},
      {k:'social',l:'📖 Organisation sociale',t:'area',h:90},
      {k:'culture',l:'📖 Culture',t:'area',h:90,ph:'Croyances, arts, rites, tabous, façons de vivre…'},
      {k:'histoire',l:'📖 Histoire & origine',t:'area',h:90},
      {k:'capacites',l:'📖 Capacités & pouvoirs — transformations comprises',t:'area',h:110},
      {k:'schema',l:'📖 Schéma de transformation',t:'img',kind:'especeSchema',ph:'Image affichée dans le Lore : croquis, planche d’évolution…'},
      {k:'factions',l:'Factions liées — en plus de celles déduites des personnages',t:'pick',src:()=>S.factions,tags:ids=>factionTags(ids),empty:'Aucune faction créée'},
      {k:'lieux',l:'Lieux habités — en plus de ceux déduits des personnages',t:'pick',src:()=>S.lieux,tags:ids=>lieuTags(ids),empty:'Aucun lieu créé'},
      {k:'events',l:'Événements liés — en plus de ceux déduits des personnages',t:'pick',src:()=>S.evenements,tags:ids=>crEventTags(ids),empty:'Aucun événement créé'}
    ]},
  crConcept:{title:'Concept général',list:'concepts',req:'titre',store:CRD,after:renderCreatures,
    fields:[
      {k:'titre',l:'Titre *',t:'text',ph:'Règles de transformation'},
      {k:'icone',l:'Icône',t:'text',ph:'◈'},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'texte',l:'Texte — une ligne vide sépare deux paragraphes',t:'area',h:200}
    ]},
  crTerme:{title:'Terme du glossaire',list:'glossaire',req:'terme',store:CRD,after:renderCreatures,
    fields:[
      {k:'terme',l:'Terme *',t:'text',ph:'Mue'},
      {k:'def',l:'Définition',t:'area',h:130},
      {k:'lienId',l:'Renvoyer vers',t:'select',opts:()=>[['','— aucun renvoi —']]
        .concat((CRD().especes||[]).map(e=>[e.id,'Espèce : '+(e.nom||'Sans nom')]))
        .concat((CRD().concepts||[]).map(c=>[c.id,'Concept : '+(c.titre||'Sans titre')]))}
    ]}
});

