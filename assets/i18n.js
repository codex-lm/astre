/*
 * Astre — interface multilingue (EN par défaut, FR, ES).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstreI18n = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var dict = {
    en: {
      tagline: "Asteroids, back from 1979",
      subtitle: "One rocket, one wrap-around sky, rocks that split. Modern touches: a dash you can trust, combo chains, drones and a mega-rock every fourth wave.",
      play: "Play",
      howTo: "How to play",
      rulesTitle: "How to play",
      rule1: "Steer with momentum: the rocket keeps drifting — short bursts, calm hands. The sky wraps around at every edge.",
      rule2: "Shoot the rocks. Big ones split into mediums, mediums into smalls; small ones vanish. Each kill within 2 s of the last raises the combo, up to ×8; otherwise it resets to ×1. Reaching ×8 triggers a brief slow-motion beat.",
      rule3: "DASH gives a quick burst along your nose and a heartbeat of immunity — it replaces the old risky hyperspace. It recharges in 2.5 s.",
      rule4: "Drones hunt you from wave 2; every fourth wave ends with a 12-HP mega-rock — destroy it to clear the wave. Extra life every 10 000 points.",
      rule5: "Round badges drop from the wrecks: triple fire (three chevrons), a shield (target ring), slow rocks (hourglass) and a rare golden star for an extra life. Grab them fast — they fade.",
      keysHint: "Arrows / WASD · Space: fire · Shift: dash · P: pause",
      hot: "HOT!",
      blaze: "ON FIRE!",
      touchHint: "Left stick steers · FIRE and DASH on the right",
      score: "Score",
      best: "Best",
      wave: "Wave",
      lives: "Lives",
      gameOver: "Game over",
      finalScore: "Final score",
      newBest: "New best!",
      replay: "Play again",
      menu: "Menu",
      paused: "Paused",
      resume: "Resume",
      langLabel: "Language",
      soundOn: "Sound on",
      soundOff: "Sound off",
      close: "Close",
      credit: "A game by Cédric Bernadac, created with AI agents.",
      gotIt: "Got it"
    },
    fr: {
      tagline: "Asteroids, revenu de 1979",
      subtitle: "Une fusée, un ciel qui boucle sur lui-même, des rochers qui se scindent. Touches modernes : un dash fiable, des combos, des drones et un méga-rocher à chaque quatrième vague.",
      play: "Jouer",
      howTo: "Comment jouer",
      rulesTitle: "Comment jouer",
      rule1: "Le pilotage est inertiel : la fusée continue de dériver — petites poussées, mains calmes. Le ciel boucle à chaque bord.",
      rule2: "Tirez sur les rochers. Les gros se scindent en moyens, les moyens en petits, les petits disparaissent. Chaque destruction à moins de 2 s de la précédente monte le combo, jusqu'à ×8 ; sinon il retombe à ×1. Atteindre ×8 déclenche un bref temps ralenti.",
      rule3: "Le DASH donne une impulsion dans l'axe du nez et un battement d'immunité — il remplace l'ancien hyperespace risqué. Il se recharge en 2,5 s.",
      rule4: "Les drones vous chassent dès la vague 2 ; chaque quatrième vague se termine par un méga-rocher à 12 PV — détruisez-le pour valider la vague. Vie supplémentaire tous les 10 000 points.",
      rule5: "Des badges ronds tombent des épaves : tir triple (trois chevrons), bouclier (cercle-cible), rochers ralentis (sablier) et une rare étoile d'or pour une vie de plus. Attrapez-les vite — ils s'effacent.",
      keysHint: "Flèches / ZQSD · Espace : tir · Maj : dash · P : pause",
      hot: "CHAUD !",
      blaze: "EN FEU !",
      touchHint: "Stick à gauche pour piloter · FEU et DASH à droite",
      score: "Score",
      best: "Record",
      wave: "Vague",
      lives: "Vies",
      gameOver: "Partie terminée",
      finalScore: "Score final",
      newBest: "Nouveau record !",
      replay: "Rejouer",
      menu: "Menu",
      paused: "En pause",
      resume: "Reprendre",
      langLabel: "Langue",
      soundOn: "Son activé",
      soundOff: "Son coupé",
      close: "Fermer",
      credit: "Un jeu de Cédric Bernadac, créé avec des agents IA.",
      gotIt: "Compris"
    },
    es: {
      tagline: "Asteroids, de vuelta desde 1979",
      subtitle: "Un cohete, un cielo que se envuelve en sí mismo, rocas que se parten. Toques modernos: un impulso fiable, combos, drones y una megarroca cada cuarta ola.",
      play: "Jugar",
      howTo: "Cómo jugar",
      rulesTitle: "Cómo jugar",
      rule1: "El pilotaje es inercial: el cohete sigue derivando — empujones cortos, manos tranquilas. El cielo se envuelve en cada borde.",
      rule2: "Dispara a las rocas. Las grandes se parten en medianas, las medianas en pequeñas, las pequeñas desaparecen. Cada destrucción a menos de 2 s de la anterior sube el combo, hasta ×8; si no, vuelve a ×1. Alcanzar ×8 activa un breve instante a cámara lenta.",
      rule3: "El DASH da un impulso en la dirección de la nariz y un latido de inmunidad — sustituye al viejo hipersalto arriesgado. Se recarga en 2,5 s.",
      rule4: "Los drones te cazan desde la ola 2; cada cuarta ola termina con una megarroca de 12 PV — destrúyela para superar la ola. Vida extra cada 10 000 puntos.",
      rule5: "De los restos caen insignias redondas: triple disparo (tres chevrones), escudo (anillo diana), rocas lentas (reloj de arena) y una rara estrella dorada para una vida extra. Cázalas rápido: se desvanecen.",
      keysHint: "Flechas / WASD · Espacio: disparo · Mayús: dash · P: pausa",
      hot: "¡CALIENTE!",
      blaze: "¡EN LLAMAS!",
      touchHint: "Stick a la izquierda para pilotar · FUEGO y DASH a la derecha",
      score: "Puntos",
      best: "Récord",
      wave: "Ola",
      lives: "Vidas",
      gameOver: "Fin de la partida",
      finalScore: "Puntuación final",
      newBest: "¡Nuevo récord!",
      replay: "Jugar otra vez",
      menu: "Menú",
      paused: "En pausa",
      resume: "Continuar",
      langLabel: "Idioma",
      soundOn: "Sonido activado",
      soundOff: "Sonido silenciado",
      close: "Cerrar",
      credit: "Un juego de Cédric Bernadac, creado con agentes de IA.",
      gotIt: "Entendido"
    }
  };
  return {
    langs: ['en', 'fr', 'es'],
    dict: dict,
    get: function (lang, key) {
      var d = dict[lang] || dict.en;
      return d[key] !== undefined ? d[key] : dict.en[key];
    }
  };
});
