/* ======================================================================
   GRIMOIRE — modules/core.js
   Socle commun — état S, sauvegarde, images, modales, navigation interne,
      listes à cocher et badges partagés par tous les modules.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

/* Base des illustrations livrées avec le site.
   Elles sont hébergées sur GitHub Pages et non en local : un chemin relatif
   comme ../Photos/ ne peut pas fonctionner depuis un téléphone, qui n'a pas
   accès au disque de l'ordinateur. Tous les modules passent par cette
   constante — c'est le seul endroit à modifier si le dossier change. */
const IMG_BASE='https://lyly-art-tech.github.io/Grimoire/images/';

const COLORS={purple:{av:'av-purple',tag:'tag-purple'},teal:{av:'av-teal',tag:'tag-teal'},amber:{av:'av-amber',tag:'tag-amber'},coral:{av:'av-coral',tag:'tag-coral'},green:{av:'av-green',tag:'tag-green'},pink:{av:'av-pink',tag:'tag-pink'},blue:{av:'av-blue',tag:'tag-blue'}};
const AV_HEX={purple:'#a89ef7',teal:'#4db8a4',amber:'#c4a35a',coral:'#e07b54',green:'#7cb87c',pink:'#b87cc8',blue:'#5b9cf6'};

let S={roman:{},magie:{},histoire:{},personnages:[],relations:[],lieux:[],factions:[],chapitres:[],idees:[],arbres:[],evenements:[],mythes:[]};

// Remet en place les listes/objets manquants : une sauvegarde plus ancienne
// n'a pas forcément toutes les rubriques du dashboard actuel.
function normalizeState(){
  ['personnages','relations','lieux','factions','chapitres','idees','arbres','evenements','mythes','dieux'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[];});
  ['roman','magie','histoire','creatures','lois','societe'].forEach(k=>{if(!S[k]||typeof S[k]!=='object'||Array.isArray(S[k]))S[k]={};});
}
function load(){
  try{const d=localStorage.getItem('grimoire_v2');if(d)S=JSON.parse(d);}catch(e){}
  normalizeState();
  arbreCurrentId=(typeof S.arbreCurrentId==='string')?S.arbreCurrentId:'__all__';
  migrateHistoire();
  migrateMagie();
  renderAll();
}
/* Copie de l'état DESTINÉE À LA SAUVEGARDE AUTOMATIQUE DU NAVIGATEUR.
   Les images (avatars, emblèmes, glyphes) et les fichiers joints en sont
   toujours retirés : ils ne vivent que dans la session en cours et dans le
   fichier .json exporté. C'est ce choix qui permet de garder les images en
   pleine qualité, sans réduction — la limite d'environ 5 Mo du localStorage
   ne les concerne jamais. */
const MG_IMG_LISTS=['types','runes','artefacts','combos','porteurs','limites','lexique'];
const CR_IMG_LISTS=['especes','concepts','glossaire'];
const LO_IMG_LISTS=['lois','blocs','glossaire'];
const SO_IMG_LISTS=['traditions','titres','cards'];
function stripKeys(list,keys){
  return list.map(e=>{
    if(!e||typeof e!=='object')return e;
    const c={};for(const p in e)if(keys.indexOf(p)<0)c[p]=e[p];
    return c;
  });
}
/* keys = propriétés à ne pas écrire dans le localStorage */
function stripState(state,keys){
  const light={};for(const k in state)light[k]=state[k];
  ['personnages','lieux','factions','dieux'].forEach(k=>{if(Array.isArray(state[k]))light[k]=stripKeys(state[k],keys);});
  // sous-modules qui rangent leurs fiches dans des sous-objets
  [['magie',MG_IMG_LISTS],['creatures',CR_IMG_LISTS],['lois',LO_IMG_LISTS],['societe',SO_IMG_LISTS]].forEach(([mod,lists])=>{
    const src=state[mod];
    if(!src||typeof src!=='object'||Array.isArray(src))return;
    const o={};for(const k in src)o[k]=src[k];
    lists.forEach(k=>{if(Array.isArray(o[k]))o[k]=stripKeys(o[k],keys);});
    light[mod]=o;
  });
  return light;
}
/* Propriétés qui contiennent une image de fiche. Une fiche peut en avoir
   plusieurs : illustration principale, symbole, schéma. */
const IMG_PROPS=['image','symbole','schema'];
/* Sauvegarde normale : sans les images de fiche (elles restent en pleine qualité en session + .json) */
function stripImages(state){return stripState(state,IMG_PROPS);}
/* Repli si la sauvegarde du navigateur est pleine : on retire aussi les fichiers joints */
function stripFiles(state){return stripState(state,IMG_PROPS.concat(['fichiers']));}
function save(){
  try{localStorage.setItem('grimoire_v2',JSON.stringify(stripImages(S)));imgUpdateNotice();return true;}
  catch(e){
    // Fichiers joints trop volumineux : on garde au moins le texte en local.
    try{localStorage.setItem('grimoire_v2',JSON.stringify(stripFiles(S)));}catch(e2){}
    if(!save._warned){save._warned=true;
      alert("ℹ️ Tes fichiers joints sont trop lourds pour la sauvegarde automatique du navigateur.\n\nTout reste affiché et fonctionne normalement maintenant. Mais pour les conserver, clique sur « ⬇ Exporter » : le fichier .json garde tout — images, blasons et fichiers joints — et « ⬆ Importer » les restaurera à tout moment.");}
    imgUpdateNotice();
    return false;
  }
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}

