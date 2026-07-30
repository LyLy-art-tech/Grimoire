/* ======================================================================
   GRIMOIRE — modules/magie.js
   Système de magie — 10 sous-onglets + le moteur de formulaire générique
      réutilisé par le module Créatures.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

// Les anciens champs de la page Magie (nom / source / pouvoirs / limites / règles) sont
// reversés dans les nouveaux sous-onglets (une seule fois). Les anciennes clés restent
// dans la sauvegarde par sécurité, elles ne sont simplement plus affichées.
function migrateMagie(){
  const m=S.magie||{};
  if(m.pagesMigrated)return;
  const p=Object.assign({},m.pages);
  const add=(k,txt)=>{if(!(txt||'').trim())return;p[k]=[(p[k]||'').trim(),txt.trim()].filter(Boolean).join('\n\n');};
  add('vue',m.nom);add('vue',m.pouvoirs);
  add('origine',m.source);
  add('limites',m.limites);add('limites',m.regles);
  S.magie=Object.assign({},m,{pages:p,pagesMigrated:true});
  save();
}
// Navigation interne de l'onglet Magie (sous-onglets)
function switchMagieTab(id,el){
  document.querySelectorAll('#page-magie .subpanel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#page-magie .subtab').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById('magie-panel-'+id);
  if(panel)panel.classList.add('active');
  if(el)el.classList.add('active');
}
const MAGIE_PAGES=['vue','origine','mana','eveil','types','affinites','runes','artefacts','limites','lexique'];

/* =========================================================================
   PAGE MAGIE — vues détaillées (d'après les maquettes « Grimoire — Magie »)
   Tout est stocké dans S.magie et suit les thèmes du Grimoire : les couleurs
   passent par les variables --c-* de la charte, jamais par des codes en dur.
   ========================================================================= */

const MG_PAL={
  purple:{v:'var(--c-accueil)', rgb:'124,106,245', l:'Violet'},
  coral: {v:'var(--c-perso)',   rgb:'224,123,84',  l:'Corail'},
  teal:  {v:'var(--c-relation)',rgb:'77,184,164',  l:'Turquoise'},
  blue:  {v:'var(--c-univers)', rgb:'91,156,246',  l:'Bleu'},
  red:   {v:'var(--c-factions)',rgb:'212,115,106', l:'Rouge'},
  amber: {v:'var(--c-histoire)',rgb:'196,163,90',  l:'Ambre'},
  green: {v:'var(--c-chap)',    rgb:'124,184,124', l:'Vert'},
  pink:  {v:'var(--c-idees)',   rgb:'184,124,200', l:'Rose'},
  slate: {v:'var(--text2)',     rgb:'130,142,160', l:'Gris'}
};
const MG_PAL_KEYS=Object.keys(MG_PAL);
const MG_SEV={faible:{l:'Faible',c:'amber'},modere:{l:'Modéré',c:'coral'},grave:{l:'Grave',c:'red'},mortel:{l:'Mortel',c:'purple'}};
const MG_SEV_KEYS=['faible','modere','grave','mortel'];
const MG_RARETE={commun:{l:'Commun',c:'slate'},rare:{l:'Rare',c:'blue'},tresrare:{l:'Très rare',c:'purple'},legendaire:{l:'Légendaire',c:'amber'},unique:{l:'Unique',c:'pink'}};
const MG_RARETE_KEYS=['commun','rare','tresrare','legendaire','unique'];
/* Les images de la page Magie vivent en ligne, voir IMG_BASE dans core.js */
const MG_IMG=IMG_BASE;

function MGD(){if(!S.magie||typeof S.magie!=='object'||Array.isArray(S.magie))S.magie={};return S.magie;}
function mgP(k){return MG_PAL[k]||MG_PAL.blue;}
function mgEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}
function mgN(v,d){v=parseInt(v,10);return isNaN(v)?(d||0):Math.max(0,Math.min(100,v));}
function mgInitials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?';}
function mgPill(txt,c,extra){const p=mgP(c);return `<span class="mg-pill" style="background:rgba(${p.rgb},0.15);color:${p.v};${extra||''}">${mgEsc(txt)}</span>`;}
function mgAvatar(ini,c,size,img){const p=mgP(c);const s=size||42;return `<span style="flex:none;width:${s}px;height:${s}px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:'Cinzel',serif;font-size:${Math.round(s/3)}px;font-weight:600;background:rgba(${p.rgb},0.18);color:${p.v};border:1px solid rgba(${p.rgb},0.35)">${imgInner(img,mgEsc(ini))}</span>`;}
function mgBar(pct,colorVar){return `<div class="mg-bar"><span style="width:${mgN(pct,0)}%;background:${colorVar}"></span></div>`;}
function mgPara(t){
  const bl=String(t||'').split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  if(!bl.length)return '<p style="color:var(--text3);font-style:italic">Aucun texte pour le moment — clique sur ✎ pour l’écrire.</p>';
  return bl.map(b=>'<p>'+mgEsc(b).replace(/\n/g,'<br>')+'</p>').join('');
}
function mgEditBtn(call,label){return `<button class="mg-icon-btn mg-edit" onclick="${call}" title="${mgEsc(label||'Modifier')}">✎</button>`;}
function mgAddBtn(call,label){return `<button class="mg-icon-btn mg-edit" onclick="${call}">+ ${mgEsc(label)}</button>`;}
function mgHead(title,btns){return `<div class="mg-head"><div class="mg-head-t">${title}</div><div class="mg-head-line"></div>${btns||''}</div>`;}
function mgEmpty(txt,btn){return `<div class="empty"><div class="empty-icon">✦</div>${mgEsc(txt)}${btn?`<div style="margin-top:14px">${btn}</div>`:''}</div>`;}
function mgActs(editCall,label){return `<div class="mg-act"><button class="mg-icon-btn" onclick="event.stopPropagation();${editCall}" title="${mgEsc(label||'Modifier')}">✎</button></div>`;}
/* Illustration encadrée. mgImg() prend un nom de fichier, complété par IMG_BASE ;
   mgImgSrc() une URL complète — pour les images hébergées ailleurs.
   Passer cls='entiere' affiche l'image en entier, sans recadrage. */
function mgImgSrc(src,alt,style,cls){return `<div class="mg-img${cls?' '+cls:''}" style="${style||''}"><img src="${src}" alt="${mgEsc(alt)}" loading="lazy"></div>`;}
function mgImg(file,alt,style,cls){return mgImgSrc(MG_IMG+file,alt,style,cls);}

/* --- Cartes de la vue d'ensemble (une par sous-onglet) --- */
const MG_CARDS=[
  {k:'origine',  img:'origine.jpg',   pos:'center',      title:'Origine',         tag:'Dieux',  c:'purple', desc:"Comment la magie est née de la volonté des dieux et a façonné le monde et ses esprits.", meta:M=>`${(M.eres||[]).length} ères recensées`},
  {k:'mana',     img:'mana.jpg',      pos:'center',      title:'Réserve de mana', tag:'Mana',   c:'blue',   desc:"Ce qu'est le mana, comment il se recharge et pourquoi il doit être préservé.", meta:M=>`${(M.porteurs||[]).length} porteur${(M.porteurs||[]).length>1?'s':''} recensé${(M.porteurs||[]).length>1?'s':''}`},
  {k:'eveil',    img:'eveil.jpg',     pos:'center 30%',  title:'Éveil',           tag:'Éveil',  c:'green',  desc:"Comment les pouvoirs apparaissent et se développent chez un porteur lié à un esprit primordial.", meta:M=>`${(M.etapes||[]).length} étapes`},
  {k:'types',    img:'types.jpg',     pos:'center 45%',  title:'Types de magie',  tag:'Écoles', c:'coral',  desc:"Les différents types de magie, les combinaisons possibles et les voies recommandées.", meta:M=>`${(M.types||[]).length} types déclarés`},
  {k:'affinites',img:'affinites.jpg', pos:'center 42%',  title:'Affinités',       tag:'Liens',  c:'teal',   desc:"Compatibilités entre porteurs, esprits et éléments : ce qui s'attire et ce qui se repousse.", meta:M=>`${(M.porteurs||[]).length} profils comparables`},
  {k:'runes',    img:'runes.jpg',     pos:'center 40%',  title:'Runes',           tag:'Tracés', c:'amber',  desc:"Création, tracé et usage des runes — y compris celles qui restent formellement interdites.", meta:M=>`${(M.runes||[]).length} signes répertoriés`},
  {k:'artefacts',img:'artefacts.jpg', pos:'center 38%',  title:'Artefacts',       tag:'Objets', c:'pink',   desc:"Objets façonnés par la magie : leurs effets, leur rareté et les légendes qui les entourent.", meta:M=>`${(M.artefacts||[]).length} objets répertoriés`},
  {k:'limites',  img:'limites.jpg',   pos:'53% 58%',     title:'Limites',         tag:'Coûts',  c:'red',    desc:"Les limites de la magie et les conséquences en cas d'abus, d'excès ou de perte de contrôle.", meta:M=>`${(M.limites||[]).length} limites documentées`},
  {k:'lexique',  img:'lexique.jpg',   pos:'center 18%',  title:'Lexique',         tag:'Termes', c:'slate',  desc:"Tous les termes propres au système de magie, définis et reliés aux pages concernées.", meta:M=>`${(M.lexique||[]).length} entrées`}
];

/* --- Sources automatiques pour les « chiffres clés » du résumé ---
   [clé, libellé affiché dans le menu, fonction de comptage] */
const MG_SOURCES=[
  ['types',       'Types de magie',          M=>(M.types||[]).length],
  ['combos',      'Combinaisons & voies',    M=>(M.combos||[]).length],
  ['runes',       'Runes',                   M=>(M.runes||[]).length],
  ['runesInt',    'Runes interdites',        M=>(M.runes||[]).filter(r=>r.interdite==='oui').length],
  ['runeCats',    'Catégories de runes',     M=>(M.runeCats||[]).length],
  ['artefacts',   'Artefacts',               M=>(M.artefacts||[]).length],
  ['artefactsMaj','Artefacts majeurs',       M=>(M.artefacts||[]).filter(a=>a.rarete==='legendaire'||a.rarete==='unique').length],
  ['artefactsInt','Artefacts interdits',     M=>(M.artefacts||[]).filter(a=>String(a.cat||'').toLowerCase().indexOf('interdit')>=0).length],
  ['limites',     'Limites',                 M=>(M.limites||[]).length],
  ['lexique',     'Entrées du lexique',      M=>(M.lexique||[]).length],
  ['porteurs',    'Porteurs',                M=>(M.porteurs||[]).length],
  ['eres',        'Ères',                    M=>(M.eres||[]).length],
  ['etapes',      "Étapes de l’éveil",       M=>(M.etapes||[]).length],
  ['signes',      'Signes précurseurs',      M=>(M.signes||[]).length],
  ['principes',   'Principes fondamentaux',  M=>(M.principes||[]).length]
];
const MG_SRC={};MG_SOURCES.forEach(s=>{MG_SRC[s[0]]=s;});
/* Un chiffre clé = [nombre écrit, libellé, clé de source (facultatif)].
   Si une source est choisie, le nombre est recalculé à chaque affichage. */
function mgStatNum(s,M){const src=MG_SRC[s&&s[2]];return src?String(src[2](M)):String((s&&s[0])||'');}

