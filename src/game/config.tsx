import type { GameConfig } from '../types/game';
import {
  FeatherIcon,
  PressIcon,
  BookIcon,
  LibraryIcon,
  TranslatorIcon,
  AcademyIcon,
  UniversityIcon,
  CanonIcon,
  LanguageIcon,
  CivilizationIcon,
} from './icons';

export const CONFIG: GameConfig = {
  letters: {
    name: 'Letras',
    motto: 'a tinta que não seca',
    resourceKey: 'letters',
    /* ─── Cost curve ───
     * Each tier has a FIXED buy cost — owning more of a generator does NOT
     * raise its price. The curve below is purely the unlock/initial price
     * ladder; cost-reduction upgrades still scale the price down (floor: 1).
     * Spans 10 → 1 No (1×10³⁰), 29 orders of magnitude across 9 jumps.
     *   I    →  10           (start)
     *   II   →  100          ×10
     *   III  →  2 K          ×20
     *   IV   →  50 K         ×25
     *   V    →  1.5 M        ×30
     *   VI   →  60 M         ×40
     *   VII  →  3 B          ×50
     *   VIII →  200 T        ×~67
     *   IX   →  20 Qi        ×100
     *   X    →  1 No         ×50K (the cathedral leap)
     */
    tiers: [
      // Cost curve: log10(cost(tier)) = 1 + (tier/9)^2.5 × 199
      // → tier 0 = 10, tier 9 = 1e200 (rounded to "tidy" magnitudes).
      // Production curve: baseProduction(0)/1.7^tier — decays slower than
      // costs grow on purpose, so the player still wants many of each
      // tier instead of just one of the top one.
      {
        name: 'Escritor',
        namePlural: 'Escritores',
        species: 'Scriptor solitarius',
        baseCost: 10,
        baseProduction: 0.2,
        icon: <FeatherIcon color="var(--terracotta-d)" />,
        unlocksAt: 0,
      },
      {
        name: 'Tipógrafo',
        namePlural: 'Tipógrafos',
        species: 'Typographus mechanicus',
        baseCost: 70,
        baseProduction: 0.12,
        icon: <PressIcon color="var(--terracotta-d)" />,
        unlocksAt: 1,
      },
      {
        name: 'Editor',
        namePlural: 'Editores',
        species: 'Editor severus',
        baseCost: 5e5, // 500 K
        baseProduction: 0.07,
        icon: <BookIcon color="var(--terracotta-d)" />,
        unlocksAt: 2,
      },
      {
        name: 'Biblioteca',
        namePlural: 'Bibliotecas',
        species: 'Bibliotheca aeterna',
        baseCost: 6e13, // 60 T
        baseProduction: 0.04,
        icon: <LibraryIcon color="var(--terracotta-d)" />,
        unlocksAt: 3,
      },
      {
        name: 'Tradutor',
        namePlural: 'Tradutores',
        species: 'Translator polyglottus',
        baseCost: 2e27,
        baseProduction: 0.025,
        icon: <TranslatorIcon color="var(--terracotta-d)" />,
        unlocksAt: 4,
      },
      {
        name: 'Academia',
        namePlural: 'Academias',
        species: 'Academia litterarum',
        baseCost: 6e46,
        baseProduction: 0.014,
        icon: <AcademyIcon color="var(--terracotta-d)" />,
        unlocksAt: 5,
      },
      {
        name: 'Universidade',
        namePlural: 'Universidades',
        species: 'Universitas studiorum',
        baseCost: 2e73,
        baseProduction: 0.0083,
        icon: <UniversityIcon color="var(--terracotta-d)" />,
        unlocksAt: 6,
      },
      {
        name: 'Cânon',
        namePlural: 'Cânones',
        species: 'Canon perennis',
        baseCost: 2e107,
        baseProduction: 0.0049,
        icon: <CanonIcon color="var(--terracotta-d)" />,
        unlocksAt: 7,
      },
      {
        name: 'Idioma',
        namePlural: 'Idiomas',
        species: 'Lingua viva',
        baseCost: 3e149,
        baseProduction: 0.0029,
        icon: <LanguageIcon color="var(--terracotta-d)" />,
        unlocksAt: 8,
      },
      {
        name: 'Civilização',
        namePlural: 'Civilizações',
        species: 'Civilizatio scripta',
        baseCost: 1e200,
        baseProduction: 0.0017,
        icon: <CivilizationIcon color="var(--terracotta-d)" />,
        unlocksAt: 9,
      },
    ],
  },
};

export const TRACK_KEYS = Object.keys(CONFIG) as Array<keyof typeof CONFIG>;
