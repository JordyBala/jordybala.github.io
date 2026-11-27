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
  const cards=(data.schedule||[]).map(item=>`<article class="card"><div class="row"><h3>${escapeHTML(item.day||"Rendez-vous")}</h3><span class="tag">${escapeHTML(item.time||"")}</span></div><strong>${escapeHTML(item.title||"")}</strong>${item.detail?`<p class="muted">${escapeHTML(item.detail)}</p>`:""}</article>`).join("");
  return heading("Le planning de la jungle","RENDEZ-VOUS")+(cards?`<div class="list">${cards}</div>`:empty("Le prochain planning sera publié ici. Les horaires seront mis à jour par Jordy."));
}
function renderDecks(){
  const cards=(data.decks||[]).map((item,i)=>`<article class="card"><h3>${escapeHTML(item.name||`Deck ${i+1}`)}</h3>${item.note?`<div class="muted">${escapeHTML(item.note)}</div>`:""}<div class="deck-code" id="deck-${i}">${escapeHTML(item.code||"Code non renseigné")}</div>${item.code?`<button class="action" type="button" data-copy="deck-${i}">▣ Copier le code</button>`:""}${item.url?` ${linkButton(item.url,"Voir le deck ↗",true)}`:""}</article>`).join("");
  return heading("Les decks Hearthstone","LISTES & CODES")+(cards?`<div class="list">${cards}</div>`:empty("Les decks et leurs codes seront ajoutés ici. Tu pourras les copier en un clic."));
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
  const button=event.target.closest("button[data-tab]");if(!button)return;currentTab=button.dataset.tab;render();
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
render();loadConfiguration();
