/** Rough kcal equivalent: 1 kg body fat ≈ 7700 kcal */
export function weeklyDeficitKcal(targetRateKgPerWeek: number): number {
  return Math.round(targetRateKgPerWeek * 7700);
}
