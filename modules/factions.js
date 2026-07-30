/* ======================================================================
   GRIMOIRE — modules/factions.js
   Factions et sous-factions.

   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

// FACTIONS
const F_FIELDS=['nom','devise','ideo','hierarchie','symbole','role','secrets',
                'hQuand','hParQui','hPourquoi','hEvenements',
                'recrutement','financement','regles'];

/* Types de relation entre deux factions */
const F_REL_TYPES=[
  ['allie',     'Allié',      'green'],
  ['ennemi',    'Ennemi',     'red'],
  ['rival',     'Rival',      'coral'],
  ['neutre',    'Neutre',     'slate'],
  ['vassal',    'Vassal',     'blue'],
  ['superieur', 'Supérieur',  'purple'],
  ['partenaire','Partenaire', 'teal'],
  ['infiltre',  'Infiltré',   'amber'],
  ['autre',     'Autre',      'slate']
];
const F_REL={};F_REL_TYPES.forEach(t=>{F_REL[t[0]]=t;});
function fRel(k){return F_REL[k]||F_REL.autre;}

/* Reprise des anciennes fiches : territoire → lieux, alliés/ennemis → relations.
   Idempotent : une fiche déjà reprise n'a plus ces propriétés. */
function migrateFactions(){
  let touche=false;
  (S.factions||[]).forEach(f=>{
    if(f.territoire!==undefined){
      if(f.territoire){
        if(!Array.isArray(f.lieux))f.lieux=[];
        if(f.lieux.indexOf(f.territoire)<0)f.lieux.push(f.territoire);
        if(!f.lieuPrincipal)f.lieuPrincipal=f.territoire;
      }
      delete f.territoire;touche=true;
    }
    [['allies','allie'],['ennemis','ennemi']].forEach(([cle,type])=>{
      if(f[cle]!==undefined){
        if(Array.isArray(f[cle])&&f[cle].length){
          if(!Array.isArray(f.rels))f.rels=[];
          f[cle].forEach(id=>{if(id&&!f.rels.some(r=>r&&r.id===id))f.rels.push({id,type,desc:''});});
        }
        delete f[cle];touche=true;
      }
    });
  });
  if(touche)save();
}

/* ---------- Membres ----------
   Tout vit sur le personnage : p.factions = [{id, fonction, grade, depuis}].
   La faction ne stocke plus rien à ce sujet, donc les deux fiches montrent
   forcément la même chose — c'est la même donnée, lue des deux côtés. */
function factionMembres(f){
  return (S.personnages||[]).map(p=>{
    const l=lienDe(p.factions,f.id);
    return l?{id:p.id,fonction:l.fonction||'',grade:l.grade||'',depuis:l.depuis||''}:null;
  }).filter(Boolean);
}
/* Écrit les précisions saisies côté faction sur les personnages concernés */
function ecrireMembres(factionId,membres){
  syncPersoLinks('factions',factionId,membres.map(m=>m.id));
  membres.forEach(m=>{
    const p=(S.personnages||[]).find(x=>x.id===m.id);if(!p)return;
    const l=lienDe(p.factions,factionId);if(!l)return;
    l.fonction=m.fonction||'';l.grade=m.grade||'';l.depuis=m.depuis||'';
  });
}

function saveFaction(){
  const nom=document.getElementById('f-nom').value.trim();if(!nom)return false;
  const editId=document.getElementById('f-edit-id').value;
  const parent=document.getElementById('f-parent').value||'';
  const prevF=editId?S.factions.find(x=>x.id===editId):null;
  const f={id:editId||uid(),parent,
    image:imgResolve('faction',prevF&&prevF.image),
    type:document.getElementById('f-type').value,
    chef:document.getElementById('f-chef').value,
    rels:lireRels(),
    lieux:fLieuxDraft.slice(),
    lieuPrincipal:fLieuPrincipal||'',
    fichiers:modalFiles.faction};
  F_FIELDS.forEach(k=>f[k]=document.getElementById('f-'+k).value);
  f.nom=nom;
  if(editId){const i=S.factions.findIndex(x=>x.id===editId);if(i>=0)S.factions[i]=f;}else S.factions.push(f);
  ecrireMembres(f.id,lireMembres());
  imgDraftClear('faction');
  save();closeModal('faction');renderFactions();renderPersos();renderLieux();updateStats();
  return true;
}
/* Le lien faction↔lieu n'est enregistré QUE sur la faction (f.lieux). La fiche
   du lieu le relit à l'affichage — voir factionsDansLieu() dans lieux.js.
   Rien n'est stocké en double, donc les deux fiches ne peuvent pas diverger. */
