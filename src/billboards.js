// Billboard catalog: posters along the course, by category. Each zone (config.js ZONES) lists
// the categories it shows; lines rotate as shuffled bags (no consecutive repeats, see jokes.js).
import { makePicker } from './jokes.js';

export const BILLBOARDS = {
  running: {
    label: 'RUNNING',
    accent: '#FF6B35',
    lines: [
      'Easy run: 4:05/km. Recupero attivo.',
      'Il PB non arriva da solo.',
      'Se non hai guardato il Garmin, è successo davvero?',
      'Oggi solo 5K. Sono già 14K.',
      'Lungo della domenica: 30 km e 300 foto.',
      'Ripetute da 400. Amici persi: 10.',
      'Defaticamento? Lo faccio in macchina.',
      'Scarpe nuove, stesso passo.',
      'Riscaldamento a 4:30. Il resto è segreto.',
    ],
  },
  trail: {
    label: 'TRAIL',
    accent: '#2BB673',
    lines: [
      'D+ 2000. D- autostima.',
      'In salita si cammina. Con stile.',
      'Bastoncini aperti, dignità chiusa.',
      'Il sentiero era segnato. Più o meno.',
      'Fango fino alle ginocchia: allenamento propriocettivo.',
      'Ultra da 100 km. Per staccare un po\'.',
      'Frontale accesa per un giro di un\'ora.',
      'Ristoro in quota: polenta e sali minerali.',
    ],
  },
  lifting: {
    label: 'PESI',
    accent: '#E5383B',
    lines: [
      'Deadlift day: domani niente scale.',
      'Il tuo RPE è direttamente proporzionale al rumore.',
      'Squat sotto il parallelo, ego sopra le stelle.',
      'Il gesso costa meno del fisioterapista.',
      'Panca piana: il lunedì è sacro.',
      'Una ripetizione in più. Poi il fisio.',
      'Cintura stretta, respiro trattenuto.',
      'Massimale testato. Schiena in revisione.',
    ],
  },
  gym: {
    label: 'PALESTRA',
    accent: '#9B5DE5',
    lines: [
      'Le gambe sono stanche? Oggi squat.',
      'Cardio? Ho fatto 12 serie di squat.',
      'Selfie allo specchio: serie numero 4.',
      'Leg day saltato. Polpacci da piccione.',
      'Pre-workout preso. Ora vedo i suoni.',
      'Il bilanciere non si rimette a posto da solo.',
      'Proteine ogni 3 ore. Anche di notte.',
      'Pump garantito. Cervello facoltativo.',
    ],
  },
  hyrox: {
    label: 'HYROX',
    accent: '#D5FF52',
    lines: [
      '8 km di corsa per poter fare burpee.',
      'Il tuo recupero è un altro sled push.',
      'No pain, no wall balls.',
      'La slitta pesa meno del tuo ego.',
      'Farmer\'s carry: anche la spesa conta.',
      'Roxzone: dove i sogni vanno a camminare.',
      'Lunges col sacco: le scale di casa ti temono.',
      'SkiErg: sciare senza neve, soffrire senza motivo.',
      'Doubles? Prima litighiamo sul pacing.',
    ],
  },
  triathlon: {
    label: 'TRIATHLON',
    accent: '#00B4D8',
    lines: [
      'Nuota, pedala, corri. Ripeti fino alla crisi.',
      'Hai comprato una bici più costosa della macchina.',
      'Transizione T2: dove sparisce la coordinazione.',
      'La muta entra in 20 minuti. Esce in 40.',
      'Tre sport, zero weekend.',
      'Gambe rasate per guadagnare 3 secondi.',
      'Il nuoto è il riscaldamento per lamentarsi.',
      'Body da gara: niente segreti.',
    ],
  },
  ironman: {
    label: 'IRONMAN',
    accent: '#E5383B',
    lines: [
      'Il weekend è libero. Hai solo 6 ore di bici.',
      '226 km per poter dire "Ironman" a cena.',
      'Tatuaggio prenotato prima del traguardo.',
      'Allenamento leggero: 4 ore. Rilassante.',
      'Famiglia avvisata: ci vediamo dopo la gara.',
      'Maratona finale: camminare è strategia.',
      'Sveglia alle 4. Nuoto alle 5. Pentimento alle 6.',
      '3,8 km a nuoto, 180 in bici e poi... corri.',
    ],
  },
  nutrition: {
    label: 'NUTRIZIONE',
    accent: '#FFC93C',
    lines: [
      'Gallette di riso e miele: carburante da campione.',
      'Gel al km 5. Panico intestinale al km 6.',
      'Carbo loading iniziato lunedì per una gara domenica.',
      'Hai più gel che calzini.',
      '90 g di carboidrati all\'ora. Anche in ufficio.',
      'Banana al ristoro: esperienza gourmet.',
      'Elettroliti nell\'acqua, nel caffè, nel cuore.',
      'Due gallette al miele e sei Kipchoge.',
    ],
  },
  garmin: {
    label: 'TECH SPORTIVA',
    accent: '#356BFF',
    lines: [
      'GPS acquisito. Ego ripristinato.',
      'Il Garmin dice recupero. L\'ego dice ripetute.',
      'Training readiness: 12. Motivazione: 100.',
      'Il GPS ha tagliato la curva. Il PB non vale.',
      'Hai controllato il VO2max prima di colazione?',
      'Il tuo Garmin ha bisogno di un Garmin.',
      'Il battito è alto. Ma hai visto il passo?',
      'Ricalcolo del percorso. Anche della tua vita.',
      'Body Battery: 5%. Uscita confermata.',
    ],
  },
  runclub: {
    label: 'RUNNING CLUB',
    accent: '#D5FF52',
    lines: [
      'Ritrovo 6:45. Partenza 7:20. Foto fino alle 8.',
      'Easy run del club: 4:05/km.',
      'Non è un run club: è un caffè con i lap.',
      'Run club: dove "piano" è un\'opinione.',
      'Nuovo membro? Prima la foto, poi la corsa.',
      'Il gruppo aspetta tutti. Tranne al segmento.',
      'Ultimo km insieme. Sprint individuale.',
      'Single benvenuti. Anche i lenti. Forse.',
    ],
  },
  recovery: {
    label: 'RECUPERO E SONNO',
    accent: '#7FD1B9',
    lines: [
      'Dormi 8 ore. Poi controlla l\'HRV.',
      'Rullo di schiuma: dolore a pagamento.',
      'Recupero attivo: 15 km a ritmo maratona.',
      'Il sonno è allenamento. Il pisolino è un lungo.',
      'Bagno di ghiaccio: urli in Z5.',
      'Giorno di riposo: 12.000 passi e una bici.',
      'Calze a compressione anche al matrimonio.',
      'Il fisio ti conosce per nome.',
    ],
  },
  // Spectator signs and banners of the marathon.
  marathon: {
    label: 'MARATONA',
    accent: '#FF6B35',
    lines: [
      'Manca poco! (Bugia.)',
      'Corri come se ci fosse il buffet all\'arrivo.',
      'Il muro è al km 30. Tu sei al 12.',
      'Spingi! Il Garmin ti guarda.',
      'Perché 42 km? Per la medaglia.',
      'Le tue gambe hanno chiesto il trasferimento.',
      'Toccami per un power-up.',
      'Sei più veloce del mio wi-fi.',
      'Sconosciuto, sono fiero di te.',
    ],
  },
};

const pickLine = makePicker(Object.fromEntries(Object.entries(BILLBOARDS).map(([k, c]) => [k, c.lines])));

let lastCategory = null;
// Next poster for a zone: never the same category twice in a row, lines never repeat back to back.
export function nextBillboard(categories) {
  const options = categories.length > 1 ? categories.filter((c) => c !== lastCategory) : categories;
  const category = options[(Math.random() * options.length) | 0];
  lastCategory = category;
  return { category, text: pickLine(category) };
}

export { pickLine as billboardLine };
