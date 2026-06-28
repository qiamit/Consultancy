/** Comma-separated address: street line, city, PIN, state (and optional country). Skips parts already present in the street line. */
export function formatClientAddressLine(parts: {
  address?: string | null;
  city?: string | null;
  pin_code?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  const street = (parts.address ?? "").trim();
  const city = (parts.city ?? "").trim();
  const pin = (parts.pin_code ?? "").trim();
  const state = (parts.state ?? "").trim();
  const country = (parts.country ?? "").trim();

  if (!street && !city && !pin && !state && !country) return "";

  const haystack = street.toLowerCase();
  const alreadyPresent = (value: string) => {
    if (!value) return true;
    if (haystack.includes(value.toLowerCase())) return true;
    return /^\d+$/.test(value) && street.includes(value);
  };

  const out: string[] = [];
  if (street) out.push(street);
  if (city && !alreadyPresent(city)) out.push(city);
  if (pin && !alreadyPresent(pin)) out.push(pin);
  if (state && !alreadyPresent(state)) out.push(state);
  if (country && !alreadyPresent(country)) out.push(country);

  return out.join(", ");
}
