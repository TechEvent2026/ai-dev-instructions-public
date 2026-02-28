export type Period = "7d" | "30d" | "90d" | "1y";

/** Helper: ラベル文字列を返す */
export function periodTitle(period: Period): string {
  switch (period) {
    case "7d":
      return "過去7日間";
    case "30d":
      return "過去30日間";
    case "90d":
      return "過去90日間";
    case "1y":
      return "過去1年間";
  }
}

/** Helper: バーチャートの粒度ラベル */
export function periodGranularityLabel(period: Period): string {
  return period === "1y" ? "週別" : "日別";
}
