/* ======================================================================
   GRIMOIRE — modules/lois.js
   Système juridique — 4 sous-onglets : vue d'ensemble, code juridique,
   justice et glossaire.

   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   Dépend de magie.js (moteur de formulaire générique MG_SPECS).
   ====================================================================== */

function LOD(){if(!S.lois||typeof S.lois!=='object'||Array.isArray(S.lois))S.lois={};return S.lois;}

/* Illustration de la vue d'ensemble — rangée dans blah/Photos/, à côté de app/ */
const LO_ILLUS='../Photos/Lois.png';

/* Domaines du droit — chacun sa couleur dans la charte */
const LO_DOMAINES=[
  ['civil',      'Civil',       'blue'],
  ['penal',      'Pénal',       'red'],
  ['militaire',  'Militaire',   'coral'],
  ['magique',    'Magique',     'purple'],
  ['commercial', 'Commercial',  'amber'],
  ['religieux',  'Religieux',   'pink'],
  ['coutumier',  'Coutumier',   'green'],
  ['royal',      'Royal / édit','teal'],
  ['autre',      'Autre',       'slate']
];
const LO_DOM={};LO_DOMAINES.forEach(d=>{LO_DOM[d[0]]=d;});
function loD(k){return LO_DOM[k]||LO_DOM.autre;}

/* Les blocs de texte d'une fiche de loi, dans l'ordre d'affichage */
const LO_BLOCKS=[
  ['desc','Description'],
  ['personnes','Personnes concernées'],
  ['exceptions','Exceptions']
];

function loDefaults(){return{
  pages:{vue:"Le code juridique rassemble les lois qui régissent le monde : ce qu'elles interdisent, qui elles concernent et ce que l'on risque à les enfreindre.\n\nChaque loi a sa fiche dans « Code juridique ». Le fonctionnement des tribunaux et des procès est décrit dans « Justice », et le vocabulaire du droit dans le « Glossaire »."},
  blocs:[
    {id:uid(),icone:'⚖',couleur:'teal',  titre:'Organisation judiciaire',        texte:''},
    {id:uid(),icone:'🏛',couleur:'blue',  titre:'Tribunaux',                      texte:''},
    {id:uid(),icone:'📜',couleur:'amber', titre:'Types de procès',                texte:''},
    {id:uid(),icone:'👥',couleur:'purple',titre:'Rôles — juges, procureurs, avocats, jurés, gardes',texte:''},
    {id:uid(),icone:'🔒',couleur:'slate', titre:'Lieux de détention',             texte:''},
    {id:uid(),icone:'↩',couleur:'green', titre:"Procédures d'appel",             texte:''},
    {id:uid(),icone:'⚔',couleur:'red',   titre:'Peine de mort',                  texte:''},
    {id:uid(),icone:'👑',couleur:'pink',  titre:'Grâce royale',                   texte:''}
  ]
};}
function loInit(){
  const L=LOD();
  ['lois','blocs','glossaire'].forEach(k=>{if(!Array.isArray(L[k]))L[k]=[];});
  if(!L.pages||typeof L.pages!=='object'||Array.isArray(L.pages))L.pages={};
  if(L.loSeeded)return;
  const D=loDefaults();
  if(!String(L.pages.vue||'').trim())L.pages.vue=D.pages.vue;
  if(!L.blocs.length)L.blocs=D.blocs;
  L.loSeeded=true;
  save();
}
function loadLois(){loInit();renderLois();}
function renderLois(){loRenderVue();loRenderCode();loRenderJustice();loRenderGlossaire();}
function switchLoiTab(id,el){
  document.querySelectorAll('#page-lois .subpanel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#page-lois .subtab').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById('lois-panel-'+id);
  if(panel)panel.classList.add('active');
  if(el)el.classList.add('active');
}
/* Va sur un sous-onglet (et éventuellement met en évidence une fiche) */
function loGo(k,flashId){
  navigateTo('lois');
  switchLoiTab(k,document.querySelector('#page-lois .subtab[data-lo="'+k+'"]'));
  const m=document.querySelector('.main');if(m)m.scrollTo(0,0);window.scrollTo(0,0);
  if(flashId)setTimeout(()=>flashCard(flashId),60);
}

