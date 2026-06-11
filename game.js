const SAVE_KEY = "emberfall-idle-save-v1";
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
  { level:99, text:"Double all output" }
];

const skillData = {
  mining: {
    name: "Mining", letter: "M",
    actions: [
      { id:"copper", name:"Copper Vein", level:1, time:3000, xp:10, item:"Copper Ore", qty:1, description:"Mine useful ore from the shallow hills." },
      { id:"tin", name:"Tin Vein", level:5, time:3600, xp:16, item:"Tin Ore", qty:1, description:"Extract pale tin for bronze alloys." },
      { id:"iron", name:"Iron Deposit", level:15, time:4400, xp:28, item:"Iron Ore", qty:1, description:"Work a dense vein of sturdy iron." },
      { id:"coal", name:"Coal Seam", level:25, time:5200, xp:42, item:"Coal", qty:1, description:"Gather fuel for advanced smithing." }
    ]
  },
  woodcutting: {
    name:"Woodcutting", letter:"W",
    actions: [
      { id:"normal", name:"Common Tree", level:1, time:2800, xp:9, item:"Logs", qty:1, description:"Cut dependable timber near the trail." },
      { id:"oak", name:"Old Oak", level:8, time:3900, xp:20, item:"Oak Logs", qty:1, description:"Harvest tough, mature oak." },
      { id:"willow", name:"River Willow", level:18, time:4800, xp:34, item:"Willow Logs", qty:1, description:"Cut flexible wood from the riverbank." },
      { id:"ember", name:"Emberpine", level:30, time:6000, xp:55, item:"Emberpine Logs", qty:1, description:"Gather resinous wood warm to the touch." }
    ]
  },
  fishing: {
    name:"Fishing", letter:"F",
    actions: [
      { id:"shrimp", name:"Creek Shrimp", level:1, time:2600, xp:8, item:"Raw Shrimp", qty:1, description:"Net small shrimp in a quiet creek." },
      { id:"trout", name:"Silver Trout", level:7, time:3700, xp:19, item:"Raw Trout", qty:1, description:"Lure quick trout from clear water." },
      { id:"salmon", name:"Redfin Salmon", level:17, time:4700, xp:33, item:"Raw Salmon", qty:1, description:"Catch powerful fish in the rapids." },
      { id:"eel", name:"Ember Eel", level:28, time:5900, xp:51, item:"Raw Ember Eel", qty:1, description:"Fish the glowing pools after dusk." }
    ]
  },
  smithing: {
    name:"Smithing", letter:"S",
    actions: [
      { id:"bronze", name:"Bronze Bar", level:1, time:3400, xp:14, item:"Bronze Bar", qty:1, costs:{"Copper Ore":1,"Tin Ore":1}, description:"Smelt copper and tin into bronze." },
      { id:"dagger", name:"Bronze Dagger", level:5, time:4200, xp:25, item:"Bronze Dagger", qty:1, costs:{"Bronze Bar":2}, description:"Forge a quick, balanced weapon." },
      { id:"shield", name:"Bronze Shield", level:10, time:5100, xp:38, item:"Bronze Shield", qty:1, costs:{"Bronze Bar":4}, description:"Hammer out a sturdy round shield." },
      { id:"ironbar", name:"Iron Bar", level:15, time:4600, xp:33, item:"Iron Bar", qty:1, costs:{"Iron Ore":1,"Coal":1}, description:"Refine iron for stronger equipment." }
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

function xpForLevel(level) {
  let total = 0;
  for (let i=1;i<level;i++) total += Math.floor(i + 300 * Math.pow(2, i / 7));
  return Math.floor(total / 4);
}

function levelForXp(xp) {
  let level = 1;
  while (level < 99 && xp >= xpForLevel(level + 1)) level++;
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
  if (masteryBonus(skill,99)) quantity*=2;
  return quantity;
}
function actionXp(skill, action=getAction(skill)) { return Math.round(action.xp * (masteryBonus(skill,10) ? 1.05 : 1)); }
function upgradeCost(type, level) { return (type==="speed" ? 50 : 100) * Math.pow(2,level); }
function maxHp() { return 90 + skillLevel("hitpoints") * 10; }
function attackPower() { return 5 + skillLevel("attack") + (state.equipment.weapon === "Bronze Dagger" ? 4 : 0); }
function defencePower() { return 3 + skillLevel("defence") + (state.equipment.shield === "Bronze Shield" ? 5 : 0); }
function maxHit() { return 2 + Math.floor(skillLevel("strength") / 2) + (state.equipment.weapon === "Bronze Dagger" ? 2 : 0); }
function combatLevel() { return Math.max(1, Math.floor((skillLevel("attack")+skillLevel("strength")+skillLevel("defence")+skillLevel("hitpoints"))/4)); }
function currentZone() { return zoneData[state.currentZone]; }
function currentEnemy() { return state.fightingBoss ? currentZone().boss : currentZone().enemy; }
function enemyMaxHp() { return currentEnemy().hp; }
function bossReady(zoneIndex=state.currentZone) { return state.zoneKills[zoneIndex] >= zoneData[zoneIndex].requiredKills; }
function addItem(name, qty) { state.inventory[name] = (state.inventory[name] || 0) + qty; if (state.inventory[name] <= 0) delete state.inventory[name]; }
function hasCosts(costs={}) { return Object.entries(costs).every(([item,qty]) => (state.inventory[item]||0) >= qty); }
function payCosts(costs={}) { Object.entries(costs).forEach(([item,qty]) => addItem(item,-qty)); }
function getAction(skill=currentSkill) { return skillData[skill].actions.find(a => a.id === state.selectedActions[skill]); }

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base=defaultState();
    const skills={...base.skills,...parsed.skills};
    productionSkills.forEach(id=>skills[id]={...base.skills[id],...(parsed.skills?.[id]||{})});
    const upgrades={...base.upgrades};
    productionSkills.forEach(id=>upgrades[id]={...base.upgrades[id],...(parsed.upgrades?.[id]||{})});
    const zoneKills=base.zoneKills.map((value,index)=>parsed.zoneKills?.[index] ?? value);
    return { ...base, ...parsed, skills, upgrades, zoneKills, selectedActions:{...base.selectedActions,...parsed.selectedActions}, equipment:{...base.equipment,...parsed.equipment} };
  } catch { return defaultState(); }
}

function saveState(show=false) {
  state.lastSeen = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  document.querySelector("#save-state").textContent = "Saved just now";
  if (show) toast("Adventure saved");
}

function applyOfflineProgress() {
  const away = Math.min(Date.now() - (state.lastSeen || Date.now()), 12 * 60 * 60 * 1000);
  if (away < 60000 || !state.activeSkill) return;
  const action = getAction(state.activeSkill);
  if (!action) return;
  const duration=actionTime(state.activeSkill,action);
  const quantity=actionQuantity(state.activeSkill,action);
  const earnedXp=actionXp(state.activeSkill,action);
  let cycles = Math.floor(away / duration);
  if (action.costs) {
    cycles = Math.min(cycles, ...Object.entries(action.costs).map(([item,qty]) => Math.floor((state.inventory[item]||0)/qty)));
  }
  if (!cycles) return;
  if (action.costs) Object.entries(action.costs).forEach(([item,qty]) => addItem(item,-qty*cycles));
  addItem(action.item, quantity * cycles);
  state.skills[state.activeSkill].xp += earnedXp * cycles;
  state.skills[state.activeSkill].masteryXp += action.xp * cycles;
  document.querySelector("#offline-time").textContent = `You were away for ${formatDuration(away)}.`;
  document.querySelector("#offline-loot").innerHTML = `<div><span>${action.item}</span><strong>+${quantity*cycles}</strong></div><div><span>${skillData[state.activeSkill].name} XP</span><strong>+${earnedXp*cycles}</strong></div><div><span>Mastery XP</span><strong>+${action.xp*cycles}</strong></div>`;
  document.querySelector("#offline-modal").classList.remove("hidden");
}

function tick(now) {
  const dt = Math.min(now-lastTick,1000);
  lastTick = now;
  if (state.activeSkill) updateSkill(dt);
  if (state.combat) updateCombat(dt);
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
    addItem(action.item,actionQuantity(state.activeSkill,action));
    const before = skillLevel(state.activeSkill);
    const masteryBefore=masteryLevel(state.activeSkill);
    state.skills[state.activeSkill].xp += actionXp(state.activeSkill,action);
    state.skills[state.activeSkill].masteryXp += action.xp;
    if (skillLevel(state.activeSkill)>before) toast(`${skillData[state.activeSkill].name} reached level ${skillLevel(state.activeSkill)}`);
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
    state.skills.attack.xp += 4*hit;
    state.skills.strength.xp += 4*hit;
    popDamage("enemy",hit);
    addLog(`Rowan strikes the goblin for ${hit}.`);
    if (state.enemyHp <= 0) defeatEnemy();
  }
  if (state.enemyAttackElapsed >= enemy.attackTime && state.combat) {
    state.enemyAttackElapsed -= enemy.attackTime;
    const hit = Math.max(0, Math.floor(Math.random()*(enemy.maxHit+1)) - Math.floor(defencePower()/8));
    state.heroHp -= hit;
    state.skills.defence.xp += 3*Math.max(1,hit);
    state.skills.hitpoints.xp += hit;
    popDamage("hero",hit);
    addLog(hit ? `The goblin hits Rowan for ${hit}.` : "Rowan blocks the goblin's attack.");
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
  state.kills++; state.coins+=coinReward; addItem(enemy.item,1);
  if (!state.fightingBoss && enemy.bonusItem && Math.random()<.45) addItem(enemy.bonusItem,1);
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
  document.querySelector("#coins").textContent=state.coins.toLocaleString();
  const ids=Object.keys(state.skills);
  document.querySelector("#total-level").textContent=ids.reduce((n,id)=>n+skillLevel(id),0);
  document.querySelector("#combat-level").textContent=combatLevel();
  ["mining","woodcutting","fishing","smithing"].forEach(id=>document.querySelector(`#nav-${id}`).textContent=skillLevel(id));
  if (currentView==="inventory") renderInventory();
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
  document.querySelector("#skill-xp-text").textContent=level===99 ? "Maximum level" : `${xp-floor} / ${ceiling-floor} XP`;
  document.querySelector("#skill-xp-rate").textContent=`+${actionXp(currentSkill,action)} XP`;
  document.querySelector("#skill-xp-bar").style.width=level===99 ? "100%" : `${(xp-floor)/(ceiling-floor)*100}%`;
  document.querySelector("#mastery-level").textContent=mLevel;
  document.querySelector("#mastery-xp-rate").textContent=`+${action.xp} MXP`;
  document.querySelector("#mastery-xp-text").textContent=mLevel===99 ? "Maximum mastery" : `${mxp-mFloor} / ${mCeiling-mFloor} Mastery XP`;
  document.querySelector("#mastery-xp-bar").style.width=mLevel===99 ? "100%" : `${(mxp-mFloor)/(mCeiling-mFloor)*100}%`;
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
  document.querySelector("#used-slots").textContent=`${entries.length} / 30`;
  document.querySelector("#equipment-slots").innerHTML=Object.entries(state.equipment).map(([slot,item])=>`<div class="equipment-slot"><span>${capitalize(slot)}</span><strong>${item}</strong></div>`).join("");
  document.querySelector("#inventory-grid").innerHTML=entries.length ? entries.map(([item,qty])=>{
    const equip = item==="Bronze Dagger" ? "weapon" : item==="Bronze Shield" ? "shield" : null;
    return `<div class="inventory-item"><header><span class="item-icon">${item[0]}</span><div><h4>${item}</h4><p>${equip?"Equipment":"Material"}</p></div></header><strong>${qty}</strong>${equip?`<button class="primary-button equip-button" data-item="${item}" data-slot="${equip}">Equip</button>`:""}</div>`;
  }).join("") : `<div class="inventory-empty">Your backpack is empty. Train a skill or defeat an enemy to find items.</div>`;
  document.querySelectorAll(".equip-button").forEach(btn=>btn.onclick=()=>{
    state.equipment[btn.dataset.slot]=btn.dataset.item; addItem(btn.dataset.item,-1); toast(`${btn.dataset.item} equipped`); render();
  });
}

function renderMastery() {
  const ids=Object.keys(state.skills);
  document.querySelector("#total-xp").textContent=ids.reduce((n,id)=>n+state.skills[id].xp,0).toLocaleString();
  document.querySelector("#mastery-grid").innerHTML=ids.map(id=>{
    const level=skillLevel(id), floor=xpForLevel(level), ceiling=xpForLevel(level+1), pct=level===99?100:(state.skills[id].xp-floor)/(ceiling-floor)*100;
    return `<article class="mastery-card"><header><h3>${skillData[id]?.name||capitalize(id)}</h3><strong>${level}</strong></header><p><span>${state.skills[id].xp.toLocaleString()} total XP</span><span>${level===99?"MAX":`${Math.max(0,ceiling-state.skills[id].xp)} to level`}</span></p><div class="meter xp"><i style="width:${pct}%"></i></div></article>`;
  }).join("");
}

function toast(message) {
  const el=document.querySelector("#toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2200);
}
function capitalize(s) { return s[0].toUpperCase()+s.slice(1); }
function formatDuration(ms) { const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000); return h ? `${h}h ${m}m` : `${m} minutes`; }

const iosInstallTip=document.querySelector("#ios-install-tip");
const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone=window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (isIos && !isStandalone && !localStorage.getItem("emberfall-ios-tip-dismissed")) iosInstallTip.classList.remove("hidden");
document.querySelector("#ios-install-close").onclick=()=>{
  iosInstallTip.classList.add("hidden");
  localStorage.setItem("emberfall-ios-tip-dismissed","1");
};
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
  if (confirm("Reset all Emberfall progress? This cannot be undone.")) { localStorage.removeItem(SAVE_KEY); state=defaultState(); navigate("combat"); toast("Progress reset"); }
};
document.querySelector("#offline-close").onclick=()=>document.querySelector("#offline-modal").classList.add("hidden");
window.addEventListener("beforeunload",()=>saveState());
setInterval(()=>saveState(),15000);

state.currentZone=Math.min(state.currentZone,zoneData.length-1,state.unlockedZones-1);
state.fightingBoss=state.fightingBoss && bossReady();
state.enemyHp=Math.min(state.enemyHp,currentEnemy().hp);
state.heroHp=Math.min(state.heroHp,maxHp());
applyOfflineProgress();
render();
requestAnimationFrame(tick);
