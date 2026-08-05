export function formatBrisbaneDateTime(
  value: string | null
) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "en-AU",
    {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}