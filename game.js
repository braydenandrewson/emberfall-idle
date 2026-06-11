const SAVE_KEY = "emberfall-idle-save-v1";
const AUTH_KEY = "emberfall-idle-auth-v1";
const LEGACY_IMPORT_KEY = "emberfall-idle-legacy-imported";
const MAX_LEVEL = 100;
const productionSkills = ["mining","woodcutting","fishing","smithing"];
const POTION_ITEM = "Health Potion";
const POTION_COST = 25;
const POTION_HEAL = 40;
const zoneData = [
  {
    name:"Greenveil Trail", requiredKills:10,
    enemy:{name:"Greenveil Goblin", level:3, hp:32, maxHit:6, attackTime:3000, coins:[4,9], item:"Goblin Scrap", bonusItem:"Copper Ore"},
    boss:{name:"Grak the Trailbreaker", level:8, hp:115, maxHit:10, attackTime:2600, coins:[45,65], item:"Trailbreaker Crest"}
  },
  {
    name:"Ashen Quarry", requiredKills:14,
    enemy:{name:"Cinder Kobold", level:12, hp:72, maxHit:11, attackTime:2700, coins:[9,15], item:"Cinder Scale", bonusItem:"Iron Ore"},
    boss:{name:"Magmar, Quarry Tyrant", level:20, hp:260, maxHit:17, attackTime:2300, coins:[110,145], item:"Molten Core"}
  },
  {
    name:"Frostmere Pass", requiredKills:18,
    enemy:{name:"Frostbound Raider", level:24, hp:145, maxHit:17, attackTime:2400, coins:[16,25], item:"Frozen Sigil", bonusItem:"Coal"},
    boss:{name:"Skall the White Warden", level:35, hp:520, maxHit:25, attackTime:2100, coins:[230,290], item:"Warden Horn"}
  },
  {
    name:"Emberfall Citadel", requiredKills:24,
    enemy:{name:"Emberguard Knight", level:40, hp:270, maxHit:25, attackTime:2200, coins:[28,42], item:"Emberguard Seal", bonusItem:"Iron Bar"},
    boss:{name:"Vharos, the Cinder King", level:55, hp:950, maxHit:36, attackTime:1900, coins:[500,650], item:"Cinder Crown"}
  }
];
const masteryMilestones = [
  { level:10, text:"+5% skill XP" },
  { level:25, text:"+1 item per action" },
  { level:50, text:"10% faster actions" },
  { level:75, text:"+1 item per action" },
  { level:100, text:"Double all output" }
];

const equipmentData = {
  "Rusty Sword":{slot:"weapon",attack:0,maxHit:0},
  "Bronze Dagger":{slot:"weapon",attack:4,maxHit:2},
  "Wooden Shield":{slot:"shield",defence:0},
  "Leather Jerkin":{slot:"body",defence:0,maxHp:0},
  "None":{},
  "Bronze Sword":{slot:"weapon",attack:4,maxHit:2},
  "Bronze Shield":{slot:"shield",defence:5},
  "Bronze Platebody":{slot:"body",defence:7,maxHp:10},
  "Bronze Helm":{slot:"head",defence:3,maxHp:5},
  "Iron Sword":{slot:"weapon",attack:9,maxHit:4},
  "Iron Shield":{slot:"shield",defence:11},
  "Iron Platebody":{slot:"body",defence:15,maxHp:20},
  "Iron Helm":{slot:"head",defence:7,maxHp:10},
  "Steel Sword":{slot:"weapon",attack:16,maxHit:7},
  "Steel Shield":{slot:"shield",defence:19},
  "Steel Platebody":{slot:"body",defence:26,maxHp:35},
  "Steel Helm":{slot:"head",defence:12,maxHp:18},
  "Emberforged Blade":{slot:"weapon",attack:28,maxHit:12},
  "Emberforged Aegis":{slot:"shield",defence:31},
  "Emberforged Plate":{slot:"body",defence:42,maxHp:60},
  "Emberforged Crown":{slot:"head",defence:20,maxHp:30}
};

const craftingRecipes = [
  {name:"Bronze Sword",level:5,costs:{"Bronze Bar":3}},
  {name:"Bronze Shield",level:10,costs:{"Bronze Bar":4}},
  {name:"Bronze Platebody",level:15,costs:{"Bronze Bar":7}},
  {name:"Bronze Helm",level:20,costs:{"Bronze Bar":4}},
  {name:"Iron Sword",level:30,costs:{"Iron Bar":4}},
  {name:"Iron Shield",level:35,costs:{"Iron Bar":5}},
  {name:"Iron Platebody",level:40,costs:{"Iron Bar":9}},
  {name:"Iron Helm",level:45,costs:{"Iron Bar":5}},
  {name:"Steel Sword",level:55,costs:{"Steel Bar":5}},
  {name:"Steel Shield",level:60,costs:{"Steel Bar":7}},
  {name:"Steel Platebody",level:65,costs:{"Steel Bar":12}},
  {name:"Steel Helm",level:70,costs:{"Steel Bar":7}},
  {name:"Emberforged Blade",level:85,costs:{"Embersteel Bar":7,"Molten Core":1}},
  {name:"Emberforged Aegis",level:90,costs:{"Embersteel Bar":9,"Warden Horn":1}},
  {name:"Emberforged Plate",level:95,costs:{"Embersteel Bar":15,"Cinder Crown":1}},
  {name:"Emberforged Crown",level:100,costs:{"Embersteel Bar":10,"Trailbreaker Crest":1}}
];

