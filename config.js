const $ = id => document.getElementById(id);
const DEFAULT_DATA = {
  lives:[{name:"Jordybala",url:"https://www.twitch.tv/jordybala",game:"Hearthstone",note:"La jungle est ouverte !"}],
  schedule:[],decks:[],king:{name:"Dodo Ier",title:"King of the Jungle",wins:"À compléter",note:"Longue vie au roi !"},
  hall:[{name:"Poulmorte Ier",record:"Ancien roi — merci pour son long règne."}],tournaments:[],
  community:{message:"Bienvenue dans la Ouisti’Team ! Retrouvez ici les informations de la communauté, les annonces et les rendez-vous de la jungle.",discord:"",twitch:"https://www.twitch.tv/jordybala",tiktok:""}
};
const VERSION="1.0.0";
function parseLines(id,mapper){return $(id).value.split("\n").map(line=>line.trim()).filter(Boolean).map(line=>mapper(line.split("|").map(part=>part.trim())))}
function setStatus(message,isError=false){const el=$("status");el.textContent=message;el.style.color=isError?"#ffb2a8":"#d7edb9";}
function fill(data){
  $("king").value=data.king?.name||"";$("wins").value=data.king?.wins||"";$("kingNote").value=data.king?.note||"";
  $("schedule").value=(data.schedule||[]).map(x=>[x.day,x.time,x.title,x.detail].join(" | ")).join("\n");
  $("lives").value=(data.lives||[]).map(x=>[x.name,x.url,x.game,x.note].join(" | ")).join("\n");
  $("decks").value=(data.decks||[]).map(x=>[x.name,x.code,x.note,x.url||""].join(" | ")).join("\n");
  $("hall").value=(data.hall||[]).map(x=>[x.name,x.record].join(" | ")).join("\n");
  $("tournaments").value=(data.tournaments||[]).map(x=>[x.name,x.date,x.detail,x.url||""].join(" | ")).join("\n");
  $("message").value=data.community?.message||"";$("discord").value=data.community?.discord||"";$("twitch").value=data.community?.twitch||"";$("tiktok").value=data.community?.tiktok||"";
}
function readCurrent(){
  return {
    king:{name:$("king").value.trim()||"Roi à désigner",title:"King of the Jungle",wins:$("wins").value.trim()||"—",note:$("kingNote").value.trim()},
    schedule:parseLines("schedule",p=>({day:p[0]||"",time:p[1]||"",title:p[2]||"",detail:p[3]||""})),
    lives:parseLines("lives",p=>({name:p[0]||"",url:p[1]||"",game:p[2]||"Hearthstone",note:p[3]||""})),
    decks:parseLines("decks",p=>({name:p[0]||"",code:p[1]||"",note:p[2]||"",url:p[3]||""})),
    hall:parseLines("hall",p=>({name:p[0]||"",record:p[1]||""})),
    tournaments:parseLines("tournaments",p=>({name:p[0]||"",date:p[1]||"",detail:p[2]||"",url:p[3]||""})),
    community:{message:$("message").value.trim(),discord:$("discord").value.trim(),twitch:$("twitch").value.trim(),tiktok:$("tiktok").value.trim()}
  };
}
function load(){
  const config=window.Twitch?.ext?.configuration;
  if(!config){fill(DEFAULT_DATA);setStatus("Ouvre cette page depuis Twitch pour enregistrer.",true);return;}
  config.onChanged(()=>{
    try{const content=config.broadcaster?.content;fill(content?{...DEFAULT_DATA,...JSON.parse(content)}:DEFAULT_DATA);setStatus(content?"Configuration actuelle chargée.":"Nouvelle configuration prête.");}
    catch(error){fill(DEFAULT_DATA);setStatus("Impossible de lire la configuration existante.",true);}
  });
}
$("save").addEventListener("click",()=>{
  try{
    const config=window.Twitch?.ext?.configuration;
    if(!config){setStatus("Ouvre cette page depuis le gestionnaire Twitch pour enregistrer.",true);return;}
    const data=readCurrent();const json=JSON.stringify(data);const bytes=new Blob([json]).size;
    if(bytes>5000){setStatus(`Trop de données (${bytes} octets). Réduis le texte ou le nombre de lignes.`,true);return;}
    config.set("broadcaster",VERSION,json);setStatus("Enregistrement envoyé à Twitch. Vérifie ensuite le panneau.");
  }catch(error){setStatus("Erreur : "+error.message,true);}
});
load();