/* --- Contenu de départ : repris des maquettes, entièrement modifiable --- */
function mgDefaults(){return{
 pages:{
  vue:"La magie est la force originelle qui façonne et alimente le monde. Créée par les dieux, elle donne vie aux esprits primordiaux et aux créatures surnaturelles. Elle n'est accessible et utilisable aux mortels qu'à travers une affinité avec le mana, qui lui, permet de manipuler la magie pour en faire des sorts.\n\nChaque porteur dispose d'une réserve de mana qu'il doit gérer avec équilibre et discipline : tout excès se paie, et rien ne se lance sans conséquence.",
  origine:"Au commencement, les dieux façonnent le monde à partir du néant. Ils y insufflent leur essence : c'est cette essence, répandue dans chaque pierre et chaque souffle, que l'on appelle la magie.\n\nDe l'union entre les éléments et les volontés divines naissent les esprits primordiaux. Les premiers mortels reçoivent alors un fragment de cette magie, en se liant à un esprit. Depuis, la magie circule dans le monde par le mana, énergie vitale et invisible qui relie toutes choses.",
  mana:"Le mana est l'énergie magique qui imprègne naturellement le monde. Présente dans chaque être vivant et dans l'environnement, elle peut être manipulée pour créer des sorts. Cependant, seuls les individus nés avec une affinité au mana sont capables de la percevoir, de la canaliser et de l'utiliser.",
  eveil:"L'éveil est le moment où un porteur perçoit le mana pour la première fois. Il survient rarement avant neuf ans et presque jamais après vingt : passé cet âge, le lien avec l'esprit primordial ne se noue plus.\n\nL'éveil ne se provoque pas. Il se reconnaît — souvent trop tard, souvent au pire moment, et toujours au prix d'un premier épuisement.",
  types:"Chaque type de magie correspond à une facette du monde façonnée par les dieux. Un porteur en maîtrise rarement plus de deux : une affinité dominante, héritée de son esprit lié, et parfois une seconde, plus faible, gagnée par le travail.",
  affinites:"Les axes du graphique et les badges reprennent les types de magie déclarés : chaque nouveau type créé ajoute son axe ici et devient sélectionnable comme affinité.",
  runes:"Les runes sont des signes magiques anciens qui empruntent leur pouvoir à la matière ou à l'espace. Leur utilisation est complexe et interdite à la plupart des mortels : un tracé mal fermé libère ce qu'il devait contenir.",
  artefacts:"Les artefacts sont des objets imprégnés de magie ancienne. Ils peuvent amplifier les pouvoirs, protéger, guérir ou tuer. Certains sont d'origine divine ; d'autres ont été créés par des mages légendaires — et quelques-uns n'auraient jamais dû l'être.",
  limites:"Rien ne se lance sans conséquence. Chaque sort prélève du mana, chaque excès se paie, et trois tracés restent formellement proscrits par les temples.",
  lexique:"Tous les termes propres au système de magie, définis une fois pour toutes et reliés aux pages concernées."
 },
 resume:{
  titre:'La magie',
  badges:[['Mana','blue'],['Source unique : les dieux','purple'],['Différents types de magie','coral'],['Affinité requise','green'],['Affinité héréditaire','teal'],['Non transmissible','amber'],['Risque mortel : épuisement de la réserve et de l’énergie vitale','red']],
  stats:[['5','Éléments','types'],['48','Runes','runes'],['12','Artefacts majeurs','artefactsMaj'],['3','Interdits absolus','runesInt']]
 },
 principes:[
  ['✦','Une seule source',"Toute magie provient de la volonté des dieux."],
  ['⛓','Un lien nécessaire',"Un porteur ne peut accéder à la magie qu'en ayant une affinité."],
  ['⚖','Équilibre fragile',"La magie demande équilibre et contrôle : tout excès entraîne des conséquences graves."]
 ],
 infos:[['Nature','Mana'],['Source','Dieux'],['Accessible par','Affinité'],['Unités','Point de mana'],['Usage interdit','Magie noire, runes interdites'],['Transmissible','Non'],['Héréditaire','Oui'],['Risque mortel','Épuisement total du mana']],
 citation:"La magie n'est ni bonne ni mauvaise. Elle est l'écho de la volonté divine… et le reflet de ceux qui la manient.",
 citationSrc:"Livre des Sources, I,4",
 manaPoints:[
  ['☾','Recharge',"La réserve se reconstitue au repos, plus vite pendant le sommeil et à proximité d'un lieu consacré à l'esprit lié. Elle se reconstitue aussi en mangeant, bien que moins efficacement. En dernier recours, la recharge peut être forcée : on peut absorber du mana de force, mais cela a un coût."],
  ['⚖','Facteurs d’influence',"L'âge, l'entraînement, l'état physique et mental, les blessures, la qualité du lien spirituel et l'affinité influencent la réserve disponible, la pureté du mana et le contrôle exercé sur celui-ci."]
 ],
 manaNote:"La réserve correspond à la quantité totale de mana disponible. Elle est souvent autour de 2 ou 3 fioles.\nLa pureté mesure l'efficacité avec laquelle ce mana est utilisé : plus elle est élevée, moins un même sort consomme de mana.\nLe contrôle représente la capacité du porteur à manipuler son mana avec précision, stabilité et finesse.",
 types:[
  {id:'t-feu',      nom:'Feu',      icone:'🜂', couleur:'coral',  desc:"Chaleur, combustion et destruction. Frappe fort, se maîtrise mal.",                     voie:"Voie du Brasier — puissance brute, faible endurance."},
  {id:'t-eau',      nom:'Eau',      icone:'🜄', couleur:'blue',   desc:"Fluidité, glace et courants. Le plus polyvalent des types déclarés.",                   voie:"Voie de la Source — endurance et adaptation."},
  {id:'t-terre',    nom:'Terre',    icone:'🜃', couleur:'green',  desc:"Pierre, racines et matière. Lent à former, très difficile à briser.",                   voie:"Voie de la Racine — protection et ancrage."},
  {id:'t-air',      nom:'Air',      icone:'🜁', couleur:'teal',   desc:"Souffle, vitesse et pression. Peu coûteux, redoutable en mouvement.",                   voie:"Voie du Souffle — vitesse et esquive."},
  {id:'t-lumiere',  nom:'Lumière',  icone:'✦',  couleur:'amber',  desc:"Clarté, révélation et purification. Dissipe l'illusion et repousse l'ombre.",           voie:"Voie de la Veille — révélation et purification."},
  {id:'t-ombre',    nom:'Ombre',    icone:'☾',  couleur:'purple', desc:"Dissimulation, illusion et silence. La frontière la plus proche des interdits.",        voie:"Voie du Voile — discrétion et illusion."},
  {id:'t-guerison', nom:'Guérison', icone:'❧',  couleur:'pink',   desc:"Restauration du corps et du lien. Ne rend jamais plus qu'on ne lui a donné.",           voie:"Voie du Baume — soin et soutien."}
 ],
 limites:[
  {id:'lim1',gravite:'faible',icone:'◔',titre:'Fatigue de canalisation',portee:'Usage courant',desc:"Toute invocation prélève du mana. Enchaîner les sorts mineurs sans pause vide lentement la réserve.",cons:"Tremblements, vision troublée et perte de précision sur les tracés suivants."},
  {id:'lim2',gravite:'faible',icone:'❄',titre:'Refroidissement du lien',portee:'Esprit primordial',desc:"Un porteur qui n'entretient pas sa relation avec son esprit voit sa capacité de canalisation diminuer.",cons:"Les sorts mettent plus longtemps à se former et coûtent davantage de mana."},
  {id:'lim3',gravite:'modere',icone:'⛓',titre:'Un seul lien par porteur',portee:'Règle absolue',desc:"Nul ne peut être lié à deux esprits primordiaux. Tenter un second pacte fracture le premier.",cons:"Rejet spirituel : perte temporaire de tout accès à la magie, parfois plusieurs saisons."},
  {id:'lim4',gravite:'modere',icone:'◈',titre:'Incompatibilité élémentaire',portee:'Affinités',desc:"Combiner deux éléments opposés dans un même sort déstabilise la structure de l'incantation.",cons:"Retour de flamme : l'effet frappe le porteur au lieu de sa cible."},
  {id:'lim5',gravite:'grave',icone:'✦',titre:'Dépassement de réserve',portee:'Épuisement',desc:"Puiser au-delà de sa réserve force le corps à brûler sa propre énergie vitale pour compenser.",cons:"Brûlures internes, vieillissement prématuré, semaines d'alitement — parfois une perte définitive de puissance."},
  {id:'lim6',gravite:'grave',icone:'⌖',titre:'Runes interdites',portee:'3 interdits absolus',desc:"Trois tracés ont été proscrits par les temples : ils ouvrent des passages que rien ne referme.",cons:"Corruption du tracé et de celui qui l'a posé ; la marque reste visible sur la peau à vie."},
  {id:'lim7',gravite:'mortel',icone:'☾',titre:'Magie noire',portee:'Proscrit',desc:"Détourner la magie d'un autre porteur ou d'un esprit pour alimenter sa propre réserve.",cons:"L'esprit primordial rompt le pacte et reprend ce qui lui appartient : la vie du porteur."},
  {id:'lim8',gravite:'mortel',icone:'✖',titre:'Épuisement total',portee:'Point de non-retour',desc:"Lorsque la réserve tombe à zéro et que le porteur continue de canaliser, le lien se consume.",cons:"Mort dans les instants qui suivent ; le corps se vide de toute chaleur avant de s'effondrer."}
 ],
 eres:[
  ['Ère divine',"L'origine des dieux","Les dieux façonnent le monde à partir du néant et y déposent leur essence."],
  ['Ère primordiale',"Naissance des esprits","De cette essence naissent les esprits primordiaux, gardiens vivants de chaque grande force."],
  ['Ère des mortels',"Premiers liens","Les premiers mortels perçoivent le mana et nouent avec les esprits les premières affinités."],
  ['Ère des royaumes',"Codification des arts","Tracés, runes et écoles se codifient ; les temples posent les premiers interdits."],
  ['Ère actuelle',"Northland aujourd'hui","La magie est répandue mais surveillée : trois interdits absolus, et des porteurs de moins en moins nombreux."]
 ],
 liens:[
  ['✧','Dieux',"Créateurs de la magie"],
  ['⛬','Esprits primordiaux',"Nés de la magie"],
  ['◉','Mana',"Énergie vitale"],
  ['☖','Mortels',"Porteurs d'affinité"]
 ],
 etapes:[
  ['9 – 20 ans','Perception',"Le futur porteur commence à sentir le mana comme une pression, une odeur ou un bourdonnement que personne d'autre ne remarque."],
  ['Le jour de l’éveil','Premier contact',"L'esprit primordial se manifeste. Le lien se noue en une fois, sans cérémonie, presque toujours dans un moment de danger ou de détresse."],
  ['Semaines suivantes','Première réserve',"Les fioles de mana se forment. La réserve est étroite et se vide en quelques sorts : c'est la période des épuisements."],
  ['Années suivantes','Contrôle',"Le porteur apprend à doser, à fermer ses tracés et à ne jamais descendre sous la moitié de sa réserve."]
 ],
 signes:[
  ['🜂',"Objets qui chauffent ou givrent au contact de l'enfant"],
  ['☾',"Rêves répétés où un animal ou une silhouette appelle par le nom"],
  ['◉',"Fatigue soudaine et inexpliquée près d'un lieu consacré"],
  ['✦',"Sensibilité à la lumière et perception de traînées dans l'air"]
 ],
 runeCats:[['Offensives','red'],['Défensives','blue'],['De soutien','green'],['De transport','teal'],['De temps','amber'],['Interdites','purple']],
 artefactCats:[['Armes & armures','red'],['Bijoux & talismans','amber'],['Objets de pouvoir','purple'],['Reliques anciennes','teal'],['Artefacts interdits','pink']]
};}

