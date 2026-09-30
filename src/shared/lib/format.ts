import { appConfig } from "@/config/app"

export function formatNumber(value: number) {
  return new Intl.NumberFormat(appConfig.locale).format(value)
}

export function formatDate(value: string | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(appConfig.locale, {
    dateStyle: "medium",
    timeZone: appConfig.timeZone,
  }).format(date)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(appConfig.locale, {
    style: "currency",
    currency: appConfig.currency,
  }).format(value)
}