const skillData = {
  mining: {
    name: "Mining", letter: "M",
    actions: [
      { id:"copper", name:"Copper Vein", level:1, time:3000, xp:10, item:"Copper Ore", qty:1, description:"Mine useful ore from the shallow hills." },
      { id:"tin", name:"Tin Vein", level:5, time:3600, xp:16, item:"Tin Ore", qty:1, description:"Extract pale tin for bronze alloys." },
      { id:"iron", name:"Iron Deposit", level:15, time:4400, xp:28, item:"Iron Ore", qty:1, description:"Work a dense vein of sturdy iron." },
      { id:"coal", name:"Coal Seam", level:25, time:5200, xp:42, item:"Coal", qty:1, description:"Gather fuel for advanced smithing." },
      { id:"silver", name:"Silver Lode", level:40, time:6100, xp:70, item:"Silver Ore", qty:1, description:"Extract bright ore from deep stone." },
      { id:"mithril", name:"Mithril Vein", level:55, time:7200, xp:105, item:"Mithril Ore", qty:1, description:"Mine rare blue metal from ancient rock." },
      { id:"obsidian", name:"Obsidian Shelf", level:70, time:8300, xp:150, item:"Obsidian", qty:1, description:"Break volcanic glass from heated caverns." },
      { id:"emberite", name:"Emberite Core", level:85, time:9500, xp:220, item:"Emberite Ore", qty:1, description:"Harvest ore infused with living flame." },
      { id:"star", name:"Starfall Crater", level:100, time:11000, xp:320, item:"Star Metal", qty:1, description:"Mine metal left by a fallen star." }
    ]
  },
  woodcutting: {
    name:"Woodcutting", letter:"W",
    actions: [
      { id:"normal", name:"Common Tree", level:1, time:2800, xp:9, item:"Logs", qty:1, description:"Cut dependable timber near the trail." },
      { id:"oak", name:"Old Oak", level:8, time:3900, xp:20, item:"Oak Logs", qty:1, description:"Harvest tough, mature oak." },
      { id:"willow", name:"River Willow", level:18, time:4800, xp:34, item:"Willow Logs", qty:1, description:"Cut flexible wood from the riverbank." },
      { id:"ember", name:"Emberpine", level:30, time:6000, xp:55, item:"Emberpine Logs", qty:1, description:"Gather resinous wood warm to the touch." },
      { id:"maple", name:"Red Maple", level:45, time:6900, xp:82, item:"Maple Logs", qty:1, description:"Cut dense timber favored by craftsmen." },
      { id:"yew", name:"Ancient Yew", level:60, time:7900, xp:120, item:"Yew Logs", qty:1, description:"Harvest resilient wood from old groves." },
      { id:"ash", name:"Ashen Heartwood", level:75, time:9000, xp:175, item:"Ashen Logs", qty:1, description:"Cut fire-hardened timber near the citadel." },
      { id:"world", name:"Worldroot Branch", level:90, time:10400, xp:255, item:"Worldroot Logs", qty:1, description:"Gather legendary wood pulsing with life." }
    ]
  },
  fishing: {
    name:"Fishing", letter:"F",
    actions: [
      { id:"shrimp", name:"Creek Shrimp", level:1, time:2600, xp:8, item:"Raw Shrimp", qty:1, description:"Net small shrimp in a quiet creek." },
      { id:"trout", name:"Silver Trout", level:7, time:3700, xp:19, item:"Raw Trout", qty:1, description:"Lure quick trout from clear water." },
      { id:"salmon", name:"Redfin Salmon", level:17, time:4700, xp:33, item:"Raw Salmon", qty:1, description:"Catch powerful fish in the rapids." },
      { id:"eel", name:"Ember Eel", level:28, time:5900, xp:51, item:"Raw Ember Eel", qty:1, description:"Fish the glowing pools after dusk." },
      { id:"tuna", name:"Deepwater Tuna", level:42, time:6800, xp:78, item:"Raw Tuna", qty:1, description:"Haul powerful fish from deep water." },
      { id:"swordfish", name:"Storm Swordfish", level:58, time:8000, xp:118, item:"Raw Swordfish", qty:1, description:"Catch an aggressive fish during storms." },
      { id:"ray", name:"Frostmere Ray", level:74, time:9200, xp:170, item:"Raw Frostmere Ray", qty:1, description:"Fish beneath the ice of Frostmere Pass." },
      { id:"leviathan", name:"Young Leviathan", level:92, time:10800, xp:270, item:"Leviathan Meat", qty:1, description:"Land a legendary creature from the abyss." }
    ]
  },
  smithing: {
    name:"Smithing", letter:"S",
    actions: [
      { id:"bronze", name:"Bronze Bar", level:1, time:3400, xp:14, item:"Bronze Bar", qty:1, costs:{"Copper Ore":1,"Tin Ore":1}, description:"Smelt copper and tin into bronze." },
      { id:"ironbar", name:"Iron Bar", level:15, time:4600, xp:33, item:"Iron Bar", qty:1, costs:{"Iron Ore":1,"Coal":1}, description:"Refine iron for stronger equipment." },
      { id:"steelbar", name:"Steel Bar", level:35, time:5800, xp:62, item:"Steel Bar", qty:1, costs:{"Iron Ore":2,"Coal":3}, description:"Temper iron with additional coal." },
      { id:"silverbar", name:"Silver Bar", level:45, time:6400, xp:82, item:"Silver Bar", qty:1, costs:{"Silver Ore":2,"Coal":1}, description:"Purify silver for specialist crafts." },
      { id:"mithrilbar", name:"Mithril Bar", level:60, time:7600, xp:125, item:"Mithril Bar", qty:1, costs:{"Mithril Ore":2,"Coal":4}, description:"Smelt rare mithril at intense heat." },
      { id:"obsidianbar", name:"Obsidian Alloy", level:75, time:8800, xp:180, item:"Obsidian Alloy", qty:1, costs:{"Obsidian":2,"Mithril Bar":1}, description:"Bind volcanic glass with mithril." },
      { id:"embersteel", name:"Embersteel Bar", level:85, time:10000, xp:250, item:"Embersteel Bar", qty:1, costs:{"Emberite Ore":2,"Obsidian Alloy":1,"Coal":5}, description:"Forge metal capable of holding flame." },
      { id:"starbar", name:"Starforged Bar", level:100, time:12000, xp:360, item:"Starforged Bar", qty:1, costs:{"Star Metal":2,"Embersteel Bar":1}, description:"Shape metal from beyond the sky." }
    ]
  }
};

const defaultState = () => ({
  coins:0, inventory:{}, equipment:{ weapon:"Rusty Sword", shield:"Wooden Shield", body:"Leather Jerkin", head:"None" },
  skills:{ mining:{xp:0,masteryXp:0}, woodcutting:{xp:0,masteryXp:0}, fishing:{xp:0,masteryXp:0}, smithing:{xp:0,masteryXp:0}, attack:{xp:0}, strength:{xp:0}, defence:{xp:0}, hitpoints:{xp:0} },
  upgrades:{
    mining:{speed:0,yield:0}, woodcutting:{speed:0,yield:0},
    fishing:{speed:0,yield:0}, smithing:{speed:0,yield:0}
  },
  activeSkill:null, selectedActions:{mining:"copper",woodcutting:"normal",fishing:"shrimp",smithing:"bronze"},
  actionElapsed:0, combat:false, attackElapsed:0, enemyAttackElapsed:0, heroHp:100, enemyHp:32,
  kills:0, currentZone:0, unlockedZones:1, zoneKills:[0,0,0,0], fightingBoss:false,
  log:["Select Start Combat to begin."], lastSeen:Date.now()
});

