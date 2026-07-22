import { toNumber } from "@/lib/numberFormat";

export const parsePlanFeatures = (features: unknown): string[] => {
  if (Array.isArray(features)) {
    return features.map(String).map((feature) => feature.trim()).filter(Boolean);
  }

  if (typeof features === "string" && features.trim()) {
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((feature) => feature.trim()).filter(Boolean);
      }
    } catch {
      return features.split("\n").map((feature) => feature.trim()).filter(Boolean);
    }
  }

  return [];
};

export const parseBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === "1" || value === "true";

export const normalizeSubscriptionPlan = <T extends Record<string, unknown>>(plan: T) => ({
  ...plan,
  amount_ngn: toNumber(plan.amount_ngn),
  ai_credits_per_day: toNumber(plan.ai_credits_per_day),
  ai_matches_per_challenge: toNumber(plan.ai_matches_per_challenge),
  max_challenges: toNumber(plan.max_challenges),
  max_research_uploads: toNumber(plan.max_research_uploads),
  sort_order: toNumber(plan.sort_order),
  features: parsePlanFeatures(plan.features),
  is_popular: parseBoolean(plan.is_popular),
  is_active: parseBoolean(plan.is_active),
});