/* ---------- Outils ---------- */
function loSanctions(l){
  return (Array.isArray(l.sanctions)?l.sanctions:[]).filter(s=>Array.isArray(s)&&((s[0]||'').trim()||(s[1]||'').trim()));
}
/* Nombre total de crimes/sanctions référencés dans tout le code */
function loNbCrimes(){return (LOD().lois||[]).reduce((n,l)=>n+loSanctions(l).length,0);}
function loDate(iso){
  if(!iso)return '';
  const d=new Date(iso);
  if(isNaN(d.getTime()))return '';
  return d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
}
/* Badges cliquables vers d'autres lois */
function loiTags(ids){
  return (Array.isArray(ids)?ids:[]).map(id=>{
    const l=(LOD().lois||[]).find(x=>x.id===id);if(!l)return'';
    const p=mgP(l.couleur||loD(l.domaine)[2]);
    return `<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="loGo('code','lo-loi-${l.id}');event.stopPropagation()">§ ${esc(l.nom||'Sans nom')}</span>`;
  }).filter(Boolean);
}
/* Chapitres qui citent une loi : on cherche son nom dans le texte du chapitre.
   Comparaison souple (casse, accents et ponctuation ignorés), comme pour le bestiaire. */
function loChapitres(l){
  const cible=crNorm(l.nom);
  if(!cible||cible.length<3)return[];
  return (S.chapitres||[]).filter(c=>{
    const txt=crNorm([c.titre,c.resume,c.notes,c.pdv].filter(Boolean).join(' '));
    return txt.indexOf(cible)>=0;
  });
}
function loChapTags(chaps){
  return chaps.map(c=>`<span class="tag tag-green link-tag" style="font-size:11px" onclick="openChapitre('${c.id}');event.stopPropagation()">▤ Ch. ${esc(String(c.num||'?'))}${c.titre?' — '+esc(trunc(c.titre,24)):''}</span>`);
}
function loPortrait(l,size){
  const p=mgP(l.couleur||loD(l.domaine)[2]),s=size||64;
  return `<span class="cr-portrait" style="width:${s}px;height:${s}px;font-size:${Math.round(s/2.2)}px;background:rgba(${p.rgb},0.15);color:${p.v};border:1px solid rgba(${p.rgb},0.28)">${imgInner(l.image,mgEsc(l.icone||'⚖'))}</span>`;
}

/* ---------- 1. VUE D'ENSEMBLE ---------- */
function loRenderVue(){
  const L=LOD(),lois=L.lois||[];
  const crimes=loNbCrimes();

  const stats=[
    [lois.length,'Loi'+(lois.length>1?'s':'')+' enregistrée'+(lois.length>1?'s':'')],
    [crimes,'Crime'+(crimes>1?'s':'')+' référencé'+(crimes>1?'s':'')],
    [(L.blocs||[]).length,'Blocs sur la justice'],
    [(L.glossaire||[]).length,'Termes au glossaire']
  ].map(s=>`<div><div class="mg-stat-num">${s[0]}</div><div class="mg-stat-lab">${mgEsc(s[1])}</div></div>`).join('');

  /* Dernières modifications */
  const recentes=lois.filter(l=>l.maj).sort((a,b)=>String(b.maj).localeCompare(String(a.maj))).slice(0,5);
  const majHtml=recentes.length
    ? recentes.map(l=>{
        const p=mgP(l.couleur||loD(l.domaine)[2]);
        return `<div class="mg-kv" style="cursor:pointer" onclick="loGo('code','lo-loi-${l.id}')">
          <span style="color:${p.v}">${mgEsc(l.icone||'⚖')} ${mgEsc(l.nom)}</span>
          <span class="lo-maj">${mgEsc(loDate(l.maj))}</span></div>`;
      }).join('')
    : `<div style="font-size:12px;color:var(--text3)">Aucune modification enregistrée pour l’instant. La date se note automatiquement à chaque enregistrement d’une loi.</div>`;

  /* Lois les plus citées dans les chapitres */
  const citees=lois.map(l=>({l,chaps:loChapitres(l)})).filter(x=>x.chaps.length)
    .sort((a,b)=>b.chaps.length-a.chaps.length).slice(0,5);
  const maxC=citees.length?citees[0].chaps.length:0;
  const citHtml=citees.length
    ? citees.map(x=>{
        const p=mgP(x.l.couleur||loD(x.l.domaine)[2]);
        return `<div style="margin-bottom:11px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
            <span style="color:var(--text);cursor:pointer" onclick="loGo('code','lo-loi-${x.l.id}')">${mgEsc(x.l.icone||'⚖')} ${mgEsc(x.l.nom)}</span>
            <span style="color:${p.v};font-weight:500">${x.chaps.length} chap.</span>
          </div>
          ${mgBar(maxC?Math.round(x.chaps.length*100/maxC):0,p.v)}
          <div class="tag-row" style="margin-top:6px">${loChapTags(x.chaps.slice(0,4)).join('')}</div>
        </div>`;
      }).join('')
    : `<div style="font-size:12px;color:var(--text3)">Aucune loi n’est encore citée dans un chapitre. Le nom d’une loi écrit dans le titre, le résumé ou les notes d’un chapitre est repéré automatiquement.</div>`;

  mgSet('lo-vue',`
  <div class="card card-accent-left" style="border-left-color:var(--c-lois)">
    ${mgHead('⚖ Le système juridique',mgEditBtn("mgOpenForm('loIntro')",'Modifier le texte'))}
    <div class="mg-hero">
      <div>
        <div class="mg-prose">${mgPara((L.pages||{}).vue)}</div>
        ${stats?`<div class="mg-stats">${stats}</div>`:''}
      </div>
      ${mgImgSrc(LO_ILLUS,'Lois')}
    </div>
  </div>

  <div class="grid-2" style="align-items:start">
    <div class="card" style="margin-bottom:0">
      ${mgHead('Dernières modifications','')}
      ${majHtml}
    </div>
    <div class="card" style="margin-bottom:0">
      ${mgHead('Lois les plus citées dans les chapitres','')}
      ${citHtml}
    </div>
  </div>
`);
}