function mgInit(){
  const M=MGD();
  if(!M.pages||typeof M.pages!=='object'||Array.isArray(M.pages))M.pages={};
  ['types','combos','limites','runes','artefacts','lexique','porteurs','principes','infos','eres','liens','manaPoints','etapes','signes','runeCats','artefactCats'].forEach(k=>{if(!Array.isArray(M[k]))M[k]=[];});
  if(!M.resume||typeof M.resume!=='object'||Array.isArray(M.resume))M.resume={};
  if(!Array.isArray(M.resume.badges))M.resume.badges=[];
  if(!Array.isArray(M.resume.stats))M.resume.stats=[];
  if(!M.mgStatsAuto){
    /* Migration : relie une fois les anciens chiffres clés à leur source d'après leur libellé. */
    const map={'éléments':'types','élements':'types','types':'types','types de magie':'types',
      'combinaisons':'combos','combinaisons & voies':'combos',
      'runes':'runes','runes interdites':'runesInt','catégories de runes':'runeCats',
      'artefacts':'artefacts','artefacts majeurs':'artefactsMaj','artefacts interdits':'artefactsInt',
      'limites':'limites','lexique':'lexique','entrées':'lexique','entrées du lexique':'lexique',
      'porteurs':'porteurs','ères':'eres','étapes':'etapes','signes précurseurs':'signes','principes':'principes'};
    M.resume.stats=M.resume.stats.map(s=>{
      if(!Array.isArray(s)||s[2])return s;
      const k=map[String(s[1]||'').trim().toLowerCase()];
      return k?[s[0],s[1],k]:s;
    });
    M.mgStatsAuto=true;
  }
  if(M.mgSeeded)return;
  const D=mgDefaults();
  MAGIE_PAGES.forEach(k=>{if(!String(M.pages[k]||'').trim())M.pages[k]=D.pages[k]||'';});
  if(!M.resume.titre)M.resume.titre=D.resume.titre;
  if(!M.resume.badges.length)M.resume.badges=D.resume.badges;
  if(!M.resume.stats.length)M.resume.stats=D.resume.stats;
  ['principes','infos','manaPoints','types','limites','eres','liens','etapes','signes','runeCats','artefactCats'].forEach(k=>{if(!M[k].length)M[k]=D[k];});
  if(!M.citation)M.citation=D.citation;
  if(!M.citationSrc)M.citationSrc=D.citationSrc;
  if(!M.manaNote)M.manaNote=D.manaNote;
  M.mgSeeded=true;
  save();
}

function saveMagie(){save();}
function loadMagie(){mgInit();renderMagie();}

function renderMagie(){
  mgRenderVue();mgRenderOrigine();mgRenderMana();mgRenderEveil();mgRenderTypes();
  mgRenderAffinites();mgRenderRunes();mgRenderArtefacts();mgRenderLimites();mgRenderLexique();
}
function mgSet(id,html){const e=document.getElementById(id);if(e)e.innerHTML=html;}
function mgGo(k){
  const b=document.querySelector('#page-magie .subtab[data-mg="'+k+'"]');
  switchMagieTab(k,b);
  const m=document.querySelector('.main');if(m)m.scrollTo(0,0);window.scrollTo(0,0);
}

/* ---------- 1. VUE D'ENSEMBLE ---------- */
function mgRenderVue(){
  const M=MGD(),R=M.resume||{};
  const badges=(R.badges||[]).map(b=>mgPill(b[0],b[1])).join('');
  const stats=(R.stats||[]).map(s=>`<div><div class="mg-stat-num">${mgEsc(mgStatNum(s,M))}</div><div class="mg-stat-lab">${mgEsc(s[1])}</div></div>`).join('');
  const cards=MG_CARDS.map(c=>{
    const p=mgP(c.c);
    return `<div class="mg-page-card" onclick="mgGo('${c.k}')">
      <div class="mg-banner" style="border-bottom-color:rgba(${p.rgb},0.28);background:linear-gradient(135deg,rgba(${p.rgb},0.22),rgba(${p.rgb},0.08))">
        <span class="mg-banner-img" style="background-image:url('${MG_IMG}${c.img}');background-position:${c.pos}"></span>
        <span class="mg-banner-tag" style="color:${p.v}">${mgEsc(c.tag)}</span>
      </div>
      <div class="mg-page-body">
        <div class="mg-page-title">${mgEsc(c.title)}</div>
        <div class="mg-page-meta">${mgEsc(c.meta(M))}</div>
        <div class="mg-page-desc">${mgEsc(c.desc)}</div>
        <div class="mg-page-link" style="border-color:rgba(${p.rgb},0.35);color:${p.v};background:rgba(${p.rgb},0.08)"><span>Voir la page</span><span>→</span></div>
      </div>
    </div>`;
  }).join('');
  const principes=(M.principes||[]).length
    ? (M.principes||[]).map(p=>`<div class="mg-tile"><span style="flex:none;font-size:15px;line-height:1.3">${mgEsc(p[0])}</span><div><div class="mg-tile-t">${mgEsc(p[1])}</div><div class="mg-tile-d">${mgEsc(p[2])}</div></div></div>`).join('')
    : `<div style="font-size:12px;color:var(--text3)">Aucun principe pour l’instant.</div>`;
  const infos=(M.infos||[]).map(i=>`<div class="mg-kv"><span>${mgEsc(i[0])}</span><span>${mgEsc(i[1])}</span></div>`).join('');

  mgSet('mg-vue',`
  <div class="card card-accent-left" style="border-left-color:var(--c-univers)">
    ${mgHead('📜 Résumé',mgEditBtn("mgOpenForm('resume')",'Modifier le résumé'))}
    <div class="mg-hero">
      <div>
        <div class="mg-hero-title">${mgEsc(R.titre||'La magie')}</div>
        <div class="mg-prose">${mgPara((M.pages||{}).vue)}</div>
        <div class="mg-chips">${badges}</div>
        ${stats?`<div class="mg-stats">${stats}</div>`:''}
      </div>
      ${mgImg('cercle-sortilege.jpg','Cercle de sortilège')}
    </div>
  </div>

  <div class="grid-auto" style="margin-bottom:16px">${cards}</div>

  <div class="grid-2" style="align-items:start">
    <div class="card" style="margin-bottom:0">
      ${mgHead('Principes fondamentaux',mgEditBtn("mgOpenForm('principes')",'Modifier les principes'))}
      ${principes}
    </div>
    <div class="card" style="margin-bottom:0">
      ${mgHead('Informations clés',mgEditBtn("mgOpenForm('infos')",'Modifier les informations'))}
      ${infos}
      <div class="mg-quote">
        <div class="mg-quote-t">« ${mgEsc(M.citation||'')} »</div>
        <div class="mg-quote-s">${mgEsc(M.citationSrc||'')}</div>
      </div>
    </div>
  </div>`);
}

/* ---------- 2. ORIGINE ---------- */
function mgRenderOrigine(){
  const M=MGD();
  const eres=(M.eres||[]).map(e=>`
    <div class="mg-tl-item">
      <div class="mg-tl-dot">✦</div>
      <div class="mg-tl-date">${mgEsc(e[0])}</div>
      <div class="mg-tile" style="margin-bottom:0"><div><div class="mg-tile-t">${mgEsc(e[1])}</div><div class="mg-tile-d">${mgEsc(e[2])}</div></div></div>
    </div>`).join('');
  const liens=(M.liens||[]).map(l=>{
    return `<div class="mg-tile" style="margin-bottom:0"><span class="mg-tile-ico" style="background:var(--c-univers-bg);color:var(--c-univers)">${mgEsc(l[0])}</span><div><div class="mg-tile-t">${mgEsc(l[1])}</div><div class="mg-tile-d">${mgEsc(l[2])}</div></div></div>`;
  }).join('');

  mgSet('mg-origine',`
  <div class="card card-accent-left" style="border-left-color:var(--c-accueil)">
    ${mgHead('🌌 La naissance de la magie',mgEditBtn("mgOpenForm('origine')",'Modifier le texte et la frise'))}
    <div class="mg-hero mg-hero-alt">
      <div class="mg-prose">${mgPara((M.pages||{}).origine)}</div>
      ${mgImg('origine.jpg','Naissance de la magie','','entiere')}
    </div>
  </div>

  <div class="grid-2" style="align-items:start">
    <div class="card" style="margin-bottom:0">
      ${mgHead('Ligne du temps',mgEditBtn("mgOpenForm('origine')",'Modifier la frise'))}
      ${eres?`<div class="mg-tl">${eres}</div>`:'<div style="font-size:12px;color:var(--text3)">Aucune ère renseignée.</div>'}
    </div>
    <div class="card" style="margin-bottom:0">
      ${mgHead('Liens clés',mgEditBtn("mgOpenForm('oliens')",'Modifier les liens clés'))}
      <div style="display:flex;flex-direction:column;gap:7px">${liens||'<div style="font-size:12px;color:var(--text3)">Aucun lien renseigné.</div>'}</div>
    </div>
  </div>`);
}