let state = loadState();
let currentView = "combat";
let currentSkill = "mining";
let lastTick = performance.now();
let authenticated = false;
let authSession = loadAuthSession();
let authMode = "signup";
let cloudSaveTimer = null;
let activeSaveKey = SAVE_KEY;
let identityUser = null;

function xpForLevel(level) {
  let total = 0;
  for (let i=1;i<level;i++) total += Math.floor(i + 300 * Math.pow(2, i / 7));
  return Math.floor(total / 4);
}

function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

function skillLevel(id) { return levelForXp(state.skills[id].xp); }
function masteryLevel(id) { return levelForXp(state.skills[id].masteryXp || 0); }
function masteryBonus(id, level) { return masteryLevel(id) >= level; }
function actionTime(skill, action=getAction(skill)) {
  const marketSpeed = state.upgrades[skill].speed * .05;
  const masterySpeed = masteryBonus(skill,50) ? .10 : 0;
  return Math.max(750, Math.round(action.time * (1-marketSpeed) * (1-masterySpeed)));
}
function actionQuantity(skill, action=getAction(skill)) {
  let quantity = action.qty + state.upgrades[skill].yield;
  if (masteryBonus(skill,25)) quantity++;
  if (masteryBonus(skill,75)) quantity++;
  if (masteryBonus(skill,100)) quantity*=2;
  return quantity;
}
function actionXp(skill, action=getAction(skill)) { return Math.round(action.xp * (masteryBonus(skill,10) ? 1.05 : 1)); }
function upgradeCost(type, level) { return (type==="speed" ? 50 : 100) * Math.pow(2,level); }
function equipmentBonus(stat) { return Object.values(state.equipment).reduce((total,item)=>total+(equipmentData[item]?.[stat]||0),0); }
function maxHp() { return 90 + skillLevel("hitpoints") * 10 + equipmentBonus("maxHp"); }
function attackPower() { return 5 + skillLevel("attack") + equipmentBonus("attack"); }
function defencePower() { return 3 + skillLevel("defence") + equipmentBonus("defence"); }
function maxHit() { return 2 + Math.floor(skillLevel("strength") / 2) + equipmentBonus("maxHit"); }
function combatLevel() { return Math.max(1, Math.floor((skillLevel("attack")+skillLevel("strength")+skillLevel("defence")+skillLevel("hitpoints"))/4)); }
function currentZone() { return zoneData[state.currentZone]; }
function currentEnemy() { return state.fightingBoss ? currentZone().boss : currentZone().enemy; }
function enemyMaxHp() { return currentEnemy().hp; }
function bossReady(zoneIndex=state.currentZone) { return state.zoneKills[zoneIndex] >= zoneData[zoneIndex].requiredKills; }
function addItem(name, qty, track=false) {
  state.inventory[name] = (state.inventory[name] || 0) + qty;
  if (state.inventory[name] <= 0) delete state.inventory[name];
  if (track && qty>0) activity(`+${qty} ${name}`,"item");
}
function hasCosts(costs={}) { return Object.entries(costs).every(([item,qty]) => (state.inventory[item]||0) >= qty); }
function payCosts(costs={}) { Object.entries(costs).forEach(([item,qty]) => addItem(item,-qty)); }
function getAction(skill=currentSkill) {
  const action=skillData[skill].actions.find(a=>a.id===state.selectedActions[skill]);
  if (action) return action;
  state.selectedActions[skill]=skillData[skill].actions[0].id;
  return skillData[skill].actions[0];
}

function loadState(key=activeSaveKey) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch { return defaultState(); }
}

function normalizeState(parsed={}) {
  const base=defaultState();
  const skills={...base.skills,...parsed.skills};
  Object.keys(base.skills).forEach(id=>skills[id]={...base.skills[id],...(parsed.skills?.[id]||{})});
  const upgrades={...base.upgrades};
  productionSkills.forEach(id=>upgrades[id]={...base.upgrades[id],...(parsed.upgrades?.[id]||{})});
  const zoneKills=base.zoneKills.map((value,index)=>parsed.zoneKills?.[index] ?? value);
  return { ...base, ...parsed, skills, upgrades, zoneKills, selectedActions:{...base.selectedActions,...parsed.selectedActions}, equipment:{...base.equipment,...parsed.equipment} };
}

function saveState(show=false, immediateCloud=false) {
  state.lastSeen = Date.now();
  localStorage.setItem(activeSaveKey, JSON.stringify(state));
  document.querySelector("#save-state").textContent = authenticated ? "Saving to cloud" : "Local cache";
  if (authenticated) {
    clearTimeout(cloudSaveTimer);
    if (immediateCloud) saveCloudState(show);
    else cloudSaveTimer=setTimeout(()=>saveCloudState(show),500);
  }
  if (show) toast("Adventure saved");
}

function applyOfflineProgress(elapsed=Date.now()-(state.lastSeen||Date.now())) {
  const away = Math.max(0,Math.min(elapsed,12*60*60*1000));
  state.lastSeen=Date.now();
  if (away < 1000 || !state.activeSkill) return false;
  const action = getAction(state.activeSkill);
  if (!action) return false;
  const duration=actionTime(state.activeSkill,action);
  const quantity=actionQuantity(state.activeSkill,action);
  const earnedXp=actionXp(state.activeSkill,action);
  let cycles = Math.floor(away / duration);
  if (action.costs) {
    cycles = Math.min(cycles, ...Object.entries(action.costs).map(([item,qty]) => Math.floor((state.inventory[item]||0)/qty)));
  }
  if (!cycles) return false;
  if (action.costs) Object.entries(action.costs).forEach(([item,qty]) => addItem(item,-qty*cycles));
  addItem(action.item, quantity * cycles);
  state.skills[state.activeSkill].xp += earnedXp * cycles;
  state.skills[state.activeSkill].masteryXp += action.xp * cycles;
  document.querySelector("#offline-time").textContent = `You were away for ${formatDuration(away)}.`;
  document.querySelector("#offline-loot").innerHTML = `<div><span>${action.item}</span><strong>+${quantity*cycles}</strong></div><div><span>${skillData[state.activeSkill].name} XP</span><strong>+${earnedXp*cycles}</strong></div><div><span>Mastery XP</span><strong>+${action.xp*cycles}</strong></div>`;
  document.querySelector("#offline-modal").classList.remove("hidden");
  return true;
}

