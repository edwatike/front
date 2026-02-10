import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const debug: Record<string, unknown> = {}
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    const baseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

    debug.has_token = Boolean(token)
    debug.token_prefix = token ? token.slice(0, 12) + "..." : null
    debug.backend_url = baseUrl
    debug.BACKEND_URL_env = process.env.BACKEND_URL ? "set" : "unset"
    debug.NEXT_PUBLIC_API_URL_env = process.env.NEXT_PUBLIC_API_URL ? "set" : "unset"

    if (!token) {
      const backendUrl = `${baseUrl}/api/auth/status`
      debug.backend_call = backendUrl
      let backendResp: Response | null = null
      try {
        backendResp = await fetch(backendUrl, { cache: "no-store" })
        debug.backend_status = backendResp.status
      } catch (fetchErr) {
        debug.backend_fetch_error = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      }
      if (backendResp?.ok) {
        const data = await backendResp.json().catch(() => ({ authenticated: false }))
        if (data?.authenticated) {
          return NextResponse.json({ ...data, _debug: debug })
        }
      }
      return NextResponse.json({ authenticated: false, user: null, _debug: debug })
    }

    const backendUrl = `${baseUrl}/api/auth/me`
    debug.backend_call = backendUrl
    let backendResp: Response | null = null
    try {
      backendResp = await fetch(backendUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        cache: "no-store",
      })
      debug.backend_status = backendResp.status
    } catch (fetchErr) {
      debug.backend_fetch_error = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      return NextResponse.json({ authenticated: false, user: null, _debug: debug })
    }

    if (!backendResp.ok) {
      let errBody: unknown = null
      try { errBody = await backendResp.text() } catch {}
      debug.backend_error_body = errBody
      return NextResponse.json({ authenticated: false, user: null, _debug: debug })
    }

    const data = await backendResp.json().catch(() => ({ authenticated: false }))
    return NextResponse.json({ ...data, _debug: debug })
  } catch (error) {
    debug.catch_error = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ authenticated: false, user: null, _debug: debug })
  }
}
