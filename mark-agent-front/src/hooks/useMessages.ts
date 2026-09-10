import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Message } from '../types'

export const useMessages = (leadId?: string) => {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchMessages = useCallback(async () => {
        if (!leadId) return
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(data || [])
        } catch (err) {
            console.error('Error fetching messages:', err)
        } finally {
            setIsLoading(false)
        }
    }, [leadId])

    useEffect(() => {
        if (!leadId) return

        fetchMessages()

        // Subscribe to real-time changes for this lead's messages
        const channel = supabase
            .channel(`messages-${leadId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `lead_id=eq.${leadId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message
                    setMessages(prev => {
                        // Avoid duplicates if fetch and subscription overlap
                        if (prev.find(m => m.id === newMessage.id)) return prev
                        return [...prev, newMessage]
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [leadId, fetchMessages])

    return { messages, isLoading, refetch: fetchMessages }
}