function tick(now) {
  const dt = Math.min(now-lastTick,1000);
  lastTick = now;
  if (authenticated && !document.hidden && state.activeSkill) updateSkill(dt);
  if (authenticated && !document.hidden && state.combat) updateCombat(dt);
  renderLive();
  requestAnimationFrame(tick);
}

function updateSkill(dt) {
  const action = getAction(state.activeSkill);
  if (!action) return;
  const duration=actionTime(state.activeSkill,action);
  state.actionElapsed += dt;
  while (state.actionElapsed >= duration) {
    if (!hasCosts(action.costs)) {
      state.activeSkill = null;
      state.actionElapsed = 0;
      toast("You need more materials");
      break;
    }
    state.actionElapsed -= duration;
    payCosts(action.costs);
    const quantity=actionQuantity(state.activeSkill,action);
    addItem(action.item,quantity,true);
    const before = skillLevel(state.activeSkill);
    const masteryBefore=masteryLevel(state.activeSkill);
    state.skills[state.activeSkill].xp += actionXp(state.activeSkill,action);
    state.skills[state.activeSkill].masteryXp += action.xp;
    if (skillLevel(state.activeSkill)>before) {
      const level=skillLevel(state.activeSkill);
      toast(`${skillData[state.activeSkill].name} reached level ${level}`);
      activity(`${skillData[state.activeSkill].name} level ${level}`,"level");
      renderProgressSummary();
      renderSkill();
    }
    const masteryAfter=masteryLevel(state.activeSkill);
    const milestone=masteryMilestones.find(item=>item.level>masteryBefore && item.level<=masteryAfter);
    if (milestone) toast(`${skillData[state.activeSkill].name} mastery ${milestone.level}: ${milestone.text}`);
    if (currentView===state.activeSkill) milestone ? renderSkill() : renderSkillProgress();
  }
}

function updateCombat(dt) {
  const enemy=currentEnemy();
  state.attackElapsed += dt;
  state.enemyAttackElapsed += dt;
  if (state.attackElapsed >= 2400) {
    state.attackElapsed -= 2400;
    const hit = Math.max(1, Math.floor(Math.random()*(maxHit()+1)));
    state.enemyHp -= hit;
    grantCombatXp("attack",4*hit);
    grantCombatXp("strength",4*hit);
    popDamage("enemy",hit);
    addLog(`Rowan strikes ${enemy.name} for ${hit}.`);
    if (state.enemyHp <= 0) defeatEnemy();
  }
  if (state.enemyAttackElapsed >= enemy.attackTime && state.combat) {
    state.enemyAttackElapsed -= enemy.attackTime;
    const hit = Math.max(0, Math.floor(Math.random()*(enemy.maxHit+1)) - Math.floor(defencePower()/8));
    state.heroHp -= hit;
    grantCombatXp("defence",3*Math.max(1,hit));
    grantCombatXp("hitpoints",hit);
    popDamage("hero",hit);
    addLog(hit ? `${enemy.name} hits Rowan for ${hit}.` : `Rowan blocks ${enemy.name}'s attack.`);
    if (state.heroHp <= 0) {
      const loss=Math.min(state.coins,5*(state.currentZone+1));
      state.combat=false; state.heroHp=maxHp(); state.enemyHp=enemyMaxHp(); state.coins-=loss;
      addLog(`Rowan retreats and loses ${loss} coins.`);
      toast("Defeated - Rowan recovered");
    }
  }
}

function defeatEnemy() {
  const enemy=currentEnemy();
  const coinReward=enemy.coins[0]+Math.floor(Math.random()*(enemy.coins[1]-enemy.coins[0]+1));
  state.kills++; state.coins+=coinReward; activity(`+${coinReward} coins`,"coins"); addItem(enemy.item,1,true);
  if (!state.fightingBoss && enemy.bonusItem && Math.random()<.45) addItem(enemy.bonusItem,1,true);
  if (state.fightingBoss) {
    const defeatedZone=state.currentZone;
    addLog(`${enemy.name} defeated! Rowan earns ${coinReward} coins.`);
    if (defeatedZone+1<zoneData.length && state.unlockedZones<defeatedZone+2) {
      state.unlockedZones=defeatedZone+2;
      toast(`${zoneData[defeatedZone+1].name} unlocked`);
    } else if (defeatedZone===zoneData.length-1) {
      toast("The Cinder King has fallen");
    }
    state.fightingBoss=false;
  } else {
    state.zoneKills[state.currentZone]++;
    addLog(`${enemy.name} defeated. Hunt progress: ${state.zoneKills[state.currentZone]}/${currentZone().requiredKills}.`);
    if (state.zoneKills[state.currentZone]===currentZone().requiredKills) toast(`${currentZone().boss.name} revealed`);
  }
  state.enemyHp=currentEnemy().hp; state.attackElapsed=0; state.enemyAttackElapsed=0;
  renderCombatSetup();
}

function addLog(message) {
  state.log.unshift(message);
  state.log=state.log.slice(0,8);
  document.querySelector("#combat-log").innerHTML=state.log.map(x=>`<p>${x}</p>`).join("");
}

function popDamage(target,amount) {
  const stage=document.querySelector(`#${target}-image`).parentElement;
  const number=document.querySelector(`#${target}-damage`);
  number.textContent=amount ? `-${amount}` : "Block";
  stage.classList.remove("hit"); number.classList.remove("pop");
  void stage.offsetWidth; stage.classList.add("hit"); number.classList.add("pop");
}

function navigate(view) {
  currentView=view;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(v=>v.classList.toggle("active",v.dataset.view===view));
  if (skillData[view]) {
    currentSkill=view;
    document.querySelector("#view-skill").classList.add("active");
    renderSkill();
  } else {
    document.querySelector(`#view-${view}`).classList.add("active");
  }
  render();
}

function render() {
  renderProgressSummary();
  if (currentView==="inventory") renderInventory();
  if (currentView==="crafting") renderCrafting();
  if (currentView==="marketplace") renderMarketplace();
  if (currentView==="mastery") renderMastery();
  if (skillData[currentView]) renderSkill();
  renderCombatSetup();
  renderLive();
}

