import { getRandomPortrait, UNKNOWN_PORTRAIT } from './portraitLibrary';

const FIRST_NAMES_MALE = [
  "Aldric", "Beron", "Cedric", "Darius", "Edmund", "Faelan", "Gareth", "Harald",
  "Ivar", "Jareth", "Kael", "Lucian", "Magnus", "Nolan", "Osric", "Percival",
  "Quinlan", "Roland", "Silas", "Theron", "Ulric", "Valen", "Warrick", "Xander"
];

const FIRST_NAMES_FEMALE = [
  "Aelara", "Brienne", "Cersei", "Daphne", "Elara", "Freya", "Gwendolyn", "Helena",
  "Isolde", "Joanna", "Katarina", "Lyanna", "Margaery", "Nymeria", "Ophelia", "Persephone",
  "Rhiannon", "Seraphina", "Talisa", "Ursula", "Valeria", "Willow", "Ygritte", "Zelda"
];

const TITLES_MALE = ["Lord", "Ser", "Prince", "King", "Duke", "Earl", "Baron", "Archduke"];
const TITLES_FEMALE = ["Lady", "Dame", "Princess", "Queen", "Duchess", "Countess", "Baroness", "Archduchess"];

const SPECIAL_RELATION_TYPES = ["rival", "mentor", "sworn_enemy", "lover", "oath_bound", "betrayer"];

const MOTTOS = [
  "Fire and Blood", "Winter is Coming", "Ours is the Fury", "Growing Strong",
  "Unbowed, Unbent, Unbroken", "We Do Not Sow", "Hear Me Roar", "Family, Duty, Honor",
  "As High as Honor", "Iron from Ice", "The North Remembers", "A Lannister Always Pays His Debts"
];

const EVENT_TYPES = [
  { title: "The Great War", iconType: "war", description: "A devastating conflict that reshaped the political landscape of the realm. Alliances were tested, kingdoms fell, and new powers emerged from the ashes of the old order.\n\nThe war lasted seven long years, claiming thousands of lives and leaving scars that would echo through generations." },
  { title: "Royal Wedding", iconType: "marriage", description: "A grand ceremony uniting two noble houses in matrimony. The festivities lasted for seven days and seven nights, with lords and ladies from across the realm in attendance.\n\nThis union would forge an alliance that changed the course of history." },
  { title: "The Plague Years", iconType: "plague", description: "A terrible sickness swept through the land, taking the lives of young and old alike. Entire villages were wiped out, and even the great lords were not spared.\n\nThose who survived would never forget the fear and loss that marked this dark chapter." },
  { title: "Conquest of the North", iconType: "conquest", description: "A bold campaign to claim the northern territories, long held by rival claimants. The harsh winter and fierce resistance made every mile gained a hard-won victory.\n\nBy the campaign's end, the northern crown was secured, though at great cost." },
  { title: "Betrayal at the Gates", iconType: "betrayal", description: "A trusted advisor turned traitor, opening the castle gates to enemy forces under cover of darkness. The betrayal cost many lives and nearly brought the house to ruin.\n\nJustice was swift, but the wounds of treachery ran deep." },
  { title: "Treaty of Peace", iconType: "treaty", description: "After years of bloodshed, the warring factions finally came together to negotiate peace. The treaty was signed at the ancient Hall of Kings, witnessed by all the great houses.\n\nThis fragile peace would hold for a generation." },
  { title: "The Great Fire", iconType: "fire", description: "A catastrophic blaze consumed the old keep, destroying priceless heirlooms and ancient records. The fire burned for three days, visible from miles away.\n\nFrom the ashes, a grander fortress would rise." },
  { title: "Founding of the House", iconType: "coronation", description: "The establishment of the noble house, marking the beginning of a legendary lineage. The founder was granted lands and titles in recognition of heroic deeds.\n\nThis day would be celebrated for centuries to come." },
  { title: "Victory at Red Fields", iconType: "victory", description: "A decisive battle that crushed the enemy's army and secured dominance over the region. The field earned its name from the blood spilled that day.\n\nSongs of this triumph would be sung in halls across the realm." },
  { title: "Rebellion Crushed", iconType: "rebellion", description: "A dangerous uprising threatened to tear the realm apart, but swift and decisive action put an end to the insurrection. The rebel leaders were brought to justice.\n\nStability was restored, though tensions remained." },
  { title: "Discovery of Ancient Ruins", iconType: "discovery", description: "Explorers uncovered the remains of a forgotten civilization, revealing artifacts and knowledge lost to time. Scholars flocked to study the mysterious ruins.\n\nThe discoveries would reshape understanding of the ancient world." },
  { title: "The Grand Festival", iconType: "festival", description: "A magnificent celebration held in honor of the harvest and the gods. Lords and commoners alike gathered for tournaments, feasts, and revelry.\n\nThe festival became an annual tradition, eagerly anticipated by all." },
  { title: "Fall of the Old King", iconType: "death", description: "The death of the aging monarch marked the end of an era. His passing was mourned throughout the land, and the succession brought both hope and uncertainty.\n\nA new age was about to begin." },
  { title: "Coronation Ceremony", iconType: "coronation", description: "The crowning of a new ruler in a grand ceremony steeped in tradition and pageantry. Representatives from every corner of the realm attended to pledge their loyalty.\n\nA new reign had begun." },
  { title: "Battle of the Rivers", iconType: "war", description: "A fierce clash along the riverbanks that determined control of vital trade routes. The waters ran red with blood as armies collided.\n\nThe victor would command the wealth of the rivers for years to come." },
  { title: "The Dark Winter", iconType: "death", description: "An unusually harsh winter brought famine and suffering. Stores of grain ran low, and many did not survive to see the spring.\n\nIt was a time that tested the resilience of all who endured it." },
  { title: "Alliance Forged", iconType: "treaty", description: "Two powerful houses joined forces through oath and ceremony, creating an alliance that would shape regional politics for generations.\n\nTogether, they became a force none could challenge." },
  { title: "Siege of the Castle", iconType: "conquest", description: "Enemy forces laid siege to the ancestral stronghold for months. Hunger and disease plagued the defenders, but they held firm.\n\nWhen relief finally came, the siege was broken and the enemy routed." },
  { title: "Birth of the Heir", iconType: "birth", description: "The birth of a long-awaited heir brought joy and celebration throughout the realm. The child was blessed by high priests and showered with gifts.\n\nThe future of the house was secured." },
  { title: "The Dragon's Return", iconType: "fire", description: "Ancient legends spoke of dragons, and on this day those legends became reality. The appearance of the great beast terrified and awed in equal measure.\n\nThe world would never be quite the same again." }
];

