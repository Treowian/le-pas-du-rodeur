// ==========================================
// 0. PARAMÈTRES D'ÉQUILIBRAGE
// ==========================================
const SEUIL_HAINE = 10; 
const MAX_LEVEL = 50;

// ==========================================
// 1. PROFIL & HAUTS FAITS
// ==========================================
const defaultProfile = {
    xp: 0, level: 1, eclatsOmbre: 0,
    stats: { totalLeagues: 0, gamesPlayed: 0, gamesWon: 0, shadowsUsed: 0, deroutesTaken: 0, purifications: 0, winsAgainst: { brag: 0, zamin: 0, kael: 0, letranger: 0 }, routsSurvived: 0, gamesWonWith1Life: 0, firstTurnRouts: 0, currentWinStreak: 0, survivedDeathRoll: false, gamesSinceShuffle: 3 },
    achievements: { fardeauAnneau: false, flammeUdun: false, heritageNumenor: false, sermentParjures: false, maliceMorgoth: false, ruseSmaug: false, enduranceDunedain: false, fuiteComte: false, colereValar: false, pariIsildur: false, voieElfes: false, fleauOmbre: false, marcheurNuit: false, pillardGobelin: false, negociateurNain: false, tueurKael: false, enigmeObscurite: false, maitreFondcombe: false, maledictionAnneau: false, bravoureHobbit: false, heritierElendil: false, tueurBalrog: false, ombreMordor: false, retourRoi: false, seigneurOuest: false },
    inventory: { dice: ['classic'], boards: ['dark'], frames: ['basic'], titles: ['title_ranger'] },
    equipped: { dice: 'classic', board: 'dark', frame: 'basic', title: 'title_ranger' },
    activeContracts: [], 
    completedContracts: [],
    tutorial: { asked: false, enabled: false, seenIntro: false, seenAmbush: false, seenHate: false, seenImpasse: false, seenShadow: false }
};

let playerProfile = JSON.parse(localStorage.getItem('rodeurProfile')) || {};
playerProfile = { ...defaultProfile, ...playerProfile };
playerProfile.stats = { ...defaultProfile.stats, ...(playerProfile.stats || {}) };
playerProfile.stats.winsAgainst = { ...{ brag:0, zamin:0, kael:0, letranger:0 }, ...(playerProfile.stats.winsAgainst || {}) };
playerProfile.achievements = { ...defaultProfile.achievements, ...(playerProfile.achievements || {}) };
playerProfile.inventory = { ...defaultProfile.inventory, ...(playerProfile.inventory || {}) };
playerProfile.equipped = { ...defaultProfile.equipped, ...(playerProfile.equipped || {}) };
playerProfile.tutorial = { ...defaultProfile.tutorial, ...(playerProfile.tutorial || {}) };
if (!playerProfile.activeContracts) playerProfile.activeContracts = [];
if (!playerProfile.completedContracts) playerProfile.completedContracts = [];

function saveProfile() { localStorage.setItem('rodeurProfile', JSON.stringify(playerProfile)); updateProfileUI(); }
function getXPRequired(level) { return 100 + (25 * level); }

function addXP(amount) {
    if (playerProfile.level >= MAX_LEVEL) { playerProfile.xp = getXPRequired(MAX_LEVEL); return; }
    playerProfile.xp += amount;
    let required = getXPRequired(playerProfile.level);
    while(playerProfile.xp >= required && playerProfile.level < MAX_LEVEL) {
        playerProfile.xp -= required; 
        playerProfile.level++; 
        playerProfile.eclatsOmbre += (playerProfile.level % 5 === 0) ? 50 : 15;
        if (playerProfile.level >= MAX_LEVEL) { playerProfile.xp = getXPRequired(MAX_LEVEL); break; }
        required = getXPRequired(playerProfile.level); 
    }
    saveProfile();
}

function updateProfileUI() {
    let req = getXPRequired(playerProfile.level); 
    let pct = (playerProfile.level >= MAX_LEVEL) ? 100 : Math.min((playerProfile.xp / req) * 100, 100);
    const fillEl = document.getElementById('ui-xp-fill'); if(fillEl) fillEl.style.width = pct + "%";
    const curEl = document.getElementById('ui-xp-current'); if(curEl) curEl.innerText = (playerProfile.level >= MAX_LEVEL) ? "MAX" : Math.floor(playerProfile.xp);
    const reqEl = document.getElementById('ui-xp-needed'); if(reqEl) reqEl.innerText = (playerProfile.level >= MAX_LEVEL) ? "MAX" : req;
    const lvlEl = document.getElementById('ui-player-level'); if(lvlEl) lvlEl.innerText = playerProfile.level;
    const ecEl = document.getElementById('ui-eclats'); if(ecEl) ecEl.innerText = playerProfile.eclatsOmbre;
    const arsEcEl = document.getElementById('ui-arsenal-eclats'); if(arsEcEl) arsEcEl.innerText = playerProfile.eclatsOmbre;
}

let gameState = {
    currentEnemyId: '', activePlayer: 'hero', heroRounds: 0, enemyRounds: 0, targetScore: 80, playerScore: 0, enemyScore: 0, turnScore: 0,
    playerLives: 3, enemyLives: 3, enemyStartLives: 3, playerShadow: 0, playerEspoir: 1, hasUsedEspoirThisTurn: false, enemyHate: 1, enemyMaxHate: 10, secretPersonality: '', enemyRiskProfile: '',
    currentModifier: 'normal',
    diceValues: [0, 0, 0, 0, 0], diceStates: ['idle', 'idle', 'idle', 'idle', 'idle'], isRolling: false, hasKeptDieThisRoll: false, pendingDeroute: false, heroRoutLastTurn: false,
    currentEnemyRolledIndices: [], currentHeroRolledIndices: [], currentEnemyTargetIdx: -1,
    matchStats: { turnsPlayedThisRound: 0, consecutiveShadowMaxTurns: 0, defendsUsed: 0, shadowsUsedThisRound: 0, firstRoundLost: false, deroutesThisMatch: 0, purificationsThisMatch: 0, compassUsedThisMatch: 0, shadowsUsedThisMatch: 0, highestTurnScoreThisMatch: 0, totalTurnsThisMatch: 0, bankedUnder15: false, enemyZeroPointRound: false, acceptedImpasseAndWon: false, sacrificedSix: false, devouredAdvance: false, corruptedSix: false, enemyMasterfulFailure: false, purifyAndShadowSameTurn: false, purifyUsedThisTurn: false, shadowUsedThisTurn: false, rerollWith20PlusAndImpasse: false, elberethVsKaelAndWon: false, firstTurnCorrupt: false, enemyReachedMaxHate: false, enemyAttackedAfterMaxHate: false, exact80Round: false, enemyLostRoundWithZero: false }
};

let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification'); if (!toast) return;
    toast.innerText = message; toast.className = `toast-visible toast-${type}`;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toast.className = 'toast-hidden'; }, 3000);
}

const audioManager = { 
    bgmMusic: new Audio(), isMusicMuted: true, isSfxMuted: false,
    tracks: { tavern: 'audio/tavern_theme.mp3', duel_brag: 'audio/duel_brag.mp3', duel_zamin: 'audio/duel_zamin.mp3', duel_kael: 'audio/duel_kael.mp3', duel_letranger: 'audio/duel_letranger.mp3' }, 
    playBGM(trackName) { if (this.isMusicMuted) return; if (this.bgmMusic.src.includes(this.tracks[trackName])) return; this.bgmMusic.src = this.tracks[trackName]; this.bgmMusic.loop = true; this.bgmMusic.volume = 0.1; let p = this.bgmMusic.play(); if (p) p.catch(e => console.log("Audio bloqué.")); }, 
    stopBGM() { this.bgmMusic.pause(); }, 
    playSFX(src, vol = 0.2) { if(this.isSfxMuted) return; let sfx = new Audio(src); sfx.volume = vol; sfx.play().catch(e=>e); } 
};
function updateAudioButtons() { const mBtn = document.getElementById('music-btn'); const sBtn = document.getElementById('sfx-btn'); if (mBtn) mBtn.innerText = audioManager.isMusicMuted ? (currentLang === 'fr' ? "🔇 MUSIQUE OFF" : "🔇 MUSIC OFF") : (currentLang === 'fr' ? "🎵 MUSIQUE ON" : "🎵 MUSIC ON"); if (sBtn) sBtn.innerText = audioManager.isSfxMuted ? "🔇 SFX OFF" : "🔊 SFX ON"; }
function toggleMusic() { audioManager.isMusicMuted = !audioManager.isMusicMuted; updateAudioButtons(); if (!audioManager.isMusicMuted) { if (document.getElementById('tavern-screen').style.display !== 'none') { audioManager.playBGM('tavern'); } else if (gameState.currentEnemyId) { audioManager.playBGM('duel_' + gameState.currentEnemyId); } } else { audioManager.stopBGM(); } }
function toggleSFX() { audioManager.isSfxMuted = !audioManager.isSfxMuted; updateAudioButtons(); if (!audioManager.isSfxMuted) audioManager.playSFX('audio/dice.mp3', 0.2); }

// ==========================================
// 2. LES 50 TRAQUES (CONTRATS)
// ==========================================
const contractsPool = [
    { id: 'c1', t_fr: "Chasseur de Primes", t_en: "Bounty Hunter", d_fr: "Battez Brag l'Éventreur.", d_en: "Defeat Brag.", reward: 50 },
    { id: 'c2', t_fr: "Le Négociateur", t_en: "The Negotiator", d_fr: "Battez Zâmin le Colporteur.", d_en: "Defeat Zâmin.", reward: 75 },
    { id: 'c3', t_fr: "Fléau du Traître", t_en: "Bane of the Traitor", d_fr: "Battez Kael le Traître.", d_en: "Defeat Kael.", reward: 100 },
    { id: 'c4', t_fr: "Dissipateur d'Ombres", t_en: "Shadow Dispeller", d_fr: "Battez L'Étranger.", d_en: "Defeat The Stranger.", reward: 150 },
    { id: 'c5', t_fr: "Dépouiller le Voleur", t_en: "Rob the Thief", d_fr: "Battez Brag sans utiliser d'Ombre.", d_en: "Defeat Brag without using Shadow.", reward: 100 },
    { id: 'c6', t_fr: "Saisie Sévère", t_en: "Harsh Foreclosure", d_fr: "Remportez une manche où Zâmin finit à 0.", d_en: "Win a round where Zâmin scores 0.", reward: 200 },
    { id: 'c7', t_fr: "La Chute du Gondor", t_en: "Fall of Gondor", d_fr: "Battez Kael en subissant au moins 2 Déroutes.", d_en: "Defeat Kael while suffering at least 2 Routs.", reward: 250 },
    { id: 'c8', t_fr: "Lumière dans les Ténèbres", t_en: "Light in the Dark", d_fr: "Battez L'Étranger en finissant avec 10 d'Espoir.", d_en: "Defeat Stranger ending with 10 Hope.", reward: 300 },
    { id: 'c9', t_fr: "Le Sprinteur", t_en: "The Sprinter", d_fr: "Marquez 30+ Lieues en un seul lancer.", d_en: "Score 30+ Leagues in a single roll.", reward: 80 },
    { id: 'c10', t_fr: "L'Insatiable", t_en: "The Insatiable", d_fr: "Marquez 50+ Lieues en un seul lancer.", d_en: "Score 50+ Leagues in a single roll.", reward: 200 },
    { id: 'c11', t_fr: "Le Prudent", t_en: "The Cautious", d_fr: "Établissez le camp avec 15 Lieues ou moins.", d_en: "Set up camp with 15 Leagues or less.", reward: 50 },
    { id: 'c12', t_fr: "La Voie Rapide", t_en: "The Fast Track", d_fr: "Gagnez un duel en 8 tours ou moins.", d_en: "Win a duel in 8 turns or less.", reward: 150 },
    { id: 'c13', t_fr: "Victoire Écrasante", t_en: "Crushing Victory", d_fr: "Gagnez alors que l'ennemi a moins de 30 Lieues.", d_en: "Win while enemy has less than 30 Leagues.", reward: 100 },
    { id: 'c14', t_fr: "Sur le Fil", t_en: "Down to the Wire", d_fr: "Gagnez alors que l'ennemi a déjà 70+ Lieues.", d_en: "Win while enemy has 70+ Leagues.", reward: 150 },
    { id: 'c15', t_fr: "Le Calculateur", t_en: "The Calculator", d_fr: "Atteignez exactement 80 Lieues lors d'une manche.", d_en: "Reach exactly 80 Leagues in a round.", reward: 250 },
    { id: 'c16', t_fr: "Coup d'Épée dans l'Eau", t_en: "Swing in the Dark", d_fr: "Subissez une Impasse mais gagnez le duel.", d_en: "Suffer a Dead End but win the duel.", reward: 100 },
    { id: 'c17', t_fr: "Le Survivant", t_en: "The Survivor", d_fr: "Gagnez un duel avec exactement 1 Vie restante.", d_en: "Win a duel with exactly 1 Life left.", reward: 150 },
    { id: 'c18', t_fr: "L'Intouchable", t_en: "The Untouchable", d_fr: "Gagnez un duel sans subir de Déroute.", d_en: "Win a duel without suffering a Rout.", reward: 150 },
    { id: 'c19', t_fr: "Le Purificateur", t_en: "The Purifier", d_fr: "Purifiez au moins 3 Embuscades.", d_en: "Purify at least 3 Ambushes.", reward: 100 },
    { id: 'c20', t_fr: "Purge Totale", t_en: "Total Purge", d_fr: "Purifiez un total de 5 Embuscades (cumulatif).", d_en: "Purify 5 Ambushes in total (cumulative).", reward: 200 },
    { id: 'c21', t_fr: "Le Cartographe", t_en: "The Cartographer", d_fr: "Utilisez la Boussole au moins 2 fois.", d_en: "Use the Compass at least twice.", reward: 100 },
    { id: 'c22', t_fr: "Le Défenseur", t_en: "The Defender", d_fr: "Bloquez 2 Malices avec 'A Elbereth !'.", d_en: "Block 2 Malice attacks with 'A Elbereth !'.", reward: 150 },
    { id: 'c23', t_fr: "Le Pacifiste", t_en: "The Pacifist", d_fr: "Gagnez sans utiliser 'A Elbereth !'.", d_en: "Win without using 'A Elbereth !'.", reward: 200 },
    { id: 'c24', t_fr: "Le Désespéré", t_en: "The Desperate", d_fr: "Gagnez en finissant avec 0 d'Espoir.", d_en: "Win ending with 0 Hope.", reward: 100 },
    { id: 'c25', t_fr: "L'Avare", t_en: "The Miser", d_fr: "Gagnez en finissant avec 10 d'Espoir.", d_en: "Win ending with 10 Hope.", reward: 150 },
    { id: 'c26', t_fr: "Le Martyr", t_en: "The Martyr", d_fr: "Sacrifiez un Triomphe (6) au campement.", d_en: "Sacrifice a Triumph (6) at camp.", reward: 50 },
    { id: 'c27', t_fr: "Le Juste", t_en: "The Righteous", d_fr: "Gagnez sans corrompre ni dévorer de dés.", d_en: "Win without corrupting or devouring dice.", reward: 100 },
    { id: 'c28', t_fr: "Maître des Ombres", t_en: "Shadow Master", d_fr: "Utilisez l'Ombre 3 fois dans le duel.", d_en: "Use Shadow 3 times in the duel.", reward: 120 },
    { id: 'c29', t_fr: "L'Abîme", t_en: "The Abyss", d_fr: "Utilisez l'Ombre 5 fois dans le duel.", d_en: "Use Shadow 5 times in the duel.", reward: 250 },
    { id: 'c30', t_fr: "Corrupteur Né", t_en: "Born Corruptor", d_fr: "Corrompez un Triomphe (6) ennemi.", d_en: "Corrupt an enemy Triumph (6).", reward: 75 },
    { id: 'c31', t_fr: "Le Dévoreur", t_en: "The Devourer", d_fr: "Dévorez une Avancée (4/5) ennemie.", d_en: "Devour an enemy Advance (4/5).", reward: 75 },
    { id: 'c32', t_fr: "L'Imprudent", t_en: "The Reckless", d_fr: "Terminez avec la jauge d'Ombre à 3.", d_en: "End duel with Shadow gauge at 3.", reward: 150 },
    { id: 'c33', t_fr: "Trompe-la-mort", t_en: "Death Cheater", d_fr: "Survivez à un jet de mort (Ombre > 3).", d_en: "Survive a death roll (Shadow > 3).", reward: 200 },
    { id: 'c34', t_fr: "Météorologue", t_en: "Meteorologist", d_fr: "Gagnez sous le Brouillard des Galgals.", d_en: "Win under Fog on the Barrow-downs.", reward: 100 },
    { id: 'c35', t_fr: "Nyctalope", t_en: "Night Vision", d_fr: "Gagnez sous la Nuit sur l'Emyn Muil.", d_en: "Win under Night on the Emyn Muil.", reward: 100 },
    { id: 'c36', t_fr: "Matinal", t_en: "Early Bird", d_fr: "Gagnez sous l'Aube sur l'Anduin.", d_en: "Win under Dawn on the Anduin.", reward: 100 },
    { id: 'c37', t_fr: "Alpiniste", t_en: "Mountaineer", d_fr: "Gagnez sous la Colère du Caradhras.", d_en: "Win under Wrath of Caradhras.", reward: 100 },
    { id: 'c38', t_fr: "Sylvestre", t_en: "Sylvan", d_fr: "Gagnez sous Wellinghall.", d_en: "Win under Wellinghall.", reward: 100 },
    { id: 'c39', t_fr: "Ciel Bleu", t_en: "Clear Sky", d_fr: "Gagnez sous un Ciel Dégagé.", d_en: "Win under Clear Sky.", reward: 50 },
    { id: 'c40', t_fr: "Le Marathonien", t_en: "The Marathoner", d_fr: "Gagnez un duel long (15 tours ou +).", d_en: "Win a long duel (15+ turns).", reward: 150 },
    { id: 'c41', t_fr: "Retournement", t_en: "Turnaround", d_fr: "Gagnez après avoir perdu la 1ère manche.", d_en: "Win after losing the 1st round.", reward: 200 },
    { id: 'c42', t_fr: "Domination", t_en: "Domination", d_fr: "Remportez le duel 2 manches à 0.", d_en: "Win the duel 2 rounds to 0.", reward: 150 },
    { id: 'c43', t_fr: "L'Équilibriste", t_en: "The Tightrope", d_fr: "Gagnez avec 1 Vie, 0 Espoir, 0 Ombre.", d_en: "Win with 1 Life, 0 Hope, 0 Shadow.", reward: 300 },
    { id: 'c44', t_fr: "Ruse du Rôdeur", t_en: "Ranger's Ruse", d_fr: "Purifiez et utilisez l'Ombre au même tour.", d_en: "Purify and use Shadow in the same turn.", reward: 150 },
    { id: 'c45', t_fr: "Le Mur de Fer", t_en: "Iron Wall", d_fr: "Contrez Kael avec Elbereth et gagnez.", d_en: "Counter Kael with Elbereth and win.", reward: 150 },
    { id: 'c46', t_fr: "Le Tacticien", t_en: "The Tactician", d_fr: "Gagnez en ayant utilisé Purifier, Boussole et Elbereth.", d_en: "Win having used Purify, Compass and Elbereth.", reward: 200 },
    { id: 'c47', t_fr: "L'Éclair Ténébreux", t_en: "Dark Lightning", d_fr: "Corrompez un dé au tout 1er tour.", d_en: "Corrupt a die on the very 1st turn.", reward: 100 },
    { id: 'c48', t_fr: "La Colère Aveugle", t_en: "Blind Anger", d_fr: "L'ennemi atteint 10 Haine sans pouvoir attaquer.", d_en: "Enemy hits 10 Hate without attacking.", reward: 250 },
    { id: 'c49', t_fr: "Le Joueur", t_en: "The Gambler", d_fr: "Subissez une Impasse avec 20+ Lieues en attente ce tour-ci.", d_en: "Suffer a Dead End with 20+ pending Leagues.", reward: 100 },
    { id: 'c50', t_fr: "Providence", t_en: "Providence", d_fr: "Gagnez un duel au cours duquel l'ennemi a subi un Échec Magistral.", d_en: "Win a duel where the enemy suffered a Masterful Failure.", reward: 150 }
];

