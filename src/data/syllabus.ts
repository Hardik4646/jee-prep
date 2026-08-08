import { SyllabusChapter, SupplementBook, Subject, ChapterClass, Weightage } from '../types';

let _id = 0;
const ch = (name: string, subject: Subject, classLevel: ChapterClass, weightage: Weightage): SyllabusChapter => ({
  id: `seed-${_id++}`, name, subject, classLevel, weightage,
  lectureDone: false, notesDone: false, moduleDone: false, supplementDone: false,
});

// Standard JEE Main + Advanced syllabus. This is a general reference set — every chapter
// here is fully editable, and you can add/remove/rename to match your exact Allen module
// breakdown at any time from the Syllabus page.
export const SEED_SYLLABUS: SyllabusChapter[] = [
  // ── Physics — 11th ──
  ch('Physical World & Units and Measurement', 'Physics', '11', 'Low'),
  ch('Kinematics (Motion in a Straight Line & Plane)', 'Physics', '11', 'High'),
  ch('Laws of Motion', 'Physics', '11', 'High'),
  ch('Work, Energy and Power', 'Physics', '11', 'High'),
  ch('System of Particles & Rotational Motion', 'Physics', '11', 'High'),
  ch('Gravitation', 'Physics', '11', 'Medium'),
  ch('Mechanical Properties of Solids', 'Physics', '11', 'Low'),
  ch('Mechanical Properties of Fluids', 'Physics', '11', 'Medium'),
  ch('Thermal Properties of Matter', 'Physics', '11', 'Medium'),
  ch('Thermodynamics', 'Physics', '11', 'High'),
  ch('Kinetic Theory of Gases', 'Physics', '11', 'Medium'),
  ch('Oscillations (SHM)', 'Physics', '11', 'High'),
  ch('Waves', 'Physics', '11', 'High'),

  // ── Physics — 12th ──
  ch('Electrostatics', 'Physics', '12', 'High'),
  ch('Current Electricity', 'Physics', '12', 'High'),
  ch('Magnetic Effects of Current & Magnetism', 'Physics', '12', 'High'),
  ch('Electromagnetic Induction & Alternating Current', 'Physics', '12', 'High'),
  ch('Electromagnetic Waves', 'Physics', '12', 'Low'),
  ch('Ray Optics and Optical Instruments', 'Physics', '12', 'High'),
  ch('Wave Optics', 'Physics', '12', 'Medium'),
  ch('Dual Nature of Radiation and Matter', 'Physics', '12', 'Medium'),
  ch('Atoms and Nuclei', 'Physics', '12', 'Medium'),
  ch('Semiconductor Electronics', 'Physics', '12', 'Medium'),

  // ── Mathematics — 11th ──
  ch('Sets, Relations and Functions', 'Mathematics', '11', 'Low'),
  ch('Complex Numbers and Quadratic Equations', 'Mathematics', '11', 'High'),
  ch('Matrices and Determinants', 'Mathematics', '11', 'High'),
  ch('Permutations and Combinations', 'Mathematics', '11', 'Medium'),
  ch('Binomial Theorem', 'Mathematics', '11', 'Medium'),
  ch('Sequences and Series', 'Mathematics', '11', 'Medium'),
  ch('Straight Lines', 'Mathematics', '11', 'High'),
  ch('Conic Sections', 'Mathematics', '11', 'High'),
  ch('Trigonometric Ratios, Identities & Equations', 'Mathematics', '11', 'High'),
  ch('Statistics and Probability', 'Mathematics', '11', 'Medium'),
  ch('Limits and Derivatives (Intro to Calculus)', 'Mathematics', '11', 'Medium'),

  // ── Mathematics — 12th ──
  ch('Inverse Trigonometric Functions', 'Mathematics', '12', 'Low'),
  ch('Continuity and Differentiability', 'Mathematics', '12', 'High'),
  ch('Application of Derivatives', 'Mathematics', '12', 'High'),
  ch('Indefinite & Definite Integrals', 'Mathematics', '12', 'High'),
  ch('Application of Integrals (Area Under Curves)', 'Mathematics', '12', 'Medium'),
  ch('Differential Equations', 'Mathematics', '12', 'Medium'),
  ch('Vector Algebra', 'Mathematics', '12', 'Medium'),
  ch('Three Dimensional Geometry', 'Mathematics', '12', 'High'),
  ch('Probability (Conditional & Bayes)', 'Mathematics', '12', 'Medium'),

  // ── Physical Chemistry — 11th ──
  ch('Some Basic Concepts of Chemistry (Mole Concept)', 'Physical Chemistry', '11', 'Medium'),
  ch('Structure of Atom', 'Physical Chemistry', '11', 'Medium'),
  ch('States of Matter (Gaseous & Liquid)', 'Physical Chemistry', '11', 'Low'),
  ch('Chemical Thermodynamics', 'Physical Chemistry', '11', 'High'),
  ch('Equilibrium (Chemical & Ionic)', 'Physical Chemistry', '11', 'High'),
  ch('Redox Reactions', 'Physical Chemistry', '11', 'Low'),

  // ── Physical Chemistry — 12th ──
  ch('Solutions', 'Physical Chemistry', '12', 'Medium'),
  ch('Electrochemistry', 'Physical Chemistry', '12', 'High'),
  ch('Chemical Kinetics', 'Physical Chemistry', '12', 'High'),
  ch('Surface Chemistry', 'Physical Chemistry', '12', 'Low'),

  // ── Organic Chemistry — 11th ──
  ch('GOC — General Organic Chemistry & IUPAC', 'Organic Chemistry', '11', 'High'),
  ch('Hydrocarbons', 'Organic Chemistry', '11', 'High'),

  // ── Organic Chemistry — 12th ──
  ch('Haloalkanes and Haloarenes', 'Organic Chemistry', '12', 'Medium'),
  ch('Alcohols, Phenols and Ethers', 'Organic Chemistry', '12', 'Medium'),
  ch('Aldehydes, Ketones and Carboxylic Acids', 'Organic Chemistry', '12', 'High'),
  ch('Amines', 'Organic Chemistry', '12', 'Medium'),
  ch('Biomolecules', 'Organic Chemistry', '12', 'Low'),

  // ── Inorganic Chemistry — 11th ──
  ch('Classification of Elements & Periodicity', 'Inorganic Chemistry', '11', 'Medium'),
  ch('Chemical Bonding and Molecular Structure', 'Inorganic Chemistry', '11', 'High'),
  ch('Hydrogen', 'Inorganic Chemistry', '11', 'Low'),
  ch('The s-Block Elements', 'Inorganic Chemistry', '11', 'Low'),

  // ── Inorganic Chemistry — 12th ──
  ch('The p-Block Elements', 'Inorganic Chemistry', '12', 'High'),
  ch('The d- and f-Block Elements', 'Inorganic Chemistry', '12', 'Medium'),
  ch('Coordination Compounds', 'Inorganic Chemistry', '12', 'High'),
  ch('General Principles of Isolation of Elements', 'Inorganic Chemistry', '12', 'Low'),
];