/* ---------- 3. MANA & RÉSERVES ---------- */
function mgPorteurView(p){
  const per=p.persoId?(S.personnages||[]).find(x=>x.id===p.persoId):null;
  const nom=(per&&per.nom)||p.nom||'Porteur sans nom';
  const role=p.role||(per&&per.role)||'';
  const col=p.couleur||(per&&per.color)||'blue';
  const t=(MGD().types||[]).find(x=>x.id===p.typeId)||null;
  // un porteur relié à un personnage reprend automatiquement sa photo
  return {nom,role,col,pal:mgP(col),ini:mgInitials(nom),type:t,per,img:p.image||(per&&per.image)||''};
}
function mgRenderMana(){
  const M=MGD();
  const points=(M.manaPoints||[]).map(p=>`<div class="mg-tile"><span class="mg-tile-ico" style="background:var(--c-univers-bg);color:var(--c-univers)">${mgEsc(p[0])}</span><div><div class="mg-tile-t">${mgEsc(p[1])}</div><div class="mg-tile-d">${mgEsc(p[2])}</div></div></div>`).join('');
  const note=String(M.manaNote||'').split('\n').filter(Boolean).map(l=>mgEsc(l)).join('<br>');
  const ps=M.porteurs||[];
  const cards=ps.map(p=>{
    const v=mgPorteurView(p),pal=v.pal;
    const pur=mgN(p.purete,0),ctl=mgN(p.controle,0);
    const purCol=pur<55?'var(--c-factions)':'var(--c-univers)';
    return `<div class="mg-card clic" onclick="mgSheet('${p.id}')">
      <div class="mg-card-h">
        ${mgAvatar(v.ini,v.col,42,v.img)}
        <div style="min-width:0;flex:1"><div class="mg-name">${mgEsc(v.nom)}</div><div class="mg-role">${mgEsc(v.role)}</div></div>
        ${v.type?mgPill(v.type.icone+' '+v.type.nom,v.type.couleur):''}
      </div>
      <div class="mg-sep">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text3)">Réserve max</span>
        <span style="display:flex;align-items:baseline;gap:7px">${p.reserveLabel?mgPill(p.reserveLabel,v.col):''}<span style="font-family:'Cinzel',serif;font-size:15px;font-weight:600;color:var(--text)">${mgEsc(p.reserveVal||'—')}</span></span>
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:5px"><span style="color:var(--text2)">Pureté du mana</span><span style="color:${purCol};font-weight:500">${pur}%</span></div>
        ${mgBar(pur,purCol)}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:5px"><span style="color:var(--text2)">Contrôle</span><span style="color:${pal.v};font-weight:500">${ctl}%</span></div>
        ${mgBar(ctl,pal.v)}
      </div>
      <div class="mg-more" style="color:var(--c-univers)"><span>Fiche complète</span><span>→</span></div>
    </div>`;
  }).join('');

  mgSet('mg-mana',`
  <div class="card card-accent-left" style="border-left-color:var(--c-univers)">
    ${mgHead("Qu’est-ce que le mana ?",mgEditBtn("mgOpenForm('mana')",'Modifier'))}
    <div class="mg-hero mg-hero-even">
      <div>
        ${mgImg('mana.jpg','Réserves de mana','margin-bottom:12px;min-height:0')}
        <div class="mg-prose">${mgPara((M.pages||{}).mana)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${points}
        ${note?`<div class="mg-note"><span style="flex:none;color:var(--text3)">ⓘ</span><div>${note}</div></div>`:''}
      </div>
    </div>
  </div>

  <div class="card">
    ${mgHead('Le cycle du mana','')}
    ${mgImg('cycle-mana.jpg','Cycle du mana','min-height:0')}
  </div>

  <div class="mg-section-title">
    <div class="mg-head-t">Réserves par personnage</div>
    <span style="font-size:12px;color:var(--text3)">${ps.length} porteur${ps.length>1?'s':''} recensé${ps.length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('porteur')",'Ajouter un porteur')}</span>
  </div>
  ${ps.length?`<div class="grid-auto">${cards}</div>`:mgEmpty("Aucun porteur recensé pour l’instant.",`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('porteur')">+ Ajouter un porteur</button>`)}`);
}

function mgSheet(id){
  const M=MGD(),p=(M.porteurs||[]).find(x=>x.id===id);if(!p)return;
  const v=mgPorteurView(p),pal=v.pal;
  const rows=[['Esprit lié',p.esprit||'—'],['Éveil',p.eveil||'—'],...(Array.isArray(p.rows)?p.rows:[])];
  const affs=(M.types||[]).map(t=>({t,val:mgN((p.aff||{})[t.id],0)})).filter(x=>x.val>0).sort((a,b)=>b.val-a.val);
  document.getElementById('mg-sheet').innerHTML=`
    <div class="modal-header" style="padding:14px 16px;border-radius:var(--radius);background:rgba(${pal.rgb},0.10);border:1px solid rgba(${pal.rgb},0.22)">
      <div style="display:flex;gap:13px;align-items:center;min-width:0">
        ${mgAvatar(v.ini,v.col,44,v.img)}
        <div style="min-width:0">
          <div class="modal-title">${mgEsc(v.nom)}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${mgEsc(v.role)}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeModal('porteur')">✕</button>
    </div>
    <div class="grid-3" style="margin-bottom:16px">
      <div class="mini-stat"><div class="mini-num" style="font-family:'Cinzel',serif">${mgEsc(p.reserveVal||'—')}</div><div class="mini-label">Réserve</div></div>
      <div class="mini-stat"><div class="mini-num" style="font-family:'Cinzel',serif">${mgN(p.purete,0)}%</div><div class="mini-label">Pureté</div></div>
      <div class="mini-stat"><div class="mini-num" style="font-family:'Cinzel',serif">${mgN(p.controle,0)}%</div><div class="mini-label">Contrôle</div></div>
    </div>
    ${affs.length?`<div class="mg-chips" style="margin:0 0 16px">${affs.map(a=>mgPill(a.t.icone+' '+a.t.nom+' · '+a.val+'%',a.t.couleur)).join('')}</div>`:''}
    ${p.bio?`<div class="mg-prose" style="margin-bottom:16px">${mgPara(p.bio)}</div>`:''}
    ${rows.map(r=>`<div class="mg-kv"><span>${mgEsc(r[0])}</span><span>${mgEsc(r[1])}</span></div>`).join('')}
    <div class="modal-footer">
      <button class="btn btn-sm mg-edit" onclick="closeModal('porteur');mgOpenForm('porteur','${p.id}')">✎ Modifier</button>
      <button class="btn" onclick="closeModal('porteur')">Fermer</button>
    </div>`;
  document.getElementById('modal-porteur').classList.add('open');
}

/* ---------- 4. ÉVEIL ---------- */
function mgRenderEveil(){
  const M=MGD();
  const etapes=(M.etapes||[]).map((e,i)=>`
    <div class="mg-tl-item">
      <div class="mg-tl-dot">${i+1}</div>
      <div class="mg-tl-date">${mgEsc(e[0])}</div>
      <div class="mg-tile" style="margin-bottom:0"><div><div class="mg-tile-t">${mgEsc(e[1])}</div><div class="mg-tile-d">${mgEsc(e[2])}</div></div></div>
    </div>`).join('');
  const signes=(M.signes||[]).map(s=>`<div class="mg-tile" style="margin-bottom:0"><span class="mg-tile-ico" style="background:var(--c-chap-bg);color:var(--c-chap)">${mgEsc(s[0])}</span><div class="mg-tile-d" style="margin-top:5px">${mgEsc(s[1])}</div></div>`).join('');
  const eveils=(M.porteurs||[]).filter(p=>String(p.eveil||'').trim()).map(p=>{
    const v=mgPorteurView(p);
    return `<div class="mg-aff-row" onclick="mgSheet('${p.id}')">
      ${mgAvatar(v.ini,v.col,34,v.img)}
      <div style="flex:1;min-width:0"><div style="font-family:'Cinzel',serif;font-size:13.5px;font-weight:600;color:var(--text)">${mgEsc(v.nom)}</div><div style="font-size:11.5px;color:var(--text2);margin-top:2px">${mgEsc(p.eveil)}</div></div>
      ${p.esprit?mgPill(p.esprit,v.col):''}
    </div>`;
  }).join('');

  mgSet('mg-eveil',`
  <div class="card card-accent-left" style="border-left-color:var(--c-chap)">
    ${mgHead("🌱 L’éveil",mgEditBtn("mgOpenForm('eveil')",'Modifier'))}
    <div class="mg-hero mg-hero-alt">
      <div class="mg-prose">${mgPara((M.pages||{}).eveil)}</div>
      ${mgImg('eveil.jpg',"Éveil d'un porteur",'','entiere')}
    </div>
  </div>

  <div class="grid-2" style="align-items:start">
    <div class="card" style="margin-bottom:0">
      ${mgHead("Les étapes de l’éveil",mgEditBtn("mgOpenForm('eveil')",'Modifier les étapes'))}
      ${etapes?`<div class="mg-tl">${etapes}</div>`:'<div style="font-size:12px;color:var(--text3)">Aucune étape renseignée.</div>'}
    </div>
    <div class="card" style="margin-bottom:0">
      ${mgHead('Signes précurseurs',mgEditBtn("mgOpenForm('eveil')",'Modifier les signes'))}
      <div style="display:flex;flex-direction:column;gap:7px">${signes||'<div style="font-size:12px;color:var(--text3)">Aucun signe renseigné.</div>'}</div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    ${mgHead('Éveils recensés','')}
    ${eveils||'<div style="font-size:12px;color:var(--text3)">Renseigne le champ « Éveil » d’un porteur (onglet Mana &amp; Réserves) pour le voir apparaître ici.</div>'}
  </div>`);
}

/* ---------- 5. TYPES DE MAGIE ---------- */
function mgRenderTypes(){
  const M=MGD(),ps=M.porteurs||[];
  const cards=(M.types||[]).map(t=>{
    const p=mgP(t.couleur);
    const vals=ps.map(x=>mgN((x.aff||{})[t.id],0));
    const moy=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
    const dom=ps.filter(x=>{
      const a=x.aff||{};const best=(M.types||[]).reduce((m,y)=>mgN(a[y.id],0)>mgN(a[m],0)?y.id:m,(M.types[0]||{}).id);
      return best===t.id&&mgN(a[t.id],0)>0;
    }).length;
    return `<div class="mg-card">
      <div class="mg-card-h">
        ${imgWrap(`<span class="mg-glyph" style="background:rgba(${p.rgb},0.15);color:${p.v}">${imgInner(t.image,mgEsc(t.icone||'✦'))}</span>`,'type',t.id,'l’image du type')}
        <div style="min-width:0;flex:1"><div class="mg-name w">${mgEsc(t.nom)}</div><div class="mg-role">${dom} porteur${dom>1?'s':''} dominant${dom>1?'s':''}</div></div>
        ${mgActs("mgOpenForm('type','"+t.id+"')")}
      </div>
      <div style="font-size:12.5px;color:var(--text2);line-height:1.55">${mgEsc(t.desc)}</div>
      ${t.voie?`<div class="mg-tile" style="margin-top:11px;margin-bottom:0"><span style="flex:none;color:${p.v}">◈</span><div class="mg-tile-d" style="margin-top:0">${mgEsc(t.voie)}</div></div>`:''}
      <div class="mg-more" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px"><span style="color:var(--text3)">Affinité moyenne</span><span style="color:${p.v};font-weight:500">${moy}%</span></div>
        ${mgBar(moy,p.v)}
      </div>
    </div>`;
  }).join('');
  const combos=(M.combos||[]).map(c=>{
    const p=mgP(c.couleur);
    return `<div class="mg-tile"><span class="mg-tile-ico" style="background:rgba(${p.rgb},0.15);color:${p.v}">${mgEsc(c.icone||'◈')}</span>
      <div style="flex:1;min-width:0"><div class="mg-tile-t">${mgEsc(c.nom)}</div><div class="mg-tile-d">${mgEsc(c.desc)}</div>${c.types?`<div class="mg-chips" style="margin-top:7px">${mgPill(c.types,c.couleur)}</div>`:''}</div>
      ${mgActs("mgOpenForm('combo','"+c.id+"')")}</div>`;
  }).join('');

  mgSet('mg-types',`
  <div class="card card-accent-left" style="border-left-color:var(--c-perso)">
    ${mgHead('🔥 Les types de magie',mgEditBtn("mgOpenForm('typesIntro')",'Modifier le texte'))}
    <div class="mg-hero mg-hero-alt">
      <div class="mg-prose">${mgPara((M.pages||{}).types)}</div>
      ${mgImg('types.jpg','Types de magie')}
    </div>
  </div>

  <div class="mg-section-title">
    <div class="mg-head-t">Types déclarés</div>
    <span style="font-size:12px;color:var(--text3)">${(M.types||[]).length} type${(M.types||[]).length>1?'s':''}</span>
    <span style="margin-left:auto">${mgAddBtn("mgOpenForm('type')",'Ajouter un type')}</span>
  </div>
  ${(M.types||[]).length?`<div class="grid-auto" style="margin-bottom:16px">${cards}</div>`:mgEmpty('Aucun type de magie déclaré.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('type')">+ Ajouter un type</button>`)}

  <div class="card" style="margin-bottom:0">
    ${mgHead('Combinaisons &amp; voies',mgAddBtn("mgOpenForm('combo')",'Ajouter'))}
    ${combos||'<div style="font-size:12px;color:var(--text3)">Aucune combinaison renseignée.</div>'}
  </div>`);
}

/* ---------- 6. AFFINITÉS ---------- */
let mgAffA=0,mgAffB=1,mgAffCmp=false;
function mgPickA(i){mgAffA=i;mgRenderAffinites();}
function mgPickB(i){mgAffB=i;mgRenderAffinites();}
function mgPickRow(i){if(mgAffCmp&&i!==mgAffA)mgAffB=i;else mgAffA=i;mgRenderAffinites();}
function mgToggleCmp(){mgAffCmp=!mgAffCmp;mgRenderAffinites();}
function mgRenderAffinites(){
  const M=MGD(),types=M.types||[],ps=M.porteurs||[];
  const note=`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:11.5px;color:var(--text3);line-height:1.6">${mgEsc((M.pages||{}).affinites)}</div>`;

  if(!ps.length||types.length<3){
    mgSet('mg-affinites',`<div class="card">${mgHead('Affinités',mgEditBtn("mgOpenForm('affIntro')",'Modifier le texte'))}
      ${mgEmpty(!ps.length?"Ajoute des porteurs (onglet « Mana & Réserves ») pour comparer leurs affinités.":"Il faut au moins trois types de magie pour tracer le graphique.",
        !ps.length?`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('porteur')">+ Ajouter un porteur</button>`:`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('type')">+ Ajouter un type</button>`)}
      ${note}</div>`);
    return;
  }
  if(mgAffA>=ps.length)mgAffA=0;
  if(mgAffB>=ps.length)mgAffB=ps.length>1?1:0;
  if(ps.length<2)mgAffCmp=false;

  const N=types.length,CX=190,CY=190,R=140;
  const COLA='var(--c-univers)',RGBA='91,156,246',COLB='var(--c-idees)',RGBB='184,124,200';
  const ang=i=>(-Math.PI/2)+(i*2*Math.PI/N);
  const pt=(i,r)=>[CX+Math.cos(ang(i))*r,CY+Math.sin(ang(i))*r];
  const poly=vals=>vals.map((v,i)=>pt(i,R*v/100).map(n=>n.toFixed(1)).join(',')).join(' ');
  const A=ps[mgAffA],B=ps[mgAffB];
  const vA=mgPorteurView(A),vB=mgPorteurView(B);
  const valsA=types.map(t=>mgN((A.aff||{})[t.id],0));
  const valsB=types.map(t=>mgN((B.aff||{})[t.id],0));

  const rings=[20,40,60,80,100].map(p=>`<polygon points="${poly(types.map(()=>p))}" fill="none" style="stroke:var(--border2)" stroke-width="1"></polygon>`).join('');
  const axes=types.map((t,i)=>{const[x,y]=pt(i,R);return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:var(--border2)" stroke-width="1"></line>`;}).join('');
  const polyB=mgAffCmp?`<polygon points="${poly(valsB)}" fill="rgba(${RGBB},0.16)" style="stroke:${COLB}" stroke-width="2" stroke-dasharray="5 4"></polygon>`:'';
  const dots=valsA.map((v,i)=>{const[x,y]=pt(i,R*v/100);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" style="fill:${COLA}"></circle>`;}).join('');
  const labels=types.map((t,i)=>{
    const[x,y]=pt(i,R+30),p=mgP(t.couleur);
    return `<div class="mg-radar-lab" style="left:${(x/380*100).toFixed(2)}%;top:${(y/380*100).toFixed(2)}%;color:${p.v}"><span style="font-size:12px">${mgEsc(t.icone||'')}</span><span>${mgEsc(t.nom)}</span></div>`;
  }).join('');

  const picker=(sel,col,rgb,fn)=>ps.map((p,i)=>{
    const v=mgPorteurView(p),on=i===sel;
    return `<button class="mg-filter" onclick="${fn}(${i})" style="${on?`border-color:${col};background:rgba(${rgb},0.16);color:${col};font-weight:500`:''}"><span class="mg-filter-dot" style="background:${v.pal.v}"></span><span>${mgEsc(v.nom)}</span></button>`;
  }).join('');

  const rows=types.map((t,i)=>{
    const p=mgP(t.couleur);
    return `<div class="mg-barline">
      <span class="mg-tile-ico" style="width:22px;height:22px;border-radius:6px;overflow:hidden;font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}">${imgInner(t.image,mgEsc(t.icone||''))}</span>
      <span style="flex:none;width:74px;font-size:12px;color:var(--text2)">${mgEsc(t.nom)}</span>
      ${mgBar(valsA[i],p.v)}
      <span style="flex:none;width:${mgAffCmp?78:38}px;text-align:right;font-size:11.5px;color:var(--text2)">${valsA[i]}%${mgAffCmp?' · '+valsB[i]+'%':''}</span>
    </div>`;
  }).join('');

  const trust=(mgAffCmp?[[A,vA,COLA],[B,vB,COLB]]:[[A,vA,COLA]]).map(([p,v,col])=>{
    const items=(Array.isArray(p.confiance)?p.confiance:[]);
    return `<div>
      <div style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;color:${col}"><span style="width:8px;height:8px;border-radius:50%;background:${col}"></span><span>${mgEsc(v.nom)}</span></div>
      <div style="display:flex;flex-direction:column;gap:9px;margin-top:8px">
        ${items.length?items.map(it=>{
          const val=mgN(it[1],0),c=val<40?'var(--c-factions)':col;
          return `<div>
            <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:5px"><span style="flex:1;min-width:0;font-size:12.5px;color:var(--text)">${mgEsc(it[0])}</span><span style="flex:none;font-size:11.5px;font-weight:500;color:${c}">${val}%</span></div>
            ${mgBar(val,c)}
            ${it[2]?`<div style="font-size:11px;color:var(--text3);margin-top:4px">${mgEsc(it[2])}</div>`:''}
          </div>`;
        }).join(''):'<div style="font-size:11.5px;color:var(--text3)">Aucun lien renseigné.</div>'}
      </div>
    </div>`;
  }).join('');

  const list=ps.map((p,i)=>{
    const v=mgPorteurView(p),isA=i===mgAffA,isB=mgAffCmp&&i===mgAffB;
    const top=types.map(t=>({t,val:mgN((p.aff||{})[t.id],0)})).sort((a,b)=>b.val-a.val).slice(0,3).filter(x=>x.val>0);
    return `<div class="mg-aff-row" onclick="mgPickRow(${i})" style="${isA?`border-color:${COLA};background:rgba(${RGBA},0.10)`:isB?`border-color:${COLB};background:rgba(${RGBB},0.10)`:''}">
      ${mgAvatar(v.ini,v.col,38,v.img)}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:8px"><span class="mg-name">${mgEsc(v.nom)}</span><span class="mg-role">${mgEsc(v.role)}</span></div>
        <div class="mg-chips" style="margin-top:7px">${top.map(x=>mgPill(x.t.icone+' '+x.t.nom+' '+x.val+'%',x.t.couleur)).join('')||'<span style="font-size:11px;color:var(--text3)">Aucune affinité renseignée</span>'}</div>
      </div>
      ${(isA||isB)?`<span class="mg-mark" style="background:${isA?COLA:COLB}">${isA?'A':'B'}</span>`:''}
    </div>`;
  }).join('');

  mgSet('mg-affinites',`
  <div class="mg-filters">
    <span class="mg-head-t">Personnage</span>
    <div class="mg-filter-row">${picker(mgAffA,COLA,RGBA,'mgPickA')}</div>
    <button class="mg-filter" style="margin-left:auto;${mgAffCmp?`border-color:${COLB};background:rgba(${RGBB},0.14);color:${COLB}`:''}" onclick="mgToggleCmp()">${mgAffCmp?'✕ Arrêter la comparaison':'⇄ Comparer deux personnages'}</button>
  </div>
  ${mgAffCmp?`<div class="mg-compare-box"><span class="mg-head-t">Comparer avec</span><div class="mg-filter-row">${picker(mgAffB,COLB,RGBB,'mgPickB')}</div></div>`:''}

  <div class="mg-aff-grid">
    <div class="card" style="margin-bottom:0">
      <div class="mg-head-t" style="margin-bottom:6px">Maîtrise par type de magie</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">${mgAffCmp?mgEsc(vA.nom+' vs '+vB.nom):mgEsc(vA.nom+(vA.role?' — '+vA.role:''))}</div>
      <div class="mg-radar">
        <svg viewBox="0 0 380 380">${rings}${axes}${polyB}<polygon points="${poly(valsA)}" fill="rgba(${RGBA},0.22)" style="stroke:${COLA}" stroke-width="2"></polygon>${dots}</svg>
        ${labels}
      </div>
      <div class="mg-legend">
        <span style="display:inline-flex;align-items:center;gap:7px"><span class="mg-sw" style="background:${COLA}"></span>${mgEsc(vA.nom)}</span>
        ${mgAffCmp?`<span style="display:inline-flex;align-items:center;gap:7px"><span class="mg-sw" style="background:${COLB}"></span>${mgEsc(vB.nom)}</span>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">${rows}</div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div class="mg-head-t" style="margin-bottom:10px">Confiance envers l’esprit</div>
        <div style="display:flex;flex-direction:column;gap:12px">${trust}</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:0">
      ${mgHead('Affinités principales',mgEditBtn("mgOpenForm('affIntro')",'Modifier la note'))}
      ${list}
      ${note}
    </div>
  </div>`);
}

/* ---------- 7. RUNES ---------- */
let mgRuneCat='__all__';
function mgSetRuneCat(c){mgRuneCat=c;mgRenderRunes();}
function mgRenderRunes(){
  const M=MGD(),cats=M.runeCats||[],all=M.runes||[];
  const shown=mgRuneCat==='__all__'?all:all.filter(r=>r.cat===mgRuneCat);
  const filters=[['__all__','Tous','slate']].concat(cats.map(c=>[c[0],c[0],c[1]])).map(([k,l,c])=>{
    const p=mgP(c),on=k===mgRuneCat,n=k==='__all__'?all.length:all.filter(r=>r.cat===k).length;
    return `<button class="mg-filter" onclick="mgSetRuneCat('${mgEsc(k).replace(/'/g,"\\'")}')" style="${on?`border-color:${p.v};background:rgba(${p.rgb},0.16);color:${p.v};font-weight:500`:''}">${k==='__all__'?'':`<span class="mg-filter-dot" style="background:${p.v}"></span>`}<span>${mgEsc(l)}</span><span class="mg-filter-n">${n}</span></button>`;
  }).join('');
  const cards=shown.map(r=>{
    const cc=(cats.find(c=>c[0]===r.cat)||[r.cat,'slate'])[1],p=mgP(cc);
    const interdit=r.interdite==='oui';
    return `<div class="mg-card" style="${interdit?'border-style:dashed;border-color:rgba(212,115,106,0.45)':''}">
      <div class="mg-card-h">
        ${imgWrap(`<span class="mg-glyph" style="background:rgba(${p.rgb},0.15);color:${p.v};font-family:'Cinzel',serif">${imgInner(r.image,mgEsc(r.glyphe||'ᛉ'))}</span>`,'rune',r.id,'le dessin de la rune')}
        <div style="min-width:0;flex:1"><div class="mg-name w">${mgEsc(r.nom)}</div><div class="mg-role">${mgEsc(r.cat||'Sans catégorie')}</div></div>
        ${mgActs("mgOpenForm('rune','"+r.id+"')")}
      </div>
      <div style="font-size:12.5px;color:var(--text2);line-height:1.55">${mgEsc(r.desc)}</div>
      ${r.effet?`<div class="mg-tile" style="margin-top:11px;margin-bottom:0"><span style="flex:none;color:${p.v}">◈</span><div class="mg-tile-d" style="margin-top:0">${mgEsc(r.effet)}</div></div>`:''}
      ${interdit?`<div class="mg-limit-cons" style="color:var(--c-factions)"><span style="flex:none">⚠</span><span>Rune interdite — proscrite par les temples.</span></div>`:''}
    </div>`;
  }).join('');

  mgSet('mg-runes',`
  <div class="card card-accent-left" style="border-left-color:var(--c-histoire)">
    ${mgHead("📖 Qu’est-ce qu’une rune ?",mgEditBtn("mgOpenForm('runesIntro')",'Modifier le texte et les catégories'))}
    <div class="mg-hero mg-hero-alt">
      <div class="mg-prose">${mgPara((M.pages||{}).runes)}</div>
      ${mgImg('runes.jpg','Grimoire de runes','','entiere')}
    </div>
  </div>

  <div class="mg-filters">
    <span class="mg-head-t">Catégorie</span>
    <div class="mg-filter-row">${filters}</div>
    <span class="mg-count"><span>${shown.length} rune${shown.length>1?'s':''}</span>${mgAddBtn("mgOpenForm('rune')",'Ajouter une rune')}</span>
  </div>
  ${shown.length?`<div class="grid-auto">${cards}</div>`:mgEmpty(all.length?'Aucune rune dans cette catégorie.':'Aucune rune répertoriée.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('rune')">+ Ajouter une rune</button>`)}`);
}

/* ---------- 8. ARTEFACTS ---------- */
let mgArtCat='__all__';
function mgSetArtCat(c){mgArtCat=c;mgRenderArtefacts();}
function mgRenderArtefacts(){
  const M=MGD(),cats=M.artefactCats||[],all=M.artefacts||[];
  const shown=mgArtCat==='__all__'?all:all.filter(a=>a.cat===mgArtCat);
  const majeurs=all.filter(a=>a.rarete==='legendaire'||a.rarete==='unique').length;
  const interdits=all.filter(a=>String(a.cat||'').toLowerCase().indexOf('interdit')>=0).length;
  const filters=[['__all__','Tous','slate']].concat(cats.map(c=>[c[0],c[0],c[1]])).map(([k,l,c])=>{
    const p=mgP(c),on=k===mgArtCat,n=k==='__all__'?all.length:all.filter(a=>a.cat===k).length;
    return `<button class="mg-filter" onclick="mgSetArtCat('${mgEsc(k).replace(/'/g,"\\'")}')" style="${on?`border-color:${p.v};background:rgba(${p.rgb},0.16);color:${p.v};font-weight:500`:''}">${k==='__all__'?'':`<span class="mg-filter-dot" style="background:${p.v}"></span>`}<span>${mgEsc(l)}</span><span class="mg-filter-n">${n}</span></button>`;
  }).join('');
  const cards=shown.map(a=>{
    const cc=(cats.find(c=>c[0]===a.cat)||[a.cat,'slate'])[1],p=mgP(cc);
    const rar=MG_RARETE[a.rarete]||MG_RARETE.commun;
    const danger=mgN(a.danger,0);
    return `<div class="mg-card">
      <div class="mg-card-h">
        ${imgWrap(`<span class="mg-glyph" style="background:rgba(${p.rgb},0.15);color:${p.v}">${imgInner(a.image,mgEsc(a.icone||'💎'))}</span>`,'artefact',a.id,'l’image de l’artefact')}
        <div style="min-width:0;flex:1"><div class="mg-name w">${mgEsc(a.nom)}</div><div class="mg-role">${mgEsc(a.cat||'Sans catégorie')}</div></div>
        ${mgActs("mgOpenForm('artefact','"+a.id+"')")}
      </div>
      <div class="mg-chips" style="margin:0 0 10px">${mgPill(rar.l,rar.c)}${a.proprietaire?mgPill('◈ '+a.proprietaire,'slate'):''}</div>
      <div style="font-size:12.5px;color:var(--text2);line-height:1.55">${mgEsc(a.desc)}</div>
      ${a.pouvoir?`<div class="mg-tile" style="margin-top:11px;margin-bottom:0"><span style="flex:none;color:${p.v}">✦</span><div class="mg-tile-d" style="margin-top:0">${mgEsc(a.pouvoir)}</div></div>`:''}
      <div class="mg-more" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px"><span style="color:var(--text3)">Niveau de danger</span><span style="color:${danger>60?'var(--c-factions)':'var(--text2)'};font-weight:500">${danger}%</span></div>
        ${mgBar(danger,danger>60?'var(--c-factions)':p.v)}
      </div>
    </div>`;
  }).join('');

  mgSet('mg-artefacts',`
  <div class="card card-accent-left" style="border-left-color:var(--c-idees)">
    ${mgHead('💎 À propos des artefacts',mgEditBtn("mgOpenForm('artIntro')",'Modifier le texte et les catégories'))}
    <div class="mg-hero mg-hero-alt">
      <div>
        <div class="mg-prose">${mgPara((M.pages||{}).artefacts)}</div>
        <div class="mg-stats">
          <div><div class="mg-stat-num">${all.length}</div><div class="mg-stat-lab">Répertoriés</div></div>
          <div><div class="mg-stat-num">${majeurs}</div><div class="mg-stat-lab">Majeurs</div></div>
          <div><div class="mg-stat-num">${interdits}</div><div class="mg-stat-lab">Interdits</div></div>
        </div>
      </div>
      ${mgImg('artefacts.jpg','Artefacts','','entiere')}
    </div>
  </div>

  <div class="mg-filters">
    <span class="mg-head-t">Catégorie</span>
    <div class="mg-filter-row">${filters}</div>
    <span class="mg-count"><span>${shown.length} objet${shown.length>1?'s':''}</span>${mgAddBtn("mgOpenForm('artefact')",'Ajouter un artefact')}</span>
  </div>
  ${shown.length?`<div class="grid-auto">${cards}</div>`:mgEmpty(all.length?'Aucun artefact dans cette catégorie.':'Aucun artefact répertorié.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('artefact')">+ Ajouter un artefact</button>`)}`);
}

/* ---------- 9. LIMITES & CONSÉQUENCES ---------- */
let mgSevFilter='tous';
function mgSetSev(k){mgSevFilter=k;mgRenderLimites();}
function mgRenderLimites(){
  const M=MGD(),all=M.limites||[];
  const shown=mgSevFilter==='tous'?all:all.filter(l=>l.gravite===mgSevFilter);
  const filters=['tous'].concat(MG_SEV_KEYS).map(k=>{
    const s=MG_SEV[k],p=mgP(s?s.c:'blue'),on=k===mgSevFilter;
    const n=k==='tous'?all.length:all.filter(l=>l.gravite===k).length;
    return `<button class="mg-filter" onclick="mgSetSev('${k}')" style="${on?`border-color:${p.v};background:rgba(${p.rgb},0.16);color:${p.v};font-weight:500`:''}">${s?`<span class="mg-filter-dot" style="background:${p.v}"></span>`:''}<span>${s?s.l:'Tous'}</span><span class="mg-filter-n">${n}</span></button>`;
  }).join('');
  const cards=shown.map(l=>{
    const s=MG_SEV[l.gravite]||MG_SEV.faible,p=mgP(s.c);
    return `<div class="mg-limit" style="border-left-color:${p.v}">
      <span class="mg-limit-ico" style="background:rgba(${p.rgb},0.14);color:${p.v}">${mgEsc(l.icone||'✦')}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <div style="font-family:'Cinzel',serif;font-size:15px;font-weight:600;color:var(--text)">${mgEsc(l.titre)}</div>
          <span class="mg-pill" style="background:rgba(${p.rgb},0.15);color:${p.v};text-transform:uppercase;letter-spacing:0.05em;font-size:10px">${s.l}</span>
          <span style="font-size:11px;color:var(--text3)">${mgEsc(l.portee)}</span>
          ${mgActs("mgOpenForm('limite','"+l.id+"')")}
        </div>
        <div style="font-size:12.5px;color:var(--text2);line-height:1.6;margin-top:6px">${mgEsc(l.desc)}</div>
        ${l.cons?`<div class="mg-limit-cons" style="color:${p.v}"><span style="flex:none;font-style:normal">⚠</span><span>${mgEsc(l.cons)}</span></div>`:''}
      </div>
    </div>`;
  }).join('');

  mgSet('mg-limites',`
  <div class="card card-accent-left" style="border-left-color:var(--c-factions)">
    ${mgHead('⚠ Le prix de la magie',mgEditBtn("mgOpenForm('limitesIntro')",'Modifier le texte'))}
    <div class="mg-hero mg-hero-alt">
      <div class="mg-prose">${mgPara((M.pages||{}).limites)}</div>
      ${mgImg('limites.jpg','Limites de la magie','','entiere')}
    </div>
  </div>

  <div class="mg-filters">
    <span class="mg-head-t">Gravité</span>
    <div class="mg-filter-row">${filters}</div>
    <span class="mg-count"><span>${shown.length} limite${shown.length>1?'s':''}</span>${mgAddBtn("mgOpenForm('limite')",'Ajouter une limite')}</span>
  </div>
  ${shown.length?cards:mgEmpty(all.length?'Aucune limite de cette gravité.':'Aucune limite documentée.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('limite')">+ Ajouter une limite</button>`)}`);
}

/* ---------- 10. LEXIQUE ---------- */
let mgLexQ='';
function mgLexInput(v){mgLexQ=v;mgLexList();}
function mgLexList(){
  const M=MGD(),q=mgLexQ.trim().toLowerCase();
  const items=(M.lexique||[]).filter(e=>!q||(e.terme+' '+e.def+' '+(e.cat||'')).toLowerCase().indexOf(q)>=0)
    .sort((a,b)=>String(a.terme||'').localeCompare(String(b.terme||''),'fr'));
  let html='',letter='';
  items.forEach(e=>{
    const L=String(e.terme||'?').trim().charAt(0).toUpperCase();
    if(L!==letter){letter=L;html+=`<div class="mg-lex-letter">${mgEsc(letter)}</div>`;}
    html+=`<div class="mg-lex-item">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap"><span class="mg-lex-t">${mgEsc(e.terme)}</span>${e.cat?mgPill(e.cat,e.couleur||'slate'):''}</div>
        <div class="mg-lex-d">${mgEsc(e.def)}</div>
      </div>
      ${mgActs("mgOpenForm('lex','"+e.id+"')")}
    </div>`;
  });
  const box=document.getElementById('mg-lex-list');
  if(box)box.innerHTML=html||mgEmpty((M.lexique||[]).length?'Aucun terme ne correspond à cette recherche.':'Aucune entrée dans le lexique.',`<button class="btn btn-primary mg-edit" style="--section-color:var(--c-univers)" onclick="mgOpenForm('lex')">+ Ajouter un terme</button>`);
  const c=document.getElementById('mg-lex-count');
  if(c)c.textContent=items.length+' entrée'+(items.length>1?'s':'');
}
function mgRenderLexique(){
  const M=MGD();
  mgSet('mg-lexique',`
  <div class="card card-accent-left" style="border-left-color:var(--text3)">
    ${mgHead('📕 Lexique de la magie',mgEditBtn("mgOpenForm('lexIntro')",'Modifier le texte'))}
    <div class="mg-hero mg-hero-alt">
      <div class="mg-prose">${mgPara((M.pages||{}).lexique)}</div>
      ${mgImg('lexique.jpg','Lexique','','entiere')}
    </div>
  </div>

  <div class="mg-filters">
    <input type="text" class="mg-search" placeholder="Rechercher un terme…" value="${mgEsc(mgLexQ)}" oninput="mgLexInput(this.value)">
    <span class="mg-count"><span id="mg-lex-count"></span>${mgAddBtn("mgOpenForm('lex')",'Ajouter un terme')}</span>
  </div>
  <div id="mg-lex-list"></div>`);
  mgLexList();
}

/* ================= FORMULAIRE GÉNÉRIQUE ================= */
let mgForm=null,mgFormCols={},mgFormPicks={},mgFormChips={},mgFormChipOpts={};

/* Badges à bascule : on clique pour sélectionner, on reclique pour retirer */
function mgChipsHtml(k){
  const sel=mgFormChips[k]||[],opts=mgFormChipOpts[k]||[];
  return opts.map(([v,l,c])=>{
    const on=sel.indexOf(v)>=0,p=mgP(c||'slate');
    return `<button type="button" class="mg-chip${on?' on':''}"`
      +(on?` style="background:rgba(${p.rgb},0.18);color:${p.v};border-color:rgba(${p.rgb},0.42)"`:'')
      +` onclick="mgChipToggle('${k}','${v}')">${mgEsc(l)}</button>`;
  }).join('');
}
function mgChipToggle(k,v){
  const sel=(mgFormChips[k]||[]).slice(),i=sel.indexOf(v);
  if(i>=0)sel.splice(i,1);else sel.push(v);
  mgFormChips[k]=sel;
  const box=document.getElementById('mgf-'+k);
  if(box)box.innerHTML=mgChipsHtml(k);
}

const MG_SPECS={
  resume:{title:'Résumé de la magie',
    load:()=>{const M=MGD();return{titre:M.resume.titre,texte:M.pages.vue,badges:M.resume.badges,stats:M.resume.stats};},
    save:d=>{const M=MGD();M.resume.titre=d.titre;M.pages.vue=d.texte;M.resume.badges=d.badges;M.resume.stats=d.stats;},
    fields:[
      {k:'titre',l:'Titre',t:'text'},
      {k:'texte',l:'Texte — une ligne vide sépare deux paragraphes',t:'area',h:170},
      {k:'badges',l:'Étiquettes',t:'rows',cols:[{t:'text',ph:'Libellé'},{t:'pal'}]},
      {k:'stats',l:'Chiffres clés — choisis une source pour que le nombre se compte tout seul',t:'rows',cols:[{t:'text',ph:'12',w:'78px'},{t:'text',ph:'Artefacts majeurs'},{t:'src',w:'186px'}]}
    ]},
  principes:{title:'Principes fondamentaux',
    load:()=>({principes:MGD().principes}),
    save:d=>{MGD().principes=d.principes;},
    fields:[{k:'principes',l:'Principes',t:'rows',cols:[{t:'text',ph:'✦',w:'58px'},{t:'text',ph:'Titre'},{t:'area',ph:'Description'}]}]},
  infos:{title:'Informations clés',
    load:()=>{const M=MGD();return{infos:M.infos,citation:M.citation,citationSrc:M.citationSrc};},
    save:d=>{const M=MGD();M.infos=d.infos;M.citation=d.citation;M.citationSrc=d.citationSrc;},
    fields:[
      {k:'infos',l:'Lignes',t:'rows',cols:[{t:'text',ph:'Nature'},{t:'text',ph:'Mana'}]},
      {k:'citation',l:'Citation',t:'area',h:80},
      {k:'citationSrc',l:'Source de la citation',t:'text'}
    ]},
  origine:{title:"Origine de la magie",
    load:()=>{const M=MGD();return{texte:M.pages.origine,eres:M.eres};},
    save:d=>{const M=MGD();M.pages.origine=d.texte;M.eres=d.eres;},
    fields:[
      {k:'texte',l:'La naissance de la magie',t:'area',h:170},
      {k:'eres',l:'Ligne du temps',t:'rows',cols:[{t:'text',ph:'Ère divine',w:'140px'},{t:'text',ph:'Titre'},{t:'area',ph:'Description'}]}
    ]},
  oliens:{title:'Liens clés',
    load:()=>({liens:MGD().liens}),
    save:d=>{MGD().liens=d.liens;},
    fields:[{k:'liens',l:'Liens',t:'rows',cols:[{t:'text',ph:'✧',w:'58px'},{t:'text',ph:'Dieux'},{t:'text',ph:'Créateurs de la magie'}]}]},
  mana:{title:'Mana & réserves',
    load:()=>{const M=MGD();return{texte:M.pages.mana,points:M.manaPoints,note:M.manaNote};},
    save:d=>{const M=MGD();M.pages.mana=d.texte;M.manaPoints=d.points;M.manaNote=d.note;},
    fields:[
      {k:'texte',l:"Qu’est-ce que le mana ?",t:'area',h:150},
      {k:'points',l:'Encadrés',t:'rows',cols:[{t:'text',ph:'☾',w:'58px'},{t:'text',ph:'Titre'},{t:'area',ph:'Description'}]},
      {k:'note',l:'Note (une ligne = un point)',t:'area',h:110}
    ]},
  eveil:{title:"Éveil",
    load:()=>{const M=MGD();return{texte:M.pages.eveil,etapes:M.etapes,signes:M.signes};},
    save:d=>{const M=MGD();M.pages.eveil=d.texte;M.etapes=d.etapes;M.signes=d.signes;},
    fields:[
      {k:'texte',l:'Texte de présentation',t:'area',h:150},
      {k:'etapes',l:"Étapes de l’éveil",t:'rows',cols:[{t:'text',ph:'9 – 20 ans',w:'140px'},{t:'text',ph:'Titre'},{t:'area',ph:'Description'}]},
      {k:'signes',l:'Signes précurseurs',t:'rows',cols:[{t:'text',ph:'✦',w:'58px'},{t:'area',ph:'Signe observé'}]}
    ]},
  typesIntro:{title:'Types de magie — présentation',
    load:()=>({texte:MGD().pages.types}),save:d=>{MGD().pages.types=d.texte;},
    fields:[{k:'texte',l:'Texte',t:'area',h:170}]},
  affIntro:{title:'Affinités — note',
    load:()=>({texte:MGD().pages.affinites}),save:d=>{MGD().pages.affinites=d.texte;},
    fields:[{k:'texte',l:'Note affichée sous la liste',t:'area',h:130}]},
  limitesIntro:{title:'Limites — présentation',
    load:()=>({texte:MGD().pages.limites}),save:d=>{MGD().pages.limites=d.texte;},
    fields:[{k:'texte',l:'Texte',t:'area',h:170}]},
  lexIntro:{title:'Lexique — présentation',
    load:()=>({texte:MGD().pages.lexique}),save:d=>{MGD().pages.lexique=d.texte;},
    fields:[{k:'texte',l:'Texte',t:'area',h:150}]},
  runesIntro:{title:'Runes — présentation',
    load:()=>{const M=MGD();return{texte:M.pages.runes,cats:M.runeCats};},
    save:d=>{const M=MGD();M.pages.runes=d.texte;M.runeCats=d.cats;},
    fields:[
      {k:'texte',l:'Texte',t:'area',h:150},
      {k:'cats',l:'Catégories de runes',t:'rows',cols:[{t:'text',ph:'Offensives'},{t:'pal'}]}
    ]},
  artIntro:{title:'Artefacts — présentation',
    load:()=>{const M=MGD();return{texte:M.pages.artefacts,cats:M.artefactCats};},
    save:d=>{const M=MGD();M.pages.artefacts=d.texte;M.artefactCats=d.cats;},
    fields:[
      {k:'texte',l:'Texte',t:'area',h:150},
      {k:'cats',l:"Catégories d’artefacts",t:'rows',cols:[{t:'text',ph:'Armes & armures'},{t:'pal'}]}
    ]},

  type:{title:'Type de magie',list:'types',req:'nom',
    fields:[
      {k:'nom',l:'Nom *',t:'text'},
      {k:'image',l:'Image du type',t:'img',ph:'Clique pour choisir une image depuis ton appareil. Sans image, l’icône ci-dessous est utilisée.'},
      {k:'icone',l:'Icône',t:'text',ph:'🜂',oi:"imgSyncPick('type')"},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'desc',l:'Description',t:'area',h:90},
      {k:'voie',l:'Voie recommandée',t:'area',h:70}
    ]},
  combo:{title:'Combinaison / voie',list:'combos',req:'nom',
    fields:[
      {k:'nom',l:'Nom *',t:'text'},
      {k:'icone',l:'Icône',t:'text',ph:'◈'},
      {k:'types',l:'Types combinés',t:'text',ph:'Feu + Air'},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'desc',l:'Description',t:'area',h:90}
    ]},
  limite:{title:'Limite / conséquence',list:'limites',req:'titre',
    fields:[
      {k:'titre',l:'Titre *',t:'text'},
      {k:'icone',l:'Icône',t:'text',ph:'⚠'},
      {k:'gravite',l:'Gravité',t:'select',opts:()=>MG_SEV_KEYS.map(k=>[k,MG_SEV[k].l])},
      {k:'portee',l:'Portée',t:'text',ph:'Usage courant'},
      {k:'desc',l:'Description',t:'area',h:90},
      {k:'cons',l:'Conséquence',t:'area',h:80}
    ]},
  rune:{title:'Rune',list:'runes',req:'nom',
    fields:[
      {k:'nom',l:'Nom *',t:'text'},
      {k:'image',l:'Dessin de la rune',t:'img',ph:'Clique pour choisir ton dessin du symbole (PNG transparent conseillé). Sans image, le glyphe ci-dessous est utilisé.'},
      {k:'glyphe',l:'Glyphe / symbole',t:'text',ph:'ᛉ',oi:"imgSyncPick('rune')"},
      {k:'cat',l:'Catégorie',t:'select',opts:()=>[['','— aucune —']].concat((MGD().runeCats||[]).map(c=>[c[0],c[0]]))},
      {k:'desc',l:'Description',t:'area',h:90},
      {k:'effet',l:'Effet / usage',t:'area',h:70},
      {k:'interdite',l:'Statut',t:'select',opts:()=>[['','Autorisée'],['oui','Interdite']]}
    ]},
  artefact:{title:'Artefact',list:'artefacts',req:'nom',
    fields:[
      {k:'nom',l:'Nom *',t:'text'},
      {k:'image',l:'Image de l’artefact',t:'img',ph:'Clique pour choisir une image depuis ton appareil. Sans image, l’icône ci-dessous est utilisée.'},
      {k:'icone',l:'Icône',t:'text',ph:'💎',oi:"imgSyncPick('artefact')"},
      {k:'cat',l:'Catégorie',t:'select',opts:()=>[['','— aucune —']].concat((MGD().artefactCats||[]).map(c=>[c[0],c[0]]))},
      {k:'rarete',l:'Rareté',t:'select',opts:()=>MG_RARETE_KEYS.map(k=>[k,MG_RARETE[k].l])},
      {k:'proprietaire',l:'Détenteur connu',t:'text'},
      {k:'desc',l:'Description',t:'area',h:90},
      {k:'pouvoir',l:'Pouvoir',t:'area',h:70},
      {k:'danger',l:'Niveau de danger',t:'range'}
    ]},
  lex:{title:'Terme du lexique',list:'lexique',req:'terme',
    fields:[
      {k:'terme',l:'Terme *',t:'text'},
      {k:'cat',l:'Catégorie',t:'text',ph:'Mana, Rune, Esprit…'},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'def',l:'Définition',t:'area',h:110}
    ]},
  porteur:{title:'Porteur',list:'porteurs',req:'__nom',
    fields:[
      {k:'persoId',l:'Personnage lié',t:'select',opts:()=>[['','— aucun (nom libre) —']].concat((S.personnages||[]).map(p=>[p.id,p.nom||'Sans nom']))},
      {k:'nom',l:'Nom (si aucun personnage lié)',t:'text'},
      {k:'role',l:'Rôle / titre',t:'text',ph:'Porteur du Loup blanc'},
      {k:'couleur',l:'Couleur',t:'pal'},
      {k:'typeId',l:'Type de magie dominant',t:'select',opts:()=>[['','— aucun —']].concat((MGD().types||[]).map(t=>[t.id,t.nom]))},
      {k:'esprit',l:'Esprit lié',t:'text',ph:'Fenrhal, le Loup blanc'},
      {k:'reserveLabel',l:'Réserve — libellé',t:'text',ph:'Élevée'},
      {k:'reserveVal',l:'Réserve — valeur',t:'text',ph:'820'},
      {k:'purete',l:'Pureté du mana',t:'range'},
      {k:'controle',l:'Contrôle',t:'range'},
      {k:'eveil',l:'Éveil',t:'text',ph:'11 ans — forêt de Kalden'},
      {k:'bio',l:'Notes',t:'area',h:110},
      {k:'aff',l:'Affinités par type de magie',t:'aff'},
      {k:'confiance',l:'Confiance envers les esprits',t:'rows',cols:[{t:'text',ph:'Nom de l’esprit'},{t:'text',ph:'62',w:'70px'},{t:'text',ph:'Note'}]},
      {k:'rows',l:'Informations libres',t:'rows',cols:[{t:'text',ph:'Runes maîtrisées'},{t:'text',ph:'14 / 48'}]}
    ]}
};

