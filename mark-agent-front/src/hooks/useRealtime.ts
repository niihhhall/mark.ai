import { useState, useEffect } from 'react'
import { supabase, hasValidConfig } from '../lib/supabase'

export const useRealtime = (onUpdate: () => void) => {
    const [isConnected, setIsConnected] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(new Date())

    useEffect(() => {
        if (!hasValidConfig()) {
            setIsConnected(false)
            return
        }

        const channel = supabase.channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
                setLastUpdated(new Date())
                onUpdate()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                setLastUpdated(new Date())
                onUpdate()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                setLastUpdated(new Date())
                onUpdate()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_state' }, () => {
                setLastUpdated(new Date())
                onUpdate()
            })
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED')
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [onUpdate])

    return { isConnected, lastUpdated }
}
