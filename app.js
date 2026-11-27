const DEFAULT_DATA = {
  lives: [{name:"Jordybala",url:"https://www.twitch.tv/jordybala",game:"Hearthstone",note:"Retrouvez les lives et les rendez-vous de la jungle."}],
  schedule: [],
  decks: [],
  king: {name:"Dodo Ier",title:"King of the Jungle",wins:"À compléter",note:"Longue vie au roi !"},
  hall: [{name:"Poulmorte Ier",record:"Ancien roi — merci pour son long règne."}],
  tournaments: [],
  community: {message:"Bienvenue dans la Ouisti’Team ! Retrouvez ici les informations de la communauté, les annonces et les rendez-vous de la jungle.",discord:"",twitch:"https://www.twitch.tv/jordybala",tiktok:""}
};
let data = structuredClone(DEFAULT_DATA);
let currentTab = "live";

// Ouisti'Deck — connexion publique Supabase (clé publishable, prévue pour le navigateur)
const SUPABASE_URL = "https://lqhbrspljzdbgwonmgac.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_I_B4l3DgsaallmpVHDKBLg_5qZhMOkg";
let supabaseClient = null;
let supabaseReadyPromise = null;
let communityDecks = [];
let communityDecksLoaded = false;
let communityDecksLoading = false;
let communityDecksError = "";
let deckClassFilter = "Toutes";
let deckAuthorFilter = "Tous";
let deckSearchTerm = "";
let deckSubmitMessage = "";
let deckSubmitMessageIsError = false;

const $ = (selector, root=document) => root.querySelector(selector);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function safeURL(value){
  const raw=String(value||"").trim();
  if(!raw)return "";
  try{const url=new URL(raw);return ["https:","http:"].includes(url.protocol)?url.href:""}catch{return ""}
}
function linkButton(url,label,secondary=false){const href=safeURL(url);return href?`<a class="action${secondary?" secondary":""}" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`:""}
function heading(title,tag){return `<div class="section-title"><h2>${title}</h2><span class="tag">${escapeHTML(tag)}</span></div>`}
function empty(message){return `<div class="empty">${escapeHTML(message)}</div>`}
function normalise(input){
  if(!input||typeof input!=="object"||Array.isArray(input))return structuredClone(DEFAULT_DATA);
  return {
    ...structuredClone(DEFAULT_DATA),...input,
    king:{...DEFAULT_DATA.king,...(input.king||{})},
    community:{...DEFAULT_DATA.community,...(input.community||{})},
    lives:Array.isArray(input.lives)?input.lives:DEFAULT_DATA.lives,
    schedule:Array.isArray(input.schedule)?input.schedule:[],
    decks:Array.isArray(input.decks)?input.decks:[],
    hall:Array.isArray(input.hall)?input.hall:DEFAULT_DATA.hall,
    tournaments:Array.isArray(input.tournaments)?input.tournaments:[]
  };
}
function renderLive(){
  const cards=(data.lives||[]).map(item=>`<article class="card"><div class="row"><h3>${escapeHTML(item.name)}</h3><span class="pill">COMMUNAUTÉ</span></div><div class="muted">${escapeHTML(item.game||"Hearthstone")}${item.note?` · ${escapeHTML(item.note)}`:""}</div>${item.url?`<p>${linkButton(item.url,"Voir la chaîne Twitch ↗")}</p>`:""}</article>`).join("");
  return heading("Les lives de la team","CHAÎNES")+`<article class="card featured"><div class="row"><div><span class="tag">LE CAMP DE BASE</span><h3 style="margin-top:8px">La jungle est ouverte !</h3><p class="muted">Suivez les lives, les decks et les événements de la Ouisti’Team.</p></div><div class="stat" aria-hidden="true">🐒</div></div></article>`+(cards?`<div class="list">${cards}</div>`:empty("Les chaînes de la team seront bientôt affichées."));
}

