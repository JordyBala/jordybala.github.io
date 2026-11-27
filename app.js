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

function renderDecks(){
  const localCards=(data.decks||[]).map((item,i)=>`<article class="card"><div class="row"><h3>${escapeHTML(item.name||`Deck ${i+1}`)}</h3><span class="pill">DECK JORDY</span></div>${item.note?`<div class="muted">${escapeHTML(item.note)}</div>`:""}<div class="deck-code" id="local-deck-${i}">${escapeHTML(item.code||"Code non renseigné")}</div>${item.code?`<button class="action" type="button" data-copy="local-deck-${i}">▣ Copier le code</button>`:""}${item.url?` ${linkButton(item.url,"Voir le deck ↗",true)}`:""}</article>`).join("");
  const search=deckSearchTerm.trim().toLocaleLowerCase("fr");
  const filtered=communityDecks.filter(item=>{
    const matchesClass=deckClassFilter==="Toutes"||item.hero_class===deckClassFilter;
    const haystack=[item.deck_name,item.author_name,item.hero_class,item.description].join(" ").toLocaleLowerCase("fr");
    return matchesClass&&(!search||haystack.includes(search));
  });
  const communityCards=filtered.map((item,i)=>`<article class="card"><div class="row" style="align-items:flex-start;gap:10px;flex-wrap:wrap"><h3>${escapeHTML(item.deck_name)}</h3><span class="pill">${escapeHTML(item.hero_class)}</span></div><p class="muted" style="margin:6px 0 10px">Proposé par <strong>${escapeHTML(item.author_name)}</strong> · Format Standard</p>${item.description?`<p class="muted">${escapeHTML(item.description)}</p>`:""}<div class="deck-code" id="community-deck-${i}">${escapeHTML(item.deck_code)}</div><button class="action" type="button" data-copy="community-deck-${i}">▣ Copier le code</button></article>`).join("");
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
    `<h3 class="subheading">Les decks de la communauté</h3><article class="card"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px"><label style="display:grid;gap:5px">Filtrer par classe<select id="deck-class-filter" style="width:100%;box-sizing:border-box;padding:10px;border-radius:9px">${classOptions}</select></label><label style="display:grid;gap:5px">Rechercher<input id="deck-search" value="${escapeHTML(deckSearchTerm)}" placeholder="Nom, pseudo, description…" style="width:100%;box-sizing:border-box;padding:10px;border-radius:9px"></label></div></article>`+
    loadingNote+errorNote+(communityDecksLoading?"":communityCards?`<div class="list">${communityCards}</div>`:empty(communityDecksError?"":"Aucun deck validé pour le moment. Sois le premier à partager le tien !"));
}
function renderTournaments(){
  const cards=(data.tournaments||[]).map(item=>`<article class="card"><div class="row"><h3>${escapeHTML(item.name||"Tournoi")}</h3><span class="tag">${escapeHTML(item.date||"")}</span></div>${item.detail?`<p class="muted">${escapeHTML(item.detail)}</p>`:""}${item.url?`<p>${linkButton(item.url,"Informations / inscriptions ↗")}</p>`:""}</article>`).join("");
  return heading("Tournois & affrontements","COMPÉTITION")+(cards?`<div class="list">${cards}</div>`:empty("Les prochains Battle Royale et tournois King of the Jungle seront annoncés ici."));
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

$("#content").addEventListener("change",event=>{
  if(event.target.id==="deck-class-filter"){
    deckClassFilter=event.target.value;
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
