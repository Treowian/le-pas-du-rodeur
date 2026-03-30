// ==========================================
// 0. PROFIL, PROGRESSION ET HAUTS FAITS
// ==========================================
const defaultProfile = {
    xp: 0, level: 1, eclatsOmbre: 0,
    stats: {
        totalLeagues: 0, gamesPlayed: 0, gamesWon: 0, shadowsUsed: 0, deroutesTaken: 0, purifications: 0,
        winsAgainst: { brag: 0, zamin: 0, kael: 0, letranger: 0 }, routsSurvived: 0, gamesWonWith1Life: 0, firstTurnRouts: 0, currentWinStreak: 0
    },
    achievements: {
        fardeauAnneau: false, flammeUdun: false, heritageNumenor: false, sermentParjures: false, maliceMorgoth: false, ruseSmaug: false, enduranceDunedain: false, fuiteComte: false,
        colereValar: false, pariIsildur: false, voieElfes: false, fleauOmbre: false, marcheurNuit: false, pillardGobelin: false, negociateurNain: false, tueurKael: false, enigmeObscurite: false,
        maitreFondcombe: false, maledictionAnneau: false, bravoureHobbit: false, heritierElendil: false, tueurBalrog: false, ombreMordor: false, retourRoi: false, seigneurOuest: false
    },
    inventory: { dice: ['classic'], boards: ['dark'], frames: ['basic'], titles: ['title_ranger'] },
    equipped: { dice: 'classic', board: 'dark', frame: 'basic', title: 'title_ranger' }
};

let playerProfile = JSON.parse(localStorage.getItem('rodeurProfile')) || {};
playerProfile = { ...defaultProfile, ...playerProfile };
playerProfile.stats = { ...defaultProfile.stats, ...(playerProfile.stats || {}) };
playerProfile.stats.winsAgainst = { ...{ brag:0, zamin:0, kael:0, letranger:0 }, ...(playerProfile.stats.winsAgainst || {}) };
playerProfile.achievements = { ...defaultProfile.achievements, ...(playerProfile.achievements || {}) };
playerProfile.inventory = { ...defaultProfile.inventory, ...(playerProfile.inventory || {}) };
playerProfile.equipped = { ...defaultProfile.equipped, ...(playerProfile.equipped || {}) };
if (playerProfile.equipped.title === 'Le Rôdeur') playerProfile.equipped.title = 'title_ranger'; // Migration old save

function saveProfile() { localStorage.setItem('rodeurProfile', JSON.stringify(playerProfile)); updateProfileUI(); }
function getXPRequired(level) { return 100 + (25 * level); }

function addXP(amount) {
    playerProfile.xp += amount;
    let required = getXPRequired(playerProfile.level);
    let levelUp = false;
    while(playerProfile.xp >= required) {
        playerProfile.xp -= required; playerProfile.level++; playerProfile.eclatsOmbre += (playerProfile.level % 5 === 0) ? 50 : 15;
        required = getXPRequired(playerProfile.level); levelUp = true;
    }
    saveProfile();
    if(levelUp && document.getElementById('tavern-screen').style.display !== 'none') {
        showToast(t('toast_lvl_up', {lvl: playerProfile.level}), "success");
    }
}

function updateProfileUI() {
    let req = getXPRequired(playerProfile.level); let pct = Math.min((playerProfile.xp / req) * 100, 100);
    const fillEl = document.getElementById('ui-xp-fill'); if(fillEl) fillEl.style.width = pct + "%";
    const curEl = document.getElementById('ui-xp-current'); if(curEl) curEl.innerText = Math.floor(playerProfile.xp);
    const reqEl = document.getElementById('ui-xp-needed'); if(reqEl) reqEl.innerText = req;
    const lvlEl = document.getElementById('ui-player-level'); if(lvlEl) lvlEl.innerText = playerProfile.level;
    const ecEl = document.getElementById('ui-eclats'); if(ecEl) ecEl.innerText = playerProfile.eclatsOmbre;
    const arsEcEl = document.getElementById('ui-arsenal-eclats'); if(arsEcEl) arsEcEl.innerText = playerProfile.eclatsOmbre;
}

// Variables Globales de Partie
let gameState = {
    currentEnemyId: '', activePlayer: 'hero', heroRounds: 0, enemyRounds: 0, targetScore: 100, playerScore: 0, enemyScore: 0, turnScore: 0,
    playerLives: 3, enemyLives: 3, enemyStartLives: 3, playerShadow: 0, playerEspoir: 3, enemyHate: 0, enemyMaxHate: 0, secretPersonality: '', enemyRiskProfile: '', enemyAcharnementCount: 0, 
    diceValues: [0, 0, 0, 0, 0], diceStates: ['idle', 'idle', 'idle', 'idle', 'idle'], isRolling: false, hasKeptDieThisRoll: false, pendingDeroute: false,
    currentEnemyRolledIndices: [], currentHeroRolledIndices: [], currentEnemyTargetIdx: -1,
    matchStats: { turnsPlayedThisRound: 0, consecutiveShadowMaxTurns: 0, defendsUsed: 0, shadowsUsedThisRound: 0, firstRoundLost: false, deroutesThisMatch: 0, purificationsThisMatch: 0, compassUsedThisMatch: 0 }
};

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification'); if (!toast) return;
    toast.innerText = message; toast.className = `toast-visible toast-${type}`;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toast.className = 'toast-hidden'; }, 3000);
}

// ==========================================
// AUDIO (Musique et Bruitages séparés)
// ==========================================
const audioManager = { 
    bgmMusic: new Audio(), 
    isMusicMuted: true, // Musique coupée par défaut (politique des navigateurs)
    isSfxMuted: false,  // SFX activés par défaut
    tracks: { 
        tavern: 'audio/tavern_theme.mp3', 
        duel_brag: 'audio/duel_brag.mp3', 
        duel_zamin: 'audio/duel_zamin.mp3', 
        duel_kael: 'audio/duel_kael.mp3', 
        duel_letranger: 'audio/duel_letranger.mp3' 
    }, 
    playBGM(trackName) { 
        if (this.isMusicMuted) return; 
        if (this.bgmMusic.src.includes(this.tracks[trackName])) return; 
        this.bgmMusic.src = this.tracks[trackName]; 
        this.bgmMusic.loop = true; 
        this.bgmMusic.volume = 0.1; 
        let p = this.bgmMusic.play(); 
        if (p) p.catch(e => console.log("Audio bloqué par le navigateur.")); 
    }, 
    stopBGM() { 
        this.bgmMusic.pause(); 
    }, 
    playSFX(src, vol = 0.2) { 
        if(this.isSfxMuted) return; // Ne joue rien si les SFX sont coupés
        let sfx = new Audio(src); 
        sfx.volume = vol; 
        sfx.play().catch(e=>e); 
    } 
};

function updateAudioButtons() {
    const mBtn = document.getElementById('music-btn');
    const sBtn = document.getElementById('sfx-btn');
    if (mBtn) mBtn.innerText = audioManager.isMusicMuted ? (currentLang === 'fr' ? "🔇 MUSIQUE OFF" : "🔇 MUSIC OFF") : (currentLang === 'fr' ? "🎵 MUSIQUE ON" : "🎵 MUSIC ON");
    if (sBtn) sBtn.innerText = audioManager.isSfxMuted ? "🔇 SFX OFF" : "🔊 SFX ON";
}

function toggleMusic() { 
    audioManager.isMusicMuted = !audioManager.isMusicMuted; 
    updateAudioButtons();
    
    if (!audioManager.isMusicMuted) { 
        // Si on rallume la musique, on vérifie sur quel écran on est pour lancer la bonne piste
        if (document.getElementById('tavern-screen').style.display !== 'none') {
            audioManager.playBGM('tavern');
        } else if (gameState.currentEnemyId) {
            audioManager.playBGM('duel_' + gameState.currentEnemyId);
        }
    } else { 
        audioManager.stopBGM(); 
    } 
}

function toggleSFX() {
    audioManager.isSfxMuted = !audioManager.isSfxMuted;
    updateAudioButtons();
    // Petit son test quand on réactive les SFX
    if (!audioManager.isSfxMuted) audioManager.playSFX('audio/dice.mp3', 0.2);
}