function renderLive() {
  const enemy=currentEnemy(), enemyHpMax=enemy.hp;
  const hp=Math.max(0,state.heroHp), ehp=Math.max(0,state.enemyHp);
  document.querySelector("#coins").textContent=state.coins.toLocaleString();
  renderProgressSummary();
  document.querySelector("#hero-level").textContent=combatLevel();
  document.querySelector("#hero-hp-text").textContent=`${Math.ceil(hp)} / ${maxHp()}`;
  document.querySelector("#hero-hp-bar").style.width=`${Math.min(100,hp/maxHp()*100)}%`;
  document.querySelector("#enemy-hp-text").textContent=`${Math.ceil(ehp)} / ${enemyHpMax}`;
  document.querySelector("#enemy-hp-bar").style.width=`${Math.max(0,ehp)/enemyHpMax*100}%`;
  document.querySelector("#attack-stat").textContent=attackPower();
  document.querySelector("#defence-stat").textContent=defencePower();
  document.querySelector("#maxhit-stat").textContent=maxHit();
  document.querySelector("#attack-timer-bar").style.width=`${state.attackElapsed/2400*100}%`;
  document.querySelector("#attack-timer-text").textContent=`${Math.max(0,(2400-state.attackElapsed)/1000).toFixed(1)}s`;
  document.querySelector("#combat-toggle").textContent=state.combat ? "Retreat" : "Start Combat";
  document.querySelector("#battle-status").textContent=state.combat ? "Battle in progress" : "Ready to fight";
  document.querySelector(".battle-status").classList.toggle("running",state.combat);
  document.querySelector("#potion-count").textContent=state.inventory[POTION_ITEM]||0;
  document.querySelector("#use-potion").disabled=!(state.inventory[POTION_ITEM]>0) || state.heroHp>=maxHp();
  if (skillData[currentSkill]) {
    const action=getAction();
    const duration=actionTime(currentSkill,action);
    document.querySelector("#skill-timer-bar").style.width=`${state.activeSkill===currentSkill ? state.actionElapsed/duration*100 : 0}%`;
    document.querySelector("#skill-timer-text").textContent=`${((duration-(state.activeSkill===currentSkill?state.actionElapsed:0))/1000).toFixed(1)}s`;
    document.querySelector("#active-skill-label").textContent=state.activeSkill ? `Training ${skillData[state.activeSkill].name}` : "Not training";
    document.querySelector("#skill-toggle").textContent=state.activeSkill===currentSkill ? "Stop Training" : "Begin";
  }
}

function renderCombatSetup() {
  const zone=currentZone(), enemy=currentEnemy();
  document.querySelector("#zone-number").textContent=`Zone ${state.currentZone+1}`;
  document.querySelector("#zone-name").textContent=zone.name;
  document.querySelector("#enemy-rank").textContent=state.fightingBoss ? "Zone boss" : "Common enemy";
  document.querySelector("#enemy-name").textContent=enemy.name;
  document.querySelector("#enemy-level").textContent=enemy.level;
  document.querySelector("#enemy-image").alt=enemy.name;
  document.querySelector("#enemy-image").dataset.zone=state.currentZone;
  document.querySelector(".enemy-card").classList.toggle("boss-active",state.fightingBoss);
  document.querySelector("#enemy-loot").innerHTML=[
    `<b>${enemy.coins[0]}-${enemy.coins[1]} coins</b>`,
    `<b>${enemy.item}</b>`,
    !state.fightingBoss && enemy.bonusItem ? `<b>${enemy.bonusItem}</b>` : ""
  ].join("");
  const ready=bossReady();
  document.querySelector("#boss-toggle").disabled=!ready;
  document.querySelector("#boss-toggle").textContent=state.fightingBoss ? "Hunt Regular Enemy" : ready ? "Challenge Boss" : "Boss Locked";
  document.querySelector("#hunt-progress").textContent=ready
    ? `${zone.boss.name} is ready to challenge.`
    : `Defeat ${zone.requiredKills-state.zoneKills[state.currentZone]} more enemies to reveal the boss.`;
  document.querySelector("#zone-list").innerHTML=zoneData.map((item,index)=>{
    const locked=index>=state.unlockedZones;
    const cleared=index+1<state.unlockedZones || (index===zoneData.length-1 && state.inventory[item.boss.item]);
    return `<button class="zone-card ${index===state.currentZone?"selected":""} ${locked?"locked":""}" data-zone="${index}" ${locked?"disabled":""}>
      <span>Zone ${index+1}</span><strong>${item.name}</strong><small>${cleared?"Boss defeated":locked?"Locked":`${state.zoneKills[index]}/${item.requiredKills} hunted`}</small>
    </button>`;
  }).join("");
  document.querySelectorAll(".zone-card:not(.locked)").forEach(button=>button.onclick=()=>selectZone(Number(button.dataset.zone)));
}

function selectZone(index) {
  if (index>=state.unlockedZones || index===state.currentZone) return;
  state.combat=false; state.currentZone=index; state.fightingBoss=false;
  state.enemyHp=currentEnemy().hp; state.attackElapsed=0; state.enemyAttackElapsed=0;
  addLog(`Rowan travels to ${currentZone().name}.`);
  render();
}

function renderSkill() {
  const data=skillData[currentSkill], action=getAction(), level=skillLevel(currentSkill);
  document.querySelector("#skill-title").textContent=data.name;
  document.querySelector("#action-monogram").textContent=data.letter;
  document.querySelector("#action-name").textContent=action.name;
  document.querySelector("#action-description").textContent=action.description;
  renderSkillProgress();
  document.querySelector("#action-list").innerHTML=data.actions.map(a=>{
    const locked=level<a.level;
    const costs=a.costs ? Object.entries(a.costs).map(([i,q])=>`${q} ${i}`).join(" + ") : `Produces ${actionQuantity(currentSkill,a)} ${a.item}`;
    return `<button class="action-card ${a.id===action.id?"selected":""} ${locked?"locked":""}" data-action="${a.id}" ${locked?"disabled":""}><span class="action-icon">${data.letter}</span><span><h4>${a.name}</h4><p>${locked?`Unlocks at level ${a.level}`:costs}</p></span><strong>${(actionTime(currentSkill,a)/1000).toFixed(1)}s</strong></button>`;
  }).join("");
  document.querySelector("#milestone-list").innerHTML=masteryMilestones.map(item=>`<div class="milestone ${masteryLevel(currentSkill)>=item.level?"unlocked":""}"><strong>${item.level}</strong><span>${item.text}</span></div>`).join("");
  document.querySelectorAll(".action-card:not(.locked)").forEach(btn=>btn.onclick=()=>{
    state.selectedActions[currentSkill]=btn.dataset.action; state.actionElapsed=0; renderSkill();
  });
}