function refreshContracts() {
    if (!playerProfile.activeContracts) playerProfile.activeContracts = [];
    if (!playerProfile.completedContracts) playerProfile.completedContracts = [];
    
    // NETTOYEUR STRICT : On supprime les vieux contrats buggés et on force la limite à 3
    playerProfile.activeContracts = playerProfile.activeContracts.filter(c => typeof c === 'string');
    if (playerProfile.activeContracts.length > 3) {
        playerProfile.activeContracts = playerProfile.activeContracts.slice(0, 3);
    }

    while (playerProfile.activeContracts.length < 3) {
        let available = contractsPool.filter(c => !playerProfile.activeContracts.includes(c.id) && !playerProfile.completedContracts.includes(c.id));
        if (available.length === 0) break; 
        
        let chosen = available[Math.floor(Math.random() * available.length)];
        playerProfile.activeContracts.push(chosen.id);
    }
    saveProfile();
}

window.shuffleContracts = function() {
    if ((playerProfile.stats.gamesSinceShuffle || 0) < 3) return;
    playerProfile.stats.gamesSinceShuffle = 0;
    playerProfile.activeContracts = []; // On vide pour forcer le tirage
    refreshContracts();
    switchArsenalTab('contrats');
    showToast(t('toast_shuffled'), "success");
}

function evaluateContracts(matchWon) {
    if (!playerProfile.activeContracts) return [];
    let completed = []; let ms = gameState.matchStats;
    
    const requiresWin = ['c1','c2','c3','c4','c5','c6','c7','c8','c12','c13','c14','c16','c17','c18','c23','c24','c25','c27','c34','c35','c36','c37','c38','c39','c40','c41','c42','c43','c45','c46','c50'];

    playerProfile.activeContracts.forEach(cId => {
        if (!matchWon && requiresWin.includes(cId)) return;

        let isDone = false;
        if(cId === 'c1' && gameState.currentEnemyId === 'brag') isDone = true;
        if(cId === 'c2' && gameState.currentEnemyId === 'zamin') isDone = true;
        if(cId === 'c3' && gameState.currentEnemyId === 'kael') isDone = true;
        if(cId === 'c4' && gameState.currentEnemyId === 'letranger') isDone = true;
        if(cId === 'c5' && gameState.currentEnemyId === 'brag' && ms.shadowsUsedThisMatch === 0) isDone = true;
        
        if(cId === 'c6' && gameState.currentEnemyId === 'zamin' && ms.enemyLostRoundWithZero) isDone = true;
        
        if(cId === 'c7' && gameState.currentEnemyId === 'kael' && ms.deroutesThisMatch >= 2) isDone = true;
        if(cId === 'c8' && gameState.currentEnemyId === 'letranger' && gameState.playerEspoir === 10) isDone = true;
        
        if(cId === 'c9' && ms.highestTurnScoreThisMatch >= 30) isDone = true;
        if(cId === 'c10' && ms.highestTurnScoreThisMatch >= 50) isDone = true;
        if(cId === 'c11' && ms.bankedUnder15) isDone = true;
        if(cId === 'c12' && ms.totalTurnsThisMatch <= 8) isDone = true; 
        if(cId === 'c13' && gameState.enemyScore < 30) isDone = true;
        if(cId === 'c14' && gameState.enemyScore >= 70) isDone = true;
        if(cId === 'c15' && ms.exact80Round) isDone = true;
        if(cId === 'c16' && ms.acceptedImpasseAndWon) isDone = true;
        
        if(cId === 'c17' && gameState.playerLives === 1) isDone = true;
        if(cId === 'c18' && ms.deroutesThisMatch === 0) isDone = true;
        if(cId === 'c19' && ms.purificationsThisMatch >= 3) isDone = true;
        if(cId === 'c20' && (playerProfile.stats.purifForContract || 0) >= 5) { isDone = true; playerProfile.stats.purifForContract = 0; }
        if(cId === 'c21' && ms.compassUsedThisMatch >= 2) isDone = true;
        if(cId === 'c22' && ms.defendsUsed >= 2) isDone = true;
        if(cId === 'c23' && ms.defendsUsed === 0) isDone = true;
        if(cId === 'c24' && gameState.playerEspoir === 0) isDone = true;
        if(cId === 'c25' && gameState.playerEspoir === 10) isDone = true;
        if(cId === 'c26' && ms.sacrificedSix) isDone = true;
        
        if(cId === 'c27' && ms.shadowsUsedThisMatch === 0) isDone = true;
        if(cId === 'c28' && ms.shadowsUsedThisMatch >= 3) isDone = true;
        if(cId === 'c29' && ms.shadowsUsedThisMatch >= 5) isDone = true;
        if(cId === 'c30' && ms.corruptedSix) isDone = true;
        if(cId === 'c31' && ms.devouredAdvance) isDone = true;
        if(cId === 'c32' && gameState.playerShadow === 3) isDone = true;
        if(cId === 'c33' && playerProfile.stats.survivedDeathRoll) { isDone = true; playerProfile.stats.survivedDeathRoll = false; }
        
        if(cId === 'c34' && gameState.currentModifier === 'brouillard') isDone = true;
        if(cId === 'c35' && gameState.currentModifier === 'nuit') isDone = true;
        if(cId === 'c36' && gameState.currentModifier === 'aube') isDone = true;
        if(cId === 'c37' && gameState.currentModifier === 'froid') isDone = true;
        if(cId === 'c38' && gameState.currentModifier === 'clairiere') isDone = true;
        if(cId === 'c39' && gameState.currentModifier === 'normal') isDone = true;
        if(cId === 'c40' && ms.totalTurnsThisMatch >= 15) isDone = true;
        if(cId === 'c41' && ms.firstRoundLost) isDone = true;
        if(cId === 'c42' && gameState.enemyRounds === 0) isDone = true;
        
        if(cId === 'c43' && gameState.playerLives === 1 && gameState.playerEspoir === 0 && gameState.playerShadow === 0) isDone = true;
        if(cId === 'c44' && ms.purifyAndShadowSameTurn) isDone = true;
        if(cId === 'c45' && ms.elberethVsKaelAndWon) isDone = true;
        if(cId === 'c46' && ms.compassUsedThisMatch > 0 && ms.purificationsThisMatch > 0 && ms.defendsUsed > 0) isDone = true;
        if(cId === 'c47' && ms.firstTurnCorrupt) isDone = true;
        if(cId === 'c48' && ms.enemyReachedMaxHate && !ms.enemyAttackedAfterMaxHate) isDone = true;
        if(cId === 'c49' && ms.rerollWith20PlusAndImpasse) isDone = true;
        if(cId === 'c50' && ms.enemyMasterfulFailure) isDone = true;

        if (isDone) completed.push(cId);
    });

    let details = [];
    if (completed.length > 0) {
        if (!playerProfile.completedContracts) playerProfile.completedContracts = [];
        
        completed.forEach(id => {
            let cData = contractsPool.find(c => c.id === id);
            playerProfile.eclatsOmbre += cData.reward;
            details.push(cData);
            
            if (!playerProfile.completedContracts.includes(id)) {
                playerProfile.completedContracts.push(id);
            }
            
            showToast(t('toast_contract_done') + " " + (currentLang==='fr'?cData.t_fr:cData.t_en), "success");
        });
        playerProfile.activeContracts = playerProfile.activeContracts.filter(id => !completed.includes(id));
        refreshContracts(); 
    }
    return details;
}

