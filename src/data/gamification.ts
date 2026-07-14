import { DailyFact } from '../types';

export const DAILY_FACTS: DailyFact[] = [
  { title: "Newton's Second Law", content: "F = ma → Net force equals mass times acceleration. In rotational form: τ = Iα", category: 'formula', subject: 'Physics' },
  { title: "Kinematic Equations", content: "v = u + at | s = ut + ½at² | v² = u² + 2as | s = ½(u+v)t", category: 'formula', subject: 'Physics' },
  { title: "Gravitational Constant", content: "G = 6.674 × 10⁻¹¹ N·m²·kg⁻². Remember: gravity is the weakest of the four fundamental forces.", category: 'constant', subject: 'Physics' },
  { title: "Coulomb's Constant", content: "k = 9 × 10⁹ N·m²·C⁻² = 1/(4πε₀). Electric force: F = kq₁q₂/r²", category: 'constant', subject: 'Physics' },
  { title: "Nernst Equation", content: "E = E° − (RT/nF)·ln Q → At 298K: E = E° − (0.0592/n)·log Q", category: 'formula', subject: 'Physical Chemistry' },
  { title: "van't Hoff Factor", content: "π = iMRT where i = 1 + α(n−1). For NaCl: i ≈ 2. For Na₂SO₄: i ≈ 3.", category: 'formula', subject: 'Physical Chemistry' },
  { title: "LIATE Rule", content: "Integration by parts order: Logarithmic > Inverse Trig > Algebraic > Trigonometric > Exponential", category: 'concept', subject: 'Mathematics' },
  { title: "Bayes Theorem", content: "P(A|B) = P(B|A)·P(A) / P(B). Fundamental for conditional probability problems.", category: 'formula', subject: 'Mathematics' },
  { title: "Euler's Identity", content: "e^(iπ) + 1 = 0. Also: e^(iθ) = cos θ + i·sin θ", category: 'formula', subject: 'Mathematics' },
  { title: "SN1 vs SN2", content: "SN2: concerted, backside attack, inversion, 1° halides. SN1: stepwise, carbocation, racemization, 3° halides.", category: 'concept', subject: 'Organic Chemistry' },
  { title: "Markovnikov's Rule", content: "In HX addition to alkenes, H adds to the carbon bearing more H atoms. Anti-Markovnikov with peroxides (free radical).", category: 'concept', subject: 'Organic Chemistry' },
  { title: "Transition Metal Exceptions", content: "Cr = [Ar] 3d⁵4s¹ (half-filled) and Cu = [Ar] 3d¹⁰4s¹ (fully-filled). Both stable due to exchange energy.", category: 'concept', subject: 'Inorganic Chemistry' },
  { title: "Bohr Radius", content: "a₀ = 0.529 Å. For nth orbit: rₙ = n²·a₀/Z. Energy: Eₙ = −13.6Z²/n² eV", category: 'constant', subject: 'Physics' },
  { title: "Quadratic Formula", content: "x = [−b ± √(b²−4ac)] / 2a. Discriminant D = b²−4ac. D>0: 2 real roots, D=0: equal roots, D<0: complex.", category: 'formula', subject: 'Mathematics' },
  { title: "Le Chatelier's Principle", content: "Increasing temperature shifts equilibrium toward endothermic side. For exothermic rxn, high T → lower yield.", category: 'concept', subject: 'Physical Chemistry' },
];

export const XP_VALUES = {
  LOG_MISTAKE: 10,
  MASTER_MISTAKE: 50,
  STREAK_BONUS: 25,
};

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2750, 3600, 4600, 6000];

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPToNextLevel(xp: number): { current: number; required: number; progress: number } {
  const level = getLevelFromXP(xp) - 1;
  const current = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const next = LEVEL_THRESHOLDS[level + 1] ?? current + 1000;
  return {
    current: xp - current,
    required: next - current,
    progress: Math.min(100, Math.round(((xp - current) / (next - current)) * 100)),
  };
}

export function computeNextReview(reviewCount: number, masteredAt: number): number {
  const intervals = [1, 3, 7, 14, 30, 60];
  const days = intervals[Math.min(reviewCount ?? 0, intervals.length - 1)];
  return masteredAt + days * 24 * 60 * 60 * 1000;
}
