// Loyalty tier system utilities
export const TIERS = {
  BRONZE: {
    min: 0,
    label: "Bronze",
    color: "#CD7F32",
    perks: "1 point per NPR 100 spent",
  },
  SILVER: {
    min: 500,
    label: "Silver",
    color: "#C0C0C0",
    perks: "1.5x points + Priority email support + Early access to sales",
  },
  GOLD: {
    min: 2000,
    label: "Gold",
    color: "#FFD700",
    perks: "2x points + Free room upgrade (subject to availability) + 15% off on stays + Free WiFi",
  },
  PLATINUM: {
    min: 5000,
    label: "Platinum",
    color: "#E5E4E2",
    perks: "3x points + Complimentary breakfast + Free room upgrade + 20% discount + Free late checkout (2pm) + 24/7 concierge + Airport transfers + Exclusive rates",
  },
};

export function getMultiplier(tier: keyof typeof TIERS): number {
  const map = { BRONZE: 1, SILVER: 1.5, GOLD: 2, PLATINUM: 3 };
  return map[tier];
}

export function calcPointsEarned(
  amountNPR: number,
  tier: keyof typeof TIERS,
): number {
  // 1 point per NPR 100, multiplied by tier bonus
  return Math.floor((amountNPR / 100) * getMultiplier(tier));
}

// 1 point = NPR 0.5 discount
export function calcDiscount(pointsToRedeem: number): number {
  return pointsToRedeem * 0.5;
}

export function getTierByPoints(points: number): keyof typeof TIERS {
  if (points >= TIERS.PLATINUM.min) return 'PLATINUM';
  if (points >= TIERS.GOLD.min) return 'GOLD';
  if (points >= TIERS.SILVER.min) return 'SILVER';
  return 'BRONZE';
}