let currentLang = 'fr';
const i18n = {
    fr: {
        ui_welcome_title: "BIENVENUE, RÔDEUR", ui_welcome_msg: "Souhaitez-vous activer le guide interactif lors de votre première partie pour apprendre les règles ?",
        ui_btn_tuto_yes: "Oui, guidez-moi", ui_btn_tuto_no: "Non, je connais les règles",
        ui_tuto_title: "ASTUCE DU RÔDEUR", ui_btn_understood: "J'ai compris",
        tuto_intro: "Bienvenue Rôdeur !<br><br>1️⃣ Lancez vos dés avec 'Forcer l'allure'.<br>2️⃣ Vos dés gagnants (4, 5, 6) sont mis de côté.<br>3️⃣ Relancez les autres dés restants, OU arrêtez-vous (Établir le camp) pour valider votre score !",
        tuto_ambush: "Attention, le '1' est une Embuscade ! 💀<br><br>Si vous en avez deux sur la table, c'est la Déroute (vous perdez votre tour et 1 Vie).<br><br>Heureusement, la malchance vous donne de l'Espoir. <b>Cliquez sur le dé rouge</b> pour le Purifier (Coût : 2 Espoirs).",
        tuto_hate: "L'ennemi est enragé ! 🔥<br><br>Il utilise sa Haine pour lancer une attaque de Malice contre vos dés. Si vous avez accumulé au moins 3 Espoirs, vous pouvez utiliser votre Bouclier (A Elbereth !) pour le repousser instantanément ! Attention, cela videra toute votre jauge.",
        tuto_impasse: "IMPASSE ! 🛑<br><br>Vous n'avez marqué aucun point, votre tour s'arrête net. Vous pouvez utiliser votre Boussole (Coût : 3 Espoirs) pour relancer ces dés. <i>(1 seule Action d'Espoir par tour !)</i>",
        tuto_shadow: "L'Ombre vous tente... 🌑<br><br>Vous avez détruit le dé de l'ennemi. Mais attention : cela fait monter votre jauge d'Ombre.<br><br>⚠️ Si votre Ombre dépasse 3, la corruption risque de vous tuer instantanément à chaque nouvelle utilisation !",
        ui_tavern_title: "L'AUBERGE DU PONT-AUX-PIERRES", ui_tavern_sub: "Dirhael, les ombres s'allongent. Choisissez votre table.",
        ui_btn_rules: "Lire le Grimoire", name_brag: "BRAG", name_zamin: "ZÂMIN", name_kael: "KAEL", name_letranger: "L'ÉTRANGER",
        diff_easy: "FACILE", diff_normal: "NORMAL", diff_hard: "DIFFICILE", diff_random: "ALÉATOIRE",
        ui_res_lives: "Vies (Déroute = -1)", ui_res_hope: "Espoir (Défenses & Actions)", ui_res_shadow: "Ombre (Risque mortel > 3)", ui_res_hate: "Haine (Malice & Attaques)",
        ui_rounds_won: "MANCHES REMPORTÉES :", ui_80_leagues: "80 LIEUES",
        ui_btn_roll: "Forcer l'allure", ui_btn_stop: "Établir le camp", ui_btn_leave: "Quitter la table", ui_btn_continue: "CONTINUER",
        ui_espoir_used: "Action d'Espoir utilisée", ui_espoir_none: "Espoir insuffisant (Min. 2)", ui_espoir_purify: "Dispo : Purifier (-2)", ui_espoir_compass: "Dispo : Purifier, Boussole, Elbereth",
        rules_title: "LE GRIMOIRE DU RÔDEUR", rules_close: "Fermer", ui_leagues: "LIEUES",
        rules_text: `<div style="font-family: 'Merriweather', serif; font-size: 14px; line-height: 1.6;"><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">⚔️ LE BUT</h3><p style="margin-top: 0;">Remporter 2 manches en parcourant 80 Lieues avant l'adversaire.</p><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">🎲 LES DÉS</h3><ul style="margin-top: 0; padding-left: 20px; list-style-type: none;"><li><b style="color:var(--gold);">[ 6 ] Triomphe</b> : Donne 10 points.</li><li><b style="color:#5dade2;">[ 4, 5 ] Avancée</b> : Donne 4 ou 5 points.</li><li><b style="color:#888;">[ 2, 3 ] Neutre</b> : Aucun point.</li><li><b style="color:var(--blood);">[ 1 ] Embuscade</b> : Danger mortel. Bloque le dé.</li></ul><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">💀 DÉROUTE & IMPASSE</h3><p style="margin-top: 0;"><b>Déroute :</b> Deux "1" sur la table. Vous perdez votre tour, vos points en cours, et <b style="color:var(--gold);">1 Vie</b>.</p><p><b>🛑 IMPASSE :</b> Si votre lancer ne contient aucun dé gagnant, le tour s'arrête net (0 point).</p><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">⭐ L'ESPOIR (Le Joueur)</h3><p style="margin-top: 0;">Gagnez +1 Espoir par "1" tiré, ou +2 en sacrifiant un "6" au campement. Dépensez-les pour survivre :</p><ul style="margin-top: 0; padding-left: 20px;"><li><b>Purifier (-2)</b> : Cliquez sur un "1" pour l'annuler et le relancer.</li><li><b>Boussole (-3)</b> : Relance une Impasse.</li><li><b>A Elbereth (Vide l'Espoir)</b> : Bloque instantanément une attaque ennemie (Min. 3 Espoirs).</li></ul><p style="color: #5dade2; font-style: italic;">⚠️ 1 seule Action d'Espoir autorisée par tour !</p><h3 style="color:var(--blood); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">🔥 LA HAINE (L'Ennemi)</h3><p style="margin-top: 0;">L'ennemi gagne de la Haine à chaque tour ou si vous marquez ${SEUIL_HAINE}+ Lieues d'un coup. S'il a accumulé assez de Haine, il lance une attaque de Malice.</p></div>`,
        status_turn_hero: "À vous de jouer.", status_turn_enemy: "L'adversaire réfléchit...", status_rolling: "Les dés roulent...",
        status_sabotage_kael: "MALICE ! L'ennemi cible votre Triomphe...", status_sabotage_kael_res: "Votre dé est corrompu en Embuscade !",
        status_sabotage_brag: "MALICE ! L'ennemi s'intéresse à votre butin...", status_sabotage_brag_res: "L'ennemi vous dérobe un dé !",
        status_sabotage_zamin: "MALICE ! L'ennemi évalue vos actifs...", status_sabotage_zamin_res: "L'ennemi a gelé l'un de vos dés neutres !",
        status_sabotage_letranger: "MALICE ! L'Étranger frappe depuis l'Ombre...",
	status_acharnement_try: "L'ennemi s'acharne par désespoir !",
        status_acharnement_fail_score: "Échec ! L'ennemi s'épuise et perd 15 Lieues.",
        status_acharnement_fail_life: "Échec critique ! L'ennemi s'effondre et perd 1 Vie.",
        status_acharnement_success: "L'acharnement réussit ! Malice imminente...",
        status_deroute_imminent: "DÉROUTE IMMINENTE ! Que décidez-vous ?", status_impasse_ask: "IMPASSE ! Relancer avec la Boussole (-3) ?",
        status_impasse_lost: "IMPASSE ! Terrain hostile. Tour perdu.", status_action_purify: "ACTION REQUISE : CLIQUEZ sur le DÉ ROUGE !",
        status_urgency: "URGENCE : Défendez-vous d'abord !", status_purify_success: "Sacrifice héroïque : Embuscade purifiée !",
        status_hope_used: "ESPOIR ! Vous purifiez le dé maudit...", status_deroute_forced: "VOUS NE POUVEZ PLUS VOUS DÉFENDRE.",
        status_cannot_purify: "Impossible : Action d'Espoir déjà utilisée ou ressources insuffisantes.", status_compass_used: "La Boussole vous guide ! Relance...", status_impasse_accepted: "Impasse acceptée. Tour perdu.",
        status_elbereth_ask: "MALICE ! L'ennemi attaque !", status_elbereth_success: "A Elbereth ! La lumière repousse l'Ombre !", btn_elbereth: "A Elbereth ! (Vide l'Espoir)",
        ask_sabotage_kael: "KAEL cible votre {val} pour le corrompre ! Voulez-vous en appeler à Elbereth ?",
        ask_sabotage_brag: "BRAG tente de voler votre {val} ! Voulez-vous en appeler à Elbereth ?",
        ask_sabotage_zamin: "ZÂMIN veut geler votre {val} ! Voulez-vous en appeler à Elbereth ?",
        ask_sabotage_letranger: "L'ÉTRANGER tisse sa toile autour de votre {val} ! Voulez-vous en appeler à Elbereth ?",
        mod_normal_title: "☀️ Ciel Dégagé", mod_normal_desc: "La voie est libre. Aucune altération des règles n'est en vigueur.",
        mod_brouillard_title: "🌫️ Brouillard des Galgals", mod_brouillard_desc: "L'air est lourd. Marquer 8+ Lieues d'un coup attire la Haine de l'Ennemi (au lieu de 10).",
        mod_nuit_title: "🌑 Nuit sur l'Emyn Muil", mod_nuit_desc: "L'obscurité étouffe votre volonté. Votre jauge d'Espoir ne peut pas dépasser 5.",
        mod_aube_title: "🌅 Aube sur l'Anduin", mod_aube_desc: "Une lueur persiste. Sacrifier un Triomphe au campement rend 3 Espoirs au lieu de 2.",
        mod_froid_title: "❄️ Colère du Caradhras", mod_froid_desc: "La montagne est cruelle. L'Ennemi commence la manche avec +2 en Haine.",
        mod_clairiere_title: "🌿 Wellinghall", mod_clairiere_desc: "Un sanctuaire paisible. Vous commencez la manche avec +2 en Espoir.",
        status_shadow_6: "L'adversaire a tiré un 6 ! Le corrompre ?", status_shadow_other: "L'adversaire a tiré un {val} ! L'Ombre a soif...",
        status_shadow_corrupt: "Vous corrompez son Triomphe !", status_shadow_devour: "L'Ombre a dévoré son {val} !",
        status_shadow_survive: "Miracle ! Vous survivez (Risque : {chance}%) !",
        status_enemy_purify_6: "L'adversaire sacrifie un 6 pour survivre !", status_enemy_impasse: "IMPASSE pour l'adversaire.",
        status_deroute_hero: "DÉROUTE ! Perte d'1 Vie.", status_deroute_enemy: "DÉROUTE ! L'adversaire perd 1 Vie.",
        status_camp_hero: "Vous avez établi le camp.", status_camp_enemy: "L'adversaire a établi le camp.", status_select_dice: "Sélectionnez vos dés bleus/or.",
        status_camp_choice: "Sacrifier un Triomphe pour +2 Espoir ?",
        btn_defend: "Se Défendre (-2)", btn_suffer: "Subir la Déroute", btn_compass: "La Boussole (-3)", btn_accept_defeat: "Accepter l'Impasse",
        btn_corrupt: "Corrompre (+1 Ombre)", btn_devour: "Dévorer (+1 Ombre)", btn_ignore: "Ignorer", btn_camp_sacrifice: "Sacrifier (+2 Espoir)", btn_camp_normal: "Garder les points",
        ev_pas_title: "LE PAS DU RÔDEUR", ev_pas_msg: "Succès Magistral ! Vous rejouez !", ev_pas_btn: "Continuer",
        ev_gouffre_title: "GOUFFRE DU DÉSESPOIR", ev_gouffre_msg: "Échec Magistral ! Volonté brisée...", ev_gouffre_btn: "Subir la Déroute",
        ev_elan_title: "ÉLAN TÉNÉBREUX", ev_elan_msg: "L'Ennemi fait une percée de {val} Lieues !", ev_elan_btn: "Subir",
        ev_malediction_title: "MALÉDICTION", ev_malediction_msg: "L'Ennemi s'effondre sous sa propre Haine !", ev_malediction_btn: "Déroute",
        end_vic_title: "VICTOIRE TOTALE", end_vic_msg: "Vous remportez ce duel mortel !", end_vic_btn: "Quitter",
        end_def_title: "DÉFAITE FATALE", end_def_msg: "Votre voyage s'arrête ici.", end_def_btn: "Fuir",
        end_manche_lose_title: "MANCHE PERDUE", end_manche_lose_msg: "L'ennemi gagne cette course.", end_manche_lose_btn: "Continuer",
        end_shadow_title: "CONSUMÉ", end_shadow_msg: "Votre avidité vous a tué.", end_shadow_btn: "Quitter",
        loot_vic_xp: "+ {val} XP", loot_vic_shards: "+ {val} ÉCLATS",
        loot_def_xp: "+ 0 XP (Match Perdu)", loot_def_shards: "+ {val} ÉCLATS (Vestiges)", loot_lvl_up: "🎉 NIVEAU {lvl} ATTEINT ! 🎉",
        ui_reward_title: "COURSE GAGNÉE", ui_reward_msg: "L'ennemi recule. Choisissez votre avantage pour la prochaine manche :",
        ui_reward_init: "L'Initiative (Vous jouez en premier)", ui_reward_heal: "Le Raccourci (+15 Lieues d'avance, l'ennemi joue en premier)",
        ui_level: "Niv.", ui_shards: "Éclats d'Ombre", ui_shards_short: "Éclats", ui_btn_arsenal: "L'Arsenal", ui_arsenal_title: "L'ARSENAL", ui_btn_close: "Fermer",
        ui_tab_vestiaire: "Le Vestiaire", 
        ui_tab_contracts: "Les Traques", 
        ui_contract_desc: "Le devoir d'un Dúnadan ne s'arrête jamais. Vos frères d'armes vous ont confié 3 traques. Remplissez-les en duel pour amasser des Éclats.", 
        ui_contract_reward: "PRIME :",
        ui_btn_shuffle_ready: "Renouveler les Traques (Gratuit)",
        ui_btn_shuffle_wait: "Renouvellement (dans {val} parties)",
        toast_shuffled: "Traques renouvelées avec succès !",
        toast_contract_done: "Traque accomplie :",
        ui_tab_market: "Le Marché Noir", ui_tab_achiev: "Les Hauts Faits", ui_tab_stats: "Le Registre", ui_tab_save: "Sauvegarde",
        ui_ars_boards: "Fonds de Table", ui_ars_dice: "Skins de Dés", ui_ars_frames: "Cadres de Portrait", ui_ars_titles: "Titres Honorifiques",
        ui_ars_ex_boards: "Fonds Exclusifs", ui_ars_ex_dice: "Dés Maudits", ui_ars_ex_frames: "Cadres Corrompus", ui_ars_ex_titles: "Titres Prestigieux",
        ui_btn_equip: "Équiper", ui_btn_equipped: "ÉQUIPÉ", ui_btn_buy: "ACHETER", ui_locked_lvl: "Verrouillé", ui_market_desc: "Dépensez vos Éclats d'Ombre.",
        stat_lvl: "Niveau :", stat_xp: "XP Totale :", stat_leagues: "Lieues parcourues :", stat_played: "Parties jouées :", stat_won: "Victoires :", stat_shadows: "Ombres dévorées :", stat_purif: "Embuscades purifiées :", stat_routs: "Déroutes subies :", stat_streak: "Série de victoires actuelle :", stat_1life: "Victoires in extremis (1 Vie) :",
        save_title: "Sauvegarder", save_desc1: "Copiez ce code.", save_btn_gen: "Générer", save_desc2: "Collez un code.", save_btn_import: "Restaurer",
        toast_lvl_up: "Niveau Supérieur ! Niveau {lvl} atteint !", toast_buy_ok: "Achat réussi !", toast_buy_fail: "Fonds insuffisants !", toast_copy_ok: "Copié !", toast_import_ok: "Restauré !", toast_import_fail: "Code invalide.",
        title_ranger: "Le Rôdeur", title_walker: "Le Marcheur", title_deathcheater: "Trompe-la-Mort", title_dunedain: "Dúnadan", title_lordchance: "Seigneur du Hasard", title_reckless: "Le Téméraire", title_orcblight: "Fléau des Orques", title_kingnocrown: "Roi sans Couronne", title_eternal: "L'Éternel", title_lightbearer: "Porteur de Lumière", title_bearer: "Le Porteur", title_bloodwest: "Sang de l'Ouest", title_thiefshadow: "Voleur dans l'Ombre", title_hobbit: "Lost Hobbit",
        dialogues: {
            dirhael: { greetings: ["Chaque pas compte."], success: ["La piste est bonne."], failure: ["Le fardeau devient lourd..."], purify: ["Un mal pour un bien."], hope_hate: ["L'espoir fait vivre."], impasse: ["Maudites broussailles..."], camp: ["Prenons un instant."], shadow: ["Pardonnez-moi, ancêtres..."] },
            brag: { greetings: ["Amène tes pièces !"], success: ["Je t'ai plumé !"], failure: ["Mes os !"], purify: ["Lâcher mon butin..."], hope_hate: ["Rends-moi ça !"], impasse: ["On s'égare ?"], camp: ["Moi j'empoche !"] },
            zamin: { greetings: ["La Maison gagne toujours."], success: ["Le profit avant tout."], failure: ["Anomalie statistique."], purify: ["Déficit tactique."], hope_hate: ["Saisie immobilière."], impasse: ["Le marché stagne."], camp: ["Investissement sécurisé."] },
            kael: { greetings: ["Le Gondor est mort."], success: ["Succombe au désespoir."], failure: ["Flamme vacillante !"], purify: ["Sacrifice pour la survie."], hope_hate: ["Souffre, Dúnadan !"], impasse: ["Nous tournons en rond."], camp: ["Le filet se resserre."] },
            letranger: { greetings: ["Donne-moi les dés."], success: ["Tu glisses..."], failure: ["Trop de lumière..."], purify: ["*Sifflement*"], hope_hate: ["L'ombre s'étend..."], impasse: ["*Silence*"], camp: ["*Il vous observe*"] }
        }
    },
    en: {
        ui_welcome_title: "WELCOME, RANGER", ui_welcome_msg: "Would you like to enable the interactive guide during your first match?",
        ui_btn_tuto_yes: "Yes, guide me", ui_btn_tuto_no: "No, I know the rules", ui_tuto_title: "RANGER'S TIP", ui_btn_understood: "Understood",
        tuto_intro: "Welcome Ranger!<br><br>1️⃣ Roll your dice with 'Push the pace'.<br>2️⃣ Winning dice (4, 5, 6) are kept automatically.<br>3️⃣ Reroll the rest, OR stop (Set up camp) to bank your points!",
        tuto_ambush: "Beware, the '1' is a deadly Ambush! 💀<br><br>If you get two on the table, it's a Rout (lose your turn and 1 Life).<br><br><b>Click on the red die</b> to Purify it (Cost: 2 Hope).",
        tuto_hate: "The enemy is enraged! 🔥<br><br>They use Hate to launch a Malice attack. With at least 3 Hope, use your Shield (A Elbereth!) to repel it instantly! (Empties gauge).",
        tuto_impasse: "DEAD END! 🛑<br><br>You scored 0 points. You can use your Compass (Cost: 3 Hope) to reroll these useless dice.",
        tuto_shadow: "The Shadow tempts you... 🌑<br><br>You destroyed an enemy die. Beware: this increases your Shadow gauge.<br><br>⚠️ If your Shadow exceeds 3, corruption may kill you!",
        ui_tavern_title: "THE STONEBRIDGE TAVERN", ui_tavern_sub: "Dirhael, the shadows lengthen. Choose your table.", ui_btn_rules: "Read Grimoire", name_brag: "BRAG", name_zamin: "ZÂMIN", name_kael: "KAEL", name_letranger: "THE STRANGER",
        diff_easy: "EASY", diff_normal: "NORMAL", diff_hard: "HARD", diff_random: "RANDOM",
        ui_res_lives: "Lives (Rout = -1)", ui_res_hope: "Hope (Defenses & Actions)", ui_res_shadow: "Shadow (Death Risk > 3)", ui_res_hate: "Hate (Malice & Attacks)",
        ui_rounds_won: "ROUNDS WON :", ui_80_leagues: "80 LEAGUES", ui_btn_roll: "Push the pace", ui_btn_stop: "Set up camp", ui_btn_leave: "Leave table", ui_btn_continue: "CONTINUE",
        ui_espoir_used: "Hope Action used", ui_espoir_none: "Not enough Hope (Min. 2)", ui_espoir_purify: "Ready: Purify (-2)", ui_espoir_compass: "Ready: Purify, Compass, Elbereth",
        rules_title: "THE RANGER'S GRIMOIRE", rules_close: "Close", ui_leagues: "LEAGUES",
        rules_text: `<div style="font-family: 'Merriweather', serif; font-size: 14px; line-height: 1.6;"><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">⚔️ THE GOAL</h3><p style="margin-top: 0;">Win 2 rounds by traveling 80 Leagues before your opponent.</p><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">🎲 THE DICE</h3><ul style="margin-top: 0; padding-left: 20px; list-style-type: none;"><li><b style="color:var(--gold);">[ 6 ] Triumph</b>: 10 points.</li><li><b style="color:#5dade2;">[ 4, 5 ] Advance</b>: 4 or 5 points.</li><li><b style="color:#888;">[ 2, 3 ] Neutral</b>: No points.</li><li><b style="color:var(--blood);">[ 1 ] Ambush</b>: Deadly threat. Locks the die.</li></ul><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">💀 ROUT & DEAD END</h3><p style="margin-top: 0;"><b>Rout:</b> Two "1"s. You lose your turn, points, and <b style="color:var(--gold);">1 Life</b>.</p><p><b>🛑 DEAD END:</b> 0 points rolled. Turn ends.</p><h3 style="color:var(--gold); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">⭐ HOPE (You)</h3><p style="margin-top: 0;">Gain +1 Hope per "1" rolled, or +2 by sacrificing a "6" at camp. Spend it to survive:</p><ul style="margin-top: 0; padding-left: 20px;"><li><b>Purify (-2)</b>: Click a "1" to cancel it and reroll.</li><li><b>Compass (-3)</b>: Reroll a Dead End.</li><li><b>A Elbereth (Empties Hope)</b>: Instantly blocks an enemy attack (Min. 3 Hope).</li></ul><p style="color: #5dade2; font-style: italic;">⚠️ Only 1 Hope Action allowed per turn!</p><h3 style="color:var(--blood); font-family: 'Oswald', sans-serif; margin-bottom: 5px;">🔥 HATE (Enemy)</h3><p style="margin-top: 0;">The enemy gains Hate every turn or if you score ${SEUIL_HAINE}+ Leagues at once. If high enough, they launch a Malice attack.</p></div>`,
        status_turn_hero: "It's your turn.", status_turn_enemy: "The opponent is thinking...", status_rolling: "Rolling...",
        status_sabotage_kael: "MALICE! Enemy targets your Triumph...", status_sabotage_kael_res: "Die corrupted into Ambush!",
        status_sabotage_brag: "MALICE! Enemy eyes your loot...", status_sabotage_brag_res: "Enemy steals your die!",
        status_sabotage_zamin: "MALICE! Enemy evaluates assets...", status_sabotage_zamin_res: "Enemy froze a neutral die!",
        status_sabotage_letranger: "MALICE! The Stranger strikes from the Shadow...",
	status_acharnement_try: "The enemy strikes in desperation!",
        status_acharnement_fail_score: "Failure! The enemy exhausts itself and loses 15 Leagues.",
        status_acharnement_fail_life: "Critical failure! The enemy collapses and loses 1 Life.",
        status_acharnement_success: "Desperation succeeds! Malice incoming...",
        status_deroute_imminent: "IMMINENT ROUT! What do you decide?", status_impasse_ask: "DEAD END! Reroll with Compass (-3)?",
        status_impasse_lost: "DEAD END! Hostile terrain. Turn lost.", status_action_purify: "ACTION REQUIRED: CLICK the RED DIE!",
        status_urgency: "URGENCY: Defend yourself first!", status_purify_success: "Heroic sacrifice: Ambush purified!",
        status_hope_used: "HOPE! You purified the cursed die...", status_deroute_forced: "YOU CAN NO LONGER DEFEND YOURSELF.",
        status_cannot_purify: "Cannot purify: Hope Action already used or not enough Hope.", status_compass_used: "The Compass guides you! Rerolling...", status_impasse_accepted: "Dead End accepted. Turn lost.",
        status_elbereth_ask: "MALICE! Enemy attacks!", status_elbereth_success: "A Elbereth! The light drives back the Shadow!", btn_elbereth: "A Elbereth! (Empties Hope)",
        ask_sabotage_kael: "KAEL targets your {val} for corruption! Will you call upon Elbereth?", ask_sabotage_brag: "BRAG attempts to steal your {val}! Will you call upon Elbereth?", ask_sabotage_zamin: "ZÂMIN wants to freeze your {val}! Will you call upon Elbereth?", ask_sabotage_letranger: "THE STRANGER weaves his web around your {val}! Will you call upon Elbereth?",
        mod_normal_title: "☀️ Clear Sky", mod_normal_desc: "The path is clear. No special rules are in effect.",
        mod_brouillard_title: "🌫️ Fog on the Barrow-downs", mod_brouillard_desc: "The air is heavy. Scoring 8+ Leagues at once draws Enemy Hate (instead of 10).",
        mod_nuit_title: "🌑 Night on the Emyn Muil", mod_nuit_desc: "The dark stifles your will. Your Hope gauge cannot exceed 5.",
        mod_aube_title: "🌅 Dawn on the Anduin", mod_aube_desc: "A glimmer persists. Sacrificing a Triumph at camp restores 3 Hope instead of 2.",
        mod_froid_title: "❄️ Wrath of Caradhras", mod_froid_desc: "The mountain is cruel. The Enemy starts the round with +2 Hate.",
        mod_clairiere_title: "🌿 Wellinghall", mod_clairiere_desc: "A peaceful sanctuary. You start the round with +2 Hope.",
        status_shadow_6: "Opponent rolled a 6! Corrupt it?", status_shadow_other: "Opponent rolled a {val}! Shadow thirsts...", status_shadow_corrupt: "You corrupted their Triumph!", status_shadow_devour: "The Shadow devoured their {val}!", status_shadow_survive: "Miracle! You survived (Risk: {chance}%)!", status_enemy_purify_6: "Opponent sacrifices a 6 to survive!", status_enemy_impasse: "DEAD END for the opponent.", status_deroute_hero: "ROUT! You lose 1 Life.", status_deroute_enemy: "ROUT! Opponent loses 1 Life.", status_camp_hero: "You have set up camp.", status_camp_enemy: "Opponent set up camp.", status_select_dice: "Select your dice.", status_camp_choice: "Sacrifice a Triumph for +2 Hope?", btn_defend: "Defend (-2)", btn_suffer: "Suffer Rout", btn_compass: "Compass (-3)", btn_accept_defeat: "Accept Dead End", btn_corrupt: "Corrupt (+1 Shadow)", btn_devour: "Devour (+1 Shadow)", btn_ignore: "Ignore", btn_camp_sacrifice: "Sacrifice (+2 Hope)", btn_camp_normal: "Keep points",
        ev_pas_title: "THE RANGER'S STRIDE", ev_pas_msg: "Masterful Success! You replay!", ev_pas_btn: "Continue", ev_gouffre_title: "ABYSS OF DESPAIR", ev_gouffre_msg: "Masterful Failure! Hope collapses...", ev_gouffre_btn: "Suffer Rout", ev_elan_title: "DARK MOMENTUM", ev_elan_msg: "Enemy covers {val} Leagues!", ev_elan_btn: "Endure", ev_malediction_title: "CURSE", ev_malediction_msg: "Enemy collapses under their own Hate!", ev_malediction_btn: "Rout", end_vic_title: "TOTAL VICTORY", end_vic_msg: "You survived the shadow and triumphed.", end_vic_btn: "Leave table", end_def_title: "FATAL DEFEAT", end_def_msg: "Your journey ends here.", end_def_btn: "Flee tavern", end_manche_lose_title: "ROUND LOST", end_manche_lose_msg: "Enemy wins this race.", end_manche_lose_btn: "Continue", end_shadow_title: "CONSUMED", end_shadow_msg: "Your greed killed you.", end_shadow_btn: "Quit",
        loot_vic_xp: "+ {val} XP", loot_vic_shards: "+ {val} SHARDS", loot_def_xp: "+ 0 XP (Match Lost)", loot_def_shards: "+ {val} SHARDS (Salvaged)", loot_lvl_up: "🎉 LEVEL {lvl} REACHED! 🎉", ui_reward_title: "RACE WON", ui_reward_msg: "Choose your advantage for the next round:", ui_reward_init: "Initiative (You play first)", ui_reward_heal: "The Shortcut (+15 Leagues head start, enemy plays first)", ui_level: "Lvl.", ui_shards: "Shadow Shards", ui_shards_short: "Shards", ui_btn_arsenal: "The Arsenal", ui_arsenal_title: "THE ARSENAL", ui_btn_close: "Close", 
        ui_tab_vestiaire: "The Wardrobe", 
        ui_tab_contracts: "The Hunts", 
        ui_contract_desc: "A Dúnadan's duty never ends. Your brothers-in-arms have entrusted you with 3 hunts. Complete them in duels to earn Shards.", 
        ui_contract_reward: "BOUNTY:", 
        ui_btn_shuffle_ready: "Reroll Hunts (Free)",
        ui_btn_shuffle_wait: "Reroll Hunts (in {val} matches)",
        toast_shuffled: "Hunts rerolled successfully!",
        toast_contract_done: "Hunt fulfilled:",
        ui_tab_market: "Black Market", ui_tab_achiev: "Achievements", ui_tab_stats: "The Ledger", ui_tab_save: "Save Game", ui_ars_boards: "Table Boards", ui_ars_dice: "Dice Skins", ui_ars_frames: "Portrait Frames", ui_ars_titles: "Honorary Titles", ui_ars_ex_boards: "Exclusive Boards", ui_ars_ex_dice: "Cursed Dice", ui_ars_ex_frames: "Corrupted Frames", ui_ars_ex_titles: "Prestigious Titles", ui_btn_equip: "Equip", ui_btn_equipped: "EQUIPPED", ui_btn_buy: "BUY", ui_locked_lvl: "Locked", ui_market_desc: "Spend your Shadow Shards.", stat_lvl: "Level:", stat_xp: "Total XP:", stat_leagues: "Leagues traveled:", stat_played: "Matches played:", stat_won: "Wins:", stat_shadows: "Shadows devoured:", stat_purif: "Ambushes purified:", stat_routs: "Routs suffered:", stat_streak: "Current win streak:", stat_1life: "Close calls (1 Life wins):", save_title: "Save and Transfer", save_desc1: "Copy code.", save_btn_gen: "Generate", save_desc2: "Paste code.", save_btn_import: "Restore", toast_lvl_up: "Level Up! Reached Level {lvl}!", toast_buy_ok: "Purchase successful!", toast_buy_fail: "Not enough Shards!", toast_copy_ok: "Copied!", toast_import_ok: "Restored!", toast_import_fail: "Invalid code.",
        title_ranger: "The Ranger", title_walker: "The Walker", title_deathcheater: "Death-Cheater", title_dunedain: "Dúnadan", title_lordchance: "Lord of Chance", title_reckless: "The Reckless", title_orcblight: "Orc Bane", title_kingnocrown: "King Without a Crown", title_eternal: "The Eternal", title_lightbearer: "Light Bearer", title_bearer: "The Bearer", title_bloodwest: "Blood of the West", title_thiefshadow: "Thief in the Shadow", title_hobbit: "Lost Hobbit",
        dialogues: {
            dirhael: { greetings: ["Every step counts."], success: ["The trail is good."], failure: ["The burden grows heavy..."], purify: ["A necessary evil."], hope_hate: ["Hope guides me."], impasse: ["Cursed underbrush..."], camp: ["Let's breathe."], shadow: ["Forgive me, ancestors..."] },
            brag: { greetings: ["Bring your coins!"], success: ["I plucked you!"], failure: ["My bones!"], purify: ["Dropping good loot!"], hope_hate: ["Give that back!"], impasse: ["Are we lost?"], camp: ["I'm cashing in!"] },
            zamin: { greetings: ["The House of Gold wins."], success: ["Haste is the enemy of profit."], failure: ["Statistical anomaly."], purify: ["Tactical deficit."], hope_hate: ["Foreclosure."], impasse: ["Market stagnates..."], camp: ["Investment secured."] },
            kael: { greetings: ["Le Gondor is dead."], success: ["Succombe to despair."], failure: ["Flickering flame!"], purify: ["Sacrifice for survival."], hope_hate: ["Suffer, Dúnadan!"], impasse: ["We run in circles."], camp: ["The net tightens."] },
            letranger: { greetings: ["Give me the dice."], success: ["You slip..."], failure: ["Too much light..."], purify: ["*Hiss*"], hope_hate: ["Shadow spreads..."], impasse: ["*Silence*"], camp: ["*He watches*"] }
        }
    }
};