/* Colonnes « recherche » : chaque colonne t:'refq' déclare sa source ici, sous
   une clé stable. La ligne enregistre l'identifiant, mais l'utilisateur tape un
   nom — la conversion se fait à la lecture (voir mgReadRows). */
const MG_REFQ={};
function mgRefqSrc(cle){const f=MG_REFQ[cle];return (f?f():[])||[];}
/* Retrouve une fiche d'après le nom saisi : casse, accents et pluriel ignorés */
function mgRefqTrouve(cle,txt){
  const src=mgRefqSrc(cle),n=crNorm(txt);
  if(!n)return'';
  const nom=x=>crNorm(x.nom||x.titre||'');
  const x=src.find(o=>nom(o)===n)||src.find(o=>nom(o).indexOf(n)===0);
  return x?x.id:'';
}
function mgRefqNom(cle,id){
  const x=mgRefqSrc(cle).find(o=>o.id===id);
  return x?(x.nom||x.titre||''):'';
}
function mgRowHtml(cols,r){
  r=Array.isArray(r)?r:[];
  return '<div class="mg-form-row">'+cols.map((c,i)=>{
    const v=mgEsc(r[i]==null?'':r[i]),w=c.w?`flex:none;width:${c.w};`:'';
    if(c.t==='area')return `<textarea style="${w}" placeholder="${mgEsc(c.ph||'')}">${v}</textarea>`;
    // colonne « référence recherchée » : on tape le nom, la liste suggère
    if(c.t==='refq'){
      if(c.src)MG_REFQ[c.cle]=c.src;   // ne jamais effacer une source déjà déclarée
      const src=mgRefqSrc(c.cle);
      return `<input type="text" list="mgrefq-${mgEsc(c.cle)}" data-refq="${mgEsc(c.cle)}" style="flex:none;width:${c.w||'190px'}" `
        +`placeholder="${mgEsc(c.ph||'Chercher par nom…')}" value="${mgEsc(mgRefqNom(c.cle,r[i]))}">`
        +`<datalist id="mgrefq-${mgEsc(c.cle)}">`+src.map(x=>`<option value="${mgEsc(x.nom||x.titre||'')}"></option>`).join('')+`</datalist>`;
    }
    if(c.t==='pal')return `<select style="flex:none;width:118px">`+MG_PAL_KEYS.map(k=>`<option value="${k}"${r[i]===k?' selected':''}>${MG_PAL[k].l}</option>`).join('')+`</select>`;
    // colonne « référence » : choisir une autre fiche dans une liste
    if(c.t==='ref'){
      const src=(c.src?c.src():[])||[];
      return `<select style="flex:none;width:${c.w||'170px'}"><option value="">— Choisir —</option>`
        +src.map(x=>`<option value="${mgEsc(x.id)}"${r[i]===x.id?' selected':''}>${mgEsc(x.nom||x.titre||'Sans nom')}</option>`).join('')
        +`</select>`;
    }
    // colonne « liste de valeurs »
    if(c.t==='sel'){
      const o=(c.opts?c.opts():[])||[];
      return `<select style="flex:none;width:${c.w||'150px'}">`
        +o.map(([v,l])=>`<option value="${mgEsc(v)}"${r[i]===v?' selected':''}>${mgEsc(l)}</option>`).join('')
        +`</select>`;
    }
    if(c.t==='src'){
      const M=MGD();
      return `<select data-src="1" onchange="mgSrcSync(this)" title="D’où vient le nombre ?" style="flex:none;width:${c.w||'186px'}"><option value="">Nombre fixe</option>`
        +MG_SOURCES.map(s=>`<option value="${s[0]}"${r[i]===s[0]?' selected':''}>${mgEsc(s[1])} (${s[2](M)})</option>`).join('')+`</select>`;
    }
    return `<input type="text" style="${w}" placeholder="${mgEsc(c.ph||'')}" value="${v}">`;
  }).join('')+'<button class="mg-del-row" onclick="this.parentNode.remove()" title="Retirer la ligne">✕</button></div>';
}
/* Quand une source est choisie, le nombre est calculé et le champ passe en lecture seule. */
function mgSrcSync(sel){
  const inp=sel.parentNode.querySelector('input[type="text"]');if(!inp)return;
  const src=MG_SRC[sel.value];
  if(src){inp.value=src[2](MGD());inp.readOnly=true;inp.style.opacity='0.55';inp.title='Compté automatiquement';}
  else{inp.readOnly=false;inp.style.opacity='';inp.title='';}
}
function mgSrcSyncAll(){document.querySelectorAll('#mg-modal-body select[data-src]').forEach(mgSrcSync);}
function mgReadPick(k){return Array.from(document.querySelectorAll('#mgf-'+k+' input:checked')).map(i=>i.value);}
function mgPickTags(k){
  const f=mgFormPicks[k],el=document.getElementById('mgf-'+k+'-tags');
  if(!f||!el)return;
  el.innerHTML=f.tags?f.tags(mgReadPick(k)).join(''):'';
}
function mgAddRow(k){const b=document.getElementById('mgf-'+k);if(b){b.insertAdjacentHTML('beforeend',mgRowHtml(mgFormCols[k],[]));mgSrcSyncAll();}}
/* Noms saisis dans une colonne « recherche » qui ne correspondent à aucune
   fiche : relevés à la lecture, vérifiés avant d'enregistrer. */
