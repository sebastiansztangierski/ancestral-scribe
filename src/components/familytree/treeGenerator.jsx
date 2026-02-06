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

        // Children who will have descendants need spouses
        if (gen < generations - 1) {
          const spouse = createPerson(gen, null, usedPortraits, unknownChance, child.gender === 'male' ? 'female' : 'male');
          persons.push(spouse);
          familyEdges.push({ from_id: child.id, to_id: spouse.id, relation_type: 'spouse' });
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

  return {
    house_name: houseName,
    house_motto: houseMotto || randomFrom(MOTTOS),
    house_crest: houseCrest,
    persons,
    family_edges: familyEdges,
    special_relations: specialRelations,
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