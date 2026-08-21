import type { AppDistribution } from "./distribution";

const CLOUD_SENTINEL = "__OPENWHISPR_MANAGED_CLOUD__";

export function brandString(value: string, distribution: Readonly<AppDistribution>): string {
  if (distribution.productName === "OpenWhispr") return value;
  return value
    .split("OpenWhispr Cloud")
    .join(CLOUD_SENTINEL)
    .split("support@openwhispr.com")
    .join(distribution.supportEmail)
    .split("OpenWhispr")
    .join(distribution.productName)
    .split(CLOUD_SENTINEL)
    .join(distribution.cloudDisplayName);
}

export function brandResources<T>(value: T, distribution: Readonly<AppDistribution>): T {
  if (typeof value === "string") return brandString(value, distribution) as T;
  if (Array.isArray(value)) {
    return value.map((entry) => brandResources(entry, distribution)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, brandResources(entry, distribution)])
    ) as T;
  }
  return value;
}