let mgRefqInconnus=[];
function mgReadRows(k){
  const b=document.getElementById('mgf-'+k);if(!b)return[];
  return Array.from(b.children).map(row=>
    Array.from(row.querySelectorAll('input,textarea,select')).map(e=>{
      const v=e.value.trim(),cle=e.getAttribute('data-refq');
      if(!cle)return v;
      if(!v)return'';
      const id=mgRefqTrouve(cle,v);
      if(!id)mgRefqInconnus.push(v);
      return id;
    })
  ).filter(r=>r.some(v=>v!==''));
}
function mgFieldHtml(f,val){
  if(f.t==='rows'){
    mgFormCols[f.k]=f.cols;
    const rows=(Array.isArray(val)?val:[]).map(r=>mgRowHtml(f.cols,r)).join('');
    return `<div class="field"><label>${f.l}</label><div class="mg-form-rows" id="mgf-${f.k}">${rows}</div><button class="btn btn-sm" style="margin-top:8px" onclick="mgAddRow('${f.k}')">+ Ajouter une ligne</button></div>`;
  }
  if(f.t==='aff'){
    const M=MGD(),v=val||{};
    if(!(M.types||[]).length)return `<div class="field"><label>${f.l}</label><div class="mg-note">Déclare d’abord des types de magie dans l’onglet « Types de magie ».</div></div>`;
    return `<div class="field"><label>${f.l}</label><div id="mgf-${f.k}">`+M.types.map(t=>{
      const p=mgP(t.couleur),n=mgN(v[t.id],0);
      return `<div class="mg-range-row" data-tid="${t.id}"><span class="mg-range-lab"><span style="color:${p.v}">${mgEsc(t.icone||'')}</span>${mgEsc(t.nom)}</span><input type="range" min="0" max="100" value="${n}" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="mg-range-val">${n}%</span></div>`;
    }).join('')+`</div></div>`;
  }
  if(f.t==='range'){
    const n=mgN(val,0);
    return `<div class="field"><label>${f.l}</label><div class="mg-range-row"><input type="range" id="mgf-${f.k}" min="0" max="100" value="${n}" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="mg-range-val">${n}%</span></div></div>`;
  }
  if(f.t==='pal'){
    return `<div class="field"><label>${f.l}</label><select id="mgf-${f.k}">`+MG_PAL_KEYS.map(k=>`<option value="${k}"${val===k?' selected':''}>${MG_PAL[k].l}</option>`).join('')+`</select></div>`;
  }
  if(f.t==='select'){
    const opts=typeof f.opts==='function'?f.opts():(f.opts||[]);
    return `<div class="field"><label>${f.l}</label><select id="mgf-${f.k}">`+opts.map(o=>`<option value="${mgEsc(o[0])}"${String(val||'')===String(o[0])?' selected':''}>${mgEsc(o[1])}</option>`).join('')+`</select></div>`;
  }
  if(f.t==='img'){
    // Une boîte par champ image : une fiche peut en avoir plusieurs
    // (illustration, symbole, schéma). Elle est remplie par imgRefreshPick().
    return `<div class="field"><label>${f.l}</label><div class="img-pick" id="mgf-img-${f.k}"></div><div class="img-hint">${mgEsc(f.ph||'')}</div></div>`;
  }
  if(f.t==='chips'){
    mgFormChipOpts[f.k]=(f.opts?f.opts():[])||[];
    mgFormChips[f.k]=Array.isArray(val)?val.slice():[];
    return `<div class="field"><label>${f.l}</label><div class="mg-chips-pick" id="mgf-${f.k}">${mgChipsHtml(f.k)}</div>${f.ph?`<div class="img-hint">${mgEsc(f.ph)}</div>`:''}</div>`;
  }
  if(f.t==='pick'){
    mgFormPicks[f.k]=f;
    const arr=(f.src?f.src():[])||[],sel=Array.isArray(val)?val:[];
    const rows=arr.length
      ? arr.map(e=>`<label class="pick-row"><input type="checkbox" value="${mgEsc(e.id)}"${sel.indexOf(e.id)>=0?' checked':''} onchange="mgPickTags('${f.k}')">${mgEsc(e.nom||e.titre||'Sans nom')}</label>`).join('')
      : `<div class="pick-empty">${mgEsc(f.empty||'Rien à lier pour l’instant')}</div>`;
    return `<div class="field"><label>${f.l}</label>`
      +`<div class="tag-row" id="mgf-${f.k}-tags" style="margin-bottom:7px"></div>`
      +`<div class="pick-list" id="mgf-${f.k}">${rows}</div></div>`;
  }
  if(f.t==='area')return `<div class="field"><label>${f.l}</label><textarea id="mgf-${f.k}" placeholder="${mgEsc(f.ph||'')}" style="min-height:${f.h||90}px">${mgEsc(val)}</textarea></div>`;
  return `<div class="field"><label>${f.l}</label><input type="text" id="mgf-${f.k}" placeholder="${mgEsc(f.ph||'')}" value="${mgEsc(val)}"${f.oi?` oninput="${f.oi}"`:''}></div>`;
}
/* Où le formulaire range ses données : S.magie par défaut, mais un module
   peut fournir son propre magasin (voir CR_SPECS pour les créatures). */