// === FICHIERS JOINTS (drag & drop) ===
let modalFiles={perso:[],lieu:[],faction:[]};
function handleFiles(type,fileList){
  const files=Array.from(fileList||[]);
  if(!files.length)return;
  let pending=files.length;
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      modalFiles[type].push({name:file.name,mime:file.type||'',data:e.target.result});
      if(--pending===0)renderFilePreviews(type);
    };
    reader.onerror=()=>{if(--pending===0)renderFilePreviews(type);};
    reader.readAsDataURL(file);
  });
}
function removeFile(type,i,ev){if(ev)ev.stopPropagation();modalFiles[type].splice(i,1);renderFilePreviews(type);}
function openFile(type,i){
  const f=modalFiles[type][i];if(!f)return;
  const w=window.open();
  if(w)w.document.write('<title>'+f.name+'</title><body style="margin:0;background:#0a0e1a;display:flex;align-items:center;justify-content:center;height:100vh">'+((f.mime||'').startsWith('image/')?'<img src="'+f.data+'" style="max-width:100%;max-height:100%">':'<iframe src="'+f.data+'" style="width:100%;height:100%;border:none"></iframe>')+'</body>');
}
function renderFilePreviews(type){
  const grid=document.getElementById('fg-'+type);if(!grid)return;
  grid.innerHTML=modalFiles[type].map((f,i)=>{
    const isImg=(f.mime||'').startsWith('image/');
    const thumb=isImg?`<img class="file-thumb" src="${f.data}">`:`<div class="file-icon">📄</div>`;
    return `<div class="file-chip" onclick="openFile('${type}',${i})" title="${f.name}">${thumb}<div class="file-name">${f.name}</div><button class="file-del" onclick="removeFile('${type}',${i},event)">✕</button></div>`;
  }).join('');
}
function fileBadge(ent){const n=ent.fichiers?ent.fichiers.length:0;return n?`<div class="card-files">📎 ${n} fichier${n>1?'s':''}</div>`:'';}
function loadModalFiles(type,ent){
  modalFiles[type]=(ent&&Array.isArray(ent.fichiers))?ent.fichiers.map(f=>({...f})):[];
  renderFilePreviews(type);
}
// Active le glisser-déposer sur les trois zones
['perso','lieu','faction'].forEach(type=>{
  document.addEventListener('DOMContentLoaded',()=>{
    const dz=document.getElementById('dz-'+type);if(!dz)return;
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(type,e.dataTransfer.files);});
  });
});

/* ===================================================================
   IMAGES DE FICHE — avatars de personnages, emblèmes de factions,
   icônes de types de magie, glyphes de runes, icônes d'artefacts.
   L'image est rangée dans la propriété « image » de la fiche concernée
   (donc exportée / importée avec le .json). Sans image, l'avatar par
   défaut (initiales, emoji, glyphe) s'affiche comme avant.
   =================================================================== */
/* AUCUNE RÉDUCTION : les images sont conservées exactement telles qu'elles
   sortent de l'appareil (aucun ré-encodage, donc aucune perte de qualité, et
   l'orientation des photos de téléphone est respectée par le navigateur).
   C'est possible parce qu'elles ne sont jamais écrites dans la sauvegarde
   automatique du navigateur — voir stripFiles().
   Si un jour l'affichage devient lent ou le .json trop lourd, il suffit de
   mettre ici une taille maximale, par exemple IMG_MAX=1200, et les images
   plus grandes seront réduites à 1200 px de côté. */
const IMG_MAX=0;   // 0 = pleine qualité, aucune réduction

function imgLoad(file,cb){
  const fr=new FileReader();
  fr.onerror=()=>alert("Ce fichier n’a pas pu être lu.");
  fr.onload=()=>{
    if(!IMG_MAX){cb(fr.result);return;}   // pleine qualité : on garde le fichier d'origine
    const im=new Image();
    im.onerror=()=>alert("Ce fichier ne semble pas être une image valide.");
    im.onload=()=>{
      let w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
      if(!w||!h||Math.max(w,h)<=IMG_MAX){cb(fr.result);return;}
      const r=IMG_MAX/Math.max(w,h);
      w=Math.max(1,Math.round(w*r));h=Math.max(1,Math.round(h*r));
      try{
        const cv=document.createElement('canvas');cv.width=w;cv.height=h;
        const cx=cv.getContext('2d');
        cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';
        cx.drawImage(im,0,0,w,h);
        const alpha=/png|gif|webp|svg/i.test(file.type||'');   // garde la transparence
        cb(cv.toDataURL(alpha?'image/png':'image/jpeg',0.92));
      }catch(e){cb(fr.result);}   // canvas indisponible : on garde l'original
    };
    im.src=fr.result;
  };
  fr.readAsDataURL(file);
}
/* Ouvre le sélecteur de fichiers de l'appareil (photos, galerie, disque) */
function imgPickFile(cb){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='image/*';inp.className='dz-input';
  inp.onchange=()=>{const f=inp.files&&inp.files[0];if(f)imgLoad(f,cb);inp.remove();};
  document.body.appendChild(inp);inp.click();
}

/* ---- Rappel d'export ------------------------------------------------------
   Comme les images ne sont pas conservées par le navigateur, on compte celles
   présentes dans la session et on prévient tant qu'elles n'ont pas été
   exportées : sinon un simple rechargement de la page les ferait disparaître
   sans avertissement. */
let imgExported=true;   // passe à false dès qu'une image est ajoutée ou retirée
function imgCount(){
  let n=0;
  const scan=l=>{if(Array.isArray(l))l.forEach(e=>{if(e)IMG_PROPS.forEach(p=>{if(e[p])n++;});});};
  scan(S.personnages);scan(S.factions);scan(S.lieux);scan(S.dieux);
  const m=S.magie;
  if(m&&typeof m==='object')MG_IMG_LISTS.forEach(k=>scan(m[k]));
  const c=S.creatures;
  if(c&&typeof c==='object')CR_IMG_LISTS.forEach(k=>scan(c[k]));
  const j=S.lois;
  if(j&&typeof j==='object')LO_IMG_LISTS.forEach(k=>scan(j[k]));
  const so=S.societe;
  if(so&&typeof so==='object')SO_IMG_LISTS.forEach(k=>scan(so[k]));
  return n;
}
function imgTouched(){imgExported=false;imgUpdateNotice();}
function imgUpdateNotice(){
  const el=document.getElementById('img-notice');if(!el)return;
  const n=imgCount();
  if(!n||imgExported){el.style.display='none';return;}
  el.style.display='';
  el.innerHTML=`🖼 ${n} image${n>1?'s':''} non exportée${n>1?'s':''}`
    +`<span>Le navigateur ne les conserve pas : clique sur « ⬇ Exporter » pour les garder dans ton fichier .json.</span>`;
}
window.addEventListener('beforeunload',e=>{
  if(imgExported||!imgCount())return;
  e.preventDefault();e.returnValue='';return '';
});

