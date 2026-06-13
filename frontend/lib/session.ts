export function getSessionId(): string {
  let id = localStorage.getItem("golazo_session_id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("golazo_session_id", id)
  }
  return id
}

export function getFanId(): string | null {
  return localStorage.getItem("golazo_fan_id")
}

export function setFanId(id: string): void {
  localStorage.setItem("golazo_fan_id", id)
}