function renderSkillProgress() {
  const action=getAction(), level=skillLevel(currentSkill), xp=state.skills[currentSkill].xp;
  const floor=xpForLevel(level), ceiling=xpForLevel(level+1);
  const mLevel=masteryLevel(currentSkill), mxp=state.skills[currentSkill].masteryXp || 0;
  const mFloor=xpForLevel(mLevel), mCeiling=xpForLevel(mLevel+1);
  document.querySelector("#skill-level").textContent=level;
  document.querySelector("#skill-xp-text").textContent=level===MAX_LEVEL ? "Maximum level" : `${xp-floor} / ${ceiling-floor} XP`;
  document.querySelector("#skill-xp-rate").textContent=`+${actionXp(currentSkill,action)} XP`;
  document.querySelector("#skill-xp-bar").style.width=level===MAX_LEVEL ? "100%" : `${(xp-floor)/(ceiling-floor)*100}%`;
  document.querySelector("#mastery-level").textContent=mLevel;
  document.querySelector("#mastery-xp-rate").textContent=`+${action.xp} MXP`;
  document.querySelector("#mastery-xp-text").textContent=mLevel===MAX_LEVEL ? "Maximum mastery" : `${mxp-mFloor} / ${mCeiling-mFloor} Mastery XP`;
  document.querySelector("#mastery-xp-bar").style.width=mLevel===MAX_LEVEL ? "100%" : `${(mxp-mFloor)/(mCeiling-mFloor)*100}%`;
}

function renderProgressSummary() {
  const ids=Object.keys(state.skills);
  document.querySelector("#total-level").textContent=ids.reduce((total,id)=>total+skillLevel(id),0);
  document.querySelector("#combat-level").textContent=combatLevel();
  productionSkills.forEach(id=>document.querySelector(`#nav-${id}`).textContent=skillLevel(id));
}

function renderMarketplace() {
  document.querySelector("#market-coins").textContent=state.coins.toLocaleString();
  document.querySelector("#market-potions").textContent=state.inventory[POTION_ITEM]||0;
  document.querySelector("#buy-potion").disabled=state.coins<POTION_COST;
  document.querySelector("#market-grid").innerHTML=productionSkills.map(id=>{
    const upgrades=state.upgrades[id];
    const speedMax=upgrades.speed>=10, yieldMax=upgrades.yield>=5;
    const speedCost=upgradeCost("speed",upgrades.speed), yieldCost=upgradeCost("yield",upgrades.yield);
    return `<article class="market-card">
      <header><h3>${skillData[id].name}</h3><strong>${skillData[id].letter}</strong></header>
      <div class="upgrade-row"><div><h4>Honed Tools - ${upgrades.speed}/10</h4><p>5% faster actions per rank. Current bonus: ${upgrades.speed*5}%.</p></div><button class="primary-button market-buy" data-skill="${id}" data-type="speed" ${speedMax||state.coins<speedCost?"disabled":""}>${speedMax?"MAX":`${speedCost} coins`}</button></div>
      <div class="upgrade-row"><div><h4>Expanded Kit - ${upgrades.yield}/5</h4><p>Gain +1 item from every completed action per rank.</p></div><button class="primary-button market-buy" data-skill="${id}" data-type="yield" ${yieldMax||state.coins<yieldCost?"disabled":""}>${yieldMax?"MAX":`${yieldCost} coins`}</button></div>
    </article>`;
  }).join("");
  document.querySelectorAll(".market-buy").forEach(button=>button.onclick=()=>{
    const {skill,type}=button.dataset, level=state.upgrades[skill][type], cost=upgradeCost(type,level);
    if (state.coins<cost) return toast("Not enough coins");
    state.coins-=cost; state.upgrades[skill][type]++;
    toast(`${skillData[skill].name} ${type} upgraded`);
    saveState(); render();
  });
}

function renderInventory() {
  const entries=Object.entries(state.inventory).filter(([,q])=>q>0);
  document.querySelector("#used-slots").textContent=`${entries.length} / 60`;
  document.querySelector("#equipment-slots").innerHTML=Object.entries(state.equipment).map(([slot,item])=>{
    const stats=equipmentStatsText(item);
    return `<div class="equipment-slot"><span>${capitalize(slot)}</span><div><strong>${item}</strong>${stats?`<small>${stats}</small>`:""}</div></div>`;
  }).join("");
  document.querySelector("#inventory-grid").innerHTML=entries.length ? entries.map(([item,qty])=>{
    const equip=equipmentData[item]?.slot;
    return `<div class="inventory-item"><header><span class="item-icon">${item[0]}</span><div><h4>${item}</h4><p>${equip?equipmentStatsText(item):"Material"}</p></div></header><strong>${qty}</strong>${equip?`<button class="primary-button equip-button" data-item="${item}" data-slot="${equip}">Equip</button>`:""}</div>`;
  }).join("") : `<div class="inventory-empty">Your backpack is empty. Train a skill or defeat an enemy to find items.</div>`;
  document.querySelectorAll(".equip-button").forEach(btn=>btn.onclick=()=>{
    const previous=state.equipment[btn.dataset.slot];
    state.equipment[btn.dataset.slot]=btn.dataset.item;
    addItem(btn.dataset.item,-1);
    if (previous && previous!=="None" && !["Rusty Sword","Wooden Shield","Leather Jerkin"].includes(previous)) addItem(previous,1);
    state.heroHp=Math.min(state.heroHp,maxHp());
    toast(`${btn.dataset.item} equipped`); render();
  });
}