/* ---------- 2. CODE JURIDIQUE ---------- */
let loFiltre='__all__';
function loSetFiltre(k){loFiltre=k;loRenderCode();}
/* Onglet actif de chaque fiche de loi : 'fiche' ou 'liens' */
let loOnglet={};
function loSetOnglet(id,k){loOnglet[id]=k;loRenderCode();}
function loRenderCode(){
  const L=LOD(),all=L.lois||[];
  const shown=loFiltre==='__all__'?all:all.filter(l=>loD(l.domaine)[0]===loFiltre);
  const used=LO_DOMAINES.filter(d=>all.some(l=>loD(l.domaine)[0]===d[0]));
  const filters=[['__all__','Toutes','slate']].concat(used).map(([k,lab,c])=>{
    const p=mgP(c),on=k===loFiltre,n=k==='__all__'?all.length:all.filter(l=>loD(l.domaine)[0]===k).length;
    return `<button class="mg-filter" onclick="loSetFiltre('${k}')" style="${on?`border-color:${p.v};background:rgba(${p.rgb},0.16);color:${p.v};font-weight:500`:''}">${k==='__all__'?'':`<span class="mg-filter-dot" style="background:${p.v}"></span>`}<span>${mgEsc(lab)}</span><span class="mg-filter-n">${n}</span></button>`;
  }).join('');

  const fiches=shown.map(l=>{
    const p=mgP(l.couleur||loD(l.domaine)[2]);
    const blocs=LO_BLOCKS.filter(b=>String(l[b[0]]||'').trim())
      .map(b=>`<div class="cr-block"><div class="cr-block-t">${mgEsc(b[1])}</div><div class="cr-block-d">${mgEsc(l[b[0]])}</div></div>`).join('');
    const sanctions=loSanctions(l);
    const sancHtml=sanctions.length
      ? sanctions.map(s=>`<div class="lo-sanction">
          <span class="lo-acte">${mgEsc(s[0]||'—')}</span>
          <span class="lo-fleche">→</span>
          <span class="lo-peine">${mgEsc(s[1]||'—')}</span></div>`).join('')
      : `<div style="font-size:12px;color:var(--text3);font-style:italic">Aucune sanction précisée.</div>`;
    const chaps=loChapitres(l);
    const ligne=(lab,tags,vide)=>`<div class="cr-link-row"><span class="cr-link-lab">${mgEsc(lab)}</span><div class="tag-row" style="flex:1">${tags.length?tags.join(''):`<span class="cr-auto">${mgEsc(vide)}</span>`}</div></div>`;
    return `<div class="cr-fiche" id="lo-loi-${l.id}" style="border-left-color:${p.v}">
      <div class="cr-fiche-head">
        ${imgWrap(loPortrait(l,64),'loi',l.id,'l’image de la loi')}
        <div style="flex:1;min-width:0">
          <div class="mg-name w" style="font-size:16px">${mgEsc(l.nom)}</div>
          <div class="mg-chips" style="margin-top:7px">${mgPill(loD(l.domaine)[1],l.couleur||loD(l.domaine)[2])}${sanctions.length?mgPill(sanctions.length+' sanction'+(sanctions.length>1?'s':''),'red'):''}</div>
          ${l.maj?`<div class="lo-maj" style="margin-top:6px">Modifiée le ${mgEsc(loDate(l.maj))}</div>`:''}
        </div>
        ${mgActs("mgOpenForm('loi','"+l.id+"')",'Modifier la loi')}
      </div>
      <div class="mo-tabs">
        <button type="button" class="subtab${loOnglet[l.id]==='liens'?'':' active'}" onclick="loSetOnglet('${l.id}','fiche')">Fiche</button>
        <button type="button" class="subtab${loOnglet[l.id]==='liens'?' active':''}" onclick="loSetOnglet('${l.id}','liens')">🔗 Liens</button>
      </div>
      ${loOnglet[l.id]==='liens'?liensHTML('loi',l.id):`
      ${blocs?`<div class="cr-grid">${blocs}</div>`
        :`<div style="font-size:12px;color:var(--text3);font-style:italic">Fiche encore vide — clique sur ✎ pour la remplir.</div>`}
      <div class="cr-links">
        <div class="cr-block-t" style="margin-bottom:8px">Sanctions</div>
        ${sancHtml}
      </div>
      <div class="cr-links">
        ${ligne('Lois liées',loiTags(l.lois),'Aucune loi liée')}
        ${ligne('Événements',crEventTags(l.events),'Aucun événement lié')}
        ${ligne('Personnages',persoTags(l.persos),'Aucun personnage concerné')}
        ${ligne('Chapitres',loChapTags(chaps),'Citée dans aucun chapitre')}
        <div class="cr-auto" style="margin-top:9px">Les chapitres se repèrent tout seuls : ils apparaissent dès que le nom de la loi est écrit dans leur titre, leur résumé ou leurs notes.</div>
      </div>`}
    </div>`;
  }).join('');

  mgSet('lo-code',`
  <div class="mg-filters">
    <span class="mg-head-t">Domaine</span>
    <div class="mg-filter-row">${filters}</div>
    <span class="mg-count"><span>${shown.length} loi${shown.length>1?'s':''}</span>${mgAddBtn("mgOpenForm('loi')",'Ajouter une loi')}</span>
  </div>
  ${shown.length?fiches:mgEmpty(all.length?'Aucune loi dans ce domaine.':'Aucune loi enregistrée.')}`);
}

