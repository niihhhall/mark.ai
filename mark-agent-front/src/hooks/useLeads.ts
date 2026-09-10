import { useState, useEffect, useCallback } from 'react'
import { supabase, hasValidConfig } from '../lib/supabase'
import type { Lead } from '../types'

export const useLeads = () => {
    const [leads, setLeads] = useState<Lead[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLeads = useCallback(async () => {
        try {
            if (!hasValidConfig()) {
                setIsLoading(false)
                return
            }
            setIsLoading(true)
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error("[Supabase Leads Error]:", error)
                throw error
            }
            console.log("[Supabase Leads]:", data?.length, "records found.")
            setLeads(data || [])
        } catch (err: any) {
            console.error("[useLeads Hook Exception]:", err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLeads()
    }, [fetchLeads])

    return { leads, isLoading, error, refetch: fetchLeads }
}
