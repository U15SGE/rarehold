// =========================================================
// Core fairness math for Rarehold companies
// =========================================================

/**
 * Recalculates every member's stake_percent after a new contribution
 * or exit, based on lifetime contributed_karat relative to the
 * company's total treasury contributions.
 */
export function recalculateStakes(
  members: { user_id: string; contributed_karat: number }[]
): { user_id: string; stake_percent: number }[] {
  const total = members.reduce((sum, m) => sum + m.contributed_karat, 0);
  if (total === 0) return members.map((m) => ({ user_id: m.user_id, stake_percent: 0 }));

  return members.map((m) => ({
    user_id: m.user_id,
    stake_percent: Number(((m.contributed_karat / total) * 100).toFixed(4)),
  }));
}

/**
 * Applies the anti-whale voting cap. Even if a member's raw stake
 * is higher than the cap, their effective vote weight is clamped.
 */
export function effectiveVoteWeight(stakePercent: number, cap = 25): number {
  return Math.min(stakePercent, cap);
}

/**
 * Company Power Score formula:
 * 30% treasury, 40% portfolio value, 20% win rate, 10% activity
 */
export function calculatePowerScore(params: {
  treasuryBalance: number;
  portfolioValue: number;
  winCount: number;
  lossCount: number;
  activityScore: number; // 0-100, e.g. based on recent logins/votes
}): number {
  const { treasuryBalance, portfolioValue, winCount, lossCount, activityScore } = params;
  const totalRounds = winCount + lossCount;
  const winRate = totalRounds > 0 ? winCount / totalRounds : 0;

  // Normalize treasury & portfolio into comparable ranges before weighting.
  // In production these normalization constants should be derived from
  // live platform-wide averages, not hardcoded.
  const normalizedTreasury = Math.min(treasuryBalance / 100000, 1) * 100;
  const normalizedPortfolio = Math.min(portfolioValue / 200000, 1) * 100;

  const score =
    normalizedTreasury * 0.3 +
    normalizedPortfolio * 0.4 +
    winRate * 100 * 0.2 +
    activityScore * 0.1;

  return Number(score.toFixed(2));
}

/**
 * Determines company tier from power score.
 */
export function getTier(powerScore: number): "bronze" | "silver" | "gold" | "legendary" {
  if (powerScore >= 80) return "legendary";
  if (powerScore >= 55) return "gold";
  if (powerScore >= 30) return "silver";
  return "bronze";
}

/**
 * Single-bid cap safeguard: a company cannot commit more than
 * `capPercent` of its treasury in a single bid.
 */
export function maxAllowedBid(treasuryBalance: number, capPercent = 40): number {
  return Math.floor(treasuryBalance * (capPercent / 100));
}

/**
 * Exit payout: when a member leaves, they are paid out based on
 * their stake in the CURRENT company valuation (treasury + portfolio),
 * not their original contribution — so gains/losses are shared fairly.
 */
export function calculateExitPayout(
  stakePercent: number,
  currentTreasury: number,
  currentPortfolioValue: number
): number {
  const companyValuation = currentTreasury + currentPortfolioValue;
  return Math.floor((stakePercent / 100) * companyValuation);
}