function t(key, params = {}) { let text = i18n[currentLang][key] || i18n['fr'][key]; if (!text) return key; for (let p in params) { text = text.replace(`{${p}}`, params[p]); } return text; }
function toggleLanguage() { 
    currentLang = (currentLang === 'fr') ? 'en' : 'fr'; document.getElementById('lang-btn').innerText = (currentLang === 'fr') ? "🇬🇧 EN" : "🇫🇷 FR"; updateStaticUI(); updateAudioButtons();
    let turnScoreEl = document.getElementById('current-turn-score'); if (turnScoreEl) turnScoreEl.innerHTML = `${gameState.turnScore} <span>${t('ui_leagues')}</span>`;
    let btnRoll = document.getElementById('btn-roll'); if(btnRoll) btnRoll.innerText = t('ui_btn_roll'); let btnStop = document.getElementById('btn-stop'); if(btnStop) btnStop.innerText = t('ui_btn_stop');
    let btnLeave = document.querySelector('.back-btn'); if(btnLeave) btnLeave.innerText = t('ui_btn_leave');
    let enemyNameEl = document.getElementById('ui-enemy-name'); if (enemyNameEl && gameState.currentEnemyId) { enemyNameEl.innerText = i18n[currentLang]["name_" + gameState.currentEnemyId]; }
    applyCosmetics(); if(document.getElementById('arsenal-modal').style.display === 'flex') { switchArsenalTab(document.querySelector('.tab-btn.active').getAttribute('onclick').match(/'(.*?)'/)[1]); }
    if(document.getElementById('ui-modifier-banner').style.display !== 'none') { document.getElementById('ui-mod-title').innerText = t('mod_' + gameState.currentModifier + '_title'); document.getElementById('ui-mod-desc').innerText = t('mod_' + gameState.currentModifier + '_desc'); }
    const smallIcon = document.getElementById('persistent-mod-icon'); if (smallIcon) smallIcon.title = t('mod_' + gameState.currentModifier + '_desc');
}
function setLanguage(lang) { currentLang = lang; document.getElementById('lang-btn').innerText = (currentLang === 'fr') ? "🇬🇧 EN" : "🇫🇷 FR"; updateStaticUI(); if (document.getElementById('welcome-modal').style.display === 'flex') updateStaticUI(); }
function updateStaticUI() { document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (i18n[currentLang] && i18n[currentLang][key]) el.innerHTML = i18n[currentLang][key]; }); const rulesContainer = document.getElementById('rules-container'); if (rulesContainer && i18n[currentLang].rules_text) rulesContainer.innerHTML = i18n[currentLang].rules_text; }

// ==========================================
// INTERFACE & JEU
// ==========================================
function updateLivesUI() {
    const hc = document.getElementById('ui-hero-lives'); hc.innerHTML = ''; for (let i = 0; i < 3; i++) hc.innerHTML += `<div class="token vie ${i < gameState.playerLives ? '' : 'lost'}"></div>`;
    const ec = document.getElementById('ui-enemy-lives'); ec.innerHTML = ''; for (let i = 0; i < gameState.enemyStartLives; i++) ec.innerHTML += `<div class="token vie ${i < gameState.enemyLives ? '' : 'lost'}"></div>`;
}

function updateEspoirUI() { 
    const c = document.getElementById('ui-espoir-tokens'); if (!c) return; 
    c.removeAttribute('style'); 
    let maxEspoir = (gameState.currentModifier === 'nuit') ? 5 : 10;
    let statusText = "";
    if (gameState.hasUsedEspoirThisTurn) { statusText = `⌛ ${t('ui_espoir_used')}`; } 
    else if (gameState.playerEspoir < 2) { statusText = `❌ ${t('ui_espoir_none')}`; } 
    else if (gameState.playerEspoir === 2) { statusText = `⚡ ${t('ui_espoir_purify')}`; } 
    else if (gameState.playerEspoir >= 3) { statusText = `⚡ ${t('ui_espoir_compass')}`; }
    
    c.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; line-height: 1;">
            <span style="color:var(--gold); font-family:'Oswald', sans-serif; font-size: clamp(14px, 4vw, 16px);">⭐ ${gameState.playerEspoir} / ${maxEspoir}</span>
            <span style="color:#888; font-size: clamp(9px, 2.5vw, 11px); margin-top: 4px; white-space: nowrap;">${statusText}</span>
        </div>`; 
}

function updateHaineUI() { 
    const c = document.getElementById('ui-haine-tokens'); if (!c) return; 
    c.removeAttribute('style'); 
    
    c.innerHTML = `
        <div style="color:var(--blood); font-family:'Oswald', sans-serif; font-size: clamp(14px, 4vw, 16px); line-height: 1; display: flex; align-items: center; justify-content: center; height: 100%;">
            🔥 ${gameState.enemyHate} / 10
        </div>`; 
}

function updateShadowUI() { const c = document.getElementById('ui-ombre-tokens'); if (!c) return; c.innerHTML = ''; let max = Math.max(3, gameState.playerShadow); for (let i = 0; i < max; i++) { if (i < gameState.playerShadow) c.innerHTML += `<div class="token ombre" style="${i>=3 ? 'background:var(--blood);border-color:var(--blood);box-shadow:0 0 10px var(--blood);' : 'background:var(--corruption);'}"></div>`; else c.innerHTML += `<div class="token ombre"></div>`; } }
function updateGlobalUI() {
    let heroProgressPercent = Math.min((gameState.playerScore / gameState.targetScore) * 100, 100); let enemyProgressPercent = Math.min((gameState.enemyScore / gameState.targetScore) * 100, 100);
    document.getElementById('progress-hero').style.width = (heroProgressPercent / 2) + "%"; document.getElementById('progress-enemy').style.width = (enemyProgressPercent / 2) + "%";
    document.getElementById('score-hero-display').innerText = gameState.playerScore; document.getElementById('score-enemy-display').innerText = gameState.enemyScore;
    document.getElementById('rounds-hero').innerText = gameState.heroRounds; document.getElementById('rounds-enemy').innerText = gameState.enemyRounds;
}
function updateStatus(text, color) { const e = document.getElementById('game-status'); if (e) { e.innerText = text; e.style.color = color; } }
let dialogueTimeouts = {};
function updateDialogue(character, situation, elementId) {
    const lines = i18n[currentLang].dialogues[character] ? i18n[currentLang].dialogues[character][situation] : null; if (!lines) return; 
    const el = document.getElementById(elementId); el.style.opacity = 0; if(dialogueTimeouts[elementId]) clearTimeout(dialogueTimeouts[elementId]);
    setTimeout(() => { el.innerText = `"${lines[Math.floor(Math.random() * lines.length)]}"`; el.style.opacity = 1; dialogueTimeouts[elementId] = setTimeout(() => { el.style.opacity = 0; }, 3500); }, 300);
}
function applyCosmetics() {
    const boardKey = playerProfile.equipped.board || playerProfile.equipped.boards || 'dark'; const frameKey = playerProfile.equipped.frame || playerProfile.equipped.frames || 'basic';
    const titleKey = playerProfile.equipped.title || playerProfile.equipped.titles || 'title_ranger'; const diceKey = playerProfile.equipped.dice || 'classic';
    const board = document.getElementById('center-board'); if (board) { board.className = ''; board.classList.add(`board-${boardKey}`); }
    const heroPortrait = document.querySelector('.hero-portrait'); if (heroPortrait) { heroPortrait.className = 'char-portrait hero-portrait'; heroPortrait.classList.add(`frame-${frameKey}`); }
    const title = document.getElementById('hero-title'); if (title) title.innerText = t(titleKey);
    for(let i=0; i<5; i++) {
        let die = document.getElementById(`die-${i}`);
        if(die) {
            let d = die.classList.contains('die-danger'), t = die.classList.contains('die-triumph'), a = die.classList.contains('die-advance'), n = die.classList.contains('die-neutral'), s = die.classList.contains('die-sacrificed'); die.className = 'die';
            if(d) die.classList.add('die-danger'); else if(t) die.classList.add('die-triumph'); else if(a) die.classList.add('die-advance'); else if(n) die.classList.add('die-neutral'); else if(s) die.classList.add('die-sacrificed'); else die.classList.add('die-idle');
            if(diceKey !== 'classic') die.classList.add(`skin-${diceKey}`);
        }
    }
}

function enterDuel(id, fullName) {
    gameState.currentEnemyId = id; document.body.className = 'theme-' + id; document.getElementById('ui-enemy-name').innerText = i18n[currentLang]["name_"+id];
    let imgName = "images/" + id.charAt(0).toUpperCase() + id.slice(1) + ".png"; if(id === 'letranger') imgName = "images/Letranger.png"; document.getElementById('enemy-portrait-img').src = imgName;
    document.getElementById('tavern-screen').style.display = 'none'; document.getElementById('duel-screen').style.display = 'flex';
    
    if (id === 'brag') { gameState.secretPersonality = 'brag'; gameState.enemyRiskProfile = 'brag'; } else if (id === 'zamin') { gameState.secretPersonality = 'zamin'; gameState.enemyRiskProfile = 'zamin'; } else if (id === 'kael') { gameState.secretPersonality = 'kael'; gameState.enemyRiskProfile = 'kael'; } else { gameState.secretPersonality = 'chaos'; gameState.enemyRiskProfile = 'chaos'; }
    gameState.enemyStartLives = 3; gameState.enemyMaxHate = 10; audioManager.playBGM('duel_' + id); 
    
    playerProfile.stats.gamesSinceShuffle = (playerProfile.stats.gamesSinceShuffle || 0) + 1;

    gameState.matchStats = { turnsPlayedThisRound: 0, consecutiveShadowMaxTurns: 0, defendsUsed: 0, shadowsUsedThisRound: 0, firstRoundLost: false, deroutesThisMatch: 0, purificationsThisMatch: 0, compassUsedThisMatch: 0, shadowsUsedThisMatch: 0, highestTurnScoreThisMatch: 0, totalTurnsThisMatch: 0, bankedUnder15: false, enemyZeroPointRound: false, acceptedImpasseAndWon: false, sacrificedSix: false, devouredAdvance: false, corruptedSix: false, enemyMasterfulFailure: false, purifyAndShadowSameTurn: false, purifyUsedThisTurn: false, shadowUsedThisTurn: false, rerollWith20PlusAndImpasse: false, elberethVsKaelAndWon: false, firstTurnCorrupt: false, enemyReachedMaxHate: false, enemyAttackedAfterMaxHate: false, exact80Round: false, enemyLostRoundWithZero: false };
    
    const modifiers = ['normal', 'brouillard', 'nuit', 'aube', 'froid', 'clairiere'];
    gameState.currentModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    
    playerProfile.stats.gamesPlayed++; saveProfile(); applyCosmetics(); startNewRound(true, 'hero'); 
}

function startNewRound(isFirstRound = false, roundWinner = 'hero') {
    gameState.playerScore = 0; gameState.enemyScore = 0; gameState.playerLives = 3; gameState.enemyLives = gameState.enemyStartLives; 
    
    const modBanner = document.getElementById('ui-modifier-banner'); const smallIcon = document.getElementById('persistent-mod-icon');
    if (modBanner) {
        if (gameState.currentModifier === 'normal') { modBanner.style.borderColor = '#444'; modBanner.querySelector('h4').style.color = '#ccc'; } else { modBanner.style.borderColor = 'var(--gold)'; modBanner.querySelector('h4').style.color = 'var(--gold)'; }
        modBanner.style.display = 'block'; document.getElementById('ui-mod-title').innerText = t('mod_' + gameState.currentModifier + '_title'); document.getElementById('ui-mod-desc').innerText = t('mod_' + gameState.currentModifier + '_desc');
    }
    if (smallIcon) {
        smallIcon.style.display = 'none'; const modIcons = { normal: '☀️', brouillard: '🌫️', nuit: '🌑', aube: '🌅', froid: '❄️', clairiere: '🌿' };
        smallIcon.innerText = modIcons[gameState.currentModifier]; smallIcon.title = t('mod_' + gameState.currentModifier + '_desc');
    }

    let baseEspoir = 1; let baseHate = 1;
    if (gameState.currentModifier === 'clairiere') baseEspoir += 2;
    if (gameState.currentModifier === 'froid') baseHate += 2;

    if (isFirstRound) { gameState.heroRounds = 0; gameState.enemyRounds = 0; gameState.heroRoutLastTurn = false; } else {
        if (gameState.heroRounds > gameState.enemyRounds) { baseHate += 1; } else if (gameState.enemyRounds > gameState.heroRounds) { baseEspoir += 1; }
    }
    
    let maxEspoir = (gameState.currentModifier === 'nuit') ? 5 : 10;
    gameState.playerShadow = 0; gameState.playerEspoir = Math.min(maxEspoir, baseEspoir); gameState.enemyHate = Math.min(10, baseHate); gameState.matchStats.turnsPlayedThisRound = 0;
    
    updateGlobalUI(); updateEspoirUI(); updateHaineUI(); updateLivesUI(); updateShadowUI(); gameState.activePlayer = roundWinner;
    if (isFirstRound) { updateDialogue('dirhael', 'greetings', 'ui-hero-dialogue'); updateDialogue(gameState.currentEnemyId, 'greetings', 'ui-enemy-dialogue'); }
    switchTurn(true);
}

function exitDuel() { document.body.className = ''; document.getElementById('duel-screen').style.display = 'none'; document.getElementById('tavern-screen').style.display = 'block'; audioManager.playBGM('tavern'); checkAchievements(); }

function switchTurn(isInit = false) {
    if (!isInit) gameState.activePlayer = (gameState.activePlayer === 'hero') ? 'enemy' : 'hero';
    if (gameState.activePlayer === 'hero') gameState.matchStats.turnsPlayedThisRound++;
    gameState.matchStats.totalTurnsThisMatch++;
    gameState.matchStats.purifyUsedThisTurn = false; gameState.matchStats.shadowUsedThisTurn = false;
    
    if (gameState.playerShadow >= 3) gameState.matchStats.consecutiveShadowMaxTurns++; else gameState.matchStats.consecutiveShadowMaxTurns = 0;
    
    gameState.hasUsedEspoirThisTurn = false; updateEspoirUI();

    if (gameState.activePlayer === 'enemy') {
        let hateGain = 1; if (gameState.currentEnemyId === 'letranger') { hateGain = Math.floor(Math.random() * 3) + 1; }
        gameState.enemyHate = Math.min(10, gameState.enemyHate + hateGain); updateHaineUI();
        if(gameState.enemyHate === 10) gameState.matchStats.enemyReachedMaxHate = true;
    }
    
    gameState.turnScore = 0; gameState.diceStates = ['idle', 'idle', 'idle', 'idle', 'idle']; gameState.diceValues = [0, 0, 0, 0, 0]; gameState.hasKeptDieThisRoll = false; gameState.pendingDeroute = false;
    document.getElementById('current-turn-score').innerHTML = `0 <span>${t('ui_leagues')}</span>`; createDice(); resetTurnControls();
    const btnRoll = document.getElementById('btn-roll'); const btnStop = document.getElementById('btn-stop');
    
    if (gameState.activePlayer === 'hero') { 
        if(btnRoll) btnRoll.disabled = false; if(btnStop) btnStop.disabled = true; updateStatus(t('status_turn_hero'), "var(--bone)"); 
        if (gameState.matchStats.turnsPlayedThisRound === 1 && gameState.heroRounds === 0) triggerTutorial('seenIntro', 'tuto_intro');
    } else { 
        if(btnRoll) btnRoll.disabled = true; if(btnStop) btnStop.disabled = true; updateStatus(t('status_turn_enemy'), "var(--enemy-color)"); setTimeout(playEnemyTurn, 1500); 
    }
}

function createDice() {
    const arena = document.getElementById('dice-arena'); arena.innerHTML = ''; const skinClass = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';
    for (let i = 0; i < 5; i++) { const wrapper = document.createElement('div'); wrapper.className = 'die-wrapper'; wrapper.id = `wrap-${i}`; wrapper.onclick = () => { if (gameState.activePlayer === 'hero') toggleKeepDie(i); }; wrapper.innerHTML = `<div class="die die-idle ${skinClass}" id="die-${i}"><span class="die-val" id="val-${i}">-</span></div>`; arena.appendChild(wrapper); }
}

async function rollAnimation(diceToRoll) {
    audioManager.playSFX('audio/dice.mp3', 0.15);
    diceToRoll.forEach(idx => { document.getElementById(`wrap-${idx}`).classList.add('rolling'); let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${idx}`).className = `die die-idle ${skin}`; });
    const dicePools = { 0: [1,2,3,4,5,6], 1: [1,2,2,3,3,4,5,6], 2: [1,1,2,2,3,3,4,5,6], 3: [1,1,2,2,2,3,3,4,5,6] };
    let finalValues = {};
    diceToRoll.forEach(idx => { if (gameState.activePlayer === 'hero') { let poolIndex = Math.min(gameState.playerShadow, 3); let pool = dicePools[poolIndex]; finalValues[idx] = pool[Math.floor(Math.random() * pool.length)]; } else { finalValues[idx] = Math.floor(Math.random() * 6) + 1; } });
    const scramble = setInterval(() => { diceToRoll.forEach(idx => { if (document.getElementById(`wrap-${idx}`).classList.contains('rolling')) { document.getElementById(`val-${idx}`).innerText = Math.floor(Math.random() * 6) + 1; } }); }, 50);

    for (let i = 0; i < diceToRoll.length; i++) {
        let delay = 200 + (i * 100); if (i === diceToRoll.length - 1 && diceToRoll.length > 1) delay += 300; await new Promise(res => setTimeout(res, delay));
        let idx = diceToRoll[i]; let val = finalValues[idx]; gameState.diceValues[idx] = val; 
        const wrapEl = document.getElementById(`wrap-${idx}`); const dieEl = document.getElementById(`die-${idx}`); const valEl = document.getElementById(`val-${idx}`); wrapEl.classList.remove('rolling');
        let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';
        if (val === 1) { gameState.diceStates[idx] = 'locked'; dieEl.className = `die die-danger ${skin}`; wrapEl.classList.add('pulse-danger'); valEl.innerText = "1"; } else if (val === 6) { dieEl.className = `die die-triumph ${skin}`; valEl.innerText = "6"; } else if (val >= 4) { dieEl.className = `die die-advance ${skin}`; valEl.innerText = val; } else { dieEl.className = `die die-neutral ${skin}`; valEl.innerText = val; }
    } clearInterval(scramble);
}