// ==========================================
// 1. DICTIONNAIRE & TRADUCTIONS
// ==========================================
let currentLang = 'fr';
const i18n = {
    fr: {
        ui_tavern_title: "L'AUBERGE DU PONT-AUX-PIERRES", ui_tavern_sub: "Dirhael, les ombres s'allongent. Choisissez votre table.",
        ui_btn_rules: "Lire le Grimoire", name_brag: "BRAG", name_zamin: "ZÂMIN", name_kael: "KAEL", name_letranger: "L'ÉTRANGER",
        diff_easy: "FACILE", diff_normal: "NORMAL", diff_hard: "DIFFICILE", diff_random: "ALÉATOIRE",
        ui_res_lives: "Vies (Déroute = -1)", ui_res_hope: "Espoir (Défense)", ui_res_shadow: "Ombre (Risque mortel > 3)", ui_res_hate: "Haine (Attaque)",
        ui_rounds_won: "MANCHES REMPORTÉES :", ui_100_leagues: "100 LIEUES",
        ui_btn_roll: "Forcer l'allure", ui_btn_stop: "Établir le camp", ui_btn_leave: "Quitter la table", ui_btn_continue: "CONTINUER", 
        rules_title: "LE GRIMOIRE DU RÔDEUR", rules_close: "Fermer", ui_leagues: "LIEUES",
        rules_text: `<p><strong>LE BUT</strong> Gagner 2 manches de 100 Lieues, OU tuer l'adversaire (0 Vie = Mort définitive).</p><p><strong>LA DÉROUTE</strong> Le "1" est une Embuscade (Rouge). Deux "1" en un lancer (ou un "1" sans marquer de points) déclenchent la Déroute : perte d'1 Vie.</p><p><strong>L'ESPOIR ET LA SURVIE</strong> Dépensez 1 Espoir pour relancer un dé maudit. <em>Attention : vos Vies ne se régénèrent pas entre les manches. Au Campement, sacrifiez un Triomphe (6) pour regagner 1 Espoir.</em></p><p><strong>L'OMBRE (Attaque)</strong> Quand l'ennemi fait un 5 ou un 6, prenez +1 Ombre pour le détruire. <em>⚠️ Plus vous avez d'Ombre, plus vos dés sont pipés. Au-delà de 3 Ombres, la 4ème a 25% de chances de vous tuer, la 5ème 50%, etc.</em></p><p><strong>LA HAINE</strong> L'ennemi dépense sa Haine pour voler vos dés. S'il n'a plus de Haine <span style="color: var(--gold); font-weight: bold;">et qu'il est en retard</span>, il peut s'acharner avec un risque de mourir sur le coup.</p>`,
        status_turn_hero: "À vous de jouer.", status_turn_enemy: "L'adversaire réfléchit...", status_rolling: "Les dés roulent...",
        status_sabotage_kael: "SABOTAGE ! L'ennemi cible votre Triomphe...", status_sabotage_kael_res: "Votre dé est corrompu en Embuscade !",
        status_sabotage_brag: "VOL ! L'ennemi s'intéresse à votre butin...", status_sabotage_brag_res: "L'ennemi vous dérobe votre dé !",
        status_sabotage_zamin: "USURE ! L'ennemi évalue vos actifs...", status_sabotage_zamin_res: "L'ennemi a gelé l'un de vos dés neutres !",
        status_deroute_imminent: "DÉROUTE IMMINENTE ! Que décidez-vous ?", status_impasse_ask: "IMPASSE ! Relancer avec la Boussole ?",
        status_impasse_lost: "IMPASSE ! Terrain hostile. Tour perdu.", status_action_purify: "ACTION REQUISE : CLIQUEZ sur le DÉ ROUGE !",
        status_urgency: "URGENCE : Défendez-vous d'abord !", status_purify_success: "Sacrifice héroïque : Embuscade purifiée !",
        status_hope_used: "ESPOIR ! Vous relancez le dé maudit...", status_deroute_forced: "VOUS NE POUVEZ PLUS VOUS DÉFENDRE.",
        status_cannot_purify: "Impossible de purifier : aucun Triomphe ni Espoir.", status_compass_used: "La Boussole vous guide ! Relance...", status_impasse_accepted: "Impasse acceptée. Tour perdu.",
        status_shadow_6: "L'adversaire a tiré un 6 ! Le corrompre ?", status_shadow_other: "L'adversaire a tiré un {val} ! L'Ombre a soif...",
        status_shadow_corrupt: "Vous corrompez son Triomphe !", status_shadow_devour: "L'Ombre a dévoré son {val} !",
        status_shadow_survive: "Miracle ! Vous survivez (Risque : {chance}%) !",
        status_enemy_purify_6: "L'adversaire sacrifie un 6 pour survivre !", status_enemy_impasse: "IMPASSE pour l'adversaire.",
        status_deroute_hero: "DÉROUTE ! Perte d'1 Vie.", status_deroute_enemy: "DÉROUTE ! L'adversaire perd 1 Vie.",
        status_camp_hero: "Vous avez établi le camp.", status_camp_enemy: "L'adversaire a établi le camp.", status_select_dice: "Sélectionnez vos dés bleus/or.",
        status_acharnement: "L'ennemi s'acharne sur votre Triomphe ! (Risque : {chance}%)", status_acharnement_fail_score: "L'effort l'épuise ! Il recule de 15 Lieues.",
        status_acharnement_fail_life: "L'effort le brise ! Il perd 1 Vie.", status_acharnement_success: "C'est passé ! L'ennemi survit !",
        status_camp_choice: "Sacrifier un Triomphe pour +1 Espoir ?",
        btn_defend: "Se Défendre", btn_suffer: "Subir la Déroute", btn_compass: "La Boussole", btn_accept_defeat: "Accepter l'Impasse",
        btn_corrupt: "Corrompre (+1 Ombre)", btn_devour: "Dévorer (+1 Ombre)", btn_ignore: "Ignorer", btn_camp_sacrifice: "Sacrifier (+1 Espoir)", btn_camp_normal: "Garder les points",
        ev_pas_title: "LE PAS DU RÔDEUR", ev_pas_msg: "Succès Magistral ! Vous rejouez !", ev_pas_btn: "Continuer",
        ev_gouffre_title: "GOUFFRE DU DÉSESPOIR", ev_gouffre_msg: "Échec Magistral ! Espoir détruit...", ev_gouffre_btn: "Subir la Déroute",
        ev_elan_title: "ÉLAN TÉNÉBREUX", ev_elan_msg: "L'Ennemi fait une percée de {val} Lieues !", ev_elan_btn: "Subir",
        ev_malediction_title: "MALÉDICTION", ev_malediction_msg: "Échec Magistral de l'Ennemi !", ev_malediction_btn: "Déroute",
        end_vic_title: "VICTOIRE TOTALE", end_vic_msg: "Vous remportez ce duel mortel !", end_vic_btn: "Quitter",
        end_def_title: "DÉFAITE FATALE", end_def_msg: "Votre voyage s'arrête ici.", end_def_btn: "Fuir",
        end_manche_lose_title: "MANCHE PERDUE", end_manche_lose_msg: "L'ennemi gagne cette course.", end_manche_lose_btn: "Continuer",
        end_shadow_title: "CONSUMÉ", end_shadow_msg: "Votre avidité vous a tué.", end_shadow_btn: "Quitter",
        ui_reward_title: "COURSE GAGNÉE", ui_reward_msg: "Choisissez votre avantage :",
        ui_reward_init: "L'Initiative (Jouer en premier)", ui_reward_heal: "Le Repos (+1 Vie, l'ennemi commence)",
        
        ui_level: "Niv.", ui_shards: "Éclats d'Ombre", ui_shards_short: "Éclats", ui_btn_arsenal: "L'Arsenal",
        ui_arsenal_title: "L'ARSENAL", ui_btn_close: "Fermer",
        ui_tab_vestiaire: "Le Vestiaire", ui_tab_market: "Le Marché Noir", ui_tab_achiev: "Les Hauts Faits", ui_tab_stats: "Le Registre", ui_tab_save: "Sauvegarde",
        ui_ars_boards: "Fonds de Table", ui_ars_dice: "Skins de Dés", ui_ars_frames: "Cadres de Portrait", ui_ars_titles: "Titres Honorifiques",
        ui_ars_ex_boards: "Fonds Exclusifs", ui_ars_ex_dice: "Dés Maudits", ui_ars_ex_frames: "Cadres Corrompus", ui_ars_ex_titles: "Titres Prestigieux",
        ui_btn_equip: "Équiper", ui_btn_equipped: "ÉQUIPÉ", ui_btn_buy: "ACHETER", ui_locked_lvl: "Verrouillé (Niveau Requis)",
        ui_market_desc: "Dépensez vos Éclats d'Ombre. Zâmin ne fait pas crédit.",
        stat_lvl: "Niveau :", stat_xp: "XP Totale :", stat_leagues: "Lieues parcourues :", stat_played: "Parties jouées :", stat_won: "Victoires :",
        stat_shadows: "Ombres dévorées :", stat_purif: "Embuscades purifiées :", stat_routs: "Déroutes subies :", stat_streak: "Série de victoires actuelle :",
        stat_1life: "Victoires in extremis (1 Vie) :",
        save_title: "Sauvegarder et Transférer", save_desc1: "Copiez ce code pour sauvegarder votre progression ou la transférer sur un autre appareil.",
        save_btn_gen: "Générer le Code", save_desc2: "Collez un code de sauvegarde ci-dessous pour restaurer votre progression. ⚠️ Attention, cela effacera votre partie actuelle !",
        save_btn_import: "Restaurer la Sauvegarde",
        toast_lvl_up: "Niveau Supérieur ! Niveau {lvl} atteint !", toast_buy_ok: "Achat réussi !", toast_buy_fail: "Vous n'avez pas assez d'Éclats d'Ombre !",
        toast_copy_ok: "Code copié dans le presse-papier !", toast_import_ok: "Progression restaurée avec succès !", toast_import_fail: "Code invalide ou corrompu.",
        title_ranger: "Le Rôdeur", title_walker: "Le Marcheur", title_deathcheater: "Trompe-la-Mort", title_dunedain: "Dúnadan", title_lordchance: "Seigneur du Hasard",
        title_reckless: "Le Téméraire", title_orcblight: "Fléau des Orques", title_kingnocrown: "Roi sans Couronne", title_eternal: "L'Éternel", title_lightbearer: "Porteur de Lumière",
        title_bearer: "Le Porteur", title_bloodwest: "Sang de l'Ouest", title_thiefshadow: "Voleur dans l'Ombre", title_hobbit: "Hobbit Égaré",
        dialogues: {
            dirhael: { greetings: ["Chaque pas compte."], success: ["La piste est bonne."], failure: ["Le fardeau devient lourd..."], purify: ["Un mal pour un bien."], hope_hate: ["L'espoir est ma boussole."], impasse: ["Maudites broussailles..."], camp: ["Prenons un instant."], shadow: ["Pardonnez-moi, ancêtres..."] },
            brag: { greetings: ["Amène tes pièces !"], success: ["Je t'ai plumé !"], failure: ["Mes os !"], purify: ["Lâcher mon butin..."], hope_hate: ["Mes os, mes règles !"], impasse: ["On s'égare ?"], camp: ["Moi j'empoche !"] },
            zamin: { greetings: ["La Maison gagne toujours."], success: ["Le profit avant tout."], failure: ["Anomalie statistique."], purify: ["Déficit tactique."], hope_hate: ["Je gèle ces actifs."], impasse: ["Le marché stagne."], camp: ["Investissement sécurisé."] },
            kael: { greetings: ["Le Gondor est mort."], success: ["Succombe au désespoir."], failure: ["Flamme vacillante !"], purify: ["Sacrifice pour la survie."], hope_hate: ["Illusion, Dúnadan !"], impasse: ["Nous tournons en rond."], camp: ["Le filet se resserre."] },
            letranger: { greetings: ["Donne-moi les dés."], success: ["Tu glisses..."], failure: ["Trop de lumière..."], purify: ["*Sifflement*"], hope_hate: ["L'ombre s'étend..."], impasse: ["*Silence oppressant*"], camp: ["*Il vous observe*"] }
        }
    },
    en: {
        ui_tavern_title: "THE STONEBRIDGE TAVERN", ui_tavern_sub: "Dirhael, the shadows lengthen. Choose your table.",
        ui_btn_rules: "Read Grimoire", name_brag: "BRAG", name_zamin: "ZÂMIN", name_kael: "KAEL", name_letranger: "THE STRANGER",
        diff_easy: "EASY", diff_normal: "NORMAL", diff_hard: "HARD", diff_random: "RANDOM",
        ui_res_lives: "Lives (Rout = -1)", ui_res_hope: "Hope (Defense)", ui_res_shadow: "Shadow (Death Risk > 3)", ui_res_hate: "Hate (Attack)",
        ui_rounds_won: "ROUNDS WON :", ui_100_leagues: "100 LEAGUES",
        ui_btn_roll: "Push the pace", ui_btn_stop: "Set up camp", ui_btn_leave: "Leave table", ui_btn_continue: "CONTINUE", 
        rules_title: "THE RANGER'S GRIMOIRE", rules_close: "Close Grimoire", ui_leagues: "LEAGUES",
        rules_text: `<p><strong>THE GOAL</strong> Win 2 rounds of 100 Leagues, OR kill the opponent.</p><p><strong>THE ROUT</strong> The "1" is an Ambush. Two "1"s trigger a Rout: lose 1 Life.</p><p><strong>HOPE & SURVIVAL</strong> Spend 1 Hope to reroll a cursed die. <em>Sacrifice a Triumph (6) while camping to regain 1 Hope.</em></p><p><strong>SHADOW (Attack)</strong> When the enemy rolls a 5 or 6, take +1 Shadow to destroy it. <em>⚠️ Risk of instant death increases past 3 Shadows.</em></p><p><strong>HATE</strong> The enemy spends Hate to steal your dice. If they have none <span style="color: var(--gold); font-weight: bold;">and are trailing behind</span>, they can use Desperation with a risk of instant death.</p>`,
        status_turn_hero: "It's your turn.", status_turn_enemy: "The opponent is thinking...", status_rolling: "Rolling...",
        status_sabotage_kael: "SABOTAGE! Enemy targets your Triumph...", status_sabotage_kael_res: "Die corrupted into Ambush!",
        status_sabotage_brag: "THEFT! Enemy eyes your loot...", status_sabotage_brag_res: "Enemy steals your die!",
        status_sabotage_zamin: "ATTRITION! Enemy evaluates assets...", status_sabotage_zamin_res: "Enemy froze a neutral die!",
        status_deroute_imminent: "IMMINENT ROUT! What do you decide?", status_impasse_ask: "DEAD END! Reroll with Compass?",
        status_impasse_lost: "DEAD END! Hostile terrain. Turn lost.", status_action_purify: "ACTION REQUIRED: CLICK the RED DIE!",
        status_urgency: "URGENCY: Defend yourself first!", status_purify_success: "Heroic sacrifice: Ambush purified!",
        status_hope_used: "HOPE! Rerolling cursed die...", status_deroute_forced: "YOU CAN NO LONGER DEFEND YOURSELF.",
        status_cannot_purify: "Cannot purify: no Triumph or Hope.", status_compass_used: "The Compass guides you! Rerolling...", status_impasse_accepted: "Dead End accepted. Turn lost.",
        status_shadow_6: "Opponent rolled a 6! Corrupt it?", status_shadow_other: "Opponent rolled a {val}! Shadow thirsts...",
        status_shadow_corrupt: "You corrupted their Triumph!", status_shadow_devour: "The Shadow devoured their {val}!",
        status_shadow_survive: "Miracle! You survived (Risk: {chance}%)!",
        status_enemy_purify_6: "Opponent sacrifices a 6 to survive!", status_enemy_impasse: "DEAD END for the opponent.",
        status_deroute_hero: "ROUT! You lose 1 Life.", status_deroute_enemy: "ROUT! Opponent loses 1 Life.",
        status_camp_hero: "You have set up camp.", status_camp_enemy: "Opponent set up camp.", status_select_dice: "Select your dice.",
        status_acharnement: "Enemy is desperate for your Triumph! (Risk: {chance}%)", status_acharnement_fail_score: "Effort exhausts them! They lose 15 Leagues.",
        status_acharnement_fail_life: "Effort breaks them! They lose 1 Life.", status_acharnement_success: "It worked! Enemy survives!",
        status_camp_choice: "Sacrifice a Triumph for +1 Hope?",
        btn_defend: "Defend", btn_suffer: "Suffer Rout", btn_compass: "Compass", btn_accept_defeat: "Accept Dead End",
        btn_corrupt: "Corrupt (+1 Shadow)", btn_devour: "Devour (+1 Shadow)", btn_ignore: "Ignore", btn_camp_sacrifice: "Sacrifice (+1 Hope)", btn_camp_normal: "Keep points",
        ev_pas_title: "THE RANGER'S STRIDE", ev_pas_msg: "Masterful Success! You replay!", ev_pas_btn: "Continue",
        ev_gouffre_title: "ABYSS OF DESPAIR", ev_gouffre_msg: "Masterful Failure! Hope destroyed...", ev_gouffre_btn: "Suffer Rout",
        ev_elan_title: "DARK MOMENTUM", ev_elan_msg: "Enemy covers {val} Leagues!", ev_elan_btn: "Endure",
        ev_malediction_title: "CURSE", ev_malediction_msg: "Enemy Masterful Failure!", ev_malediction_btn: "Rout",
        end_vic_title: "TOTAL VICTORY", end_vic_msg: "You survived the shadow and triumphed.", end_vic_btn: "Leave table",
        end_def_title: "FATAL DEFEAT", end_def_msg: "Your journey ends here.", end_def_btn: "Flee tavern",
        end_manche_lose_title: "ROUND LOST", end_manche_lose_msg: "Enemy wins this race.", end_manche_lose_btn: "Continue",
        end_shadow_title: "CONSUMED", end_shadow_msg: "Your greed killed you.", end_shadow_btn: "Quit",
        ui_reward_title: "RACE WON", ui_reward_msg: "Choose your advantage:",
        ui_reward_init: "Initiative (Play first)", ui_reward_heal: "Rest (+1 Life, Enemy plays first)",
        ui_level: "Lvl.", ui_shards: "Shadow Shards", ui_shards_short: "Shards", ui_btn_arsenal: "The Arsenal",
        ui_arsenal_title: "THE ARSENAL", ui_btn_close: "Close",
        ui_tab_vestiaire: "The Wardrobe", ui_tab_market: "Black Market", ui_tab_achiev: "Achievements", ui_tab_stats: "The Ledger", ui_tab_save: "Save Game",
        ui_ars_boards: "Table Boards", ui_ars_dice: "Dice Skins", ui_ars_frames: "Portrait Frames", ui_ars_titles: "Honorary Titles",
        ui_ars_ex_boards: "Exclusive Boards", ui_ars_ex_dice: "Cursed Dice", ui_ars_ex_frames: "Corrupted Frames", ui_ars_ex_titles: "Prestigious Titles",
        ui_btn_equip: "Equip", ui_btn_equipped: "EQUIPPED", ui_btn_buy: "BUY", ui_locked_lvl: "Locked (Level Required)",
        ui_market_desc: "Spend your Shadow Shards. Zâmin doesn't do credit.",
        stat_lvl: "Level:", stat_xp: "Total XP:", stat_leagues: "Leagues traveled:", stat_played: "Matches played:", stat_won: "Wins:",
        stat_shadows: "Shadows devoured:", stat_purif: "Ambushes purified:", stat_routs: "Routs suffered:", stat_streak: "Current win streak:",
        stat_1life: "Close calls (1 Life wins):",
        save_title: "Save and Transfer", save_desc1: "Copy this code to save your progress or transfer it to another device.",
        save_btn_gen: "Generate Code", save_desc2: "Paste a save code below to restore your progress. ⚠️ Warning: this overwrites current progress!",
        save_btn_import: "Restore Save",
        toast_lvl_up: "Level Up! Reached Level {lvl}!", toast_buy_ok: "Purchase successful!", toast_buy_fail: "Not enough Shadow Shards!",
        toast_copy_ok: "Code copied to clipboard!", toast_import_ok: "Progress successfully restored!", toast_import_fail: "Invalid or corrupted code.",
        title_ranger: "The Ranger", title_walker: "The Walker", title_deathcheater: "Death-Cheater", title_dunedain: "Dúnadan", title_lordchance: "Lord of Chance",
        title_reckless: "The Reckless", title_orcblight: "Orc Bane", title_kingnocrown: "King Without a Crown", title_eternal: "The Eternal", title_lightbearer: "Light Bearer",
        title_bearer: "The Bearer", title_bloodwest: "Blood of the West", title_thiefshadow: "Thief in the Shadow", title_hobbit: "Lost Hobbit",
        dialogues: {
            dirhael: { greetings: ["Every step counts."], success: ["The trail is good."], failure: ["The burden grows heavy..."], purify: ["A necessary evil."], hope_hate: ["Hope is my compass."], impasse: ["Cursed underbrush..."], camp: ["Let's breathe."], shadow: ["Forgive me, ancestors..."] },
            brag: { greetings: ["Bring your coins!"], success: ["I plucked you!"], failure: ["My bones!"], purify: ["Dropping good loot!"], hope_hate: ["My bones, my rules!"], impasse: ["Are we lost?"], camp: ["I'm cashing in!"] },
            zamin: { greetings: ["The House of Gold wins."], success: ["Haste is the enemy of profit."], failure: ["Statistical anomaly."], purify: ["Tactical deficit."], hope_hate: ["Freezing assets."], impasse: ["Market stagnates..."], camp: ["Investment secured."] },
            kael: { greetings: ["Gondor is dead."], success: ["Succumb to despair."], failure: ["Flickering flame!"], purify: ["Sacrifice for survival."], hope_hate: ["Illusion, Dúnadan!"], impasse: ["We run in circles."], camp: ["The net tightens."] },
            letranger: { greetings: ["Give me the dice."], success: ["You slip..."], failure: ["Too much light..."], purify: ["*Hiss*"], hope_hate: ["Shadow spreads..."], impasse: ["*Silence*"], camp: ["*He watches*"] }
        }
    }
};

