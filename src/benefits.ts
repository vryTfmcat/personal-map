import { formatLocalDate, normalizeText } from "./helpers";
export type BenefitScope = "available" | "history" | "all";
export interface BenefitDates { benefitStatus: string; validFrom: string; validTo: string; }
export function benefitAvailability(benefit: BenefitDates, today = formatLocalDate()) {
  if (benefit.benefitStatus === "used") return { available: false, label: "已使用", rank: 3 };
  if (benefit.benefitStatus === "void") return { available: false, label: "已作废 / 退款", rank: 4 };
  if (benefit.benefitStatus === "expired" || (benefit.validTo && benefit.validTo.slice(0, 10) < today)) return { available: false, label: "已过期", rank: 2 };
  if (benefit.benefitStatus !== "active") return { available: false, label: "不可用 / 状态待确认", rank: 5 };
  if (benefit.validFrom && benefit.validFrom.slice(0, 10) > today) return { available: false, label: "尚未开始", rank: 1 };
  return { available: true, label: "当前可用", rank: 0 };
}
export function matchesBenefitScope(benefit: BenefitDates, scope: BenefitScope) {
  return scope === "all" || benefitAvailability(benefit).available === (scope === "available");
}
export function sortBenefits<T extends BenefitDates & { title: string }>(benefits: T[]): T[] {
  return [...benefits].sort((a, b) => benefitAvailability(a).rank - benefitAvailability(b).rank
    || (a.validTo || "9999").localeCompare(b.validTo || "9999") || a.title.localeCompare(b.title, "zh-CN"));
}
export function searchBenefits<T extends BenefitDates & { title: string; merchantName: string }>(benefits: T[], query: string, scope: BenefitScope): T[] {
  const words = query.trim().split(/\s+/).map(normalizeText).filter(Boolean);
  return sortBenefits(benefits.filter(b => matchesBenefitScope(b, scope)
    && words.every(word => normalizeText(`${b.title} ${b.merchantName} ${benefitAvailability(b).label}`).includes(word))));
}