function delFaction(id){
  S.factions=S.factions.filter(x=>x.id!==id);
  S.factions.forEach(f=>{
    if(Array.isArray(f.rels))f.rels=f.rels.filter(r=>r&&r.id!==id);
    if(Array.isArray(f.allies))f.allies=f.allies.filter(x=>x!==id);
    if(Array.isArray(f.ennemis))f.ennemis=f.ennemis.filter(x=>x!==id);
  });
  S.personnages.forEach(p=>{if(Array.isArray(p.factions))p.factions=p.factions.filter(x=>(x&&typeof x==='object'?x.id:x)!==id);});
  S.evenements.forEach(e=>{if(Array.isArray(e.factions))e.factions=e.factions.filter(x=>x!==id);});
  save();renderFactions();renderPersos();renderLieux();renderTimeline();updateStats();
}

/* ================= ÉDITEURS DE LA FICHE ================= */
let fMembresDraft=[],fRelsDraft=[],fLieuxDraft=[],fLieuPrincipal='';

/* Prépare les trois tables à l'ouverture de la fiche */
function factionEditInit(f){
  fMembresDraft=f?factionMembres(f):[];
  fRelsDraft=(f&&Array.isArray(f.rels)?f.rels:[]).filter(r=>r&&r.id).map(r=>({id:r.id,type:r.type||'allie',desc:r.desc||''}));
  fLieuxDraft=(f&&Array.isArray(f.lieux)?f.lieux:[]).filter(Boolean).slice();
  fLieuPrincipal=(f&&f.lieuPrincipal)||'';
  renderFactionMembres();renderFactionRels();renderFactionLieux();
}
/* Remplit une liste de suggestions (recherche par nom) */
function fillDatalist(id,items){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=items.map(x=>`<option value="${esc(x.nom||'')}"></option>`).join('');
}
/* Retrouve un élément d'après le nom tapé (insensible à la casse et aux accents) */
function trouveParNom(liste,q){
  const n=crNorm(q);if(!n)return null;
  return liste.find(x=>crNorm(x.nom)===n)||liste.find(x=>crNorm(x.nom).indexOf(n)===0)||null;
}

/* ---------- Table des membres ---------- */
function renderFactionMembres(){
  const box=document.getElementById('f-membres-table');if(!box)return;
  const dispo=(S.personnages||[]).filter(p=>!fMembresDraft.some(m=>m.id===p.id));
  fillDatalist('f-membre-src',dispo);
  if(!fMembresDraft.length){
    box.innerHTML='<div class="f-vide">Aucun membre — cherche un personnage par son nom ci-dessus.</div>';
    return;
  }
  box.innerHTML=`<div class="f-wrap"><table class="f-table">
    <thead><tr><th>Personnage</th><th>Fonction</th><th>Grade</th><th>Depuis</th><th class="f-col-x"></th></tr></thead>
    <tbody>${fMembresDraft.map((m,i)=>{
      const p=(S.personnages||[]).find(x=>x.id===m.id);
      const c=COLORS[(p&&p.color)||'purple'];
      return `<tr data-mid="${esc(m.id)}">
        <td class="f-who"><span class="tag ${c.tag} link-tag" onclick="factionOuvrirPerso('${m.id}')" title="Enregistre la faction puis ouvre la fiche">${esc((p&&p.nom)||'Personnage supprimé')}</span></td>
        <td><input type="text" data-col="fonction" value="${esc(m.fonction)}" placeholder="Trésorière, éclaireur…"></td>
        <td><input type="text" data-col="grade" value="${esc(m.grade)}" placeholder="Rang, titre…"></td>
        <td><input type="text" data-col="depuis" value="${esc(m.depuis)}" placeholder="An 847, printemps…"></td>
        <td class="f-col-x"><button type="button" class="btn btn-danger btn-sm" onclick="factionDelMembre(${i})" title="Retirer">✕</button></td>
      </tr>`;}).join('')}</tbody></table></div>`;
}
function lireMembres(){
  const box=document.getElementById('f-membres-table');
  if(!box)return fMembresDraft.slice();
  const out=[];
  box.querySelectorAll('tr[data-mid]').forEach(tr=>{
    const o={id:tr.getAttribute('data-mid')};
    tr.querySelectorAll('input[data-col]').forEach(i=>{o[i.getAttribute('data-col')]=i.value.trim();});
    out.push(o);
  });
  return out;
}
function factionAddMembre(){
  const inp=document.getElementById('f-membre-q');if(!inp)return;
  const p=trouveParNom((S.personnages||[]).filter(x=>!fMembresDraft.some(m=>m.id===x.id)),inp.value);
  if(!p){alert('Aucun personnage ne correspond à ce nom.\n\nVérifie l’orthographe, ou crée d’abord le personnage dans l’onglet Personnages.');return;}
  fMembresDraft=lireMembres();
  fMembresDraft.push({id:p.id,fonction:'',grade:'',depuis:''});
  inp.value='';renderFactionMembres();
}
function factionDelMembre(i){fMembresDraft=lireMembres();fMembresDraft.splice(i,1);renderFactionMembres();}
/* Ouvrir la fiche d'un membre enregistre d'abord la faction, pour ne rien perdre */
function factionOuvrirPerso(id){
  if(!document.getElementById('f-nom').value.trim()){
    alert('Donne d’abord un nom à la faction pour pouvoir l’enregistrer.');return;
  }
  if(saveFaction())openPerso(id);
}