function t(key, params = {}) {
    let text = i18n[currentLang][key] || i18n['fr'][key]; if (!text) return key; 
    for (let p in params) { text = text.replace(`{${p}}`, params[p]); } return text;
}

function toggleLanguage() { 
    currentLang = (currentLang === 'fr') ? 'en' : 'fr'; 
    document.getElementById('lang-btn').innerText = (currentLang === 'fr') ? "🇬🇧 EN" : "🇫🇷 FR";
    updateStaticUI(); 
    updateAudioButtons();
    
    // Mise à jour des boutons du duel
    let turnScoreEl = document.getElementById('current-turn-score');
    if (turnScoreEl) turnScoreEl.innerHTML = `${gameState.turnScore} <span>${t('ui_leagues')}</span>`;
    let btnRoll = document.getElementById('btn-roll'); if(btnRoll) btnRoll.innerText = t('ui_btn_roll');
    let btnStop = document.getElementById('btn-stop'); if(btnStop) btnStop.innerText = t('ui_btn_stop');
    let btnLeave = document.querySelector('.back-btn'); if(btnLeave) btnLeave.innerText = t('ui_btn_leave');
    
    // NOUVEAU : Traduction dynamique du nom de l'adversaire en plein duel !
    let enemyNameEl = document.getElementById('ui-enemy-name');
    if (enemyNameEl && gameState.currentEnemyId) {
        enemyNameEl.innerText = i18n[currentLang]["name_" + gameState.currentEnemyId];
    }
    
    applyCosmetics();
    if(document.getElementById('arsenal-modal').style.display === 'flex') { 
        switchArsenalTab(document.querySelector('.tab-btn.active').getAttribute('onclick').match(/'(.*?)'/)[1]); 
    }
}

function updateStaticUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (i18n[currentLang] && i18n[currentLang][key]) el.innerHTML = i18n[currentLang][key]; });
    const rulesContainer = document.getElementById('rules-container');
    if (rulesContainer && i18n[currentLang].rules_text) rulesContainer.innerHTML = i18n[currentLang].rules_text;
}

