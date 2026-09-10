import { useState, useEffect } from 'react'
import type { Client, BaileysSession } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useSessions = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [sessions, setSessions] = useState<BaileysSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      // 1. Fetch clients
      const clientsRes = await fetch(`${API_URL}/dashboard/clients`)
      if (!clientsRes.ok) throw new Error('Failed to fetch clients')
      const clientsData = await clientsRes.json()
      setClients(Array.isArray(clientsData) ? clientsData : [])

      // 2. Fetch session statuses.
      // The backend /dashboard/sessions endpoint proxies the Baileys JS service.
      // On WhatsApp Cloud (no Baileys running) it returns an error object like
      // {"error": ..., "status": "service_down"} instead of a list, so we must
      // coerce to an array to avoid "sessions.filter is not a function".
      const sessionsRes = await fetch(`${API_URL}/dashboard/sessions`)
      if (!sessionsRes.ok) throw new Error('Failed to fetch sessions')
      const sessionsData = await sessionsRes.json()
      setSessions(Array.isArray(sessionsData) ? sessionsData : [])

      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [])

  const restartSession = async (sessionId: string) => {
    try {
      await fetch(`${API_URL}/dashboard/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      await fetchData()
    } catch (err) {
      console.error('Failed to restart session:', err)
    }
  }

  const getQR = async (sessionId: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_URL}/dashboard/sessions/${sessionId}/qr`)
      const data = await res.json()
      return data.qr || null
    } catch (err) {
      console.error('Failed to fetch QR:', err)
      return null
    }
  }

  return { clients, sessions, isLoading, error, refetch: fetchData, restartSession, getQR }
}