async function playHeroTurn() {
    if (gameState.isRolling || gameState.activePlayer !== 'hero') return; 
    const modBanner = document.getElementById('ui-modifier-banner'); const smallIcon = document.getElementById('persistent-mod-icon');
    if (modBanner && modBanner.style.display !== 'none') { modBanner.style.display = 'none'; if (smallIcon) smallIcon.style.display = 'block'; }
    gameState.isRolling = true; gameState.hasKeptDieThisRoll = false; 
    let btnRoll = document.getElementById('btn-roll'); let btnStop = document.getElementById('btn-stop'); if (btnRoll) btnRoll.disabled = true; if (btnStop) btnStop.disabled = true; updateStatus(t('status_rolling'), "#aaa");
    const diceToRoll = []; for(let i=0; i<5; i++) { if (gameState.diceStates[i] === 'idle') diceToRoll.push(i); } gameState.currentHeroRolledIndices = diceToRoll; 
    await rollAnimation(diceToRoll); await new Promise(r => setTimeout(r, 800)); await evaluateHeroRoll(diceToRoll, false); gameState.isRolling = false;
}

async function evaluateHeroRoll(rolledIndices, isReevaluation = false) {
    let rollCountTens = rolledIndices.filter(idx => gameState.diceValues[idx] === 6).length; let rollCountOnes = rolledIndices.filter(idx => gameState.diceValues[idx] === 1).length;
    if (!isReevaluation && rollCountOnes > 0) { let maxEspoir = (gameState.currentModifier === 'nuit') ? 5 : 10; gameState.playerEspoir = Math.min(maxEspoir, gameState.playerEspoir + rollCountOnes); updateEspoirUI(); await triggerTutorial('seenAmbush', 'tuto_ambush'); }
    let countLockedTotal = gameState.diceStates.filter(s => s === 'locked').length; let isAlreadyDeroute = (countLockedTotal >= 2); let isAlreadyImpasse = !rolledIndices.some(idx => gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= 4);

    if (!isReevaluation) {
        if (rollCountTens >= 3) {
            rolledIndices.forEach(idx => { if(gameState.diceValues[idx] >= 4) { gameState.diceStates[idx] = 'kept'; document.getElementById(`wrap-${idx}`).classList.add('wrap-kept'); } }); recalculateScore(); let gained = gameState.turnScore; gameState.playerScore += gained; updateGlobalUI(); playerProfile.stats.totalLeagues += gained; saveProfile(); addXP(10);
            let currentSeuil = (gameState.currentModifier === 'brouillard') ? 8 : SEUIL_HAINE; if (gained >= currentSeuil) { gameState.enemyHate = Math.min(10, gameState.enemyHate + 1); updateHaineUI(); }
            if(!playerProfile.achievements.maitreFondcombe) { playerProfile.achievements.maitreFondcombe = true; saveProfile(); }
            let actionCallback = (gameState.playerScore >= gameState.targetScore) ? () => { resolveRoundWinner('hero'); } : () => { switchTurn(true); }; showEventScreen(t('ev_pas_title'), t('ev_pas_msg', {val: gained}), t('ev_pas_btn'), actionCallback, "var(--gold)"); return; 
        }
        if (rollCountOnes >= 3) { audioManager.playSFX('audio/hit.mp3', 0.25); gameState.playerEspoir = 0; updateEspoirUI(); showEventScreen(t('ev_gouffre_title'), t('ev_gouffre_msg'), t('ev_gouffre_btn'), () => { handleDeroute('hero'); }, "var(--blood)"); return; }

        let activeAI = gameState.currentEnemyId; 
        if (activeAI === 'letranger') { activeAI = ['brag', 'zamin', 'kael'][Math.floor(Math.random() * 3)]; } 
        let sabotageCost = { brag: 4, zamin: 3, kael: 5 }[activeAI] || 4;
        
        if (!isAlreadyDeroute && !isAlreadyImpasse && gameState.activePlayer === 'hero') {
            let availableIndices = rolledIndices.filter(idx => gameState.diceStates[idx] === 'idle'); 
            let targetIdx = -1; 
            let lockedOnes = gameState.diceStates.filter(s => s === 'locked').length; 
            let projectedScore = gameState.playerScore + gameState.turnScore;
            let tens = availableIndices.filter(idx => gameState.diceValues[idx] === 6); 
            let foursAndFives = availableIndices.filter(idx => gameState.diceValues[idx] === 4 || gameState.diceValues[idx] === 5).sort((a,b) => gameState.diceValues[b] - gameState.diceValues[a]); 
            let allScoring = availableIndices.filter(idx => gameState.diceValues[idx] >= 4).sort((a,b) => gameState.diceValues[b] - gameState.diceValues[a]); 
            let neutrals = availableIndices.filter(idx => gameState.diceValues[idx] === 2 || gameState.diceValues[idx] === 3);
            
            let isEmergency = (projectedScore >= gameState.targetScore - 15);
            let isAcharnement = false;

            // --- SABOTAGE CLASSIQUE ---
            if (gameState.enemyHate >= sabotageCost) {
                if (isEmergency && allScoring.length > 0) { targetIdx = allScoring[0]; } 
                else if (gameState.enemyHate >= 8 && allScoring.length > 0) { targetIdx = allScoring[0]; } 
                else if (activeAI === 'kael') { if (lockedOnes === 1 && availableIndices.length > 0) { availableIndices.sort((a,b) => gameState.diceValues[b] - gameState.diceValues[a]); targetIdx = availableIndices[0]; } else if (tens.length > 0) { targetIdx = tens[0]; } else if (allScoring.length > 0) { targetIdx = allScoring[0]; } } 
                else if (activeAI === 'brag') { if (foursAndFives.length > 0) { targetIdx = foursAndFives[0]; } else if (tens.length > 0 && neutrals.length === 0) { targetIdx = tens[0]; } } 
                else if (activeAI === 'zamin') { if (allScoring.length === 1 && availableIndices.length <= 4) { targetIdx = allScoring[0]; } else if (neutrals.length > 0) { targetIdx = neutrals[0]; } else if (allScoring.length > 0) { allScoring.sort((a,b) => gameState.diceValues[a] - gameState.diceValues[b]); targetIdx = allScoring[0]; } }
            
            // --- RÈGLE DE L'ACHARNEMENT ---
            } else if (gameState.enemyHate === 0 && tens.length > 0 && gameState.enemyScore <= gameState.playerScore) {
                // ÉTAPE 1 : Conditions de Déclenchement
                if (!(gameState.enemyScore < 15 && gameState.enemyLives === 1)) { // Anti-Suicide
                    // ÉTAPE 2 : La Décision (60% de chances)
                    if (Math.random() < 0.60) { 
                        targetIdx = tens[0]; 
                        isAcharnement = true;
                    }
                }
            }

            if (targetIdx !== -1) {
                if (isAcharnement) {
                    // ÉTAPE 3 : Le Jet de Risque
                    gameState.acharnementAttempts = (gameState.acharnementAttempts || 0) + 1;
                    let failChance = Math.min(gameState.acharnementAttempts * 25, 90); 
                    let roll = Math.random() * 100;

                    updateStatus(t('status_acharnement_try'), "var(--blood)");
                    audioManager.playSFX('audio/shadow.mp3', 0.2);
                    await new Promise(r => setTimeout(r, 1500));

                    if (roll < failChance) {
                        // ÉTAPE 4 : Résolution - ÉCHEC
                        if (gameState.enemyScore >= 15) {
                            gameState.enemyScore -= 15;
                            updateStatus(t('status_acharnement_fail_score'), "var(--gold)");
                            updateGlobalUI();
                        } else {
                            gameState.enemyLives--;
                            updateLivesUI();
                            updateStatus(t('status_acharnement_fail_life'), "var(--gold)");
                            if (gameState.enemyLives <= 0) { setTimeout(() => { resolveRoundWinner('hero'); }, 2000); return; } 
                        }
                        await new Promise(r => setTimeout(r, 2000));
                        targetIdx = -1; 
                    } else {
                        // ÉTAPE 4 : Résolution - SUCCÈS
                        updateStatus(t('status_acharnement_success'), "var(--blood)");
                        await new Promise(r => setTimeout(r, 1500));
                        activeAI = 'kael'; // Force Kael pour corrompre le 6
                    }
                } else {
                    // Sabotage classique
                    gameState.enemyHate -= sabotageCost; updateHaineUI(); gameState.matchStats.enemyAttackedAfterMaxHate = true;
                }

                if (targetIdx !== -1) {
                    let countered = false;
                if (gameState.playerEspoir >= 3 && !gameState.hasUsedEspoirThisTurn) {
                    let askText = ""; let targetVal = gameState.diceValues[targetIdx];
                    if (gameState.currentEnemyId === 'letranger') askText = t('ask_sabotage_letranger', {val: targetVal}); else if (activeAI === 'kael') askText = t('ask_sabotage_kael', {val: targetVal}); else if (activeAI === 'brag') askText = t('ask_sabotage_brag', {val: targetVal}); else if (activeAI === 'zamin') askText = t('ask_sabotage_zamin', {val: targetVal}); else askText = t('status_elbereth_ask'); 
                    updateStatus(askText, "var(--blood)"); document.getElementById(`wrap-${targetIdx}`).classList.add('pulse-danger'); audioManager.playSFX('audio/shadow.mp3', 0.1);
                    countered = await new Promise(resolve => {
                        let controlsHTML = `<button data-choice="elbereth" style="background: var(--gold); color: #000; font-weight: bold; border-color: var(--gold); box-shadow: 0 0 15px var(--gold);">${t('btn_elbereth')}</button><button data-choice="suffer">${t('btn_ignore')}</button>`;
                        const tc = document.getElementById('turn-controls'); tc.innerHTML = controlsHTML;
                        tc.querySelectorAll('button').forEach(btn => { btn.onclick = () => { tc.innerHTML = ''; document.getElementById(`wrap-${targetIdx}`).classList.remove('pulse-danger'); resolve(btn.getAttribute('data-choice') === 'elbereth'); }; });
                    });
                }
                if (countered) {
                    gameState.playerEspoir = 0; gameState.hasUsedEspoirThisTurn = true; gameState.matchStats.defendsUsed++; updateEspoirUI(); audioManager.playSFX('audio/dice.mp3', 0.2); updateStatus(t('status_elbereth_success'), "var(--gold)");
                    if(activeAI === 'kael') gameState.matchStats.elberethVsKaelAndWon = true; 
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    if (gameState.currentEnemyId === 'letranger') { updateStatus(t('status_sabotage_letranger'), "var(--blood)"); await new Promise(r => setTimeout(r, 1200)); } else if (activeAI === 'kael') { updateStatus(t('status_sabotage_kael'), "var(--blood)"); await new Promise(r => setTimeout(r, 1200)); } else if (activeAI === 'brag') { updateStatus(t('status_sabotage_brag'), "var(--blood)"); await new Promise(r => setTimeout(r, 1200)); } else if (activeAI === 'zamin') { updateStatus(t('status_sabotage_zamin'), "var(--enemy-color)"); await new Promise(r => setTimeout(r, 1200)); }
                    if (activeAI === 'kael') { gameState.diceValues[targetIdx] = 1; gameState.diceStates[targetIdx] = 'locked'; document.getElementById(`val-${targetIdx}`).innerText = "1"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${targetIdx}`).className = `die die-danger ${skin}`; document.getElementById(`wrap-${targetIdx}`).classList.add('pulse-danger'); updateStatus(t('status_sabotage_kael_res'), "var(--blood)"); } 
                    else if (activeAI === 'brag') { gameState.diceValues[targetIdx] = 0; gameState.diceStates[targetIdx] = 'sacrificed'; document.getElementById(`val-${targetIdx}`).innerText = "X"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${targetIdx}`).className = `die die-sacrificed ${skin}`; document.getElementById(`wrap-${targetIdx}`).classList.remove('wrap-kept'); updateStatus(t('status_sabotage_brag_res'), "var(--blood)"); } 
                    else if (activeAI === 'zamin') { gameState.diceStates[targetIdx] = 'sacrificed'; document.getElementById(`val-${targetIdx}`).innerText = "X"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${targetIdx}`).className = `die die-sacrificed ${skin}`; updateStatus(t('status_sabotage_zamin_res'), "var(--enemy-color)"); }
                    updateDialogue(gameState.currentEnemyId, 'hope_hate', 'ui-enemy-dialogue'); await triggerTutorial('seenHate', 'tuto_hate'); await new Promise(r => setTimeout(r, 1200));
                }
            }
        }
    }
    }

    countLockedTotal = gameState.diceStates.filter(s => s === 'locked').length; let hasScoringDiceInThisRoll = rolledIndices.some(idx => gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= 4); let isDeroute = (countLockedTotal >= 2);
    if (isDeroute) { gameState.pendingDeroute = true; let hasTools = (gameState.playerEspoir >= 2 && !gameState.hasUsedEspoirThisTurn); updateStatus(t('status_deroute_imminent'), "var(--blood)"); let controlsHTML = ''; if (hasTools) controlsHTML += `<button onclick="hintPurify()" style="background: var(--gold); color: #000; border-color: var(--gold);">${t('btn_defend')}</button>`; controlsHTML += `<button onclick="acceptDeroute()">${t('btn_suffer')}</button>`; document.getElementById('turn-controls').innerHTML = controlsHTML; return; }
    
    gameState.pendingDeroute = false;
    if (!hasScoringDiceInThisRoll && rolledIndices.length > 0) {
        await triggerTutorial('seenImpasse', 'tuto_impasse');
        if(gameState.turnScore >= 20) gameState.matchStats.rerollWith20PlusAndImpasse = true;
        if (gameState.playerEspoir >= 3 && !gameState.hasUsedEspoirThisTurn) { 
            updateDialogue('dirhael', 'impasse', 'ui-hero-dialogue'); updateStatus(t('status_impasse_ask'), "var(--gold)"); 
            document.getElementById('turn-controls').innerHTML = `<button onclick="useBoussole()" style="background: var(--gold); color: #000;">${t('btn_compass')}</button><button onclick="declineBoussole()">${t('btn_accept_defeat')}</button>`; return; 
        } else { updateDialogue('dirhael', 'impasse', 'ui-hero-dialogue'); updateStatus(t('status_impasse_lost'), "var(--blood)"); document.getElementById('turn-controls').innerHTML = ''; setTimeout(switchTurn, 2500); return; }
    }
    resetTurnControls(); updateStatus(t('status_select_dice'), "var(--bone)");
}

function acceptDeroute() { gameState.pendingDeroute = false; document.getElementById('turn-controls').innerHTML = ''; handleDeroute('hero'); }
function hintPurify() { updateStatus(t('status_action_purify'), "var(--gold)"); }

async function toggleKeepDie(index) {
    if (gameState.isRolling || gameState.activePlayer !== 'hero') return; const val = gameState.diceValues[index]; const state = gameState.diceStates[index]; const wrapEl = document.getElementById(`wrap-${index}`);
    if (gameState.pendingDeroute && state !== 'locked') { updateStatus(t('status_urgency'), "var(--blood)"); return; }
    let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';

    if (state === 'locked') {
        if (gameState.playerEspoir >= 2 && !gameState.hasUsedEspoirThisTurn) {
            gameState.playerEspoir -= 2; gameState.hasUsedEspoirThisTurn = true; updateEspoirUI(); updateDialogue('dirhael', 'hope_hate', 'ui-hero-dialogue'); updateStatus(t('status_hope_used'), "var(--gold)"); document.getElementById('turn-controls').innerHTML = ''; 
            gameState.diceStates[index] = 'idle'; document.getElementById(`val-${index}`).innerText = "-"; document.getElementById(`die-${index}`).className = `die die-idle ${skin}`; document.getElementById(`wrap-${index}`).classList.remove('pulse-danger');
            
            playerProfile.stats.purifications++; 
            gameState.matchStats.purificationsThisMatch++; 
            playerProfile.stats.purifForContract = (playerProfile.stats.purifForContract || 0) + 1; 
            if(gameState.playerLives === 1) playerProfile.stats.routsSurvived++; 
            addXP(10); 
            saveProfile();
            gameState.matchStats.purifyUsedThisTurn = true;
            if(gameState.matchStats.shadowUsedThisTurn) gameState.matchStats.purifyAndShadowSameTurn = true;

            gameState.isRolling = true; await rollAnimation([index]); await new Promise(r => setTimeout(r, 800)); gameState.isRolling = false; await evaluateHeroRoll(gameState.currentHeroRolledIndices, true); return;
        } else { if (gameState.pendingDeroute) { updateStatus(t('status_deroute_forced'), "var(--blood)"); document.getElementById('turn-controls').innerHTML = `<button onclick="acceptDeroute()">${t('btn_suffer')}</button>`; } else { updateStatus(t('status_cannot_purify'), "var(--blood)"); } return; }
    }
    if (val >= 4 && state !== 'locked' && state !== 'sacrificed') {
        if (state === 'idle') { gameState.diceStates[index] = 'kept'; wrapEl.classList.add('wrap-kept'); gameState.hasKeptDieThisRoll = true; } else if (state === 'kept') { gameState.diceStates[index] = 'idle'; wrapEl.classList.remove('wrap-kept'); }
        let remainingLocked = gameState.diceStates.filter(s => s === 'locked').length; recalculateScore(); if (remainingLocked >= 2) { document.getElementById('btn-roll').disabled = true; document.getElementById('btn-stop').disabled = true; }
    }
}

function resetTurnControls() { document.getElementById('turn-controls').innerHTML = `<button id="btn-roll" onclick="playHeroTurn()">${t('ui_btn_roll')}</button><button id="btn-stop" onclick="initiateCamp()" disabled>${t('ui_btn_stop')}</button>`; recalculateScore(); }
function declineBoussole() { document.getElementById('turn-controls').innerHTML = ''; updateStatus(t('status_impasse_accepted'), "var(--blood)"); updateDialogue('dirhael', 'failure', 'ui-hero-dialogue'); gameState.matchStats.acceptedImpasseAndWon = true; setTimeout(switchTurn, 2500); }
function useBoussole() { gameState.playerEspoir -= 3; gameState.hasUsedEspoirThisTurn = true; updateEspoirUI(); gameState.matchStats.compassUsedThisMatch++; resetTurnControls(); updateDialogue('dirhael', 'hope_hate', 'ui-hero-dialogue'); updateStatus(t('status_compass_used'), "var(--gold)"); setTimeout(() => { playHeroTurn(); }, 1000); }

function initiateCamp() {
    if (gameState.activePlayer !== 'hero') return; 
    const btnRoll = document.getElementById('btn-roll'); const btnStop = document.getElementById('btn-stop'); if (btnRoll) btnRoll.disabled = true; if (btnStop) btnStop.disabled = true;
    let keptSixes = gameState.diceStates.reduce((acc, state, idx) => { if (state === 'kept' && gameState.diceValues[idx] === 6) acc.push(idx); return acc; }, []);
    if (keptSixes.length > 0 && gameState.playerEspoir <= 8) { updateStatus(t('status_camp_choice'), "var(--gold)"); document.getElementById('turn-controls').innerHTML = `<button onclick="executeCampSacrifice(${keptSixes[0]})" style="border-color: var(--gold); color: var(--gold);">${t('btn_camp_sacrifice')}</button><button onclick="executeCampNormal()">${t('btn_camp_normal')}</button>`; } else { bankScore(); }
}

function executeCampNormal() { document.getElementById('turn-controls').innerHTML = ''; bankScore(); }
function executeCampSacrifice(idx) {
    document.getElementById('turn-controls').innerHTML = ''; gameState.diceStates[idx] = 'sacrificed'; gameState.diceValues[idx] = 0; document.getElementById(`wrap-${idx}`).classList.remove('wrap-kept'); document.getElementById(`val-${idx}`).innerText = "X"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${idx}`).className = `die die-sacrificed ${skin}`;
    let maxEspoir = (gameState.currentModifier === 'nuit') ? 5 : 10; let gainEspoir = (gameState.currentModifier === 'aube') ? 3 : 2;
    gameState.playerEspoir = Math.min(maxEspoir, gameState.playerEspoir + gainEspoir); gameState.matchStats.sacrificedSix = true; updateEspoirUI(); recalculateScore(); playerProfile.eclatsOmbre += 1; addXP(10); setTimeout(() => { bankScore(); }, 800); 
}

// ==========================================
// 6. TOUR DE L'IA
// ==========================================
async function playEnemyTurn() { 
    if (gameState.activePlayer !== 'enemy') return; 
    const modBanner = document.getElementById('ui-modifier-banner'); const smallIcon = document.getElementById('persistent-mod-icon');
    if (modBanner && modBanner.style.display !== 'none') { modBanner.style.display = 'none'; if (smallIcon) smallIcon.style.display = 'block'; }
    gameState.isRolling = true; gameState.hasKeptDieThisRoll = false; updateStatus(t('status_rolling'), "var(--enemy-color)"); 
    const diceToRoll = []; for(let i=0; i<5; i++) { if (gameState.diceStates[i] === 'idle') diceToRoll.push(i); } 
    await rollAnimation(diceToRoll); await new Promise(r => setTimeout(r, 800)); evaluateEnemyRoll(diceToRoll); gameState.isRolling = false; 
}

function evaluateEnemyRoll(rolledIndices) {
    let rollCountTens = rolledIndices.filter(idx => gameState.diceValues[idx] === 6).length; let rollCountOnes = rolledIndices.filter(idx => gameState.diceValues[idx] === 1).length;

    if (rollCountTens >= 3) { rolledIndices.forEach(idx => { if(gameState.diceValues[idx] >= 4) { gameState.diceStates[idx] = 'kept'; document.getElementById(`wrap-${idx}`).classList.add('wrap-kept'); } }); recalculateScore(); let gained = gameState.turnScore; gameState.enemyScore += gained; updateGlobalUI(); let actionCallback = (gameState.enemyScore >= gameState.targetScore) ? () => { resolveRoundWinner('enemy'); } : () => { switchTurn(true); }; showEventScreen(t('ev_elan_title'), t('ev_elan_msg', {val: gained}), t('ev_elan_btn'), actionCallback, "var(--corruption)"); return; }
    if (rollCountOnes >= 3) { audioManager.playSFX('audio/hit.mp3', 0.25); gameState.enemyHate = 0; updateHaineUI(); gameState.matchStats.enemyMasterfulFailure = true; showEventScreen(t('ev_malediction_title'), t('ev_malediction_msg'), t('ev_malediction_btn'), () => { handleDeroute('enemy'); }, "var(--gold)"); return; }
    
    let threshold = (gameState.enemyScore >= 60) ? 4 : 5; let targetIdx = -1; let maxVal = -1; rolledIndices.forEach(idx => { if (gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= threshold) { if (gameState.diceValues[idx] > maxVal) { maxVal = gameState.diceValues[idx]; targetIdx = idx; } } });
    if (targetIdx !== -1 && maxVal >= 5) { gameState.currentEnemyRolledIndices = rolledIndices; gameState.currentEnemyTargetIdx = targetIdx; document.getElementById(`die-${targetIdx}`).style.boxShadow = "0 0 25px var(--corruption)"; let btnText = maxVal === 6 ? t('btn_corrupt') : t('btn_devour'); let statusText = maxVal === 6 ? t('status_shadow_6') : t('status_shadow_other', {val: maxVal}); updateStatus(statusText, "var(--corruption)"); document.getElementById('turn-controls').innerHTML = `<button onclick="corruptEnemyDie()" style="background: var(--corruption); color: #fff; border-color: var(--corruption);">${btnText}</button><button onclick="ignoreEnemyDie()" style="border-color: #555; color: #888;">${t('btn_ignore')}</button>`; return; }
    resumeEnemyRoll(rolledIndices);
}

async function corruptEnemyDie() {
    let idx = gameState.currentEnemyTargetIdx; let val = gameState.diceValues[idx]; audioManager.playSFX('audio/shadow.mp3', 0.2); gameState.playerShadow++; updateShadowUI();
    playerProfile.stats.shadowsUsed++; gameState.matchStats.shadowsUsedThisRound++; gameState.matchStats.shadowsUsedThisMatch++; addXP(5); saveProfile();
    let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';
    
    gameState.matchStats.shadowUsedThisTurn = true;
    if(gameState.matchStats.purifyUsedThisTurn) gameState.matchStats.purifyAndShadowSameTurn = true;
    if(gameState.matchStats.totalTurnsThisMatch <= 2) gameState.matchStats.firstTurnCorrupt = true;
    
    if (val === 6) { gameState.diceValues[idx] = 1; gameState.diceStates[idx] = 'locked'; document.getElementById(`val-${idx}`).innerText = "1"; document.getElementById(`die-${idx}`).className = `die die-danger ${skin}`; document.getElementById(`wrap-${idx}`).classList.add('pulse-danger'); gameState.matchStats.corruptedSix = true; updateStatus(t('status_shadow_corrupt'), "var(--corruption)"); } 
    else { gameState.diceValues[idx] = 0; gameState.diceStates[idx] = 'sacrificed'; document.getElementById(`val-${idx}`).innerText = "X"; document.getElementById(`die-${idx}`).className = `die die-sacrificed ${skin}`; gameState.matchStats.devouredAdvance = true; updateStatus(t('status_shadow_devour', {val: val}), "var(--corruption)"); }
    document.getElementById(`die-${idx}`).style.boxShadow = ""; updateDialogue('dirhael', 'shadow', 'ui-hero-dialogue'); document.getElementById('turn-controls').innerHTML = ''; 
    await triggerTutorial('seenShadow', 'tuto_shadow');

    if (gameState.playerShadow >= 4) { let deathChance = Math.min((gameState.playerShadow - 3) * 25, 90); let roll = Math.random() * 100; if (roll < deathChance) { if(deathChance >= 90 && !playerProfile.achievements.maledictionAnneau) { playerProfile.achievements.maledictionAnneau = true; saveProfile(); } setTimeout(() => { showEndScreen(t('end_shadow_title'), t('end_shadow_msg', {chance: deathChance}), t('end_shadow_btn'), () => { exitDuel(); }, "var(--blood)"); }, 1500); return; } else { playerProfile.stats.survivedDeathRoll = true; setTimeout(() => { updateStatus(t('status_shadow_survive', {chance: deathChance}), "var(--blood)"); setTimeout(() => { resumeEnemyRoll(gameState.currentEnemyRolledIndices); }, 2000); }, 1500); return; } } setTimeout(() => { resumeEnemyRoll(gameState.currentEnemyRolledIndices); }, 1500);
}

function ignoreEnemyDie() { document.getElementById(`die-${gameState.currentEnemyTargetIdx}`).style.boxShadow = ""; document.getElementById('turn-controls').innerHTML = ''; resumeEnemyRoll(gameState.currentEnemyRolledIndices); }

function resumeEnemyRoll(rolledIndices) {
    let countLockedTotal = gameState.diceStates.filter(s => s === 'locked').length; let hasScoringDiceInThisRoll = rolledIndices.some(idx => gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= 4); let isDeroute = (countLockedTotal >= 2);
    if (isDeroute) { let tenIndex = gameState.diceValues.findIndex((v, i) => v === 6 && (gameState.diceStates[i] === 'idle' || gameState.diceStates[i] === 'kept')); if (tenIndex !== -1) { let oneIndex = gameState.diceStates.findIndex(s => s === 'locked'); gameState.diceStates[tenIndex] = 'sacrificed'; gameState.diceValues[tenIndex] = 0; gameState.diceStates[oneIndex] = 'idle'; gameState.diceValues[oneIndex] = 0; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`val-${tenIndex}`).innerText = "X"; document.getElementById(`die-${tenIndex}`).className = `die die-sacrificed ${skin}`; document.getElementById(`wrap-${tenIndex}`).classList.remove('wrap-kept'); document.getElementById(`val-${oneIndex}`).innerText = "-"; document.getElementById(`die-${oneIndex}`).className = `die die-idle ${skin}`; document.getElementById(`wrap-${oneIndex}`).classList.remove('pulse-danger'); updateDialogue(gameState.currentEnemyId, 'purify', 'ui-enemy-dialogue'); updateStatus(t('status_enemy_purify_6'), "var(--enemy-color)"); setTimeout(() => { resumeEnemyRoll(rolledIndices); }, 1500); return; } handleDeroute('enemy'); return; }
    if (!hasScoringDiceInThisRoll && rolledIndices.length > 0) { updateDialogue(gameState.currentEnemyId, 'impasse', 'ui-enemy-dialogue'); updateStatus(t('status_enemy_impasse'), "var(--gold)"); setTimeout(switchTurn, 2500); return; } setTimeout(processEnemyDecision, 1000);
}

function processEnemyDecision() {
    for (let i = 0; i < 5; i++) { if (gameState.diceValues[i] >= 4 && gameState.diceStates[i] === 'idle') { gameState.diceStates[i] = 'kept'; gameState.hasKeptDieThisRoll = true; document.getElementById(`wrap-${i}`).classList.add('wrap-kept'); } } recalculateScore();
    setTimeout(() => { 
        let idleCount = gameState.diceStates.filter(s => s === 'idle').length; 
        let shouldStop = false; 
        let activeAI = gameState.currentEnemyId; 
        let risk = (activeAI === 'letranger') ? ['prudent', 'agressif', 'kamikaze'][Math.floor(Math.random() * 3)] : gameState.enemyRiskProfile; 
        
        if (idleCount === 0) { 
            shouldStop = true; 
        } else { 
            let gap = gameState.playerScore - gameState.enemyScore; 
            let baseTargetScore = 15; 
            let minIdleToStop = 1; 
            switch(risk) { 
                case 'brag': case 'agressif': baseTargetScore = 18; minIdleToStop = 1; break; 
                case 'zamin': case 'prudent': baseTargetScore = 14; minIdleToStop = 2; break; 
                case 'kael': baseTargetScore = 16; minIdleToStop = 1; break; 
                case 'kamikaze': baseTargetScore = 25; minIdleToStop = 0; break; 
            } 
            let dynamicTargetScore = baseTargetScore + Math.floor(gap * 0.3); 
            
            // LA FAMEUSE RÈGLE DU DÉSESPOIR : Le joueur est à 15 Lieues (ou moins) de la victoire !
            let isDesperate = (gameState.playerScore >= gameState.targetScore - 15);

            if (gameState.enemyScore + gameState.turnScore >= gameState.targetScore) { 
                shouldStop = true; 
            } else if (isDesperate) {
                shouldStop = false; // MODE KAMIKAZE
            } else if (gameState.turnScore >= dynamicTargetScore || idleCount <= minIdleToStop) { 
                if (risk === 'kael' && gap > 0 && gameState.playerScore >= 60 && gameState.turnScore < dynamicTargetScore) { shouldStop = false; } 
                else { shouldStop = true; } 
            } 
        } 
        if (shouldStop && gameState.turnScore > 0) { bankScore(); } else { playEnemyTurn(); } 
    }, 1500);
}

// ==========================================
// 7. GESTION SCORE & VIES
// ==========================================
function recalculateScore() {
    let tempScore = 0; for (let i = 0; i < 5; i++) { if (gameState.diceStates[i] === 'kept') { if (gameState.diceValues[i] === 6) tempScore += 10; else tempScore += gameState.diceValues[i]; } }
    gameState.turnScore = tempScore; document.getElementById('current-turn-score').innerHTML = `${tempScore} <span>${t('ui_leagues')}</span>`;
    if (gameState.activePlayer === 'hero') { if(!playerProfile.achievements.pariIsildur && tempScore >= 35) { playerProfile.achievements.pariIsildur = true; saveProfile(); } const btnRoll = document.getElementById('btn-roll'); const btnStop = document.getElementById('btn-stop'); if (btnRoll && btnStop) { btnStop.disabled = (tempScore === 0); let hasIdleDice = gameState.diceStates.includes('idle'); btnRoll.disabled = !(gameState.hasKeptDieThisRoll && hasIdleDice); } }
}

function handleDeroute(player) {
    audioManager.playSFX('audio/hit.mp3', 0.25);
    if (player === 'hero') {
        gameState.playerLives--; updateLivesUI(); updateStatus(t('status_deroute_hero'), "var(--blood)"); updateDialogue('dirhael', 'failure', 'ui-hero-dialogue');
        playerProfile.stats.deroutesTaken++; gameState.matchStats.deroutesThisMatch++; if(gameState.matchStats.turnsPlayedThisRound === 1) playerProfile.stats.firstTurnRouts++; gameState.heroRoutLastTurn = true; saveProfile();
        if (gameState.playerLives <= 0) { playerProfile.stats.currentWinStreak = 0; saveProfile(); setTimeout(() => { resolveRoundWinner('enemy'); }, 2000); return; }
    } else {
        gameState.enemyLives--; updateLivesUI(); updateStatus(t('status_deroute_enemy'), "var(--gold)"); updateDialogue(gameState.currentEnemyId, 'failure', 'ui-enemy-dialogue');
        if (gameState.enemyLives <= 0) { setTimeout(() => { resolveRoundWinner('hero'); }, 2000); return; }
    } setTimeout(switchTurn, 2500);
}

function bankScore() {
    document.getElementById('turn-controls').innerHTML = ''; 
    if (gameState.activePlayer === 'hero') { 
        gameState.playerScore += gameState.turnScore; updateDialogue('dirhael', 'camp', 'ui-hero-dialogue'); updateStatus(t('status_camp_hero'), "var(--gold)"); 
        playerProfile.stats.totalLeagues += gameState.turnScore; gameState.heroRoutLastTurn = false; 
        
        // C15 FIX: Le score exact de 80
        if (gameState.playerScore === 80) gameState.matchStats.exact80Round = true;

        if (gameState.turnScore > 0 && gameState.turnScore <= 15) gameState.matchStats.bankedUnder15 = true;
        if (gameState.turnScore > gameState.matchStats.highestTurnScoreThisMatch) gameState.matchStats.highestTurnScoreThisMatch = gameState.turnScore;
        
        let currentSeuil = (gameState.currentModifier === 'brouillard') ? 8 : SEUIL_HAINE;
        if (gameState.turnScore >= currentSeuil) { gameState.enemyHate = Math.min(10, gameState.enemyHate + 1); updateHaineUI(); }
        let xpGained = Math.floor(gameState.turnScore / 2); const diffMultiplier = { brag: 1.0, zamin: 1.5, letranger: 1.75, kael: 2.0 }; let mult = diffMultiplier[gameState.currentEnemyId] || 1.0; if (xpGained > 0) addXP(Math.floor(xpGained * mult)); saveProfile(); 
    } 
    else { gameState.enemyScore += gameState.turnScore; if(gameState.turnScore === 0) gameState.matchStats.enemyZeroPointRound = true; updateDialogue(gameState.currentEnemyId, 'camp', 'ui-enemy-dialogue'); updateStatus(t('status_camp_enemy'), "var(--enemy-color)"); }
    
    updateGlobalUI();
    if(gameState.playerScore >= gameState.targetScore) { if(!playerProfile.achievements.voieElfes && gameState.matchStats.deroutesThisMatch === 0) { playerProfile.achievements.voieElfes = true; saveProfile(); } setTimeout(() => { resolveRoundWinner('hero'); }, 1500); return; } 
    else if (gameState.enemyScore >= gameState.targetScore) { setTimeout(() => { resolveRoundWinner('enemy'); }, 1500); return; } 
    setTimeout(switchTurn, 1500);
}

function resolveRoundWinner(winner) {
    const diffMultiplier = { brag: 1.0, zamin: 1.5, letranger: 1.75, kael: 2.0 };
    let mult = diffMultiplier[gameState.currentEnemyId] || 1.0;
    let startLevel = playerProfile.level;

    if (winner === 'hero') {
        // C6 ZÂMIN FIX : Si l'ennemi finit la manche avec 0 point global
        if (gameState.enemyScore === 0) gameState.matchStats.enemyLostRoundWithZero = true;

        gameState.heroRounds++; updateGlobalUI(); addXP(Math.floor(15 * mult)); 
        if (gameState.heroRounds >= 2) { 
            playerProfile.stats.gamesWon++; 
            let eclatsEarned = Math.floor(10 * mult); playerProfile.eclatsOmbre += eclatsEarned; 
            let xpEarned = Math.floor(25 * mult); addXP(xpEarned); 
            
            playerProfile.stats.currentWinStreak++; playerProfile.stats.winsAgainst[gameState.currentEnemyId]++;
            if(gameState.playerLives === 1) playerProfile.stats.gamesWonWith1Life++;
            if(gameState.matchStats.firstRoundLost) playerProfile.achievements.sermentParjures = true;
            
            let completedContracts = evaluateContracts(true);
            let contractBonus = 0; let contractMsg = '';
            if (completedContracts.length > 0) {
                contractMsg = `<br><br><span style="color:var(--gold); font-family:'Oswald'; font-size:18px; border-bottom: 1px solid var(--gold);">📋 TRAQUES ACCOMPLIES :</span><br>`;
                completedContracts.forEach(c => { contractMsg += `<span style="color:#aaa; font-size:13px; font-style:italic; display:block; margin-top:5px;">- ${currentLang==='fr'?c.t_fr:c.t_en} (+${c.reward} ✦)</span>`; contractBonus += c.reward; });
            }

            saveProfile(); checkAchievements(); 
            
            let msg = `${t('end_vic_msg')}<br><br><span style="color:var(--gold); font-family:'Oswald'; font-size:22px;">${t('loot_vic_xp', {val: xpEarned})}</span><br><span style="color:var(--corruption); font-family:'Oswald'; font-size:22px;">${t('loot_vic_shards', {val: eclatsEarned + contractBonus})}</span>`;
            if (contractBonus > 0) msg += contractMsg;
            if (playerProfile.level > startLevel && playerProfile.level < MAX_LEVEL) { msg += `<br><br><span style="color:#2ecc71; font-family:'Oswald'; font-size:20px; display:block; animation: pulseDanger 1s infinite alternate;">${t('loot_lvl_up', {lvl: playerProfile.level})}</span>`; audioManager.playSFX('audio/dice.mp3', 0.3); }
            showEndScreen(t('end_vic_title'), msg, t('end_vic_btn'), () => { exitDuel(); }, "var(--gold)"); 
        } else { document.getElementById('reward-modal').style.display = 'flex'; }
    } else {
        gameState.enemyRounds++; updateGlobalUI();
        if(gameState.heroRounds === 0 && gameState.enemyRounds === 1) gameState.matchStats.firstRoundLost = true;
        if (gameState.enemyRounds >= 2) { 
            let eclatsConsolation = Math.floor(3 * mult); playerProfile.eclatsOmbre += eclatsConsolation; playerProfile.stats.currentWinStreak = 0; 
            
            let completedContracts = evaluateContracts(false);
            let contractBonus = 0; let contractMsg = '';
            if (completedContracts.length > 0) {
                contractMsg = `<br><br><span style="color:var(--gold); font-family:'Oswald'; font-size:18px; border-bottom: 1px solid var(--gold);">📋 TRAQUES ACCOMPLIES :</span><br>`;
                completedContracts.forEach(c => { contractMsg += `<span style="color:#aaa; font-size:13px; font-style:italic; display:block; margin-top:5px;">- ${currentLang==='fr'?c.t_fr:c.t_en} (+${c.reward} ✦)</span>`; contractBonus += c.reward; });
            }

            saveProfile(); checkAchievements(); 
            let msg = `${t('end_def_msg')}<br><br><span style="color:#555; font-family:'Oswald'; font-size:22px;">${t('loot_def_xp')}</span><br><span style="color:var(--corruption); font-family:'Oswald'; font-size:22px;">${t('loot_def_shards', {val: eclatsConsolation + contractBonus})}</span>`;
            if (contractBonus > 0) msg += contractMsg;
            
            showEndScreen(t('end_def_title'), msg, t('end_def_btn'), () => { exitDuel(); }, "var(--blood)"); 
        } else { showEndScreen(t('end_manche_lose_title'), t('end_manche_lose_msg'), t('end_manche_lose_btn'), () => { startNewRound(false, 'enemy'); }, "var(--blood)"); }
    }
}

function applyReward(choice) { 
    document.getElementById('reward-modal').style.display = 'none'; 
    if (choice === 'initiative') { 
        startNewRound(false, 'hero'); 
    } else if (choice === 'vie') { 
        startNewRound(false, 'enemy'); 
        gameState.playerScore = 15; 
        updateGlobalUI();
        let toastMsg = currentLang === 'fr' ? "Le Raccourci : +15 Lieues sécurisées !" : "Shortcut: +15 Leagues secured!";
        showToast(toastMsg, "success");
    } 
}
function showEndScreen(t1, msg, btxt, cb, col) { const m = document.getElementById('end-modal'); const c = m.querySelector('.end-content'); document.getElementById('end-title').innerText = t1; document.getElementById('end-title').style.color = col; c.style.borderColor = col; c.style.boxShadow = `0 0 50px ${col}`; document.getElementById('end-message').innerHTML = msg; const b = document.getElementById('end-btn'); b.innerText = btxt; b.style.color = col; b.style.borderColor = col; b.onclick = () => { m.style.display = 'none'; cb(); }; m.style.display = 'flex'; }
function showEventScreen(t1, msg, btxt, cb, col) { const m = document.getElementById('event-modal'); const c = m.querySelector('.event-content'); document.getElementById('event-title').innerText = t1; document.getElementById('event-title').style.color = col; c.style.borderColor = col; c.style.boxShadow = `0 0 50px ${col}`; document.getElementById('event-message').innerHTML = msg; const b = document.getElementById('event-btn'); b.innerText = btxt; b.style.color = col; b.style.borderColor = col; b.onclick = () => { m.style.display = 'none'; cb(); }; m.style.display = 'flex'; }
function showRules() { updateStaticUI(); document.getElementById('rules-modal').style.display = 'flex'; }
function hideRules() { document.getElementById('rules-modal').style.display = 'none'; if(document.getElementById('tavern-screen').style.display !== 'none') { audioManager.playBGM('tavern'); } }

function toggleSettings() { 
    const menu = document.getElementById('settings-menu');
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'flex';
    }
}

document.addEventListener('click', (e) => { 
    const menu = document.getElementById('settings-menu'); 
    const btn = document.getElementById('settings-btn'); 
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none'; 
    }
});

// ==========================================
// 8. HAUTS FAITS & ARSENAL
// ==========================================
const achievementsData = [
    { id: 'fardeauAnneau', t_fr: "Le Fardeau de l'Anneau", t_en: "The Burden of the Ring", d_fr: "Survivre 3 tours avec l'Ombre max.", d_en: "Survive 3 turns with max Shadow." }, { id: 'flammeUdun', t_fr: "La Flamme d'Udûn", t_en: "Flame of Udûn", d_fr: "Purifier avec 1 seule Vie.", d_en: "Purify with 1 Life." }, { id: 'heritageNumenor', t_fr: "L'Héritage de Númenor", t_en: "Legacy of Númenor", d_fr: "Gagner 80 Lieues en 2 tours.", d_en: "Win 80 Leagues in 2 turns." }, { id: 'sermentParjures', t_fr: "Serment des Parjures", t_en: "Oathbreakers", d_fr: "Gagner après avoir perdu la 1ère manche.", d_en: "Win after losing the 1st round." }, { id: 'maliceMorgoth', t_fr: "Malice de Morgoth", t_en: "Malice of Morgoth", d_fr: "Ombre x5 en un duel.", d_en: "Shadow x5 in one duel." }, { id: 'ruseSmaug', t_fr: "Ruse de Smaug", t_en: "Cunning of Smaug", d_fr: "Tuer Brag/Zâmin >60 points.", d_en: "Kill Brag/Zâmin >60 points." }, { id: 'enduranceDunedain', t_fr: "Endurance Dúnedain", t_en: "Dúnedain Endurance", d_fr: "Battre Kael sans Espoir.", d_en: "Beat Kael without Hope." }, { id: 'fuiteComte', t_fr: "Fuite de la Comté", t_en: "Flight from Shire", d_fr: "Déroute au 1er tour.", d_en: "Rout on turn 1." }, { id: 'colereValar', t_fr: "Colère des Valar", t_en: "Wrath of Valar", d_fr: "Gagner avec 3 Déroutes.", d_en: "Win with 3 Routs." }, { id: 'pariIsildur', t_fr: "Pari d'Isildur", t_en: "Isildur's Gamble", d_fr: "Marquer 35+ en un jet.", d_en: "Score 35+ in one roll." }, { id: 'voieElfes', t_fr: "Voie des Elfes", t_en: "Way of Elves", d_fr: "Manche sans Déroute.", d_en: "Round without Rout." }, { id: 'fleauOmbre', t_fr: "Fléau de l'Ombre", t_en: "Shadow Bane", d_fr: "Purifier 3 fois.", d_en: "Purify 3 times." }, { id: 'marcheurNuit', t_fr: "Marcheur de Nuit", t_en: "Night Walker", d_fr: "5 victoires d'affilée.", d_en: "5 wins in a row." }, { id: 'pillardGobelin', t_fr: "Pillard Gobelin", t_en: "Goblin Looter", d_fr: "Battre Brag à 0 score.", d_en: "Beat Brag at 0 score." }, { id: 'negociateurNain', t_fr: "Négociateur Nain", t_en: "Dwarven Negotiator", d_fr: "Battre Zâmin avec 1 Vie, <3 Espoirs.", d_en: "Beat Zâmin with 1 Life, <3 Hope." }, { id: 'tueurKael', t_fr: "Résistance", t_en: "Resistance", d_fr: "Vaincre Kael 5 fois.", d_en: "Defeat Kael 5 times." }, { id: 'enigmeObscurite', t_fr: "Énigme Obscurité", t_en: "Riddle in Dark", d_fr: "Vaincre L'Étranger 3 fois.", d_en: "Defeat Stranger 3 times." }, { id: 'maitreFondcombe', t_fr: "Maître Fondcombe", t_en: "Master of Rivendell", d_fr: "Succès Magistral (Trois 6).", d_en: "Masterful Success (Three 6s)." }, { id: 'maledictionAnneau', t_fr: "Malédiction Anneau", t_en: "Curse of Ring", d_fr: "Mourir de l'Ombre à 90%.", d_en: "Die from Shadow at 90%." }, { id: 'bravoureHobbit', t_fr: "Bravoure Hobbit", t_en: "Hobbit Bravery", d_fr: "Boussole x3 et gagner.", d_en: "Compass x3 and win." }, { id: 'heritierElendil', t_fr: "Héritier Elendil", t_en: "Heir of Elendil", d_fr: "Acheter objet >5000.", d_en: "Buy item >5000." }, { id: 'tueurBalrog', t_fr: "Tueur Balrog", t_en: "Balrog Slayer", d_fr: "Total 50 000 Lieues.", d_en: "Total 50k Leagues." }, { id: 'ombreMordor', t_fr: "Ombre Mordor", t_en: "Shadow of Mordor", d_fr: "Jouer 100 parties.", d_en: "Play 100 matches." }, { id: 'retourRoi', t_fr: "Retour du Roi", t_en: "Return of King", d_fr: "Atteindre Niv. 40.", d_en: "Reach Lvl 40." }, { id: 'seigneurOuest', t_fr: "Seigneur de l'Ouest", t_en: "Lord of the West", d_fr: "Atteindre Niv. 50.", d_en: "Reach Lvl 50." }
];

function checkAchievements() {
    let a = playerProfile.achievements; let s = playerProfile.stats; let ms = gameState.matchStats; let newlyUnlocked = false;
    if(!a.fardeauAnneau && ms.consecutiveShadowMaxTurns >= 3) { a.fardeauAnneau = true; unlockItem('titles', 'title_bearer'); newlyUnlocked = true; }
    if(!a.flammeUdun && s.routsSurvived >= 1) { a.flammeUdun = true; unlockItem('dice', 'moria'); newlyUnlocked = true; }
    if(!a.heritageNumenor && ms.turnsPlayedThisRound <= 2 && gameState.playerScore >= 80) { a.heritageNumenor = true; unlockItem('titles', 'title_bloodwest'); unlockItem('dice', 'numenor'); newlyUnlocked = true; }
    if(!a.maliceMorgoth && ms.shadowsUsedThisRound >= 5) { a.maliceMorgoth = true; newlyUnlocked = true; }
    if(!a.ruseSmaug && gameState.enemyScore >= 60 && gameState.enemyLives === 0 && (gameState.currentEnemyId==='brag'||gameState.currentEnemyId==='zamin')) { a.ruseSmaug = true; unlockItem('titles', 'title_thiefshadow'); newlyUnlocked = true; }
    if(!a.enduranceDunedain && ms.defendsUsed === 0 && (gameState.currentEnemyId==='kael'||gameState.currentEnemyId==='letranger') && gameState.heroRounds === 2) { a.enduranceDunedain = true; unlockItem('frames', 'star'); newlyUnlocked = true; }
    if(!a.fuiteComte && s.firstTurnRouts > 0) { a.fuiteComte = true; unlockItem('titles', 'title_hobbit'); newlyUnlocked = true; }
    if(!a.colereValar && ms.deroutesThisMatch >= 3 && gameState.heroRounds === 2) { a.colereValar = true; newlyUnlocked = true; }
    if(!a.fleauOmbre && ms.purificationsThisMatch >= 3) { a.fleauOmbre = true; newlyUnlocked = true; }
    if(!a.marcheurNuit && s.currentWinStreak >= 5) { a.marcheurNuit = true; newlyUnlocked = true; }
    if(!a.pillardGobelin && gameState.enemyScore === 0 && gameState.heroRounds === 2 && gameState.currentEnemyId === 'brag') { a.pillardGobelin = true; newlyUnlocked = true; }
    if(!a.negociateurNain && gameState.currentEnemyId === 'zamin' && gameState.heroRounds === 2 && gameState.playerLives === 1 && gameState.playerEspoir < 3) { a.negociateurNain = true; newlyUnlocked = true; }
    if(!a.bravoureHobbit && ms.compassUsedThisMatch >= 3 && gameState.heroRounds === 2) { a.bravoureHobbit = true; newlyUnlocked = true; }
    if(!a.tueurKael && s.winsAgainst.kael >= 5) { a.tueurKael = true; newlyUnlocked = true; }
    if(!a.enigmeObscurite && s.winsAgainst.letranger >= 3) { a.enigmeObscurite = true; newlyUnlocked = true; }
    if(!a.tueurBalrog && s.totalLeagues >= 50000) { a.tueurBalrog = true; newlyUnlocked = true; }
    if(!a.ombreMordor && s.gamesPlayed >= 100) { a.ombreMordor = true; newlyUnlocked = true; }
    if(!a.retourRoi && playerProfile.level >= 40) { a.retourRoi = true; newlyUnlocked = true; }
    if(!a.seigneurOuest && playerProfile.level >= 50) { a.seigneurOuest = true; newlyUnlocked = true; }

    if(playerProfile.level >= 5) unlockItem('dice', 'bone');
    if(playerProfile.level >= 10) { unlockItem('frames', 'iron'); unlockItem('titles', 'title_walker'); }
    if(playerProfile.level >= 15) unlockItem('dice', 'blood');
    if(playerProfile.level >= 20) { unlockItem('boards', 'bivouac'); unlockItem('titles', 'title_deathcheater'); }
    if(playerProfile.level >= 25) unlockItem('frames', 'gold');
    if(playerProfile.level >= 30) { unlockItem('dice', 'numenor'); unlockItem('titles', 'title_dunedain'); }
    if(playerProfile.level >= 35) unlockItem('frames', 'mist');
    if(playerProfile.level >= 40) unlockItem('boards', 'abyss');
    if(playerProfile.level >= 45) unlockItem('dice', 'void');
    if(playerProfile.level >= 50) { unlockItem('frames', 'crown'); unlockItem('titles', 'title_lordchance'); }
    if(newlyUnlocked) saveProfile();
}

function unlockItem(category, itemId) { if(!playerProfile.inventory[category].includes(itemId)) { playerProfile.inventory[category].push(itemId); } }
function openArsenal() { document.getElementById('arsenal-modal').style.display = 'flex'; switchArsenalTab('vestiaire'); }
function closeArsenal() { document.getElementById('arsenal-modal').style.display = 'none'; applyCosmetics(); }

const itemDict = {
    boards: { dark: {name_fr:'Taverne Sombre', name_en:'Dark Tavern', price:0}, wood: {name_fr:'Bois Précieux', name_en:'Precious Wood', price:150}, stone: {name_fr:'Pierre Froide', name_en:'Cold Stone', price:200}, runic: {name_fr:'Dalle Runique', name_en:'Runic Slab', price:300}, helm: {name_fr:'Fort-le-Cor', name_en:'Hornburg', price:500}, bivouac: {name_fr:'Bivouac', name_en:'Bivouac', price:0}, abyss: {name_fr:'Abysses', name_en:'Abyss', price:0}, citeblanche: {name_fr:'La Cité Blanche', name_en:'The White City', price:800}, terresbrulees: {name_fr:'Terres Brûlées', name_en:'Scorched Earth', price:800}, havre: {name_fr:'Havre de Paix', name_en:'Haven of Peace', price:1200}, moria: {name_fr:'Mines de la Moria', name_en:'Mines of Moria', price:1500}, lorien: {name_fr:'Forêt de Lórien', name_en:'Forest of Lórien', price:2000} },
    dice: { classic: {name_fr:'Classique', name_en:'Classic', price:0}, bone: {name_fr:'Os Sculptés', name_en:'Carved Bone', price:0}, blood: {name_fr:'Pierre de Sang', name_en:'Bloodstone', price:0}, void: {name_fr:'Dés du Vide', name_en:'Void Dice', price:0}, numenor: {name_fr:'Acier de l\'Ouest', name_en:'Steel of the West', price:0}, moria: {name_fr:'Cendres de Moria', name_en:'Ashes of Moria', price:0}, goblin: {name_fr:'Acier Gobelin', name_en:'Goblin Steel', price:300}, orc: {name_fr:'Orque Noir', name_en:'Black Orc', price:400}, amethyst: {name_fr:'Améthyste', name_en:'Amethyst', price:500}, forest: {name_fr:'Forêt Maudite', name_en:'Cursed Forest', price:500}, highelf: {name_fr:'Haut-Elfe', name_en:'High-Elf', price:750}, dwarf: {name_fr:'Saphir Nain', name_en:'Dwarven Sapphire', price:900}, evenstar: {name_fr:'Étoile du Soir', name_en:'Evenstar', price:1500}, arkenstone: {name_fr:'Cristal d\'Arkenstone', name_en:'Arkenstone Crystal', price:2000} },
    frames: { basic: {name_fr:'Classique', name_en:'Classic', price:0}, iron: {name_fr:'Fer Forgé', name_en:'Wrought Iron', price:0}, gold: {name_fr:'Or Massif', name_en:'Solid Gold', price:0}, mist: {name_fr:'Aura Spectrale', name_en:'Spectral Aura', price:0}, star: {name_fr:'Étoile du Nord', name_en:'North Star', price:0}, crown: {name_fr:'Couronne Royale', name_en:'Royal Crown', price:0}, thorns: {name_fr:'Ronces Maudites', name_en:'Cursed Thorns', price:600}, ent: {name_fr:'Bois d\'Ent', name_en:'Ent Wood', price:800}, shadow: {name_fr:'Ombre Rampante', name_en:'Creeping Shadow', price:1000}, angelic: {name_fr:'Aura Angélique', name_en:'Angelic Aura', price:1500}, ice: {name_fr:'Glace de Forodwaith', name_en:'Ice of Forodwaith', price:2000}, darkflame: {name_fr:'Flamme Sombre', name_en:'Dark Flame', price:2500}, eye: {name_fr:'L\'Œil', name_en:'The Eye', price:5000} }
};

const premiumTitles = { "title_reckless": 200, "title_orcblight": 400, "title_kingnocrown": 1000, "title_eternal": 2500, "title_lightbearer": 5000 };

function switchArsenalTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); const evtBtn = document.querySelector(`.tab-btn[onclick="switchArsenalTab('${tabName}')"]`); if(evtBtn) evtBtn.classList.add('active');
    const area = document.getElementById('arsenal-content-area'); area.innerHTML = '';
    if (tabName === 'stats') {
        area.innerHTML = `<div class="stats-list"><p>${t('stat_lvl')} <span>${playerProfile.level}</span></p><p>${t('stat_xp')} <span>${(playerProfile.level >= MAX_LEVEL) ? "MAX" : Math.floor(playerProfile.xp)}</span></p><p>${t('stat_leagues')} <span>${playerProfile.stats.totalLeagues}</span></p><p>${t('stat_played')} <span>${playerProfile.stats.gamesPlayed}</span></p><p>${t('stat_won')} <span>${playerProfile.stats.gamesWon}</span></p><p>${t('stat_shadows')} <span>${playerProfile.stats.shadowsUsed}</span></p><p>${t('stat_purif')} <span>${playerProfile.stats.purifications}</span></p><p>${t('stat_routs')} <span>${playerProfile.stats.deroutesTaken}</span></p><p style="font-size:14px; color:#888;">${t('stat_streak')} <span style="color:#5dade2;">${playerProfile.stats.currentWinStreak}</span></p><p style="font-size:14px; color:#888;">${t('stat_1life')} <span>${playerProfile.stats.gamesWonWith1Life}</span></p></div>`;
    } else if (tabName === 'achievements') {
        let html = ''; achievementsData.forEach(a => { let u = playerProfile.achievements[a.id]; let achTitle = currentLang === 'fr' ? a.t_fr : a.t_en; let achDesc = currentLang === 'fr' ? a.d_fr : a.d_en; html += `<div class="achiev-item ${u ? 'unlocked' : ''}"><h3>${achTitle} ${u ? '✔️' : '🔒'}</h3><p>${achDesc}</p></div>`; }); area.innerHTML = html;
    } else if (tabName === 'contrats') {
        refreshContracts(); 
        
        let html = `<div style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 6px; border: 1px solid #333; margin-bottom: 15px; font-size: 13px; color: #ccc; line-height: 1.4; font-style: italic;">${t('ui_contract_desc')}</div>`;
        
        let gamesReq = 3;
        let played = playerProfile.stats.gamesSinceShuffle || 0;
        let canShuffle = played >= gamesReq;
        let remain = Math.max(0, gamesReq - played);
        let btnText = canShuffle ? t('ui_btn_shuffle_ready') : t('ui_btn_shuffle_wait', {val: remain});
        let btnStyle = canShuffle ? "border-color: var(--gold); color: var(--gold); background: #111; padding: 10px; width: 100%; border-radius: 4px; font-family:'Oswald', sans-serif; text-transform: uppercase;" : "border-color: #444; color: #666; background: #111; padding: 10px; width: 100%; border-radius: 4px; font-family:'Oswald', sans-serif; text-transform: uppercase; cursor: not-allowed;";
        
        html += `<div style="text-align: center; margin-bottom: 20px;"><button onclick="shuffleContracts()" style="${btnStyle}" ${!canShuffle ? 'disabled' : ''}>🔄 ${btnText}</button></div>`;
        
        html += `<div class="arsenal-grid">`;
        playerProfile.activeContracts.forEach(cId => {
            let contract = contractsPool.find(c => c.id === cId);
            if (contract) { 
                let cTitle = currentLang === 'fr' ? contract.t_fr : contract.t_en; 
                let cDesc = currentLang === 'fr' ? contract.d_fr : contract.d_en;
                html += `
                <div class="arsenal-item" style="border-color:#555; background:rgba(0,0,0,0.4); text-align: left; padding: 15px;">
                    <h3 style="color:var(--gold); margin-top:0; font-size: 16px;">${cTitle}</h3>
                    <p style="font-size:12px; color:#ccc; min-height: 40px; margin: 10px 0;">${cDesc}</p>
                    <div style="font-family:'Oswald', sans-serif; font-size:16px; color:var(--corruption); border-top: 1px solid #333; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${t('ui_contract_reward')}</span>
                        <span style="font-weight: bold;">${contract.reward} ✦</span>
                    </div>
                </div>`; 
            }
        }); 
        html += `</div>`; 

        if (playerProfile.completedContracts && playerProfile.completedContracts.length > 0) {
            let titleText = currentLang === 'fr' ? `Traques Accomplies (${playerProfile.completedContracts.length}/50)` : `Completed Hunts (${playerProfile.completedContracts.length}/50)`;
            html += `<h3 style="color:var(--gold); border-bottom:1px solid #333; padding-bottom:5px; margin-top:30px;">${titleText}</h3>`;
            html += `<div class="arsenal-grid" style="opacity: 0.5;">`; 
            
            playerProfile.completedContracts.forEach(cId => {
                let contract = contractsPool.find(c => c.id === cId);
                if (contract) { 
                    let cTitle = currentLang === 'fr' ? contract.t_fr : contract.t_en; 
                    let cDesc = currentLang === 'fr' ? contract.d_fr : contract.d_en;
                    html += `
                    <div class="arsenal-item" style="border-color:#333; background:rgba(0,0,0,0.2); text-align: left; padding: 15px;">
                        <h3 style="color:#aaa; margin-top:0; font-size: 16px;">✔️ ${cTitle}</h3>
                        <p style="font-size:12px; color:#777; min-height: 40px; margin: 10px 0;">${cDesc}</p>
                    </div>`; 
                }
            });
            html += `</div>`;
        }

        area.innerHTML = html;
    } else if (tabName === 'vestiaire') {
        const renderEq = (title, key, dict) => { let equipKey = key; if (key === 'boards') equipKey = 'board'; if (key === 'frames') equipKey = 'frame'; let html = `<h3 style="color:var(--gold); border-bottom:1px solid #333; padding-bottom:5px;">${title}</h3><div class="arsenal-grid">`; for(let item in dict) { let isMarketItem = dict[item].price > 0; let itemName = currentLang === 'fr' ? dict[item].name_fr : dict[item].name_en; if(playerProfile.inventory[key].includes(item)) { let isEq = playerProfile.equipped[equipKey] === item; html += `<div class="arsenal-item ${isEq ? 'equipped' : ''}"><h3>${itemName}</h3><button onclick="equipItem('${equipKey}', '${item}')">${isEq ? t('ui_btn_equipped') : t('ui_btn_equip')}</button></div>`; } else if (!isMarketItem) { html += `<div class="arsenal-item" style="opacity:0.4; border-color:#222; background: transparent;"><h3 style="color:#555;">???</h3><p style="margin-top:5px;">${t('ui_locked_lvl')}</p></div>`; } } html += `</div>`; return html; };
        let html = renderEq(t('ui_ars_boards'), 'boards', itemDict.boards) + renderEq(t('ui_ars_dice'), 'dice', itemDict.dice) + renderEq(t('ui_ars_frames'), 'frames', itemDict.frames);
        const titleOrigins = { title_ranger: { fr: "Titre de base", en: "Default Title" }, title_bearer: { fr: "Haut Fait : Fardeau de l'Anneau", en: "Achievement: Burden of the Ring" }, title_bloodwest: { fr: "Haut Fait : L'Héritage de Númenor", en: "Achievement: Legacy of Númenor" }, title_thiefshadow: { fr: "Haut Fait : La Ruse de Smaug", en: "Achievement: Cunning of Smaug" }, title_hobbit: { fr: "Haut Fait : Fuite de la Comté", en: "Achievement: Flight from the Shire" }, title_walker: { fr: "Atteindre le Niveau 10", en: "Reach Level 10" }, title_deathcheater: { fr: "Atteindre le Niveau 20", en: "Reach Level 20" }, title_dunedain: { fr: "Atteindre le Niveau 30", en: "Reach Level 30" }, title_lordchance: { fr: "Atteindre le Niveau 50", en: "Reach Level 50" }, title_reckless: { fr: "Acheté au Marché Noir", en: "Bought at Black Market" }, title_orcblight: { fr: "Acheté au Marché Noir", en: "Bought at Black Market" }, title_kingnocrown: { fr: "Acheté au Marché Noir", en: "Bought at Black Market" }, title_eternal: { fr: "Acheté au Marché Noir", en: "Bought at Black Market" }, title_lightbearer: { fr: "Acheté au Marché Noir", en: "Bought at Black Market" } };
        let titlesHtml = `<h3 style="color:var(--gold); border-bottom:1px solid #333; padding-bottom:5px; margin-top:20px;">${t('ui_ars_titles')}</h3><div class="arsenal-grid">`; Object.keys(titleOrigins).forEach(tKey => { let ownsTitle = playerProfile.inventory.titles.includes(tKey); let isPremium = premiumTitles[tKey] !== undefined; if (ownsTitle) { let isEq = playerProfile.equipped.title === tKey; let origin = titleOrigins[tKey][currentLang]; titlesHtml += `<div class="arsenal-item ${isEq ? 'equipped' : ''}"><h3 style="font-size:16px;">${t(tKey)}</h3><p style="font-size:11px; color:#888; margin-bottom:10px;">${origin}</p><button onclick="equipItem('title', '${tKey}')">${isEq ? t('ui_btn_equipped') : t('ui_btn_equip')}</button></div>`; } else if (!isPremium) { titlesHtml += `<div class="arsenal-item" style="opacity:0.4; border-color:#222; background: transparent;"><h3 style="color:#555;">???</h3><p style="margin-top:5px; font-size:11px; color:#555;">🔒 Verrouillé</p></div>`; } }); titlesHtml += `</div><br><br>`; html += titlesHtml; area.innerHTML = html;
    } else if (tabName === 'marche') {
        const renderShop = (title, key, dict) => { let html = `<h3 style="color:var(--corruption); border-bottom:1px solid #333; padding-bottom:5px;">${title}</h3><div class="arsenal-grid">`; for(let item in dict) { if(dict[item].price > 0 && !playerProfile.inventory[key].includes(item)) { let itemName = currentLang === 'fr' ? dict[item].name_fr : dict[item].name_en; html += `<div class="arsenal-item" style="border-color:var(--corruption);"><h3>${itemName}</h3><span class="arsenal-price">${dict[item].price} ✦</span><button style="background:var(--corruption); color:#fff; border:none; padding:8px;" onclick="buyItem('${key}', '${item}', ${dict[item].price})">${t('ui_btn_buy')}</button></div>`; } } html += `</div>`; return html; };
        let html = `<p style='color:#888; font-style:italic; margin-bottom: 20px;'>${t('ui_market_desc')}</p>` + renderShop(t('ui_ars_ex_boards'), 'boards', itemDict.boards) + renderShop(t('ui_ars_ex_dice'), 'dice', itemDict.dice) + renderShop(t('ui_ars_ex_frames'), 'frames', itemDict.frames);
        let htmlTitles = `<h3 style="color:var(--corruption); border-bottom:1px solid #333; padding-bottom:5px;">${t('ui_ars_ex_titles')}</h3><div class="arsenal-grid">`; for(let tKey in premiumTitles) { if(!playerProfile.inventory.titles.includes(tKey)) { htmlTitles += `<div class="arsenal-item" style="border-color:var(--corruption);"><h3>${t(tKey)}</h3><span class="arsenal-price">${premiumTitles[tKey]} ✦</span><button style="background:var(--corruption); color:#fff; border:none; padding:8px;" onclick="buyItem('titles', '${tKey}', ${premiumTitles[tKey]})">${t('ui_btn_buy')}</button></div>`; } } htmlTitles += `</div>`; html += htmlTitles; area.innerHTML = html;
    } else if (tabName === 'save') {
        area.innerHTML = `<div class="save-box"><h3 style="color:var(--gold); margin:0;">${t('save_title')}</h3><p style="font-size:14px; color:#aaa; margin:0;">${t('save_desc1')}</p><textarea id="export-area" class="save-textarea" readonly></textarea><button onclick="generateExport()" style="background:var(--gold); color:#000;">${t('save_btn_gen')}</button><hr style="border-color:#333; width:100%;"><p style="font-size:14px; color:#aaa; margin:0;">${t('save_desc2')}</p><textarea id="import-area" class="save-textarea"></textarea><button onclick="importSave()" style="background:var(--blood); border-color:var(--blood);">${t('save_btn_import')}</button></div>`;
    }
}
function equipItem(category, item) { let equipKey = category; if (category === 'boards') equipKey = 'board'; if (category === 'frames') equipKey = 'frame'; if (category === 'titles') equipKey = 'title'; playerProfile.equipped[equipKey] = item; saveProfile(); switchArsenalTab('vestiaire'); applyCosmetics(); }
function buyItem(category, item, price) { if (playerProfile.eclatsOmbre >= price) { playerProfile.eclatsOmbre -= price; unlockItem(category, item); if(price >= 5000 && !playerProfile.achievements.heritierElendil) playerProfile.achievements.heritierElendil = true; saveProfile(); switchArsenalTab('marche'); showToast(t('toast_buy_ok'), "success"); } else { showToast(t('toast_buy_fail'), "error"); } }
function generateExport() { const encoded = btoa(JSON.stringify(playerProfile)); const ta = document.getElementById('export-area'); ta.value = encoded; ta.select(); document.execCommand('copy'); showToast(t('toast_copy_ok'), "success"); }
function importSave() { const code = document.getElementById('import-area').value; try { const decoded = JSON.parse(atob(code)); if(decoded && decoded.level !== undefined) { playerProfile = decoded; saveProfile(); applyCosmetics(); showToast(t('toast_import_ok'), "success"); closeArsenal(); } else throw new Error(); } catch(e) { showToast(t('toast_import_fail'), "error"); } }