// ==========================================
// 1.5 FONCTIONS D'INTERFACE (UI)
// ==========================================
function updateLivesUI() {
    const hc = document.getElementById('ui-hero-lives'); hc.innerHTML = ''; for (let i = 0; i < 3; i++) hc.innerHTML += `<div class="token vie ${i < gameState.playerLives ? '' : 'lost'}"></div>`;
    const ec = document.getElementById('ui-enemy-lives'); ec.innerHTML = ''; for (let i = 0; i < gameState.enemyStartLives; i++) ec.innerHTML += `<div class="token vie ${i < gameState.enemyLives ? '' : 'lost'}"></div>`;
}
function updateEspoirUI() { const et = document.querySelectorAll('#ui-espoir-tokens .token.espoir'); for (let i = 0; i < 3; i++) { if (et[i]) { et[i].style.opacity = i < gameState.playerEspoir ? "1" : "0.2"; et[i].style.boxShadow = i < gameState.playerEspoir ? "0 0 8px rgba(212,175,55,0.4)" : "none"; } } }
function updateHaineUI() { const c = document.getElementById('ui-haine-tokens'); if (!c) return; c.innerHTML = ''; for (let i = 0; i < gameState.enemyMaxHate; i++) c.innerHTML += `<div class="token haine ${i < gameState.enemyHate ? '' : 'lost'}"></div>`; }
function updateShadowUI() {
    const c = document.getElementById('ui-ombre-tokens'); if (!c) return; c.innerHTML = ''; let max = Math.max(3, gameState.playerShadow);
    for (let i = 0; i < max; i++) { if (i < gameState.playerShadow) c.innerHTML += `<div class="token ombre" style="${i>=3 ? 'background:var(--blood);border-color:var(--blood);box-shadow:0 0 10px var(--blood);' : 'background:var(--corruption);'}"></div>`; else c.innerHTML += `<div class="token ombre"></div>`; }
}
function updateGlobalUI() {
    document.getElementById('progress-hero').style.width = (Math.min(gameState.playerScore, gameState.targetScore) / 2) + "%"; document.getElementById('progress-enemy').style.width = (Math.min(gameState.enemyScore, gameState.targetScore) / 2) + "%";
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

// ==========================================
// 2. APPLICATION DES COSMETIQUES
// ==========================================
function applyCosmetics() {
    // Sécurité : on s'assure de lire la bonne clé d'équipement
    const boardKey = playerProfile.equipped.board || playerProfile.equipped.boards || 'dark';
    const frameKey = playerProfile.equipped.frame || playerProfile.equipped.frames || 'basic';
    const titleKey = playerProfile.equipped.title || playerProfile.equipped.titles || 'title_ranger';
    const diceKey = playerProfile.equipped.dice || 'classic';

    const board = document.getElementById('center-board'); 
    if (board) { board.className = ''; board.classList.add(`board-${boardKey}`); }
    
    const heroPortrait = document.querySelector('.hero-portrait'); 
    if (heroPortrait) { heroPortrait.className = 'char-portrait hero-portrait'; heroPortrait.classList.add(`frame-${frameKey}`); }
    
    const title = document.getElementById('hero-title'); 
    if (title) title.innerText = t(titleKey);
    
    for(let i=0; i<5; i++) {
        let die = document.getElementById(`die-${i}`);
        if(die) {
            let d = die.classList.contains('die-danger'), t = die.classList.contains('die-triumph'), a = die.classList.contains('die-advance'), n = die.classList.contains('die-neutral'), s = die.classList.contains('die-sacrificed');
            die.className = 'die';
            if(d) die.classList.add('die-danger'); else if(t) die.classList.add('die-triumph'); else if(a) die.classList.add('die-advance'); else if(n) die.classList.add('die-neutral'); else if(s) die.classList.add('die-sacrificed'); else die.classList.add('die-idle');
            if(diceKey !== 'classic') die.classList.add(`skin-${diceKey}`);
        }
    }
}

// ==========================================
// 3. GESTION DES TOURS ET JEU
// ==========================================
function enterDuel(id, fullName) {
    gameState.currentEnemyId = id; document.body.className = 'theme-' + id; document.getElementById('ui-enemy-name').innerText = i18n[currentLang]["name_"+id];
    let imgName = "images/" + id.charAt(0).toUpperCase() + id.slice(1) + ".png"; if(id === 'letranger') imgName = "images/Letranger.png"; document.getElementById('enemy-portrait-img').src = imgName;
    document.getElementById('tavern-screen').style.display = 'none'; document.getElementById('duel-screen').style.display = 'flex';
    if (id === 'brag') { gameState.enemyHate = 1; gameState.enemyStartLives = 3; gameState.secretPersonality = 'brag'; gameState.enemyRiskProfile = 'brag'; } 
    else if (id === 'zamin') { gameState.enemyHate = 2; gameState.enemyStartLives = 3; gameState.secretPersonality = 'zamin'; gameState.enemyRiskProfile = 'zamin'; } 
    else if (id === 'kael') { gameState.enemyHate = 3; gameState.enemyStartLives = 3; gameState.secretPersonality = 'kael'; gameState.enemyRiskProfile = 'kael'; } 
    else { gameState.enemyHate = Math.floor(Math.random() * 6); gameState.enemyStartLives = Math.floor(Math.random() * 6) + 1; gameState.secretPersonality = 'chaos'; gameState.enemyRiskProfile = 'chaos'; }
    gameState.enemyMaxHate = gameState.enemyHate; audioManager.playBGM('duel_' + id); 
    gameState.matchStats = { turnsPlayedThisRound: 0, consecutiveShadowMaxTurns: 0, defendsUsed: 0, shadowsUsedThisRound: 0, firstRoundLost: false, deroutesThisMatch: 0, purificationsThisMatch: 0, compassUsedThisMatch: 0 };
    playerProfile.stats.gamesPlayed++; saveProfile(); applyCosmetics(); startNewRound(true, 'hero'); 
}

function startNewRound(isFirstRound = false, roundWinner = 'hero') {
    gameState.playerScore = 0; gameState.enemyScore = 0; 
    if (isFirstRound) { gameState.playerLives = 3; gameState.enemyLives = gameState.enemyStartLives; gameState.heroRounds = 0; gameState.enemyRounds = 0; }
    gameState.playerShadow = 0; gameState.playerEspoir = 3; gameState.enemyAcharnementCount = 0; gameState.enemyHate = gameState.enemyMaxHate; gameState.matchStats.turnsPlayedThisRound = 0;
    updateGlobalUI(); updateEspoirUI(); updateHaineUI(); updateLivesUI(); updateShadowUI(); gameState.activePlayer = roundWinner;
    if (isFirstRound) { updateDialogue('dirhael', 'greetings', 'ui-hero-dialogue'); updateDialogue(gameState.currentEnemyId, 'greetings', 'ui-enemy-dialogue'); }
    switchTurn(true);
}

function exitDuel() { document.body.className = ''; document.getElementById('duel-screen').style.display = 'none'; document.getElementById('tavern-screen').style.display = 'block'; audioManager.playBGM('tavern'); checkAchievements(); }

function switchTurn(isInit = false) {
    if (!isInit) gameState.activePlayer = (gameState.activePlayer === 'hero') ? 'enemy' : 'hero';
    if (gameState.activePlayer === 'hero') gameState.matchStats.turnsPlayedThisRound++;
    if (gameState.playerShadow >= 3) gameState.matchStats.consecutiveShadowMaxTurns++; else gameState.matchStats.consecutiveShadowMaxTurns = 0;
    gameState.turnScore = 0; gameState.diceStates = ['idle', 'idle', 'idle', 'idle', 'idle']; gameState.diceValues = [0, 0, 0, 0, 0]; gameState.hasKeptDieThisRoll = false; gameState.pendingDeroute = false;
    document.getElementById('current-turn-score').innerHTML = `0 <span>${t('ui_leagues')}</span>`; createDice(); resetTurnControls();
    const btnRoll = document.getElementById('btn-roll'); const btnStop = document.getElementById('btn-stop');
    if (gameState.activePlayer === 'hero') { if(btnRoll) btnRoll.disabled = false; if(btnStop) btnStop.disabled = true; updateStatus(t('status_turn_hero'), "var(--bone)"); } else { if(btnRoll) btnRoll.disabled = true; if(btnStop) btnStop.disabled = true; updateStatus(t('status_turn_enemy'), "var(--enemy-color)"); setTimeout(playEnemyTurn, 1500); }
}

function createDice() {
    const arena = document.getElementById('dice-arena'); arena.innerHTML = ''; const skinClass = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';
    for (let i = 0; i < 5; i++) { const wrapper = document.createElement('div'); wrapper.className = 'die-wrapper'; wrapper.id = `wrap-${i}`; wrapper.onclick = () => { if (gameState.activePlayer === 'hero') toggleKeepDie(i); }; wrapper.innerHTML = `<div class="die die-idle ${skinClass}" id="die-${i}"><span class="die-val" id="val-${i}">-</span></div>`; arena.appendChild(wrapper); }
}

async function rollAnimation(diceToRoll) {
    audioManager.playSFX('audio/dice.mp3', 0.15);
    diceToRoll.forEach(idx => { document.getElementById(`wrap-${idx}`).classList.add('rolling'); let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${idx}`).className = `die die-idle ${skin}`; });
    const scramble = setInterval(() => { diceToRoll.forEach(idx => { if (document.getElementById(`wrap-${idx}`).classList.contains('rolling')) { document.getElementById(`val-${idx}`).innerText = Math.floor(Math.random() * 6) + 1; } }); }, 50);
    const dicePools = { 0: [1,2,3,4,5,6], 1: [1,1,2,3,3,4,5,6], 2: [1,1,1,2,2,3,3,4,5,6], 3: [1,1,1,1,1,2,2,2,3,3,3,4,4,5,6] };
    for (let i = 0; i < diceToRoll.length; i++) {
        let delay = 200 + (i * 100); if (i === diceToRoll.length - 1 && diceToRoll.length > 1) delay += 300; await new Promise(res => setTimeout(res, delay));
        let idx = diceToRoll[i]; const wrapEl = document.getElementById(`wrap-${idx}`); const dieEl = document.getElementById(`die-${idx}`); const valEl = document.getElementById(`val-${idx}`); wrapEl.classList.remove('rolling');
        let val; if (gameState.activePlayer === 'hero') { let poolIndex = Math.min(gameState.playerShadow, 3); let pool = dicePools[poolIndex]; val = pool[Math.floor(Math.random() * pool.length)]; } else { val = Math.floor(Math.random() * 6) + 1; }
        gameState.diceValues[idx] = val; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';
        if (val === 1) { gameState.diceStates[idx] = 'locked'; dieEl.className = `die die-danger ${skin}`; wrapEl.classList.add('pulse-danger'); valEl.innerText = "1"; } 
        else if (val === 6) { dieEl.className = `die die-triumph ${skin}`; valEl.innerText = "6"; } else if (val >= 4) { dieEl.className = `die die-advance ${skin}`; valEl.innerText = val; } else { dieEl.className = `die die-neutral ${skin}`; valEl.innerText = val; }
    } clearInterval(scramble);
}

async function playHeroTurn() {
    if (gameState.isRolling || gameState.activePlayer !== 'hero') return; gameState.isRolling = true; gameState.hasKeptDieThisRoll = false; 
    let btnRoll = document.getElementById('btn-roll'); let btnStop = document.getElementById('btn-stop'); if (btnRoll) btnRoll.disabled = true; if (btnStop) btnStop.disabled = true; updateStatus(t('status_rolling'), "#aaa");
    const diceToRoll = []; for(let i=0; i<5; i++) { if (gameState.diceStates[i] === 'idle') diceToRoll.push(i); } gameState.currentHeroRolledIndices = diceToRoll; 
    await rollAnimation(diceToRoll); await new Promise(r => setTimeout(r, 800)); await evaluateHeroRoll(diceToRoll, false); gameState.isRolling = false;
}

async function evaluateHeroRoll(rolledIndices, isReevaluation = false) {
    let rollCountTens = rolledIndices.filter(idx => gameState.diceValues[idx] === 6).length; let rollCountOnes = rolledIndices.filter(idx => gameState.diceValues[idx] === 1).length;
    if (!isReevaluation) {
        if (rollCountTens >= 3) {
            rolledIndices.forEach(idx => { if(gameState.diceValues[idx] >= 4) { gameState.diceStates[idx] = 'kept'; document.getElementById(`wrap-${idx}`).classList.add('wrap-kept'); } });
            recalculateScore(); let gained = gameState.turnScore; gameState.playerScore += gained; updateGlobalUI(); playerProfile.stats.totalLeagues += gained; saveProfile(); addXP(10);
            if(!playerProfile.achievements.maitreFondcombe) { playerProfile.achievements.maitreFondcombe = true; saveProfile(); }
            let actionCallback = (gameState.playerScore >= gameState.targetScore) ? () => { resolveRoundWinner('hero'); } : () => { switchTurn(true); };
            showEventScreen(t('ev_pas_title'), t('ev_pas_msg', {val: gained}), t('ev_pas_btn'), actionCallback, "var(--gold)"); return; 
        }
        if (rollCountOnes >= 3) { audioManager.playSFX('audio/hit.mp3', 0.25); gameState.playerEspoir = 0; updateEspoirUI(); showEventScreen(t('ev_gouffre_title'), t('ev_gouffre_msg'), t('ev_gouffre_btn'), () => { handleDeroute('hero'); }, "var(--blood)"); return; }

        let activeAI = gameState.currentEnemyId; if (activeAI === 'letranger') { activeAI = ['brag', 'zamin', 'kael'][Math.floor(Math.random() * 3)]; } let sabotageOccurred = false;
        if (gameState.enemyHate > 0 && gameState.activePlayer === 'hero') {
            if (activeAI === 'kael') {
                let tenIdx = rolledIndices.find(idx => gameState.diceValues[idx] === 6);
                if (tenIdx !== undefined) { updateStatus(t('status_sabotage_kael'), "var(--blood)"); await new Promise(r => setTimeout(r, 1200)); gameState.enemyHate--; updateHaineUI(); gameState.diceValues[tenIdx] = 1; gameState.diceStates[tenIdx] = 'locked'; document.getElementById(`val-${tenIdx}`).innerText = "1"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${tenIdx}`).className = `die die-danger ${skin}`; document.getElementById(`wrap-${tenIdx}`).classList.add('pulse-danger'); updateDialogue(gameState.currentEnemyId, 'hope_hate', 'ui-enemy-dialogue'); updateStatus(t('status_sabotage_kael_res'), "var(--blood)"); sabotageOccurred = true; }
            } else if (activeAI === 'brag') {
                let scoringDice = rolledIndices.filter(idx => gameState.diceValues[idx] >= 4).sort((a,b) => gameState.diceValues[b] - gameState.diceValues[a]); 
                if (scoringDice.length > 0) { let stolenIdx = scoringDice[0]; updateStatus(t('status_sabotage_brag'), "var(--blood)"); await new Promise(r => setTimeout(r, 1200)); gameState.enemyHate--; updateHaineUI(); gameState.diceValues[stolenIdx] = 0; gameState.diceStates[stolenIdx] = 'sacrificed'; document.getElementById(`val-${stolenIdx}`).innerText = "X"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${stolenIdx}`).className = `die die-sacrificed ${skin}`; document.getElementById(`wrap-${stolenIdx}`).classList.remove('wrap-kept'); updateDialogue(gameState.currentEnemyId, 'hope_hate', 'ui-enemy-dialogue'); updateStatus(t('status_sabotage_brag_res'), "var(--blood)"); sabotageOccurred = true; }
            } else if (activeAI === 'zamin') {
                let neutralDice = rolledIndices.filter(idx => gameState.diceValues[idx] === 2 || gameState.diceValues[idx] === 3);
                if (neutralDice.length > 0) { let lockedIdx = neutralDice[0]; updateStatus(t('status_sabotage_zamin'), "var(--enemy-color)"); await new Promise(r => setTimeout(r, 1200)); gameState.enemyHate--; updateHaineUI(); gameState.diceStates[lockedIdx] = 'sacrificed'; document.getElementById(`val-${lockedIdx}`).innerText = "X"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${lockedIdx}`).className = `die die-sacrificed ${skin}`; updateDialogue(gameState.currentEnemyId, 'hope_hate', 'ui-enemy-dialogue'); updateStatus(t('status_sabotage_zamin_res'), "var(--enemy-color)"); sabotageOccurred = true; }
            }
            if (sabotageOccurred) await new Promise(r => setTimeout(r, 2000)); 
        } else if (gameState.enemyHate === 0 && gameState.activePlayer === 'hero' && !sabotageOccurred) {
            let isLosing = gameState.enemyScore <= gameState.playerScore; let canAffordScore = gameState.enemyScore >= 15;
            if (isLosing) {
                let tenIdx = rolledIndices.find(idx => gameState.diceValues[idx] === 6);
                if (tenIdx !== undefined && (canAffordScore || gameState.enemyLives > 1)) {
                    if (Math.random() < 0.60) {
                        gameState.enemyAcharnementCount++; let risk = Math.min(gameState.enemyAcharnementCount * 25, 90);
                        updateStatus(t('status_acharnement', {chance: risk}), "var(--blood)"); await new Promise(r => setTimeout(r, 1500));
                        if (Math.random() * 100 < risk) { if (canAffordScore) { updateStatus(t('status_acharnement_fail_score'), "var(--blood)"); audioManager.playSFX('audio/hit.mp3', 0.25); gameState.enemyScore -= 15; updateGlobalUI(); } else { updateStatus(t('status_acharnement_fail_life'), "var(--blood)"); audioManager.playSFX('audio/hit.mp3', 0.25); gameState.enemyLives--; updateLivesUI(); } await new Promise(r => setTimeout(r, 2000)); if (gameState.enemyLives <= 0) { showEndScreen(t('end_vic_title'), t('end_vic_msg'), t('end_vic_btn'), () => { exitDuel(); }, "var(--gold)"); return; } } else { updateStatus(t('status_acharnement_success'), "var(--enemy-color)"); await new Promise(r => setTimeout(r, 1200)); gameState.diceValues[tenIdx] = 1; gameState.diceStates[tenIdx] = 'locked'; document.getElementById(`val-${tenIdx}`).innerText = "1"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${tenIdx}`).className = `die die-danger ${skin}`; document.getElementById(`wrap-${tenIdx}`).classList.add('pulse-danger'); updateDialogue(gameState.currentEnemyId, 'hope_hate', 'ui-enemy-dialogue'); updateStatus(t('status_sabotage_kael_res'), "var(--blood)"); await new Promise(r => setTimeout(r, 2000)); }
                    }
                }
            }
        }
    }

    let countLockedTotal = 0; let hasScoringDiceInThisRoll = false; let hasDangerInThisRoll = false;
    for (let i = 0; i < 5; i++) { if (gameState.diceStates[i] === 'locked') countLockedTotal++; }
    rolledIndices.forEach(idx => { if (gameState.diceStates[idx] === 'locked') hasDangerInThisRoll = true; if (gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= 4) hasScoringDiceInThisRoll = true; });

    let isDeroute = (countLockedTotal >= 2) || (rolledIndices.length > 0 && !hasScoringDiceInThisRoll && hasDangerInThisRoll);
    if (isDeroute) {
        gameState.pendingDeroute = true; let tenIndex = gameState.diceValues.findIndex((v, i) => v === 6 && (gameState.diceStates[i] === 'idle' || gameState.diceStates[i] === 'kept')); let hasTools = (gameState.playerEspoir > 0 || tenIndex !== -1);
        updateStatus(t('status_deroute_imminent'), "var(--blood)"); let controlsHTML = ''; if (hasTools) controlsHTML += `<button onclick="hintPurify()" style="background: var(--gold); color: #000; border-color: var(--gold);">${t('btn_defend')}</button>`; controlsHTML += `<button onclick="acceptDeroute()">${t('btn_suffer')}</button>`; document.getElementById('turn-controls').innerHTML = controlsHTML; return;
    }
    
    gameState.pendingDeroute = false;
    if (!hasDangerInThisRoll && !hasScoringDiceInThisRoll && rolledIndices.length > 0) {
        if (gameState.playerEspoir > 0) { updateDialogue('dirhael', 'impasse', 'ui-hero-dialogue'); updateStatus(t('status_impasse_ask'), "var(--gold)"); document.getElementById('turn-controls').innerHTML = `<button onclick="useBoussole()" style="background: var(--gold); color: #000;">${t('btn_compass')}</button><button onclick="declineBoussole()">${t('btn_accept_defeat')}</button>`; return; } 
        else { updateDialogue('dirhael', 'impasse', 'ui-hero-dialogue'); updateStatus(t('status_impasse_lost'), "var(--blood)"); document.getElementById('turn-controls').innerHTML = ''; setTimeout(switchTurn, 2500); return; }
    }
    resetTurnControls(); updateStatus(t('status_select_dice'), "var(--bone)");
}

function acceptDeroute() { 
    gameState.pendingDeroute = false; 
    document.getElementById('turn-controls').innerHTML = ''; // Correction Exploit
    handleDeroute('hero'); 
}
function hintPurify() { updateStatus(t('status_action_purify'), "var(--gold)"); }

async function toggleKeepDie(index) {
    if (gameState.isRolling || gameState.activePlayer !== 'hero') return; const val = gameState.diceValues[index]; const state = gameState.diceStates[index]; const wrapEl = document.getElementById(`wrap-${index}`);
    if (gameState.pendingDeroute && state !== 'locked') { updateStatus(t('status_urgency'), "var(--blood)"); return; }
    let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';

    if (state === 'locked') {
        let tenIndex = gameState.diceValues.findIndex((v, i) => v === 6 && (gameState.diceStates[i] === 'idle' || gameState.diceStates[i] === 'kept'));
        if (tenIndex !== -1 || gameState.playerEspoir > 0) {
            gameState.matchStats.defendsUsed++;
            if (tenIndex !== -1) {
                gameState.diceStates[tenIndex] = 'sacrificed'; gameState.diceValues[tenIndex] = 0; document.getElementById(`wrap-${tenIndex}`).classList.remove('wrap-kept'); document.getElementById(`val-${tenIndex}`).innerText = "X"; document.getElementById(`die-${tenIndex}`).className = `die die-sacrificed ${skin}`; updateStatus(t('status_purify_success'), "var(--gold)"); updateDialogue('dirhael', 'purify', 'ui-hero-dialogue'); 
                gameState.diceStates[index] = 'idle'; gameState.diceValues[index] = 0; document.getElementById(`val-${index}`).innerText = "-"; document.getElementById(`die-${index}`).className = `die die-idle ${skin}`; document.getElementById(`wrap-${index}`).classList.remove('pulse-danger');
                playerProfile.stats.purifications++; gameState.matchStats.purificationsThisMatch++; if(gameState.playerLives === 1) playerProfile.stats.routsSurvived++; addXP(10); saveProfile();
                recalculateScore(); await evaluateHeroRoll(gameState.currentHeroRolledIndices, true); return;
            } else {
                gameState.playerEspoir--; updateEspoirUI(); updateDialogue('dirhael', 'hope_hate', 'ui-hero-dialogue'); updateStatus(t('status_hope_used'), "var(--gold)"); document.getElementById('turn-controls').innerHTML = ''; 
                gameState.diceStates[index] = 'idle'; document.getElementById(`val-${index}`).innerText = "-"; document.getElementById(`die-${index}`).className = `die die-idle ${skin}`; document.getElementById(`wrap-${index}`).classList.remove('pulse-danger');
                gameState.isRolling = true; await rollAnimation([index]); await new Promise(r => setTimeout(r, 800)); gameState.isRolling = false; await evaluateHeroRoll(gameState.currentHeroRolledIndices, true); return;
            }
        } else { if (gameState.pendingDeroute) { updateStatus(t('status_deroute_forced'), "var(--blood)"); document.getElementById('turn-controls').innerHTML = `<button onclick="acceptDeroute()">${t('btn_suffer')}</button>`; } else { updateStatus(t('status_cannot_purify'), "var(--blood)"); } return; }
    }
    if (val >= 4 && state !== 'locked' && state !== 'sacrificed') {
        if (state === 'idle') { gameState.diceStates[index] = 'kept'; wrapEl.classList.add('wrap-kept'); gameState.hasKeptDieThisRoll = true; } else if (state === 'kept') { gameState.diceStates[index] = 'idle'; wrapEl.classList.remove('wrap-kept'); }
        let remainingLocked = gameState.diceStates.filter(s => s === 'locked').length; recalculateScore(); if (remainingLocked >= 2) { document.getElementById('btn-roll').disabled = true; document.getElementById('btn-stop').disabled = true; }
    }
}

function resetTurnControls() { document.getElementById('turn-controls').innerHTML = `<button id="btn-roll" onclick="playHeroTurn()">${t('ui_btn_roll')}</button><button id="btn-stop" onclick="initiateCamp()" disabled>${t('ui_btn_stop')}</button>`; recalculateScore(); }
function declineBoussole() { 
    document.getElementById('turn-controls').innerHTML = ''; // Correction Exploit
    updateStatus(t('status_impasse_accepted'), "var(--blood)"); 
    updateDialogue('dirhael', 'failure', 'ui-hero-dialogue'); 
    setTimeout(switchTurn, 2500); 
}
function useBoussole() { gameState.playerEspoir--; updateEspoirUI(); gameState.matchStats.compassUsedThisMatch++; resetTurnControls(); updateDialogue('dirhael', 'hope_hate', 'ui-hero-dialogue'); updateStatus(t('status_compass_used'), "var(--gold)"); setTimeout(() => { playHeroTurn(); }, 1000); }
function initiateCamp() {
    if (gameState.activePlayer !== 'hero') return; let keptSixes = gameState.diceStates.reduce((acc, state, idx) => { if (state === 'kept' && gameState.diceValues[idx] === 6) acc.push(idx); return acc; }, []);
    if (keptSixes.length > 0 && gameState.playerEspoir < 3) { updateStatus(t('status_camp_choice'), "var(--gold)"); document.getElementById('turn-controls').innerHTML = `<button onclick="executeCampSacrifice(${keptSixes[0]})" style="border-color: var(--gold); color: var(--gold);">${t('btn_camp_sacrifice')}</button><button onclick="executeCampNormal()">${t('btn_camp_normal')}</button>`; } else { bankScore(); }
}
function executeCampNormal() { document.getElementById('turn-controls').innerHTML = ''; bankScore(); }
function executeCampSacrifice(idx) {
    document.getElementById('turn-controls').innerHTML = ''; gameState.diceStates[idx] = 'sacrificed'; gameState.diceValues[idx] = 0; document.getElementById(`wrap-${idx}`).classList.remove('wrap-kept'); document.getElementById(`val-${idx}`).innerText = "X"; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`die-${idx}`).className = `die die-sacrificed ${skin}`;
    gameState.playerEspoir++; updateEspoirUI(); recalculateScore(); playerProfile.eclatsOmbre += 1; addXP(10); setTimeout(() => { bankScore(); }, 800); 
}

// ==========================================
// 6. TOUR DE L'IA
// ==========================================
async function playEnemyTurn() { if (gameState.activePlayer !== 'enemy') return; gameState.isRolling = true; gameState.hasKeptDieThisRoll = false; updateStatus(t('status_rolling'), "var(--enemy-color)"); const diceToRoll = []; for(let i=0; i<5; i++) { if (gameState.diceStates[i] === 'idle') diceToRoll.push(i); } await rollAnimation(diceToRoll); await new Promise(r => setTimeout(r, 800)); evaluateEnemyRoll(diceToRoll); gameState.isRolling = false; }
function evaluateEnemyRoll(rolledIndices) {
    let rollCountTens = rolledIndices.filter(idx => gameState.diceValues[idx] === 6).length; let rollCountOnes = rolledIndices.filter(idx => gameState.diceValues[idx] === 1).length;
    if (rollCountTens >= 3) { rolledIndices.forEach(idx => { if(gameState.diceValues[idx] >= 4) { gameState.diceStates[idx] = 'kept'; document.getElementById(`wrap-${idx}`).classList.add('wrap-kept'); } }); recalculateScore(); let gained = gameState.turnScore; gameState.enemyScore += gained; updateGlobalUI(); let actionCallback = (gameState.enemyScore >= gameState.targetScore) ? () => { resolveRoundWinner('enemy'); } : () => { switchTurn(true); }; showEventScreen(t('ev_elan_title'), t('ev_elan_msg', {val: gained}), t('ev_elan_btn'), actionCallback, "var(--corruption)"); return; }
    if (rollCountOnes >= 3) { audioManager.playSFX('audio/hit.mp3', 0.25); gameState.enemyHate = 0; updateHaineUI(); showEventScreen(t('ev_malediction_title'), t('ev_malediction_msg'), t('ev_malediction_btn'), () => { handleDeroute('enemy'); }, "var(--gold)"); return; }
    let threshold = (gameState.enemyScore >= 80) ? 4 : 5; let targetIdx = -1; let maxVal = -1; rolledIndices.forEach(idx => { if (gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= threshold) { if (gameState.diceValues[idx] > maxVal) { maxVal = gameState.diceValues[idx]; targetIdx = idx; } } });
    if (targetIdx !== -1 && maxVal >= 5) { gameState.currentEnemyRolledIndices = rolledIndices; gameState.currentEnemyTargetIdx = targetIdx; document.getElementById(`die-${targetIdx}`).style.boxShadow = "0 0 25px var(--corruption)"; let btnText = maxVal === 6 ? t('btn_corrupt') : t('btn_devour'); let statusText = maxVal === 6 ? t('status_shadow_6') : t('status_shadow_other', {val: maxVal}); updateStatus(statusText, "var(--corruption)"); document.getElementById('turn-controls').innerHTML = `<button onclick="corruptEnemyDie()" style="background: var(--corruption); color: #fff; border-color: var(--corruption);">${btnText}</button><button onclick="ignoreEnemyDie()" style="border-color: #555; color: #888;">${t('btn_ignore')}</button>`; return; }
    resumeEnemyRoll(rolledIndices);
}
function corruptEnemyDie() {
    let idx = gameState.currentEnemyTargetIdx; let val = gameState.diceValues[idx]; audioManager.playSFX('audio/shadow.mp3', 0.2); gameState.playerShadow++; updateShadowUI();
    playerProfile.stats.shadowsUsed++; gameState.matchStats.shadowsUsedThisRound++; addXP(5); saveProfile();
    let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : '';
    if (val === 6) { gameState.diceValues[idx] = 1; gameState.diceStates[idx] = 'locked'; document.getElementById(`val-${idx}`).innerText = "1"; document.getElementById(`die-${idx}`).className = `die die-danger ${skin}`; document.getElementById(`wrap-${idx}`).classList.add('pulse-danger'); updateStatus(t('status_shadow_corrupt'), "var(--corruption)"); } 
    else { gameState.diceValues[idx] = 0; gameState.diceStates[idx] = 'sacrificed'; document.getElementById(`val-${idx}`).innerText = "X"; document.getElementById(`die-${idx}`).className = `die die-sacrificed ${skin}`; updateStatus(t('status_shadow_devour', {val: val}), "var(--corruption)"); }
    document.getElementById(`die-${idx}`).style.boxShadow = ""; updateDialogue('dirhael', 'shadow', 'ui-hero-dialogue'); document.getElementById('turn-controls').innerHTML = ''; 
    if (gameState.playerShadow >= 4) { let deathChance = Math.min((gameState.playerShadow - 3) * 25, 90); let roll = Math.random() * 100; if (roll < deathChance) { if(deathChance >= 90 && !playerProfile.achievements.maledictionAnneau) { playerProfile.achievements.maledictionAnneau = true; saveProfile(); } setTimeout(() => { showEndScreen(t('end_shadow_title'), t('end_shadow_msg', {chance: deathChance}), t('end_shadow_btn'), () => { exitDuel(); }, "var(--blood)"); }, 1500); return; } else { setTimeout(() => { updateStatus(t('status_shadow_survive', {chance: deathChance}), "var(--blood)"); setTimeout(() => { resumeEnemyRoll(gameState.currentEnemyRolledIndices); }, 2000); }, 1500); return; } } setTimeout(() => { resumeEnemyRoll(gameState.currentEnemyRolledIndices); }, 1500);
}
function ignoreEnemyDie() { document.getElementById(`die-${gameState.currentEnemyTargetIdx}`).style.boxShadow = ""; document.getElementById('turn-controls').innerHTML = ''; resumeEnemyRoll(gameState.currentEnemyRolledIndices); }
function resumeEnemyRoll(rolledIndices) {
    let countLockedTotal = 0; let hasScoringDiceInThisRoll = false; let hasDangerInThisRoll = false; for (let i = 0; i < 5; i++) { if (gameState.diceStates[i] === 'locked') countLockedTotal++; }
    rolledIndices.forEach(idx => { if (gameState.diceStates[idx] === 'locked') hasDangerInThisRoll = true; if (gameState.diceStates[idx] === 'idle' && gameState.diceValues[idx] >= 4) hasScoringDiceInThisRoll = true; });
    let isDeroute = (countLockedTotal >= 2) || (rolledIndices.length > 0 && !hasScoringDiceInThisRoll && hasDangerInThisRoll);
    if (isDeroute) { let tenIndex = gameState.diceValues.findIndex((v, i) => v === 6 && (gameState.diceStates[i] === 'idle' || gameState.diceStates[i] === 'kept')); if (tenIndex !== -1) { let oneIndex = gameState.diceStates.findIndex(s => s === 'locked'); gameState.diceStates[tenIndex] = 'sacrificed'; gameState.diceValues[tenIndex] = 0; gameState.diceStates[oneIndex] = 'idle'; gameState.diceValues[oneIndex] = 0; let skin = playerProfile.equipped.dice !== 'classic' ? `skin-${playerProfile.equipped.dice}` : ''; document.getElementById(`val-${tenIndex}`).innerText = "X"; document.getElementById(`die-${tenIndex}`).className = `die die-sacrificed ${skin}`; document.getElementById(`wrap-${tenIndex}`).classList.remove('wrap-kept'); document.getElementById(`val-${oneIndex}`).innerText = "-"; document.getElementById(`die-${oneIndex}`).className = `die die-idle ${skin}`; document.getElementById(`wrap-${oneIndex}`).classList.remove('pulse-danger'); updateDialogue(gameState.currentEnemyId, 'purify', 'ui-enemy-dialogue'); updateStatus(t('status_enemy_purify_6'), "var(--enemy-color)"); setTimeout(processEnemyDecision, 1500); return; } handleDeroute('enemy'); return; }
    if (!hasDangerInThisRoll && !hasScoringDiceInThisRoll && rolledIndices.length > 0) { updateDialogue(gameState.currentEnemyId, 'impasse', 'ui-enemy-dialogue'); updateStatus(t('status_enemy_impasse'), "var(--gold)"); setTimeout(switchTurn, 2500); return; } setTimeout(processEnemyDecision, 1000);
}
function processEnemyDecision() {
    for (let i = 0; i < 5; i++) { if (gameState.diceValues[i] >= 4 && gameState.diceStates[i] === 'idle') { gameState.diceStates[i] = 'kept'; gameState.hasKeptDieThisRoll = true; document.getElementById(`wrap-${i}`).classList.add('wrap-kept'); } } recalculateScore();
    setTimeout(() => { let idleCount = gameState.diceStates.filter(s => s === 'idle').length; let shouldStop = false; let activeAI = gameState.currentEnemyId; let risk = (activeAI === 'letranger') ? ['prudent', 'agressif', 'kamikaze'][Math.floor(Math.random() * 3)] : gameState.enemyRiskProfile; if (idleCount === 0) { shouldStop = true; } else { switch(risk) { case 'brag': case 'agressif': if (idleCount <= 1 || gameState.turnScore >= 18) shouldStop = true; break; case 'zamin': case 'prudent': if (idleCount <= 2 || gameState.turnScore >= 15) shouldStop = true; break; case 'kael': if (gameState.playerScore > 75 && gameState.enemyScore < 75) { if (idleCount === 0 || gameState.turnScore >= 25) shouldStop = true; } else { if (idleCount <= 1 || gameState.turnScore >= 14) shouldStop = true; } break; case 'kamikaze': if (idleCount === 0) shouldStop = true; break; } } if (shouldStop && gameState.turnScore > 0) { bankScore(); } else { playEnemyTurn(); } }, 1500);
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
        playerProfile.stats.deroutesTaken++; gameState.matchStats.deroutesThisMatch++; if(gameState.matchStats.turnsPlayedThisRound === 1) playerProfile.stats.firstTurnRouts++; saveProfile();
        if (gameState.playerLives <= 0) { playerProfile.stats.currentWinStreak = 0; saveProfile(); setTimeout(() => { showEndScreen(t('end_def_title'), t('end_def_msg'), t('end_def_btn'), () => { exitDuel(); }, "var(--blood)"); }, 2000); return; }
    } else {
        gameState.enemyLives--; updateLivesUI(); updateStatus(t('status_deroute_enemy'), "var(--gold)"); updateDialogue(gameState.currentEnemyId, 'failure', 'ui-enemy-dialogue');
        if (gameState.enemyLives <= 0) { setTimeout(() => { showEndScreen(t('end_vic_title'), t('end_vic_msg'), t('end_vic_btn'), () => { exitDuel(); }, "var(--gold)"); }, 2000); return; }
    } setTimeout(switchTurn, 2500);
}

function bankScore() {
    if (gameState.activePlayer === 'hero') { 
        gameState.playerScore += gameState.turnScore; updateDialogue('dirhael', 'camp', 'ui-hero-dialogue'); updateStatus(t('status_camp_hero'), "var(--gold)"); 
        playerProfile.stats.totalLeagues += gameState.turnScore; 
        let xpGained = Math.floor(gameState.turnScore / 2);
        const diffMultiplier = { brag: 1.0, zamin: 1.5, letranger: 1.75, kael: 2.0 };
        let mult = diffMultiplier[gameState.currentEnemyId] || 1.0;
        if (xpGained > 0) addXP(Math.floor(xpGained * mult));
        saveProfile(); 
    } 
    else { 
        gameState.enemyScore += gameState.turnScore; updateDialogue(gameState.currentEnemyId, 'camp', 'ui-enemy-dialogue'); updateStatus(t('status_camp_enemy'), "var(--enemy-color)"); 
    }
    
    updateGlobalUI();
    if(gameState.playerScore >= gameState.targetScore) { 
        if(!playerProfile.achievements.voieElfes && gameState.matchStats.deroutesThisMatch === 0) { playerProfile.achievements.voieElfes = true; saveProfile(); } 
        setTimeout(() => { resolveRoundWinner('hero'); }, 1500); return; 
    } 
    else if (gameState.enemyScore >= gameState.targetScore) { setTimeout(() => { resolveRoundWinner('enemy'); }, 1500); return; } 
    setTimeout(switchTurn, 1500);
}

function resolveRoundWinner(winner) {
    const diffMultiplier = { brag: 1.0, zamin: 1.5, letranger: 1.75, kael: 2.0 };
    let mult = diffMultiplier[gameState.currentEnemyId] || 1.0;

    if (winner === 'hero') {
        gameState.heroRounds++; updateGlobalUI(); addXP(Math.floor(15 * mult)); 
        if (gameState.heroRounds >= 2) { 
            playerProfile.stats.gamesWon++; 
            let eclatsEarned = Math.floor(10 * mult); playerProfile.eclatsOmbre += eclatsEarned; addXP(Math.floor(25 * mult)); 
            playerProfile.stats.currentWinStreak++; playerProfile.stats.winsAgainst[gameState.currentEnemyId]++;
            if(gameState.playerLives === 1) playerProfile.stats.gamesWonWith1Life++;
            if(gameState.matchStats.firstRoundLost) playerProfile.achievements.sermentParjures = true;
            saveProfile(); checkAchievements(); 
            let msg = currentLang === 'fr' ? `Victoire ! +${eclatsEarned} Éclats d'Ombre` : `Victory! +${eclatsEarned} Shards`;
            showToast(msg, "success");
            showEndScreen(t('end_vic_title'), t('end_vic_msg'), t('end_vic_btn'), () => { exitDuel(); }, "var(--gold)"); 
        } else { document.getElementById('reward-modal').style.display = 'flex'; }
    } else {
        gameState.enemyRounds++; updateGlobalUI();
        if(gameState.heroRounds === 0 && gameState.enemyRounds === 1) gameState.matchStats.firstRoundLost = true;
        if (gameState.enemyRounds >= 2) { 
            let eclatsConsolation = Math.floor(3 * mult); playerProfile.eclatsOmbre += eclatsConsolation; playerProfile.stats.currentWinStreak = 0; 
            saveProfile(); checkAchievements(); 
            let msg = currentLang === 'fr' ? `Défaite... +${eclatsConsolation} Éclats d'Ombre` : `Defeat... +${eclatsConsolation} Shards`;
            showToast(msg, "error");
            showEndScreen(t('end_def_title'), t('end_def_msg'), t('end_def_btn'), () => { exitDuel(); }, "var(--blood)"); 
        } else { showEndScreen(t('end_manche_lose_title'), t('end_manche_lose_msg'), t('end_manche_lose_btn'), () => { startNewRound(false, 'enemy'); }, "var(--blood)"); }
    }
}

function applyReward(choice) { document.getElementById('reward-modal').style.display = 'none'; if (choice === 'initiative') { startNewRound(false, 'hero'); } else if (choice === 'vie') { gameState.playerLives = Math.min(3, gameState.playerLives + 1); updateLivesUI(); startNewRound(false, 'enemy'); } }
function showEndScreen(t1, msg, btxt, cb, col) { const m = document.getElementById('end-modal'); const c = m.querySelector('.end-content'); document.getElementById('end-title').innerText = t1; document.getElementById('end-title').style.color = col; c.style.borderColor = col; c.style.boxShadow = `0 0 50px ${col}`; document.getElementById('end-message').innerText = msg; const b = document.getElementById('end-btn'); b.innerText = btxt; b.style.color = col; b.style.borderColor = col; b.onclick = () => { m.style.display = 'none'; cb(); }; m.style.display = 'flex'; }
function showEventScreen(t1, msg, btxt, cb, col) { const m = document.getElementById('event-modal'); const c = m.querySelector('.event-content'); document.getElementById('event-title').innerText = t1; document.getElementById('event-title').style.color = col; c.style.borderColor = col; c.style.boxShadow = `0 0 50px ${col}`; document.getElementById('event-message').innerText = msg; const b = document.getElementById('event-btn'); b.innerText = btxt; b.style.color = col; b.style.borderColor = col; b.onclick = () => { m.style.display = 'none'; cb(); }; m.style.display = 'flex'; }
function showRules() { document.getElementById('rules-modal').style.display = 'flex'; }
function hideRules() { document.getElementById('rules-modal').style.display = 'none'; if(document.getElementById('tavern-screen').style.display !== 'none') { audioManager.playBGM('tavern'); } }
function toggleSettings() { document.getElementById('settings-menu').classList.toggle('open'); }
document.addEventListener('click', (e) => { const menu = document.getElementById('settings-menu'); const btn = document.getElementById('settings-btn'); if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove('open'); });

// ==========================================
// 8. HAUTS FAITS & ARSENAL
// ==========================================
function checkAchievements() {
    let a = playerProfile.achievements; let s = playerProfile.stats; let ms = gameState.matchStats; let newlyUnlocked = false;
    
    if(!a.fardeauAnneau && ms.consecutiveShadowMaxTurns >= 3) { a.fardeauAnneau = true; unlockItem('titles', 'title_bearer'); newlyUnlocked = true; }
    if(!a.flammeUdun && s.routsSurvived >= 1) { a.flammeUdun = true; unlockItem('dice', 'moria'); newlyUnlocked = true; }
    if(!a.heritageNumenor && ms.turnsPlayedThisRound <= 2 && gameState.playerScore >= 100) { a.heritageNumenor = true; unlockItem('titles', 'title_bloodwest'); unlockItem('dice', 'numenor'); newlyUnlocked = true; }
    if(!a.maliceMorgoth && ms.shadowsUsedThisRound >= 5) { a.maliceMorgoth = true; newlyUnlocked = true; }
    if(!a.ruseSmaug && gameState.enemyScore >= 80 && gameState.enemyLives === 0 && (gameState.currentEnemyId==='brag'||gameState.currentEnemyId==='zamin')) { a.ruseSmaug = true; unlockItem('titles', 'title_thiefshadow'); newlyUnlocked = true; }
    if(!a.enduranceDunedain && ms.defendsUsed === 0 && (gameState.currentEnemyId==='kael'||gameState.currentEnemyId==='letranger') && gameState.heroRounds === 2) { a.enduranceDunedain = true; unlockItem('frames', 'star'); newlyUnlocked = true; }
    if(!a.fuiteComte && s.firstTurnRouts > 0) { a.fuiteComte = true; unlockItem('titles', 'title_hobbit'); newlyUnlocked = true; }
    if(!a.colereValar && ms.deroutesThisMatch >= 3 && gameState.heroRounds === 2) { a.colereValar = true; newlyUnlocked = true; }
    if(!a.fleauOmbre && ms.purificationsThisMatch >= 3) { a.fleauOmbre = true; newlyUnlocked = true; }
    if(!a.marcheurNuit && s.currentWinStreak >= 5) { a.marcheurNuit = true; newlyUnlocked = true; }
    if(!a.pillardGobelin && gameState.enemyScore === 0 && gameState.heroRounds === 2 && gameState.currentEnemyId === 'brag') { a.pillardGobelin = true; newlyUnlocked = true; }
    if(!a.negociateurNain && gameState.currentEnemyId === 'zamin' && gameState.heroRounds === 2 && gameState.playerLives === 1 && gameState.playerEspoir === 0) { a.negociateurNain = true; newlyUnlocked = true; }
    if(!a.bravoureHobbit && ms.compassUsedThisMatch >= 3 && gameState.heroRounds === 2) { a.bravoureHobbit = true; newlyUnlocked = true; }
    if(!a.tueurKael && s.winsAgainst.kael >= 5) { a.tueurKael = true; newlyUnlocked = true; }
    if(!a.enigmeObscurite && s.winsAgainst.letranger >= 3) { a.enigmeObscurite = true; newlyUnlocked = true; }
    if(!a.tueurBalrog && s.totalLeagues >= 50000) { a.tueurBalrog = true; newlyUnlocked = true; }
    if(!a.ombreMordor && s.gamesPlayed >= 100) { a.ombreMordor = true; newlyUnlocked = true; }
    if(!a.retourRoi && playerProfile.level >= 50) { a.retourRoi = true; newlyUnlocked = true; }
    if(!a.seigneurOuest && playerProfile.level >= 100) { a.seigneurOuest = true; newlyUnlocked = true; }

    if(playerProfile.level >= 5) unlockItem('dice', 'bone');
    if(playerProfile.level >= 10) { unlockItem('frames', 'iron'); unlockItem('titles', 'title_walker'); }
    if(playerProfile.level >= 20) unlockItem('dice', 'blood');
    if(playerProfile.level >= 30) { unlockItem('boards', 'bivouac'); unlockItem('titles', 'title_deathcheater'); }
    if(playerProfile.level >= 40) unlockItem('frames', 'gold');
    if(playerProfile.level >= 50) { unlockItem('dice', 'numenor'); unlockItem('titles', 'title_dunedain'); }
    if(playerProfile.level >= 70) unlockItem('frames', 'mist');
    if(playerProfile.level >= 80) unlockItem('boards', 'abyss');
    if(playerProfile.level >= 90) unlockItem('dice', 'void');
    if(playerProfile.level >= 100) { unlockItem('frames', 'crown'); unlockItem('titles', 'title_lordchance'); }
    
    if(newlyUnlocked) saveProfile();
}

function unlockItem(category, itemId) { if(!playerProfile.inventory[category].includes(itemId)) { playerProfile.inventory[category].push(itemId); } }
function openArsenal() { document.getElementById('arsenal-modal').style.display = 'flex'; switchArsenalTab('vestiaire'); }
function closeArsenal() { document.getElementById('arsenal-modal').style.display = 'none'; applyCosmetics(); }

const itemDict = {
    boards: { 
        dark: {name_fr:'Taverne Sombre', name_en:'Dark Tavern', price:0}, wood: {name_fr:'Bois Précieux', name_en:'Precious Wood', price:150}, stone: {name_fr:'Pierre Froide', name_en:'Cold Stone', price:200}, 
        runic: {name_fr:'Dalle Runique', name_en:'Runic Slab', price:300}, helm: {name_fr:'Fort-le-Cor', name_en:'Hornburg', price:500}, bivouac: {name_fr:'Bivouac', name_en:'Bivouac', price:0}, 
        abyss: {name_fr:'Abysses', name_en:'Abyss', price:0}, citeblanche: {name_fr:'La Cité Blanche', name_en:'The White City', price:800}, terresbrulees: {name_fr:'Terres Brûlées', name_en:'Scorched Earth', price:800},
        havre: {name_fr:'Havre de Paix', name_en:'Haven of Peace', price:1200}, moria: {name_fr:'Mines de la Moria', name_en:'Mines of Moria', price:1500}, lorien: {name_fr:'Forêt de Lórien', name_en:'Forest of Lórien', price:2000}
    },
    dice: { 
        classic: {name_fr:'Classique', name_en:'Classic', price:0}, bone: {name_fr:'Os Sculptés', name_en:'Carved Bone', price:0}, blood: {name_fr:'Pierre de Sang', name_en:'Bloodstone', price:0}, 
        void: {name_fr:'Dés du Vide', name_en:'Void Dice', price:0}, numenor: {name_fr:'Acier de l\'Ouest', name_en:'Steel of the West', price:0}, moria: {name_fr:'Cendres de Moria', name_en:'Ashes of Moria', price:0}, 
        goblin: {name_fr:'Acier Gobelin', name_en:'Goblin Steel', price:300}, orc: {name_fr:'Orque Noir', name_en:'Black Orc', price:400}, amethyst: {name_fr:'Améthyste', name_en:'Amethyst', price:500}, 
        forest: {name_fr:'Forêt Maudite', name_en:'Cursed Forest', price:500}, highelf: {name_fr:'Haut-Elfe', name_en:'High-Elf', price:750}, dwarf: {name_fr:'Saphir Nain', name_en:'Dwarven Sapphire', price:900}, 
        evenstar: {name_fr:'Étoile du Soir', name_en:'Evenstar', price:1500}, arkenstone: {name_fr:'Cristal d\'Arkenstone', name_en:'Arkenstone Crystal', price:2000}
    },
    frames: { 
        basic: {name_fr:'Classique', name_en:'Classic', price:0}, iron: {name_fr:'Fer Forgé', name_en:'Wrought Iron', price:0}, gold: {name_fr:'Or Massif', name_en:'Solid Gold', price:0}, 
        mist: {name_fr:'Aura Spectrale', name_en:'Spectral Aura', price:0}, star: {name_fr:'Étoile du Nord', name_en:'North Star', price:0}, crown: {name_fr:'Couronne Royale', name_en:'Royal Crown', price:0}, 
        thorns: {name_fr:'Ronces Maudites', name_en:'Cursed Thorns', price:600}, ent: {name_fr:'Bois d\'Ent', name_en:'Ent Wood', price:800}, shadow: {name_fr:'Ombre Rampante', name_en:'Creeping Shadow', price:1000}, 
        angelic: {name_fr:'Aura Angélique', name_en:'Angelic Aura', price:1500}, ice: {name_fr:'Glace de Forodwaith', name_en:'Ice of Forodwaith', price:2000}, darkflame: {name_fr:'Flamme Sombre', name_en:'Dark Flame', price:2500}, 
        eye: {name_fr:'L\'Œil', name_en:'The Eye', price:5000}
    }
};

const premiumTitles = { "title_reckless": 200, "title_orcblight": 400, "title_kingnocrown": 1000, "title_eternal": 2500, "title_lightbearer": 5000 };

const achievementsData = [
    { id: 'fardeauAnneau', t_fr: "Le Fardeau de l'Anneau", t_en: "The Burden of the Ring", d_fr: "Survivre 3 tours avec l'Ombre maximale.", d_en: "Survive 3 turns with max Shadow." },
    { id: 'flammeUdun', t_fr: "La Flamme d'Udûn", t_en: "Flame of Udûn", d_fr: "Sacrifier un 6 avec 1 seule Vie restante.", d_en: "Sacrifice a 6 with 1 Life remaining." },
    { id: 'heritageNumenor', t_fr: "L'Héritage de Númenor", t_en: "Legacy of Númenor", d_fr: "Gagner 100 Lieues en 2 tours.", d_en: "Win 100 Leagues in 2 turns." },
    { id: 'sermentParjures', t_fr: "Serment des Parjures", t_en: "Oath of the Oathbreakers", d_fr: "Gagner la partie après avoir perdu la 1ère manche.", d_en: "Win the game after losing the 1st round." },
    { id: 'maliceMorgoth', t_fr: "La Malice de Morgoth", t_en: "Malice of Morgoth", d_fr: "Corrompre/Dévorer 5 dés en un seul duel.", d_en: "Corrupt/Devour 5 dice in one duel." },
    { id: 'ruseSmaug', t_fr: "La Ruse de Smaug", t_en: "Cunning of Smaug", d_fr: "Tuer Brag ou Zâmin alors qu'ils ont plus de 80 points.", d_en: "Kill Brag or Zâmin while they have 80+ points." },
    { id: 'enduranceDunedain', t_fr: "L'Endurance des Dúnedain", t_en: "Endurance of the Dúnedain", d_fr: "Battre Kael/L'Étranger sans jamais utiliser la Défense.", d_en: "Beat Kael/Stranger without Defending." },
    { id: 'fuiteComte', t_fr: "Fuite de la Comté", t_en: "Flight from the Shire", d_fr: "Subir une déroute dès le premier tour.", d_en: "Suffer a rout on the very first turn." },
    { id: 'colereValar', t_fr: "La Colère des Valar", t_en: "Wrath of the Valar", d_fr: "Subir 3 Déroutes dans un duel et gagner.", d_en: "Suffer 3 Routs in a duel and win." },
    { id: 'pariIsildur', t_fr: "Le Pari d'Isildur", t_en: "Isildur's Gamble", d_fr: "Marquer plus de 35 Lieues en un seul jet.", d_en: "Score 35+ Leagues in a single roll." },
    { id: 'voieElfes', t_fr: "La Voie des Elfes", t_en: "Way of the Elves", d_fr: "Gagner une manche de 100 Lieues sans aucune Déroute.", d_en: "Win a round of 100 Leagues without a single Rout." },
    { id: 'fleauOmbre', t_fr: "Fléau de l'Ombre", t_en: "Bane of the Shadow", d_fr: "Purifier 3 Embuscades dans le même duel.", d_en: "Purify 3 Ambushes in the same duel." },
    { id: 'marcheurNuit', t_fr: "Marcheur de la Nuit", t_en: "Night Walker", d_fr: "Gagner 5 duels d'affilée.", d_en: "Win 5 duels in a row." },
    { id: 'pillardGobelin', t_fr: "Pillard de Gobelin", t_en: "Goblin Looter", d_fr: "Battre Brag en le laissant à 0 score.", d_en: "Beat Brag leaving him at 0 score." },
    { id: 'negociateurNain', t_fr: "Négociateur Nain", t_en: "Dwarven Negotiator", d_fr: "Battre Zâmin avec exactement 1 Vie et 0 Espoir.", d_en: "Beat Zâmin with exactly 1 Life and 0 Hope." },
    { id: 'tueurKael', t_fr: "Résistance du Gondor", t_en: "Gondor's Resistance", d_fr: "Vaincre Kael 5 fois au total.", d_en: "Defeat Kael 5 times total." },
    { id: 'enigmeObscurite', t_fr: "Énigme dans l'Obscurité", t_en: "Riddle in the Dark", d_fr: "Vaincre L'Étranger 3 fois au total.", d_en: "Defeat The Stranger 3 times total." },
    { id: 'maitreFondcombe', t_fr: "Maître de Fondcombe", t_en: "Master of Rivendell", d_fr: "Réussir un Succès Magistral (Trois 6).", d_en: "Achieve a Masterful Success (Three 6s)." },
    { id: 'maledictionAnneau', t_fr: "Malédiction de l'Anneau", t_en: "Curse of the Ring", d_fr: "Mourir de l'Ombre à 90% de risque.", d_en: "Die from Shadow at 90% risk." },
    { id: 'bravoureHobbit', t_fr: "Bravoure de Hobbit", t_en: "Hobbit's Bravery", d_fr: "Utiliser la Boussole 3 fois dans le même duel et gagner.", d_en: "Use the Compass 3 times in one duel and win." },
    { id: 'heritierElendil', t_fr: "Héritier d'Elendil", t_en: "Heir of Elendil", d_fr: "Acheter un objet de l'Arsenal d'une valeur de 5000 Éclats.", d_en: "Buy an Arsenal item worth 5000 Shards." },
    { id: 'tueurBalrog', t_fr: "Tueur de Balrog", t_en: "Balrog Slayer", d_fr: "Parcourir un total de 50 000 Lieues.", d_en: "Travel a total of 50,000 Leagues." },
    { id: 'ombreMordor', t_fr: "L'Ombre de Mordor", t_en: "Shadow of Mordor", d_fr: "Jouer 100 parties au total.", d_en: "Play 100 total matches." },
    { id: 'retourRoi', t_fr: "Le Retour du Roi", t_en: "Return of the King", d_fr: "Atteindre le Niveau 50.", d_en: "Reach Level 50." },
    { id: 'seigneurOuest', t_fr: "Seigneur de l'Ouest", t_en: "Lord of the West", d_fr: "Atteindre le Niveau 100.", d_en: "Reach Level 100." }
];

function switchArsenalTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); 
    const evtBtn = document.querySelector(`.tab-btn[onclick="switchArsenalTab('${tabName}')"]`);
    if(evtBtn) evtBtn.classList.add('active');
    const area = document.getElementById('arsenal-content-area'); area.innerHTML = '';

    if (tabName === 'stats') {
        area.innerHTML = `
            <div class="stats-list">
                <p>${t('stat_lvl')} <span>${playerProfile.level}</span></p>
                <p>${t('stat_xp')} <span>${Math.floor(playerProfile.xp)}</span></p>
                <p>${t('stat_leagues')} <span>${playerProfile.stats.totalLeagues}</span></p>
                <p>${t('stat_played')} <span>${playerProfile.stats.gamesPlayed}</span></p>
                <p>${t('stat_won')} <span>${playerProfile.stats.gamesWon}</span></p>
                <p>${t('stat_shadows')} <span>${playerProfile.stats.shadowsUsed}</span></p>
                <p>${t('stat_purif')} <span>${playerProfile.stats.purifications}</span></p>
                <p>${t('stat_routs')} <span>${playerProfile.stats.deroutesTaken}</span></p>
                <p style="font-size:14px; color:#888;">${t('stat_streak')} <span style="color:#5dade2;">${playerProfile.stats.currentWinStreak}</span></p>
                <p style="font-size:14px; color:#888;">${t('stat_1life')} <span>${playerProfile.stats.gamesWonWith1Life}</span></p>
            </div>
        `;
    } else if (tabName === 'achievements') {
        let html = ''; 
        achievementsData.forEach(a => { 
            let u = playerProfile.achievements[a.id]; 
            let achTitle = currentLang === 'fr' ? a.t_fr : a.t_en;
            let achDesc = currentLang === 'fr' ? a.d_fr : a.d_en;
            html += `<div class="achiev-item ${u ? 'unlocked' : ''}"><h3>${achTitle} ${u ? '✔️' : '🔒'}</h3><p>${achDesc}</p></div>`; 
        });
        area.innerHTML = html;
    } else if (tabName === 'vestiaire') {
        const renderEq = (title, key, dict) => {
            // Correspondance pluriel -> singulier pour vérifier si c'est équipé
            let equipKey = key;
            if (key === 'boards') equipKey = 'board';
            if (key === 'frames') equipKey = 'frame';

            let html = `<h3 style="color:var(--gold); border-bottom:1px solid #333; padding-bottom:5px;">${title}</h3><div class="arsenal-grid">`;
            for(let item in dict) {
                let isMarketItem = dict[item].price > 0;
                let itemName = currentLang === 'fr' ? dict[item].name_fr : dict[item].name_en;
                if(playerProfile.inventory[key].includes(item)) {
                    let isEq = playerProfile.equipped[equipKey] === item; // Vérification corrigée
                    html += `<div class="arsenal-item ${isEq ? 'equipped' : ''}"><h3>${itemName}</h3><button onclick="equipItem('${equipKey}', '${item}')">${isEq ? t('ui_btn_equipped') : t('ui_btn_equip')}</button></div>`;
                } else if (!isMarketItem) { 
                    html += `<div class="arsenal-item" style="opacity:0.4; border-color:#222; background: transparent;"><h3 style="color:#555;">???</h3><p style="margin-top:5px;">${t('ui_locked_lvl')}</p></div>`;
                }
            } html += `</div>`; return html;
        };
        let html = ""; html += renderEq(t('ui_ars_boards'), 'boards', itemDict.boards); html += renderEq(t('ui_ars_dice'), 'dice', itemDict.dice); html += renderEq(t('ui_ars_frames'), 'frames', itemDict.frames);
        let titlesHtml = `<h3 style="color:var(--gold); border-bottom:1px solid #333; padding-bottom:5px;">${t('ui_ars_titles')}</h3><div style="display:flex; flex-wrap:wrap; gap:10px;">`;
        playerProfile.inventory.titles.forEach(tKey => { let isEq = playerProfile.equipped.title === tKey; titlesHtml += `<button style="background:transparent; color:${isEq?'var(--gold)':'#888'}; border:1px solid ${isEq?'var(--gold)':'#333'}; padding:5px 10px; cursor:pointer;" onclick="equipItem('title', '${tKey}')">${t(tKey)}</button>`; });
        titlesHtml += `</div><br><br>`; html += titlesHtml; area.innerHTML = html;
    } else if (tabName === 'marche') {
        const renderShop = (title, key, dict) => {
            let html = `<h3 style="color:var(--corruption); border-bottom:1px solid #333; padding-bottom:5px;">${title}</h3><div class="arsenal-grid">`;
            for(let item in dict) {
                if(dict[item].price > 0 && !playerProfile.inventory[key].includes(item)) {
                    let itemName = currentLang === 'fr' ? dict[item].name_fr : dict[item].name_en;
                    html += `<div class="arsenal-item" style="border-color:var(--corruption);"><h3>${itemName}</h3><span class="arsenal-price">${dict[item].price} ✦</span><button style="background:var(--corruption); color:#fff; border:none; padding:8px;" onclick="buyItem('${key}', '${item}', ${dict[item].price})">${t('ui_btn_buy')}</button></div>`;
                }
            } html += `</div>`; return html;
        };
        let html = `<p style='color:#888; font-style:italic; margin-bottom: 20px;'>${t('ui_market_desc')}</p>`;
        html += renderShop(t('ui_ars_ex_boards'), 'boards', itemDict.boards); html += renderShop(t('ui_ars_ex_dice'), 'dice', itemDict.dice); html += renderShop(t('ui_ars_ex_frames'), 'frames', itemDict.frames);
        
        let htmlTitles = `<h3 style="color:var(--corruption); border-bottom:1px solid #333; padding-bottom:5px;">${t('ui_ars_ex_titles')}</h3><div class="arsenal-grid">`;
        for(let tKey in premiumTitles) {
            if(!playerProfile.inventory.titles.includes(tKey)) {
                htmlTitles += `<div class="arsenal-item" style="border-color:var(--corruption);"><h3>${t(tKey)}</h3><span class="arsenal-price">${premiumTitles[tKey]} ✦</span><button style="background:var(--corruption); color:#fff; border:none; padding:8px;" onclick="buyItem('titles', '${tKey}', ${premiumTitles[tKey]})">${t('ui_btn_buy')}</button></div>`;
            }
        } htmlTitles += `</div>`; html += htmlTitles; area.innerHTML = html;
    } else if (tabName === 'save') {
        area.innerHTML = `
            <div class="save-box">
                <h3 style="color:var(--gold); margin:0;">${t('save_title')}</h3>
                <p style="font-size:14px; color:#aaa; margin:0;">${t('save_desc1')}</p>
                <textarea id="export-area" class="save-textarea" readonly></textarea>
                <button onclick="generateExport()" style="background:var(--gold); color:#000;">${t('save_btn_gen')}</button>
                <hr style="border-color:#333; width:100%;">
                <p style="font-size:14px; color:#aaa; margin:0;">${t('save_desc2')}</p>
                <textarea id="import-area" class="save-textarea"></textarea>
                <button onclick="importSave()" style="background:var(--blood); border-color:var(--blood);">${t('save_btn_import')}</button>
            </div>
        `;
    }
}