/* ---------- Table des relations ---------- */
function renderFactionRels(){
  const box=document.getElementById('f-rels-table');if(!box)return;
  const moi=document.getElementById('f-edit-id').value;
  const dispo=(S.factions||[]).filter(x=>x.id!==moi&&!fRelsDraft.some(r=>r.id===x.id));
  fillDatalist('f-rel-src',dispo);
  if(!fRelsDraft.length){
    box.innerHTML='<div class="f-vide">Aucune relation — cherche une faction par son nom ci-dessus.</div>';
    return;
  }
  box.innerHTML=`<div class="f-wrap"><table class="f-table">
    <thead><tr><th>Faction</th><th style="width:150px">Relation</th><th>Description</th><th class="f-col-x"></th></tr></thead>
    <tbody>${fRelsDraft.map((r,i)=>{
      const o=(S.factions||[]).find(x=>x.id===r.id);
      const p=mgP(fRel(r.type)[2]);
      return `<tr data-rid="${esc(r.id)}">
        <td class="f-who"><span class="tag link-tag" style="background:rgba(${p.rgb},0.15);color:${p.v}" onclick="factionOuvrirFaction('${r.id}')" title="Voir cette faction">⚔ ${esc((o&&o.nom)||'Faction supprimée')}</span></td>
        <td><select data-col="type">${F_REL_TYPES.map(t=>`<option value="${t[0]}"${r.type===t[0]?' selected':''}>${t[1]}</option>`).join('')}</select></td>
        <td><input type="text" data-col="desc" value="${esc(r.desc)}" placeholder="Alliance de façade, pacte rompu…"></td>
        <td class="f-col-x"><button type="button" class="btn btn-danger btn-sm" onclick="factionDelRel(${i})" title="Retirer">✕</button></td>
      </tr>`;}).join('')}</tbody></table></div>`;
}
function lireRels(){
  const box=document.getElementById('f-rels-table');
  if(!box)return fRelsDraft.slice();
  const out=[];
  box.querySelectorAll('tr[data-rid]').forEach(tr=>{
    const o={id:tr.getAttribute('data-rid')};
    tr.querySelectorAll('[data-col]').forEach(i=>{o[i.getAttribute('data-col')]=String(i.value||'').trim();});
    out.push(o);
  });
  return out;
}
function factionAddRel(){
  const inp=document.getElementById('f-rel-q');if(!inp)return;
  const moi=document.getElementById('f-edit-id').value;
  const f=trouveParNom((S.factions||[]).filter(x=>x.id!==moi&&!fRelsDraft.some(r=>r.id===x.id)),inp.value);
  if(!f){alert('Aucune autre faction ne correspond à ce nom.');return;}
  fRelsDraft=lireRels();
  fRelsDraft.push({id:f.id,type:'allie',desc:''});
  inp.value='';renderFactionRels();
}
function factionDelRel(i){fRelsDraft=lireRels();fRelsDraft.splice(i,1);renderFactionRels();}
function factionOuvrirFaction(id){
  if(!document.getElementById('f-nom').value.trim()){alert('Donne d’abord un nom à la faction pour pouvoir l’enregistrer.');return;}
  if(saveFaction())openFaction(id);
}

