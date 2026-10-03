type UnreadListener = (count: number) => void;

let cachedCount: number | null = null;
let inFlight: Promise<number> | null = null;
let lastFetchAt = 0;
const listeners = new Set<UnreadListener>();

const MIN_GAP_MS = 60_000;

export function subscribeUnreadEmailCount(listener: UnreadListener): () => void {
  listeners.add(listener);
  if (cachedCount !== null) listener(cachedCount);
  return () => {
    listeners.delete(listener);
  };
}

export function getCachedUnreadEmailCount(): number | null {
  return cachedCount;
}

function publish(count: number) {
  cachedCount = count;
  for (const listener of listeners) listener(count);
}

async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await fetch("/api/email/unread-count", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return cachedCount ?? 0;
    const data = (await res.json()) as { count?: number };
    return Math.max(0, Number(data.count) || 0);
  } catch {
    return cachedCount ?? 0;
  }
}

/** Shared in-tab unread fetch — header + home share one network call. */
export function refreshUnreadEmailCount(force = false): Promise<number> {
  const now = Date.now();
  if (!force && cachedCount !== null && now - lastFetchAt < MIN_GAP_MS) {
    return Promise.resolve(cachedCount);
  }
  if (inFlight) return inFlight;

  lastFetchAt = now;
  inFlight = fetchUnreadCount()
    .then((count) => {
      publish(count);
      return count;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
