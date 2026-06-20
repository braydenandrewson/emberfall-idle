const SAVE_KEY = "emberfall-idle-save-v1";
const SAVE_BACKUP_KEY = "emberfall-idle-save-v1-backup";
const RECOVERY_APPLIED_KEY = "emberfall-idle-recovery-20260613";
const AUTH_KEY = "emberfall-idle-auth-v1";
const MAX_LEVEL = 100;
const MASTERY_XP_MULTIPLIER = 5;
const AUTO_EAT_THRESHOLD = .35;
const MAX_THREAT = 5;
const MAX_OFFLINE_HOURS = 12;
const MAX_PRODUCTION_QUEUE = 12;
const productionSkills = ["mining","woodcutting","fishing","cartography","smithing","cooking","alchemy","huntsmanship"];
const upgradeCaps = {speed:10,yield:3,mastery:3};
const yieldUpgradeRequirements = [20,45,70];
const STARTER_CONTRACT_THRESHOLD = {kills:3,mining:5,contracts:1};
const POTION_ITEM = "Health Potion";
const POTION_COST = 25;
const POTION_HEAL = 40;
// Procedural Emberfall score synthesized in-browser.
const Music = (() => {
  let ctx=null, master=null, reverb=null, padFilter=null, timer=null, started=false;
  let barIndex=0, nextBarTime=0, motifStep=0;
  const BPM=78, beat=60/BPM, bar=beat*4;
  const SCALE=[0,1,3,5,7,8,10];
  const ZONE_ROOTS=[38,41,37,40,43,45,42,46];
  const THEMES=[
    [0,2,1,0,-1,0,3,2],
    [0,3,4,2,1,-1,0,2],
    [4,2,0,-1,0,1,3,1],
    [0,1,4,3,1,0,-2,0]
  ];
  const EXPLORE_CHORDS=[
    [0,2,4],[1,3,5],[-2,0,3],[-1,1,4]
  ];
  const COMBAT_CHORDS=[
    [0,3,4],[-1,1,4],[-3,0,2],[-1,2,5]
  ];
  const midiFreq=midi=>440*Math.pow(2,(midi-69)/12);
  function rootMidi() {
    const zone=Math.max(0,Math.min(ZONE_ROOTS.length-1,Number(state?.currentZone)||0));
    return ZONE_ROOTS[zone];
  }
  function degree(root,step,octave=0) {
    const wrapped=((step%SCALE.length)+SCALE.length)%SCALE.length;
    const oct=Math.floor(step/SCALE.length)+octave;
    return root+SCALE[wrapped]+oct*12;
  }
  function ensure() {
    if (ctx) return ctx;
    try { ctx=new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ return (ctx=null); }
    master=ctx.createGain(); master.gain.value=0;
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-18; comp.knee.value=24; comp.ratio.value=5; comp.attack.value=.01; comp.release.value=.28;
    master.connect(comp).connect(ctx.destination);
    padFilter=ctx.createBiquadFilter(); padFilter.type="lowpass"; padFilter.frequency.value=1050; padFilter.Q.value=.7; padFilter.connect(master);
    const len=Math.floor(ctx.sampleRate*3.4), buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for (let ch=0;ch<2;ch++){ const d=buf.getChannelData(ch); for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.9); }
    reverb=ctx.createConvolver(); reverb.buffer=buf;
    const wet=ctx.createGain(); wet.gain.value=.62; reverb.connect(wet).connect(master);
    Music._reverb=reverb; Music._wet=wet;
    return ctx;
  }
  function tone(f,time,dur,{type="triangle",gain=.1,attack=.02,detune=0,bus=master,verb=.35,bend=1}={}) {
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.value=f; if (detune) o.detune.value=detune;
    if (bend!==1) o.frequency.exponentialRampToValueAtTime(Math.max(24,f*bend),time+dur);
    g.gain.setValueAtTime(.0001,time);
    g.gain.linearRampToValueAtTime(gain,time+attack);
    g.gain.exponentialRampToValueAtTime(.0001,time+dur);
    o.connect(g); g.connect(bus); if (verb&&reverb) g.connect(reverb);
    o.start(time); o.stop(time+dur+.05);
  }
  function voice(midi,time,dur,opts={}) { tone(midiFreq(midi),time,dur,opts); }
  function noise(time,dur,{gain=.1,filter=900,verb=.25}={}) {
    const len=Math.floor(ctx.sampleRate*dur), buf=ctx.createBuffer(1,len,ctx.sampleRate), data=buf.getChannelData(0);
    for (let i=0;i<len;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.4);
    const src=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain();
    src.buffer=buf; f.type="lowpass"; f.frequency.value=filter; f.Q.value=.9;
    g.gain.setValueAtTime(gain,time); g.gain.exponentialRampToValueAtTime(.0001,time+dur);
    src.connect(f).connect(g).connect(master); if (verb&&reverb) g.connect(reverb);
    src.start(time); src.stop(time+dur+.02);
  }
  function frameDrum(time,gain=.1) {
    tone(96,time,.18,{type:"sine",gain,bend:.42,attack:.004,verb:.18});
    noise(time+.004,.16,{gain:gain*.65,filter:420,verb:.28});
  }
  function bell(midi,time,gain=.05) {
    voice(midi,time,1.9,{type:"sine",gain,attack:.006,verb:.8});
    voice(midi+12,time+.006,1.35,{type:"triangle",gain:gain*.45,attack:.004,verb:.8});
    voice(midi+19,time+.012,.8,{type:"sine",gain:gain*.2,attack:.004,verb:.85});
  }
  function pluck(midi,time,gain=.04) {
    voice(midi,time,.72,{type:"triangle",gain,attack:.004,verb:.45});
    voice(midi+12,time+.004,.34,{type:"square",gain:gain*.28,attack:.002,verb:.35});
  }
  function scheduleDrones(root,chord,time,intensity,combat) {
    padFilter.frequency.setTargetAtTime(combat?1700:980,time,.5);
    chord.forEach((d,i)=>{
      const midi=degree(root,d,2);
      voice(midi,time,bar*1.7,{type:"sawtooth",gain:.023*intensity,attack:.8,detune:-8+i*2,bus:padFilter,verb:.58});
      voice(midi,time,bar*1.7,{type:"sawtooth",gain:.022*intensity,attack:.8,detune:7-i*2,bus:padFilter,verb:.58});
    });
    voice(degree(root,0,0),time,bar*1.95,{type:"sine",gain:.13*intensity,attack:.05,verb:.18});
    voice(degree(root,4,0),time+beat*2,beat*1.8,{type:"triangle",gain:.055*intensity,attack:.04,verb:.22});
  }
  function scheduleRhythm(time,intensity,combat,over) {
    frameDrum(time+.015,.075*intensity);
    if (combat || over) frameDrum(time+beat*2+.015,.06*intensity);
    if (combat) {
      [1,1.5,3].forEach(pos=>noise(time+beat*pos,.055,{gain:.033*intensity,filter:2200,verb:.22}));
    } else if (barIndex%2===0) {
      noise(time+beat*3.5,.12,{gain:.022*intensity,filter:1500,verb:.5});
    }
  }
  function scheduleOstinato(root,time,intensity,combat) {
    const pattern=combat ? [0,4,3,4,1,4,-1,3] : [0,4,1,4,-1,3,1,3];
    pattern.forEach((d,i)=>{
      if (!combat && i%2 && Math.random()<.35) return;
      pluck(degree(root,d,2),time+i*(beat/2),.026*intensity);
    });
  }
  function scheduleMotif(root,time,intensity,combat) {
    const zone=Math.max(0,Math.min(ZONE_ROOTS.length-1,Number(state?.currentZone)||0));
    const theme=THEMES[zone%THEMES.length];
    const phrase=Math.floor(barIndex/4)%4;
    const density=combat ? 4 : 2;
    for (let i=0;i<density;i++) {
      const step=theme[(motifStep+i+phrase)%theme.length];
      const t=time+beat*(i+.35)+(combat && i%2 ? beat*.25 : 0);
      if (!combat && Math.random()<.25) continue;
      bell(degree(root,step,3),t,.032*intensity);
    }
    motifStep=(motifStep+density)%theme.length;
  }
  function scheduleAir(time,intensity,combat) {
    if (barIndex%4===0) noise(time+.2,bar*.9,{gain:(combat ? .026 : .018)*intensity,filter:680,verb:.9});
    if (Math.random()<.33) bell(degree(rootMidi(),combat?8:6,3),time+beat*(1+Math.random()*2),.018*intensity);
  }
  function scheduleBar(index,time) {
    const combat=Boolean(state?.combat);
    const intensity=combat ? 1.16 : .86;
    const root=rootMidi();
    const chord=(combat ? COMBAT_CHORDS : EXPLORE_CHORDS)[(index+Math.floor((state?.currentZone||0)/2))%4];
    scheduleDrones(root,chord,time,intensity,combat);
    scheduleRhythm(time,intensity,combat,false);
    scheduleOstinato(root,time,intensity,combat);
    scheduleMotif(root,time,intensity,combat);
    scheduleAir(time,intensity,combat);
  }
  function tick() {
    if (!ctx) return;
    while (nextBarTime < ctx.currentTime+.25){ scheduleBar(barIndex++,nextBarTime); nextBarTime+=bar; }
  }
  function vol() { return Math.max(0,Math.min(1,(state?.settings?.musicVolume??35)/100)); }
  return {
    enabled(){ return typeof state==="undefined" || state?.settings?.music!==false; },
    start(){
      if (!this.enabled()) return;
      const ac=ensure(); if (!ac) return;
      if (ac.state==="suspended") ac.resume();
      if (!started){ started=true; nextBarTime=ac.currentTime+.15; timer=setInterval(tick,60); }
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.linearRampToValueAtTime(vol(),ac.currentTime+1.5);
    },
    stop(){
      if (!ctx||!master) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0,ctx.currentTime+.6);
      clearInterval(timer); timer=null; started=false;
    },
    setVolume(){ if (ctx&&master&&started) master.gain.linearRampToValueAtTime(vol(),ctx.currentTime+.2); },
    bossStinger(){
      if (!this.enabled()) return;
      const ac=ensure(); if (!ac) return;
      if (ac.state==="suspended") ac.resume();
      const t=ac.currentTime+.02, root=rootMidi(), run=[0,2,4,7,8,7,4,9,8,7,4,0];
      run.forEach((d,i)=>{
        const when=t+i*.075;
        pluck(degree(root,d,3),when,.065);
        if (i%2===0) bell(degree(root,d,3),when+.012,.036);
      });
      [0,.23,.46,.69].forEach((offset,i)=>frameDrum(t+offset,.14-i*.018));
      voice(degree(root,0,1),t,.95,{type:"sawtooth",gain:.12,attack:.01,verb:.5});
      voice(degree(root,4,1),t+.78,1.2,{type:"sine",gain:.13,attack:.03,verb:.4});
      noise(t+.05,.2,{gain:.16,filter:720,verb:.45});
      noise(t+.8,.55,{gain:.12,filter:2100,verb:.75});
    }
  };
})();
const combatStyles = {
  balanced:{name:"Balanced",description:"Steady strikes train all three melee disciplines together.",attackSpeed:1,maxHit:1,damageTaken:.95,accuracy:1,crit:0,primary:"attack",xp:{attack:1.3,strength:1.3,defence:1.3,hitpoints:.4}},
  accurate:{name:"Accurate",description:"Measured attacks land more often and focus on Attack.",attackSpeed:.92,maxHit:.92,damageTaken:1,accuracy:1.18,crit:.03,primary:"attack",xp:{attack:4,hitpoints:.4}},
  aggressive:{name:"Aggressive",description:"Heavy swings hit harder and rapidly train Strength.",attackSpeed:1.08,maxHit:1.2,damageTaken:1.08,accuracy:.94,crit:.07,primary:"strength",xp:{strength:4,hitpoints:.4}},
  guarded:{name:"Guarded",description:"A shield-first stance reduces damage and trains Defence.",attackSpeed:1.12,maxHit:.88,damageTaken:.72,accuracy:.96,crit:0,dodge:.06,primary:"defence",xp:{defence:4,hitpoints:.4}},
  duelist:{name:"Duelist",description:"Fast technical attacks train Attack and Defence together.",attackSpeed:.8,maxHit:.78,damageTaken:.9,accuracy:1.1,crit:.05,dodge:.08,primary:"attack",xp:{attack:2.2,defence:2.2,hitpoints:.4}},
  reaver:{name:"Reaver",description:"Risky critical strikes train Strength and restore a little health.",attackSpeed:1.15,maxHit:1.15,damageTaken:1.18,accuracy:.9,crit:.14,lifesteal:.08,primary:"strength",xp:{attack:1,strength:3,hitpoints:.4}}
};
const enemyTraits = {
  "Greenveil Goblin":{name:"Scavenger",description:"Carries 10% more coins.",lootBonus:.1},
  "Briar Fang":{name:"Skittish",description:"12% harder to hit.",evasion:.12},
  "Mossback Brute":{name:"Barkhide",description:"Reduces each hit by 1 damage.",armor:1},
  "Grak the Trailbreaker":{name:"Trail Rage",description:"Deals 25% more damage below 35% health.",enrage:.25},
  "Cinder Kobold":{name:"Ember Bite",description:"Has a 10% chance to deal a heavy strike.",crit:.1},
  "Ashclaw Miner":{name:"Sundering Claws",description:"Ignores 25% of your Defence.",ignoreDefence:.25},
  "Basalt Mauler":{name:"Stonehide",description:"Reduces each hit by 2 damage.",armor:2},
  "Magmar, Quarry Tyrant":{name:"Molten Fury",description:"Deals 40% more damage below 35% health.",enrage:.4},
  "Frostbound Raider":{name:"Chilling Blows",description:"Hits delay your next attack.",slow:300},
  "Rimeblade Scout":{name:"Ice Dancer",description:"15% harder to hit and more likely to strike hard.",evasion:.15,crit:.08},
  "Glacier Warden":{name:"Glacial Plate",description:"Reduces each hit by 3 damage.",armor:3},
  "Skall the White Warden":{name:"Permafrost",description:"Armored hits strongly delay your next attack.",armor:2,slow:500},
  "Emberguard Knight":{name:"Citadel Armor",description:"Reduces each hit by 4 damage.",armor:4},
  "Cinderblade Duelist":{name:"Royal Riposte",description:"Evasive with an 18% heavy-strike chance.",evasion:.08,crit:.18},
  "Furnace Sentinel":{name:"Living Furnace",description:"Deals 15% more damage and resists 4 damage per hit.",armor:4,damage:1.15},
  "Vharos, the Cinder King":{name:"Cinder Sovereign",description:"Enrages at low health and heals from damage dealt.",enrage:.5,lifesteal:.2},
  "Mirestalker Lizard":{name:"Venom Hunter",description:"Fast attacks ignore 15% of Defence.",ignoreDefence:.15},
  "Bog Hexer":{name:"Withering Curse",description:"Curses reduce healing received by 20%.",healingReduction:.2},
  "Rotwood Colossus":{name:"Fungal Bulwark",description:"Reduces each hit by 6 damage.",armor:6},
  "Velka, the Marsh Mother":{name:"Brood Matriarch",description:"Heals from damage and enrages below 35% health.",lifesteal:.18,enrage:.45},
  "Dune Jackal":{name:"Pack Frenzy",description:"Has a 16% chance to land a heavy strike.",crit:.16},
  "Glassblade Nomad":{name:"Mirage Step",description:"18% harder to hit.",evasion:.18},
  "Sunstone Golem":{name:"Solar Carapace",description:"Reduces each hit by 8 damage.",armor:8},
  "Azhar, the Sand Crown":{name:"Noonday Wrath",description:"Deals 25% more damage and enrages at low health.",damage:1.25,enrage:.5},
  "Stormwing Harrier":{name:"Gale Dive",description:"Evasive attacks delay your next strike.",evasion:.12,slow:500},
  "Thunderbound Raider":{name:"Chain Lightning",description:"Heavy strikes occur 20% of the time.",crit:.2},
  "Cloudforge Automaton":{name:"Charged Plating",description:"Reduces each hit by 10 damage.",armor:10},
  "Vael, the Storm Herald":{name:"Tempest Dominion",description:"Fast, armored attacks deal 30% more damage.",armor:6,damage:1.3,slow:650},
  "Voidling Ravager":{name:"Phase Claws",description:"Ignores 35% of Defence and is difficult to hit.",ignoreDefence:.35,evasion:.15},
  "Starborn Seer":{name:"Fate Distortion",description:"Highly evasive with dangerous critical strikes.",evasion:.22,crit:.2},
  "Astral Colossus":{name:"Eventide Shell",description:"Reduces each hit by 13 damage.",armor:13},
  "Nyxara, the World-Eater":{name:"Cosmic Hunger",description:"Drains health, enrages, and deals 40% more damage.",lifesteal:.25,enrage:.6,damage:1.4}
};
const combatEventData = {
  weakPoint:{name:"Exposed Weak Point",description:"Your next landed hit deals 35% more damage.",duration:4500,playerDamage:1.35,consumeOnPlayerHit:true},
  guarded:{name:"Enemy Guarded",description:"Enemy takes 25% less damage until its next attack.",duration:4200,playerDamage:.75,consumeOnEnemyAttack:true},
  ambush:{name:"Incoming Ambush",description:"The next enemy hit deals 35% more damage.",duration:3800,enemyDamage:1.35,consumeOnEnemyAttack:true},
  rally:{name:"Adrenaline Rally",description:"Defeat the enemy during this window for extra coins and materials.",duration:8000,killCoins:.2,bonusMaterial:1,consumeOnKill:true}
};
const rarityData = {
  common:{name:"Common",color:"#aab4aa",multiplier:1,affixes:0,weight:60},
  uncommon:{name:"Uncommon",color:"#73c77a",multiplier:1.08,affixes:1,weight:25},
  rare:{name:"Rare",color:"#6ea8e8",multiplier:1.18,affixes:2,weight:10},
  epic:{name:"Epic",color:"#bc82e5",multiplier:1.32,affixes:3,weight:4},
  legendary:{name:"Legendary",color:"#efb85e",multiplier:1.5,affixes:4,weight:1}
};
const affixData = {
  attack:{name:"Keen",stat:"attack",range:[1,5]},
  defence:{name:"Stalwart",stat:"defence",range:[2,7]},
  maxHit:{name:"Brutal",stat:"maxHit",range:[1,3]},
  maxHp:{name:"Vital",stat:"maxHp",range:[6,24]},
  crit:{name:"Precise",stat:"crit",range:[.01,.04]},
  dodge:{name:"Elusive",stat:"dodge",range:[.01,.04]}
};
const townProjectData = {
  forge:{name:"Cinder Forge",description:"+2% equipment stats per level.",max:10,baseCost:{"Copper Ore":100,"Bronze Bar":10}},
  storehouse:{name:"Guild Storehouse",description:"+2% chance for bonus skill output per level.",max:10,baseCost:{"Logs":100,"Tin Ore":75}},
  hall:{name:"Adventurers Hall",description:"+5% contract coins and material rewards per level.",max:10,baseCost:{"Goblin Scrap":50,"Bronze Bar":8}},
  shrine:{name:"Wayfarer Shrine",description:"+1% all skill and combat XP per level.",max:10,baseCost:{"Silver Ore":10,"Cinder Scale":10}}
};
const townBranchData = {
  forge:{
    arms:{name:"Weapons Wing",description:"+2% combat damage per Forge level."},
    armor:{name:"Armor Wing",description:"+2% Defence per Forge level."}
  },
  storehouse:{
    gathering:{name:"Gatherers Depot",description:"+1% bonus gathering output per level."},
    industry:{name:"Industrial Yard",description:"+1% processing speed per level."}
  },
  hall:{
    hunters:{name:"Hunters Lodge",description:"+2% combat loot chance per level."},
    artisans:{name:"Artisans Guild",description:"+1 crafting rarity luck per level."}
  },
  shrine:{
    training:{name:"Training Circle",description:"+1% additional mastery and expertise XP per level."},
    quartermaster:{name:"Quartermaster Rite",description:"+2% additional contract material rewards per level."}
  }
};
const relicPowerData = {
  "Trailbreaker Crest":{name:"Trailblazer Instinct",description:"+5% coins from combat.",stat:"combatCoins"},
  "Molten Core":{name:"Quarry Fire",description:"+5% Smithing speed.",stat:"smithingSpeed"},
  "Warden Horn":{name:"Winter Resolve",description:"+10% healing received.",stat:"healing"},
  "Cinder Crown":{name:"Royal Ember",description:"+5% combat damage.",stat:"combatDamage"},
  "Mireheart Pearl":{name:"Mireproof Blood",description:"Halves poison damage.",stat:"poisonGuard"},
  "Solar Core":{name:"Sunscar Fortune",description:"+5% equipment drop chance at high Threat.",stat:"gearFind"},
  "Tempest Heart":{name:"Storm Rhythm",description:"+5% attack speed.",stat:"attackSpeed"},
  "Worldscar Fragment":{name:"Astral Memory",description:"+10% all skill XP.",stat:"skillXp"}
};
const blueprintData = {
  "Guild Armory Blueprint":{
    name:"Guild Armory Blueprint",
    description:"Teaches the Guildmaster Blade and Guildmaster Ward recipes.",
    recipes:["Guildmaster Blade","Guildmaster Ward"]
  }
};
const rotatingMerchantData = [
  {id:"reforge",name:"Reforge Token",item:"Reforge Token",qty:1,cost:180,description:"Reroll every affix on one piece of equipment."},
  {id:"essence",name:"Forge Essence Bundle",item:"Forge Essence",qty:5,cost:125,description:"Used to improve and reforge salvaged equipment."},
  {id:"food",name:"Field Ration Crate",item:"Field Stew",qty:8,cost:80,description:"A compact supply of automatic combat healing."},
  {id:"focus",name:"Artisan Focus",item:"Artisan Focus",qty:1,cost:140,description:"Boost skill XP for ten minutes."},
  {id:"prospector",name:"Prospector Draught",item:"Prospector Draught",qty:1,cost:190,description:"Adds gathering output for ten minutes."},
  {id:"silver",name:"Silver Shipment",item:"Silver Ore",qty:20,cost:240,description:"A targeted shipment for advanced forging."},
  {id:"coal",name:"Coal Shipment",item:"Coal",qty:40,cost:180,description:"Fuel for sustained metal production."},
  {id:"battle",name:"Battle Tonic",item:"Battle Tonic",qty:1,cost:120,description:"Increases Max Hit for ten minutes."}
  ,{id:"blueprint",name:"Guild Armory Blueprint",item:"Guild Armory Blueprint",qty:1,cost:650,description:"Unlocks two permanent Steel-tier equipment recipes."}
];
const starterQuestData = [
  {
    id:"mine-copper",name:"Strike Copper",type:"item",target:"Copper Ore",goal:10,
    description:"Mine 10 Copper Ore to start your first forge route.",
    reward:makeReward(75,{"Tin Ore":4,"Health Potion":2})
  },
  {
    id:"mine-tin",name:"Find Tin",type:"item",target:"Tin Ore",goal:10,
    description:"Mine 10 Tin Ore so Bronze Bars are ready to smelt.",
    reward:makeReward(100,{"Copper Ore":4,"Logs":4})
  },
  {
    id:"smelt-bronze",name:"First Bronze",type:"item",target:"Bronze Bar",goal:5,
    description:"Smelt 5 Bronze Bars. Extra-output upgrades never increase this recipe cost.",
    reward:makeReward(150,{"Wooden Grip":1,"Shield Frame":1,"Armor Lining":1})
  },
  {
    id:"craft-helm",name:"Cover Your Head",type:"crafts",target:"Bronze Helm",goal:1,
    description:"Craft a Bronze Helm to learn the equipment forge loop.",
    reward:{coins:200,items:{"Field Stew":4},gear:["Bronze Dagger"]}
  },
  {
    id:"kill-goblins",name:"Clear the Trail",type:"enemyKills",target:"Greenveil Goblin",goal:3,
    description:"Defeat 3 Greenveil Goblins and claim your first combat payout.",
    reward:makeReward(300,{"Goblin Scrap":8,"Health Potion":4,"Battle Tonic":1})
  }
];
const generalAchievementTracks = [
  {
    id:"actions",name:"Guild Labor",description:"Complete productive skill actions across every trade.",
    type:"actions",icon:"assets/skills/mining-v2.png",
    bonusText:"Each tier: +0.5% production speed.",bonuses:[{key:"skillSpeed",amount:.005}],
    tiers:[
      {id:"actions100",goal:100,name:"Working Hands",coins:250,supplies:15},
      {id:"actions1000",goal:1000,name:"Relentless Artisan",coins:1500,supplies:30},
      {goal:10000,name:"Guild Workhorse",coins:7500,supplies:50},
      {goal:50000,name:"Master of Routine",coins:30000,supplies:75},
      {goal:250000,name:"Industry Incarnate",coins:100000,supplies:110},
      {goal:1000000,name:"A Million Motions",coins:350000,supplies:175}
    ]
  },
  {
    id:"kills",name:"Battle Record",description:"Defeat enemies in any combat zone.",
    type:"kills",icon:"assets/skills/combat-v2.png",
    bonusText:"Each tier: +1% coins from combat.",bonuses:[{key:"combatCoins",amount:.01}],
    tiers:[
      {id:"kills100",goal:100,name:"Trail Veteran",coins:500,supplies:20},
      {id:"kills1000",goal:1000,name:"Cinder Champion",coins:4000,supplies:50},
      {goal:5000,name:"Frontier Reaper",coins:15000,supplies:75},
      {goal:25000,name:"Warbound",coins:60000,supplies:110},
      {goal:100000,name:"Living Legend",coins:220000,supplies:175},
      {goal:500000,name:"Endless Vanguard",coins:800000,supplies:275}
    ]
  },
  {
    id:"crafts",name:"Guild Armorer",description:"Craft equipment at the guild forge.",
    type:"crafts",icon:"assets/navigation/crafting-v2.png",
    bonusText:"Each tier: +1 crafting rarity luck.",bonuses:[{key:"craftLuck",amount:1}],
    tiers:[
      {id:"craft25",goal:25,name:"Forged Purpose",coins:750,supplies:20},
      {goal:100,name:"Reliable Smith",coins:3000,supplies:40},
      {goal:500,name:"Armory Keeper",coins:12000,supplies:70},
      {goal:2500,name:"Master Forgewright",coins:50000,supplies:110},
      {goal:10000,name:"Architect of Steel",coins:180000,supplies:175}
    ]
  },
  {
    id:"contracts",name:"Guild Standing",description:"Complete rotating guild contracts.",
    type:"contracts",icon:"assets/navigation/adventure-v2.png",
    bonusText:"Each tier: +1% contract rewards.",bonuses:[{key:"contractRewards",amount:.01}],
    tiers:[
      {id:"contracts10",goal:10,name:"Guild Regular",coins:1000,supplies:30},
      {goal:50,name:"Trusted Agent",coins:5000,supplies:55},
      {goal:200,name:"Guild Envoy",coins:20000,supplies:90},
      {goal:750,name:"High Commissioner",coins:75000,supplies:140},
      {goal:2500,name:"Voice of Emberfall",coins:250000,supplies:220}
    ]
  },
  {
    id:"mastery",name:"Focused Practice",description:"Raise the highest Action Expertise level.",
    type:"bestActionMastery",icon:"assets/navigation/mastery-v2.png",
    bonusText:"Each tier: +2% mastery and expertise XP.",bonuses:[{key:"masteryXp",amount:.02}],
    tiers:[
      {goal:10,name:"Promising Technique",coins:300,supplies:15},
      {id:"mastery25",goal:25,name:"Focused Practice",coins:750,supplies:25},
      {goal:35,name:"Practiced Hand",coins:3000,supplies:45},
      {goal:45,name:"Near Perfection",coins:10000,supplies:75},
      {goal:50,name:"Perfected Motion",coins:30000,supplies:120}
    ]
  },
  {
    id:"rareGear",name:"Relic Hunter",description:"Obtain Rare, Epic, or Legendary equipment.",
    type:"rareGear",icon:"assets/navigation/inventory-v2.png",
    bonusText:"Each tier: +0.15% equipment drop chance.",bonuses:[{key:"gearChance",amount:.0015}],
    tiers:[
      {id:"rareGear",goal:1,name:"A Worthy Find",coins:500,supplies:20},
      {goal:10,name:"Blue Steel",coins:3500,supplies:40},
      {goal:50,name:"Vault Curator",coins:15000,supplies:70},
      {goal:250,name:"Epic Arsenal",coins:65000,supplies:120},
      {goal:1000,name:"Legendbound",coins:250000,supplies:200}
    ]
  },
  {
    id:"town",name:"Settlement Legacy",description:"Purchase township project levels.",
    type:"townLevels",icon:"assets/navigation/adventure-v2.png",
    bonusText:"Each tier: -1% township resource costs.",bonuses:[{key:"townDiscount",amount:.01}],
    tiers:[
      {goal:5,name:"First Foundations",coins:600,supplies:20},
      {id:"town10",goal:10,name:"Settlement Builder",coins:1500,supplies:30},
      {goal:20,name:"Guild Borough",coins:6000,supplies:55},
      {goal:30,name:"Emberfall Rising",coins:18000,supplies:85},
      {goal:40,name:"City of Cinders",coins:50000,supplies:140}
    ]
  },
  {
    id:"salvage",name:"Forge Reclaimer",description:"Salvage unwanted equipment into forge materials.",
    type:"salvaged",icon:"assets/navigation/crafting-v2.png",
    bonusText:"Each tier: +1 crafting rarity luck.",bonuses:[{key:"craftLuck",amount:1}],
    tiers:[
      {goal:1,name:"First Reclamation",coins:250,supplies:10},
      {id:"salvage10",goal:10,name:"Scrap Savant",coins:1000,supplies:25},
      {goal:50,name:"Essence Handler",coins:5000,supplies:50},
      {goal:200,name:"Vault Reforger",coins:20000,supplies:85},
      {goal:1000,name:"Master Reclaimer",coins:85000,supplies:150}
    ]
  },
  {
    id:"totalLevel",name:"Path of Many Talents",description:"Raise the combined level of every skill.",
    type:"totalLevel",icon:"assets/navigation/mastery-v2.png",
    bonusText:"Each tier: +1% all skill and combat XP.",bonuses:[{key:"allXp",amount:.01}],
    tiers:[
      {goal:100,name:"Versatile Adventurer",coins:1000,supplies:25},
      {goal:250,name:"Seasoned Generalist",coins:6000,supplies:50},
      {goal:500,name:"Guild Polymath",coins:25000,supplies:90},
      {goal:750,name:"Master of Many Paths",coins:80000,supplies:140},
      {goal:1000,name:"Emberfall Paragon",coins:300000,supplies:250}
    ]
  },
  {
    id:"bosses",name:"Tyrant Breaker",description:"Defeat zone bosses, including repeat challenges.",
    type:"bosses",icon:"assets/skills/combat-v2.png",
    bonusText:"Each tier: +2% coins from bosses.",bonuses:[{key:"bossCoins",amount:.02}],
    tiers:[
      {goal:1,name:"Boss Breaker",coins:500,supplies:20},
      {goal:10,name:"Tyrant Hunter",coins:4000,supplies:45},
      {goal:50,name:"Crown Collector",coins:18000,supplies:80},
      {goal:250,name:"Bane of Legends",coins:75000,supplies:135},
      {goal:1000,name:"Throne Ender",coins:300000,supplies:225}
    ]
  }
];
let achievementTracks = [];
let achievementData = [];
const itemData = {
  "Health Potion":{icon:"potion",category:"Consumable",description:"A restorative guild draught.",use:"Drink to restore 40 health.",value:12,consume:{heal:40}},
  "Field Stew":{icon:"stew",category:"Food",description:"A hot meal of creek shrimp and woodland herbs.",use:"Eat to restore 25 health.",value:8,consume:{heal:25}},
  "Trout Skewer":{icon:"fish",category:"Food",description:"Oak-smoked trout with a crisp finish.",use:"Restore 45 health and gain 3% Dodge for 10 minutes.",value:18,consume:{heal:45,buff:"trailmeal",duration:600000}},
  "Salmon Roast":{icon:"fish",category:"Food",description:"A rich roast favored by trail wardens.",use:"Restore 70 health and gain 5 Defence for 10 minutes.",value:34,consume:{heal:70,buff:"wardenmeal",duration:600000}},
  "Ember Eel Broth":{icon:"stew",category:"Food",description:"A warming broth that carries a gentle inner flame.",use:"Restore 100 health and attack 5% faster for 10 minutes.",value:55,consume:{heal:100,buff:"embermeal",duration:600000}},
  "Tuna Steak":{icon:"fish",category:"Food",description:"Dense deepwater meat seared over maple coals.",use:"Restore 135 health and gain 8% combat XP for 10 minutes.",value:85,consume:{heal:135,buff:"tunameal",duration:600000}},
  "Stormfish Feast":{icon:"stew",category:"Food",description:"A celebratory meal prepared from a dangerous catch.",use:"Restore 180 health and gain 5% Crit for 10 minutes.",value:130,consume:{heal:180,buff:"stormmeal",duration:600000}},
  "Frostmere Supper":{icon:"stew",category:"Food",description:"A nourishing ray dish served steaming hot.",use:"Restore 240 health and reduce environmental damage for 10 minutes.",value:190,consume:{heal:240,buff:"frostmeal",duration:600000}},
  "Leviathan Banquet":{icon:"stew",category:"Food",description:"A legendary meal with enough vigor for any expedition.",use:"Fully restore health and gain 10% combat power for 10 minutes.",value:300,consume:{fullHeal:true,buff:"leviathanmeal",duration:600000}},
  "Battle Tonic":{icon:"tonic",category:"Tonic",description:"Cinder scale suspended in an aggressive red tincture.",use:"Drink for +3 Max Hit for 10 minutes.",value:45,consume:{buff:"battle",duration:600000}},
  "Artisan Focus":{icon:"tonic",category:"Tonic",description:"A clear sigil infusion that sharpens practiced motion.",use:"Drink for +15% skill XP for 10 minutes.",value:65,consume:{buff:"artisan",duration:600000}},
  "Prospector Draught":{icon:"tonic",category:"Tonic",description:"Mineral-rich extract that reveals productive seams.",use:"Drink for +1 gathering output for 10 minutes.",value:90,consume:{buff:"prospector",duration:600000}},
  "Ironbark Elixir":{icon:"tonic",category:"Tonic",description:"A dense woodland extract that hardens the skin.",use:"Gain 8 Defence for 10 minutes.",value:28,consume:{buff:"ironbark",duration:600000}},
  "Swiftwater Serum":{icon:"tonic",category:"Tonic",description:"A bright serum that keeps practiced work moving.",use:"Gain 10% production speed for 10 minutes.",value:38,consume:{buff:"swiftwater",duration:600000}},
  "Venom Oil":{icon:"tonic",category:"Tonic",description:"A carefully stabilized offensive coating.",use:"Gain 8% combat damage for 10 minutes.",value:60,consume:{buff:"venom",duration:600000}},
  "Ward Draught":{icon:"tonic",category:"Tonic",description:"A sigil tonic that resists hostile environments.",use:"Reduce environmental combat penalties for 10 minutes.",value:85,consume:{buff:"ward",duration:600000}},
  "Fortune Philter":{icon:"tonic",category:"Tonic",description:"A volatile astral mixture prized by treasure hunters.",use:"Increase equipment drop chance for 10 minutes.",value:140,consume:{buff:"fortune",duration:600000}},
  "Trail Map":{icon:"map",category:"Chart",description:"A hand-marked route through the Greenveil frontier.",use:"Consumed by Huntsmanship to build early cache-finding tools.",value:16},
  "Quarry Map":{icon:"map",category:"Chart",description:"A heat-stained survey of Ashen Quarry tunnels and camps.",use:"Consumed by Huntsmanship to prepare targeted gear hunts.",value:30},
  "Frostmere Map":{icon:"map",category:"Chart",description:"A cold-proof chart of the pass, safe caves, and raider trails.",use:"Consumed by Huntsmanship to prepare boss lures and field kits.",value:48},
  "Citadel Map":{icon:"map",category:"Chart",description:"A tactical route through Emberfall Citadel patrol lines.",use:"Used by Huntsmanship for higher-tier expedition planning.",value:72},
  "Mire Map":{icon:"map",category:"Chart",description:"A resin-sealed swamp chart with safe ground and ambush routes.",use:"Used by Huntsmanship to prepare venom-focused combat supplies.",value:96},
  "Sunscar Map":{icon:"map",category:"Chart",description:"A mirrored desert route that tracks shade, ruins, and glass storms.",use:"Used by Huntsmanship to prepare warding supplies for severe zones.",value:125},
  "Tempest Map":{icon:"map",category:"Chart",description:"A stormproof cliff chart etched with lightning channels.",use:"Used by Huntsmanship to plan high-value treasure routes.",value:155},
  "Astral Scar Map":{icon:"map",category:"Chart",description:"A shifting star chart of fractured ground and void landmarks.",use:"Used by Huntsmanship to recover late-game reforging supplies.",value:190},
  "Tracking Snare":{icon:"tool",category:"Hunting Tool",description:"A quiet field snare marked with fresh trail signs.",use:"Use before combat for +4% zone cache chance for 10 minutes.",value:28,consume:{buff:"tracking",duration:600000}},
  "Hunter Mark":{icon:"tool",category:"Hunting Tool",description:"A waxed target token carrying enemy gait notes and weak-point marks.",use:"Use before combat for +2.5% equipment drop chance for 10 minutes.",value:58,consume:{buff:"huntermark",duration:600000}},
  "Boss Lure":{icon:"tool",category:"Hunting Tool",description:"A dark bait charm made to draw repeat bosses into richer ambushes.",use:"Use before repeat boss fights for +2 cache rolls and extra forge rewards for 10 minutes.",value:115,consume:{buff:"bosslure",duration:600000}},
  "Wooden Grip":{icon:"logs",category:"Forge Component",description:"A shaped handle fitted to forged weapons.",use:"Used when crafting swords, blades, and other weapon gear.",value:6},
  "Shield Frame":{icon:"shield",category:"Forge Component",description:"A braced core that gives shields their structure.",use:"Used when crafting shields, wards, aegises, and bulwarks.",value:9},
  "Armor Lining":{icon:"body",category:"Forge Component",description:"Padded reinforcement fitted beneath metal armor.",use:"Used when crafting helms, crowns, plates, and body armor.",value:9},
  "Forge Essence":{icon:"relic",category:"Crafting Material",description:"Condensed value recovered by dismantling equipment.",use:"Spend it to reforge equipment affixes.",value:18},
  "Reforge Token":{icon:"relic",category:"Guild Service",description:"A stamped voucher accepted by the guild enchanter.",use:"Reroll all affixes on one equipment piece.",value:90}
  ,"Guild Armory Blueprint":{icon:"relic",category:"Blueprint",description:"A sealed set of guild equipment plans.",use:"Learn two permanent Steel-tier equipment recipes.",value:220}
};
const zoneData = [
  {
    name:"Greenveil Trail",biome:"Whisperwood frontier",recommended:[1,10],gearTiers:["Bronze"],requiredKills:10,
    environment:{name:"Sheltered Trail",description:"No environmental penalty. A suitable proving ground."},
    cache:{name:"Greenveil Forager's Cache",description:"Trail caches favor early bars, logs, and field food for new hunters.",chance:.08,items:[
      {item:"Copper Ore",qty:[1,2],weight:4},{item:"Logs",qty:[1,2],weight:3},{item:"Tin Ore",qty:1,weight:2},{item:"Field Stew",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Greenveil Goblin",rank:"Trail scavenger",level:2,hp:22,maxHit:4,attackTime:3200,coins:[5,10],item:"Goblin Scrap",bonusItem:"Copper Ore",bonusChance:.55,image:"greenveil-goblin",tactic:"Best early coin target with Copper support."},
      {name:"Briar Fang",rank:"Wild stalker",level:4,hp:28,maxHit:7,attackTime:2600,coins:[6,11],item:"Goblin Scrap",bonusItem:"Logs",bonusChance:.5,image:"briar-fang",tactic:"Fast kills, but evasive enough to punish low Attack."},
      {name:"Mossback Brute",rank:"Forest bruiser",level:6,hp:46,maxHit:7,attackTime:3500,coins:[8,13],item:"Goblin Scrap",bonusItem:"Tin Ore",bonusChance:.62,image:"mossback-brute",tactic:"Slow, sturdy target with the best Tin payout."}
    ],
    boss:{name:"Grak the Trailbreaker", level:8, hp:115, maxHit:10, attackTime:2600, coins:[45,65], item:"Trailbreaker Crest",image:"grak-the-trailbreaker"}
  },
  {
    name:"Ashen Quarry",biome:"Volcanic mine",recommended:[11,22],gearTiers:["Iron","Steel"],requiredKills:14,
    environment:{name:"Ashfall",description:"Enemies deal 5% more damage in the choking heat.",counter:"Ward Draught reduces this pressure.",enemyDamage:1.05},
    cache:{name:"Ashen Prospector Cache",description:"Collapsed tunnels hide ore, coal, scales, and volatile combat tonics.",chance:.09,items:[
      {item:"Iron Ore",qty:[1,2],weight:4},{item:"Coal",qty:[1,2],weight:3},{item:"Cinder Scale",qty:[1,2],weight:2},{item:"Battle Tonic",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Cinder Kobold",rank:"Quarry raider",level:12,hp:72,maxHit:11,attackTime:2700,coins:[9,15],item:"Cinder Scale",bonusItem:"Iron Ore",bonusChance:.48,image:"cinder-kobold",tactic:"Balanced ore target with dangerous heavy strikes."},
      {name:"Ashclaw Miner",rank:"Tunnel skirmisher",level:14,hp:60,maxHit:14,attackTime:2300,coins:[11,18],item:"Cinder Scale",bonusItem:"Coal",bonusChance:.57,image:"ashclaw-miner",tactic:"High pressure, better coal flow for smelting."},
      {name:"Basalt Mauler",rank:"Stonebound brute",level:17,hp:105,maxHit:13,attackTime:3300,coins:[14,22],item:"Cinder Scale",bonusItem:"Iron Ore",bonusChance:.64,image:"basalt-mauler",tactic:"Armored, slower, and best for sustained ore farming."}
    ],
    boss:{name:"Magmar, Quarry Tyrant", level:20, hp:260, maxHit:17, attackTime:2300, coins:[110,145], item:"Molten Core",image:"magmar-quarry-tyrant"}
  },
  {
    name:"Frostmere Pass",biome:"Frozen mountain pass",recommended:[23,38],gearTiers:["Silver"],requiredKills:18,
    environment:{name:"Biting Cold",description:"Player attack speed is 8% slower.",counter:"Ward Draught reduces this pressure.",playerAttackTime:1.08},
    cache:{name:"Frostmere Expedition Cache",description:"Frozen packs hold silver, coldwater food, and pass sigils.",chance:.1,items:[
      {item:"Silver Ore",qty:[1,2],weight:4},{item:"Raw Frostmere Ray",qty:1,weight:3},{item:"Frozen Sigil",qty:[1,2],weight:2},{item:"Frostmere Supper",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Frostbound Raider",rank:"Pass marauder",level:24,hp:145,maxHit:17,attackTime:2400,coins:[16,25],item:"Frozen Sigil",bonusItem:"Coal",bonusChance:.46,image:"frostbound-raider",tactic:"Reliable sigils with coal for the Silver route."},
      {name:"Rimeblade Scout",rank:"Frozen duelist",level:27,hp:118,maxHit:21,attackTime:2050,coins:[19,29],item:"Frozen Sigil",bonusItem:"Silver Ore",bonusChance:.58,image:"rimeblade-scout",tactic:"Fast and evasive, but the best Silver Ore target."},
      {name:"Glacier Warden",rank:"Icebound sentinel",level:31,hp:205,maxHit:19,attackTime:3050,coins:[23,34],item:"Frozen Sigil",bonusItem:"Mithril Ore",bonusChance:.5,image:"glacier-warden",tactic:"Durable gatekeeper that previews Mithril supplies."}
    ],
    boss:{name:"Skall the White Warden", level:35, hp:520, maxHit:25, attackTime:2100, coins:[230,290], item:"Warden Horn",image:"skall-the-white-warden"}
  },
  {
    name:"Emberfall Citadel",biome:"Burning fortress",recommended:[39,58],gearTiers:["Mithril","Obsidian"],requiredKills:24,
    environment:{name:"Citadel Pressure",description:"Enemies gain 10% Defence and deal 10% more damage.",counter:"Ward Draught reduces this pressure.",enemyDefence:1.1,enemyDamage:1.1},
    cache:{name:"Citadel Armory Cache",description:"Sealed armories carry bars, Emberite, forge essence, and battle tonics.",chance:.105,items:[
      {item:"Steel Bar",qty:1,weight:4},{item:"Emberite Ore",qty:[1,2],weight:3},{item:"Forge Essence",qty:1,weight:2},{item:"Battle Tonic",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Emberguard Knight",rank:"Citadel soldier",level:40,hp:270,maxHit:25,attackTime:2200,coins:[28,42],item:"Emberguard Seal",bonusItem:"Iron Bar",bonusChance:.46,image:"emberguard-knight",tactic:"Stable seal farming with defensive pressure."},
      {name:"Cinderblade Duelist",rank:"Royal champion",level:44,hp:225,maxHit:31,attackTime:1850,coins:[34,49],item:"Emberguard Seal",bonusItem:"Steel Bar",bonusChance:.54,image:"cinderblade-duelist",tactic:"Fast kill target for Steel, but crits hard."},
      {name:"Furnace Sentinel",rank:"Living bulwark",level:49,hp:390,maxHit:28,attackTime:2850,coins:[40,58],item:"Emberguard Seal",bonusItem:"Emberite Ore",bonusChance:.63,image:"furnace-sentinel",tactic:"Slowest fight, best Emberite payout."}
    ],
    boss:{name:"Vharos, the Cinder King", level:55, hp:950, maxHit:36, attackTime:1900, coins:[500,650], item:"Cinder Crown",image:"vharos-the-cinder-king"}
  },
  {
    name:"Verdant Mire",biome:"Poisoned deep swamp",recommended:[58,70],gearTiers:["Emberforged"],requiredKills:28,
    environment:{name:"Toxic Miasma",description:"Enemy hits have a 15% chance to inflict poison.",counter:"Ward Draught reduces this pressure.",poisonChance:.15,poisonDamage:7},
    cache:{name:"Mire Apothecary Cache",description:"Half-sunk packs contain resin, rotbloom, obsidian, and anti-poison tools.",chance:.11,items:[
      {item:"Mire Resin",qty:[1,2],weight:4},{item:"Rotbloom",qty:1,weight:3},{item:"Obsidian",qty:1,weight:2},{item:"Venom Oil",qty:1,weight:1},{item:"Ward Draught",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Mirestalker Lizard",rank:"Swamp hunter",level:58,hp:520,maxHit:38,attackTime:1950,coins:[48,70],item:"Mire Resin",bonusItem:"Emberite Ore",bonusChance:.48,image:"mirestalker-lizard",tactic:"Fast venom pressure with Emberite support."},
      {name:"Bog Hexer",rank:"Marsh occultist",level:61,hp:460,maxHit:44,attackTime:2200,coins:[55,78],item:"Mire Resin",bonusItem:"Obsidian",bonusChance:.56,image:"bog-hexer",tactic:"Lower health, harsher healing pressure, best Obsidian target."},
      {name:"Rotwood Colossus",rank:"Fungal behemoth",level:65,hp:760,maxHit:40,attackTime:2950,coins:[62,88],item:"Rotbloom",bonusItem:"Embersteel Bar",bonusChance:.62,image:"rotwood-colossus",tactic:"Long, armored fight with superior bar payouts."}
    ],
    boss:{name:"Velka, the Marsh Mother",level:70,hp:1700,maxHit:52,attackTime:1850,coins:[750,950],item:"Mireheart Pearl",image:"velka-marsh-mother"}
  },
  {
    name:"Sunscar Expanse",biome:"Glass desert",recommended:[68,82],gearTiers:["Runic"],requiredKills:32,
    environment:{name:"Scorching Zenith",description:"Enemies deal 15% more damage and all healing is reduced by 25%.",counter:"Ward Draught reduces this pressure.",enemyDamage:1.15,healingReduction:.25},
    cache:{name:"Sunscar Relic Cache",description:"Buried shrines hold runic materials, sunstone, and fortune philters.",chance:.115,items:[
      {item:"Runite Ore",qty:[1,2],weight:4},{item:"Runic Bar",qty:1,weight:2},{item:"Sunstone Shard",qty:1,weight:3},{item:"Fortune Philter",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Dune Jackal",rank:"Desert predator",level:70,hp:760,maxHit:52,attackTime:1750,coins:[72,102],item:"Sunscar Hide",bonusItem:"Runite Ore",bonusChance:.5,image:"dune-jackal",tactic:"Fast, risky hide and ore farming."},
      {name:"Glassblade Nomad",rank:"Mirage duelist",level:74,hp:680,maxHit:59,attackTime:1650,coins:[80,112],item:"Sunscar Hide",bonusItem:"Runite Ore",bonusChance:.58,image:"glassblade-nomad",tactic:"Best ore target, but evasive and high damage."},
      {name:"Sunstone Golem",rank:"Solar construct",level:78,hp:1100,maxHit:55,attackTime:2700,coins:[88,124],item:"Sunstone Shard",bonusItem:"Runic Bar",bonusChance:.62,image:"sunstone-golem",tactic:"Slow construct with the best Runic Bar chance."}
    ],
    boss:{name:"Azhar, the Sand Crown",level:82,hp:2500,maxHit:68,attackTime:1700,coins:[1050,1325],item:"Solar Core",image:"azhar-sand-crown"}
  },
  {
    name:"Tempest Reach",biome:"Storm-wracked cliffs",recommended:[80,94],gearTiers:["Astral"],requiredKills:36,
    environment:{name:"Static Front",description:"Enemy attacks are 12% faster and successful hits delay your next strike.",counter:"Ward Draught reduces this pressure.",enemyAttackTime:.88,slowOnHit:350},
    cache:{name:"Tempest Wreckage Cache",description:"Lightning-scoured wreckage yields stormglass, astral ore, and speed serums.",chance:.12,items:[
      {item:"Stormglass",qty:[1,2],weight:4},{item:"Astral Ore",qty:[1,2],weight:3},{item:"Astral Bar",qty:1,weight:2},{item:"Swiftwater Serum",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Stormwing Harrier",rank:"Cliff predator",level:82,hp:1050,maxHit:66,attackTime:1550,coins:[100,138],item:"Stormglass",bonusItem:"Astral Ore",bonusChance:.5,image:"stormwing-harrier",tactic:"Fastest astral ore source, but delays your strikes."},
      {name:"Thunderbound Raider",rank:"Storm marauder",level:86,hp:1180,maxHit:72,attackTime:1750,coins:[112,152],item:"Stormglass",bonusItem:"Astral Ore",bonusChance:.57,image:"thunderbound-raider",tactic:"Better coin and ore flow with frequent heavy strikes."},
      {name:"Cloudforge Automaton",rank:"Ancient war engine",level:90,hp:1650,maxHit:68,attackTime:2450,coins:[124,168],item:"Charged Cog",bonusItem:"Astral Bar",bonusChance:.62,image:"cloudforge-automaton",tactic:"Long armored fight with the best Astral Bar chance."}
    ],
    boss:{name:"Vael, the Storm Herald",level:94,hp:3700,maxHit:82,attackTime:1500,coins:[1500,1850],item:"Tempest Heart",image:"vael-storm-herald"}
  },
  {
    name:"Astral Scar",biome:"Fractured cosmic wasteland",recommended:[92,110],gearTiers:["Starforged"],requiredKills:42,
    environment:{name:"Reality Fracture",description:"Enemies gain 18% Defence, 20% damage, and 8% evasion.",counter:"Ward Draught reduces this pressure.",enemyDefence:1.18,enemyDamage:1.2,evasion:.08},
    cache:{name:"Astral Fracture Cache",description:"Broken realities spill star metal, void shards, forge essence, and reforging tools.",chance:.13,items:[
      {item:"Void Shard",qty:[1,2],weight:4},{item:"Star Metal",qty:[1,2],weight:3},{item:"Starforged Bar",qty:1,weight:2},{item:"Forge Essence",qty:[1,2],weight:2},{item:"Reforge Token",qty:1,weight:1}
    ]},
    enemies:[
      {name:"Voidling Ravager",rank:"Abyssal skirmisher",level:94,hp:1550,maxHit:82,attackTime:1450,coins:[145,190],item:"Void Shard",bonusItem:"Star Metal",bonusChance:.52,image:"voidling-ravager",tactic:"Very fast, high-risk Star Metal farming."},
      {name:"Starborn Seer",rank:"Cosmic oracle",level:99,hp:1420,maxHit:92,attackTime:1700,coins:[160,210],item:"Void Shard",bonusItem:"Astral Bar",bonusChance:.58,image:"starborn-seer",tactic:"Evasive oracle with strong Astral Bar support."},
      {name:"Astral Colossus",rank:"Constellation titan",level:104,hp:2400,maxHit:88,attackTime:2350,coins:[180,235],item:"Worldstone Fragment",bonusItem:"Starforged Bar",bonusChance:.64,image:"astral-colossus",tactic:"Longest fight, best Starforged Bar target."}
    ],
    boss:{name:"Nyxara, the World-Eater",level:110,hp:5800,maxHit:108,attackTime:1400,coins:[2300,2850],item:"Worldscar Fragment",image:"nyxara-world-eater"}
  }
];
function zoneBountyDefinitions(zoneIndex) {
  const zone=zoneData[zoneIndex], first=zone.enemies[0], second=zone.enemies[1]||first;
  return [
    {
      id:"patrol",name:`${zone.name} Patrol`,type:"zoneKills",target:zoneIndex,baseGoal:Math.max(6,zone.requiredKills),
      description:`Defeat enemies anywhere in ${zone.name}.`,
      reward:(tier=0)=>makeReward(180+zoneIndex*95+tier*45,{[first.item]:4+zoneIndex+tier})
    },
    {
      id:"specialist",name:`${second.name} Bounty`,type:"enemyKills",target:second.name,baseGoal:4+zoneIndex*2,
      description:`Hunt ${second.name} for targeted field supplies.`,
      reward:(tier=0)=>makeReward(220+zoneIndex*110+tier*55,{[second.item]:3+zoneIndex+tier,[second.bonusItem||first.item]:2+tier})
    },
    {
      id:"boss",name:`${zone.boss.name} Writ`,type:"bossKills",target:zone.boss.name,baseGoal:1,
      description:`Defeat ${zone.boss.name}. Repeat completions scale the payout.`,
      reward:(tier=0)=>makeReward(500+zoneIndex*250+tier*125,{[zone.boss.item]:1,"Reforge Token":tier>=1?1:0})
    }
  ];
}
function chapterDefinitions(zoneIndex) {
  const zone=zoneData[zoneIndex], first=zone.enemies[0], second=zone.enemies[1]||first;
  const tier=zone.gearTiers[0]||"Bronze";
  const gear=equipmentTierData[tier]?.gear||equipmentTierData.Bronze.gear;
  const bar=equipmentTierData[tier]?.bar||"Bronze Bar";
  const boss=zone.boss;
  return {
    id:`chapter-${zoneIndex}`,
    zoneIndex,
    name:`Chapter ${zoneIndex+1}: ${zone.name}`,
    subtitle:zone.biome,
    description:`Establish a foothold in ${zone.name}, craft appropriate gear, and defeat ${boss.name}.`,
    reward:{coins:900+zoneIndex*750,items:{[first.item]:8+zoneIndex*3,[boss.item]:1,"Forge Essence":3+zoneIndex},gear:zoneIndex===0?["Bronze Shield"]:[]},
    steps:[
      {id:"stockpile",type:"item",target:first.bonusItem||bar,goal:zoneIndex?10+zoneIndex*4:25,label:`Stockpile ${first.bonusItem||bar}`,view:zoneIndex?"combat":"mining",hint:`Gather or loot ${first.bonusItem||bar} for local preparations.`},
      {id:"bar",type:"item",target:bar,goal:zoneIndex?6+zoneIndex*2:10,label:`Forge ${bar}`,view:"smithing",hint:`Smelt ${bar} for the ${tier} equipment tier.`},
      {id:"gear",type:"gear",target:gear[0],goal:1,label:`Craft or loot ${gear[0]}`,view:"crafting",hint:`Own one ${gear[0]} to prove your gear route is online.`},
      {id:"hunt",type:"enemyKills",target:second.name,goal:Math.max(3,4+zoneIndex*2),label:`Hunt ${second.name}`,view:"combat",hint:`Defeat ${second.name} to learn the zone's pressure.`},
      {id:"reveal",type:"zoneKills",target:zoneIndex,goal:zone.requiredKills,label:`Reveal ${boss.name}`,view:"combat",hint:`Complete enough hunts in ${zone.name} to reveal the boss.`},
      {id:"boss",type:"bossKills",target:boss.name,goal:1,label:`Defeat ${boss.name}`,view:"combat",hint:`Clear the chapter by defeating ${boss.name}.`}
    ]
  };
}
const zoneAchievementTracks = zoneData.map((zone,zoneIndex)=>({
  id:`zone-${zoneIndex}`,
  kind:"zone",
  zoneIndex,
  name:`${zone.name} Mastery`,
  description:`Build a lasting advantage by hunting throughout ${zone.name}.`,
  type:"zoneKills",
  icon:`assets/enemies/${zone.boss.image}.png`,
  bonusText:"Each tier: +2% coins and +1% combat XP in this zone.",
  bonuses:[
    {key:"combatCoins",amount:.02},
    {key:"combatXp",amount:.01}
  ],
  tiers:[
    {goal:100,name:`${zone.name} Scout`,coins:500+zoneIndex*250,supplies:15+zoneIndex*2},
    {goal:500,name:`${zone.name} Hunter`,coins:2500+zoneIndex*1000,supplies:35+zoneIndex*3},
    {goal:2500,name:`${zone.name} Warden`,coins:12000+zoneIndex*4000,supplies:65+zoneIndex*4},
    {goal:10000,name:`${zone.name} Legend`,coins:50000+zoneIndex*15000,supplies:110+zoneIndex*6}
  ]
}));
const enemyAchievementTracks = zoneData.flatMap((zone,zoneIndex)=>zone.enemies.map(enemy=>({
  id:`enemy-${enemy.image}`,
  kind:"enemy",
  zoneIndex,
  enemyName:enemy.name,
  name:`${enemy.name} Knowledge`,
  description:`Study and master repeated encounters with ${enemy.name}.`,
  type:"enemyKills",
  icon:`assets/enemies/${enemy.image}.png`,
  bonusText:"Each tier: +2% coins and +0.1% gear chance against this enemy.",
  bonuses:[
    {key:"combatCoins",amount:.02},
    {key:"gearChance",amount:.001}
  ],
  tiers:[
    {goal:25,name:`${enemy.name} Tracker`,coins:100+zoneIndex*75,supplies:3+zoneIndex},
    {goal:100,name:`${enemy.name} Hunter`,coins:500+zoneIndex*250,supplies:8+zoneIndex},
    {goal:500,name:`${enemy.name} Specialist`,coins:2500+zoneIndex*1000,supplies:18+zoneIndex*2},
    {goal:2500,name:`${enemy.name} Nemesis`,coins:10000+zoneIndex*4000,supplies:40+zoneIndex*3}
  ]
})));

function achievementRewardItems(track,tier,index=0) {
  const supplies=tier.supplies||0;
  const qty=divisor=>Math.max(1,Math.ceil(supplies/divisor));
  if (track.kind==="zone") {
    const zone=zoneData[track.zoneIndex];
    return {[zone.enemies[0].item]:qty(6),[zone.enemies[0].bonusItem||zone.enemies[0].item]:qty(10)};
  }
  if (track.kind==="enemy") {
    const zone=zoneData[track.zoneIndex];
    const enemy=zone.enemies.find(item=>item.name===track.enemyName);
    return {[enemy.item]:qty(4)};
  }
  const rewards={
    actions:{"Field Stew":qty(5),"Artisan Focus":index>=1?qty(25):0},
    kills:{"Health Potion":qty(3),"Battle Tonic":index>=1?qty(30):0},
    crafts:{"Forge Essence":qty(4),"Reforge Token":index>=2?qty(55):0},
    contracts:{"Artisan Focus":qty(18),"Field Stew":qty(6)},
    mastery:{"Artisan Focus":qty(8)},
    rareGear:{"Forge Essence":qty(4),"Reforge Token":index>=1?qty(35):0},
    town:{"Bronze Bar":qty(6),"Oak Logs":qty(6),"Forge Essence":index>=2?qty(25):0},
    salvage:{"Forge Essence":qty(3),"Reforge Token":index>=1?qty(30):0},
    totalLevel:{"Artisan Focus":qty(10),"Battle Tonic":qty(14)},
    bosses:{"Health Potion":qty(3),"Battle Tonic":qty(10),"Reforge Token":index>=1?qty(35):0}
  }[track.id]||{"Health Potion":qty(8)};
  return Object.fromEntries(Object.entries(rewards).filter(([,amount])=>amount>0));
}

achievementTracks=[...generalAchievementTracks,...zoneAchievementTracks,...enemyAchievementTracks];
achievementData=achievementTracks.flatMap(track=>track.tiers.map((tier,index)=>({
  id:tier.id||`${track.id}-${tier.goal}`,
  trackId:track.id,
  kind:track.kind||"general",
  tier:index+1,
  tiers:track.tiers.length,
  name:tier.name,
  description:track.description,
  type:track.type,
  goal:tier.goal,
  reward:{coins:tier.coins,items:achievementRewardItems(track,tier,index)},
  bonuses:track.bonuses||[],
  bonusText:track.bonusText,
  zoneIndex:track.zoneIndex,
  enemyName:track.enemyName
})));

const masteryMilestones = [
  { level:10, text:"+5% skill XP" },
  { level:25, text:"+1 item per action" },
  { level:50, text:"10% faster actions" },
  { level:75, text:"+1 item per action" },
  { level:100, text:"Double all output" }
];

const equipmentTierData = {
  Bronze:{bar:"Bronze Bar",bonus:[2,3,1],gear:["Bronze Sword","Bronze Shield","Bronze Helm","Bronze Platebody"]},
  Iron:{bar:"Iron Bar",bonus:[4,5,2],gear:["Iron Sword","Iron Shield","Iron Helm","Iron Platebody"]},
  Steel:{bar:"Steel Bar",bonus:[6,8,3],gear:["Steel Sword","Steel Shield","Steel Helm","Steel Platebody"]},
  Silver:{bar:"Silver Bar",bonus:[8,10,3],gear:["Silver Blade","Silver Aegis","Silver Helm","Silver Plate"]},
  Mithril:{bar:"Mithril Bar",bonus:[11,14,4],gear:["Mithril Sword","Mithril Shield","Mithril Helm","Mithril Platebody"]},
  Obsidian:{bar:"Obsidian Alloy",bonus:[14,18,5],gear:["Obsidian Edge","Obsidian Ward","Obsidian Visor","Obsidian Carapace"]},
  Emberforged:{bar:"Embersteel Bar",bonus:[18,23,6],gear:["Emberforged Blade","Emberforged Aegis","Emberforged Crown","Emberforged Plate"]},
  Runic:{bar:"Runic Bar",bonus:[23,29,7],gear:["Runic Blade","Runic Bulwark","Runic Crown","Runic Plate"]},
  Astral:{bar:"Astral Bar",bonus:[29,36,9],gear:["Astral Saber","Astral Guard","Astral Circlet","Astral Mantle"]},
  Starforged:{bar:"Starforged Bar",bonus:[36,45,12],gear:["Starforged Blade","Starforged Aegis","Starforged Crown","Starforged Plate"]}
};
const equipmentData = {
  "Rusty Sword":{slot:"weapon",attack:3,maxHit:2},
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
  "Guildmaster Blade":{slot:"weapon",attack:19,maxHit:9,crit:.01},
  "Guildmaster Ward":{slot:"shield",defence:23,maxHp:12,dodge:.01},
  "Silver Blade":{slot:"weapon",attack:22,maxHit:9},
  "Silver Aegis":{slot:"shield",defence:26},
  "Silver Plate":{slot:"body",defence:34,maxHp:46},
  "Silver Helm":{slot:"head",defence:16,maxHp:24},
  "Mithril Sword":{slot:"weapon",attack:30,maxHit:12},
  "Mithril Shield":{slot:"shield",defence:36},
  "Mithril Platebody":{slot:"body",defence:47,maxHp:64},
  "Mithril Helm":{slot:"head",defence:22,maxHp:33},
  "Obsidian Edge":{slot:"weapon",attack:40,maxHit:16},
  "Obsidian Ward":{slot:"shield",defence:48},
  "Obsidian Carapace":{slot:"body",defence:62,maxHp:86},
  "Obsidian Visor":{slot:"head",defence:29,maxHp:44},
  "Emberforged Blade":{slot:"weapon",attack:52,maxHit:21},
  "Emberforged Aegis":{slot:"shield",defence:62},
  "Emberforged Plate":{slot:"body",defence:80,maxHp:112},
  "Emberforged Crown":{slot:"head",defence:38,maxHp:57},
  "Runic Blade":{slot:"weapon",attack:67,maxHit:27},
  "Runic Bulwark":{slot:"shield",defence:80},
  "Runic Plate":{slot:"body",defence:103,maxHp:145},
  "Runic Crown":{slot:"head",defence:49,maxHp:74},
  "Astral Saber":{slot:"weapon",attack:84,maxHit:34},
  "Astral Guard":{slot:"shield",defence:100},
  "Astral Mantle":{slot:"body",defence:129,maxHp:182},
  "Astral Circlet":{slot:"head",defence:61,maxHp:93},
  "Starforged Blade":{slot:"weapon",attack:105,maxHit:43},
  "Starforged Aegis":{slot:"shield",defence:125},
  "Starforged Plate":{slot:"body",defence:161,maxHp:228},
  "Starforged Crown":{slot:"head",defence:76,maxHp:116}
};

const craftingRecipes = [
  {name:"Bronze Sword",level:5,costs:{"Bronze Bar":3,"Logs":1,"Wooden Grip":1}},
  {name:"Bronze Shield",level:7,costs:{"Bronze Bar":4,"Logs":1,"Shield Frame":1}},
  {name:"Bronze Helm",level:9,costs:{"Bronze Bar":4,"Logs":1,"Armor Lining":1}},
  {name:"Bronze Platebody",level:10,costs:{"Bronze Bar":7,"Logs":1,"Armor Lining":1}},
  {name:"Iron Sword",level:15,costs:{"Iron Bar":4,"Oak Logs":1,"Wooden Grip":1}},
  {name:"Iron Shield",level:17,costs:{"Iron Bar":5,"Oak Logs":1,"Shield Frame":1}},
  {name:"Iron Helm",level:19,costs:{"Iron Bar":5,"Oak Logs":1,"Armor Lining":1}},
  {name:"Iron Platebody",level:20,costs:{"Iron Bar":9,"Oak Logs":1,"Armor Lining":1}},
  {name:"Steel Sword",level:25,costs:{"Steel Bar":5,"Willow Logs":1,"Wooden Grip":1}},
  {name:"Steel Shield",level:27,costs:{"Steel Bar":7,"Willow Logs":1,"Shield Frame":1}},
  {name:"Steel Helm",level:29,costs:{"Steel Bar":7,"Willow Logs":1,"Armor Lining":1}},
  {name:"Steel Platebody",level:30,costs:{"Steel Bar":12,"Willow Logs":1,"Armor Lining":1}},
  {name:"Guildmaster Blade",level:30,tier:"Steel",blueprint:"Guild Armory Blueprint",costs:{"Steel Bar":8,"Willow Logs":1,"Wooden Grip":1,"Trailbreaker Crest":1}},
  {name:"Guildmaster Ward",level:30,tier:"Steel",blueprint:"Guild Armory Blueprint",costs:{"Steel Bar":10,"Willow Logs":1,"Shield Frame":1,"Trailbreaker Crest":1}},
  {name:"Silver Blade",level:35,costs:{"Silver Bar":5,"Emberpine Logs":1,"Wooden Grip":1,"Frozen Sigil":1}},
  {name:"Silver Aegis",level:37,costs:{"Silver Bar":7,"Emberpine Logs":1,"Shield Frame":1,"Frozen Sigil":1}},
  {name:"Silver Helm",level:39,costs:{"Silver Bar":7,"Emberpine Logs":1,"Armor Lining":1,"Frozen Sigil":1}},
  {name:"Silver Plate",level:40,costs:{"Silver Bar":12,"Emberpine Logs":1,"Armor Lining":1,"Frozen Sigil":2}},
  {name:"Mithril Sword",level:45,costs:{"Mithril Bar":5,"Maple Logs":1,"Wooden Grip":1}},
  {name:"Mithril Shield",level:47,costs:{"Mithril Bar":7,"Maple Logs":1,"Shield Frame":1}},
  {name:"Mithril Helm",level:49,costs:{"Mithril Bar":7,"Maple Logs":1,"Armor Lining":1}},
  {name:"Mithril Platebody",level:50,costs:{"Mithril Bar":12,"Maple Logs":1,"Armor Lining":1}},
  {name:"Obsidian Edge",level:55,costs:{"Obsidian Alloy":5,"Yew Logs":1,"Wooden Grip":1,"Cinder Scale":2}},
  {name:"Obsidian Ward",level:57,costs:{"Obsidian Alloy":7,"Yew Logs":1,"Shield Frame":1,"Cinder Scale":2}},
  {name:"Obsidian Visor",level:59,costs:{"Obsidian Alloy":7,"Yew Logs":1,"Armor Lining":1,"Cinder Scale":2}},
  {name:"Obsidian Carapace",level:60,costs:{"Obsidian Alloy":12,"Yew Logs":1,"Armor Lining":1,"Molten Core":1}},
  {name:"Emberforged Blade",level:65,costs:{"Embersteel Bar":6,"Yew Logs":1,"Wooden Grip":1,"Mire Resin":3}},
  {name:"Emberforged Aegis",level:67,costs:{"Embersteel Bar":8,"Yew Logs":1,"Shield Frame":1,"Rotbloom":2}},
  {name:"Emberforged Crown",level:69,costs:{"Embersteel Bar":8,"Yew Logs":1,"Armor Lining":1,"Mire Resin":4}},
  {name:"Emberforged Plate",level:70,costs:{"Embersteel Bar":14,"Yew Logs":1,"Armor Lining":1,"Mireheart Pearl":1}},
  {name:"Runic Blade",level:75,costs:{"Runic Bar":6,"Ashen Logs":1,"Wooden Grip":1,"Sunscar Hide":3}},
  {name:"Runic Bulwark",level:77,costs:{"Runic Bar":8,"Ashen Logs":1,"Shield Frame":1,"Sunstone Shard":2}},
  {name:"Runic Crown",level:79,costs:{"Runic Bar":8,"Ashen Logs":1,"Armor Lining":1,"Sunscar Hide":4}},
  {name:"Runic Plate",level:80,costs:{"Runic Bar":14,"Ashen Logs":1,"Armor Lining":1,"Solar Core":1}},
  {name:"Astral Saber",level:85,costs:{"Astral Bar":6,"Ashen Logs":1,"Wooden Grip":1,"Stormglass":3}},
  {name:"Astral Guard",level:87,costs:{"Astral Bar":8,"Ashen Logs":1,"Shield Frame":1,"Charged Cog":2}},
  {name:"Astral Circlet",level:89,costs:{"Astral Bar":8,"Ashen Logs":1,"Armor Lining":1,"Stormglass":4}},
  {name:"Astral Mantle",level:90,costs:{"Astral Bar":14,"Ashen Logs":1,"Armor Lining":1,"Tempest Heart":1}},
  {name:"Starforged Blade",level:95,costs:{"Starforged Bar":6,"Worldroot Logs":1,"Wooden Grip":1,"Void Shard":3}},
  {name:"Starforged Aegis",level:97,costs:{"Starforged Bar":8,"Worldroot Logs":1,"Shield Frame":1,"Worldstone Fragment":2}},
  {name:"Starforged Crown",level:99,costs:{"Starforged Bar":8,"Worldroot Logs":1,"Armor Lining":1,"Void Shard":4}},
  {name:"Starforged Plate",level:100,costs:{"Starforged Bar":14,"Worldroot Logs":1,"Armor Lining":1,"Worldscar Fragment":1}}
];

const skillData = {
  mining: {
    name: "Mining", letter: "M",
    actions: [
      { id:"copper", name:"Copper Vein", level:1, time:3000, xp:10, item:"Copper Ore", qty:1, description:"Mine useful ore from the shallow hills." },
      { id:"tin", name:"Tin Vein", level:3, time:3400, xp:14, item:"Tin Ore", qty:1, description:"Extract pale tin for bronze alloys." },
      { id:"iron", name:"Iron Deposit", level:10, time:4100, xp:24, item:"Iron Ore", qty:1, description:"Work a dense vein of sturdy iron." },
      { id:"coal", name:"Coal Seam", level:15, time:4600, xp:31, item:"Coal", qty:1, description:"Gather fuel used by nearly every advanced metal." },
      { id:"silver", name:"Silver Lode", level:30, time:5600, xp:55, item:"Silver Ore", qty:1, description:"Extract bright ore for the level 35-40 equipment tier." },
      { id:"mithril", name:"Mithril Vein", level:40, time:6500, xp:78, item:"Mithril Ore", qty:1, description:"Mine rare blue metal for level 45-50 gear." },
      { id:"obsidian", name:"Obsidian Shelf", level:50, time:7400, xp:108, item:"Obsidian", qty:1, description:"Break volcanic glass for level 55-60 armor." },
      { id:"emberite", name:"Emberite Core", level:60, time:8300, xp:145, item:"Emberite Ore", qty:1, description:"Harvest living flame ore for level 65-70 equipment." },
      { id:"runite", name:"Runite Vault", level:70, time:9200, xp:190, item:"Runite Ore", qty:1, description:"Extract rune-saturated ore for level 75-80 gear." },
      { id:"astral", name:"Astral Geode", level:80, time:10200, xp:250, item:"Astral Ore", qty:1, description:"Mine star-charged crystal for level 85-90 equipment." },
      { id:"star", name:"Starfall Crater", level:90, time:11400, xp:330, item:"Star Metal", qty:1, description:"Mine fallen celestial metal for level 95-100 gear." }
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
      { id:"bronze", name:"Bronze Bar", level:1, time:3400, xp:14, item:"Bronze Bar", qty:1, costs:{"Copper Ore":2,"Tin Ore":2}, description:"Smelt copper and tin into bronze." },
      { id:"grip", name:"Wooden Grip", level:5, time:3000, xp:18, item:"Wooden Grip", qty:1, costs:{"Logs":2}, description:"Shape a reliable weapon handle for forged blades." },
      { id:"frame", name:"Shield Frame", level:7, time:3200, xp:22, item:"Shield Frame", qty:1, costs:{"Logs":2,"Bronze Bar":1}, description:"Build the braced core used by shields and wards." },
      { id:"lining", name:"Armor Lining", level:9, time:3400, xp:25, item:"Armor Lining", qty:1, costs:{"Logs":2,"Bronze Bar":1}, description:"Prepare padded supports for helms and body armor." },
      { id:"ironbar", name:"Iron Bar", level:10, time:4200, xp:26, item:"Iron Bar", qty:1, costs:{"Iron Ore":2}, description:"Refine iron for level 15-20 equipment." },
      { id:"steelbar", name:"Steel Bar", level:20, time:5000, xp:43, item:"Steel Bar", qty:1, costs:{"Iron Ore":2,"Coal":2}, description:"Temper iron with coal into the level 25-30 equipment metal." },
      { id:"silverbar", name:"Silver Bar", level:30, time:5800, xp:64, item:"Silver Bar", qty:1, costs:{"Silver Ore":2}, description:"Purify silver for level 35-40 specialist gear." },
      { id:"mithrilbar", name:"Mithril Bar", level:40, time:6700, xp:92, item:"Mithril Bar", qty:1, costs:{"Mithril Ore":2}, description:"Smelt rare mithril for level 45-50 equipment." },
      { id:"obsidianbar", name:"Obsidian Alloy", level:50, time:7600, xp:128, item:"Obsidian Alloy", qty:1, costs:{"Obsidian":2}, description:"Bind volcanic glass for level 55-60 armor." },
      { id:"embersteel", name:"Embersteel Bar", level:60, time:8600, xp:172, item:"Embersteel Bar", qty:1, costs:{"Emberite Ore":2}, description:"Forge flame-bearing metal for level 65-70 gear." },
      { id:"runicbar", name:"Runic Bar", level:70, time:9600, xp:225, item:"Runic Bar", qty:1, costs:{"Runite Ore":2}, description:"Stabilize rune ore for level 75-80 equipment." },
      { id:"astralbar", name:"Astral Bar", level:80, time:10800, xp:290, item:"Astral Bar", qty:1, costs:{"Astral Ore":2}, description:"Bind stellar crystal for level 85-90 equipment." },
      { id:"starbar", name:"Starforged Bar", level:90, time:12200, xp:380, item:"Starforged Bar", qty:1, costs:{"Star Metal":2}, description:"Shape celestial metal for level 95-100 equipment." }
    ]
  },
  cooking: {
    name:"Cooking", letter:"K",
    actions: [
      {id:"stew",name:"Field Stew",level:1,time:3000,xp:12,item:"Field Stew",qty:1,costs:{"Raw Shrimp":2,"Logs":1},description:"Simmer shrimp over a small woodland fire."},
      {id:"trout",name:"Trout Skewer",level:8,time:3800,xp:22,item:"Trout Skewer",qty:1,costs:{"Raw Trout":1,"Oak Logs":1},description:"Smoke trout on a sturdy oak skewer."},
      {id:"salmon",name:"Salmon Roast",level:18,time:4800,xp:38,item:"Salmon Roast",qty:1,costs:{"Raw Salmon":1,"Willow Logs":1},description:"Slow-roast salmon until it becomes deeply nourishing."},
      {id:"eel",name:"Ember Eel Broth",level:30,time:5900,xp:60,item:"Ember Eel Broth",qty:1,costs:{"Raw Ember Eel":1,"Emberpine Logs":1},description:"Temper the eel's heat into a restorative broth."},
      {id:"tuna",name:"Tuna Steak",level:45,time:7000,xp:90,item:"Tuna Steak",qty:1,costs:{"Raw Tuna":1,"Maple Logs":1},description:"Sear a thick tuna steak over red maple."},
      {id:"storm",name:"Stormfish Feast",level:60,time:8200,xp:130,item:"Stormfish Feast",qty:1,costs:{"Raw Swordfish":1,"Yew Logs":1},description:"Prepare a feast worthy of a storm hunter."},
      {id:"frost",name:"Frostmere Supper",level:75,time:9400,xp:190,item:"Frostmere Supper",qty:1,costs:{"Raw Frostmere Ray":1,"Ashen Logs":1},description:"Cook frost-ray evenly with fire-hardened timber."},
      {id:"leviathan",name:"Leviathan Banquet",level:92,time:11200,xp:290,item:"Leviathan Banquet",qty:1,costs:{"Leviathan Meat":1,"Worldroot Logs":1},description:"Create a legendary banquet from an abyssal catch."}
    ]
  },
  cartography: {
    name:"Cartography", letter:"R",
    description:"Chart hostile routes, boss lairs, and resource trails so Huntsmanship can turn exploration into field advantages.",
    actions: [
      {id:"trail",name:"Trail Survey",level:1,time:4200,xp:18,item:"Trail Map",qty:1,costs:{"Logs":1,"Goblin Scrap":1},description:"Mark Greenveil paths, forage points, and safe ambush lanes."},
      {id:"quarry",name:"Quarry Survey",level:15,time:5600,xp:36,item:"Quarry Map",qty:1,costs:{"Oak Logs":1,"Cinder Scale":2,"Coal":1},description:"Sketch Ashen Quarry tunnels, heat vents, and kobold routes."},
      {id:"frostmere",name:"Frostmere Chart",level:30,time:7000,xp:62,item:"Frostmere Map",qty:1,costs:{"Emberpine Logs":1,"Frozen Sigil":2,"Silver Ore":1},description:"Create a cold-proof chart of passes, caves, and raider tracks."},
      {id:"citadel",name:"Citadel War Map",level:45,time:8500,xp:92,item:"Citadel Map",qty:1,costs:{"Maple Logs":1,"Emberguard Seal":2,"Steel Bar":1},description:"Record guard rotations and forge routes through the burning fortress."},
      {id:"mire",name:"Mire Marsh Map",level:58,time:9700,xp:128,item:"Mire Map",qty:1,costs:{"Yew Logs":1,"Mire Resin":2,"Obsidian":1},description:"Seal a swamp chart against rot, marking safe roots and venom dens."},
      {id:"sunscar",name:"Sunscar Route Map",level:70,time:11000,xp:178,item:"Sunscar Map",qty:1,costs:{"Ashen Logs":1,"Sunscar Hide":2,"Runite Ore":1},description:"Trace shade lines, glass dunes, and buried shrine approaches."},
      {id:"tempest",name:"Tempest Cliff Map",level:82,time:12400,xp:245,item:"Tempest Map",qty:1,costs:{"Ashen Logs":1,"Stormglass":2,"Astral Ore":1},description:"Bind stormglass bearings into a cliff chart that survives lightning."},
      {id:"astral",name:"Astral Scar Map",level:92,time:14000,xp:335,item:"Astral Scar Map",qty:1,costs:{"Worldroot Logs":1,"Void Shard":2,"Star Metal":1},description:"Anchor a shifting star chart of void rifts and late-game trophy paths."}
    ]
  },
  alchemy: {
    name:"Alchemy", letter:"Y",
    actions: [
      {id:"health",name:"Health Potion",level:1,time:3600,xp:16,item:"Health Potion",qty:1,costs:{"Goblin Scrap":2,"Logs":1},description:"Clean and distill useful compounds from battlefield scrap."},
      {id:"ironbark",name:"Ironbark Elixir",level:8,time:4100,xp:26,item:"Ironbark Elixir",qty:1,costs:{"Goblin Scrap":2,"Oak Logs":1},description:"Fortify an adventurer with bark and battlefield minerals."},
      {id:"swiftwater",name:"Swiftwater Serum",level:12,time:4600,xp:34,item:"Swiftwater Serum",qty:1,costs:{"Raw Trout":1,"Willow Logs":1},description:"Distill a serum that accelerates productive work."},
      {id:"battle",name:"Battle Tonic",level:20,time:5200,xp:44,item:"Battle Tonic",qty:1,costs:{"Cinder Scale":2,"Emberpine Logs":1},description:"Brew a volatile tonic that increases combat force."},
      {id:"venom",name:"Venom Oil",level:30,time:6000,xp:62,item:"Venom Oil",qty:1,costs:{"Cinder Scale":2,"Raw Ember Eel":1},description:"Stabilize a weapon coating that intensifies combat damage."},
      {id:"focus",name:"Artisan Focus",level:40,time:6800,xp:84,item:"Artisan Focus",qty:1,costs:{"Frozen Sigil":2,"Silver Bar":1},description:"Dissolve a frozen sigil into a concentration draught."},
      {id:"ward",name:"Ward Draught",level:50,time:7500,xp:108,item:"Ward Draught",qty:1,costs:{"Frozen Sigil":2,"Mithril Bar":1},description:"Brew protection against severe environmental hazards."},
      {id:"prospector",name:"Prospector Draught",level:65,time:8400,xp:145,item:"Prospector Draught",qty:1,costs:{"Emberguard Seal":2,"Obsidian Alloy":1},description:"Bind a citadel seal into an extract that improves gathering yield."}
      ,{id:"fortune",name:"Fortune Philter",level:80,time:9800,xp:235,item:"Fortune Philter",qty:1,costs:{"Stormglass":2,"Astral Bar":1},description:"Distill stormlight into a treasure hunter's philter."}
    ]
  },
  huntsmanship: {
    name:"Huntsmanship", letter:"H",
    description:"Turn maps and monster signs into practical hunting tools, targeted marks, boss lures, and late-game combat supplies.",
    actions: [
      {id:"snare",name:"Tracking Snare",level:1,time:4800,xp:22,item:"Tracking Snare",qty:1,costs:{"Trail Map":1,"Goblin Scrap":2,"Logs":1},description:"Build a quiet snare kit that improves zone cache discovery."},
      {id:"mark",name:"Hunter Mark",level:18,time:6300,xp:46,item:"Hunter Mark",qty:1,costs:{"Quarry Map":1,"Cinder Scale":2,"Oak Logs":1},description:"Prepare a target mark that improves equipment drop odds during hunts."},
      {id:"lure",name:"Boss Lure",level:35,time:8200,xp:82,item:"Boss Lure",qty:1,costs:{"Frostmere Map":1,"Frozen Sigil":2,"Silver Bar":1},description:"Bind a boss lure that improves repeat boss chest payouts."},
      {id:"venomkit",name:"Mire Venom Kit",level:55,time:9500,xp:122,item:"Venom Oil",qty:1,costs:{"Mire Map":1,"Rotbloom":1,"Raw Ember Eel":1},description:"Use mire route knowledge to stabilize a stronger offensive oil."},
      {id:"wardkit",name:"Sunscar Ward Kit",level:70,time:10800,xp:170,item:"Ward Draught",qty:1,costs:{"Sunscar Map":1,"Sunscar Hide":2,"Runic Bar":1},description:"Prepare warding supplies for harsh environments and boss pressure."},
      {id:"fortunekit",name:"Tempest Fortune Route",level:82,time:12200,xp:240,item:"Fortune Philter",qty:1,costs:{"Tempest Map":1,"Stormglass":2,"Astral Bar":1},description:"Convert storm route planning into high-value treasure philters."},
      {id:"reforgekit",name:"Astral Trophy Route",level:92,time:13800,xp:330,item:"Reforge Token",qty:1,costs:{"Astral Scar Map":1,"Void Shard":2,"Forge Essence":2},description:"Follow late-game trophy routes to recover reforging services."}
    ]
  }
};

const defaultState = () => ({
  characterName:"Rowan", combatStyle:"balanced", selectedEnemies:Array(zoneData.length).fill(0),
  autoEat:false, combatChain:0, bossDefeated:Array(zoneData.length).fill(false), zoneThreats:Array(zoneData.length).fill(0),
  coins:0, inventory:{}, equipment:{ weapon:"Rusty Sword", shield:"Wooden Shield", body:"Leather Jerkin", head:"None" },
  gearVault:[], gearMigrated:false, nextGearId:1, lockedItems:[], lockedGear:[],
  skills:{ mining:{xp:0,masteryXp:0}, woodcutting:{xp:0,masteryXp:0}, fishing:{xp:0,masteryXp:0}, cartography:{xp:0,masteryXp:0}, smithing:{xp:0,masteryXp:0}, cooking:{xp:0,masteryXp:0}, alchemy:{xp:0,masteryXp:0}, huntsmanship:{xp:0,masteryXp:0}, attack:{xp:0}, strength:{xp:0}, defence:{xp:0}, hitpoints:{xp:0} },
  upgrades:{
    mining:{speed:0,yield:0,mastery:0}, woodcutting:{speed:0,yield:0,mastery:0},
    fishing:{speed:0,yield:0,mastery:0}, cartography:{speed:0,yield:0,mastery:0},
    smithing:{speed:0,yield:0,mastery:0}, cooking:{speed:0,yield:0,mastery:0},
    alchemy:{speed:0,yield:0,mastery:0}, huntsmanship:{speed:0,yield:0,mastery:0}
  },
  activeSkill:null, selectedActions:{mining:"copper",woodcutting:"normal",fishing:"shrimp",cartography:"trail",smithing:"bronze",cooking:"stew",alchemy:"health",huntsmanship:"snare"},
  productionQueue:[], queueRunning:false, nextQueueId:1,
  actionMastery:{},
  buffs:{battle:0,artisan:0,prospector:0,trailmeal:0,wardenmeal:0,embermeal:0,tunameal:0,stormmeal:0,frostmeal:0,leviathanmeal:0,ironbark:0,swiftwater:0,venom:0,ward:0,fortune:0,tracking:0,huntermark:0,bosslure:0},
  enemyStatus:{}, playerStatus:{poisonTicks:0,poisonNext:0},
  combatEvent:{id:"",expiresAt:0,nextAt:0},
  combatAutomation:{offline:true,stopHp:15,stopAfter:0,killsRun:0,stopWhenFoodEmpty:false},
  contracts:{day:"",items:[],rerolls:0}, achievements:[], town:{forge:0,storehouse:0,hall:0,shrine:0}, townBranches:{forge:"",storehouse:"",hall:"",shrine:""},
  starterQuests:{progress:{},claimed:[]}, chapters:{claimed:[]}, bounties:{}, townContributions:{}, gearCollections:{claimed:[]},
  relicsActivated:{}, bestiary:{kills:{},drops:{},bosses:{}},
  market:{day:"",stock:[],purchases:{},contractRerolls:0},
  blueprints:[],
  craftPity:{}, craftingUi:{filter:"available",search:"",pinned:[],collapsed:{}},
  stats:{actions:0,crafts:0,contracts:0,sold:0,rareGear:0,salvaged:0,reforged:0},
  settings:{music:true,musicVolume:35},
  inventoryUi:{search:"",category:"all",sort:"name"},
  actionElapsed:0, combat:false, attackElapsed:0, enemyAttackElapsed:0, heroHp:100, enemyHp:22, bossPhase:1,
  kills:0, currentZone:0, unlockedZones:1, zoneKills:Array(zoneData.length).fill(0), fightingBoss:false,
  log:["Select Start Combat to begin."], lastSeen:Date.now()
});

migrateAccountSave();
let recoveredSaveOnLoad = false;
let state = loadState();
let currentView = "combat";
let currentSkill = "mining";
let lastTick = performance.now();
let lastLiveRender = 0;
["pointerdown","keydown","touchstart"].forEach(evt=>window.addEventListener(evt,()=>Music.start(),{once:true}));

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

function masteryXpForLevel(level) {
  return Math.floor(xpForLevel(level) * MASTERY_XP_MULTIPLIER);
}

function levelForMasteryXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= masteryXpForLevel(level + 1)) level++;
  return level;
}

function skillLevel(id) { return levelForXp(state.skills[id].xp); }
function masteryLevel(id) { return levelForMasteryXp(state.skills[id].masteryXp || 0); }
function masteryBonus(id, level) { return masteryLevel(id) >= level; }
function achievementBonus(key,context={}) {
  return achievementData.reduce((total,achievement)=>{
    if (!state.achievements.includes(achievement.id)) return total;
    if (achievement.zoneIndex!==undefined && context.zone!==achievement.zoneIndex) return total;
    if (achievement.enemyName && context.enemy!==achievement.enemyName) return total;
    return total+(achievement.bonuses||[])
      .filter(bonus=>bonus.key===key)
      .reduce((sum,bonus)=>sum+bonus.amount,0);
  },0);
}
function achievementsForTrack(track) {
  return achievementData.filter(achievement=>achievement.trackId===track.id);
}
function achievementTrackState(track) {
  const milestones=achievementsForTrack(track);
  const completed=milestones.filter(achievement=>state.achievements.includes(achievement.id)).length;
  const next=milestones.find(achievement=>!state.achievements.includes(achievement.id))||null;
  const progress=achievementProgress(next||milestones[milestones.length-1]);
  return {milestones,completed,next,progress,complete:completed===milestones.length};
}
function masteryXpGain(action,skill=null) {
  const id=skill||state.activeSkill||currentSkill;
  const rank=state.upgrades[id]?.mastery||0;
  const training=townBranch("shrine","training") ? (state.town.shrine||0)*.01 : 0;
  return Math.max(1,Math.round(action.xp*(1+rank*.05)*(1+achievementBonus("masteryXp")+training)));
}
function actionMasteryKey(skill,action) { return `${skill}:${action.id}`; }
function actionMasteryXp(skill,action) { return state.actionMastery[actionMasteryKey(skill,action)]||0; }
function actionMasteryXpForLevel(level) { return Math.floor(xpForLevel(level)*2); }
function actionMasteryLevel(skill,action) {
  const xp=actionMasteryXp(skill,action);
  let level=1;
  while (level<50 && xp>=actionMasteryXpForLevel(level+1)) level++;
  return level;
}
function actionMasteryDoubleChance(skill,action) { return Math.min(.25,(actionMasteryLevel(skill,action)-1)*.005); }
function townBranch(project,branch) { return state.townBranches?.[project]===branch; }
function relicActive(name) { return Boolean(state.relicsActivated?.[name]); }
function shrineXpBonus() { return (state.town.shrine||0)*.01; }
function actionTime(skill, action=getAction(skill)) {
  const marketSpeed = state.upgrades[skill].speed * .05;
  const masterySpeed = masteryBonus(skill,50) ? .10 : 0;
  const specializationSpeed=Math.min(.25,(actionMasteryLevel(skill,action)-1)*.005);
  const swiftwaterSpeed=isBuffActive("swiftwater") ? .10 : 0;
  const relicSpeed=skill==="smithing" && relicActive("Molten Core") ? .05 : 0;
  const industrySpeed=!["mining","woodcutting","fishing"].includes(skill) && townBranch("storehouse","industry") ? (state.town.storehouse||0)*.01 : 0;
  const achievementSpeed=achievementBonus("skillSpeed");
  return Math.max(750, Math.round(action.time * (1-marketSpeed) * (1-masterySpeed) * (1-specializationSpeed) * (1-swiftwaterSpeed) * (1-relicSpeed) * (1-industrySpeed) * (1-achievementSpeed)));
}
function actionQuantity(skill, action=getAction(skill)) {
  let quantity = action.qty + state.upgrades[skill].yield;
  if (isBuffActive("prospector") && ["mining","woodcutting","fishing"].includes(skill)) quantity++;
  if (masteryBonus(skill,25)) quantity++;
  if (masteryBonus(skill,75)) quantity++;
  if (masteryBonus(skill,100)) quantity*=2;
  return quantity;
}
function rollActionQuantity(skill,action=getAction(skill)) {
  let quantity=actionQuantity(skill,action);
  const gatheringBranch=["mining","woodcutting","fishing"].includes(skill) && townBranch("storehouse","gathering") ? (state.town.storehouse||0)*.01 : 0;
  const chance=actionMasteryDoubleChance(skill,action)+(state.town.storehouse||0)*.02+gatheringBranch;
  if (Math.random()<Math.min(.75,chance)) quantity+=action.qty;
  return quantity;
}
function actionXp(skill, action=getAction(skill)) {
  const masteryMultiplier=masteryBonus(skill,10) ? 1.05 : 1;
  const artisanMultiplier=isBuffActive("artisan") ? 1.15 : 1;
  const actionMultiplier=1+(actionMasteryLevel(skill,action)-1)*.002;
  const relicMultiplier=relicActive("Worldscar Fragment") ? 1.10 : 1;
  return Math.round(action.xp * masteryMultiplier * artisanMultiplier * actionMultiplier * relicMultiplier * (1+achievementBonus("allXp")+shrineXpBonus()));
}
function actionBatchSize(skill) {
  return 1;
}
function scaledActionCosts(skill,action,batch=actionBatchSize(skill)) {
  return Object.fromEntries(Object.entries(action.costs||{}).map(([item,qty])=>[item,qty*batch]));
}
function canPerformAction(skill,action,batch=actionBatchSize(skill)) {
  return hasCosts(scaledActionCosts(skill,action,batch));
}
function payActionCosts(skill,action,batch=actionBatchSize(skill)) {
  payCosts(scaledActionCosts(skill,action,batch));
}
function upgradeCost(type, level) {
  if (type==="yield") return Math.round(2500*Math.pow(3.6,level));
  const base=type==="speed" ? 50 : type==="mastery" ? 125 : 100;
  return base*Math.pow(2,level);
}
function upgradeUnlocked(skill,type,level) {
  if (type!=="yield") return true;
  return skillLevel(skill)>=yieldUpgradeRequirements[level];
}
function upgradeLockText(skill,type,level) {
  if (type!=="yield" || upgradeUnlocked(skill,type,level)) return "";
  return `Unlocks at ${skillData[skill].name} level ${yieldUpgradeRequirements[level]}`;
}
function gearById(id) { return state.gearVault.find(item=>item.id===id); }
function equipmentBase(ref) { return gearById(ref)?.baseName || ref; }
function gearStats(gear) {
  if (!gear) return {};
  const base=equipmentData[gear.baseName]||{};
  const multiplier=(rarityData[gear.rarity]?.multiplier||1)*(1+(gear.upgrade||0)*.08)*(1+(state.town.forge||0)*.02);
  const stats={};
  ["attack","defence","maxHit","maxHp"].forEach(stat=>stats[stat]=Math.round((base[stat]||0)*multiplier));
  ["crit","dodge"].forEach(stat=>stats[stat]=(base[stat]||0)*multiplier);
  (gear.affixes||[]).forEach(affix=>stats[affix.stat]=(stats[affix.stat]||0)+affix.value);
  return stats;
}
function equipmentSetName(baseName) {
  return Object.entries(equipmentTierData).find(([,tier])=>tier.gear.includes(baseName))?.[0]
    || craftingRecipes.find(recipe=>recipe.name===baseName)?.tier
    || null;
}
function heroModelMarkup(includeId=false) {
  return `<img ${includeId?`id="hero-image"`:""} src="assets/hero.png" alt="${state.characterName}, your adventurer">`;
}
function renderHeroModel(selector,includeId=false) {
  const root=document.querySelector(selector);
  if (!root) return;
  if (root.children.length!==1 || !root.querySelector(":scope > img")) root.innerHTML=heroModelMarkup(includeId);
  root.removeAttribute("data-loadout");
  root.removeAttribute("data-full-set");
  root.removeAttribute("data-highest-tier");
  root.removeAttribute("data-helm-tier");
  root.removeAttribute("data-armor-tier");
  root.removeAttribute("data-weapon-tier");
  root.removeAttribute("data-shield-tier");
  root.className=`hero-model${selector==="#inventory-hero-model" ? " inventory-hero-model" : ""}`;
  const image=root.querySelector("img");
  if (image) image.alt=`${state.characterName}, your adventurer`;
}
function renderHeroModels() {
  renderHeroModel("#hero-model");
  renderHeroModel("#inventory-hero-model");
}
function pulseHeroModel(className) {
  return className;
}
function recipeUnlocked(recipe) { return !recipe.blueprint || state.blueprints.includes(recipe.blueprint); }
function setBonuses() {
  const counts={};
  Object.values(state.equipment).forEach(ref=>{
    const base=equipmentBase(ref);
    const set=equipmentSetName(base);
    if (set) counts[set]=(counts[set]||0)+1;
  });
  const bonus={attack:0,defence:0,maxHit:0,maxHp:0,crit:0,dodge:0};
  Object.entries(counts).forEach(([set,count])=>{
    const tier=equipmentTierData[set];
    if (count>=2) bonus.defence+=tier.bonus[0];
    if (count>=4) {
      bonus.attack+=tier.bonus[1];
      bonus.maxHit+=tier.bonus[2];
    }
  });
  return bonus;
}
function equipmentBonus(stat) {
  const gearTotal=Object.values(state.equipment).reduce((total,ref)=>{
    const gear=gearById(ref);
    return total+(gear?gearStats(gear)[stat]||0:equipmentData[ref]?.[stat]||0);
  },0);
  return gearTotal+(setBonuses()[stat]||0);
}
function maxHp() { return 90 + skillLevel("hitpoints") * 10 + equipmentBonus("maxHp"); }
function attackPower() { return 5 + skillLevel("attack") + equipmentBonus("attack") + Math.floor(skillLevel("smithing")/10); }
function defencePower() {
  const meal=isBuffActive("wardenmeal") ? 5 : 0;
  const elixir=isBuffActive("ironbark") ? 8 : 0;
  const branch=townBranch("forge","armor") ? 1+(state.town.forge||0)*.02 : 1;
  return Math.round((3+skillLevel("defence")+equipmentBonus("defence")+meal+elixir)*branch);
}
function baseMaxHit() { return 2 + Math.floor(skillLevel("strength") / 2) + equipmentBonus("maxHit") + (isBuffActive("battle") ? 3 : 0); }
function maxHit() { return Math.max(1,Math.round(baseMaxHit()*(combatStyles[state.combatStyle]?.maxHit||1))); }
function combatLevel() { return Math.max(1, Math.floor((skillLevel("attack")+skillLevel("strength")+skillLevel("defence")+skillLevel("hitpoints"))/4)); }
function currentZone() { return zoneData[state.currentZone]; }
function currentEnvironment() { return currentZone().environment||{}; }
function maxThreatRank(index=state.currentZone) {
  if (!state.bossDefeated[index]) return 0;
  const clears=Math.floor((state.zoneKills[index]||0)/Math.max(1,zoneData[index].requiredKills));
  return Math.min(MAX_THREAT,Math.max(1,clears));
}
function zoneThreatRank(index=state.currentZone) {
  return Math.min(maxThreatRank(index),Math.max(0,Number(state.zoneThreats?.[index])||0));
}
function zoneThreatMultiplier(index=state.currentZone) { return 1+zoneThreatRank(index)*.18; }
function threatGearChance(index=state.currentZone,enemyName="") {
  const enemy=enemyName||(index===state.currentZone ? currentEnemy()?.name : "");
  const achievementChance=achievementBonus("gearChance",{zone:index,enemy});
  const hunterMark=isBuffActive("huntermark") ? .025 : 0;
  return Math.min(.24,.035+zoneThreatRank(index)*.015+(townBranch("hall","hunters")?(state.town.hall||0)*.02:0)+(relicActive("Solar Core") ? .02 : 0)+(isBuffActive("fortune") ? .04 : 0)+hunterMark+achievementChance);
}
function combatDamageMultiplier() {
  const relic=relicActive("Cinder Crown") ? .05 : 0;
  const branch=townBranch("forge","arms") ? (state.town.forge||0)*.02 : 0;
  const venom=isBuffActive("venom") ? .08 : 0;
  const feast=isBuffActive("leviathanmeal") ? .10 : 0;
  return 1+relic+branch+venom+feast;
}
function playerAttackTime() {
  const meal=isBuffActive("embermeal") ? .05 : 0;
  const relic=relicActive("Tempest Heart") ? .05 : 0;
  const ward=isBuffActive("ward") ? .5 : 1;
  const environment=1+((currentEnvironment().playerAttackTime||1)-1)*ward;
  return Math.round(2400*(combatStyles[state.combatStyle]?.attackSpeed||1)*environment*(1-meal)*(1-relic));
}
function currentEnemy() {
  if (state.fightingBoss) return currentZone().boss;
  return currentZone().enemies[state.selectedEnemies[state.currentZone]||0] || currentZone().enemies[0];
}
function enemyMaxHp(enemy=currentEnemy()) { return Math.round(enemy.hp*(1+zoneThreatRank()*.12)); }
function enemyMaxHitValue(enemy=currentEnemy()) { return Math.round(enemy.maxHit*(1+zoneThreatRank()*.08)); }
function enemyAttackTime(enemy=currentEnemy()) {
  const phase=state.fightingBoss ? Math.max(0,(state.bossPhase||1)-1) : 0;
  const ward=(isBuffActive("ward")||isBuffActive("frostmeal")) ? .5 : 1;
  const environment=1+((currentEnvironment().enemyAttackTime||1)-1)*ward;
  return Math.max(900,Math.round(enemy.attackTime*environment*(1-zoneThreatRank()*.02)*(1-phase*.05)));
}
function enemyCoinRange(enemy=currentEnemy()) {
  const achievementCoins=achievementBonus("combatCoins",{zone:state.currentZone,enemy:enemy.name});
  const bossCoins=state.fightingBoss ? achievementBonus("bossCoins") : 0;
  const multiplier=zoneThreatMultiplier()*(relicActive("Trailbreaker Crest")?1.05:1)*(1+achievementCoins+bossCoins);
  return enemy.coins.map(value=>Math.round(value*multiplier));
}
function enemyBonusDropChance(enemy=currentEnemy(),zoneIndex=state.currentZone,chain=state.combatChain||0) {
  if (!enemy?.bonusItem) return 0;
  const base=enemy.bonusChance ?? .45;
  return Math.min(.85,base+zoneThreatRank(zoneIndex)*.025+Math.min(.08,chain*.002));
}
function zoneCacheChance(zoneIndex=state.currentZone,chain=state.combatChain||0) {
  const cache=zoneData[zoneIndex]?.cache;
  if (!cache) return 0;
  return Math.min(.42,(cache.chance||0)+zoneThreatRank(zoneIndex)*.025+Math.min(.06,chain*.002)+(isBuffActive("fortune") ? .03 : 0)+(isBuffActive("tracking") ? .04 : 0));
}
function weightedDrop(entries=[]) {
  const total=entries.reduce((sum,entry)=>sum+(entry.weight||1),0);
  if (!total) return null;
  let roll=Math.random()*total;
  return entries.find(entry=>(roll-=entry.weight||1)<=0) || entries[entries.length-1];
}
function dropQuantity(entry={},scale=1) {
  const qty=Array.isArray(entry.qty)
    ? entry.qty[0]+Math.floor(Math.random()*(entry.qty[1]-entry.qty[0]+1))
    : entry.qty||1;
  return Math.max(1,Math.round(qty*scale));
}
function addRewardItem(reward,item,qty) {
  const amount=Math.max(0,Math.round(qty||0));
  if (!item || amount<=0) return;
  reward.items[item]=(reward.items[item]||0)+amount;
}
function mergeRewardItems(target,items={}) {
  Object.entries(items).forEach(([item,qty])=>addRewardItem(target,item,qty));
  return target;
}
function rollZoneCacheReward(zoneIndex=state.currentZone,rolls=1,scale=1) {
  const cache=zoneData[zoneIndex]?.cache;
  const reward=makeReward(0,{});
  if (!cache?.items?.length || rolls<=0) return reward;
  for (let index=0;index<rolls;index++) {
    const drop=weightedDrop(cache.items);
    if (drop) addRewardItem(reward,drop.item,dropQuantity(drop,scale));
  }
  return reward;
}
function bossFirstClearReward(zoneIndex=state.currentZone,enemy=currentEnemy()) {
  const reward=makeReward(400+zoneIndex*325,{});
  mergeRewardItems(reward,rollZoneCacheReward(zoneIndex,3+Math.ceil(zoneIndex/2),1.35+zoneIndex*.08).items);
  addRewardItem(reward,"Forge Essence",2+zoneIndex);
  if (zoneIndex>=1) addRewardItem(reward,"Reforge Token",1+Math.floor(zoneIndex/3));
  if (zoneIndex<=2) addRewardItem(reward,"Battle Tonic",1+zoneIndex);
  if (zoneIndex>=4) addRewardItem(reward,"Fortune Philter",1);
  return reward;
}
function rollBossChestReward(zoneIndex=state.currentZone,enemy=currentEnemy(),firstClear=false) {
  const repeatKills=state.bestiary.bosses?.[enemy.name]||0;
  const threat=zoneThreatRank(zoneIndex);
  const bossLure=isBuffActive("bosslure") && !firstClear;
  const baseCoins=firstClear
    ? 0
    : Math.round((enemy.coins?.[0]||0)*(.35+threat*.1+Math.min(.65,repeatKills*.045)));
  const reward=makeReward(baseCoins,{});
  const cacheRolls=firstClear
    ? 0
    : 2+Math.min(4,threat)+Math.min(6,Math.floor(Math.sqrt(repeatKills+1))*2)+(bossLure ? 2 : 0);
  if (cacheRolls) mergeRewardItems(reward,rollZoneCacheReward(zoneIndex,cacheRolls,1.15+threat*.15+Math.min(.75,repeatKills*.04)).items);
  if (firstClear) {
    const firstReward=bossFirstClearReward(zoneIndex,enemy);
    mergeRewardItems(reward,firstReward.items);
    reward.coins+=(firstReward.coins||0);
  } else {
    addRewardItem(reward,"Forge Essence",1+Math.floor(zoneIndex/2)+Math.floor(threat/2)+Math.floor(repeatKills/5)+(bossLure ? 1 : 0));
    if (zoneIndex>=1 || threat>=2 || repeatKills>0 || bossLure) addRewardItem(reward,"Reforge Token",1+Math.floor(threat/3)+Math.floor(repeatKills/8)+(bossLure ? 1 : 0));
    if (repeatKills>0 && (repeatKills+1)%5===0) addRewardItem(reward,enemy.item,1+Math.floor(threat/4));
    if (repeatKills>=9 || threat>=4) addRewardItem(reward,"Fortune Philter",1);
  }
  return reward;
}
function bossChestPreviewText(zoneIndex=state.currentZone) {
  const zone=zoneData[zoneIndex], boss=zone.boss;
  const repeatKills=state.bestiary.bosses?.[boss.name]||0;
  const threat=zoneThreatRank(zoneIndex);
  if (!state.bossDefeated[zoneIndex]) {
    const tokenText=zoneIndex>=1 ? `, ${1+Math.floor(zoneIndex/3)} Reforge Token` : "";
    return `First-clear chest - rare gear, ${3+Math.ceil(zoneIndex/2)} cache rolls, ${2+zoneIndex} Essence${tokenText}`;
  }
  const cacheRolls=2+Math.min(4,threat)+Math.min(6,Math.floor(Math.sqrt(repeatKills+1))*2);
  const bossLure=isBuffActive("bosslure");
  const lureCacheRolls=cacheRolls+(bossLure ? 2 : 0);
  const essence=1+Math.floor(zoneIndex/2)+Math.floor(threat/2)+Math.floor(repeatKills/5)+(bossLure ? 1 : 0);
  const tokens=(zoneIndex>=1 || threat>=2 || repeatKills>0 || bossLure) ? 1+Math.floor(threat/3)+Math.floor(repeatKills/8)+(bossLure ? 1 : 0) : 0;
  return `Repeat chest - ${lureCacheRolls} cache rolls, ${essence} Essence${tokens?`, ${tokens} Reforge Token`: ""}${bossLure ? " - Boss Lure active" : ""}`;
}
function grantCombatCoins(reward,coins,track=true) {
  const amount=Math.max(0,Math.round(coins||0));
  if (!amount) return;
  state.coins+=amount;
  reward.coins=(reward.coins||0)+amount;
  if (track) activity(`+${amount} coins`,"coins");
}
function grantCombatItem(reward,item,qty,track=true) {
  const amount=Math.max(0,Math.round(qty||0));
  if (!item || amount<=0) return;
  addItem(item,amount,track);
  bestiaryDrop(item,amount);
  addRewardItem(reward,item,amount);
}
function grantCombatReward(reward,extra={},track=true) {
  grantCombatCoins(reward,extra.coins||0,track);
  Object.entries(extra.items||{}).forEach(([item,qty])=>grantCombatItem(reward,item,qty,track));
}
function currentEnemyTrait() { return enemyTraits[currentEnemy().name] || {name:"Unremarkable",description:"No special combat modifier."}; }
function enemyDefence(enemy=currentEnemy()) {
  const phase=state.fightingBoss ? Math.max(0,(state.bossPhase||1)-1) : 0;
  const base=3+enemy.level*1.2+(currentEnemyTrait().armor||0)*2+zoneThreatRank()*3+phase*2;
  const ward=(isBuffActive("ward")||isBuffActive("frostmeal")) ? .5 : 1;
  const environment=1+((currentEnvironment().enemyDefence||1)-1)*ward;
  return base*environment;
}
function hitChance() {
  const style=combatStyles[state.combatStyle]||combatStyles.balanced;
  const attack=attackPower()*(style.accuracy||1);
  const defence=enemyDefence();
  const ward=(isBuffActive("ward")||isBuffActive("frostmeal")) ? .5 : 1;
  const environmentEvasion=(currentEnvironment().evasion||0)*ward;
  return Math.max(.22,Math.min(.96,.68+(attack-defence)/Math.max(30,attack+defence)-(currentEnemyTrait().evasion||0)-environmentEvasion));
}
function healingMultiplier() {
  if (!state.combat) return 1;
  const relic=relicActive("Warden Horn") ? .10 : 0;
  const ward=isBuffActive("ward") ? .5 : 1;
  return Math.max(.35,1-(currentEnvironment().healingReduction||0)*ward-(currentEnemyTrait().healingReduction||0)+relic);
}
function critChance() {
  const style=combatStyles[state.combatStyle]||combatStyles.balanced;
  return Math.min(.45,.04+(style.crit||0)+skillLevel("attack")*.0006+equipmentBonus("crit")+(isBuffActive("stormmeal") ? .05 : 0));
}
function bossReady(zoneIndex=state.currentZone) { return state.zoneKills[zoneIndex] >= zoneData[zoneIndex].requiredKills; }
function skillIconPath(id) { return `assets/skills/${id}-v2.png`; }
function combatXpText(style) {
  return Object.entries(style.xp).map(([id,rate])=>`${capitalize(id)} +${rate}`).join(" / ") + " XP per damage";
}
function addItem(name, qty, track=false) {
  state.inventory[name] = (state.inventory[name] || 0) + qty;
  if (state.inventory[name] <= 0) delete state.inventory[name];
  if (track && qty>0) activity(`+${qty} ${name}`,"item");
}
function rewardItemsText(items={}) {
  return Object.entries(items)
    .filter(([,qty])=>qty>0)
    .map(([item,qty])=>`${qty.toLocaleString()} ${item}`)
    .join(" + ");
}
function formatReward(reward={}) {
  const parts=[];
  if (reward.coins) parts.push(`${reward.coins.toLocaleString()} coins`);
  const itemText=rewardItemsText(reward.items);
  if (itemText) parts.push(itemText);
  if (reward.gear?.length) parts.push(`${reward.gear.join(", ")} gear`);
  if (reward.gearNames?.length) parts.push(`${reward.gearNames.join(", ")} gear`);
  return parts.join(" + ")||"No reward";
}
function grantReward(reward={},trackActivity=false) {
  if (reward.coins) state.coins+=reward.coins;
  Object.entries(reward.items||{}).forEach(([item,qty])=>addItem(item,qty,trackActivity));
  (reward.gear||[]).forEach(baseName=>{
    const gear=createGear(baseName,"common");
    if (trackActivity) activity(`Gear reward: ${gearDisplayName(gear)}`,"gear");
  });
}
function mergeRewards(rewards=[]) {
  return rewards.reduce((merged,reward={})=>{
    merged.coins+=(reward.coins||0);
    Object.entries(reward.items||{}).forEach(([item,qty])=>merged.items[item]=(merged.items[item]||0)+qty);
    merged.gear.push(...(reward.gear||[]));
    merged.gearNames.push(...(reward.gearNames||[]));
    return merged;
  },{coins:0,items:{},gear:[],gearNames:[]});
}
function showRewardReveal(title,reward={},subtitle="Rewards claimed") {
  const modal=document.querySelector("#reward-modal");
  if (!modal) return;
  document.querySelector("#reward-title").textContent=title;
  document.querySelector("#reward-subtitle").textContent=subtitle;
  const entries=[];
  if (reward.coins) entries.push(`<div class="reward-entry coins"><strong>${reward.coins.toLocaleString()}</strong><span>Coins</span></div>`);
  Object.entries(reward.items||{}).filter(([,qty])=>qty>0).forEach(([item,qty])=>{
    entries.push(`<div class="reward-entry">${itemIcon(item)}<strong>${qty.toLocaleString()}</strong><span>${item}</span></div>`);
  });
  (reward.gear||[]).forEach(item=>entries.push(`<div class="reward-entry gear">${itemIcon(item)}<strong>Gear</strong><span>${item}</span></div>`));
  (reward.gearNames||[]).forEach(item=>entries.push(`<div class="reward-entry gear"><strong>Gear</strong><span>${item}</span></div>`));
  document.querySelector("#reward-list").innerHTML=entries.join("")||`<div class="reward-entry"><strong>Done</strong><span>Progress recorded</span></div>`;
  modal.classList.remove("hidden");
}
function hasCosts(costs={}) { return Object.entries(costs).every(([item,qty]) => (state.inventory[item]||0) >= qty); }
function payCosts(costs={}) { Object.entries(costs).forEach(([item,qty]) => addItem(item,-qty)); }
function isBuffActive(id) { return (state.buffs?.[id]||0)>Date.now(); }
function itemMeta(name) {
  if (itemData[name]) return itemData[name];
  if (equipmentData[name]?.slot) return {icon:equipmentData[name].slot,category:"Equipment",description:"Forged equipment made for Emberfall's dangerous frontiers.",use:`Equip for ${equipmentStatsText(name) || "adventuring utility"}.`,value:Math.max(5,(craftingRecipes.find(r=>r.name===name)?.level||1)*3)};
  const producingSkill=productionSkills.find(id=>skillData[id]?.actions.some(action=>action.item===name));
  const recipes=[
    ...productionSkills.flatMap(id=>skillData[id]?.actions||[]),
    ...craftingRecipes
  ].filter(recipe=>recipe.costs?.[name]);
  const isTrophy=zoneData.some(zone=>zone.boss.item===name);
  const isSpoil=zoneData.some(zone=>zone.enemies.some(enemy=>enemy.item===name));
  const category=isTrophy ? "Boss Relic" : isSpoil ? "Combat Material" : producingSkill ? "Skill Resource" : "Material";
  const source=producingSkill ? `${skillData[producingSkill].name} resource` : isTrophy ? "A rare trophy taken from a zone boss." : isSpoil ? "A useful component recovered from an enemy." : "A useful Emberfall material.";
  const relic=relicPowerData[name];
  const craftList=recipes.length ? `${recipes.slice(0,3).map(recipe=>recipe.name).join(", ")}${recipes.length>3?" and more":""}` : "";
  const use=relic
    ? (craftList
        ? `Attune one to unlock ${relic.description} Also forges ${craftList} — attuning permanently spends the trophy, so keep spares for crafting.`
        : `Attune one relic to unlock ${relic.description} Spare copies may be sold.`)
    : craftList ? `Used for ${craftList}.` : "Trade spare stock at the guild for coins.";
  const tier=Math.max(1,...recipes.map(recipe=>recipe.level||1));
  return {icon:itemIconType(name),category,description:source,use,value:Math.max(1,Math.ceil(tier/5))};
}
function itemIconType(name) {
  const value=name.toLowerCase();
  if (value.includes("ore")||value.includes("coal")||value.includes("obsidian")||value.includes("metal")) return "ore";
  if (value.includes("bar")||value.includes("alloy")) return "bar";
  if (value.includes("logs")) return "logs";
  if (value.includes("raw")||value.includes("meat")) return "fish";
  if (value.includes("potion")||value.includes("tonic")||value.includes("draught")||value.includes("focus")) return "potion";
  if (value.includes("map")||value.includes("chart")) return "map";
  if (value.includes("snare")||value.includes("mark")||value.includes("lure")) return "tool";
  if (value.includes("sword")||value.includes("blade")||value.includes("dagger")) return "weapon";
  if (value.includes("shield")||value.includes("aegis")) return "shield";
  if (value.includes("helm")||value.includes("crown")) return "head";
  if (value.includes("plate")||value.includes("jerkin")) return "body";
  return "relic";
}
function itemIcon(name) {
  const type=itemMeta(name).icon||itemIconType(name);
  const file=name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const hue=[...name].reduce((value,char)=>(value*31+char.charCodeAt(0))%360,0);
  return `<span class="item-picture item-${type}" style="--icon-hue:${hue}deg" aria-hidden="true"><img src="assets/items-clean/${file}.png" alt="" onerror="this.remove()"><i></i></span>`;
}
function rollRarity(bonus=0) {
  const roll=Math.random()*100-bonus;
  if (roll<1) return "legendary";
  if (roll<5) return "epic";
  if (roll<15) return "rare";
  if (roll<40) return "uncommon";
  return "common";
}
function rarityAtLeast(rarity,floor) {
  const order=Object.keys(rarityData);
  return order[Math.max(order.indexOf(rarity),order.indexOf(floor))];
}
function craftingRarityFloor() {
  const mastery=masteryLevel("smithing");
  if (mastery>=90) return "epic";
  if (mastery>=60) return "rare";
  if (mastery>=25) return "uncommon";
  return "common";
}
function rollCraftRarity(baseName) {
  const tier=equipmentSetName(baseName)||"Bronze";
  const luck=Math.floor(masteryLevel("smithing")/10)+(townBranch("hall","artisans")?(state.town.hall||0):0)+achievementBonus("craftLuck");
  const pity=state.craftPity[tier]||0;
  let rarity=rarityAtLeast(rollRarity(luck+pity*1.5),craftingRarityFloor());
  if (pity>=7) rarity=rarityAtLeast(rarity,"rare");
  const rareOrBetter=["rare","epic","legendary"].includes(rarity);
  state.craftPity[tier]=rareOrBetter ? 0 : pity+1;
  return rarity;
}
function rollAffixes(rarity) {
  const count=rarityData[rarity]?.affixes||0;
  const pool=Object.keys(affixData);
  const affixes=[];
  while (affixes.length<count && pool.length) {
    const index=Math.floor(Math.random()*pool.length);
    const id=pool.splice(index,1)[0], data=affixData[id];
    const value=data.range[0]+Math.random()*(data.range[1]-data.range[0]);
    affixes.push({id,stat:data.stat,value:["crit","dodge"].includes(data.stat)?Number(value.toFixed(3)):Math.round(value)});
  }
  return affixes;
}
function createGear(baseName,rarity=rollRarity(Math.floor(masteryLevel("smithing")/10))) {
  const gear={id:`gear-${state.nextGearId++}`,baseName,rarity,upgrade:0,affixes:rollAffixes(rarity)};
  state.gearVault.push(gear);
  if (["rare","epic","legendary"].includes(rarity)) {
    state.stats.rareGear=(state.stats.rareGear||0)+1;
  }
  return gear;
}
function gearDisplayName(gear) {
  if (!gear) return "Unknown Gear";
  const prefix=gear.affixes?.[0] ? `${affixData[gear.affixes[0].id]?.name} ` : "";
  return `${prefix}${gear.baseName}${gear.upgrade?` +${gear.upgrade}`:""}`;
}
function gearValue(gear) {
  const base=Math.max(5,(craftingRecipes.find(recipe=>recipe.name===gear.baseName)?.level||5)*3);
  const rarityIndex=Object.keys(rarityData).indexOf(gear.rarity)+1;
  return Math.max(5,Math.round(base*(1+rarityIndex*.65)*(1+(gear.upgrade||0)*.5)));
}
function todayKey() { return new Date().toISOString().slice(0,10); }
function seededIndex(seed,length) {
  let hash=0;
  for (const char of seed) hash=(hash*31+char.charCodeAt(0))>>>0;
  return length ? hash%length : 0;
}
function makeReward(coins,items={}) {
  return {
    coins:Math.round(coins),
    items:Object.fromEntries(Object.entries(items)
      .map(([item,qty])=>[item,Math.round(qty)])
      .filter(([,qty])=>qty>0))
  };
}
function repairReward(reward={},fallbackItem="Health Potion") {
  if (reward.items) return {coins:Math.round(reward.coins||0),items:{...reward.items}};
  const supply=reward.supplies||reward["res"+"onance"]||1;
  return makeReward(reward.coins||0,{[fallbackItem]:Math.max(1,Math.ceil(supply/5))});
}
function contractFallbackItem(contract={}) {
  if (contract.type==="item" && contract.target && contract.target!=="any") return contract.target;
  if (contract.type==="crafts") return "Forge Essence";
  if (contract.type==="kills") return "Health Potion";
  return "Bronze Bar";
}
function shouldUseStarterContracts(reroll=0) {
  return !reroll
    && (state.stats.contracts||0)<STARTER_CONTRACT_THRESHOLD.contracts
    && (state.kills||0)<STARTER_CONTRACT_THRESHOLD.kills
    && skillLevel("mining")<STARTER_CONTRACT_THRESHOLD.mining;
}
function starterContractsForDay(day) {
  return [
    {
      id:`${day}-starter-copper`,type:"item",target:"Copper Ore",name:"Starter: Copper Stock",
      description:"Mine Copper Ore for your first bronze route. The reward gives enough Tin to start smelting.",
      goal:12,progress:0,reward:makeReward(120,{"Tin Ore":6,"Health Potion":2}),claimed:false
    },
    {
      id:`${day}-starter-tin`,type:"item",target:"Tin Ore",name:"Starter: Tin Stock",
      description:"Mine Tin Ore so the bronze loop does not stall at the first bar.",
      goal:10,progress:0,reward:makeReward(140,{"Copper Ore":6,"Logs":4}),claimed:false
    },
    {
      id:`${day}-starter-trail`,type:"kills",target:"Greenveil Goblin",name:"Starter: Greenveil Patrol",
      description:"Defeat Greenveil Goblins and stock early alchemy materials.",
      goal:3,progress:0,reward:makeReward(180,{"Goblin Scrap":5,"Field Stew":2}),claimed:false
    }
  ];
}
function ensureContracts(force=false) {
  const day=todayKey();
  if (!force && state.contracts.day===day && state.contracts.items.length) return;
  if (state.contracts.day!==day) state.contracts.rerolls=0;
  const reroll=state.contracts.rerolls||0;
  if (shouldUseStarterContracts(reroll)) {
    state.contracts={day,rerolls:reroll,items:starterContractsForDay(day)};
    return;
  }
  const unlockedActions=productionSkills.flatMap(skill=>skillData[skill].actions.filter(action=>skillLevel(skill)>=action.level).map(action=>({skill,action})));
  const gathering=unlockedActions.filter(entry=>["mining","woodcutting","fishing"].includes(entry.skill));
  const selected=gathering[seededIndex(`${day}-${reroll}-gather`,gathering.length)]||{skill:"mining",action:skillData.mining.actions[0]};
  const zoneIndex=Math.min(state.unlockedZones-1,seededIndex(`${day}-${reroll}-zone`,state.unlockedZones));
  const zone=zoneData[zoneIndex];
  const hall=state.town.hall||0;
  const rewardMultiplier=(1+hall*.05)*(1+achievementBonus("contractRewards"));
  const materialMultiplier=(1+achievementBonus("contractRewards"))*(townBranch("shrine","quartermaster")?1+(state.town.shrine||0)*.02:1);
  const gatherGoal=Math.max(30,10+skillLevel(selected.skill)*2);
  const huntGoal=20+zoneIndex*5;
  const workIsCraft=skillLevel("smithing")>=5;
  state.contracts={
    day,rerolls:reroll,
    items:[
      {id:`${day}-gather`,type:"item",target:selected.action.item,name:`Supply: ${selected.action.item}`,description:`Acquire ${selected.action.item} through skill actions.`,goal:gatherGoal,progress:0,reward:makeReward(250*rewardMultiplier,{[selected.action.item]:Math.ceil(gatherGoal*.2*materialMultiplier)}),claimed:false},
      {id:`${day}-hunt`,type:"kills",target:"any",name:`Control: ${zone.name}`,description:`Defeat enemies while preparing for ${zone.name}. Any combat kill advances this contract.`,goal:huntGoal,rewardZone:zoneIndex,progress:0,reward:makeReward((350+zoneIndex*60)*rewardMultiplier,{[zone.enemies[0].item]:Math.ceil((6+zoneIndex*2)*materialMultiplier)}),claimed:false},
      {id:`${day}-work`,type:workIsCraft?"crafts":"actions",target:"any",name:workIsCraft?"Guild Armory":"Guild Labor",description:workIsCraft?"Craft equipment for the guild.":"Complete productive skill actions.",goal:workIsCraft?3:50,progress:0,reward:makeReward(450*rewardMultiplier,{[workIsCraft?"Forge Essence":"Bronze Bar"]:Math.ceil((workIsCraft?3:5)*materialMultiplier)}),claimed:false}
    ]
  };
}
function contractMatchesPayload(contract,payload={}) {
  if (contract.target==="any") return true;
  return [payload.item,payload.skill,payload.enemy,`zone:${payload.zone}`].includes(contract.target);
}
function starterQuestProgress(quest) {
  const stored=state.starterQuests.progress[quest.id]||0;
  if (quest.type==="item") return Math.min(quest.goal,Math.max(stored,state.inventory[quest.target]||0));
  if (quest.type==="enemyKills") return Math.min(quest.goal,Math.max(stored,state.bestiary.kills[quest.target]||0));
  if (quest.type==="crafts") return Math.min(quest.goal,Math.max(stored,state.gearVault.filter(gear=>gear.baseName===quest.target).length));
  return Math.min(quest.goal,stored);
}
function starterQuestClaimed(quest) {
  return state.starterQuests.claimed.includes(quest.id);
}
function starterQuestMatches(quest,type,payload={}) {
  if (quest.type==="item") return type==="item" && payload.item===quest.target;
  if (quest.type==="crafts") return type==="crafts" && payload.item===quest.target;
  if (quest.type==="enemyKills") return type==="kills" && payload.enemy===quest.target;
  return false;
}
function trackStarterQuestProgress(type,payload={},amount=1) {
  starterQuestData.forEach(quest=>{
    if (starterQuestClaimed(quest) || !starterQuestMatches(quest,type,payload)) return;
    const before=starterQuestProgress(quest);
    const next=Math.min(quest.goal,before+amount);
    state.starterQuests.progress[quest.id]=next;
    if (before<quest.goal && next>=quest.goal) {
      activity(`Starter step ready: ${quest.name}`,"contract");
      toast(`${quest.name} complete`);
    }
  });
}
function claimStarterQuest(id) {
  const quest=starterQuestData.find(item=>item.id===id);
  if (!quest || starterQuestClaimed(quest) || starterQuestProgress(quest)<quest.goal) return;
  state.starterQuests.progress[quest.id]=quest.goal;
  state.starterQuests.claimed.push(quest.id);
  grantReward(quest.reward,true);
  showRewardReveal(quest.name,quest.reward,"Starter path reward");
  activity(`Starter reward: ${formatReward(quest.reward)}`,"contract");
  saveState();
  renderAdventure();
  renderLive();
}
function chapterStepProgress(step) {
  if (step.type==="item") return Math.min(step.goal,state.inventory[step.target]||0);
  if (step.type==="gear") return Math.min(step.goal,state.gearVault.filter(gear=>gear.baseName===step.target).length);
  if (step.type==="enemyKills") return Math.min(step.goal,state.bestiary.kills[step.target]||0);
  if (step.type==="zoneKills") return Math.min(step.goal,state.zoneKills[step.target]||0);
  if (step.type==="bossKills") return Math.min(step.goal,state.bestiary.bosses[step.target]||0);
  if (step.type==="townLevel") return Math.min(step.goal,state.town[step.target]||0);
  return 0;
}
function chapterState(zoneIndex) {
  const chapter=chapterDefinitions(zoneIndex);
  const steps=chapter.steps.map(step=>({...step,progress:chapterStepProgress(step),complete:chapterStepProgress(step)>=step.goal}));
  const complete=steps.every(step=>step.complete);
  const claimed=state.chapters.claimed.includes(chapter.id);
  const next=steps.find(step=>!step.complete)||null;
  return {...chapter,steps,complete,claimed,next};
}
function nextChapterObjective() {
  for (let index=0;index<state.unlockedZones;index++) {
    const chapter=chapterState(index);
    if (!chapter.claimed) return chapter;
  }
  const nextIndex=Math.min(state.unlockedZones,zoneData.length-1);
  return chapterState(nextIndex);
}
function claimChapter(id) {
  const zoneIndex=Number(String(id).split("-")[1]);
  const chapter=chapterState(zoneIndex);
  if (!chapter || chapter.claimed || !chapter.complete) return;
  state.chapters.claimed.push(chapter.id);
  grantReward(chapter.reward,true);
  showRewardReveal(chapter.name,chapter.reward,"Chapter complete");
  activity(`Chapter complete: ${chapter.name}`,"achievement");
  saveState();
  render();
}
function bountyKey(zoneIndex,id) {
  return `${zoneIndex}:${id}`;
}
function zoneBountyState(zoneIndex,id) {
  return state.bounties[bountyKey(zoneIndex,id)]||{progress:0,completions:0};
}
function setZoneBountyState(zoneIndex,id,next) {
  state.bounties[bountyKey(zoneIndex,id)]={progress:Math.max(0,Math.round(next.progress||0)),completions:Math.max(0,Math.round(next.completions||0))};
}
function bountyGoal(zoneIndex,bounty) {
  const completed=zoneBountyState(zoneIndex,bounty.id).completions||0;
  if (bounty.type==="bossKills") return bounty.baseGoal+Math.floor(completed/2);
  return Math.ceil(bounty.baseGoal*(1+completed*.35));
}
function bountyReward(zoneIndex,bounty) {
  return bounty.reward(zoneBountyState(zoneIndex,bounty.id).completions||0);
}
function bountyMatchesProgress(zoneIndex,bounty,type,payload={}) {
  if (bounty.type==="zoneKills") return type==="kills" && payload.zone===zoneIndex;
  if (bounty.type==="enemyKills") return type==="kills" && payload.enemy===bounty.target;
  if (bounty.type==="bossKills") return type==="bosses" && payload.enemy===bounty.target;
  return false;
}
function trackBountyProgress(type,payload={},amount=1) {
  zoneData.slice(0,state.unlockedZones).forEach((zone,zoneIndex)=>{
    zoneBountyDefinitions(zoneIndex).forEach(bounty=>{
      if (!bountyMatchesProgress(zoneIndex,bounty,type,payload)) return;
      const current=zoneBountyState(zoneIndex,bounty.id);
      const goal=bountyGoal(zoneIndex,bounty);
      const before=current.progress||0;
      const next=Math.min(goal,before+amount);
      setZoneBountyState(zoneIndex,bounty.id,{...current,progress:next});
      if (before<goal && next>=goal) {
        activity(`Bounty ready: ${bounty.name}`,"contract");
        toast(`${bounty.name} complete`);
      }
    });
  });
}
function claimBounty(zoneIndex,id) {
  const bounty=zoneBountyDefinitions(zoneIndex).find(item=>item.id===id);
  if (!bounty || zoneIndex>=state.unlockedZones) return;
  const current=zoneBountyState(zoneIndex,id);
  const goal=bountyGoal(zoneIndex,bounty);
  if ((current.progress||0)<goal) return;
  const reward=bountyReward(zoneIndex,bounty);
  grantReward(reward,true);
  showRewardReveal(bounty.name,reward,"Bounty reward");
  setZoneBountyState(zoneIndex,id,{
    progress:Math.max(0,(current.progress||0)-goal),
    completions:(current.completions||0)+1
  });
  activity(`Bounty reward: ${formatReward(reward)}`,"contract");
  checkAchievements();
  saveState();
  renderAdventure();
  renderLive();
}
function recordProgress(type,payload={},amount=1) {
  state.stats[type]=(state.stats[type]||0)+amount;
  ensureContracts();
  trackStarterQuestProgress(type,payload,amount);
  trackBountyProgress(type,payload,amount);
  state.contracts.items.forEach(contract=>{
    if (contract.claimed || contract.progress>=contract.goal || contract.type!==type) return;
    if (!contractMatchesPayload(contract,payload)) return;
    contract.progress=Math.min(contract.goal,contract.progress+amount);
    if (contract.progress>=contract.goal) {
      activity(`Contract ready: ${contract.name}`,"contract");
      toast(`${contract.name} complete`);
    }
  });
  checkAchievements();
}
function achievementProgress(achievement) {
  if (!achievement) return 0;
  if (achievement.type==="kills") return state.kills;
  if (achievement.type==="zoneKills") return state.zoneKills[achievement.zoneIndex]||0;
  if (achievement.type==="enemyKills") return state.bestiary.kills[achievement.enemyName]||0;
  if (achievement.type==="bosses") return Object.values(state.bestiary.bosses).reduce((sum,kills)=>sum+kills,0);
  if (achievement.type==="totalLevel") return Object.keys(state.skills).reduce((sum,skill)=>sum+skillLevel(skill),0);
  if (achievement.type==="bestActionMastery") {
    return Math.max(1,...productionSkills.flatMap(skill=>skillData[skill].actions.map(action=>actionMasteryLevel(skill,action))));
  }
  if (achievement.type==="townLevels") return Object.values(state.town).reduce((sum,level)=>sum+level,0);
  return state.stats[achievement.type]||0;
}
function checkAchievements({showReveal=true}={}) {
  const unlocked=[];
  achievementData.forEach(achievement=>{
    if (state.achievements.includes(achievement.id) || achievementProgress(achievement)<achievement.goal) return;
    state.achievements.push(achievement.id);
    grantReward(achievement.reward);
    activity(`Achievement: ${achievement.name}`,"achievement");
    unlocked.push(achievement);
  });
  if (!unlocked.length) return;
  toast(unlocked.length===1 ? `${unlocked[0].name} unlocked` : `${unlocked.length} achievement milestones unlocked`);
  if (showReveal) showRewardReveal(unlocked.length===1 ? unlocked[0].name : `${unlocked.length} Achievements`,mergeRewards(unlocked.map(item=>item.reward)),"Achievement reward");
  document.body.classList.add("achievement-flash");
  setTimeout(()=>document.body.classList.remove("achievement-flash"),700);
}
function claimContract(id) {
  const contract=state.contracts.items.find(item=>item.id===id);
  if (!contract || contract.claimed || contract.progress<contract.goal) return;
  contract.claimed=true;
  grantReward(contract.reward,true);
  showRewardReveal(contract.name,contract.reward,"Contract reward");
  state.stats.contracts=(state.stats.contracts||0)+1;
  activity(`Contract reward: ${formatReward(contract.reward)}`,"contract");
  checkAchievements();
  saveState(); renderAdventure(); renderLive();
}
function townProjectCost(id) {
  const project=townProjectData[id], level=state.town[id]||0;
  const scale=Math.pow(1.8,level)*(1-achievementBonus("townDiscount"));
  return Object.fromEntries(Object.entries(project.baseCost).map(([item,qty])=>[item,Math.ceil(qty*scale)]));
}
function townProjectContribution(id) {
  if (!state.townContributions[id]) state.townContributions[id]={};
  return state.townContributions[id];
}
function townProjectRemainingCost(id) {
  const contributed=townProjectContribution(id);
  return Object.fromEntries(Object.entries(townProjectCost(id)).map(([item,qty])=>[item,Math.max(0,qty-(contributed[item]||0))]));
}
function townProjectContributionProgress(id) {
  const costs=townProjectCost(id);
  const contributed=townProjectContribution(id);
  const total=Object.values(costs).reduce((sum,qty)=>sum+qty,0);
  const paid=Object.entries(costs).reduce((sum,[item,qty])=>sum+Math.min(qty,contributed[item]||0),0);
  return {paid,total,pct:total ? Math.min(100,paid/total*100) : 100};
}
function hasAvailableTownContribution(id) {
  return Object.entries(townProjectRemainingCost(id)).some(([item,qty])=>qty>0 && (state.inventory[item]||0)>0);
}
function buildTownProject(id) {
  const project=townProjectData[id], level=state.town[id]||0;
  if (!project || level>=project.max) return;
  const contributed=townProjectContribution(id);
  let moved=0;
  Object.entries(townProjectRemainingCost(id)).forEach(([item,qty])=>{
    const take=Math.min(qty,state.inventory[item]||0);
    if (take<=0) return;
    addItem(item,-take);
    contributed[item]=(contributed[item]||0)+take;
    moved+=take;
  });
  const complete=Object.values(townProjectRemainingCost(id)).every(qty=>qty<=0);
  if (!moved && !complete) return toast("You need more project materials");
  if (complete) {
    state.town[id]++;
    state.townContributions[id]={};
    activity(`${project.name} reached level ${state.town[id]}`,"town");
    checkAchievements();
  } else {
    activity(`${project.name} contribution: ${moved.toLocaleString()} materials`,"town");
  }
  saveState();
  render();
}
function chooseTownBranch(project,branch) {
  if (!townBranchData[project]?.[branch] || (state.town[project]||0)<3 || state.townBranches[project]) return;
  state.townBranches[project]=branch;
  activity(`${townBranchData[project][branch].name} established`,"town");
  toast(`${townBranchData[project][branch].name} selected`);
  saveState();
  render();
}
function rerollContracts() {
  const cost=100+state.contracts.rerolls*75;
  if (state.coins<cost) return toast("Not enough coins to reroll contracts");
  if (state.contracts.items.some(contract=>contract.claimed)) return toast("Claimed contracts cannot be rerolled today");
  state.coins-=cost;
  state.contracts.rerolls=(state.contracts.rerolls||0)+1;
  ensureContracts(true);
  activity("Guild contracts rerolled","contract");
  saveState();
  render();
}
function ensureMarket() {
  const day=todayKey();
  if (state.market.day===day && state.market.stock.length) return;
  const pool=[...rotatingMerchantData];
  const stock=[];
  for (let index=0;index<4 && pool.length;index++) {
    const pick=seededIndex(`${day}-market-${index}`,pool.length);
    stock.push(pool.splice(pick,1)[0].id);
  }
  state.market={day,stock,purchases:{},contractRerolls:state.market.contractRerolls||0};
}
function buyMarketStock(id) {
  ensureMarket();
  const offer=rotatingMerchantData.find(item=>item.id===id);
  if (!offer || !state.market.stock.includes(id)) return;
  const bought=state.market.purchases[id]||0;
  const cost=Math.round(offer.cost*Math.pow(1.35,bought));
  if (state.coins<cost) return toast("Not enough coins");
  state.coins-=cost;
  addItem(offer.item,offer.qty);
  state.market.purchases[id]=bought+1;
  activity(`Purchased ${offer.qty} ${offer.item}`,"coins");
  saveState();
  render();
}
function getAction(skill=currentSkill) {
  const action=skillData[skill].actions.find(a=>a.id===state.selectedActions[skill]);
  if (action) return action;
  state.selectedActions[skill]=skillData[skill].actions[0].id;
  return skillData[skill].actions[0];
}

function loadState() {
  const candidates = [];
  const addCandidate = (raw, source) => {
    if (!raw) return;
    try {
      const parsed=typeof raw==="string" ? JSON.parse(raw) : raw;
      candidates.push({state:normalizeState(parsed),source});
    } catch {
      // Ignore malformed saves and continue to the automatic backup.
    }
  };
  addCandidate(localStorage.getItem(SAVE_KEY),"primary");
  addCandidate(localStorage.getItem(SAVE_BACKUP_KEY),"backup");
  if (!localStorage.getItem(RECOVERY_APPLIED_KEY)) {
    addCandidate(window.EMBERFALL_RECOVERY_SAVE,"recovery");
  }
  if (!candidates.length) return defaultState();
  candidates.sort((a,b)=>saveProgressScore(b.state)-saveProgressScore(a.state) || (b.state.lastSeen||0)-(a.state.lastSeen||0));
  const best=candidates[0];
  if (best.source==="recovery") recoveredSaveOnLoad=true;
  localStorage.setItem(RECOVERY_APPLIED_KEY,"1");
  return best.state;
}

function saveProgressScore(save={}) {
  const skillXp=Object.values(save.skills||{}).reduce((total,skill)=>total+(Number(skill?.xp)||0)+(Number(skill?.masteryXp)||0)*.2,0);
  const inventoryValue=Object.entries(save.inventory||{}).reduce((total,[name,qty])=>total+(Number(qty)||0)*(itemMeta(name).value||1),0);
  const gearValueScore=(save.gearVault||[]).reduce((total,gear)=>total+gearValue(gear),0);
  return skillXp+inventoryValue+gearValueScore+(Number(save.coins)||0)+(Number(save.kills)||0)*10+(Number(save.unlockedZones)||1)*1000;
}

function normalizeState(parsed={}) {
  const base=defaultState();
  const skills={...base.skills,...parsed.skills};
  Object.keys(base.skills).forEach(id=>skills[id]={...base.skills[id],...(parsed.skills?.[id]||{})});
  const upgrades={...base.upgrades};
  productionSkills.forEach(id=>upgrades[id]={...base.upgrades[id],...(parsed.upgrades?.[id]||{})});
  const zoneKills=base.zoneKills.map((value,index)=>parsed.zoneKills?.[index] ?? value);
  const selectedEnemies=base.selectedEnemies.map((value,index)=>parsed.selectedEnemies?.[index] ?? value);
  const zoneThreats=base.zoneThreats.map((value,index)=>parsed.zoneThreats?.[index] ?? value);
  const bossDefeated=base.bossDefeated.map((value,index)=>
    parsed.bossDefeated?.[index] ??
    (index+1<(parsed.unlockedZones||1) || Boolean(parsed.inventory?.[zoneData[index].boss.item]))
  );
  const result={
    ...base,...parsed,skills,upgrades,zoneKills,selectedEnemies,bossDefeated,zoneThreats,
    inventory:{...base.inventory,...parsed.inventory},
    selectedActions:{...base.selectedActions,...parsed.selectedActions},
    equipment:{...base.equipment,...parsed.equipment},
    buffs:{...base.buffs,...parsed.buffs},
    enemyStatus:{...base.enemyStatus,...parsed.enemyStatus},
    playerStatus:{...base.playerStatus,...parsed.playerStatus},
    combatEvent:{...base.combatEvent,...parsed.combatEvent},
    contracts:{...base.contracts,...parsed.contracts,items:[...(parsed.contracts?.items||[])]},
    town:{...base.town,...parsed.town},
    townBranches:{...base.townBranches,...parsed.townBranches},
    starterQuests:{
      progress:{...base.starterQuests.progress,...parsed.starterQuests?.progress},
      claimed:[...(parsed.starterQuests?.claimed||[])]
    },
    chapters:{claimed:[...(parsed.chapters?.claimed||[])]},
    bounties:{...base.bounties,...parsed.bounties},
    townContributions:{...base.townContributions,...parsed.townContributions},
    gearCollections:{claimed:[...(parsed.gearCollections?.claimed||[])]},
    relicsActivated:{...base.relicsActivated,...parsed.relicsActivated},
    bestiary:{
      ...base.bestiary,...parsed.bestiary,
      kills:{...base.bestiary.kills,...parsed.bestiary?.kills},
      drops:{...base.bestiary.drops,...parsed.bestiary?.drops},
      bosses:{...base.bestiary.bosses,...parsed.bestiary?.bosses}
    },
    market:{
      ...base.market,...parsed.market,
      stock:[...(parsed.market?.stock||[])],
      purchases:{...base.market.purchases,...parsed.market?.purchases}
    },
    craftPity:{...base.craftPity,...parsed.craftPity},
    craftingUi:{
      ...base.craftingUi,...parsed.craftingUi,
      pinned:[...(parsed.craftingUi?.pinned||[])],
      collapsed:{...base.craftingUi.collapsed,...parsed.craftingUi?.collapsed}
    },
    combatAutomation:{...base.combatAutomation,...parsed.combatAutomation},
    productionQueue:[...(parsed.productionQueue||[])].slice(0,MAX_PRODUCTION_QUEUE),
    blueprints:[...(parsed.blueprints||[])],
    stats:{...base.stats,...parsed.stats},
    settings:{...base.settings,...parsed.settings},
    inventoryUi:{...base.inventoryUi,...parsed.inventoryUi},
    actionMastery:{...base.actionMastery,...parsed.actionMastery},
    achievements:[...(parsed.achievements||[])],
    lockedItems:[...(parsed.lockedItems||[])],
    lockedGear:[...(parsed.lockedGear||[])],
    gearVault:[...(parsed.gearVault||[])]
  };
  delete result["res"+"onance"];
  delete result["abil"+"ityReadyAt"];
  delete result["abil"+"ityLoadout"];
  delete result.autoCast;
  delete result.stats["abil"+"ities"];
  delete result.stats["over"+"charges"];
  result.contracts.items=result.contracts.items.map(contract=>({
    ...contract,
    reward:repairReward(contract.reward,contractFallbackItem(contract))
  }));
  productionSkills.forEach(id=>{
    Object.entries(upgradeCaps).forEach(([type,cap])=>{
      result.upgrades[id][type]=Math.min(cap,Math.max(0,Number(result.upgrades[id][type])||0));
    });
  });
  result.zoneThreats=result.zoneThreats.map((rank,index)=>Math.min(MAX_THREAT,Math.max(0,Number(rank)||0)));
  result.nextQueueId=Math.max(
    Number(parsed.nextQueueId)||1,
    ...result.productionQueue.map(job=>(Number(String(job.id).split("-")[1])||0)+1)
  );
  if (!parsed.actionMastery) {
    productionSkills.forEach(skill=>{
      const action=skillData[skill].actions.find(item=>item.id===result.selectedActions[skill])||skillData[skill].actions[0];
      result.actionMastery[actionMasteryKey(skill,action)]=skills[skill].masteryXp||0;
    });
  }
  if (!parsed.stats) {
    result.stats.actions=Math.floor(productionSkills.reduce((sum,skill)=>sum+(skills[skill].masteryXp||0),0)/10);
    result.stats.kills=parsed.kills||0;
  }
  while (result.unlockedZones<zoneData.length && result.bossDefeated[result.unlockedZones-1]) {
    result.unlockedZones++;
  }
  if (!parsed.gearMigrated || !result.gearVault.length) {
    let next=1;
    const migrated=[];
    const makeLegacyGear=baseName=>{
      const gear={id:`gear-${next++}`,baseName,rarity:"common",upgrade:0,affixes:[]};
      migrated.push(gear);
      return gear.id;
    };
    Object.entries(result.equipment).forEach(([slot,ref])=>{
      if (ref && ref!=="None" && equipmentData[ref]?.slot) result.equipment[slot]=makeLegacyGear(ref);
    });
    Object.entries({...result.inventory}).forEach(([name,qty])=>{
      if (!equipmentData[name]?.slot) return;
      for (let index=0;index<qty;index++) makeLegacyGear(name);
      delete result.inventory[name];
    });
    result.gearVault=migrated;
    result.nextGearId=next;
    result.gearMigrated=true;
  } else {
    const nextAvailable=Math.max(0,...result.gearVault.map(gear=>Number(String(gear.id).split("-")[1])||0))+1;
    result.nextGearId=Math.max(parsed.nextGearId||1,nextAvailable);
  }
  zoneData.forEach((zone,index)=>{
    if (result.bossDefeated[index] && !(result.bestiary.bosses[zone.boss.name]>0)) {
      result.bestiary.bosses[zone.boss.name]=1;
    }
  });
  const rareGearOwned=result.gearVault.filter(gear=>["rare","epic","legendary"].includes(gear.rarity)).length;
  result.stats.rareGear=Math.max(result.stats.rareGear||0,rareGearOwned);
  return result;
}

function saveState(show=false) {
  state.lastSeen = Date.now();
  const serialized=JSON.stringify(state);
  localStorage.setItem(SAVE_KEY,serialized);
  localStorage.setItem(SAVE_BACKUP_KEY,serialized);
  localStorage.setItem(RECOVERY_APPLIED_KEY,"1");
  document.querySelector("#save-state").textContent = "Saved locally";
  if (show) toast("Adventure saved");
}

function actionById(skill,id) {
  return skillData[skill]?.actions.find(action=>action.id===id);
}

function queueJobAction(job=state.productionQueue[0]) {
  return job ? actionById(job.skill,job.actionId) : null;
}

function addProductionJob(skill,actionId,target) {
  const action=actionById(skill,actionId);
  const amount=Math.max(1,Math.min(100000,Number(target)||100));
  if (!action || skillLevel(skill)<action.level) return toast("That action is not unlocked");
  if (state.productionQueue.length>=MAX_PRODUCTION_QUEUE) return toast("The production queue is full");
  state.productionQueue.push({id:`job-${state.nextQueueId++}`,skill,actionId,target:amount,completed:0});
  toast(`${action.name} added to the queue`);
  saveState();
  renderSkill();
}

function startProductionQueue() {
  if (!state.productionQueue.length) return toast("Add an action to the queue first");
  state.queueRunning=true;
  state.combat=false;
  state.combatChain=0;
  startNextQueueJob();
  saveState();
  render();
}

function startNextQueueJob() {
  while (state.productionQueue.length) {
    const job=state.productionQueue[0], action=queueJobAction(job);
    if (!action || skillLevel(job.skill)<action.level || job.completed>=job.target) {
      state.productionQueue.shift();
      continue;
    }
    state.selectedActions[job.skill]=action.id;
    state.activeSkill=job.skill;
    state.actionElapsed=0;
    return true;
  }
  state.queueRunning=false;
  state.activeSkill=null;
  state.actionElapsed=0;
  return false;
}

function removeProductionJob(id) {
  const wasFirst=state.productionQueue[0]?.id===id;
  state.productionQueue=state.productionQueue.filter(job=>job.id!==id);
  if (wasFirst && state.queueRunning) startNextQueueJob();
  saveState();
  render();
}

function clearProductionQueue() {
  state.productionQueue=[];
  state.queueRunning=false;
  state.activeSkill=null;
  state.actionElapsed=0;
  saveState();
  render();
}

function completeSkillCycle(skill,action,{quiet=false}={}) {
  const batch=actionBatchSize(skill);
  if (!canPerformAction(skill,action,batch)) return null;
  payActionCosts(skill,action,batch);
  const quantity=rollActionQuantity(skill,action)*batch;
  addItem(action.item,quantity,!quiet);
  const before=skillLevel(skill);
  const masteryBefore=masteryLevel(skill);
  const actionBefore=actionMasteryLevel(skill,action);
  const xpGain=actionXp(skill,action)*batch;
  const masteryGain=Math.max(1,Math.round(masteryXpGain(action,skill)*Math.sqrt(batch)));
  state.skills[skill].xp+=xpGain;
  state.skills[skill].masteryXp+=masteryGain;
  const actionKey=actionMasteryKey(skill,action);
  state.actionMastery[actionKey]=(state.actionMastery[actionKey]||0)+masteryGain;
  recordProgress("actions",{skill},batch);
  recordProgress("item",{item:action.item},quantity);
  if (state.queueRunning && state.productionQueue[0]?.skill===skill && state.productionQueue[0]?.actionId===action.id) {
    state.productionQueue[0].completed+=quantity;
    if (state.productionQueue[0].completed>=state.productionQueue[0].target) {
      if (!quiet) activity(`${action.name} queue target completed`,"craft");
      state.productionQueue.shift();
      startNextQueueJob();
    }
  }
  if (!quiet && skillLevel(skill)>before) {
    const level=skillLevel(skill);
    toast(`${skillData[skill].name} reached level ${level}`);
    activity(`${skillData[skill].name} level ${level}`,"level");
    renderProgressSummary();
  }
  const masteryAfter=masteryLevel(skill);
  const milestone=masteryMilestones.find(item=>item.level>masteryBefore && item.level<=masteryAfter);
  if (!quiet && milestone) toast(`${skillData[skill].name} mastery ${milestone.level}: ${milestone.text}`);
  const actionAfter=actionMasteryLevel(skill,action);
  if (!quiet && actionAfter>actionBefore && actionAfter%5===0) activity(`${action.name} expertise ${actionAfter}`,"mastery");
  return {quantity,xpGain,masteryGain,batch};
}

function offlineProductionSegment(skill,action,availableMs,job=null) {
  const duration=actionTime(skill,action);
  const batch=actionBatchSize(skill);
  let cycles=Math.floor(availableMs/duration);
  if (!cycles) return null;
  const costs=scaledActionCosts(skill,action,batch);
  if (Object.keys(costs).length) {
    cycles=Math.min(cycles,...Object.entries(costs).map(([item,qty])=>Math.floor((state.inventory[item]||0)/qty)));
  }
  const baseQuantity=actionQuantity(skill,action)*batch;
  if (job) cycles=Math.min(cycles,Math.max(1,Math.ceil((job.target-job.completed)/Math.max(1,baseQuantity))));
  if (!cycles) return null;
  Object.entries(costs).forEach(([item,qty])=>addItem(item,-qty*cycles));
  const bonusChance=Math.min(.75,actionMasteryDoubleChance(skill,action)+(state.town.storehouse||0)*.02);
  const totalQuantity=baseQuantity*cycles+Math.floor(cycles*bonusChance)*action.qty*batch;
  const xpGain=actionXp(skill,action)*batch*cycles;
  const masteryGain=Math.max(1,Math.round(masteryXpGain(action,skill)*Math.sqrt(batch)))*cycles;
  addItem(action.item,totalQuantity);
  state.skills[skill].xp+=xpGain;
  state.skills[skill].masteryXp+=masteryGain;
  const key=actionMasteryKey(skill,action);
  state.actionMastery[key]=(state.actionMastery[key]||0)+masteryGain;
  recordProgress("actions",{skill},cycles*batch);
  recordProgress("item",{item:action.item},totalQuantity);
  if (job) job.completed+=totalQuantity;
  return {cycles,totalQuantity,xpGain,masteryGain,timeUsed:cycles*duration};
}

function applyOfflineProduction(away) {
  let remaining=away;
  const totals={items:{},xp:{},mastery:0,cycles:0};
  let guard=0;
  while (remaining>=750 && state.activeSkill && guard++<MAX_PRODUCTION_QUEUE+2) {
    const job=state.queueRunning ? state.productionQueue[0] : null;
    const skill=job?.skill||state.activeSkill;
    const action=job ? queueJobAction(job) : getAction(skill);
    if (!action) break;
    const segment=offlineProductionSegment(skill,action,remaining,job);
    if (!segment) {
      if (job) {
        state.queueRunning=false;
        state.activeSkill=null;
      }
      break;
    }
    remaining-=segment.timeUsed;
    totals.items[action.item]=(totals.items[action.item]||0)+segment.totalQuantity;
    totals.xp[skill]=(totals.xp[skill]||0)+segment.xpGain;
    totals.mastery+=segment.masteryGain;
    totals.cycles+=segment.cycles;
    if (job && job.completed>=job.target) {
      state.productionQueue.shift();
      if (!startNextQueueJob()) break;
    } else if (!job) {
      break;
    }
  }
  return totals.cycles ? totals : null;
}

function bestiaryKill(name,amount=1) {
  state.bestiary.kills[name]=(state.bestiary.kills[name]||0)+amount;
}

function bestiaryDrop(name,amount=1) {
  if (!name || amount<=0) return;
  state.bestiary.drops[name]=(state.bestiary.drops[name]||0)+amount;
}

function offlineFoodHealing(required) {
  let healed=0,consumed=0;
  const foods=Object.entries(state.inventory)
    .filter(([name,qty])=>qty>0 && itemData[name]?.category==="Food")
    .map(([name,qty])=>({name,qty,heal:itemData[name].consume?.fullHeal?maxHp():itemData[name].consume?.heal||0}))
    .filter(item=>item.heal>0)
    .sort((a,b)=>a.heal-b.heal);
  for (const food of foods) {
    while (food.qty>0 && healed<required) {
      addItem(food.name,-1);
      food.qty--;
      consumed++;
      healed+=food.heal;
    }
    if (healed>=required) break;
  }
  return {healed,consumed};
}

function applyOfflineCombat(away) {
  if (!state.combat || !state.combatAutomation.offline) return null;
  if (state.fightingBoss) {
    state.fightingBoss=false;
    state.enemyHp=enemyMaxHp();
  }
  const enemy=currentEnemy(), style=combatStyles[state.combatStyle]||combatStyles.balanced;
  const startChain=state.combatChain||0;
  const playerDps=Math.max(.1,(hitChance()*Math.max(1,maxHit()*.52)*combatDamageMultiplier())/(playerAttackTime()/1000))*1.12;
  const rawEnemyHit=Math.max(0,enemyMaxHitValue(enemy)*.48-defencePower()/8);
  const ward=(isBuffActive("ward")||isBuffActive("frostmeal")) ? .5 : 1;
  const environmentDamage=1+((currentEnvironment().enemyDamage||1)-1)*ward;
  const enemyDps=Math.max(0,rawEnemyHit*style.damageTaken*environmentDamage/(enemyAttackTime(enemy)/1000));
  const killSeconds=Math.max(1,enemyMaxHp(enemy)/playerDps+.8);
  const stopHp=Math.max(1,Math.min(80,state.combatAutomation.stopHp||15));
  const safeHealth=Math.max(1,maxHp()*(1-stopHp/100));
  const potentialDamage=enemyDps*(away/1000);
  const foodNeed=state.autoEat ? Math.max(0,potentialDamage-safeHealth) : 0;
  const food=offlineFoodHealing(foodNeed);
  const survivableSeconds=enemyDps>0 ? Math.max(0,(safeHealth+food.healed)/enemyDps) : away/1000;
  const activeSeconds=Math.min(away/1000,survivableSeconds);
  let kills=Math.min(5000,Math.floor(activeSeconds/killSeconds));
  if (state.combatAutomation.stopAfter>0) kills=Math.min(kills,state.combatAutomation.stopAfter);
  if (!kills) {
    state.combat=false;
    state.combatChain=0;
    state.heroHp=Math.max(1,Math.round(maxHp()*stopHp/100));
    return {kills:0,coins:0,food:food.consumed,item:enemy.item,itemQty:0};
  }
  const averageCoins=(enemyCoinRange(enemy)[0]+enemyCoinRange(enemy)[1])/2;
  const coins=Math.round(averageCoins*kills*1.12);
  const materialQty=kills+Math.floor(kills*zoneThreatRank()*.15);
  const bonusChance=enemyBonusDropChance(enemy,state.currentZone,startChain);
  const bonusQty=enemy.bonusItem ? Math.floor(kills*bonusChance) : 0;
  const expectedCaches=kills*zoneCacheChance(state.currentZone,startChain);
  const cacheRolls=Math.floor(expectedCaches)+(Math.random()<expectedCaches%1 ? 1 : 0);
  const streaks=Math.max(0,Math.floor((startChain+kills)/10)-Math.floor(startChain/10));
  const cacheReward=rollZoneCacheReward(state.currentZone,cacheRolls+streaks,1+zoneThreatRank()*.08+(streaks?0.12:0));
  state.kills+=kills;
  state.zoneKills[state.currentZone]+=kills;
  state.coins+=coins;
  addItem(enemy.item,materialQty);
  if (enemy.bonusItem) addItem(enemy.bonusItem,bonusQty);
  Object.entries(cacheReward.items||{}).forEach(([item,qty])=>addItem(item,qty));
  bestiaryKill(enemy.name,kills);
  bestiaryDrop(enemy.item,materialQty);
  bestiaryDrop(enemy.bonusItem,bonusQty);
  Object.entries(cacheReward.items||{}).forEach(([item,qty])=>bestiaryDrop(item,qty));
  const damageXp=enemyMaxHp(enemy)*kills;
  const combatXpMultiplier=1+achievementBonus("allXp")+achievementBonus("combatXp",{zone:state.currentZone,enemy:enemy.name})+shrineXpBonus();
  let totalXp=0;
  Object.entries(style.xp).forEach(([skill,multiplier])=>{
    const gain=Math.max(1,Math.round(damageXp*multiplier*combatXpMultiplier));
    state.skills[skill].xp+=gain; totalXp+=gain;
  });
  recordProgress("kills",{zone:state.currentZone,enemy:enemy.name},kills);
  const gearDrops=Math.min(20,Math.floor(kills*threatGearChance()));
  const rarityOrder=Object.keys(rarityData);
  let bestGear=null;
  for (let index=0;index<gearDrops;index++) {
    const table=currentZone().gearTiers.flatMap(tier=>equipmentTierData[tier]?.gear||[]);
    if (!table.length) continue;
    const gear=createGear(table[index%table.length],rollRarity(zoneThreatRank()*3));
    if (!bestGear || rarityOrder.indexOf(gear.rarity)>rarityOrder.indexOf(bestGear.rarity)) bestGear=gear;
  }
  const damageTaken=enemyDps*activeSeconds;
  state.heroHp=Math.max(1,Math.min(maxHp(),Math.round(maxHp()+food.healed-damageTaken)));
  const stopped=activeSeconds<away/1000 || (state.combatAutomation.stopAfter>0 && kills>=state.combatAutomation.stopAfter);
  if (stopped) state.combat=false;
  state.combatChain=stopped ? 0 : startChain+kills;
  state.combatAutomation.killsRun=(state.combatAutomation.killsRun||0)+kills;
  return {kills,coins,food:food.consumed,item:enemy.item,itemQty:materialQty,bonusItem:enemy.bonusItem,bonusQty,cacheItems:cacheReward.items,cacheRolls,streaks,gearDrops,totalXp,bestGear:bestGear?{name:gearDisplayName(bestGear),rarity:bestGear.rarity}:null};
}

function applyOfflineProgress(elapsed=Date.now()-(state.lastSeen||Date.now())) {
  const away = Math.max(0,Math.min(elapsed,MAX_OFFLINE_HOURS*60*60*1000));
  state.lastSeen=Date.now();
  if (away < 1000) return false;
  const combatResult=applyOfflineCombat(away);
  const productionResult=applyOfflineProduction(away);
  if (!combatResult && !productionResult) return false;
  document.querySelector("#offline-time").textContent = `You were away for ${formatDuration(away)}. Here is what your adventurer accomplished:`;
  const sections=[];
  if (combatResult) {
    const cacheCards=Object.entries(combatResult.cacheItems||{})
      .filter(([,qty])=>qty>0)
      .map(([item,qty])=>`<div><span>${item}</span><strong>+${qty.toLocaleString()}</strong></div>`)
      .join("");
    const cards=[
      `<div><span>Enemies defeated</span><strong>${combatResult.kills.toLocaleString()}</strong></div>`,
      `<div class="reward-highlight"><span>Coins</span><strong>+${combatResult.coins.toLocaleString()}</strong></div>`,
      `<div><span>Combat XP</span><strong>+${(combatResult.totalXp||0).toLocaleString()}</strong></div>`,
      `<div><span>${combatResult.item}</span><strong>+${(combatResult.itemQty||0).toLocaleString()}</strong></div>`,
      combatResult.bonusQty?`<div><span>${combatResult.bonusItem}</span><strong>+${combatResult.bonusQty.toLocaleString()}</strong></div>`:"",
      cacheCards,
      combatResult.cacheRolls?`<div><span>Zone caches opened</span><strong>${combatResult.cacheRolls.toLocaleString()}</strong></div>`:"",
      combatResult.streaks?`<div><span>Hunt streak caches</span><strong>${combatResult.streaks.toLocaleString()}</strong></div>`:"",
      combatResult.gearDrops?`<div><span>Equipment found</span><strong>${combatResult.gearDrops}</strong></div>`:"",
      combatResult.food?`<div><span>Food consumed</span><strong>${combatResult.food}</strong></div>`:""
    ].join("");
    const featured=combatResult.bestGear?`<div class="offline-featured rarity-${combatResult.bestGear.rarity}" style="--rarity-color:${rarityData[combatResult.bestGear.rarity].color}"><span class="eyebrow">Best find</span><strong>${rarityData[combatResult.bestGear.rarity].name} ${combatResult.bestGear.name}</strong></div>`:"";
    sections.push(`<section class="offline-section"><div class="offline-section-title"><span class="eyebrow">Combat</span><strong>${combatResult.kills ? `${combatResult.kills.toLocaleString()} defeated` : "Run stopped"}</strong></div>${featured}<div class="offline-cards">${cards}</div></section>`);
  }
  if (productionResult) {
    const itemCards=Object.entries(productionResult.items).map(([item,qty])=>`<div><span>${item}</span><strong>+${qty.toLocaleString()}</strong></div>`).join("");
    const xpCards=Object.entries(productionResult.xp).map(([skill,xp])=>`<div><span>${skillData[skill].name} XP</span><strong>+${xp.toLocaleString()}</strong></div>`).join("");
    sections.push(`<section class="offline-section"><div class="offline-section-title"><span class="eyebrow">Production</span><strong>${productionResult.cycles.toLocaleString()} cycles</strong></div><div class="offline-cards">${itemCards}${xpCards}<div class="reward-highlight"><span>Mastery XP</span><strong>+${productionResult.mastery.toLocaleString()}</strong></div></div></section>`);
  }
  document.querySelector("#offline-loot").innerHTML=sections.join("");
  document.querySelector("#offline-modal").classList.remove("hidden");
  return true;
}

function tick(now) {
  const dt = Math.min(now-lastTick,1000);
  lastTick = now;
  if (!document.hidden && state.activeSkill) updateSkill(dt);
  if (!document.hidden && state.combat) updateCombat(dt);
  if ((state.activeSkill||state.combat) && now-lastLiveRender>=100) {
    renderLive();
    lastLiveRender=now;
  }
  requestAnimationFrame(tick);
}

function updateSkill(dt) {
  state.actionElapsed += dt;
  let guard=0;
  while (state.activeSkill && guard++<10) {
    const skill=state.activeSkill;
    const action=getAction(skill);
    if (!action) return;
    const duration=actionTime(skill,action);
    if (state.actionElapsed<duration) break;
    if (!canPerformAction(skill,action)) {
      state.activeSkill=null;
      state.queueRunning=false;
      state.actionElapsed=0;
      toast("Production stopped because materials ran out");
      break;
    }
    state.actionElapsed -= duration;
    completeSkillCycle(skill,action);
    if (currentView===skill) renderSkill();
  }
}

function updateCombat(dt) {
  const enemy=currentEnemy();
  const style=combatStyles[state.combatStyle]||combatStyles.balanced;
  const trait=currentEnemyTrait();
  const now=Date.now();
  updateBossPhase();
  maybeTriggerCombatEvent(now);
  if (shouldStopCombat()) return;
  if (state.playerStatus.poisonTicks>0 && now>=state.playerStatus.poisonNext) {
    const poisonGuard=relicActive("Mireheart Pearl") ? .5 : 1;
    const ward=isBuffActive("ward") ? .5 : 1;
    const poisonDamage=Math.max(1,Math.round((currentEnvironment().poisonDamage||5)*(1+zoneThreatRank()*.1)*poisonGuard*ward));
    state.heroHp-=poisonDamage;
    state.playerStatus.poisonTicks--;
    state.playerStatus.poisonNext=now+1500;
    popDamage("hero",poisonDamage,"Poison");
    addLog(`${state.characterName} suffers ${poisonDamage} poison damage.`);
    if (state.heroHp<=0) {
      const loss=Math.min(state.coins,5*(state.currentZone+1));
      state.combat=false; state.combatChain=0; state.heroHp=maxHp(); state.enemyHp=enemyMaxHp(); state.coins-=loss;
      resetCombatStatuses();
      addLog(`${state.characterName} retreats and loses ${loss} coins.`);
      toast(`Defeated - ${state.characterName} recovered`);
      return;
    }
  }
  const attackTime=playerAttackTime();
  state.attackElapsed += dt;
  state.enemyAttackElapsed += dt;
  if (state.attackElapsed >= attackTime) {
    state.attackElapsed -= attackTime;
    pulseHeroModel("hero-attack");
    if (Math.random()>hitChance()) {
      popDamage("enemy",0,"Miss");
      addLog(`${state.characterName}'s ${style.name.toLowerCase()} strike misses ${enemy.name}.`);
    } else {
      const critical=Math.random()<critChance();
      const rolledHit=Math.max(1,Math.floor(Math.random()*(maxHit()+1)));
      const armor=trait.armor||0;
      const event=activeCombatEvent();
      const eventDamage=event?.playerDamage||1;
      const hit=Math.max(1,Math.round(rolledHit*(critical?1.75:1)*combatDamageMultiplier()*eventDamage)-armor);
      state.enemyHp -= hit;
      Object.entries(style.xp).forEach(([skill,multiplier])=>grantCombatXp(skill,Math.max(1,Math.round(hit*multiplier))));
      if (style.lifesteal) state.heroHp=Math.min(maxHp(),state.heroHp+Math.max(1,Math.floor(hit*style.lifesteal)));
      if (critical) pulseHeroModel("hero-crit");
      popDamage("enemy",hit,critical?"Crit":"");
      addLog(`${state.characterName} ${critical?"critically ":""}strikes ${enemy.name} for ${hit}.`);
      if (event?.consumeOnPlayerHit) clearCombatEvent();
      if (state.enemyHp <= 0) {
        defeatEnemy();
        return;
      }
    }
  }
  const currentEnemyAttackTime=enemyAttackTime(enemy);
  if (state.enemyAttackElapsed >= currentEnemyAttackTime && state.combat) {
    state.enemyAttackElapsed -= currentEnemyAttackTime;
    const foodDodge=isBuffActive("trailmeal") ? .03 : 0;
    if (Math.random()<Math.min(.35,(style.dodge||0)+equipmentBonus("dodge")+foodDodge)) {
      pulseHeroModel("hero-block");
      popDamage("hero",0,"Dodge");
      addLog(`${state.characterName} evades ${enemy.name}'s attack.`);
      return;
    }
    const effectiveDefence=defencePower()*(1-(trait.ignoreDefence||0));
    const heavyStrike=Math.random()<(trait.crit||0);
    const enraged=state.enemyHp<=enemyMaxHp(enemy)*.35;
    const environmentPenalty=(currentEnvironment().enemyDamage||1)-1;
    const environmentMultiplier=1+environmentPenalty*((isBuffActive("ward")||isBuffActive("frostmeal")) ? .5 : 1);
    const phaseMultiplier=state.fightingBoss ? 1+Math.max(0,(state.bossPhase||1)-1)*.12 : 1;
    const event=activeCombatEvent();
    const traitDamage=(trait.damage||1)*environmentMultiplier*(enraged?1+(trait.enrage||0):1)*(heavyStrike?1.5:1)*phaseMultiplier*(event?.enemyDamage||1);
    const rawHit=Math.max(0,Math.floor(Math.random()*(enemyMaxHitValue(enemy)+1))-Math.floor(effectiveDefence/8));
    let hit=Math.max(0,Math.floor(rawHit*style.damageTaken*traitDamage));
    state.heroHp -= hit;
    const ward=(isBuffActive("ward")||isBuffActive("frostmeal")) ? .5 : 1;
    const slow=(trait.slow||0)+(currentEnvironment().slowOnHit||0)*ward;
    if (slow && hit>0) state.attackElapsed=Math.max(0,state.attackElapsed-slow);
    if (trait.lifesteal && hit>0) state.enemyHp=Math.min(enemyMaxHp(enemy),state.enemyHp+Math.max(1,Math.floor(hit*trait.lifesteal)));
    if (hit>0 && currentEnvironment().poisonChance && Math.random()<currentEnvironment().poisonChance) {
      state.playerStatus.poisonTicks=Math.max(state.playerStatus.poisonTicks||0,3);
      state.playerStatus.poisonNext=now+800;
      addLog(`${state.characterName} is poisoned by the ${currentEnvironment().name.toLowerCase()}.`);
    }
    pulseHeroModel(hit>0?"hero-hit":"hero-block");
    popDamage("hero",hit,heavyStrike&&hit>0?"Heavy":"");
    addLog(hit ? `${enemy.name} ${heavyStrike?"lands a heavy strike and ":""}hits ${state.characterName} for ${hit}.` : `${state.characterName} blocks ${enemy.name}'s attack.`);
    if (event?.consumeOnEnemyAttack) clearCombatEvent();
    if (state.autoEat && state.heroHp>0 && state.heroHp/maxHp()<=AUTO_EAT_THRESHOLD) autoEatFood();
    if (state.heroHp <= 0) {
      const loss=Math.min(state.coins,5*(state.currentZone+1));
      state.combat=false; state.combatChain=0; state.heroHp=maxHp(); state.enemyHp=enemyMaxHp(); state.coins-=loss;
      resetCombatStatuses();
      addLog(`${state.characterName} retreats and loses ${loss} coins.`);
      toast(`Defeated - ${state.characterName} recovered`);
    }
  }
}

function updateBossPhase() {
  if (!state.fightingBoss) {
    state.bossPhase=1;
    return;
  }
  const ratio=Math.max(0,state.enemyHp)/Math.max(1,enemyMaxHp());
  const next=ratio<=.33 ? 3 : ratio<=.66 ? 2 : 1;
  if (next>(state.bossPhase||1)) {
    state.bossPhase=next;
    state.enemyAttackElapsed=0;
    addLog(`${currentEnemy().name} enters phase ${next} and becomes more dangerous.`);
    toast(`Boss phase ${next}`);
  }
}

function shouldStopCombat() {
  if (!state.combat) return true;
  const settings=state.combatAutomation;
  if (settings.stopHp>0 && state.heroHp/maxHp()*100<=settings.stopHp) {
    state.combat=false;
    state.combatChain=0;
    addLog(`${state.characterName} retreats at the configured health limit.`);
    toast("Combat stopped at health limit");
    return true;
  }
  if (settings.stopWhenFoodEmpty && state.autoEat) {
    const food=Object.entries(state.inventory).some(([name,qty])=>qty>0 && itemData[name]?.category==="Food");
    if (!food) {
      state.combat=false;
      state.combatChain=0;
      addLog(`${state.characterName} retreats because no food remains.`);
      toast("Combat stopped because food ran out");
      return true;
    }
  }
  return false;
}

function resetCombatStatuses() {
  state.enemyStatus={};
  state.playerStatus={poisonTicks:0,poisonNext:0};
  state.combatEvent={id:"",expiresAt:0,nextAt:Date.now()+7000+Math.random()*6000};
}

function activeCombatEvent(now=Date.now()) {
  const id=state.combatEvent?.id;
  if (!id) return null;
  if ((state.combatEvent.expiresAt||0)<=now) {
    clearCombatEvent(now);
    return null;
  }
  return combatEventData[id] ? {id,...combatEventData[id],remaining:state.combatEvent.expiresAt-now} : null;
}
function clearCombatEvent(now=Date.now()) {
  state.combatEvent={id:"",expiresAt:0,nextAt:now+9000+Math.random()*7000};
}
function maybeTriggerCombatEvent(now=Date.now()) {
  if (!state.combat) return;
  const active=activeCombatEvent(now);
  if (active) return;
  if (!state.combatEvent.nextAt) state.combatEvent.nextAt=now+5000+Math.random()*5000;
  if (now<state.combatEvent.nextAt) return;
  const ids=Object.keys(combatEventData);
  const id=ids[Math.floor(Math.random()*ids.length)];
  const event=combatEventData[id];
  state.combatEvent={id,expiresAt:now+event.duration,nextAt:0};
  activity(event.name,"rare");
  addLog(`Battle event: ${event.description}`);
}
function renderCombatEvent() {
  const card=document.querySelector("#combat-event-card");
  if (!card) return;
  const active=activeCombatEvent();
  const stateLabel=document.querySelector("#combat-event-state");
  if (active) {
    stateLabel.textContent="Active";
    card.classList.add("active");
    card.innerHTML=`<strong>${active.name}</strong><span>${active.description}</span><div class="meter"><i style="width:${Math.max(0,active.remaining/active.duration*100)}%"></i></div>`;
    return;
  }
  card.classList.remove("active");
  stateLabel.textContent=state.combat?"Watching":"Idle";
  const wait=Math.max(0,(state.combatEvent.nextAt||0)-Date.now());
  card.innerHTML=`<strong>${state.combat?"Next event forming":"Combat idle"}</strong><span>${state.combat?`Another battlefield event can trigger in about ${Math.ceil(wait/1000)}s.`:"Start combat to trigger weak points, ambushes, guard windows, and rally rewards."}</span><div class="meter"><i style="width:${state.combat?Math.max(0,100-wait/160):0}%"></i></div>`;
}

function autoEatFood() {
  const missing=maxHp()-state.heroHp;
  const foods=Object.entries(state.inventory)
    .filter(([name,qty])=>qty>0 && itemData[name]?.category==="Food")
    .map(([name])=>({name,heal:itemData[name].consume?.fullHeal?maxHp():itemData[name].consume?.heal||0}))
    .filter(item=>item.heal>0)
    .sort((a,b)=>a.heal-b.heal);
  if (!foods.length) return;
  const food=foods.find(item=>item.heal>=missing) || foods[foods.length-1];
  addItem(food.name,-1);
  const healed=Math.min(missing,Math.max(1,Math.round(food.heal*healingMultiplier())));
  state.heroHp+=healed;
  const effect=itemData[food.name]?.consume;
  if (effect?.buff) state.buffs[effect.buff]=Math.max(Date.now(),state.buffs[effect.buff]||0)+(effect.duration||0);
  addLog(`${state.characterName} automatically eats ${food.name} and restores ${healed} health.`);
  activity(`Auto-ate ${food.name} (+${healed} HP)`,"item");
}

function defeatEnemy() {
  const enemy=currentEnemy();
  const trait=currentEnemyTrait();
  const wasBoss=state.fightingBoss;
  const defeatedZone=state.currentZone;
  const zone=currentZone();
  const firstKill=!wasBoss && !(state.bestiary.kills?.[enemy.name]>0);
  const firstBossClear=wasBoss && !state.bossDefeated[defeatedZone];
  const bossKillsBefore=wasBoss ? (state.bestiary.bosses?.[enemy.name]||0) : 0;
  const coinRange=enemyCoinRange(enemy);
  const baseCoins=coinRange[0]+Math.floor(Math.random()*(coinRange[1]-coinRange[0]+1));
  const chainBonus=Math.min(.25,state.combatChain*.01);
  const event=activeCombatEvent();
  const coinReward=Math.max(1,Math.floor(baseCoins*(1+chainBonus+(trait.lootBonus||0)+(event?.killCoins||0))));
  const materialQty=1+(Math.random()<zoneThreatRank()*.15 ? 1 : 0)+(event?.bonusMaterial||0);
  const reward={coins:0,items:{},gearNames:[]};
  const notable=[];
  state.kills++;
  state.combatChain++;
  grantCombatCoins(reward,coinReward,true);
  grantCombatItem(reward,enemy.item,materialQty,true);
  bestiaryKill(enemy.name,1);
  recordProgress("kills",{zone:state.currentZone,enemy:enemy.name},1);
  if (event?.consumeOnKill) clearCombatEvent();
  let rareGearFound=false;
  if (wasBoss || Math.random()<threatGearChance()) {
    const table=zone.gearTiers.flatMap(tier=>equipmentTierData[tier]?.gear||[]);
    const baseName=table[Math.floor(Math.random()*table.length)];
    const rolledRarity=rollRarity((wasBoss?12+state.currentZone*4:state.currentZone*2)+zoneThreatRank()*3+Math.min(20,bossKillsBefore*2));
    const rarity=wasBoss
      ? rarityAtLeast(rolledRarity,firstBossClear ? "rare" : bossKillsBefore>=5 ? "uncommon" : "common")
      : rolledRarity;
    const gear=createGear(baseName,rarity);
    rareGearFound=["rare","epic","legendary"].includes(rarity);
    reward.gearNames.push(`${rarityData[rarity].name} ${gearDisplayName(gear)}`);
    activity(`Loot: ${rarityData[rarity].name} ${gearDisplayName(gear)}`,["rare","epic","legendary"].includes(rarity)?"rare":"gear");
    bestiaryDrop(baseName,1);
    checkAchievements();
  }
  if (!wasBoss && enemy.bonusItem && Math.random()<enemyBonusDropChance(enemy,defeatedZone,state.combatChain)) {
    grantCombatItem(reward,enemy.bonusItem,1,true);
  }
  if (!wasBoss && zone.cache && Math.random()<zoneCacheChance(defeatedZone,state.combatChain)) {
    grantCombatReward(reward,rollZoneCacheReward(defeatedZone,1,1+zoneThreatRank(defeatedZone)*.08),true);
    notable.push(zone.cache.name);
  }
  if (!wasBoss && firstKill) {
    grantCombatReward(reward,makeReward(25+defeatedZone*35,{[enemy.item]:2+defeatedZone}),true);
    notable.push(`${enemy.name} field notes`);
  }
  if (!wasBoss && state.combatChain>0 && state.combatChain%10===0) {
    const streakReward=rollZoneCacheReward(defeatedZone,1+Math.floor(zoneThreatRank(defeatedZone)/3),1.15+Math.min(1,state.combatChain/100));
    grantCombatReward(reward,streakReward,true);
    notable.push(`${state.combatChain}-hunt streak`);
  }
  if (wasBoss) {
    grantCombatReward(reward,rollBossChestReward(defeatedZone,enemy,firstBossClear),true);
    state.bossDefeated[defeatedZone]=true;
    state.bestiary.bosses[enemy.name]=(state.bestiary.bosses[enemy.name]||0)+1;
    recordProgress("bosses",{zone:defeatedZone,enemy:enemy.name},1);
    addLog(`${enemy.name} defeated! ${state.characterName} earns ${reward.coins.toLocaleString()} coins and opens ${firstBossClear?"a first-clear":"a repeat"} boss chest.`);
    showRewardReveal(`${enemy.name} defeated`,reward,firstBossClear?"First-clear boss chest":"Repeat boss chest");
    if (defeatedZone+1<zoneData.length && state.unlockedZones<defeatedZone+2) {
      state.unlockedZones=defeatedZone+2;
      toast(`${zoneData[defeatedZone+1].name} unlocked`);
    } else if (defeatedZone===zoneData.length-1) {
      toast(`${enemy.name} has fallen`);
    }
    state.fightingBoss=false;
    state.bossPhase=1;
    pulseHeroModel("hero-victory");
  } else {
    state.zoneKills[state.currentZone]++;
    addLog(`${enemy.name} defeated. Hunt progress: ${state.zoneKills[state.currentZone]}/${currentZone().requiredKills}.`);
    if (notable.length || rareGearFound) {
      showRewardReveal(rareGearFound ? "Rare Gear Found" : notable[0],reward,notable.length>1 ? notable.join(" + ") : "Combat spoils");
    }
    if (notable.length) addLog(`${notable.join(" and ")} recovered from ${enemy.name}.`);
    if (state.zoneKills[state.currentZone]===currentZone().requiredKills) toast(`${currentZone().boss.name} revealed`);
  }
  if (wasBoss) { showBossBanner(enemy.name); Music.bossStinger(); }
  resetCombatStatuses();
  state.enemyHp=enemyMaxHp(); state.attackElapsed=0; state.enemyAttackElapsed=0;
  state.combatAutomation.killsRun=(state.combatAutomation.killsRun||0)+1;
  if (state.combatAutomation.stopAfter>0 && state.combatAutomation.killsRun>=state.combatAutomation.stopAfter) {
    state.combat=false;
    state.combatChain=0;
    addLog(`${state.characterName} completed the configured ${state.combatAutomation.stopAfter}-kill run.`);
    toast("Combat run complete");
  }
  saveState();
  renderCombatSetup();
}

function addLog(message) {
  state.log.unshift(message);
  state.log=state.log.slice(0,8);
  document.querySelector("#combat-log").innerHTML=state.log.map(x=>`<p>${x}</p>`).join("");
}

function popDamage(target,amount,label="") {
  const stage=document.querySelector(`#${target}-image`).parentElement;
  const number=document.querySelector(`#${target}-damage`);
  number.textContent=amount ? `${label?`${label} `:""}-${amount}` : label||"Block";
  const crit=label==="Crit";
  number.classList.toggle("crit-pop",crit);
  stage.classList.remove("hit"); number.classList.remove("pop");
  void stage.offsetWidth; stage.classList.add("hit"); number.classList.add("pop");
  if (crit) shakeCombat();
}
function shakeCombat() {
  const layout=document.querySelector(".combat-layout");
  if (!layout) return;
  layout.classList.remove("shake"); void layout.offsetWidth; layout.classList.add("shake");
}
function showBossBanner(name) {
  const el=document.getElementById("boss-banner");
  if (!el) return;
  el.textContent=`${name} defeated!`;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2600);
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
  document.querySelector(".sidebar").classList.remove("more-open");
  document.querySelector("#mobile-more-toggle").setAttribute("aria-expanded","false");
  render();
}

function render() {
  renderProgressSummary();
  renderDirector();
  if (currentView==="inventory") renderInventory();
  if (currentView==="crafting") renderCrafting();
  if (currentView==="marketplace") renderMarketplace();
  if (currentView==="mastery") renderMastery();
  if (currentView==="adventure") renderAdventure();
  if (currentView==="settings") renderSettings();
  if (skillData[currentView]) renderSkill();
  renderCombatSetup();
  renderLive();
}

function recommendedGoals() {
  ensureContracts();
  const goals=[];
  const chapter=nextChapterObjective();
  if (chapter?.complete && !chapter.claimed) {
    goals.push({view:"adventure",title:`Claim ${chapter.name}`,detail:formatReward(chapter.reward)});
  } else if (chapter?.next) {
    goals.push({view:chapter.next.view,title:chapter.next.label,detail:chapter.next.hint});
  }
  const starterView=quest=>{
    if (["mine-copper","mine-tin"].includes(quest.id)) return "mining";
    if (quest.id==="smelt-bronze") return "smithing";
    if (quest.id==="craft-helm") return "crafting";
    if (quest.id==="kill-goblins") return "combat";
    return "adventure";
  };
  const readyStarter=starterQuestData.find(quest=>!starterQuestClaimed(quest) && starterQuestProgress(quest)>=quest.goal);
  if (readyStarter) goals.push({view:"adventure",title:"Claim starter path reward",detail:readyStarter.name});
  const nextStarter=starterQuestData.find(quest=>!starterQuestClaimed(quest) && starterQuestProgress(quest)<quest.goal);
  if (nextStarter) goals.push({view:starterView(nextStarter),title:`Starter: ${nextStarter.name}`,detail:nextStarter.description});
  const readyContract=state.contracts.items.find(contract=>!contract.claimed && contract.progress>=contract.goal);
  if (readyContract) goals.push({view:"adventure",title:"Claim contract rewards",detail:readyContract.name});
  const readyBounty=zoneData.slice(0,state.unlockedZones).flatMap((zone,zoneIndex)=>
    zoneBountyDefinitions(zoneIndex).map(bounty=>({zoneIndex,bounty,state:zoneBountyState(zoneIndex,bounty.id)}))
  ).find(entry=>(entry.state.progress||0)>=bountyGoal(entry.zoneIndex,entry.bounty));
  if (readyBounty) goals.push({view:"adventure",title:"Claim bounty reward",detail:readyBounty.bounty.name});
  if (skillLevel("mining")-skillLevel("smithing")>=12) {
    const next=Math.min(90,Math.ceil((skillLevel("smithing")+1)/10)*10);
    goals.push({view:"smithing",title:`Raise Smithing toward ${next}`,detail:"Smelt bars and forge gear to keep equipment aligned with Mining progress."});
  }
  const foodCount=Object.entries(state.inventory).filter(([name])=>itemData[name]?.category==="Food").reduce((sum,[,qty])=>sum+qty,0);
  if (foodCount<5) goals.push({view:"cooking",title:"Prepare automatic combat food",detail:`Only ${foodCount} cooked meals available.`});
  if ((state.inventory["Trail Map"]||0)<3 && (state.inventory["Goblin Scrap"]||0)>0 && (state.inventory["Logs"]||0)>0) {
    goals.push({view:"cartography",title:"Chart Greenveil routes",detail:"Trail Maps turn early monster drops into hunting tools."});
  }
  if ((state.inventory["Tracking Snare"]||0)<2 && (state.inventory["Trail Map"]||0)>0) {
    goals.push({view:"huntsmanship",title:"Prepare Tracking Snares",detail:"Hunting tools improve combat caches, gear targeting, and boss chests."});
  }
  if (bossReady() && !state.bossDefeated[state.currentZone]) {
    goals.push({view:"combat",title:`Challenge ${currentZone().boss.name}`,detail:"The zone boss is ready."});
  } else if (!state.bossDefeated[state.currentZone]) {
    goals.push({view:"combat",title:`Reveal the ${currentZone().name} boss`,detail:`${Math.max(0,currentZone().requiredKills-state.zoneKills[state.currentZone])} hunts remaining.`});
  } else if (state.unlockedZones<zoneData.length) {
    goals.push({view:"combat",title:`Explore ${zoneData[state.unlockedZones-1].name}`,detail:"A new combat zone is available."});
  }
  if (state.equipment.head==="None") goals.push({view:"crafting",title:"Fill the empty head slot",detail:"Craft or find a helmet for more survivability."});
  const branchReady=Object.keys(townProjectData).find(id=>(state.town[id]||0)>=3 && !state.townBranches[id]);
  if (branchReady) goals.push({view:"adventure",title:`Specialize ${townProjectData[branchReady].name}`,detail:"Choose one permanent township branch."});
  if (!goals.length) goals.push({view:"adventure",title:"Advance township and contracts",detail:"Invest surplus resources into permanent bonuses."});
  return goals.slice(0,3);
}

function renderDirector() {
  const goals=recommendedGoals();
  const chapter=nextChapterObjective();
  const chapterProgress=chapter ? chapter.steps.filter(step=>step.complete).length : 0;
  document.querySelector("#director-title").textContent=state.activeSkill
    ? `${skillData[state.activeSkill].name}: ${getAction(state.activeSkill).name}`
    : state.combat ? `${currentZone().name}: ${currentEnemy().name}` : "Choose your next objective";
  document.querySelector("#director-chapter").innerHTML=chapter ? `<strong>${chapter.name}</strong><span>${chapter.claimed?"Complete":chapter.next?chapter.next.hint:"Ready to claim"} - ${chapterProgress}/${chapter.steps.length}</span><div class="meter director-meter"><i style="width:${chapter.steps.length?chapterProgress/chapter.steps.length*100:0}%"></i></div>` : "";
  document.querySelector("#director-goals").innerHTML=goals.map(goal=>`<button data-goal-view="${goal.view}"><strong>${goal.title}</strong><span>${goal.detail}</span></button>`).join("");
  document.querySelectorAll("[data-goal-view]").forEach(button=>button.onclick=()=>navigate(button.dataset.goalView));
}

function renderLive() {
  const enemy=currentEnemy(), enemyHpMax=enemyMaxHp(enemy);
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
  const attackTime=playerAttackTime();
  document.querySelector("#attack-timer-bar").style.width=`${state.attackElapsed/attackTime*100}%`;
  document.querySelector("#attack-timer-text").textContent=`${Math.max(0,(attackTime-state.attackElapsed)/1000).toFixed(1)}s`;
  const enemyTime=enemyAttackTime(enemy);
  document.querySelector("#enemy-attack-timer-bar").style.width=`${Math.min(100,state.enemyAttackElapsed/enemyTime*100)}%`;
  document.querySelector("#enemy-attack-timer-text").textContent=`${Math.max(0,(enemyTime-state.enemyAttackElapsed)/1000).toFixed(1)}s`;
  document.querySelector("#combat-toggle").textContent=state.combat ? "Retreat" : "Start Combat";
  document.querySelector("#battle-status").textContent=state.combat ? "Battle in progress" : "Ready to fight";
  document.querySelector(".battle-status").classList.toggle("running",state.combat);
  document.querySelector("#potion-count").textContent=state.inventory[POTION_ITEM]||0;
  document.querySelector("#use-potion").disabled=!(state.inventory[POTION_ITEM]>0) || state.heroHp>=maxHp();
  document.querySelector("#auto-eat-toggle").textContent=`Auto-Eat: ${state.autoEat?"On":"Off"}`;
  document.querySelector("#auto-eat-toggle").classList.toggle("active",state.autoEat);
  document.querySelector("#combat-accuracy").textContent=`${Math.round(hitChance()*100)}%`;
  document.querySelector("#combat-crit").textContent=`${Math.round(critChance()*100)}%`;
  document.querySelector("#combat-chain").textContent=state.combatChain;
  const bossPhase=document.querySelector("#boss-phase");
  bossPhase.classList.toggle("hidden",!state.fightingBoss);
  bossPhase.textContent=`Boss Phase ${state.bossPhase||1} · ${state.bossPhase===1?"Opening pattern":state.bossPhase===2?"Enraged pattern":"Final pattern"}`;
  renderCombatStatuses();
  renderCombatEvent();
  renderLiveSkillHud();
  if (skillData[currentSkill]) {
    const action=getAction();
    const duration=actionTime(currentSkill,action);
    document.querySelector("#skill-timer-bar").style.width=`${state.activeSkill===currentSkill ? state.actionElapsed/duration*100 : 0}%`;
    document.querySelector("#skill-timer-text").textContent=`${((duration-(state.activeSkill===currentSkill?state.actionElapsed:0))/1000).toFixed(1)}s`;
    document.querySelector("#active-skill-label").textContent=state.activeSkill ? `Training ${skillData[state.activeSkill].name}` : "Not training";
    document.querySelector("#skill-toggle").textContent=state.activeSkill===currentSkill ? "Stop Training" : "Begin";
  }
}

function renderLiveSkillHud() {
  const icon=document.querySelector("#live-skill-icon");
  if (state.activeSkill) {
    const id=state.activeSkill, action=getAction(id), level=skillLevel(id), xp=state.skills[id].xp;
    const floor=xpForLevel(level), ceiling=xpForLevel(level+1);
    const duration=actionTime(id,action);
    icon.src=skillIconPath(id);
    document.querySelector("#live-skill-name").textContent=skillData[id].name;
    document.querySelector("#live-action-name").textContent=action.name;
    document.querySelector("#live-action-bar").style.width=`${Math.min(100,state.actionElapsed/duration*100)}%`;
    document.querySelector("#live-skill-level").textContent=`Level ${level}`;
    document.querySelector("#live-skill-xp").textContent=level===MAX_LEVEL ? "Maximum XP" : `${Math.max(0,ceiling-xp).toLocaleString()} XP to level`;
    document.querySelector("#live-skill-xp-bar").style.width=level===MAX_LEVEL ? "100%" : `${(xp-floor)/(ceiling-floor)*100}%`;
    return;
  }
  if (state.combat) {
    const style=combatStyles[state.combatStyle]||combatStyles.balanced;
    const id=style.primary, level=skillLevel(id), xp=state.skills[id].xp;
    const floor=xpForLevel(level), ceiling=xpForLevel(level+1);
    icon.src=skillIconPath("combat");
    document.querySelector("#live-skill-name").textContent=`Combat - ${style.name}`;
    document.querySelector("#live-action-name").textContent=currentEnemy().name;
    document.querySelector("#live-action-bar").style.width=`${Math.min(100,state.attackElapsed/playerAttackTime()*100)}%`;
    document.querySelector("#live-skill-level").textContent=`${capitalize(id)} ${level}`;
    document.querySelector("#live-skill-xp").textContent=level===MAX_LEVEL ? "Maximum XP" : `${Math.max(0,ceiling-xp).toLocaleString()} XP to level`;
    document.querySelector("#live-skill-xp-bar").style.width=level===MAX_LEVEL ? "100%" : `${(xp-floor)/(ceiling-floor)*100}%`;
    return;
  }
  icon.src=skillIconPath(currentSkill);
  document.querySelector("#live-skill-name").textContent="Skills idle";
  document.querySelector("#live-action-name").textContent=currentView==="combat" ? "Choose an enemy or begin combat" : skillData[currentView] ? `Choose ${skillData[currentView].name}` : "Choose an activity";
  document.querySelector("#live-action-bar").style.width="0%";
  document.querySelector("#live-skill-level").textContent=`${skillData[currentSkill].name} level ${skillLevel(currentSkill)}`;
  document.querySelector("#live-skill-xp").textContent="No active training";
  document.querySelector("#live-skill-xp-bar").style.width="0%";
}

function renderCombatSetup() {
  const zone=currentZone(), enemy=currentEnemy();
  const style=combatStyles[state.combatStyle]||combatStyles.balanced;
  const trait=currentEnemyTrait();
  document.querySelector("#hero-name").textContent=state.characterName;
  renderHeroModels();
  document.querySelector("#zone-number").textContent=`Zone ${state.currentZone+1}`;
  document.querySelector("#zone-name").textContent=zone.name;
  document.querySelector("#combat-eyebrow").textContent=zone.biome;
  document.querySelector("#zone-biome").textContent=zone.biome;
  document.querySelector("#zone-recommended").textContent=`Combat ${zone.recommended[0]}-${zone.recommended[1]}`;
  const maximumThreat=maxThreatRank();
  const threatSelect=document.querySelector("#zone-threat");
  threatSelect.innerHTML=Array.from({length:maximumThreat+1},(_,rank)=>`<option value="${rank}">Threat ${rank}</option>`).join("");
  threatSelect.value=String(zoneThreatRank());
  threatSelect.disabled=!maximumThreat;
  document.querySelector("#zone-threat-reward").textContent=zoneThreatRank()
    ? `+${zoneThreatRank()*18}% coins, ${Math.round(threatGearChance()*1000)/10}% gear chance`
    : maximumThreat ? "Base rewards; raise Threat for better loot" : "Defeat this zone boss to unlock Threat";
  document.querySelector("#zone-environment-name").textContent=zone.environment.name;
  document.querySelector("#zone-environment-description").textContent=[zone.environment.description,zone.environment.counter].filter(Boolean).join(" ");
  document.querySelector("#zone-gear-tiers").textContent=zone.gearTiers.join(" / ");
  document.querySelector("#zone-spoils-name").textContent=zone.cache?.name||"No Cache";
  document.querySelector("#zone-spoils-description").textContent=zone.cache
    ? `${zone.cache.description} Cache chance: ${Math.round(zoneCacheChance()*100)}%.`
    : "This zone has no extra cache table.";
  document.querySelector("#enemy-rank").textContent=state.fightingBoss ? "Zone boss" : enemy.rank;
  document.querySelector("#enemy-name").textContent=enemy.name;
  document.querySelector("#enemy-level").textContent=enemy.level;
  document.querySelector("#enemy-image").alt=enemy.name;
  document.querySelector("#enemy-image").src=`assets/enemies/${enemy.image}.png`;
  document.querySelector("#enemy-trait-name").textContent=trait.name;
  document.querySelector("#enemy-trait-description").textContent=trait.description;
  document.querySelector(".enemy-card").classList.toggle("boss-active",state.fightingBoss);
  const enemyCoins=enemyCoinRange(enemy);
  document.querySelector("#enemy-loot").innerHTML=[
    `<b>${enemyCoins[0]}-${enemyCoins[1]} coins - 100%</b>`,
    `<b>${enemy.item} - 100%</b>`,
    !state.fightingBoss && enemy.bonusItem ? `<b>${enemy.bonusItem} - ${Math.round(enemyBonusDropChance(enemy)*100)}%</b>` : "",
    !state.fightingBoss && zone.cache ? `<b>${zone.cache.name} - ${Math.round(zoneCacheChance()*100)}%</b>` : "",
    state.fightingBoss ? `<b>${bossChestPreviewText()}</b>` : "",
    `<b>Equipment - ${state.fightingBoss?100:Math.round(threatGearChance()*1000)/10}%</b>`
  ].join("");
  const ready=bossReady();
  document.querySelector("#boss-toggle").disabled=!ready;
  document.querySelector("#boss-toggle").textContent=state.fightingBoss ? "Hunt Regular Enemy" : ready ? "Challenge Boss" : "Boss Locked";
  document.querySelector("#hunt-progress").textContent=ready
    ? `${zone.boss.name} is ready to challenge.`
    : `Defeat ${zone.requiredKills-state.zoneKills[state.currentZone]} more enemies to reveal the boss.`;
  document.querySelector("#zone-list").innerHTML=zoneData.map((item,index)=>{
    const locked=index>=state.unlockedZones;
    const cleared=state.bossDefeated[index];
    return `<button class="zone-card ${index===state.currentZone?"selected":""} ${locked?"locked":""}" data-zone="${index}" ${locked?"disabled":""}>
      <span>Zone ${index+1} · Lv. ${item.recommended[0]}-${item.recommended[1]}</span><strong>${item.name}</strong><small>${cleared?"Boss defeated":locked?"Locked":`${state.zoneKills[index]}/${item.requiredKills} hunted · Threat ${zoneThreatRank(index)}`}</small>
    </button>`;
  }).join("");
  document.querySelectorAll("#zone-list .zone-card").forEach((button,index)=>{
    const item=zoneData[index];
    const locked=index>=state.unlockedZones;
    const cleared=state.bossDefeated[index];
    button.querySelector("small").textContent=cleared
      ? `Boss defeated · Threat 0-${maxThreatRank(index)}`
      : locked
        ? `Defeat ${zoneData[index-1].boss.name} in ${zoneData[index-1].name}`
        : `${state.zoneKills[index]}/${item.requiredKills} hunted · Threat ${zoneThreatRank(index)}`;
  });
  document.querySelector("#combat-style-label").textContent=style.name;
  document.querySelector("#combat-note").textContent=`${style.description} ${combatXpText(style)}.`;
  document.querySelector("#combat-style-list").innerHTML=Object.entries(combatStyles).map(([id,item])=>`
    <button class="combat-style ${state.combatStyle===id?"selected":""}" data-style="${id}">
      <strong>${item.name}</strong><span>${item.description}</span><em>${combatXpText(item)}</em>
    </button>`).join("");
  document.querySelector("#enemy-count-label").textContent=state.fightingBoss ? "Boss selected" : `${zone.enemies.length} available`;
  document.querySelector("#enemy-list").innerHTML=zone.enemies.map((item,index)=>{
    const coins=enemyCoinRange(item);
    return `<button class="enemy-option ${!state.fightingBoss && currentEnemy()===item?"selected":""}" data-enemy="${index}">
      <img class="enemy-option-mark" src="assets/enemies/${item.image}.png" alt="">
      <span><strong>${item.name}</strong><small>${item.rank} - Lv. ${item.level} - ${enemyMaxHp(item)} HP</small><small>${item.tactic||`${item.bonusItem||item.item} focus`} - ${item.bonusItem?Math.round(enemyBonusDropChance(item)*100):0}% bonus</small></span>
      <b>${coins[0]}-${coins[1]}c</b>
    </button>`;
  }).join("");
  document.querySelectorAll(".zone-card:not(.locked)").forEach(button=>button.onclick=()=>selectZone(Number(button.dataset.zone)));
  document.querySelectorAll(".combat-style").forEach(button=>button.onclick=()=>selectCombatStyle(button.dataset.style));
  document.querySelectorAll(".enemy-option").forEach(button=>button.onclick=()=>selectEnemy(Number(button.dataset.enemy)));
  threatSelect.onchange=()=>selectThreat(Number(threatSelect.value));
  document.querySelector("#combat-stop-hp").value=state.combatAutomation.stopHp;
  document.querySelector("#combat-stop-kills").value=state.combatAutomation.stopAfter;
  document.querySelector("#combat-stop-food").checked=state.combatAutomation.stopWhenFoodEmpty;
  document.querySelector("#combat-offline").checked=state.combatAutomation.offline;
  const bossPhase=document.querySelector("#boss-phase");
  bossPhase.classList.toggle("hidden",!state.fightingBoss);
  bossPhase.textContent=`Boss Phase ${state.bossPhase||1} · ${state.bossPhase===1?"Opening pattern":state.bossPhase===2?"Enraged pattern":"Final pattern"}`;
}

function renderCombatStatuses() {
  const statuses=[];
  if (state.playerStatus.poisonTicks>0) statuses.push(`Poisoned ${state.playerStatus.poisonTicks} ticks`);
  if (isBuffActive("tracking")) statuses.push("Tracking Snare: cache routes");
  if (isBuffActive("huntermark")) statuses.push("Hunter Mark: gear focus");
  if (isBuffActive("bosslure")) statuses.push("Boss Lure: richer chests");
  document.querySelector("#combat-status-list").innerHTML=statuses.map(status=>`<span>${status}</span>`).join("");
}

function selectThreat(rank) {
  const next=Math.min(maxThreatRank(),Math.max(0,Number(rank)||0));
  if (next===zoneThreatRank()) return;
  state.combat=false;
  state.combatChain=0;
  state.zoneThreats[state.currentZone]=next;
  state.enemyHp=enemyMaxHp();
  state.attackElapsed=0;
  state.enemyAttackElapsed=0;
  resetCombatStatuses();
  addLog(`${currentZone().name} Threat set to ${next}.`);
  saveState();
  render();
}

function selectCombatStyle(id) {
  if (!combatStyles[id] || id===state.combatStyle) return;
  state.combatStyle=id; state.attackElapsed=0;
  addLog(`${state.characterName} adopts the ${combatStyles[id].name} combat style.`);
  saveState(); render();
}

function selectEnemy(index) {
  const enemy=currentZone().enemies[index];
  if (!enemy || (!state.fightingBoss && state.selectedEnemies[state.currentZone]===index)) return;
  state.combat=false; state.combatChain=0; state.fightingBoss=false; state.selectedEnemies[state.currentZone]=index;
  state.enemyHp=enemyMaxHp(enemy); state.attackElapsed=0; state.enemyAttackElapsed=0;
  resetCombatStatuses();
  addLog(`${state.characterName} begins hunting ${enemy.name}.`);
  saveState(); render();
}

function selectZone(index) {
  if (index>=state.unlockedZones || index===state.currentZone) return;
  state.combat=false; state.combatChain=0; state.currentZone=index; state.fightingBoss=false;
  state.enemyHp=enemyMaxHp(); state.attackElapsed=0; state.enemyAttackElapsed=0;
  resetCombatStatuses();
  addLog(`${state.characterName} travels to ${currentZone().name}.`);
  saveState(); render();
}

function renderSkill() {
  const data=skillData[currentSkill], action=getAction(), level=skillLevel(currentSkill);
  document.querySelector("#skill-title").textContent=data.name;
  document.querySelector("#action-illustration").innerHTML=itemIcon(action.item);
  document.querySelector("#action-name").textContent=action.name;
  document.querySelector("#action-description").textContent=action.description;
  renderSkillProgress();
  document.querySelector("#action-list").innerHTML=data.actions.map(a=>{
    const locked=level<a.level;
    const batch=actionBatchSize(currentSkill);
    const ingredients=a.costs ? Object.entries(scaledActionCosts(currentSkill,a,batch)).map(([i,q])=>`${q} ${i}`).join(" + ") : "";
    const result=`Produces ${actionQuantity(currentSkill,a)*batch} ${a.item}`;
    const requirements=locked ? `Unlocks at level ${a.level}` : a.costs ? `Uses ${ingredients} - ${result}` : result;
    const specialization=actionMasteryLevel(currentSkill,a);
    return `<button class="action-card ${a.id===action.id?"selected":""} ${locked?"locked":""}" data-action="${a.id}" ${locked?"disabled":""}>
      ${itemIcon(a.item)}
      <div class="action-card-copy">
        <h4>${a.name}</h4>
        <p class="action-card-description">${a.description}</p>
        <p class="action-card-requirements">${requirements}</p>
        <div class="action-card-rewards"><span>+${actionXp(currentSkill,a)*batch} XP</span><span>+${Math.round(masteryXpGain(a,currentSkill)*Math.sqrt(batch))} MXP</span><span>Expertise ${specialization}</span></div>
      </div>
      <strong class="action-card-time">${(actionTime(currentSkill,a)/1000).toFixed(1)}s</strong>
    </button>`;
  }).join("");
  document.querySelector("#milestone-list").innerHTML=masteryMilestones.map(item=>`<div class="milestone ${masteryLevel(currentSkill)>=item.level?"unlocked":""}"><strong>${item.level}</strong><span>${item.text}</span></div>`).join("");
  renderProductionQueue();
  document.querySelectorAll(".action-card:not(.locked)").forEach(btn=>btn.onclick=()=>{
    state.selectedActions[currentSkill]=btn.dataset.action; state.actionElapsed=0; saveState(); renderSkill();
  });
}

function renderProductionQueue() {
  document.querySelector("#queue-status").textContent=state.queueRunning ? `Running ${state.productionQueue.length} job${state.productionQueue.length===1?"":"s"}` : `${state.productionQueue.length} queued`;
  document.querySelector("#production-queue").innerHTML=state.productionQueue.length ? state.productionQueue.map((job,index)=>{
    const action=queueJobAction(job);
    const pct=Math.min(100,job.completed/job.target*100);
    return `<div class="queue-job ${index===0&&state.queueRunning?"active":""}">
      <div><strong>${action?.name||"Unknown action"}</strong><span>${skillData[job.skill]?.name||job.skill} · ${Math.min(job.completed,job.target).toLocaleString()} / ${job.target.toLocaleString()} items</span></div>
      <div class="meter"><i style="width:${pct}%"></i></div>
      <button data-remove-job="${job.id}" aria-label="Remove ${action?.name||"job"}">Remove</button>
    </div>`;
  }).join("") : `<p class="queue-empty">Queue actions from any production skill to create a multi-step idle plan.</p>`;
  document.querySelector("#queue-start").disabled=!state.productionQueue.length;
  document.querySelector("#queue-start").textContent=state.queueRunning?"Restart Queue":"Run Queue";
  document.querySelector("#queue-clear").disabled=!state.productionQueue.length;
  document.querySelectorAll("[data-remove-job]").forEach(button=>button.onclick=()=>removeProductionJob(button.dataset.removeJob));
}

function renderSettings() {
  document.querySelector("#hero-name-input").value=state.characterName;
  const music=document.querySelector("#music-toggle"); if (music) music.checked=state.settings?.music!==false;
  const volume=document.querySelector("#music-volume"); if (volume) volume.value=state.settings?.musicVolume??35;
}

function renderSkillProgress() {
  const action=getAction(), level=skillLevel(currentSkill), xp=state.skills[currentSkill].xp;
  const batch=actionBatchSize(currentSkill);
  const floor=xpForLevel(level), ceiling=xpForLevel(level+1);
  const mLevel=masteryLevel(currentSkill), mxp=state.skills[currentSkill].masteryXp || 0;
  const mFloor=masteryXpForLevel(mLevel), mCeiling=masteryXpForLevel(mLevel+1);
  document.querySelector("#skill-level").textContent=level;
  document.querySelector("#skill-xp-text").textContent=level===MAX_LEVEL ? "Maximum level" : `${xp-floor} / ${ceiling-floor} XP`;
  document.querySelector("#skill-xp-rate").textContent=`+${actionXp(currentSkill,action)*batch} XP${batch>1?` · batch ×${batch}`:""}`;
  document.querySelector("#skill-xp-bar").style.width=level===MAX_LEVEL ? "100%" : `${(xp-floor)/(ceiling-floor)*100}%`;
  document.querySelector("#mastery-level").textContent=mLevel;
  document.querySelector("#mastery-xp-rate").textContent=`+${Math.round(masteryXpGain(action,currentSkill)*Math.sqrt(batch))} MXP`;
  document.querySelector("#mastery-xp-text").textContent=mLevel===MAX_LEVEL ? "Maximum mastery" : `${mxp-mFloor} / ${mCeiling-mFloor} Mastery XP`;
  document.querySelector("#mastery-xp-bar").style.width=mLevel===MAX_LEVEL ? "100%" : `${(mxp-mFloor)/(mCeiling-mFloor)*100}%`;
  const actionLevel=actionMasteryLevel(currentSkill,action), actionXpValue=actionMasteryXp(currentSkill,action);
  const actionFloor=actionMasteryXpForLevel(actionLevel), actionCeiling=actionMasteryXpForLevel(actionLevel+1);
  document.querySelector("#action-mastery-level").textContent=actionLevel;
  document.querySelector("#action-mastery-bonus").textContent=`${Math.round(actionMasteryDoubleChance(currentSkill,action)*100)}% bonus output`;
  document.querySelector("#action-mastery-text").textContent=actionLevel===50?"Maximum action expertise":`${actionXpValue-actionFloor} / ${actionCeiling-actionFloor} Expertise XP`;
  document.querySelector("#action-mastery-bar").style.width=actionLevel===50?"100%":`${(actionXpValue-actionFloor)/(actionCeiling-actionFloor)*100}%`;
}

function renderProgressSummary() {
  const ids=Object.keys(state.skills);
  document.querySelector("#total-level").textContent=ids.reduce((total,id)=>total+skillLevel(id),0);
  document.querySelector("#combat-level").textContent=combatLevel();
  productionSkills.forEach(id=>document.querySelector(`#nav-${id}`).textContent=skillLevel(id));
}
function renderMarketplace() {
  ensureMarket();
  document.querySelector("#market-coins").textContent=state.coins.toLocaleString();
  document.querySelector("#market-potions").textContent=state.inventory[POTION_ITEM]||0;
  document.querySelector("#buy-potion").disabled=state.coins<POTION_COST;
  document.querySelector("#market-refresh").textContent=`Rotates ${todayKey()} UTC`;
  document.querySelector("#merchant-stock").innerHTML=state.market.stock.map(id=>{
    const offer=rotatingMerchantData.find(item=>item.id===id);
    if (!offer) return "";
    const bought=state.market.purchases[id]||0;
    const cost=Math.round(offer.cost*Math.pow(1.35,bought));
    return `<div class="merchant-offer">
      ${itemIcon(offer.item)}
      <div><strong>${offer.name}</strong><span>${offer.description}</span><small>${offer.qty} ${offer.item} · purchased ${bought}</small></div>
      <button class="primary-button merchant-buy" data-offer="${id}" ${state.coins<cost?"disabled":""}>${cost} coins</button>
    </div>`;
  }).join("");
  const rerollCost=100+(state.contracts.rerolls||0)*75;
  document.querySelector("#market-contract-reroll").textContent=`Reroll · ${rerollCost} coins`;
  document.querySelector("#market-contract-reroll").disabled=state.coins<rerollCost || state.contracts.items.some(contract=>contract.claimed);
  document.querySelector("#market-grid").innerHTML=productionSkills.map(id=>{
    const upgrades=state.upgrades[id];
    const speedMax=upgrades.speed>=upgradeCaps.speed, yieldMax=upgrades.yield>=upgradeCaps.yield, masteryMax=(upgrades.mastery||0)>=upgradeCaps.mastery;
    const speedCost=upgradeCost("speed",upgrades.speed), yieldCost=upgradeCost("yield",upgrades.yield), masteryCost=upgradeCost("mastery",upgrades.mastery||0);
    const yieldLocked=!yieldMax && !upgradeUnlocked(id,"yield",upgrades.yield);
    const yieldLock=upgradeLockText(id,"yield",upgrades.yield);
    return `<article class="market-card">
      <header><h3>${skillData[id].name}</h3><img class="market-skill-icon" src="${skillIconPath(id)}" alt=""></header>
      <div class="upgrade-row"><div><h4>Honed Tools - ${upgrades.speed}/10</h4><p>5% faster actions per rank. Current bonus: ${upgrades.speed*5}%.</p></div><button class="primary-button market-buy" data-skill="${id}" data-type="speed" ${speedMax||state.coins<speedCost?"disabled":""}>${speedMax?"MAX":`${speedCost} coins`}</button></div>
      <div class="upgrade-row"><div><h4>Expanded Kit - ${upgrades.yield}/${upgradeCaps.yield}</h4><p>Gain +1 item per action per rank. Ranks unlock at levels ${yieldUpgradeRequirements.join(", ")} and never increase recipe costs.</p></div><button class="primary-button market-buy" data-skill="${id}" data-type="yield" ${yieldMax||yieldLocked||state.coins<yieldCost?"disabled":""}>${yieldMax?"MAX":yieldLocked?yieldLock:`${yieldCost} coins`}</button></div>
      <div class="upgrade-row"><div><h4>Masterwork Manual - ${upgrades.mastery||0}/3</h4><p>Gain 5% more Skill Mastery and Action Expertise XP per rank.</p></div><button class="primary-button market-buy" data-skill="${id}" data-type="mastery" ${masteryMax||state.coins<masteryCost?"disabled":""}>${masteryMax?"MAX":`${masteryCost} coins`}</button></div>
    </article>`;
  }).join("");
  document.querySelectorAll(".market-buy").forEach(button=>button.onclick=()=>{
    const {skill,type}=button.dataset, level=state.upgrades[skill][type], cost=upgradeCost(type,level);
    if (level>=upgradeCaps[type]) return toast("Upgrade is already at maximum rank");
    if (!upgradeUnlocked(skill,type,level)) return toast(upgradeLockText(skill,type,level));
    if (state.coins<cost) return toast("Not enough coins");
    state.coins-=cost; state.upgrades[skill][type]++;
    toast(`${skillData[skill].name} ${type} upgraded`);
    saveState(); render();
  });
  document.querySelectorAll(".merchant-buy").forEach(button=>button.onclick=()=>buyMarketStock(button.dataset.offer));
}

function renderAchievementTrack(track) {
  const progress=achievementTrackState(track);
  const current=progress.next||progress.milestones[progress.milestones.length-1];
  const progressText=progress.complete
    ? `${current.goal.toLocaleString()} reached`
    : `${Math.min(progress.progress,current.goal).toLocaleString()} / ${current.goal.toLocaleString()}`;
  const rewardText=progress.complete
    ? "All milestone rewards claimed"
    : formatReward(current.reward);
  return `<article class="achievement-card ${progress.complete?"mastered":progress.completed?"progressed":""}">
    <header>
      <img src="${track.icon}" alt="">
      <div><small>Tier ${progress.completed} / ${progress.milestones.length}</small><strong>${track.name}</strong></div>
    </header>
    <p>${track.description}</p>
    <div class="achievement-tiers" aria-label="${progress.completed} of ${progress.milestones.length} milestones completed">
      ${progress.milestones.map(milestone=>`<i class="${state.achievements.includes(milestone.id)?"complete":""}" title="${milestone.name}: ${milestone.goal.toLocaleString()}"></i>`).join("")}
    </div>
    <div class="achievement-next"><span>${progress.complete?"Track mastered":current.name}</span><strong>${progressText}</strong></div>
    <div class="meter achievement-meter"><i style="width:${progress.complete?100:Math.min(100,progress.progress/current.goal*100)}%"></i></div>
    <small class="achievement-reward">${rewardText}</small>
    <small class="achievement-bonus">${track.bonusText}</small>
  </article>`;
}

function renderEnemyMastery(enemy) {
  const track=enemyAchievementTracks.find(item=>item.enemyName===enemy.name);
  const progress=achievementTrackState(track);
  const current=progress.next||progress.milestones[progress.milestones.length-1];
  const coinBonus=progress.completed*2;
  const gearBonus=(progress.completed*.1).toFixed(1);
  return `<div class="bestiary-mastery">
    <div><strong>Hunt Mastery ${progress.completed}/${progress.milestones.length}</strong><span>+${coinBonus}% coins · +${gearBonus}% gear chance</span></div>
    <div class="meter"><i style="width:${progress.complete?100:Math.min(100,progress.progress/current.goal*100)}%"></i></div>
    <small>${progress.complete?"Nemesis mastery complete":`Next: ${current.name} at ${current.goal.toLocaleString()} kills - ${formatReward(current.reward)}`}</small>
  </div>`;
}

function renderStarterQuestCard(quest) {
  const progress=starterQuestProgress(quest);
  const ready=progress>=quest.goal;
  const claimed=starterQuestClaimed(quest);
  return `<article class="starter-card ${claimed?"claimed":ready?"ready":""}">
    <header><div><span>${quest.type==="enemyKills"?"hunt":quest.type}</span><h4>${quest.name}</h4></div><strong>${progress.toLocaleString()} / ${quest.goal.toLocaleString()}</strong></header>
    <p>${quest.description}</p>
    <div class="meter contract-meter"><i style="width:${Math.min(100,progress/quest.goal*100)}%"></i></div>
    <footer><span>${formatReward(quest.reward)}</span><button class="secondary-button starter-claim" data-starter="${quest.id}" ${!ready||claimed?"disabled":""}>${claimed?"Claimed":"Claim"}</button></footer>
  </article>`;
}

function renderBountyCard(zoneIndex,bounty) {
  const current=zoneBountyState(zoneIndex,bounty.id);
  const goal=bountyGoal(zoneIndex,bounty);
  const progress=Math.min(goal,current.progress||0);
  const ready=progress>=goal;
  const reward=bountyReward(zoneIndex,bounty);
  return `<article class="bounty-card ${ready?"ready":""}">
    <header><div><span>${bounty.type.replace("Kills","")}</span><h4>${bounty.name}</h4></div><strong>${progress.toLocaleString()} / ${goal.toLocaleString()}</strong></header>
    <p>${bounty.description}</p>
    <div class="meter contract-meter"><i style="width:${Math.min(100,progress/goal*100)}%"></i></div>
    <footer><span>${formatReward(reward)}</span><button class="secondary-button bounty-claim" data-zone="${zoneIndex}" data-bounty="${bounty.id}" ${ready?"":"disabled"}>Claim</button></footer>
    <small>Completed ${(current.completions||0).toLocaleString()} times. Later completions increase the requirement and payout.</small>
  </article>`;
}

function renderBountyZone(zone,zoneIndex) {
  return `<section class="bounty-zone">
    <header><div><span>Zone ${zoneIndex+1}</span><h4>${zone.name}</h4></div><strong>${state.bossDefeated[zoneIndex]?"Boss cleared":"Boss pending"}</strong></header>
    <div class="bounty-cards">${zoneBountyDefinitions(zoneIndex).map(bounty=>renderBountyCard(zoneIndex,bounty)).join("")}</div>
  </section>`;
}

function renderChapterCard(zoneIndex) {
  const chapter=chapterState(zoneIndex);
  const finished=chapter.steps.filter(step=>step.complete).length;
  const locked=zoneIndex>=state.unlockedZones;
  return `<article class="chapter-card ${chapter.complete?"complete":""} ${chapter.claimed?"claimed":""} ${locked?"locked":""}">
    <header><div><span>${chapter.subtitle}</span><h4>${chapter.name}</h4></div><strong>${finished} / ${chapter.steps.length}</strong></header>
    <p>${locked?`Defeat ${zoneData[zoneIndex-1]?.boss.name||"the previous boss"} to unlock this chapter.`:chapter.description}</p>
    <div class="chapter-steps">${chapter.steps.map(step=>`
      <button class="chapter-step ${step.complete?"done":""}" data-goal-view="${step.view}" ${locked?"disabled":""}>
        <strong>${step.complete?"Done":"Next"}: ${step.label}</strong><span>${step.progress.toLocaleString()} / ${step.goal.toLocaleString()}</span>
      </button>`).join("")}</div>
    <footer><span>${formatReward(chapter.reward)}</span><button class="secondary-button chapter-claim" data-chapter="${chapter.id}" ${!chapter.complete||chapter.claimed||locked?"disabled":""}>${chapter.claimed?"Claimed":"Claim Chapter"}</button></footer>
  </article>`;
}

function renderAdventure() {
  ensureContracts();
  document.querySelector("#board-standing").textContent=(state.stats.contracts||0).toLocaleString();
  const starterClaimed=starterQuestData.filter(starterQuestClaimed).length;
  document.querySelector("#starter-quest-count").textContent=`${starterClaimed} / ${starterQuestData.length} complete`;
  document.querySelector("#starter-quest-list").innerHTML=starterQuestData.map(renderStarterQuestCard).join("");
  document.querySelectorAll(".starter-claim").forEach(button=>button.onclick=()=>claimStarterQuest(button.dataset.starter));
  const chapters=zoneData.map((zone,index)=>chapterState(index));
  document.querySelector("#chapter-count").textContent=`${chapters.filter(chapter=>chapter.claimed).length} / ${chapters.length} complete`;
  document.querySelector("#chapter-list").innerHTML=zoneData.map((zone,index)=>renderChapterCard(index)).join("");
  document.querySelectorAll(".chapter-claim").forEach(button=>button.onclick=()=>claimChapter(button.dataset.chapter));
  document.querySelectorAll(".chapter-step[data-goal-view]").forEach(button=>button.onclick=()=>navigate(button.dataset.goalView));
  const rerollCost=100+(state.contracts.rerolls||0)*75;
  document.querySelector("#contract-refresh").textContent=`Refreshes ${todayKey()} UTC · ${state.contracts.rerolls||0} rerolls`;
  document.querySelector("#contract-reroll").textContent=`Reroll ${rerollCost}c`;
  document.querySelector("#contract-reroll").disabled=state.coins<rerollCost || state.contracts.items.some(contract=>contract.claimed);
  document.querySelector("#contract-list").innerHTML=state.contracts.items.map(contract=>{
    const ready=contract.progress>=contract.goal;
    return `<div class="contract-card ${contract.claimed?"claimed":ready?"ready":""}">
      <header><div><span>${contract.type}</span><h4>${contract.name}</h4></div><strong>${contract.progress.toLocaleString()} / ${contract.goal.toLocaleString()}</strong></header>
      <p>${contract.description}</p>
      <div class="meter contract-meter"><i style="width:${Math.min(100,contract.progress/contract.goal*100)}%"></i></div>
      <footer><span>${formatReward(contract.reward)}</span><button class="secondary-button contract-claim" data-contract="${contract.id}" ${!ready||contract.claimed?"disabled":""}>${contract.claimed?"Claimed":"Claim"}</button></footer>
    </div>`;
  }).join("");
  document.querySelectorAll(".contract-claim").forEach(button=>button.onclick=()=>claimContract(button.dataset.contract));
  document.querySelector("#town-projects").innerHTML=Object.entries(townProjectData).map(([id,project])=>{
    const level=state.town[id]||0, maxed=level>=project.max;
    const remaining=townProjectRemainingCost(id);
    const progress=townProjectContributionProgress(id);
    const complete=Object.values(remaining).every(qty=>qty<=0);
    const affordable=hasAvailableTownContribution(id)||complete;
    const neededText=Object.entries(remaining).filter(([,qty])=>qty>0).map(([item,qty])=>`${qty.toLocaleString()} ${item} remaining (${(state.inventory[item]||0).toLocaleString()} held)`).join(" + ");
    const contributedText=`Funded ${progress.paid.toLocaleString()} / ${progress.total.toLocaleString()} materials`;
    return `<div class="town-project">
      <header><div><h4>${project.name}</h4><span>Level ${level} / ${project.max}</span></div><strong>${project.description}</strong></header>
      <p>${maxed?"Project complete":neededText||"Level fully funded. Finish construction."}</p>
      <div class="meter town-meter"><i style="width:${maxed?100:progress.pct}%"></i></div>
      <small class="town-needed">${maxed?"Maximum level reached":contributedText}</small>
      ${level>=3 ? state.townBranches[id]
        ? `<div class="town-branch active"><strong>${townBranchData[id][state.townBranches[id]].name}</strong><span>${townBranchData[id][state.townBranches[id]].description}</span></div>`
        : `<div class="town-branch-options">${Object.entries(townBranchData[id]).map(([branch,data])=>`<button class="town-branch-choice" data-project="${id}" data-branch="${branch}"><strong>${data.name}</strong><span>${data.description}</span></button>`).join("")}</div>`
        : `<small class="branch-lock">Specialization unlocks at project level 3.</small>`}
      <button class="primary-button town-build" data-project="${id}" ${maxed||!affordable?"disabled":""}>${maxed?"Maximum":complete?"Finish Level":"Contribute Available"}</button>
    </div>`;
  }).join("");
  document.querySelectorAll(".town-build").forEach(button=>button.onclick=()=>buildTownProject(button.dataset.project));
  document.querySelectorAll(".town-branch-choice").forEach(button=>button.onclick=()=>chooseTownBranch(button.dataset.project,button.dataset.branch));
  const bountyEntries=zoneData.slice(0,state.unlockedZones).flatMap((zone,zoneIndex)=>zoneBountyDefinitions(zoneIndex).map(bounty=>({zoneIndex,bounty,state:zoneBountyState(zoneIndex,bounty.id)})));
  const readyBounties=bountyEntries.filter(entry=>(entry.state.progress||0)>=bountyGoal(entry.zoneIndex,entry.bounty)).length;
  document.querySelector("#bounty-count").textContent=`${readyBounties} ready`;
  document.querySelector("#bounty-list").innerHTML=zoneData.slice(0,state.unlockedZones).map(renderBountyZone).join("");
  document.querySelectorAll(".bounty-claim").forEach(button=>button.onclick=()=>claimBounty(Number(button.dataset.zone),button.dataset.bounty));
  const visibleTracks=[...generalAchievementTracks,...zoneAchievementTracks.slice(0,state.unlockedZones)];
  const completedMilestones=achievementData.filter(achievement=>state.achievements.includes(achievement.id)).length;
  const masteredTracks=visibleTracks.filter(track=>achievementTrackState(track).complete).length;
  document.querySelector("#achievement-count").textContent=`${completedMilestones} milestones · ${masteredTracks} tracks mastered`;
  document.querySelector("#achievement-grid").innerHTML=visibleTracks.map(renderAchievementTrack).join("");
  document.querySelector("#bestiary-grid").innerHTML=zoneData.slice(0,state.unlockedZones).map((zone,index)=>{
    const enemies=zone.enemies.map(enemy=>`<div class="bestiary-entry">
      <img src="assets/enemies/${enemy.image}.png" alt="">
      <div><strong>${enemy.name}</strong><span>${state.bestiary.kills[enemy.name]||0} defeated</span><small>${enemy.item} 100% - ${enemy.bonusItem} ${Math.round(enemyBonusDropChance(enemy,index,0)*100)}% - gear ${Math.round(threatGearChance(index,enemy.name)*1000)/10}%</small><small>${enemy.tactic||""}</small>${renderEnemyMastery(enemy)}</div>
    </div>`).join("");
    const relic=relicPowerData[zone.boss.item];
    return `<section class="bestiary-zone"><header><div><span>Zone ${index+1}</span><h4>${zone.name}</h4></div><strong>${state.bossDefeated[index]?"Boss cleared":"Boss undefeated"}</strong></header>
      ${enemies}
      <div class="bestiary-entry boss-record"><img src="assets/enemies/${zone.boss.image}.png" alt=""><div><strong>${zone.boss.name}</strong><span>${state.bestiary.bosses[zone.boss.name]||0} victories</span><small>${zone.boss.item}: ${relic?.description||"Permanent relic"} · ${state.relicsActivated[zone.boss.item]?"attuned":"not attuned"}</small></div></div>
    </section>`;
  }).join("");
}

function renderInventoryLegacy() {
  const entries=Object.entries(state.inventory).filter(([,q])=>q>0);
  document.querySelector("#used-slots").textContent=entries.length.toLocaleString();
  document.querySelector("#equipment-slots").innerHTML=Object.entries(state.equipment).map(([slot,item])=>{
    const stats=equipmentStatsText(item);
    return `<div class="equipment-slot"><span>${capitalize(slot)}</span><div><strong>${item}</strong>${stats?`<small>${stats}</small>`:""}</div></div>`;
  }).join("");
  document.querySelector("#inventory-grid").innerHTML=entries.length ? entries.map(([item,qty])=>{
    const equip=equipmentData[item]?.slot;
    const meta=itemMeta(item), usable=Boolean(meta.consume), sellValue=meta.value||1;
    return `<div class="inventory-item">
      <header>${itemIcon(item)}<div><span class="item-category">${meta.category}</span><h4>${item}</h4></div><strong>${qty}</strong></header>
      <p class="item-description">${meta.description}</p>
      <p class="item-use"><b>Use:</b> ${equip?equipmentStatsText(item):meta.use}</p>
      <div class="item-actions">
        ${equip?`<button class="primary-button equip-button" data-item="${item}" data-slot="${equip}">Equip</button>`:""}
        ${usable?`<button class="primary-button use-item-button" data-item="${item}">Use</button>`:""}
        <button class="sell-button" data-item="${item}" title="Sell one for ${sellValue} coins">Sell 1 · ${sellValue}c</button>
      </div>
    </div>`;
  }).join("") : `<div class="inventory-empty">Your backpack is empty. Train a skill or defeat an enemy to find items.</div>`;
  document.querySelectorAll(".equip-button").forEach(btn=>btn.onclick=()=>{
    const previous=state.equipment[btn.dataset.slot];
    state.equipment[btn.dataset.slot]=btn.dataset.item;
    addItem(btn.dataset.item,-1);
    if (previous && previous!=="None" && !["Rusty Sword","Wooden Shield","Leather Jerkin"].includes(previous)) addItem(previous,1);
    state.heroHp=Math.min(state.heroHp,maxHp());
    toast(`${btn.dataset.item} equipped`); render();
  });
  document.querySelectorAll(".use-item-button").forEach(btn=>btn.onclick=()=>useInventoryItem(btn.dataset.item));
  document.querySelectorAll(".sell-button").forEach(btn=>btn.onclick=()=>sellInventoryItem(btn.dataset.item));
}

function compactList(items=[],limit=3) {
  const unique=[...new Set(items.filter(Boolean))];
  return unique.length>limit ? `${unique.slice(0,limit).join(", ")} +${unique.length-limit} more` : unique.join(", ");
}

function itemCraftUses(name) {
  const uses=[];
  productionSkills.forEach(id=>{
    skillData[id].actions
      .filter(action=>action.costs?.[name])
      .forEach(action=>uses.push(`${skillData[id].name}: ${action.name}`));
  });
  craftingRecipes
    .filter(recipe=>recipe.costs?.[name])
    .forEach(recipe=>uses.push(`Craft ${recipe.name}`));
  Object.values(townProjectData)
    .filter(project=>project.baseCost?.[name])
    .forEach(project=>uses.push(`${project.name} project`));
  return uses;
}

function itemSources(name) {
  const sources=[];
  productionSkills.forEach(id=>{
    skillData[id].actions
      .filter(action=>action.item===name)
      .forEach(action=>sources.push(`${skillData[id].name}: ${action.name}`));
  });
  craftingRecipes
    .filter(recipe=>recipe.name===name)
    .forEach(recipe=>sources.push(`Crafting: Smithing ${recipe.level}`));
  zoneData.forEach(zone=>{
    zone.enemies.forEach(enemy=>{
      if (enemy.item===name) sources.push(`${zone.name}: ${enemy.name} 100%`);
      if (enemy.bonusItem===name) sources.push(`${zone.name}: ${enemy.name} ${Math.round((enemy.bonusChance??.45)*100)}%`);
    });
    if (zone.boss.item===name) sources.push(`${zone.name}: ${zone.boss.name} boss`);
    (zone.cache?.items||[])
      .filter(drop=>drop.item===name)
      .forEach(()=>sources.push(`${zone.name}: ${zone.cache.name}`));
  });
  rotatingMerchantData.forEach(offer=>{
    if (offer.item===name || offer.items?.[name]) sources.push("Traveling Quartermaster");
  });
  return sources;
}

function itemKeepAdvice(name) {
  const meta=itemMeta(name);
  const uses=itemCraftUses(name);
  if (relicPowerData[name] && !state.relicsActivated[name]) return "Attune one copy before selling extras.";
  if (relicPowerData[name]) return uses.length ? "Relic is active; keep spares for crafting or exchange extras." : "Relic is active; exchange or sell spare copies.";
  if (name==="Forge Essence") return "Save for reforging, enchanting cleanup, and gear progression.";
  if (name==="Reforge Token") return "Save for rerolling affixes on promising gear.";
  if (["Food","Consumable","Tonic"].includes(meta.category)) return "Keep a field supply before long combat runs.";
  if (uses.length) return "Keep enough for active recipes and township contributions.";
  if (meta.category==="Combat Material") return "Combat material; useful for contracts, alchemy, crafting, or selling surplus.";
  return "Safe to sell when you have no near-term recipe need.";
}

function itemDetailHtml(name) {
  const uses=compactList(itemCraftUses(name),4)||"No direct recipe currently uses this.";
  const sources=compactList(itemSources(name),3)||"Earned through progression, rewards, or marketplace stock.";
  return `<div class="item-details">
    <span><b>Used in:</b> ${uses}</span>
    <span><b>Best source:</b> ${sources}</span>
    <span><b>Keep/sell:</b> ${itemKeepAdvice(name)}</span>
  </div>`;
}

function gearPowerScore(gear) {
  const stats=gearStats(gear);
  return Math.round(
    (stats.attack||0)*1.2+
    (stats.defence||0)*1.05+
    (stats.maxHit||0)*2.2+
    (stats.maxHp||0)*.16+
    (stats.crit||0)*150+
    (stats.dodge||0)*130+
    (gear.upgrade||0)*4+
    Object.keys(rarityData).indexOf(gear.rarity)*3
  );
}

function formatSignedStatValue(stat,value) {
  const amount=formatStatValue(stat,Math.abs(value));
  return value>0 ? `+${amount}` : value<0 ? `-${amount}` : "0";
}

function gearComparisonHtml(gear) {
  const slot=equipmentData[gear.baseName]?.slot;
  const current=gearById(state.equipment[slot]);
  const candidate=gearStats(gear);
  const score=gearPowerScore(gear);
  if (!current) {
    return `<div class="gear-compare">No comparable gear is equipped. Estimated power ${score}.</div>`;
  }
  const equipped=gearStats(current);
  const currentScore=gearPowerScore(current);
  const labels={attack:"ATK",defence:"DEF",maxHit:"Max Hit",maxHp:"HP",crit:"Crit",dodge:"Dodge"};
  const rows=["attack","defence","maxHit","maxHp","crit","dodge"].map(stat=>{
    const change=(candidate[stat]||0)-(equipped[stat]||0);
    return `<span class="${change>0?"positive":change<0?"negative":"neutral"}"><b>${labels[stat]}</b>${formatSignedStatValue(stat,change)}</span>`;
  }).join("");
  const scoreChange=score-currentScore;
  return `<div class="gear-compare">Compared to ${gearDisplayName(current)}: power ${formatSignedStatValue("score",scoreChange)} (${score} vs ${currentScore}).</div><div class="gear-compare-grid">${rows}</div>`;
}

function inventoryEntrySearchText(entry) {
  if (entry.kind==="gear") {
    const gear=entry.gear;
    return [entry.name,gear.baseName,gear.rarity,equipmentData[gear.baseName]?.slot,equipmentSetName(gear.baseName),equipmentStatsText(gear.id)].join(" ").toLowerCase();
  }
  const meta=itemMeta(entry.name);
  return [entry.name,meta.category,meta.description,meta.use,itemCraftUses(entry.name).join(" "),itemSources(entry.name).join(" ")].join(" ").toLowerCase();
}

function inventoryEntryMatches(entry,category) {
  if (category==="all") return true;
  if (category==="locked") return entry.locked;
  if (entry.kind==="gear") return category==="equipment";
  const meta=itemMeta(entry.name);
  if (category==="equipment") return meta.category==="Equipment";
  if (category==="food") return meta.category==="Food";
  if (category==="tonic") return ["Consumable","Tonic"].includes(meta.category);
  if (category==="crafting") return itemCraftUses(entry.name).length>0;
  if (category==="upgrade") return ["Forge Essence","Reforge Token"].includes(entry.name);
  if (category==="combat") return meta.category==="Combat Material";
  if (category==="relic") return meta.category==="Boss Relic" || Boolean(relicPowerData[entry.name]);
  if (category==="resource") return ["Skill Resource","Crafting Material","Material","Guild Service"].includes(meta.category);
  return entry.category===category;
}

function renderInventory() {
  const equippedIds=new Set(Object.values(state.equipment));
  const search=state.inventoryUi.search.trim().toLowerCase();
  const category=state.inventoryUi.category;
  const stackEntries=Object.entries(state.inventory).filter(([,qty])=>qty>0).map(([name,qty])=>{
    const unitValue=itemMeta(name).value||1;
    const tier=Math.max(0,...itemCraftUses(name).map(use=>{
      const recipe=craftingRecipes.find(item=>use.endsWith(item.name));
      return recipe?.level||0;
    }));
    return {kind:"stack",name,qty,value:unitValue*qty,unitValue,tier,locked:state.lockedItems.includes(name),category:inventoryCategory(name)};
  });
  const gearEntries=state.gearVault.filter(gear=>!equippedIds.has(gear.id)).map(gear=>({
    kind:"gear",name:gearDisplayName(gear),qty:1,value:gearValue(gear),category:"equipment",
    rarity:Object.keys(rarityData).indexOf(gear.rarity),tier:gearRequirement(gear.baseName),locked:state.lockedGear.includes(gear.id),gear
  }));
  const visible=[...gearEntries,...stackEntries]
    .filter(entry=>(!search || inventoryEntrySearchText(entry).includes(search)) && inventoryEntryMatches(entry,category))
    .sort((a,b)=>{
      if (state.inventoryUi.sort==="quantity") return b.qty-a.qty || a.name.localeCompare(b.name);
      if (state.inventoryUi.sort==="value") return b.value-a.value || a.name.localeCompare(b.name);
      if (state.inventoryUi.sort==="rarity") return (b.rarity||0)-(a.rarity||0) || a.name.localeCompare(b.name);
      if (state.inventoryUi.sort==="tier") return (b.tier||0)-(a.tier||0) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  document.querySelector("#used-slots").textContent=(stackEntries.length+gearEntries.length).toLocaleString();
  document.querySelector("#inventory-search").value=state.inventoryUi.search;
  document.querySelector("#inventory-category").value=state.inventoryUi.category;
  document.querySelector("#inventory-sort").value=state.inventoryUi.sort;
  const lockedCount=stackEntries.filter(entry=>entry.locked).length+gearEntries.filter(entry=>entry.locked).length;
  const totalValue=[...stackEntries,...gearEntries].reduce((sum,entry)=>sum+entry.value,0);
  document.querySelector("#inventory-summary").innerHTML=[
    ["Stacks",stackEntries.length.toLocaleString()],
    ["Spare Gear",gearEntries.length.toLocaleString()],
    ["Locked",lockedCount.toLocaleString()],
    ["Sell Value",`${totalValue.toLocaleString()}c`]
  ].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  renderHeroModels();
  const setText=equipmentStatsObjectText(setBonuses());
  document.querySelector("#equipment-slots").innerHTML=Object.entries(state.equipment).map(([slot,ref])=>{
    const gear=gearById(ref);
    const name=gear ? gearDisplayName(gear) : ref;
    const rarity=gear?.rarity||"common";
    const stats=equipmentStatsText(ref);
    return `<div class="equipment-slot rarity-${rarity}">
      <span>${capitalize(slot)}</span>
      <div><strong>${name}</strong>${stats?`<small>${stats}</small>`:""}</div>
    </div>`;
  }).join("")+(setText?`<div class="set-bonus"><strong>Active Set Bonuses</strong><span>${setText}</span></div>`:"");
  document.querySelector("#inventory-grid").innerHTML=visible.length ? visible.map(entry=>
    entry.kind==="gear" ? gearCardHtml(entry.gear) : inventoryStackCardHtml(entry.name,entry.qty)
  ).join("") : `<div class="inventory-empty">No items match these filters. Change the search or earn more supplies.</div>`;
  document.querySelectorAll(".equip-gear-button").forEach(button=>button.onclick=()=>equipGear(button.dataset.gear));
  document.querySelectorAll(".upgrade-gear-button").forEach(button=>button.onclick=()=>upgradeGear(button.dataset.gear));
  document.querySelectorAll(".enchant-gear-button").forEach(button=>button.onclick=()=>enchantGear(button.dataset.gear));
  document.querySelectorAll(".reforge-gear-button").forEach(button=>button.onclick=()=>reforgeGear(button.dataset.gear));
  document.querySelectorAll(".salvage-gear-button").forEach(button=>button.onclick=()=>salvageGear(button.dataset.gear));
  document.querySelectorAll(".lock-gear-button").forEach(button=>button.onclick=()=>toggleGearLock(button.dataset.gear));
  document.querySelectorAll(".sell-gear-button").forEach(button=>button.onclick=()=>sellGear(button.dataset.gear));
  document.querySelectorAll(".use-item-button").forEach(button=>button.onclick=()=>useInventoryItem(button.dataset.item));
  document.querySelectorAll(".exchange-relic-button").forEach(button=>button.onclick=()=>exchangeRelic(button.dataset.item));
  document.querySelectorAll(".lock-item-button").forEach(button=>button.onclick=()=>toggleItemLock(button.dataset.item));
  document.querySelectorAll(".sell-button[data-item]").forEach(button=>button.onclick=()=>sellInventoryItem(button.dataset.item,button.dataset.amount));
}

function inventoryCategory(name) {
  const category=itemMeta(name).category;
  if (category==="Food") return "food";
  if (["Consumable","Tonic"].includes(category)) return "tonic";
  if (["Combat Material","Boss Relic"].includes(category)) return "combat";
  if (category==="Equipment") return "equipment";
  if (["Forge Essence","Reforge Token"].includes(name)) return "upgrade";
  if (itemCraftUses(name).length) return "crafting";
  return "resource";
}

function inventoryStackCardHtml(name,qty) {
  const meta=itemMeta(name), usable=Boolean(meta.consume)||Boolean(relicPowerData[name])||Boolean(blueprintData[name]), value=meta.value||1;
  const locked=state.lockedItems.includes(name);
  return `<div class="inventory-item ${locked?"item-locked":""}">
    <header>${itemIcon(name)}<div><span class="item-category">${meta.category}</span><h4>${name}</h4></div><strong>${qty}</strong></header>
    <p class="item-description">${meta.description}</p>
    <p class="item-use"><b>Use:</b> ${meta.use}</p>
    ${itemDetailHtml(name)}
    <div class="item-actions">
      ${usable?`<button class="primary-button use-item-button" data-item="${name}">${relicPowerData[name]?(state.relicsActivated[name]?"Attuned":"Attune Relic"):blueprintData[name]?(state.blueprints.includes(name)?"Learned":"Learn Recipes"):"Use"}</button>`:""}
      ${relicPowerData[name]&&state.relicsActivated[name]?`<button class="secondary-button exchange-relic-button" data-item="${name}">Guild Exchange</button>`:""}
      <button class="secondary-button lock-item-button" data-item="${name}">${locked?"Unlock":"Lock"}</button>
      <button class="sell-button" data-item="${name}" data-amount="1" ${locked?"disabled":""}>Sell 1 · ${value}c</button>
      ${qty>=10?`<button class="sell-button" data-item="${name}" data-amount="10" ${locked?"disabled":""}>Sell 10</button>`:""}
      ${qty>1?`<button class="sell-button" data-item="${name}" data-amount="all" ${locked?"disabled":""}>Sell All</button>`:""}
    </div>
  </div>`;
}

function gearCardHtml(gear) {
  const rarity=rarityData[gear.rarity]||rarityData.common;
  const slot=equipmentData[gear.baseName]?.slot;
  const locked=state.lockedGear.includes(gear.id);
  const cost=gearUpgradeCost(gear);
  const material=gearUpgradeMaterial(gear);
  const enchant=enchantCost(gear);
  const requirement=gearRequirement(gear.baseName);
  const canEquip=combatLevel()>=requirement;
  const essenceCost=Math.max(3,2+(gear.affixes?.length||0)*2);
  const affixes=(gear.affixes||[]).map(affix=>`<span>${affixData[affix.id]?.name||capitalize(affix.stat)}: +${formatStatValue(affix.stat,affix.value)}</span>`).join("");
  return `<div class="inventory-item gear-item rarity-${gear.rarity}" style="--rarity-color:${rarity.color}">
    <header>${itemIcon(gear.baseName)}<div><span class="item-category">${rarity.name} ${capitalize(slot)}</span><h4>${gearDisplayName(gear)}</h4></div><strong>+${gear.upgrade||0}</strong></header>
    <p class="gear-stats">${equipmentStatsText(gear.id)}</p>
    <p class="gear-requirement">Requires Combat ${requirement} - ${equipmentSetName(gear.baseName)} set - Power ${gearPowerScore(gear)}</p>
    <div class="gear-affixes">${affixes||"<span>No magical affixes</span>"}</div>
    ${gearComparisonHtml(gear)}
    <div class="item-actions">
      <button class="primary-button equip-gear-button" data-gear="${gear.id}" ${canEquip?"":"disabled"}>${canEquip?"Equip":`Combat ${requirement}`}</button>
      <button class="secondary-button upgrade-gear-button" data-gear="${gear.id}" ${(gear.upgrade||0)>=5||state.coins<cost.coins||(state.inventory[material]||0)<cost.material?"disabled":""}>Upgrade ${cost.coins}c + ${cost.material} ${material}</button>
      <button class="secondary-button enchant-gear-button" data-gear="${gear.id}" title="Requires Smithing 40, Silver Bars, and Frozen Sigils." ${!canEnchantGear(gear)?"disabled":""}>Enchant ${enchant.silver} Silver Bar + ${enchant.sigil} Sigil</button>
      <button class="secondary-button reforge-gear-button" data-gear="${gear.id}" ${locked?"disabled":""}>Reforge · 1 Token or ${essenceCost} Essence</button>
      <button class="secondary-button salvage-gear-button" data-gear="${gear.id}" ${locked?"disabled":""}>Salvage</button>
      <button class="secondary-button lock-gear-button" data-gear="${gear.id}">${locked?"Unlock":"Lock"}</button>
      <button class="sell-button sell-gear-button" data-gear="${gear.id}" ${locked?"disabled":""}>Sell · ${gearValue(gear)}c</button>
    </div>
  </div>`;
}

function formatStatValue(stat,value) {
  return ["crit","dodge"].includes(stat) ? `${Math.round(value*100)}%` : Math.round(value);
}

function equipmentStatsObjectText(stats={}) {
  return [["attack","ATK"],["defence","DEF"],["maxHit","Max Hit"],["maxHp","HP"],["crit","Crit"],["dodge","Dodge"]]
    .filter(([stat])=>stats[stat])
    .map(([stat,label])=>`+${formatStatValue(stat,stats[stat])} ${label}`)
    .join(" / ");
}

function gearComparisonText(gear) {
  const slot=equipmentData[gear.baseName]?.slot;
  const current=gearById(state.equipment[slot]);
  if (!current) return "Improves on starter equipment.";
  const candidate=gearStats(gear), equipped=gearStats(current);
  const changes=["attack","defence","maxHit","maxHp","crit","dodge"]
    .map(stat=>[stat,(candidate[stat]||0)-(equipped[stat]||0)])
    .filter(([,change])=>change)
    .map(([stat,change])=>`${change>0?"+":""}${formatStatValue(stat,change)} ${stat==="maxHp"?"HP":stat==="maxHit"?"Max Hit":capitalize(stat)}`);
  return changes.length ? `Compared: ${changes.join(", ")}` : "Equivalent total stats to equipped gear.";
}

function gearRequirement(baseName) {
  return craftingRecipes.find(recipe=>recipe.name===baseName)?.level||1;
}

function bestGearBySlot() {
  const best={};
  state.gearVault.forEach(gear=>{
    const slot=equipmentData[gear.baseName]?.slot;
    if (!slot) return;
    if (!best[slot] || gearPowerScore(gear)>gearPowerScore(best[slot])) best[slot]=gear;
  });
  return best;
}

function protectBestGear() {
  const best=bestGearBySlot();
  const ids=new Set(state.lockedGear);
  Object.values(state.equipment).forEach(id=>{ if (gearById(id)) ids.add(id); });
  Object.values(best).forEach(gear=>ids.add(gear.id));
  const before=state.lockedGear.length;
  state.lockedGear=[...ids];
  const added=state.lockedGear.length-before;
  toast(added ? `Protected ${added} key gear pieces` : "Best gear is already protected");
  saveState();
  renderInventory();
}

function equipGear(id) {
  const gear=gearById(id), slot=equipmentData[gear?.baseName]?.slot;
  if (!gear||!slot) return;
  const requirement=gearRequirement(gear.baseName);
  if (combatLevel()<requirement) return toast(`Requires Combat level ${requirement}`);
  state.equipment[slot]=id;
  state.heroHp=Math.min(state.heroHp,maxHp());
  activity(`Equipped ${gearDisplayName(gear)}`,"gear");
  saveState(); render();
}

function gearSalvageReturn(gear) {
  const recipe=craftingRecipes.find(item=>item.name===gear.baseName);
  const material=gearUpgradeMaterial(gear);
  const materialCost=recipe?.costs?.[material]||1;
  const rarityIndex=Math.max(0,Object.keys(rarityData).indexOf(gear.rarity));
  const bars=Math.max(1,Math.floor(materialCost*.5)+(gear.upgrade||0));
  const essence=1+rarityIndex+(gear.affixes?.length||0)+(gear.upgrade||0);
  return {material,bars,essence};
}

function salvageGearBatch(gearList) {
  const totals={essence:0,materials:{}};
  const ids=new Set();
  gearList.forEach(gear=>{
    const result=gearSalvageReturn(gear);
    totals.materials[result.material]=(totals.materials[result.material]||0)+result.bars;
    totals.essence+=result.essence;
    ids.add(gear.id);
  });
  Object.entries(totals.materials).forEach(([material,qty])=>addItem(material,qty));
  addItem("Forge Essence",totals.essence);
  state.gearVault=state.gearVault.filter(item=>!ids.has(item.id));
  state.lockedGear=state.lockedGear.filter(item=>!ids.has(item));
  state.stats.salvaged=(state.stats.salvaged||0)+gearList.length;
  return totals;
}

function salvageGear(id) {
  const gear=gearById(id);
  if (!gear || state.lockedGear.includes(id) || Object.values(state.equipment).includes(id)) return;
  const totals=salvageGearBatch([gear]);
  const material=Object.entries(totals.materials)[0];
  activity(`Salvaged ${gearDisplayName(gear)}: ${material?.[1]||0} ${material?.[0]||"material"}, ${totals.essence} Essence`,"craft");
  saveState();
  render();
}

function salvageCommonGear() {
  const equipped=new Set(Object.values(state.equipment));
  const candidates=state.gearVault.filter(gear=>
    !equipped.has(gear.id) &&
    !state.lockedGear.includes(gear.id) &&
    gear.rarity==="common" &&
    !(gear.upgrade>0) &&
    !(gear.affixes?.length)
  );
  if (!candidates.length) return toast("No unlocked plain common spare gear to salvage");
  if (!confirm(`Salvage ${candidates.length} unlocked common spare gear pieces? Equipped, locked, upgraded, and affixed gear will be kept.`)) return;
  const totals=salvageGearBatch(candidates);
  const materialText=Object.entries(totals.materials).map(([item,qty])=>`${qty} ${item}`).join(", ");
  activity(`Bulk salvaged ${candidates.length} common gear: ${materialText}, ${totals.essence} Essence`,"craft");
  toast(`${candidates.length} common gear salvaged`);
  saveState();
  render();
}

function gearUpgradeMaterial(gear) {
  const set=equipmentSetName(gear.baseName);
  return equipmentTierData[set]?.bar||"Bronze Bar";
}

function gearUpgradeCost(gear) {
  const tier=Math.max(1,craftingRecipes.find(recipe=>recipe.name===gear.baseName)?.level||5);
  const rank=(gear.upgrade||0)+1;
  return {coins:Math.ceil(tier*12*Math.pow(1.65,rank-1)),material:rank};
}

function upgradeGear(id) {
  const gear=gearById(id);
  if (!gear || (gear.upgrade||0)>=5) return;
  const cost=gearUpgradeCost(gear), material=gearUpgradeMaterial(gear);
  if (state.coins<cost.coins || (state.inventory[material]||0)<cost.material) return toast("You need more coins and upgrade materials");
  state.coins-=cost.coins;
  addItem(material,-cost.material);
  gear.upgrade=(gear.upgrade||0)+1;
  activity(`${gearDisplayName(gear)} upgraded`,"gear");
  saveState(); render();
}

function enchantCost(gear) {
  const count=gear.affixes?.length||0;
  return {silver:Math.max(1,count+1),sigil:Math.max(1,Math.ceil((count+1)/2))};
}

function canEnchantGear(gear) {
  if (!gear || (gear.affixes?.length||0)>=4 || skillLevel("smithing")<40) return false;
  const cost=enchantCost(gear);
  return (state.inventory["Silver Bar"]||0)>=cost.silver && (state.inventory["Frozen Sigil"]||0)>=cost.sigil;
}

function enchantGear(id) {
  const gear=gearById(id);
  if (!canEnchantGear(gear)) return toast("Enchanting requires Smithing 40, Silver Bars, and Frozen Sigils");
  const cost=enchantCost(gear);
  addItem("Silver Bar",-cost.silver);
  addItem("Frozen Sigil",-cost.sigil);
  const used=new Set((gear.affixes||[]).map(affix=>affix.id));
  const available=Object.keys(affixData).filter(id=>!used.has(id));
  const idToAdd=available[Math.floor(Math.random()*available.length)];
  const data=affixData[idToAdd];
  const raw=data.range[0]+Math.random()*(data.range[1]-data.range[0]);
  gear.affixes.push({id:idToAdd,stat:data.stat,value:["crit","dodge"].includes(data.stat)?Number(raw.toFixed(3)):Math.round(raw)});
  const rarityOrder=Object.keys(rarityData);
  gear.rarity=rarityOrder[Math.min(rarityOrder.length-1,Math.max(rarityOrder.indexOf(gear.rarity),gear.affixes.length))];
  if (["rare","epic","legendary"].includes(gear.rarity)) state.stats.rareGear=Math.max(1,state.stats.rareGear||0);
  activity(`${gearDisplayName(gear)} enchanted`,"gear");
  checkAchievements();
  saveState(); render();
}

function reforgeGear(id) {
  const gear=gearById(id);
  if (!gear || state.lockedGear.includes(id)) return;
  const token=state.inventory["Reforge Token"]||0;
  const essenceCost=Math.max(3,2+(gear.affixes?.length||0)*2);
  const coinCost=Math.max(50,gearRequirement(gear.baseName)*8);
  if (!token && ((state.inventory["Forge Essence"]||0)<essenceCost || state.coins<coinCost)) {
    return toast(`Reforging needs 1 Token or ${essenceCost} Essence + ${coinCost} coins`);
  }
  if (token) {
    addItem("Reforge Token",-1);
  } else {
    addItem("Forge Essence",-essenceCost);
    state.coins-=coinCost;
  }
  if (gear.rarity==="common") gear.rarity="uncommon";
  gear.affixes=rollAffixes(gear.rarity);
  state.stats.reforged=(state.stats.reforged||0)+1;
  activity(`${gear.baseName} affixes reforged`,"gear");
  saveState();
  render();
}

function toggleGearLock(id) {
  state.lockedGear=state.lockedGear.includes(id) ? state.lockedGear.filter(item=>item!==id) : [...state.lockedGear,id];
  saveState(); renderInventory();
}

function toggleItemLock(name) {
  state.lockedItems=state.lockedItems.includes(name) ? state.lockedItems.filter(item=>item!==name) : [...state.lockedItems,name];
  saveState(); renderInventory();
}

function sellGear(id) {
  const gear=gearById(id);
  if (!gear || state.lockedGear.includes(id) || Object.values(state.equipment).includes(id)) return;
  const value=gearValue(gear);
  state.gearVault=state.gearVault.filter(item=>item.id!==id);
  state.lockedGear=state.lockedGear.filter(item=>item!==id);
  state.coins+=value;
  state.stats.sold=(state.stats.sold||0)+value;
  activity(`Sold ${gearDisplayName(gear)} for ${value} coins`,"coins");
  saveState(); render();
}

function useInventoryItem(name) {
  if (relicPowerData[name]) return activateRelic(name);
  if (blueprintData[name]) return learnBlueprint(name);
  const meta=itemMeta(name), effect=meta.consume;
  if (!effect || !(state.inventory[name]>0)) return;
  if ((effect.heal||effect.fullHeal) && !effect.buff && state.heroHp>=maxHp()) return toast(`${state.characterName} is already at full health`);
  addItem(name,-1);
  if (effect.fullHeal) state.heroHp=maxHp();
  if (effect.heal) state.heroHp=Math.min(maxHp(),state.heroHp+Math.max(1,Math.round(effect.heal*healingMultiplier())));
  if (effect.buff) state.buffs[effect.buff]=Math.max(Date.now(),state.buffs[effect.buff]||0)+effect.duration;
  toast(effect.buff ? `${name} active for ${formatDuration(effect.duration)}` : `${name} consumed`);
  saveState(); render();
}

function learnBlueprint(name) {
  const blueprint=blueprintData[name];
  if (!blueprint || !(state.inventory[name]>0)) return;
  if (state.blueprints.includes(name)) return toast("Those recipes are already learned");
  addItem(name,-1);
  state.blueprints.push(name);
  activity(`Recipes learned: ${blueprint.recipes.join(", ")}`,"craft");
  toast("New equipment recipes unlocked");
  saveState();
  render();
}

function activateRelic(name) {
  const relic=relicPowerData[name];
  if (!relic || !(state.inventory[name]>0)) return;
  if (state.relicsActivated[name]) return toast(`${relic.name} is already active`);
  const craftUses=[...productionSkills.flatMap(id=>skillData[id]?.actions||[]),...craftingRecipes].filter(recipe=>recipe.costs?.[name]).map(recipe=>recipe.name);
  if (craftUses.length && (state.inventory[name]||0)<=1 &&
    !window.confirm(`${name} is also a crafting material for ${craftUses.slice(0,3).join(", ")}. Attuning permanently consumes this trophy. Continue?`)) return;
  addItem(name,-1);
  state.relicsActivated[name]=true;
  activity(`Relic attuned: ${relic.name}`,"rare");
  toast(`${relic.name} unlocked`);
  saveState();
  render();
}

function exchangeRelic(name) {
  if (!relicPowerData[name] || !state.relicsActivated[name] || !(state.inventory[name]>0)) return;
  const zoneIndex=zoneData.findIndex(zone=>zone.boss.item===name);
  const coins=150*(zoneIndex+1);
  const essence=2+zoneIndex;
  addItem(name,-1);
  addItem("Forge Essence",essence);
  state.coins+=coins;
  activity(`Exchanged ${name} for ${coins} coins and ${essence} Essence`,"coins");
  saveState();
  render();
}

function sellInventoryItem(name,amount=1) {
  if (!(state.inventory[name]>0) || state.lockedItems.includes(name)) return;
  const quantity=amount==="all" ? state.inventory[name] : Math.min(state.inventory[name],Math.max(1,Number(amount)||1));
  const value=itemMeta(name).value||1;
  addItem(name,-quantity); state.coins+=value*quantity;
  state.stats.sold=(state.stats.sold||0)+value*quantity;
  activity(`Sold ${quantity} ${name} for ${value*quantity} coins`,"coins");
  saveState(); render();
}

function sellAllUnlocked() {
  const stacks=Object.entries(state.inventory).filter(([name,qty])=>qty>0 && !state.lockedItems.includes(name));
  const equipped=new Set(Object.values(state.equipment));
  const gear=state.gearVault.filter(item=>!equipped.has(item.id) && !state.lockedGear.includes(item.id));
  const total=stacks.reduce((sum,[name,qty])=>sum+(itemMeta(name).value||1)*qty,0)+gear.reduce((sum,item)=>sum+gearValue(item),0);
  if (!total) return toast("There are no unlocked items to sell");
  if (!confirm(`Sell all unlocked backpack items and spare gear for ${total.toLocaleString()} coins?`)) return;
  stacks.forEach(([name])=>delete state.inventory[name]);
  const soldIds=new Set(gear.map(item=>item.id));
  state.gearVault=state.gearVault.filter(item=>!soldIds.has(item.id));
  state.coins+=total;
  state.stats.sold=(state.stats.sold||0)+total;
  activity(`Sold unlocked inventory for ${total.toLocaleString()} coins`,"coins");
  saveState(); render();
}

function gearCollectionState(tier) {
  const gear=equipmentTierData[tier]?.gear||[];
  const owned=new Set(state.gearVault.map(item=>item.baseName));
  const count=gear.filter(item=>owned.has(item)).length;
  const claimed=state.gearCollections.claimed.includes(tier);
  return {tier,gear,count,total:gear.length,complete:gear.length>0 && count===gear.length,claimed};
}
function gearCollectionReward(tier) {
  const index=Object.keys(equipmentTierData).indexOf(tier);
  const material=equipmentTierData[tier]?.bar||"Bronze Bar";
  return makeReward(500+index*700,{[material]:Math.max(4,4+index*2),"Forge Essence":Math.max(2,2+index)});
}
function claimGearCollection(tier) {
  const collection=gearCollectionState(tier);
  if (!collection.complete || collection.claimed) return;
  const reward=gearCollectionReward(tier);
  state.gearCollections.claimed.push(tier);
  grantReward(reward,true);
  showRewardReveal(`${tier} Collection`,reward,"Gear collection complete");
  activity(`${tier} equipment collection completed`,"achievement");
  saveState();
  renderCrafting();
  renderLive();
}
function renderGearCollection() {
  document.querySelector("#gear-collection").innerHTML=Object.keys(equipmentTierData).map(tier=>{
    const collection=gearCollectionState(tier);
    const pct=collection.total ? collection.count/collection.total*100 : 0;
    return `<article class="collection-card ${collection.complete?"complete":""}">
      <header><div><span>${collection.count} / ${collection.total} owned</span><h4>${tier} Set Log</h4></div><button class="secondary-button collection-claim" data-collection="${tier}" ${!collection.complete||collection.claimed?"disabled":""}>${collection.claimed?"Claimed":"Claim"}</button></header>
      <div class="meter collection-meter"><i style="width:${pct}%"></i></div>
      <div class="collection-pieces">${collection.gear.map(item=>`<span class="${state.gearVault.some(gear=>gear.baseName===item)?"owned":""}">${item}</span>`).join("")}</div>
      <small>Reward: ${formatReward(gearCollectionReward(tier))}</small>
    </article>`;
  }).join("");
  document.querySelectorAll(".collection-claim").forEach(button=>button.onclick=()=>claimGearCollection(button.dataset.collection));
}

function renderCrafting() {
  const level=skillLevel("smithing");
  document.querySelector("#crafting-level").textContent=level;
  document.querySelector("#crafting-search").value=state.craftingUi.search;
  document.querySelector("#crafting-filter").value=state.craftingUi.filter;
  renderGearCollection();
  const search=state.craftingUi.search.trim().toLowerCase();
  const sections=Object.entries(equipmentTierData).map(([tier,tierData])=>{
    let recipes=craftingRecipes.filter(recipe=>equipmentSetName(recipe.name)===tier);
    recipes=recipes.filter(recipe=>{
      if (search && !recipe.name.toLowerCase().includes(search)) return false;
      if (state.craftingUi.filter==="available") return level>=recipe.level && recipeUnlocked(recipe);
      if (state.craftingUi.filter==="affordable") return level>=recipe.level && recipeUnlocked(recipe) && hasCosts(recipe.costs);
      if (state.craftingUi.filter==="pinned") return state.craftingUi.pinned.includes(recipe.name);
      return true;
    });
    if (!recipes.length) return "";
    const firstLevel=Math.min(...recipes.map(recipe=>recipe.level));
    const lastLevel=Math.max(...recipes.map(recipe=>recipe.level));
    const collapsed=Boolean(state.craftingUi.collapsed[tier]);
    return `<section class="recipe-tier ${collapsed?"collapsed":""}">
      <button class="recipe-tier-header" data-toggle-tier="${tier}">
        <div><span>Smithing ${firstLevel}-${lastLevel}</span><h3>${tier} Equipment</h3><small>2 pieces: +${tierData.bonus[0]} DEF · 4 pieces: +${tierData.bonus[1]} ATK / +${tierData.bonus[2]} Max Hit</small></div>
        <strong>${tierData.bar}${recipes.some(recipe=>Object.keys(recipe.costs).length>1)?" + environment materials":""} · ${collapsed?"Expand":"Collapse"}</strong>
      </button>
      <div class="recipe-tier-grid">${recipes.map(recipe=>{
      const blueprintLocked=!recipeUnlocked(recipe);
      const locked=level<recipe.level || blueprintLocked;
      const affordable=hasCosts(recipe.costs);
      const item=equipmentData[recipe.name];
      const costs=Object.entries(recipe.costs).map(([name,qty])=>`${qty} ${name} (${state.inventory[name]||0})`).join(" + ");
      const pinned=state.craftingUi.pinned.includes(recipe.name);
      return `<article class="recipe-card ${locked?"locked":""}">
        <header><div class="recipe-title">${itemIcon(recipe.name)}<div><span>${capitalize(item.slot)}</span><h3>${recipe.name}</h3></div></div><div><strong>Lv. ${recipe.level}</strong><button class="recipe-pin ${pinned?"active":""}" data-pin-recipe="${recipe.name}" aria-label="Pin ${recipe.name}">${pinned?"Pinned":"Pin"}</button></div></header>
        <p class="recipe-stats">${equipmentStatsText(recipe.name)}. Equip requirement: Combat ${gearRequirement(recipe.name)}.</p>
        <p class="recipe-cost">${blueprintLocked?`Learn ${recipe.blueprint} from the Marketplace`:level<recipe.level?`Requires Smithing level ${recipe.level}`:costs}</p>
        <button class="primary-button craft-button" data-recipe="${recipe.name}" ${locked||!affordable?"disabled":""}>Craft Gear</button>
      </article>`;
    }).join("")}</div></section>`;
  }).filter(Boolean);
  document.querySelector("#crafting-grid").innerHTML=sections.length ? sections.join("") : `<div class="inventory-empty">No recipes match the current crafting filters.</div>`;
  document.querySelectorAll(".craft-button").forEach(button=>button.onclick=()=>craftGear(button.dataset.recipe));
  document.querySelectorAll("[data-toggle-tier]").forEach(button=>button.onclick=()=>toggleCraftingTier(button.dataset.toggleTier));
  document.querySelectorAll("[data-pin-recipe]").forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    toggleCraftingPin(button.dataset.pinRecipe);
  });
}

function toggleCraftingTier(tier) {
  state.craftingUi.collapsed[tier]=!state.craftingUi.collapsed[tier];
  saveState();
  renderCrafting();
}

function toggleCraftingPin(name) {
  state.craftingUi.pinned=state.craftingUi.pinned.includes(name)
    ? state.craftingUi.pinned.filter(item=>item!==name)
    : [...state.craftingUi.pinned,name];
  saveState();
  renderCrafting();
}

function craftGear(name) {
  const recipe=craftingRecipes.find(item=>item.name===name);
  if (!recipe || !recipeUnlocked(recipe) || skillLevel("smithing")<recipe.level || !hasCosts(recipe.costs)) return;
  const before=skillLevel("smithing");
  payCosts(recipe.costs);
  const gear=createGear(recipe.name,rollCraftRarity(recipe.name));
  state.skills.smithing.xp+=Math.round(recipe.level*8*(1+achievementBonus("allXp")));
  state.skills.smithing.masteryXp+=Math.max(1,Math.round(recipe.level*2*(1+(state.upgrades.smithing.mastery||0)*.05)*(1+achievementBonus("masteryXp"))));
  recordProgress("crafts",{item:recipe.name},1);
  const after=skillLevel("smithing");
  if (after>before) {
    activity(`Smithing level ${after}`,"level");
    toast(`Smithing reached level ${after}`);
  }
  activity(`Crafted ${rarityData[gear.rarity].name} ${recipe.name}`,"craft");
  toast(`${gearDisplayName(gear)} crafted`);
  saveState();
  render();
}

function equipmentStatsText(ref) {
  const gear=typeof ref==="object" ? ref : gearById(ref);
  const item=gear ? gearStats(gear) : equipmentData[ref]||{};
  return equipmentStatsObjectText(item);
}

function renderMastery() {
  const ids=Object.keys(state.skills);
  document.querySelector("#total-xp").textContent=ids.reduce((n,id)=>n+state.skills[id].xp,0).toLocaleString();
  document.querySelector("#mastery-grid").innerHTML=ids.map(id=>{
    const level=skillLevel(id), floor=xpForLevel(level), ceiling=xpForLevel(level+1), pct=level===MAX_LEVEL?100:(state.skills[id].xp-floor)/(ceiling-floor)*100;
    const hasMastery=productionSkills.includes(id);
    const mLevel=hasMastery?masteryLevel(id):0, mxp=hasMastery?(state.skills[id].masteryXp||0):0;
    const mFloor=hasMastery?masteryXpForLevel(mLevel):0, mCeiling=hasMastery?masteryXpForLevel(mLevel+1):1;
    const masteryPct=!hasMastery?0:mLevel===MAX_LEVEL?100:(mxp-mFloor)/(mCeiling-mFloor)*100;
    const bestAction=hasMastery ? skillData[id].actions.reduce((best,action)=>
      actionMasteryLevel(id,action)>actionMasteryLevel(id,best) ? action : best
    ,skillData[id].actions[0]) : null;
    const icon=skillData[id] ? skillIconPath(id) : skillIconPath("combat");
    return `<article class="mastery-card">
      <header><div class="mastery-title"><img src="${icon}" alt=""><h3>${skillData[id]?.name||capitalize(id)}</h3></div><strong>${level}</strong></header>
      <p><span>${state.skills[id].xp.toLocaleString()} total XP</span><span>${level===MAX_LEVEL?"MAX":`${Math.max(0,ceiling-state.skills[id].xp).toLocaleString()} to level`}</span></p>
      <div class="meter xp"><i style="width:${pct}%"></i></div>
      ${hasMastery?`<div class="mastery-card-detail"><span>Skill Mastery ${mLevel}</span><span>${mLevel===MAX_LEVEL?"MAX":`${Math.max(0,mCeiling-mxp).toLocaleString()} MXP to level`}</span></div><div class="meter mastery-meter"><i style="width:${masteryPct}%"></i></div><div class="mastery-card-detail action-best"><span>Best expertise</span><span>${bestAction.name} ${actionMasteryLevel(id,bestAction)}</span></div>`:""}
    </article>`;
  }).join("");
}

function grantCombatXp(id,amount) {
  const before=skillLevel(id);
  const meal=isBuffActive("tunameal") ? 1.08 : 1;
  const relic=relicActive("Worldscar Fragment") ? 1.10 : 1;
  const milestone=1+achievementBonus("allXp")+achievementBonus("combatXp",{zone:state.currentZone,enemy:currentEnemy().name})+shrineXpBonus();
  state.skills[id].xp+=Math.max(1,Math.round(amount*meal*relic*milestone));
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

function migrateAccountSave() {
  try {
    const session=JSON.parse(localStorage.getItem(AUTH_KEY));
    const token=session?.access_token;
    if (!token) return;
    const rawPayload=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
    const payload=rawPayload.padEnd(Math.ceil(rawPayload.length/4)*4,"=");
    const userId=JSON.parse(atob(payload))?.sub;
    const accountRaw=userId ? localStorage.getItem(`${SAVE_KEY}:${userId}`) : null;
    const localRaw=localStorage.getItem(SAVE_KEY);
    if (accountRaw) {
      const accountSave=JSON.parse(accountRaw);
      const localSave=localRaw ? JSON.parse(localRaw) : null;
      if (!localSave || (accountSave.lastSeen||0)>(localSave.lastSeen||0)) {
        localStorage.setItem(SAVE_KEY,accountRaw);
      }
    }
  } catch {
    // Keep any existing local save if the old account session cannot be decoded.
  } finally {
    localStorage.removeItem(AUTH_KEY);
  }
}

const iosInstallTip=document.querySelector("#ios-install-tip");
const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone=window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (isIos && !isStandalone && !localStorage.getItem("emberfall-ios-tip-dismissed")) iosInstallTip.classList.remove("hidden");
document.querySelector("#ios-install-close").onclick=()=>{
  iosInstallTip.classList.add("hidden");
  localStorage.setItem("emberfall-ios-tip-dismissed","1");
};
document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>navigate(btn.dataset.view));
document.querySelectorAll(".mobile-more-menu [data-view]").forEach(btn=>btn.onclick=()=>navigate(btn.dataset.view));
document.querySelector("#mobile-more-toggle").onclick=event=>{
  const sidebar=document.querySelector(".sidebar");
  const open=sidebar.classList.toggle("more-open");
  event.currentTarget.setAttribute("aria-expanded",String(open));
};
document.querySelector("#combat-toggle").onclick=()=>{
  state.combat=!state.combat; state.activeSkill=null;
  state.queueRunning=false;
  if (!state.combat) state.combatChain=0;
  else state.combatAutomation.killsRun=0;
  resetCombatStatuses();
  addLog(state.combat?`${state.characterName} engages ${currentEnemy().name}.`:`${state.characterName} retreats from combat.`);
  saveState(); render();
};
document.querySelector("#boss-toggle").onclick=()=>{
  if (!bossReady()) return;
  state.combat=false; state.fightingBoss=!state.fightingBoss; state.enemyHp=enemyMaxHp();
  state.attackElapsed=0; state.enemyAttackElapsed=0;
  state.bossPhase=1;
  resetCombatStatuses();
  addLog(state.fightingBoss?`${currentZone().boss.name} enters the battlefield.`:`${state.characterName} returns to hunting ${currentEnemy().name}.`);
  saveState(); render();
};
document.querySelector("#use-potion").onclick=()=>{
  if (!(state.inventory[POTION_ITEM]>0) || state.heroHp>=maxHp()) return;
  addItem(POTION_ITEM,-1);
  const healed=Math.min(Math.max(1,Math.round(POTION_HEAL*healingMultiplier())),maxHp()-state.heroHp);
  state.heroHp+=healed; addLog(`${state.characterName} drinks a health potion and restores ${healed} health.`); toast(`Restored ${healed} health`); saveState(); render();
};
document.querySelector("#auto-eat-toggle").onclick=()=>{
  state.autoEat=!state.autoEat;
  toast(state.autoEat?"Auto-Eat enabled at 35% health":"Auto-Eat disabled");
  saveState(); renderLive();
};
document.querySelector("#combat-stop-hp").onchange=event=>{
  state.combatAutomation.stopHp=Math.max(1,Math.min(80,Number(event.currentTarget.value)||15));
  saveState(); renderCombatSetup();
};
document.querySelector("#combat-stop-kills").onchange=event=>{
  state.combatAutomation.stopAfter=Math.max(0,Math.min(10000,Number(event.currentTarget.value)||0));
  state.combatAutomation.killsRun=0;
  saveState(); renderCombatSetup();
};
document.querySelector("#combat-stop-food").onchange=event=>{ state.combatAutomation.stopWhenFoodEmpty=event.currentTarget.checked; saveState(); };
document.querySelector("#combat-offline").onchange=event=>{ state.combatAutomation.offline=event.currentTarget.checked; saveState(); };
document.querySelector("#inventory-search").oninput=event=>{
  state.inventoryUi.search=event.currentTarget.value;
  renderInventory();
};
document.querySelector("#inventory-category").onchange=event=>{
  state.inventoryUi.category=event.currentTarget.value;
  saveState(); renderInventory();
};
document.querySelector("#inventory-sort").onchange=event=>{
  state.inventoryUi.sort=event.currentTarget.value;
  saveState(); renderInventory();
};
document.querySelector("#protect-best-gear").onclick=protectBestGear;
document.querySelector("#salvage-common-gear").onclick=salvageCommonGear;
document.querySelector("#sell-all-unlocked").onclick=sellAllUnlocked;
document.querySelector("#queue-add-button").onclick=()=>addProductionJob(currentSkill,getAction(currentSkill).id,document.querySelector("#queue-target").value);
document.querySelector("#queue-start").onclick=startProductionQueue;
document.querySelector("#queue-clear").onclick=clearProductionQueue;
document.querySelector("#crafting-search").oninput=event=>{ state.craftingUi.search=event.currentTarget.value; renderCrafting(); };
document.querySelector("#crafting-filter").onchange=event=>{ state.craftingUi.filter=event.currentTarget.value; saveState(); renderCrafting(); };
document.querySelector("#crafting-collapse").onclick=()=>{
  const shouldCollapse=Object.keys(equipmentTierData).some(tier=>!state.craftingUi.collapsed[tier]);
  Object.keys(equipmentTierData).forEach(tier=>state.craftingUi.collapsed[tier]=shouldCollapse);
  document.querySelector("#crafting-collapse").textContent=shouldCollapse?"Expand All":"Collapse All";
  saveState(); renderCrafting();
};
document.querySelector("#contract-reroll").onclick=rerollContracts;
document.querySelector("#market-contract-reroll").onclick=rerollContracts;
document.querySelector("#save-name").onclick=renameCharacter;
document.querySelector("#hero-name-input").onkeydown=event=>{ if (event.key==="Enter") renameCharacter(); };
function renameCharacter() {
  const input=document.querySelector("#hero-name-input");
  const name=input.value.trim().replace(/\s+/g," ").slice(0,18);
  if (name.length<2) return toast("Enter a name with at least 2 characters");
  state.characterName=name;
  addLog(`${name} is ready for adventure.`);
  saveState(); render();
}
document.querySelector("#settings-save").onclick=()=>saveState(true);
document.querySelector("#export-save").onclick=exportSave;
document.querySelector("#import-save").onclick=()=>document.querySelector("#import-save-file").click();
document.querySelector("#import-save-file").onchange=importSave;
document.querySelector("#settings-reset").onclick=resetProgress;
document.querySelector("#music-toggle").onchange=event=>{
  state.settings.music=event.target.checked;
  if (event.target.checked) Music.start(); else Music.stop();
  saveState();
};
document.querySelector("#music-volume").oninput=event=>{
  state.settings.musicVolume=Number(event.target.value);
  Music.setVolume();
};
document.querySelector("#music-volume").onchange=()=>saveState();

function exportSave() {
  saveState();
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=`emberfall-save-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Save backup exported");
}

function importSave(event) {
  const input=event.currentTarget;
  const file=input.files?.[0];
  if (!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try {
      const raw=JSON.parse(reader.result);
      if (!raw || typeof raw!=="object" || !raw.skills || typeof raw.skills!=="object" || !raw.inventory || typeof raw.inventory!=="object") {
        throw new Error("Invalid save");
      }
      const imported=normalizeState(raw);
      state=imported;
      state.combat=false;
      state.activeSkill=null;
      state.lastSeen=Date.now();
      saveState();
      navigate("combat");
      toast("Save backup imported");
    } catch {
      toast("That file is not a valid Emberfall save");
    } finally {
      input.value="";
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (confirm("Reset all Emberfall progress? This cannot be undone.")) {
    state=defaultState(); state.lastSeen=Date.now();
    localStorage.setItem(RECOVERY_APPLIED_KEY,"1");
    saveState(); navigate("combat"); toast("Progress reset");
  }
}
document.querySelector("#buy-potion").onclick=()=>{
  if (state.coins<POTION_COST) return toast("Not enough coins");
  state.coins-=POTION_COST; addItem(POTION_ITEM,1); toast("Health potion purchased"); saveState(); render();
};
document.querySelector("#skill-toggle").onclick=()=>{
  if (state.activeSkill===currentSkill) { state.activeSkill=null; state.actionElapsed=0; state.queueRunning=false; }
  else {
    const action=getAction(currentSkill);
    if (!canPerformAction(currentSkill,action)) return toast("You need the listed materials before training");
    state.combat=false; state.combatChain=0; state.queueRunning=false; state.activeSkill=currentSkill; state.actionElapsed=0;
  }
  saveState(); render();
};
document.querySelector("#save-button").onclick=()=>saveState(true);
document.querySelector("#reset-button").onclick=()=>{
  resetProgress();
};
document.querySelector("#offline-close").onclick=()=>{
  document.querySelector("#offline-modal").classList.add("hidden");
  saveState();
};
document.querySelector("#reward-close").onclick=()=>{
  document.querySelector("#reward-modal").classList.add("hidden");
};
document.addEventListener("visibilitychange",()=>{
  if (document.hidden) {
    saveState();
  } else {
    const elapsed=Date.now()-(state.lastSeen||Date.now());
    applyOfflineProgress(elapsed);
    state.lastSeen=Date.now();
    saveState();
    lastTick=performance.now();
    render();
  }
});
window.addEventListener("pagehide",()=>saveState());
setInterval(()=>saveState(),15000);

const elapsed=Date.now()-(state.lastSeen||Date.now());
applyOfflineProgress(elapsed);
state.lastSeen=Date.now();
state.currentZone=Math.min(state.currentZone,zoneData.length-1,state.unlockedZones-1);
state.fightingBoss=state.fightingBoss && bossReady();
state.enemyHp=state.combat ? Math.min(state.enemyHp,enemyMaxHp()) : enemyMaxHp();
state.heroHp=Math.min(state.heroHp,maxHp());
checkAchievements({showReveal:false});
render();
requestAnimationFrame(tick);
saveState();
if (recoveredSaveOnLoad) toast("Your previous Emberfall progress was recovered");