const BIOGRAPHIES = [
  "A fierce warrior known for valor in countless battles.",
  "A cunning strategist who shaped the fate of the realm.",
  "Beloved by the common folk for their generosity.",
  "Mysterious and secretive, their true motives remain unknown.",
  "A skilled diplomat who forged alliances across the land.",
  "Known for their ruthless ambition and iron will.",
  "A gentle soul who preferred books to swords.",
  "Their tragic end became the stuff of legend.",
  "Rose from obscurity to become a pillar of the house.",
  "Their loyalty to family was unmatched and unwavering."
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateFamilyTree = (config) => {
  const {
    houseName,
    houseMotto,
    houseCrest,
    generations = 4,
    avgChildren = 2,
    unknownChance = 0.1
  } = config;

  const persons = [];
  const familyEdges = [];
  const specialRelations = [];
  const usedPortraits = [];

  // Generate founder couple (generation 0)
  const founder = createPerson(0, houseName, usedPortraits, unknownChance);
  const founderSpouse = createPerson(0, houseName, usedPortraits, unknownChance, founder.gender === 'male' ? 'female' : 'male');
  persons.push(founder, founderSpouse);
  familyEdges.push({ from_id: founder.id, to_id: founderSpouse.id, relation_type: 'spouse' });

  // Track couples per generation for child generation
  let currentGenCouples = [{ parent1: founder, parent2: founderSpouse }];

  for (let gen = 1; gen < generations; gen++) {
    const nextGenCouples = [];

    for (const couple of currentGenCouples) {
      // Random number of children based on avgChildren (at least 1)
      const numChildren = Math.max(1, Math.floor(Math.random() * (avgChildren * 2)) + 1);

      for (let c = 0; c < numChildren; c++) {
        const child = createPerson(gen, houseName, usedPortraits, unknownChance);
        persons.push(child);

        // Add parent-child edges
        familyEdges.push({ from_id: couple.parent1.id, to_id: child.id, relation_type: 'parent_child' });
        familyEdges.push({ from_id: couple.parent2.id, to_id: child.id, relation_type: 'parent_child' });

        // All children need spouses to ensure everyone is connected
        const spouse = createPerson(gen, null, usedPortraits, unknownChance, child.gender === 'male' ? 'female' : 'male');
        persons.push(spouse);
        familyEdges.push({ from_id: child.id, to_id: spouse.id, relation_type: 'spouse' });
        
        // Only couples in non-final generations will have children
        if (gen < generations - 1) {
          nextGenCouples.push({ parent1: child, parent2: spouse });
        }
      }
    }

    currentGenCouples = nextGenCouples;
  }

  // Add some special relations
  const numSpecialRelations = Math.floor(persons.length * 0.15);
  for (let i = 0; i < numSpecialRelations; i++) {
    const from = randomFrom(persons);
    const to = randomFrom(persons.filter(p => p.id !== from.id));
    if (from && to) {
      specialRelations.push({
        from_id: from.id,
        to_id: to.id,
        relation_type: randomFrom(SPECIAL_RELATION_TYPES)
      });
    }
  }

  // Generate timeline events
  const timelineEvents = [];
  const numEvents = Math.floor(Math.random() * 10) + 10; // 10-20 events
  const usedTitles = new Set();
  
  for (let i = 0; i < numEvents; i++) {
    let eventTemplate;
    do {
      eventTemplate = randomFrom(EVENT_TYPES);
    } while (usedTitles.has(eventTemplate.title) && usedTitles.size < EVENT_TYPES.length);
    
    usedTitles.add(eventTemplate.title);
    
    const year = Math.floor(Math.random() * 500) + 1;
    const era = Math.random() > 0.3 ? 'a.c.' : 'b.c.';
    
    // Select random participants (1-5 people from the tree)
    const numParticipants = Math.floor(Math.random() * 5) + 1;
    const participants = [];
    for (let p = 0; p < numParticipants && p < persons.length; p++) {
      const randomPerson = randomFrom(persons.filter(person => !participants.includes(person.id)));
      if (randomPerson) {
        participants.push(randomPerson.id);
      }
    }
    
    timelineEvents.push({
      id: generateId(),
      title: eventTemplate.title,
      year,
      era,
      iconType: eventTemplate.iconType,
      participants,
      descriptionLong: eventTemplate.description,
      imageUrl: null // Can be populated later or left as placeholder
    });
  }

  return {
    house_name: houseName,
    house_motto: houseMotto || randomFrom(MOTTOS),
    house_crest: houseCrest,
    persons,
    family_edges: familyEdges,
    special_relations: specialRelations,
    timeline_events: timelineEvents,
    share_id: generateId()
  };
};

function createPerson(generation, houseName, usedPortraits, unknownChance, forceGender = null) {
  const isUnknown = Math.random() < unknownChance;
  const gender = forceGender || (Math.random() > 0.5 ? 'male' : 'female');
  const firstName = gender === 'male' ? randomFrom(FIRST_NAMES_MALE) : randomFrom(FIRST_NAMES_FEMALE);
  const title = gender === 'male' ? randomFrom(TITLES_MALE) : randomFrom(TITLES_FEMALE);

  let portrait;
  if (isUnknown) {
    portrait = UNKNOWN_PORTRAIT;
  } else {
    portrait = getRandomPortrait(gender, usedPortraits);
    usedPortraits.push(portrait);
  }

  const birthYear = 1200 + (generation * 25) + Math.floor(Math.random() * 10);
  const isDead = generation < 2 || Math.random() > 0.7;
  const deathYear = isDead ? birthYear + 40 + Math.floor(Math.random() * 40) : null;

  return {
    id: generateId(),
    name: isUnknown ? "Unknown" : firstName,
    title: isUnknown ? "???" : `${title} ${firstName}${houseName ? ` of House ${houseName}` : ''}`,
    portrait,
    biography: isUnknown ? "Their identity has been lost to time." : randomFrom(BIOGRAPHIES),
    generation,
    is_unknown: isUnknown,
    gender,
    birth_year: birthYear.toString(),
    death_year: deathYear ? deathYear.toString() : null
  };
}