function renderCrafting() {
  const level=skillLevel("smithing");
  document.querySelector("#crafting-level").textContent=level;
  document.querySelector("#crafting-grid").innerHTML=craftingRecipes.map(recipe=>{
    const locked=level<recipe.level;
    const affordable=hasCosts(recipe.costs);
    const item=equipmentData[recipe.name];
    const costs=Object.entries(recipe.costs).map(([name,qty])=>`${qty} ${name} (${state.inventory[name]||0})`).join(" + ");
    return `<article class="recipe-card ${locked?"locked":""}">
      <header><div><span>${capitalize(item.slot)}</span><h3>${recipe.name}</h3></div><strong>Lv. ${recipe.level}</strong></header>
      <p class="recipe-stats">${equipmentStatsText(recipe.name)}</p>
      <p class="recipe-cost">${locked?`Requires Smithing level ${recipe.level}`:costs}</p>
      <button class="primary-button craft-button" data-recipe="${recipe.name}" ${locked||!affordable?"disabled":""}>Craft Gear</button>
    </article>`;
  }).join("");
  document.querySelectorAll(".craft-button").forEach(button=>button.onclick=()=>craftGear(button.dataset.recipe));
}

function craftGear(name) {
  const recipe=craftingRecipes.find(item=>item.name===name);
  if (!recipe || skillLevel("smithing")<recipe.level || !hasCosts(recipe.costs)) return;
  const before=skillLevel("smithing");
  payCosts(recipe.costs); addItem(recipe.name,1,true);
  state.skills.smithing.xp+=Math.round(recipe.level*8);
  const after=skillLevel("smithing");
  if (after>before) {
    activity(`Smithing level ${after}`,"level");
    toast(`Smithing reached level ${after}`);
  }
  activity(`Crafted ${recipe.name}`,"craft");
  toast(`${recipe.name} crafted`);
  render();
}

function equipmentStatsText(name) {
  const item=equipmentData[name]||{};
  return [["attack","ATK"],["defence","DEF"],["maxHit","Max Hit"],["maxHp","HP"]]
    .filter(([stat])=>item[stat])
    .map(([stat,label])=>`+${item[stat]} ${label}`)
    .join(" / ");
}

function renderMastery() {
  const ids=Object.keys(state.skills);
  document.querySelector("#total-xp").textContent=ids.reduce((n,id)=>n+state.skills[id].xp,0).toLocaleString();
  document.querySelector("#mastery-grid").innerHTML=ids.map(id=>{
    const level=skillLevel(id), floor=xpForLevel(level), ceiling=xpForLevel(level+1), pct=level===MAX_LEVEL?100:(state.skills[id].xp-floor)/(ceiling-floor)*100;
    return `<article class="mastery-card"><header><h3>${skillData[id]?.name||capitalize(id)}</h3><strong>${level}</strong></header><p><span>${state.skills[id].xp.toLocaleString()} total XP</span><span>${level===MAX_LEVEL?"MAX":`${Math.max(0,ceiling-state.skills[id].xp)} to level`}</span></p><div class="meter xp"><i style="width:${pct}%"></i></div></article>`;
  }).join("");
}

function grantCombatXp(id,amount) {
  const before=skillLevel(id);
  state.skills[id].xp+=amount;
  const after=skillLevel(id);
  if (after>before) {
    activity(`${capitalize(id)} level ${after}`,"level");
    toast(`${capitalize(id)} reached level ${after}`);
  }
}

function activity(message,type="item") {
  const feed=document.querySelector("#activity-feed");
  const entry=document.createElement("div");
  entry.className=`activity-entry ${type}`;
  entry.textContent=message;
  feed.prepend(entry);
  while (feed.children.length>5) feed.lastElementChild.remove();
  setTimeout(()=>entry.classList.add("visible"),10);
  setTimeout(()=>{ entry.classList.remove("visible"); setTimeout(()=>entry.remove(),250); },3500);
}

function toast(message) {
  const el=document.querySelector("#toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2200);
}
function capitalize(s) { return s[0].toUpperCase()+s.slice(1); }
function formatDuration(ms) {
  const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function loadAuthSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
  catch { return null; }
}

async function identityRequest(path,options={}) {
  const response=await fetch(`/.netlify/identity${path}`,options);
  const data=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.msg||data.error_description||data.error||"Account request failed");
  return data;
}