function equipItem(category, item) { 
    // On force la clé au singulier pour la sauvegarde
    let equipKey = category;
    if (category === 'boards') equipKey = 'board';
    if (category === 'frames') equipKey = 'frame';
    if (category === 'titles') equipKey = 'title';
    
    playerProfile.equipped[equipKey] = item; 
    saveProfile(); 
    switchArsenalTab('vestiaire'); 
    applyCosmetics(); 
}

function buyItem(category, item, price) {
    if (playerProfile.eclatsOmbre >= price) {
        playerProfile.eclatsOmbre -= price; unlockItem(category, item); 
        if(price >= 5000 && !playerProfile.achievements.heritierElendil) playerProfile.achievements.heritierElendil = true; 
        saveProfile(); switchArsenalTab('marche'); showToast(t('toast_buy_ok'), "success");
    } else { showToast(t('toast_buy_fail'), "error"); }
}

function generateExport() {
    const encoded = btoa(JSON.stringify(playerProfile));
    const ta = document.getElementById('export-area'); ta.value = encoded; ta.select(); document.execCommand('copy');
    showToast(t('toast_copy_ok'), "success");
}

function importSave() {
    const code = document.getElementById('import-area').value;
    try {
        const decoded = JSON.parse(atob(code));
        if(decoded && decoded.level !== undefined) {
            playerProfile = decoded; saveProfile(); applyCosmetics(); showToast(t('toast_import_ok'), "success"); closeArsenal();
        } else throw new Error();
    } catch(e) { showToast(t('toast_import_fail'), "error"); }
}

