// Fee breakdown calculation — mirrors packages/shared/src/constants.ts
// Kept local to avoid a dependency on @reversecentaur/shared in the npm package.

const PLATFORM_FEE_PCT = 15;
const STRIPE_PROCESSING_RATE = 0.029;
const STRIPE_PROCESSING_FIXED = 0.30;

export function computeChargeBreakdown(budgetUsd: number) {
  const platformFee = Math.round(budgetUsd * (PLATFORM_FEE_PCT / 100) * 100) / 100;
  const workerPayout = Math.round((budgetUsd - platformFee) * 100) / 100;
  const totalCharge = Math.ceil(
    ((budgetUsd + STRIPE_PROCESSING_FIXED) / (1 - STRIPE_PROCESSING_RATE)) * 100
  ) / 100;
  const processingFee = Math.round((totalCharge - budgetUsd) * 100) / 100;
  return { workerPayout, platformFee, processingFee, totalCharge };
}

export function computeRoundUpSuggestion(budgetUsd: number) {
  const current = computeChargeBreakdown(budgetUsd);
  const roundedPayout = Math.ceil(current.workerPayout / 5) * 5;
  if (roundedPayout === current.workerPayout) return null;

  const revisedBudget = Math.ceil((roundedPayout / (1 - PLATFORM_FEE_PCT / 100)) * 100) / 100;
  const revised = computeChargeBreakdown(revisedBudget);
  return {
    target_worker_payout_usd: roundedPayout,
    revised_total_charge_usd: revised.totalCharge,
    additional_cost_usd: Math.round((revised.totalCharge - current.totalCharge) * 100) / 100,
  };
}
