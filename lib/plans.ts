export const PLAN_LIMITS = { free: 2, premium: 30, pro: 100 } as const
export type Plan = keyof typeof PLAN_LIMITS