// ==========================================
// 9. MODE DEBUG (TESTS QA)
// ==========================================
function debugAddXP() { addXP(1000); showToast("DEBUG: +1000 XP injectés", "success"); }
function debugAddShards() { playerProfile.eclatsOmbre += 5000; saveProfile(); showToast("DEBUG: +5000 Éclats", "success"); }
function debugUnlockAll() { for (let key in playerProfile.achievements) playerProfile.achievements[key] = true; for (let cat in itemDict) { for (let item in itemDict[cat]) { if (!playerProfile.inventory[cat].includes(item)) playerProfile.inventory[cat].push(item); } } for (let title in premiumTitles) { if (!playerProfile.inventory.titles.includes(title)) playerProfile.inventory.titles.push(title); } const allEarnableTitles = ['title_bearer', 'title_bloodwest', 'title_thiefshadow', 'title_hobbit', 'title_walker', 'title_deathcheater', 'title_dunedain', 'title_lordchance']; allEarnableTitles.forEach(t => { if (!playerProfile.inventory.titles.includes(t)) playerProfile.inventory.titles.push(t); }); playerProfile.level = 50; saveProfile(); showToast("DEBUG: Débloqué !", "success"); }
function debugForceWin() { if (document.getElementById('duel-screen').style.display === 'none') return; gameState.playerScore = 80; updateGlobalUI(); resolveRoundWinner('hero'); document.getElementById('settings-menu').style.display = 'none'; }
function debugReset() { if(confirm("DEBUG: Tout effacer ?")) { localStorage.removeItem('rodeurProfile'); location.reload(); } }

function triggerTutorial(tutoKey, textKey) { return new Promise((resolve) => { if (!playerProfile.tutorial.enabled || playerProfile.tutorial[tutoKey]) { resolve(); return; } playerProfile.tutorial[tutoKey] = true; saveProfile(); document.getElementById('tutorial-message').innerHTML = t(textKey); const modal = document.getElementById('tutorial-modal'); const btn = document.getElementById('tutorial-btn'); modal.style.display = 'flex'; btn.onclick = () => { modal.style.display = 'none'; resolve(); }; }); }
function setTutorial(wantsGuide) { playerProfile.tutorial.enabled = wantsGuide; playerProfile.tutorial.asked = true; saveProfile(); document.getElementById('welcome-modal').style.display = 'none'; audioManager.isMusicMuted = false; updateAudioButtons(); audioManager.playBGM('tavern'); }

window.onload = () => { 
    refreshContracts();
    updateStaticUI(); 
    updateProfileUI(); 
    applyCosmetics(); 
    if (!playerProfile.tutorial.asked) { document.getElementById('welcome-modal').style.display = 'flex'; } 
    else if (document.getElementById('tavern-screen').style.display !== 'none' && !audioManager.isMusicMuted) { audioManager.playBGM('tavern'); } 
};