// ==========================================
// 9. MODE DEBUG (TESTS QA)
// ==========================================
function debugAddXP() { 
    addXP(1000); 
    showToast("DEBUG: +1000 XP injectés", "success"); 
}

function debugAddShards() { 
    playerProfile.eclatsOmbre += 5000; 
    saveProfile(); 
    showToast("DEBUG: +5000 Éclats injectés", "success"); 
}

function debugUnlockAll() {
    for (let key in playerProfile.achievements) playerProfile.achievements[key] = true;
    for (let cat in itemDict) { for (let item in itemDict[cat]) { if (!playerProfile.inventory[cat].includes(item)) playerProfile.inventory[cat].push(item); } }
    for (let title in premiumTitles) { if (!playerProfile.inventory.titles.includes(title)) playerProfile.inventory.titles.push(title); }
    playerProfile.level = 100; 
    saveProfile(); 
    showToast("DEBUG: Tout est débloqué ! (Niv 100)", "success");
}

function debugForceWin() {
    if (document.getElementById('duel-screen').style.display === 'none') { 
        showToast("DEBUG: Lancez un duel d'abord !", "error"); return; 
    }
    gameState.playerScore = 100; 
    updateGlobalUI(); 
    resolveRoundWinner('hero'); 
    document.getElementById('settings-menu').classList.remove('open');
}

function debugReset() {
    if(confirm("DEBUG: Êtes-vous sûr de vouloir tout effacer ?")) { 
        localStorage.removeItem('rodeurProfile'); 
        location.reload(); 
    }
}

window.onload = () => { updateStaticUI(); updateProfileUI(); applyCosmetics(); };