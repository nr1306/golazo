function ls(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getSessionId(): string {
  const store = ls()
  let id = store?.getItem("golazo_session_id") ?? null
  if (!id) {
    id = crypto.randomUUID()
    try { store?.setItem("golazo_session_id", id) } catch { /* private mode */ }
  }
  return id
}

export function getFanId(): string | null {
  return ls()?.getItem("golazo_fan_id") ?? null
}

export function setFanId(id: string): void {
  try { ls()?.setItem("golazo_fan_id", id) } catch { /* private mode */ }
}