/* ---------- Lieux associés ---------- */
function renderFactionLieux(){
  const box=document.getElementById('f-lieux-table');if(!box)return;
  const dispo=(S.lieux||[]).filter(l=>fLieuxDraft.indexOf(l.id)<0);
  fillDatalist('f-lieu-src',dispo);
  if(!fLieuxDraft.length){
    box.innerHTML='<div class="f-vide">Aucun lieu — cherche un lieu par son nom ci-dessus.</div>';
    return;
  }
  box.innerHTML=`<div class="f-wrap"><table class="f-table">
    <thead><tr><th style="width:38px">⭐</th><th>Lieu</th><th class="f-col-x"></th></tr></thead>
    <tbody>${fLieuxDraft.map((id,i)=>{
      const l=(S.lieux||[]).find(x=>x.id===id),on=fLieuPrincipal===id;
      return `<tr>
        <td><button type="button" class="f-star${on?' on':''}" onclick="factionSetPrincipal('${id}')" title="${on?'Lieu principal':'Désigner comme lieu principal'}">${on?'★':'☆'}</button></td>
        <td class="f-who"><span class="tag tag-blue link-tag" onclick="factionOuvrirLieu('${id}')" title="Voir ce lieu">◎ ${esc((l&&l.nom)||'Lieu supprimé')}</span>${on?' <span class="tag tag-amber" style="font-size:10px">principal</span>':''}</td>
        <td class="f-col-x"><button type="button" class="btn btn-danger btn-sm" onclick="factionDelLieu(${i})" title="Retirer">✕</button></td>
      </tr>`;}).join('')}</tbody></table></div>`;
}
function factionAddLieu(){
  const inp=document.getElementById('f-lieu-q');if(!inp)return;
  const l=trouveParNom((S.lieux||[]).filter(x=>fLieuxDraft.indexOf(x.id)<0),inp.value);
  if(!l){alert('Aucun lieu ne correspond à ce nom.\n\nVérifie l’orthographe, ou crée d’abord le lieu dans l’onglet Lieux.');return;}
  fLieuxDraft.push(l.id);
  if(!fLieuPrincipal)fLieuPrincipal=l.id;   // le premier lieu ajouté devient le principal
  inp.value='';renderFactionLieux();
}
function factionDelLieu(i){
  const id=fLieuxDraft[i];
  fLieuxDraft.splice(i,1);
  if(fLieuPrincipal===id)fLieuPrincipal=fLieuxDraft[0]||'';
  renderFactionLieux();
}
function factionSetPrincipal(id){fLieuPrincipal=(fLieuPrincipal===id)?'':id;renderFactionLieux();}
function factionOuvrirLieu(id){
  if(!document.getElementById('f-nom').value.trim()){alert('Donne d’abord un nom à la faction pour pouvoir l’enregistrer.');return;}
  if(saveFaction())openLieu(id);
}

/* ================= AFFICHAGE =================
   Toutes les factions, mères et filles, dans une même grille de cartes.
   La hiérarchie se lit sur la carte : badge « sous-faction de … » et
   compteur de sous-factions. Un clic ouvre la fiche. */