function renderPlanning(){
  const affiche = "assets/Prog%202026%20Nov4VF.png";

  return heading("Le planning de la jungle","PROGRAMME HEBDOMADAIRE")
  + `<article class="card featured">
      <div style="width:100%;text-align:center;">
        <a href="${affiche}" target="_blank" rel="noopener noreferrer">
          <img
            src="${affiche}"
            alt="Planning hebdomadaire de la Ouisti’Team"
            loading="lazy"
            style="width:100%;height:auto;max-width:1100px;border-radius:14px;border:1px solid #d9a43b;box-shadow:0 8px 24px #0008;"
          >
        </a>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
        <a class="action" href="${affiche}" target="_blank" rel="noopener noreferrer">
          Agrandir le planning ↗
        </a>
        <a class="action secondary" href="${affiche}" download="planning-semaine.png">
          Télécharger le planning ↓
        </a>
      </div>
    </article>`;
}

const HEARTHSTONE_CLASSES = ["Chevalier de la mort", "Chasseur de démons", "Druide", "Chasseur", "Mage", "Paladin", "Prêtre", "Voleur", "Chaman", "Démoniste", "Guerrier"];

function loadSupabase(){
  if(supabaseClient)return Promise.resolve(supabaseClient);
  if(supabaseReadyPromise)return supabaseReadyPromise;
  supabaseReadyPromise=new Promise((resolve,reject)=>{
    const initialise=()=>{
      if(!window.supabase?.createClient){reject(new Error("La bibliothèque Supabase n'a pas pu être chargée."));return;}
      supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
      resolve(supabaseClient);
    };
    if(window.supabase?.createClient){initialise();return;}
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload=initialise;
    script.onerror=()=>reject(new Error("Impossible de charger la connexion à la bibliothèque de decks."));
    document.head.appendChild(script);
  }).catch(error=>{supabaseReadyPromise=null;throw error;});
  return supabaseReadyPromise;
}

async function refreshCommunityDecks(force=false){
  if(communityDecksLoading||(!force&&communityDecksLoaded))return;
  communityDecksLoading=true;
  communityDecksError="";
  if(currentTab==="decks")render();
  try{
    const client=await loadSupabase();
    const {data:rows,error}=await client.from("decks")
      .select("id, deck_name, author_name, hero_class, game_format, deck_code, description, created_at")
      .eq("status","approved").order("created_at",{ascending:false});
    if(error)throw error;
    communityDecks=Array.isArray(rows)?rows:[];
    communityDecksLoaded=true;
  }catch(error){
    console.error("Ouisti'Deck — chargement impossible",error);
    communityDecksError="La bibliothèque communautaire n'est pas accessible pour le moment. Réessaie dans quelques instants.";
  }finally{
    communityDecksLoading=false;
    if(currentTab==="decks")render();
  }
}

