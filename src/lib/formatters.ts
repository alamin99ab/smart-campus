const bdtCurrencyFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string | null | undefined): string {
  const parsed = typeof value === "number" ? value : Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return bdtCurrencyFormatter.format(safeValue);
}