function renderFactions(){
  migrateFactions();
  const el=document.getElementById('faction-list');
  if(!S.factions.length){el.className='';el.innerHTML='<div class="empty"><div class="empty-icon">⚔</div>Aucune faction définie</div>';return;}
  // les mères d'abord, chacune suivie de ses filles : l'ordre porte la hiérarchie
  const racines=S.factions.filter(f=>!f.parent||!S.factions.some(x=>x.id===f.parent));
  const ordre=[],vus=new Set();
  (function marche(liste){
    liste.forEach(f=>{
      if(vus.has(f.id))return;
      vus.add(f.id);ordre.push(f);
      marche(S.factions.filter(x=>x.parent===f.id));
    });
  })(racines);
  S.factions.forEach(f=>{if(!vus.has(f.id))ordre.push(f);});   // sécurité anti-boucle
  el.className='cr-cards';
  el.innerHTML=ordre.map(factionCardHTML).join('');
}
function factionCardHTML(f){
  const subs=S.factions.filter(x=>x.parent===f.id);
  const mere=f.parent?S.factions.find(x=>x.id===f.parent):null;
  const compteurs=lkCompteCarte('faction',f.id,3);
  if(subs.length)compteurs.unshift({k:'subs',ico:'❖',lab:'Sous-factions',n:subs.length});
  return rpgCardHTML({
    kind:'faction',id:f.id,domId:'fcard-'+f.id,
    nom:f.nom,sous:[f.type,f.devise?'« '+trunc(f.devise,34)+' »':''].filter(Boolean).join(' · '),
    couleur:mere?'coral':'amber',
    image:f.image,fallback:mgEsc(mgInitials(f.nom)),
    onclick:`openModal('faction','${f.id}')`,
    badge:mere?'sous-faction de '+mgEsc(trunc(mere.nom,20)):'',
    compteurs:compteurs.slice(0,4),
    actions:`<button onclick="event.stopPropagation();openModal('faction','${f.id}')" title="Modifier">✎</button>`
      +`<button onclick="imgPick('faction','${f.id}',event)" title="Changer l’emblème">📷</button>`
      +`<button onclick="newSousFaction('${f.id}',event)" title="Ajouter une sous-faction">❖+</button>`
      +`<button onclick="event.stopPropagation();delFaction('${f.id}')" title="Supprimer">✕</button>`
  });
}
/* Badges des lieux, avec ⭐ sur le lieu principal */
function factionLieuTags(f){
  const ids=Array.isArray(f.lieux)?f.lieux:[];
  return ids.map(id=>{
    const l=(S.lieux||[]).find(x=>x.id===id);if(!l)return'';
    const star=f.lieuPrincipal===id?'⭐ ':'';
    return `<span class="tag tag-blue link-tag" style="font-size:11px" onclick="openLieu('${l.id}');event.stopPropagation()">${star}◎ ${esc(l.nom)}</span>`;
  }).filter(Boolean);
}
/* Badges des membres, avec leur grade et leur fonction si renseignés */
function factionMembreTags(f,max){
  return factionMembres(f).slice(0,max||99).map(m=>{
    const p=(S.personnages||[]).find(x=>x.id===m.id);if(!p)return'';
    const c=COLORS[p.color||'purple'];
    const r=[m.grade,m.fonction].filter(Boolean).join(' · ');
    return `<span class="tag ${c.tag} link-tag" style="font-size:11px" onclick="openPerso('${p.id}');event.stopPropagation()">${esc(p.nom)}${r?` <span style="opacity:.7">— ${esc(r)}</span>`:''}</span>`;
  }).filter(Boolean);
}
/* Badges des relations, colorés selon le type */
function factionRelTags(f){
  return (Array.isArray(f.rels)?f.rels:[]).map(r=>{
    if(!r||!r.id)return'';
    const o=(S.factions||[]).find(x=>x.id===r.id);if(!o)return'';
    const t=fRel(r.type),p=mgP(t[2]);
    return `<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="openFaction('${o.id}');event.stopPropagation()" title="${esc(r.desc||t[1])}">${esc(t[1])} — ${esc(o.nom)}</span>`;
  }).filter(Boolean);
}
// Chef, lieux, membres et relations d'une faction — badges cliquables
function factionLinksHTML(f){
  const membres=factionMembres(f);
  const memT=factionMembreTags(f,4);
  const plus=membres.length>4?`<span class="tag" style="font-size:11px;background:var(--bg4);color:var(--text3)">+${membres.length-4}</span>`:'';
  const line=(lab,tags)=>tags.length?`<div class="link-line"><span class="link-lab">${lab}</span><span class="tag-row">${tags.join('')}</span></div>`:'';
  return line('Chef',f.chef?persoTags([f.chef]):[])
    +line('Lieux',factionLieuTags(f))
    +(memT.length?`<div class="link-line"><span class="link-lab">Membres</span><span class="tag-row">${memT.join('')}${plus}</span></div>`:'')
    +line('Relations',factionRelTags(f));
}
function newSousFaction(id,ev){ if(ev)ev.stopPropagation(); openModal('faction',null,id); }