const CLASS_BADGES = {
  "Chevalier de la mort": {image:"assets/class-chevalier-de-la-mort.png", tone:"#69b8e8"},
  "Chasseur de démons": {image:"assets/class-chasseur-de-demons.png", tone:"#69c52e"},
  "Druide": {image:"assets/class-druide.png", tone:"#b27a42"},
  "Chasseur": {image:"assets/class-chasseur.png", tone:"#68bd3b"},
  "Mage": {image:"assets/class-mage.png", tone:"#3199ff"},
  "Paladin": {image:"assets/class-paladin.png", tone:"#e6b83e"},
  "Prêtre": {image:"assets/class-pretre.png", tone:"#e7e1d2"},
  "Voleur": {image:"assets/class-voleur.png", tone:"#a66be0"},
  "Chaman": {image:"assets/class-chaman.png", tone:"#36c9e8"},
  "Démoniste": {image:"assets/class-demoniste.png", tone:"#a45be8"},
  "Guerrier": {image:"assets/class-guerrier.png", tone:"#df6541"}
};
function classBadge(heroClass, size=42){
  const badge=CLASS_BADGES[heroClass]||{image:"assets/class-mage.png",tone:"#d9ad4b"};
  return `<img src="${badge.image}" alt="${escapeHTML(heroClass||"Classe inconnue")}" title="${escapeHTML(heroClass||"Classe inconnue")}" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px;flex:0 0 ${size}px;object-fit:contain;border-radius:50%;filter:drop-shadow(0 0 5px ${badge.tone}88)">`;
}
function formatDeckDate(value){
  if(!value)return "Date inconnue";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "Date inconnue";
  const today=new Date();
  const yesterday=new Date();yesterday.setDate(today.getDate()-1);
  const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const day=sameDay(date,today)?"Aujourd'hui":sameDay(date,yesterday)?"Hier":new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"short"}).format(date);
  return day.charAt(0).toLocaleUpperCase("fr")+day.slice(1);
}
function renderDecks(){
  const localCards=(data.decks||[]).map((item,i)=>`<article class="card"><div style="display:flex;align-items:center;gap:12px">${classBadge(item.hero_class||"",42)}<div style="flex:1;min-width:0"><h3>${escapeHTML(item.name||`Deck ${i+1}`)}</h3><span class="muted">${escapeHTML(item.hero_class||"Deck de Jordy")}</span></div><span class="pill">DECK JORDY</span></div>${item.note?`<div class="muted" style="margin-top:10px">${escapeHTML(item.note)}</div>`:""}<div class="deck-code" id="local-deck-${i}">${escapeHTML(item.code||"Code non renseigné")}</div>${item.code?`<button class="action" type="button" data-copy="local-deck-${i}">▣ Copier le code</button>`:""}${item.url?` ${linkButton(item.url,"Voir le deck ↗",true)}`:""}</article>`).join("");
  const search=deckSearchTerm.trim().toLocaleLowerCase("fr");
  const authors=[...new Set(communityDecks.map(item=>String(item.author_name||"Joueur").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const filtered=communityDecks.filter(item=>{
    const matchesClass=deckClassFilter==="Toutes"||item.hero_class===deckClassFilter;
    const matchesAuthor=deckAuthorFilter==="Tous"||item.author_name===deckAuthorFilter;
    const haystack=[item.deck_name,item.author_name,item.hero_class,item.description].join(" ").toLocaleLowerCase("fr");
    return matchesClass&&matchesAuthor&&(!search||haystack.includes(search));
  });
  const authorButtons=[`<button type="button" data-author-filter="Tous" aria-pressed="${deckAuthorFilter==="Tous"}" style="min-width:76px;padding:10px 13px;border-radius:14px;border:1px solid ${deckAuthorFilter==="Tous"?"#e9bd4d":"#71809a"};background:${deckAuthorFilter==="Tous"?"linear-gradient(135deg,#314f78,#132747)":"#172943"};color:#fff;cursor:pointer;font-weight:700">Tous <span style="display:block;font-size:11px;opacity:.8">${communityDecks.length}</span></button>`,...authors.map(author=>{
    const initials=author.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toLocaleUpperCase("fr");
    const count=communityDecks.filter(item=>item.author_name===author).length;
    const active=deckAuthorFilter===author;
    return `<button type="button" data-author-filter="${escapeHTML(author)}" aria-pressed="${active}" style="min-width:76px;padding:8px 12px;border-radius:14px;border:1px solid ${active?"#e9bd4d":"#71809a"};background:${active?"linear-gradient(135deg,#314f78,#132747)":"#172943"};color:#fff;cursor:pointer"><span style="display:inline-flex;width:34px;height:34px;border-radius:50%;align-items:center;justify-content:center;background:linear-gradient(135deg,#d8ad43,#75501d);color:#101d36;font-weight:900;margin-bottom:4px">${escapeHTML(initials)}</span><span style="display:block;max-width:105px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${escapeHTML(author)}</span><span style="font-size:10px;opacity:.75">${count} deck${count>1?"s":""}</span></button>`;
  })].join("");
  const classButtons=[`<button type="button" data-class-filter="Toutes" aria-label="Toutes les classes" title="Toutes les classes" aria-pressed="${deckClassFilter==="Toutes"}" style="width:52px;height:52px;border-radius:13px;border:1px solid ${deckClassFilter==="Toutes"?"#e9bd4d":"#71809a"};background:${deckClassFilter==="Toutes"?"#314f78":"#172943"};color:#f4d16b;font-size:22px;cursor:pointer">✥</button>`,...HEARTHSTONE_CLASSES.map(heroClass=>{
    const b=CLASS_BADGES[heroClass];const active=deckClassFilter===heroClass;
    return `<button type="button" data-class-filter="${escapeHTML(heroClass)}" aria-label="${escapeHTML(heroClass)}" title="${escapeHTML(heroClass)}" aria-pressed="${active}" style="width:52px;height:52px;padding:3px;border-radius:13px;border:1px solid ${active?"#e9bd4d":"#71809a"};background:${active?"#314f78":"#172943"};cursor:pointer"><img src="${b.image}" alt="" width="44" height="44" loading="lazy" style="width:44px;height:44px;object-fit:contain"></button>`;
  })].join("");
  const groups=new Map();
  filtered.forEach(item=>{const key=formatDeckDate(item.created_at);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);});
  const communityCards=[...groups.entries()].map(([day,items])=>`<section style="margin-top:18px"><h3 class="subheading" style="display:flex;align-items:center;gap:12px">${escapeHTML(day)} <span class="muted" style="font-size:.78em;font-weight:400">${items.length} deck${items.length>1?"s":""}</span></h3><div class="list">${items.map((item,i)=>{
    const id=`community-deck-${String(item.id||i).replace(/[^a-zA-Z0-9_-]/g,"")}`;
    return `<article class="card" style="padding:14px"><div style="display:flex;align-items:center;gap:12px"><div style="flex:0 0 auto">${classBadge(item.hero_class,48)}</div><div style="flex:1;min-width:0"><h3 style="margin:0 0 4px;overflow-wrap:anywhere">${escapeHTML(item.deck_name)}</h3><div class="muted" style="font-size:.9em">${escapeHTML(item.hero_class)} · ${escapeHTML(item.author_name)}</div></div><span class="pill" style="white-space:nowrap">STANDARD</span></div><details style="margin-top:12px;border-top:1px solid #71809a55;padding-top:10px"><summary style="cursor:pointer;color:#f1c65c;font-weight:700">Voir le deck et son code</summary>${item.description?`<p class="muted" style="margin:10px 0">${escapeHTML(item.description)}</p>`:""}<div class="deck-code" id="${id}" style="overflow-wrap:anywhere;margin:10px 0">${escapeHTML(item.deck_code)}</div><button class="action" type="button" data-copy="${id}">▣ Copier le code</button></details></article>`;
  }).join("")}</div></section>`).join("");
  const classOptions=["Toutes",...HEARTHSTONE_CLASSES].map(name=>`<option value="${escapeHTML(name)}" ${deckClassFilter===name?"selected":""}>${escapeHTML(name)}</option>`).join("");
  const loadingNote=communityDecksLoading?`<p class="muted">🌿 Ouverture de la bibliothèque de la jungle…</p>`:"";
  const errorNote=communityDecksError?`<p class="muted" role="status">${escapeHTML(communityDecksError)} <button type="button" class="action secondary" data-reload-decks>Réessayer</button></p>`:"";
  const submitNote=deckSubmitMessage?`<p role="status" style="margin-top:12px;color:${deckSubmitMessageIsError?"#ffb4a9":"#d8bd70"}">${escapeHTML(deckSubmitMessage)}</p>`:"";
  return heading("Ouisti'Deck — la bibliothèque de la jungle","DECKS HEARTHSTONE")+
    `<article class="card featured"><span class="tag">PARTAGE TES LISTES</span><h3 style="margin-top:8px">Un deck à partager avec la Ouisti’Team ?</h3><p class="muted">Propose ta liste Hearthstone en quelques secondes. Après validation par Jordy, elle sera visible par toute la communauté.</p>
    <form id="deck-submit-form" style="display:grid;gap:12px;margin-top:16px">
      <label style="display:grid;gap:6px">Ton pseudo Twitch ou Discord<input name="author_name" required minlength="2" maxlength="40" autocomplete="nickname" placeholder="Ex. : Jordybala" style="width:100%;box-sizing:border-box;padding:11px;border-radius:9px"></label>
      <label style="display:grid;gap:6px">Nom du deck<input name="deck_name" required minlength="2" maxlength="80" placeholder="Ex. : Voleur Miracle" style="width:100%;box-sizing:border-box;padding:11px;border-radius:9px"></label>
      <label style="display:grid;gap:6px">Classe Hearthstone<select name="hero_class" required style="width:100%;box-sizing:border-box;padding:11px;border-radius:9px"><option value="">Choisir une classe…</option>${HEARTHSTONE_CLASSES.map(name=>`<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join("")}</select></label>
      <label style="display:grid;gap:6px">Code du deck<input name="deck_code" required minlength="5" maxlength="500" placeholder="Colle ici ton code Hearthstone" style="width:100%;box-sizing:border-box;padding:11px;border-radius:9px"></label>
      <label style="display:grid;gap:6px">Petite description (facultatif)<textarea name="description" maxlength="500" rows="3" placeholder="Comment jouer le deck, ses points forts…" style="width:100%;box-sizing:border-box;padding:11px;border-radius:9px;resize:vertical"></textarea></label>
      <label aria-hidden="true" style="position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden">Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label>
      <button class="action" type="submit" id="deck-submit-button">🌿 Envoyer mon deck</button>${submitNote}
    </form><p class="muted" style="font-size:0.88em;margin-top:12px">Aucun compte à créer. Les propositions sont vérifiées avant publication. Format Standard uniquement.</p></article>`+
    (localCards?`<h3 class="subheading">Les decks de Jordy</h3><div class="list">${localCards}</div>`:"")+
    `<h3 class="subheading">Les decks de la communauté</h3><article class="card" style="display:grid;gap:12px"><div><div class="muted" style="margin-bottom:8px">Filtrer par joueur</div><div style="display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px">${authorButtons}</div></div><div><div class="muted" style="margin-bottom:8px">Filtrer par classe</div><div style="display:flex;gap:8px;flex-wrap:wrap">${classButtons}</div></div><label style="display:grid;gap:5px">Rechercher un deck<input id="deck-search" value="${escapeHTML(deckSearchTerm)}" placeholder="Nom, pseudo, description…" style="width:100%;box-sizing:border-box;padding:10px;border-radius:9px"></label><div class="muted" style="font-size:.85em">${filtered.length} deck${filtered.length>1?"s":""} affiché${filtered.length>1?"s":""}</div></article>`+
    loadingNote+errorNote+(communityDecksLoading?"":communityCards?communityCards:empty(communityDecksError?"":"Aucun deck validé pour le moment. Sois le premier à partager le tien !"));
}
function renderTournaments(){
  const poster="assets/koj-dodo-28-novembre.png";
  const battlefy="https://battlefy.com/king-of-the-jungle-nouveau-format";
  const koj=`<article class="card featured" style="overflow:hidden;display:grid;gap:16px">
    <div style="text-align:center">
      <span class="tag">LE TOURNOI ROYAL</span>
      <h3 style="font-size:1.45em;margin:10px 0 4px;color:#f2cf72">King of the Jungle</h3>
      <p class="muted" style="margin:0">Le règne de Dodo Ier commence !</p>
    </div>
    <a href="${poster}" target="_blank" rel="noopener noreferrer" aria-label="Agrandir l'affiche du King of the Jungle" style="display:block;text-align:center">
      <img src="${poster}" alt="Affiche du King of the Jungle : Dodo Ier, samedi 28 novembre à 14 h" loading="lazy" style="display:block;width:100%;height:auto;max-width:620px;margin:0 auto;border-radius:14px;border:1px solid #d9a43b;box-shadow:0 8px 24px #0008">
    </a>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
      <div style="padding:12px;text-align:center;border:1px solid #c99435;border-radius:12px;background:#172943">
        <div class="muted" style="font-size:.78em;letter-spacing:.08em">DATE</div>
        <strong style="display:block;color:#f3d47c;margin-top:4px">Samedi 28 novembre</strong>
      </div>
      <div style="padding:12px;text-align:center;border:1px solid #c99435;border-radius:12px;background:#172943">
        <div class="muted" style="font-size:.78em;letter-spacing:.08em">DÉBUT DU TOURNOI</div>
        <strong style="display:block;color:#f3d47c;margin-top:4px">14 h 00</strong>
      </div>
      <div style="padding:12px;text-align:center;border:1px solid #c99435;border-radius:12px;background:#172943">
        <div class="muted" style="font-size:.78em;letter-spacing:.08em">FORMAT</div>
        <strong style="display:block;color:#f3d47c;margin-top:4px">Standard · BO3</strong>
      </div>
    </div>
    <p class="muted" style="text-align:center;margin:0">Rejoignez l'arène et venez tenter de détrôner le roi ! Retrouvez les informations et les tournois sur Battlefy.</p>
    <div style="text-align:center">${linkButton(battlefy,"👑 S'inscrire au King of the Jungle ↗")}</div>
  </article>`;
  return heading("King of the Jungle","TOURNOI HEARTHSTONE")+koj+
    `<p class="muted" style="text-align:center;margin:18px 0 4px">🌿 Les prochaines annonces Battle Royale seront affichées ici dès leur publication.</p>`;
}
function renderKings(){
  const king=data.king||DEFAULT_DATA.king;
  const hall=(data.hall||[]).map(item=>`<article class="card row"><strong>${escapeHTML(item.name)}</strong><span class="muted">${escapeHTML(item.record||"")}</span></article>`).join("");
  return heading("Le Temple des Kings","HALL OF FAME")+`<article class="card featured"><span class="tag">ROI ACTUEL</span><div class="king-title-row"><img class="king-crown" src="assets/jungle-crown.png" alt=""><div class="king-name">${escapeHTML(king.name||"Roi à désigner")}</div></div><div class="muted">${escapeHTML(king.title||"King of the Jungle")}</div><p class="muted">Victoires : <strong>${escapeHTML(king.wins||"—")}</strong></p>${king.note?`<p class="muted">${escapeHTML(king.note)}</p>`:""}</article><h3 class="subheading">Les anciens rois</h3>${hall?`<div class="list">${hall}</div>`:empty("Le panthéon se remplira au fil des règnes.")}`;
}
function renderCommunity(){
  const c=data.community||DEFAULT_DATA.community;
  const links=[linkButton(c.discord,"Rejoindre le Discord ↗"),linkButton(c.twitch,"Twitch ↗",true),linkButton(c.tiktok,"TikTok ↗",true)].filter(Boolean).join(" ");
  return heading("Les infos de la communauté","OUisti’TEAM")+`<article class="card featured"><div class="info-line"><span class="info-icon">🌿</span><div><h3>Bienvenue dans la tribu !</h3><p class="muted">${escapeHTML(c.message||DEFAULT_DATA.community.message)}</p></div></div></article>`+(links?`<article class="card"><h3>Retrouve la communauté</h3><div class="link-row">${links}</div></article>`:empty("Les liens de la communauté seront ajoutés ici."));
}
function render(){
  document.querySelectorAll(".tab").forEach(button=>button.classList.toggle("active",button.dataset.tab===currentTab));
  const views={live:renderLive,planning:renderPlanning,decks:renderDecks,tournaments:renderTournaments,kings:renderKings,community:renderCommunity};
  const root=$("#content");root.innerHTML=(views[currentTab]||renderLive)();root.setAttribute("aria-busy","false");
}
function setStatus(message){const el=$("#status");if(el)el.textContent=message;}
function loadConfiguration(){
  const configuration=window.Twitch?.ext?.configuration;
  if(!configuration){setStatus("Aperçu — configuration Twitch en attente");return;}
  configuration.onChanged(()=>{
    try{
      const content=configuration.broadcaster?.content;
      if(content)data=normalise(JSON.parse(content));
      render();setStatus(content?"Informations synchronisées":"Compagnon prêt — à configurer");
    }catch(error){console.warn("Configuration Twitch illisible",error);setStatus("Configuration à vérifier");}
  });
  setStatus("Connexion à Twitch…");
}
document.querySelector(".tabs").addEventListener("click",event=>{
  const button=event.target.closest("button[data-tab]");if(!button)return;currentTab=button.dataset.tab;render();if(currentTab==="decks")refreshCommunityDecks();
});
$("#content").addEventListener("click",async event=>{
  const authorButton=event.target.closest("button[data-author-filter]");
  if(authorButton){deckAuthorFilter=authorButton.dataset.authorFilter;render();return;}
  const classButton=event.target.closest("button[data-class-filter]");
  if(classButton){deckClassFilter=classButton.dataset.classFilter;render();return;}
  const button=event.target.closest("button[data-copy]");if(!button)return;
  const value=$("#"+CSS.escape(button.dataset.copy))?.textContent?.trim()||"";
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
    else{const area=document.createElement("textarea");area.value=value;document.body.append(area);area.select();document.execCommand("copy");area.remove();}
    button.textContent="✓ Code copié !";setTimeout(()=>button.textContent="▣ Copier le code",1600);
  }catch{button.textContent="Copie impossible";}
});
$("#content").addEventListener("submit",async event=>{
  const form=event.target.closest("#deck-submit-form");
  if(!form)return;
  event.preventDefault();
  const fields=new FormData(form);
  if(String(fields.get("website")||"").trim())return;
  const payload={
    author_name:String(fields.get("author_name")||"").trim(),
    deck_name:String(fields.get("deck_name")||"").trim(),
    hero_class:String(fields.get("hero_class")||"").trim(),
    deck_code:String(fields.get("deck_code")||"").trim(),
    description:String(fields.get("description")||"").trim()||null
  };
  const submitButton=form.querySelector("[type=submit]");
  if(submitButton){submitButton.disabled=true;submitButton.textContent="Envoi en cours…";}
  deckSubmitMessage="";
  try{
    const client=await loadSupabase();
    const {error}=await client.from("decks").insert(payload);
    if(error)throw error;
    deckSubmitMessage="Merci ! Ton deck a bien été envoyé. Il apparaîtra dans la bibliothèque après validation par Jordy.";
    deckSubmitMessageIsError=false;
    form.reset();
  }catch(error){
    console.error("Ouisti'Deck — envoi impossible",error);
    deckSubmitMessage="L'envoi n'a pas abouti. Vérifie ta connexion et réessaie. Si le problème persiste, préviens Jordy.";
    deckSubmitMessageIsError=true;
  }finally{
    render();
  }
});

$("#content").addEventListener("input",event=>{
  if(event.target.id==="deck-search"){
    const position=event.target.selectionStart;
    deckSearchTerm=event.target.value;
    const root=$("#content");
    const results=root.querySelector(".list");
    render();
    const next=$("#deck-search");
    if(next){next.focus();next.setSelectionRange(position,position);}
  }
});
$("#content").addEventListener("click",event=>{
  if(event.target.closest("[data-reload-decks]")){
    communityDecksLoaded=false;
    refreshCommunityDecks(true);
  }
});

render();loadConfiguration();
if(currentTab==="decks")refreshCommunityDecks();