// Research-backed supplement book recommendations by subject — what's commonly recommended
// by seniors/mentors beyond the Allen module + NCERT, and roughly when/how to use each.
export const SUPPLEMENT_BOOKS: SupplementBook[] = [
  {
    subject: 'Physics', title: 'Concepts of Physics — Part 1 & 2', author: 'H.C. Verma', essential: true,
    howTo: [
      'Finish the Allen module chapter first — this book is for extra problem-solving practice, not for first learning a concept.',
      'Solve the objective questions first, then the subjective/numerical ones — the subjective questions are what actually build depth.',
      'Don\u2019t skip the "worked examples" — they show the reasoning style JEE numericals expect.',
      'Part 1 covers Class 11 topics, Part 2 covers Class 12 — pace it alongside your current chapter, not all at once.',
    ],
  },
  {
    subject: 'Mathematics', title: 'Cengage Series (Algebra, Calculus, Trigonometry, Coordinate Geometry, Vectors & 3D)', author: 'G. Tewani', essential: true,
    howTo: [
      'Use topic-wise, matched to whichever chapter you just finished in the Allen module — don\u2019t jump around.',
      'Start with the JEE Main-level exercise in each chapter before attempting the JEE Advanced-level one.',
      'This is the single highest-leverage supplement for Maths since Allen\u2019s own module tends to be thinner here relative to Advanced difficulty.',
      'Time-box it: if a chapter\u2019s exercise is taking too long, move on and revisit after PYQs — don\u2019t let one book stall your syllabus pace.',
    ],
  },
  {
    subject: 'Organic Chemistry', title: 'Organic Chemistry — Problems & Solutions (Reaction Mechanisms)', author: 'M.S. Chouhan', essential: false,
    howTo: [
      'Only start this after GOC + Hydrocarbons are solid — it assumes you already know mechanisms, not teaches them from scratch.',
      'Most toppers use this in Class 12, not 11th — don\u2019t rush into it early and lose confidence.',
      'Focus on the named reactions and mechanism-based problems — that\u2019s where JEE Advanced organic questions actually come from.',
      'Treat it as optional-but-valuable: NCERT + Allen module is enough for JEE Main organic; this book is for the extra Advanced edge.',
    ],
  },
  {
    subject: 'Inorganic Chemistry', title: 'NCERT (thoroughly) + Allen module is generally sufficient', author: '\u2014', essential: true,
    howTo: [
      'Inorganic is largely memory + NCERT line-by-line — extra books rarely add much here for JEE Main.',
      'If aiming for a very high Advanced rank, J.D. Lee\u2019s Concise Inorganic Chemistry can help for Coordination Compounds specifically — optional, not essential.',
      'Revise NCERT inorganic on a short cycle (weekly) rather than reading once — retention matters more than a new source here.',
    ],
  },
  {
    subject: 'Physical Chemistry', title: 'Numerical Chemistry', author: 'P. Bahadur', essential: false,
    howTo: [
      'Use only for extra numerical practice once the Allen module + NCERT concepts for that chapter are done.',
      'Particularly useful for Equilibrium, Electrochemistry, and Chemical Kinetics — the numerically heavy Physical Chemistry chapters.',
      'Not essential if you\u2019re already comfortable with Allen\u2019s own numericals — treat as a volume booster, not a concept source.',
    ],
  },
];