async function login(email,password) {
  const body=new URLSearchParams({grant_type:"password",username:email,password});
  const session=await identityRequest("/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  authSession=session;
  localStorage.setItem(AUTH_KEY,JSON.stringify(session));
  await startAuthenticatedGame();
}

async function signup(email,password) {
  await identityRequest("/signup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});
  setAuthMode("login");
  throw new Error("Account created. Confirm your email, then log in.");
}

async function validAccessToken() {
  if (!authSession?.access_token) return null;
  try {
    identityUser=await identityRequest("/user",{headers:{authorization:`Bearer ${authSession.access_token}`}});
    return authSession.access_token;
  } catch {
    if (!authSession.refresh_token) return null;
    try {
      const body=new URLSearchParams({grant_type:"refresh_token",refresh_token:authSession.refresh_token});
      authSession=await identityRequest("/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
      localStorage.setItem(AUTH_KEY,JSON.stringify(authSession));
      identityUser=await identityRequest("/user",{headers:{authorization:`Bearer ${authSession.access_token}`}});
      return authSession.access_token;
    } catch { return null; }
  }
}

async function cloudRequest(method,save) {
  const token=await validAccessToken();
  if (!token) throw new Error("Your session expired. Please log in again.");
  const response=await fetch("/.netlify/functions/save",{
    method,
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
    body:save?JSON.stringify({save}):undefined
  });
  const data=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error||"Cloud save failed");
  return data;
}

async function saveCloudState(show=false) {
  try {
    await cloudRequest("PUT",state);
    document.querySelector("#save-state").textContent="Saved to cloud";
    if (show) toast("Cloud save complete");
  } catch (error) {
    document.querySelector("#save-state").textContent="Cloud save pending";
    if (show) toast(error.message);
  }
}

async function startAuthenticatedGame() {
  const token=await validAccessToken();
  if (!token) return showAuth();
  const userId=identityUser?.id||identityUser?.sub;
  if (!userId) throw new Error("Unable to identify this account.");
  const userSaveKey=`${SAVE_KEY}:${userId}`;
  const hasUserLocal=Boolean(localStorage.getItem(userSaveKey));
  const canImportLegacy=!localStorage.getItem(LEGACY_IMPORT_KEY) && Boolean(localStorage.getItem(SAVE_KEY));
  activeSaveKey=userSaveKey;
  const local=hasUserLocal ? loadState(userSaveKey) : canImportLegacy ? loadState(SAVE_KEY) : defaultState();
  const result=await cloudRequest("GET");
  const cloud=result.save?normalizeState(result.save):null;
  state=cloud && (!hasUserLocal || (cloud.lastSeen||0)>(local.lastSeen||0)) ? cloud : local;
  if (canImportLegacy) localStorage.setItem(LEGACY_IMPORT_KEY,userId);
  authenticated=true;
  document.querySelector("#auth-modal").classList.add("hidden");
  document.querySelector("#account-button").textContent="Log out";
  const elapsed=Date.now()-(state.lastSeen||Date.now());
  applyOfflineProgress(elapsed);
  state.lastSeen=Date.now();
  render();
  await saveCloudState();
}

function showAuth(message="") {
  authenticated=false;
  document.querySelector("#auth-modal").classList.remove("hidden");
  document.querySelector("#auth-error").textContent=message;
  setAuthMode(authMode);
}

function setAuthMode(mode) {
  authMode=mode;
  const signupMode=mode==="signup";
  document.querySelector("#auth-title").textContent=signupMode?"Create your account":"Welcome back";
  document.querySelector("#auth-copy").textContent=signupMode
    ?"Your progress will be saved securely and available on your other devices."
    :"Log in to continue your saved adventure.";
  document.querySelector("#auth-submit").textContent=signupMode?"Create Account":"Log In";
  document.querySelector("#auth-switch").textContent=signupMode?"Already have an account? Log in":"Need an account? Sign up";
  document.querySelector("#auth-password").autocomplete=signupMode?"new-password":"current-password";
}

async function logout() {
  state.lastSeen=Date.now();
  localStorage.setItem(activeSaveKey,JSON.stringify(state));
  try { await saveCloudState(); } catch {}
  authSession=null; authenticated=false;
  identityUser=null; activeSaveKey=SAVE_KEY;
  localStorage.removeItem(AUTH_KEY);
  showAuth("You have been logged out.");
  document.querySelector("#account-button").textContent="Account";
}

const iosInstallTip=document.querySelector("#ios-install-tip");
const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone=window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (isIos && !isStandalone && !localStorage.getItem("emberfall-ios-tip-dismissed")) iosInstallTip.classList.remove("hidden");
document.querySelector("#ios-install-close").onclick=()=>{
  iosInstallTip.classList.add("hidden");
  localStorage.setItem("emberfall-ios-tip-dismissed","1");
};
document.querySelector("#auth-switch").onclick=()=>{
  document.querySelector("#auth-error").textContent="";
  setAuthMode(authMode==="signup"?"login":"signup");
};
document.querySelector("#auth-form").onsubmit=async event=>{
  event.preventDefault();
  const email=document.querySelector("#auth-email").value.trim();
  const password=document.querySelector("#auth-password").value;
  const button=document.querySelector("#auth-submit");
  document.querySelector("#auth-error").textContent="";
  button.disabled=true; button.textContent=authMode==="signup"?"Creating...":"Logging in...";
  try {
    if (authMode==="signup") await signup(email,password);
    else await login(email,password);
  } catch (error) {
    document.querySelector("#auth-error").textContent=error.message;
  } finally {
    button.disabled=false;
    setAuthMode(authMode);
  }
};
document.querySelector("#account-button").onclick=()=>authenticated?logout():showAuth();
document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>navigate(btn.dataset.view));
document.querySelector("#combat-toggle").onclick=()=>{
  state.combat=!state.combat; state.activeSkill=null;
  addLog(state.combat?`Rowan engages ${currentEnemy().name}.`:"Rowan retreats from combat.");
  render();
};
document.querySelector("#boss-toggle").onclick=()=>{
  if (!bossReady()) return;
  state.combat=false; state.fightingBoss=!state.fightingBoss; state.enemyHp=currentEnemy().hp;
  state.attackElapsed=0; state.enemyAttackElapsed=0;
  addLog(state.fightingBoss?`${currentZone().boss.name} enters the battlefield.`:`Rowan returns to hunting ${currentZone().enemy.name}.`);
  render();
};
document.querySelector("#use-potion").onclick=()=>{
  if (!(state.inventory[POTION_ITEM]>0) || state.heroHp>=maxHp()) return;
  addItem(POTION_ITEM,-1);
  const healed=Math.min(POTION_HEAL,maxHp()-state.heroHp);
  state.heroHp+=healed; addLog(`Rowan drinks a health potion and restores ${healed} health.`); toast(`Restored ${healed} health`); render();
};
document.querySelector("#buy-potion").onclick=()=>{
  if (state.coins<POTION_COST) return toast("Not enough coins");
  state.coins-=POTION_COST; addItem(POTION_ITEM,1); toast("Health potion purchased"); saveState(); render();
};
document.querySelector("#skill-toggle").onclick=()=>{
  if (state.activeSkill===currentSkill) { state.activeSkill=null; state.actionElapsed=0; }
  else { state.combat=false; state.activeSkill=currentSkill; state.actionElapsed=0; }
  render();
};
document.querySelector("#save-button").onclick=()=>saveState(true);
document.querySelector("#reset-button").onclick=()=>{
  if (confirm("Reset all Emberfall progress? This cannot be undone.")) {
    state=defaultState(); state.lastSeen=Date.now();
    localStorage.setItem(activeSaveKey,JSON.stringify(state));
    saveState(false,true); navigate("combat"); toast("Progress reset");
  }
};
document.querySelector("#offline-close").onclick=()=>{
  document.querySelector("#offline-modal").classList.add("hidden");
  saveState(false,true);
};
document.addEventListener("visibilitychange",()=>{
  if (!authenticated) return;
  if (document.hidden) {
    saveState(false,true);
  } else {
    const elapsed=Date.now()-(state.lastSeen||Date.now());
    applyOfflineProgress(elapsed);
    state.lastSeen=Date.now();
    saveState(false,true);
    lastTick=performance.now();
    render();
  }
});
window.addEventListener("pagehide",()=>{ if(authenticated) saveState(false,true); });
setInterval(()=>{ if(authenticated) saveState(); },15000);

state.currentZone=Math.min(state.currentZone,zoneData.length-1,state.unlockedZones-1);
state.fightingBoss=state.fightingBoss && bossReady();
state.enemyHp=Math.min(state.enemyHp,currentEnemy().hp);
state.heroHp=Math.min(state.heroHp,maxHp());
render();
requestAnimationFrame(tick);
startAuthenticatedGame().catch(error=>showAuth(error.message));