/* ---------- 3. JUSTICE ---------- */
function loRenderJustice(){
  const L=LOD(),bs=L.blocs||[];
  const blocs=bs.map(b=>{
    const p=mgP(b.couleur||'teal');
    return `<div class="card card-accent-left" style="border-left-color:${p.v}">
      ${mgHead(`<span style="color:${p.v}">${mgEsc(b.icone||'⚖')}</span> ${mgEsc(b.titre)}`,mgEditBtn("mgOpenForm('loBloc','"+b.id+"')",'Modifier ce bloc'))}
      <div class="mg-prose">${mgPara(b.texte)}</div>
    </div>`;
  }).join('');
  mgSet('lo-justice',`
  <div class="mg-section-title">
    <div class="mg-head-t">Fonctionnement du système judiciaire</div>
    <span style="font-size:12px;color:var(--text3)">${bs.length} bloc${bs.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('loBloc')",'Ajouter un bloc')}</span>
  </div>
  ${bs.length?blocs:mgEmpty('Aucun bloc défini.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-lois)" onclick="mgOpenForm('loBloc')">+ Ajouter un bloc</button>`)}`);
}

/* ---------- 4. GLOSSAIRE ---------- */
function loRenderGlossaire(){
  const L=LOD(),g=(L.glossaire||[]).slice();
  g.sort((a,b)=>String(a.terme||'').localeCompare(String(b.terme||''),'fr',{sensitivity:'base'}));
  let lettre='',html='';
  g.forEach(t=>{
    const ini=(crNorm(t.terme)[0]||'#').toUpperCase();
    if(ini!==lettre){lettre=ini;html+=`<div class="cr-letter">${mgEsc(lettre)}</div>`;}
    const loi=t.loiId?(L.lois||[]).find(x=>x.id===t.loiId):null;
    html+=`<div class="cr-entry">
      <div style="flex:1;min-width:0">
        <div class="cr-entry-t">${mgEsc(t.terme)}</div>
        <div class="cr-entry-d">${mgEsc(t.def)||'<span style="color:var(--text3);font-style:italic">Pas encore de définition.</span>'}</div>
        ${loi?`<div class="tag-row" style="margin-top:7px">${loiTags([loi.id]).join('')}</div>`:''}
      </div>
      ${mgActs("mgOpenForm('loTerme','"+t.id+"')",'Modifier ce terme')}
    </div>`;
  });
  mgSet('lo-glossaire',`
  <div class="mg-section-title">
    <div class="mg-head-t">Termes juridiques</div>
    <span style="font-size:12px;color:var(--text3)">${g.length} terme${g.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('loTerme')",'Ajouter un terme')}</span>
  </div>
  ${g.length?`<div class="card">${html}</div>`:mgEmpty('Le glossaire est vide.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-lois)" onclick="mgOpenForm('loTerme')">+ Ajouter un terme</button>`)}`);
}

/* ---------- Formulaires du module (moteur générique de la page Magie) ---------- */
Object.assign(MG_SPECS,{
  loIntro:{title:'Système juridique — texte de présentation',store:LOD,after:renderLois,
    load:()=>({texte:(LOD().pages||{}).vue}),
    save:d=>{const L=LOD();if(!L.pages)L.pages={};L.pages.vue=d.texte;},
    fields:[{k:'texte',l:'Texte — une ligne vide sépare deux paragraphes',t:'area',h:170}]},
  loi:{title:'Loi',list:'lois',req:'nom',store:LOD,after:renderLois,stamp:'maj',
    fields:[
      {k:'nom',l:'Nom de la loi *',t:'text',ph:'Interdiction des runes de sang',oi:"imgSyncPick('loi')"},
      {k:'image',l:'Image de la loi',t:'img',ph:'Clique pour choisir une image depuis ton appareil (sceau, blason, page de code…). Sans image, l’icône ci-dessous est utilisée.'},
      {k:'icone',l:'Icône (utilisée sans image)',t:'text',ph:'⚖',oi:"imgSyncPick('loi')"},
      {k:'domaine',l:'Domaine',t:'select',opts:()=>LO_DOMAINES.map(d=>[d[0],d[1]])},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'desc',l:'Description',t:'area',h:110},
      {k:'personnes',l:'Personnes concernées',t:'area',h:90},
      {k:'exceptions',l:'Exceptions',t:'area',h:90},
      {k:'sanctions',l:'Sanctions — un acte et la peine encourue par ligne',t:'rows',
        cols:[{t:'text',ph:'Utilisation d’une rune interdite'},{t:'text',ph:'Emprisonnement à vie'}]},
      {k:'lois',l:'Lois liées',t:'pick',
        src:()=>(LOD().lois||[]).filter(x=>x.id!==(mgForm&&mgForm.id)),
        tags:ids=>loiTags(ids),empty:'Aucune autre loi enregistrée'},
      {k:'events',l:'Événements où elle intervient',t:'pick',src:()=>S.evenements,tags:ids=>crEventTags(ids),empty:'Aucun événement créé'},
      {k:'persos',l:'Personnages concernés',t:'pick',src:()=>S.personnages,tags:ids=>persoTags(ids),empty:'Aucun personnage créé'}
    ]},
  loBloc:{title:'Bloc — fonctionnement de la justice',list:'blocs',req:'titre',store:LOD,after:renderLois,
    fields:[
      {k:'titre',l:'Titre *',t:'text',ph:'Procédures d’appel'},
      {k:'icone',l:'Icône',t:'text',ph:'⚖'},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'texte',l:'Texte — une ligne vide sépare deux paragraphes',t:'area',h:200}
    ]},
  loTerme:{title:'Terme juridique',list:'glossaire',req:'terme',store:LOD,after:renderLois,
    fields:[
      {k:'terme',l:'Terme *',t:'text',ph:'Outrage à magistrat'},
      {k:'def',l:'Définition',t:'area',h:130},
      {k:'loiId',l:'Loi associée',t:'select',opts:()=>[['','— aucune loi —']]
        .concat((LOD().lois||[]).map(l=>[l.id,l.nom||'Sans nom']))}
    ]}
});