/* Un type de fiche = où trouver l'objet, quel avatar par défaut, quelle forme */
const IMG_KINDS={
  perso:{box:'p-avatar-pick',round:true,label:'la photo',
    find:id=>(S.personnages||[]).find(x=>x.id===id),
    def:()=>mgInitials(imgVal('p-nom')),col:()=>imgVal('p-color')||'purple',
    after:()=>{renderPersos();renderRelations();renderFactions();renderLieux();renderTimeline();if(typeof renderArbre==='function')renderArbre();}},
  faction:{box:'f-avatar-pick',round:false,label:'l’emblème',
    find:id=>(S.factions||[]).find(x=>x.id===id),
    def:()=>mgInitials(imgVal('f-nom')),col:()=>'amber',
    after:()=>{renderFactions();renderPersos();renderLieux();}},
  lieu:{box:'l-avatar-pick',round:false,label:'l’image du lieu',
    find:id=>(S.lieux||[]).find(x=>x.id===id),
    def:()=>mgInitials(imgVal('l-nom')),col:()=>'blue',
    after:()=>{renderLieux();renderFactions();renderPersos();}},
  tradition:{box:'mgf-img-image',round:false,label:'l’image de la tradition',
    find:id=>(SOD().traditions||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'🎭',col:()=>imgVal('mgf-couleur')||'purple',
    after:()=>renderSociete()},
  type:{box:'mgf-img-image',round:false,label:'l’image du type',
    find:id=>(MGD().types||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'✦',col:()=>imgVal('mgf-couleur')||'blue',
    after:()=>renderMagie()},
  rune:{box:'mgf-img-image',round:false,label:'le dessin de la rune',
    find:id=>(MGD().runes||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-glyphe')||'ᛉ',col:()=>'amber',
    after:()=>renderMagie()},
  artefact:{box:'mgf-img-image',round:false,label:'l’image de l’artefact',
    find:id=>(MGD().artefacts||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'💎',col:()=>'pink',
    after:()=>renderMagie()},
  espece:{box:'mgf-img-image',round:false,label:'l’image de l’espèce',
    find:id=>(CRD().especes||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'🐾',col:()=>imgVal('mgf-couleur')||'pink',
    after:()=>renderCreatures()},
  loi:{box:'mgf-img-image',round:false,label:'l’image de la loi',
    find:id=>(LOD().lois||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'⚖',col:()=>imgVal('mgf-couleur')||'blue',
    after:()=>renderLois()},
  // une espèce a trois images : l'illustration (ci-dessus), son symbole et
  // le schéma de ses transformations — d'où la propriété « prop »
  especeSymbole:{box:'mgf-img-symbole',prop:'symbole',round:false,label:'le symbole de l’espèce',
    find:id=>(CRD().especes||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'❖',col:()=>imgVal('mgf-couleur')||'pink',
    after:()=>renderCreatures()},
  especeSchema:{box:'mgf-img-schema',prop:'schema',round:false,label:'le schéma de transformation',
    find:id=>(CRD().especes||[]).find(x=>x.id===id),
    def:()=>'🌘',col:()=>imgVal('mgf-couleur')||'purple',
    after:()=>renderCreatures()},
  dieu:{box:'mgf-img-image',round:false,label:'le symbole du dieu',
    find:id=>(S.dieux||[]).find(x=>x.id===id),
    def:()=>imgVal('mgf-icone')||'☀',col:()=>imgVal('mgf-couleur')||'amber',
    after:()=>renderDieux()},
  // Société : l'« id » est ici la clé de la carte (traditions, economie…)
  societeCarte:{box:'',round:false,label:'l’image de la carte',
    find:k=>soImg(k),def:()=>'🌍',col:()=>'green',after:()=>renderSociete()},
  societeHierarchie:{box:'',round:false,label:'le schéma de la hiérarchie',
    find:k=>soImg(k),def:()=>'👑',col:()=>'amber',after:()=>renderSociete()}
};
/* Propriété où ranger l'image de ce type de fiche (« image » par défaut) */
function imgProp(kind){const K=IMG_KINDS[kind];return (K&&K.prop)||'image';}
function imgVal(id){const e=document.getElementById(id);return e?String(e.value||'').trim():'';}

/* Image choisie pour une fiche encore jamais enregistrée (ou retirée) */
let imgDraft={};
function imgDraftSet(kind,src){imgDraft[kind]=src;}
function imgDraftClear(kind){delete imgDraft[kind];}
function imgHasDraft(kind){return Object.prototype.hasOwnProperty.call(imgDraft,kind);}
/* Valeur à enregistrer pour une fiche : le brouillon s'il existe, sinon l'image déjà en place */
function imgResolve(kind,prev){return imgHasDraft(kind)?imgDraft[kind]:(prev||'');}

/* Contenu d'un avatar : l'image si elle existe, sinon l'affichage par défaut */
function imgInner(src,fallbackHtml){return src?`<img class="ava-img" src="${src}" alt="" draggable="false">`:fallbackHtml;}
/* Rend un avatar cliquable, avec le crayon ✎ au survol */
function imgWrap(inner,kind,id,what){
  return `<span class="ava-up" onclick="imgPick('${kind}','${id||''}',event)" title="${esc('Cliquer pour choisir '+(what||'une image')+' depuis ton appareil')}">${inner}<span class="ava-pen">✎</span></span>`;
}
/* Avatar complet prêt à l'emploi (image ou valeur par défaut) — pour les cartes et les fiches */
function imgAvatar(kind,id,src,fallbackHtml,cls,style){
  const K=IMG_KINDS[kind]||{};
  return imgWrap(`<span class="${cls||''}" style="${style||''}">${imgInner(src,fallbackHtml)}</span>`,kind,id,K.label);
}

function imgPick(kind,id,ev){
  if(ev){ev.stopPropagation();ev.preventDefault();}
  if(document.body.classList.contains('reader'))return;
  const K=IMG_KINDS[kind];if(!K)return;
  imgPickFile(src=>{
    const ent=id?K.find(id):null;
    if(ent){ent[imgProp(kind)]=src;imgDraftClear(kind);save();K.after();}
    else imgDraftSet(kind,src);   // fiche pas encore enregistrée : on garde en attente
    imgTouched();
    imgRefreshPick(kind,id);
  });
}
function imgRemove(kind,id,ev){
  if(ev){ev.stopPropagation();ev.preventDefault();}
  const K=IMG_KINDS[kind];if(!K)return;
  if(!confirm("Retirer l’image et revenir à l’affichage par défaut ?"))return;
  const ent=id?K.find(id):null;
  if(ent){ent[imgProp(kind)]='';imgDraftClear(kind);save();K.after();}
  else imgDraftSet(kind,'');
  imgTouched();
  imgRefreshPick(kind,id);
}
/* Zone « Image » affichée dans la fiche en cours d'édition */
function imgRefreshPick(kind,id){
  const K=IMG_KINDS[kind];if(!K)return;
  const box=document.getElementById(K.box);if(!box)return;
  const ent=id?K.find(id):null;
  const src=imgHasDraft(kind)?imgDraft[kind]:(ent?ent[imgProp(kind)]||'':'');
  const p=mgP(K.col()),s=68;
  const style=`width:${s}px;height:${s}px;border-radius:${K.round?'50%':'16px'};display:flex;align-items:center;justify-content:center;overflow:hidden;`
    +`font-family:'Cinzel',serif;font-size:${K.round?'20px':'27px'};font-weight:600;`
    +`background:rgba(${p.rgb},0.18);color:${p.v};border:1px solid rgba(${p.rgb},0.35)`;
  box.dataset.kind=kind;box.dataset.eid=id||'';
  box.innerHTML=imgAvatar(kind,id,src,mgEsc(K.def()),'',style)
    +`<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
        <button type="button" class="btn btn-sm" onclick="imgPick('${kind}','${id||''}',event)">${src?'Remplacer l’image':'📷 Choisir une image'}</button>
        ${src?`<button type="button" class="btn btn-danger btn-sm" onclick="imgRemove('${kind}','${id||''}',event)">Retirer l’image</button>`:''}
      </div>`;
}
/* Le libellé par défaut suit ce qu'on tape (nom, emoji, glyphe) tant qu'aucune image n'est posée */
function imgSyncPick(kind){
  const K=IMG_KINDS[kind];if(!K)return;
  const box=document.getElementById(K.box);if(!box)return;
  imgRefreshPick(kind,box.dataset.eid||'');
}

/* =========================================================================
   DEUX BRIQUES VISUELLES PARTAGÉES PAR TOUTES LES LISTES ET TOUTES LES FICHES

   rpgCardHTML()  — la carte verticale du bestiaire, désormais commune aux
                    personnages, lieux, factions, espèces et traditions :
                    l'image occupe toute la carte et se fond vers le bas, le
                    nom se lit par-dessus, les compteurs de liens en bas.
                    Sans image : aplat coloré et initiales.
   ficheHeadHTML() — l'en-tête d'une fiche ouverte : à gauche le portrait au
                    format vertical avec le nom, le type et les badges ; à
                    droite les tuiles de statistiques cliquables puis le résumé.
   ========================================================================= */

/* o = {kind,id,nom,sous,couleur,image,fallback,onclick,compteurs,badge,actions} */
function rpgCardHTML(o){
  const p=mgP(o.couleur||'blue');
  const fond=`background:linear-gradient(180deg,rgba(${p.rgb},0.22) 0%,rgba(${p.rgb},0.06) 55%,rgba(${p.rgb},0) 100%),var(--bg2)`;
  const visuel=o.image
    ? `<img class="cr-rpg-img" src="${o.image}" alt="" draggable="false">`
    : `<span class="cr-rpg-ico" style="color:${p.v}">${o.fallback||''}</span>`;
  const cnt=(o.compteurs||[]).filter(c=>c.n>0);
  return `<div class="cr-rpg" id="${esc(o.domId||'')}" style="${fond}" onclick="${o.onclick||''}" title="${esc(o.nom||'')}">
    ${visuel}
    <span class="cr-rpg-voile"></span>
    ${o.actions?`<div class="cr-rpg-act">${o.actions}</div>`:''}
    <div class="cr-rpg-txt">
      ${o.badge?`<div class="cr-rpg-badge">${o.badge}</div>`:''}
      <div class="cr-rpg-nom">${mgEsc(o.nom||'Sans nom')}</div>
      ${o.sous?`<div class="cr-rpg-type" style="color:${p.v}">${mgEsc(o.sous)}</div>`:''}
      ${cnt.length?`<div class="cr-rpg-cnt">${cnt.map(c=>
        `<span class="cr-rpg-c" title="${esc(c.n+' '+c.lab.toLowerCase())}"><i>${c.ico}</i>${c.n}</span>`).join('')}</div>`:''}
    </div>
  </div>`;
}

/* o = {kind,id,nom,sousTitre,type,badges,image,fallback,couleur,imgKind,
       stats:[{ico,n,lab}],onStat,resume,resumeVide,coin} */
function ficheHeadHTML(o){
  const p=mgP(o.couleur||'blue');
  const fondPortrait=`background:linear-gradient(180deg,rgba(${p.rgb},0.24) 0%,rgba(${p.rgb},0.08) 100%),var(--bg2)`;
  const dedans=o.image
    ? `<img src="${o.image}" alt="" draggable="false">`
    : `<span class="fh-port-ico" style="color:${p.v}">${o.fallback||''}</span>`;
  // le portrait reste cliquable pour changer l'image, comme partout ailleurs
  const portrait=o.imgKind
    ? imgWrap(`<span class="fh-port" style="${fondPortrait}">${dedans}</span>`,o.imgKind,o.id,(IMG_KINDS[o.imgKind]||{}).label)
    : `<span class="fh-port" style="${fondPortrait}">${dedans}</span>`;
  const tuiles=(o.stats||[]).map(s=>
    `<div class="fh-stat" onclick="${o.onStat||''}" title="${esc('Voir '+String(s.lab).toLowerCase()+' dans l’onglet Liens')}">
      <div class="fh-stat-i">${s.ico}</div>
      <div class="fh-stat-n" style="color:${p.v}">${s.n}</div>
      <div class="fh-stat-l">${mgEsc(s.lab)}</div>
    </div>`).join('');
  const resume=String(o.resume||'').trim();
  return `<div class="fh">
    <div class="fh-vis">
      ${portrait}
      <div class="fh-nom">${mgEsc(o.nom||'Sans nom')}</div>
      ${o.sousTitre?`<div class="fh-latin">${mgEsc(o.sousTitre)}</div>`:''}
      ${o.type?`<div class="fh-type" style="color:${p.v}">${mgEsc(o.type)}</div>`:''}
      ${o.badges?`<div class="mg-chips fh-badges">${o.badges}</div>`:''}
      ${o.coin?`<div class="fh-coin">${o.coin}</div>`:''}
    </div>
    <div class="fh-side">
      ${tuiles?`<div class="fh-stats">${tuiles}</div>`:''}
      <div class="fh-res">${resume?mgPara(resume)
        :`<span style="font-size:12px;color:var(--text3);font-style:italic">${mgEsc(o.resumeVide||'Pas encore de description.')}</span>`}</div>
    </div>
  </div>`;
}

/* ---------- En-tête des fiches ouvertes en modale (perso, lieu, faction) ----------
   Une fiche jamais enregistrée n'a ni image ni liens à compter : l'en-tête
   reste alors masqué, et apparaît dès le premier enregistrement. */
const FICHE_MODALES={
  perso:{kind:'perso',box:'p-fiche-head',
    nom:p=>p.nom,sousTitre:p=>p.alias||'',
    type:p=>[p.role,p.espece,p.age].filter(Boolean).join(' · '),
    couleur:p=>p.color||'purple',fallback:p=>mgEsc(mgInitials(p.nom)),
    badges:p=>[p.statut&&p.statut!=='inconnu'?mgPill(STATUT_LABEL[p.statut]||p.statut,'slate'):'',
               p.sexe?mgPill(p.sexe,'teal'):'',
               p.statutSocial?mgPill(p.statutSocial,'amber'):''].filter(Boolean).join(''),
    resume:p=>p.personnalite||p.motiv||'',vide:'Pas encore de description — remplis « Personnalité ».'},
  lieu:{kind:'lieu',box:'l-fiche-head',
    nom:l=>l.nom,sousTitre:l=>{const a=lieuAncetres(l.id);return a.length?a.map(x=>x.nom).join(' › '):'';},
    type:l=>l.type||'',
    couleur:()=>'blue',fallback:l=>mgEsc(mgInitials(l.nom)),
    badges:l=>[l.climat?mgPill('☁ '+trunc(l.climat,26),'teal'):'',
               l.gouv?mgPill('👑 '+trunc(l.gouv,26),'amber'):'',
               l.hab?mgPill('👥 '+trunc(l.hab,26),'green'):''].filter(Boolean).join(''),
    resume:l=>l.desc||'',vide:'Pas encore de description — remplis « Description & ambiance ».'},
  faction:{kind:'faction',box:'f-fiche-head',
    nom:f=>f.nom,sousTitre:f=>{const par=f.parent?(S.factions||[]).find(x=>x.id===f.parent):null;return par?'Sous-faction de '+par.nom:'';},
    type:f=>f.type||'',
    couleur:()=>'amber',fallback:f=>mgEsc(mgInitials(f.nom)),
    badges:f=>[f.devise?mgPill('« '+trunc(f.devise,30)+' »','purple'):'',
               f.symbole?mgPill(trunc(f.symbole,22),'coral'):''].filter(Boolean).join(''),
    resume:f=>f.ideo||f.role||'',vide:'Pas encore de description — remplis « Idéologie ».'}
};
function ficheHeadModale(type,ent){
  const cfg=FICHE_MODALES[type];if(!cfg)return;
  const box=document.getElementById(cfg.box);if(!box)return;
  if(!ent||!ent.id){box.innerHTML='';box.style.display='none';return;}
  box.style.display='';
  box.innerHTML=ficheHeadHTML({
    kind:cfg.kind,id:ent.id,imgKind:type,
    nom:cfg.nom(ent),sousTitre:cfg.sousTitre(ent),type:cfg.type(ent),badges:cfg.badges(ent),
    image:ent.image,fallback:cfg.fallback(ent),couleur:cfg.couleur(ent),
    stats:lkStats(cfg.kind,ent.id),onStat:`ficheGoLiens('${type}')`,
    resume:cfg.resume(ent),resumeVide:cfg.vide
  });
}
/* Un clic sur une tuile de statistique ouvre l'onglet Liens de la même fiche */
function ficheGoLiens(type){
  const tabs=document.querySelectorAll('#modal-'+type+' .mo-tab');
  if(tabs.length)switchFicheTab(type,'liens',tabs[tabs.length-1]);
}

function renderAll(){loadRoman();loadMagie();loadCreatures();loadLois();loadSociete();loadHistoire();renderPersos();loadDieux();renderRelations();renderLieux();renderFactions();renderTimeline();renderMythes();renderChapitres();renderIdees();updateStats();renderAvancement();}

function openModal(type,id,parentId){
  if(type==='perso'){
    document.getElementById('p-edit-id').value='';
    document.getElementById('perso-modal-title').textContent='Nouveau personnage';
    ['nom','alias','age','naissance','appPhysique','appTenue','appSignes','appMagie','perso','passe','motiv','pouvoirs','arc','firstchap','objets','citations','secrets'].forEach(f=>document.getElementById('p-'+f).value='');
    fillEspeceSelect('');fillSexeSelect('');
    fillStatutSocial('');
    renderPickList('p-artefacts',[]);
    persoEditInit(null);
    document.getElementById('p-role').value='';
    document.getElementById('p-statut').value='vivant';
    document.getElementById('p-color').value='purple';
    document.querySelectorAll('.color-dot').forEach(d=>{d.classList.remove('sel');d.textContent='';});
    document.querySelector('[data-color="purple"]').classList.add('sel');
    document.querySelector('[data-color="purple"]').textContent='✓';
    renderFicheRelations(null);
    if(id){const p=S.personnages.find(x=>x.id===id);if(p){
      document.getElementById('p-edit-id').value=id;
      document.getElementById('perso-modal-title').textContent='Modifier personnage';
      ['nom','alias','age','naissance','arc','appPhysique','appTenue','appSignes','appMagie'].forEach(f=>document.getElementById('p-'+f).value=p[f]||'');
      fillEspeceSelect(p.espece||'');fillSexeSelect(p.sexe||'');
      fillStatutSocial(p.statutSocial||'');
      renderPickList('p-artefacts',p.artefacts||[]);
      persoEditInit(p);
      document.getElementById('p-perso').value=p.personnalite||'';
      document.getElementById('p-passe').value=p.passe||'';
      document.getElementById('p-motiv').value=p.motiv||'';
      document.getElementById('p-pouvoirs').value=p.pouvoirs||'';
      document.getElementById('p-role').value=p.role||'';
      document.getElementById('p-statut').value=p.statut||'inconnu';
      document.getElementById('p-firstchap').value=p.firstChap||'';
      document.getElementById('p-objets').value=p.objets||'';
      document.getElementById('p-citations').value=p.citations||'';
      document.getElementById('p-secrets').value=p.secrets||'';
      renderFicheRelations(id);
      const c=p.color||'purple';
      document.getElementById('p-color').value=c;
      document.querySelectorAll('.color-dot').forEach(d=>{d.classList.remove('sel');d.textContent='';});
      const dot=document.querySelector('[data-color="'+c+'"]');
      if(dot){dot.classList.add('sel');dot.textContent='✓';}
    }}
  }
  if(type==='relation'){
    document.getElementById('rel-edit-id').value='';
    ['rel-a','rel-b'].forEach(sid=>{const s=document.getElementById(sid);s.innerHTML='<option value="">—</option>';S.personnages.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.nom;s.appendChild(o);});});
    document.getElementById('rel-type').value='';document.getElementById('rel-desc').value='';document.getElementById('rel-tension').value='';
    document.getElementById('rel-contexte').value='';document.getElementById('rel-type-autre').value='';
    relEvoDraft=[];
    if(!id&&parentId)document.getElementById('rel-a').value=parentId;
    if(id){const r=S.relations.find(x=>x.id===id);if(r){document.getElementById('rel-edit-id').value=id;document.getElementById('rel-a').value=r.a;document.getElementById('rel-b').value=r.b;document.getElementById('rel-type').value=r.type;document.getElementById('rel-desc').value=r.desc||'';document.getElementById('rel-tension').value=r.tension||'';document.getElementById('rel-contexte').value=r.contexte||'';document.getElementById('rel-type-autre').value=r.typeAutre||'';relEvoDraft=(Array.isArray(r.evolution)?r.evolution:[]).map(e=>({chap:e.chap||'',txt:e.txt||''}));}}
    onRelTypeChange(false);
    renderRelEvoEditor();
  }
  if(type==='lieu'){
    document.getElementById('l-edit-id').value='';
    L_FIELDS.forEach(f=>document.getElementById('l-'+f).value='');
    document.getElementById('l-type').value='';
    document.getElementById('lieu-modal-title').textContent='Nouveau lieu';
    let lEd=null;
    if(id){const l=S.lieux.find(x=>x.id===id);if(l){
      lEd=l;
      document.getElementById('l-edit-id').value=id;
      document.getElementById('l-type').value=l.type||'';
      document.getElementById('lieu-modal-title').textContent='Modifier le lieu';
      L_FIELDS.forEach(f=>document.getElementById('l-'+f).value=l[f]||'');
    }}
    // arborescence, événements, personnages et factions : tout est recalculé (voir lieux.js)
    lieuEditInit(lEd);
  }
  if(type==='faction'){
    document.getElementById('f-edit-id').value='';
    document.getElementById('f-parent').value=parentId||'';
    F_FIELDS.forEach(f=>document.getElementById('f-'+f).value='');
    document.getElementById('f-type').value='';
    document.getElementById('faction-modal-title').textContent=parentId?'Nouvelle sous-faction':'Nouvelle faction';
    fillSelect('f-chef',S.personnages,'— Aucun —','');
    renderSelTag('f-chef');
    let fEd=null;
    if(id){const f=S.factions.find(x=>x.id===id);if(f){
      fEd=f;
      document.getElementById('f-edit-id').value=id;
      document.getElementById('f-parent').value=f.parent||'';
      document.getElementById('faction-modal-title').textContent=f.parent?'Modifier sous-faction':'Modifier faction';
      document.getElementById('f-type').value=f.type||'';
      F_FIELDS.forEach(k=>document.getElementById('f-'+k).value=f[k]||'');
      fillSelect('f-chef',S.personnages,'— Aucun —',f.chef||'');
      renderSelTag('f-chef');
    }}
    // membres, relations et lieux : trois tables interactives (voir factions.js)
    factionEditInit(fEd);
  }
  if(type==='chapitre'){
    document.getElementById('c-edit-id').value='';
    document.getElementById('chap-modal-title').textContent='Nouveau chapitre';
    ['num','titre','resume','pdv','lieux','notes'].forEach(f=>document.getElementById('c-'+f).value='');
    document.getElementById('c-statut').value='idee';
    if(id){const c=S.chapitres.find(x=>x.id===id);if(c){document.getElementById('c-edit-id').value=id;document.getElementById('chap-modal-title').textContent='Modifier chapitre';document.getElementById('c-num').value=c.num||'';document.getElementById('c-titre').value=c.titre||'';document.getElementById('c-resume').value=c.resume||'';document.getElementById('c-pdv').value=c.pdv||'';document.getElementById('c-lieux').value=c.lieux||'';document.getElementById('c-statut').value=c.statut||'idee';document.getElementById('c-notes').value=c.notes||'';}}
  }
  if(type==='idee'){document.getElementById('i-texte').value='';document.getElementById('i-cat').value='intrigue';}
  if(type==='event'){
    document.getElementById('e-edit-id').value='';
    document.getElementById('event-modal-title').textContent='Nouvel événement';
    ['titre','date','annee','desc'].forEach(f=>document.getElementById('e-'+f).value='');
    fillEventTypes('autre');
    renderPickList('e-persos',[]);renderPickList('e-lieux',[]);renderPickList('e-factions',[]);
    if(id){const e=S.evenements.find(x=>x.id===id);if(e){
      document.getElementById('e-edit-id').value=id;
      document.getElementById('event-modal-title').textContent='Modifier l\u2019événement';
      document.getElementById('e-titre').value=e.titre||'';
      document.getElementById('e-date').value=e.date||'';
      document.getElementById('e-annee').value=(e.annee===0||e.annee)?e.annee:'';
      document.getElementById('e-desc').value=e.desc||'';
      fillEventTypes(e.type||'autre');
      renderPickList('e-persos',e.persos||[]);renderPickList('e-lieux',e.lieux||[]);renderPickList('e-factions',e.factions||[]);
    }}
  }
  if(type==='mythe'){
    document.getElementById('my-edit-id').value='';
    document.getElementById('my-texte').value='';
    document.getElementById('mythe-modal-title').textContent='Nouveau mythe / légende';
    if(id){const m=S.mythes.find(x=>x.id===id);if(m){document.getElementById('my-edit-id').value=id;document.getElementById('my-texte').value=m.texte||'';document.getElementById('mythe-modal-title').textContent='Modifier le mythe / la légende';}}
  }
  if(type==='perso'||type==='lieu'||type==='faction'){
    let ent=null;
    if(id){const arr=type==='perso'?S.personnages:(type==='lieu'?S.lieux:S.factions);ent=arr.find(x=>x.id===id);}
    loadModalFiles(type,ent);
  }
  if(type==='perso'||type==='faction'||type==='lieu'){
    const pref={perso:'p',faction:'f',lieu:'l'}[type];
    imgDraftClear(type);
    imgRefreshPick(type,document.getElementById(pref+'-edit-id').value);
    // l'en-tête deux colonnes en haut de la fiche (portrait + statistiques)
    const arr=type==='perso'?S.personnages:(type==='lieu'?S.lieux:S.factions);
    ficheHeadModale(type,id?arr.find(x=>x.id===id):null);
  }
  // les fiches à onglets rouvrent toujours sur « Fiche »
  if(typeof resetFicheTab==='function')resetFicheTab(type);
  document.getElementById('modal-'+type).classList.add('open');
}
function closeModal(t){document.getElementById('modal-'+t).classList.remove('open');}
// === FICHE PERSO : statut, liens cliquables, relations intégrées ===
const STATUT_LABEL={vivant:'Vivant',mort:'Mort',disparu:'Disparu',inconnu:'Inconnu'};
function trunc(s,n){s=s||'';return s.length>n?s.slice(0,n)+'…':s;}
function statutTag(st){return st?` <span class="tag st-${st}" style="font-size:10px;vertical-align:middle">${STATUT_LABEL[st]||st}</span>`:'';}
function factionTags(ids){return (Array.isArray(ids)?ids:[]).map(id=>{const f=S.factions.find(x=>x.id===id);return f?`<span class="tag tag-amber link-tag" style="font-size:11px" onclick="openFaction('${f.id}');event.stopPropagation()">⚔ ${f.nom}</span>`:'';}).filter(Boolean);}
function lieuTags(ids){return (Array.isArray(ids)?ids:[]).map(id=>{const l=S.lieux.find(x=>x.id===id);return l?`<span class="tag tag-blue link-tag" style="font-size:11px" onclick="openLieu('${l.id}');event.stopPropagation()">◎ ${l.nom}</span>`:'';}).filter(Boolean);}
function artefactTags(ids){return (Array.isArray(ids)?ids:[]).map(id=>{const a=(MGD().artefacts||[]).find(x=>x.id===id);return a?`<span class="tag tag-pink link-tag" style="font-size:11px" onclick="mgGo('artefacts');event.stopPropagation()">${mgEsc(a.icone||'💎')} ${esc(a.nom||'Sans nom')}</span>`:'';}).filter(Boolean);}
function persoTags(ids){return (Array.isArray(ids)?ids:[]).map(id=>{const p=S.personnages.find(x=>x.id===id);if(!p)return'';const c=COLORS[p.color||'purple'];return`<span class="tag ${c.tag} link-tag" style="font-size:11px" onclick="openPerso('${p.id}');event.stopPropagation()">${p.nom}</span>`;}).filter(Boolean);}
function chapTag(num){
  if(!num)return'';
  const c=S.chapitres.find(x=>String(x.num||'').trim()===String(num).trim());
  const label='▤ Ch. '+num+(c&&c.titre?' — '+trunc(c.titre,26):'');
  return c?`<span class="tag tag-green link-tag" style="font-size:11px" onclick="openChapitre('${c.id}');event.stopPropagation()">${label}</span>`:`<span class="tag tag-green" style="font-size:11px">${label}</span>`;
}
function navigateTo(page){const el=document.querySelector('.nav-item[data-page="'+page+'"]');if(el)goTo(page,el);}
function flashCard(domId){
  const el=document.getElementById(domId);if(!el)return;
  el.classList.remove('card-hi');void el.offsetWidth;el.classList.add('card-hi');
  el.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>el.classList.remove('card-hi'),2100);
}
function closeAllModals(){document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open'));}
function openPerso(id){closeAllModals();openModal('perso',id);}
// toutes les factions, mères et filles, sont dans la même grille : rien à déplier
function openFaction(id){closeAllModals();navigateTo('factions');flashCard('fcard-'+id);}
function openLieu(id){closeAllModals();navigateTo('lieux');flashCard('lcard-'+id);}
function openChapitre(id){closeAllModals();navigateTo('chapitres');flashCard('ccard-'+id);}

// Listes à cocher génériques (fiches perso / lieu / faction)
const PICKERS={
  'p-artefacts':{src:()=>MGD().artefacts||[],tags:ids=>artefactTags(ids),empty:'Aucun artefact créé dans l’onglet Magie'},
  'e-persos':{src:()=>S.personnages,tags:ids=>persoTags(ids),empty:'Aucun personnage créé'},
  'e-lieux':{src:()=>S.lieux,tags:ids=>lieuTags(ids),empty:'Aucun lieu créé'},
  'e-factions':{src:()=>S.factions,tags:ids=>factionTags(ids),empty:'Aucune faction créée'}
};
function renderPickList(key,selected,excludeId){
  const cfg=PICKERS[key];if(!cfg)return;
  const el=document.getElementById(key+'-pick');if(!el)return;
  const arr=cfg.src().filter(e=>!excludeId||e.id!==excludeId);
  const sel=Array.isArray(selected)?selected:[];
  if(!arr.length)el.innerHTML=`<div class="pick-empty">${cfg.empty}</div>`;
  else el.innerHTML=arr.map(e=>`<label class="pick-row"><input type="checkbox" value="${e.id}"${sel.indexOf(e.id)>=0?' checked':''}>${e.nom}${e.parent?' <span class="sf-badge">sous-faction</span>':''}</label>`).join('');
  renderPickTags(key);
}
function readPickList(key){return Array.from(document.querySelectorAll('#'+key+'-pick input:checked')).map(i=>i.value);}
function renderPickTags(key){
  const cfg=PICKERS[key];if(!cfg)return;
  const el=document.getElementById(key+'-tags');if(!el)return;
  el.innerHTML=cfg.tags(readPickList(key)).join('');
}
// Selects avec badge cliquable (chef de faction, territoire)
const SEL_TAGS={'f-chef':ids=>persoTags(ids)};
function fillSelect(id,arr,placeholder,value){
  const s=document.getElementById(id);if(!s)return;
  s.innerHTML=`<option value="">${placeholder}</option>`+arr.map(e=>`<option value="${e.id}">${e.nom}</option>`).join('');
  s.value=value||'';
}
function renderSelTag(id){
  const el=document.getElementById(id+'-tag'),s=document.getElementById(id);
  if(!el||!s)return;
  el.innerHTML=s.value?SEL_TAGS[id]([s.value]).join(''):'';
}
// Les liens perso↔lieu et perso↔faction sont stockés sur le personnage :
// éditer la liste depuis la fiche du lieu / de la faction met les personnages à jour.
/* Les appartenances d'un personnage (p.factions, p.lieux) portent maintenant
   des précisions : {id, fonction, grade, depuis} pour une faction, {id, role}
   pour un lieu. Elles restent stockées UNIQUEMENT sur le personnage — c'est
   ce qui garantit qu'aucune donnée n'existe en double.
   idsDe() ramène la liste d'identifiants, quel que soit le format. */
function idsDe(liste){
  return (Array.isArray(liste)?liste:[]).map(x=>(x&&typeof x==='object')?x.id:x).filter(Boolean);
}
function lienDe(liste,id){
  return (Array.isArray(liste)?liste:[]).find(x=>x&&typeof x==='object'&&x.id===id)||null;
}
function syncPersoLinks(field,ownerId,selectedPersoIds){
  S.personnages.forEach(p=>{
    const arr=(Array.isArray(p[field])?p[field]:[]).map(x=>(x&&typeof x==='object')?x:{id:x});
    const at=arr.findIndex(x=>x.id===ownerId),want=selectedPersoIds.indexOf(p.id)>=0;
    if(want&&at<0)arr.push({id:ownerId});
    if(!want&&at>=0)arr.splice(at,1);   // retirer efface aussi ses précisions
    p[field]=arr;
  });
}
function persosLinkedTo(field,ownerId){return S.personnages.filter(p=>idsDe(p[field]).indexOf(ownerId)>=0).map(p=>p.id);}
function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
document.querySelectorAll('.modal-overlay').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});});

