export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const formatNumber = (value: unknown, options: Intl.NumberFormatOptions = {}): string => {
  const numericValue = toNumber(value);
  return numericValue.toLocaleString(undefined, options);
};

export const formatAmount = (value: unknown): string =>
  formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatCurrencyAmount = (value: unknown, symbol = "₦"): string => `${symbol}${formatAmount(value)}`;

export const formatCompactCurrency = (value: unknown, symbol = "₦"): string => {
  const amount = toNumber(value);
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${formatNumber(amount / 1000, { maximumFractionDigits: 0 })}k`;
  }

  return `${symbol}${formatAmount(amount)}`;
};

export const formatRating = (value: unknown): string => {
  const rating = toNumber(value);
  return Number.isInteger(rating)
    ? String(rating)
    : rating.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

export const formatPercent = (value: unknown): string => {
  const percent = toNumber(value);
  return Number.isInteger(percent)
    ? String(percent)
    : percent.toLocaleString(undefined, { maximumFractionDigits: 1 });
};