/* Les « kinds » d'image utilisés par un formulaire (un par champ t:'img') */
function mgImgFields(sp,kind){return (sp.fields||[]).filter(f=>f.t==='img').map(f=>f.kind||kind);}
function mgStore(sp){return sp.store?sp.store():MGD();}
function mgAfter(sp){(sp.after||renderMagie)();}
function mgOpenForm(kind,id){
  const sp=MG_SPECS[kind];if(!sp)return;
  let data;
  if(sp.list){
    const arr=mgStore(sp)[sp.list]||[];
    const it=id?arr.find(x=>x.id===id):null;
    data=it?JSON.parse(JSON.stringify(it)):{};
  }else data=JSON.parse(JSON.stringify(sp.load()||{}));
  mgForm={kind,id:id||'',data};mgFormCols={};mgFormPicks={};mgFormChips={};mgFormChipOpts={};
  document.getElementById('mg-modal-title').textContent=(sp.list?(id?'Modifier — ':'Nouveau — '):'')+sp.title;
  document.getElementById('mg-modal-del').style.display=(sp.list&&id)?'':'none';
  document.getElementById('mg-modal-body').innerHTML=sp.fields.map(f=>mgFieldHtml(f,data[f.k])).join('');
  mgSrcSyncAll();
  Object.keys(mgFormPicks).forEach(mgPickTags);
  // chaque champ image du formulaire a son propre « kind » (f.kind), sinon celui du formulaire
  mgImgFields(sp,kind).forEach(k=>{if(IMG_KINDS[k]){imgDraftClear(k);imgRefreshPick(k,id||'');}});
  document.getElementById('modal-magie').classList.add('open');
}
function mgFormSave(){
  if(!mgForm)return;
  const sp=MG_SPECS[mgForm.kind],d={};
  mgRefqInconnus=[];
  sp.fields.forEach(f=>{
    if(f.t==='img')return;   // l'image est gérée à part (voir imgPick / imgDraft)
    if(f.t==='rows'){d[f.k]=mgReadRows(f.k);return;}
    if(f.t==='pick'){d[f.k]=mgReadPick(f.k);return;}
    if(f.t==='chips'){d[f.k]=(mgFormChips[f.k]||[]).slice();return;}
    if(f.t==='aff'){
      const o={},b=document.getElementById('mgf-'+f.k);
      if(b)b.querySelectorAll('[data-tid]').forEach(r=>{o[r.dataset.tid]=mgN(r.querySelector('input').value,0);});
      d[f.k]=o;return;
    }
    const e=document.getElementById('mgf-'+f.k);
    d[f.k]=e?(f.t==='range'?mgN(e.value,0):e.value.trim()):'';
  });
  // rien n'est enregistré tant qu'un nom cherché ne correspond à aucune fiche :
  // sinon la ligne serait perdue en silence
  if(mgRefqInconnus.length){
    alert('Ces noms ne correspondent à aucune fiche existante :\n\n• '+mgRefqInconnus.join('\n• ')
      +'\n\nVérifie l’orthographe, ou crée d’abord la fiche. Rien n’a été enregistré.');
    mgRefqInconnus=[];return;
  }
  // sp.stamp : nom du champ où noter la date de dernière modification
  if(sp.stamp)d[sp.stamp]=new Date().toISOString();
  if(sp.list){
    const M=mgStore(sp);if(!Array.isArray(M[sp.list]))M[sp.list]=[];
    if(sp.req==='__nom'){if(!d.nom&&!d.persoId){alert('Choisis un personnage lié ou saisis un nom.');return;}}
    else if(sp.req&&!d[sp.req]){alert('Le champ « '+sp.req+' » est obligatoire.');return;}
    if(mgForm.id){
      const i=M[sp.list].findIndex(x=>x.id===mgForm.id);
      if(i>=0)M[sp.list][i]=Object.assign({},M[sp.list][i],d,{id:mgForm.id});
    }else{
      // nouvelle fiche : on y attache l'image choisie avant l'enregistrement
      const nouv=Object.assign({id:uid()},d);
      mgImgFields(sp,mgForm.kind).forEach(k=>{if(imgHasDraft(k))nouv[imgProp(k)]=imgDraft[k];});
      M[sp.list].push(nouv);
    }
  }else sp.save(d);
  mgImgFields(sp,mgForm.kind).forEach(imgDraftClear);
  save();closeModal('magie');mgForm=null;mgAfter(sp);
}
function mgFormDelete(){
  if(!mgForm||!mgForm.id)return;
  const sp=MG_SPECS[mgForm.kind];if(!sp||!sp.list)return;
  if(!confirm('Supprimer définitivement cet élément ?'))return;
  const M=mgStore(sp);M[sp.list]=(M[sp.list]||[]).filter(x=>x.id!==mgForm.id);
  save();closeModal('magie');mgForm=null;mgAfter(sp);
}
