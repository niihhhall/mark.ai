import React, { useState, useEffect, useMemo } from 'react'
import { Icon } from '@iconify/react'
import type { ConversationState, Booking, Message, Lead } from '../types'
import { supabase, isDemoMode } from '../lib/supabase'
import { MOCK_STATES, MOCK_MESSAGES, MOCK_BOOKINGS, MOCK_LEADS } from '../lib/mockData'
import { StatCard } from '../components/ui/StatCard'
import { StateDistribution } from '../components/agent/StateDistribution'
import { SourcePerformance } from '../components/agent/SourcePerformance'

const AgentPerformance: React.FC = () => {
    const [states, setStates] = useState<ConversationState[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [leads, setLeads] = useState<Lead[]>([])

    useEffect(() => {
        if (isDemoMode) {
            setStates(MOCK_STATES)
            setMessages(MOCK_MESSAGES)
            setBookings(MOCK_BOOKINGS)
            setLeads(MOCK_LEADS)
            return
        }

        const fetchData = async () => {
            try {
                const { data: sData } = await supabase.from('conversation_state').select('*')
                const { data: mData } = await supabase.from('messages').select('*')
                const { data: bData } = await supabase.from('bookings').select('*')
                const { data: lData } = await supabase.from('leads').select('*')

                setStates(sData as any || [])
                setMessages(mData as any || [])
                setBookings(bData || [])
                setLeads(lData as any || [])
            } catch (err) {
                console.error('Error fetching analytics:', err)
            }
        }
        fetchData()
    }, [])

    const analytics = useMemo(() => {
        const totalMsgs = messages.length
        const totalBookings = bookings.length

        // State distribution
        const stateCounts = states.reduce((acc, curr) => {
            const name = curr.current_state || 'Opening'
            acc[name] = (acc[name] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const distribution = Object.entries(stateCounts).map(([name, count]) => ({
            name,
            count,
            percent: states.length > 0 ? Math.round((count / states.length) * 100) : 0
        })).sort((a, b) => b.count - a.count)

        // Source performance — computed from real leads + bookings
        const bookedLeadIds = new Set(bookings.map(b => b.lead_id))
        const sourceMap = leads.reduce((acc, lead) => {
            const src = lead.lead_source || 'Other'
            if (!acc[src]) acc[src] = { total: 0, booked: 0 }
            acc[src].total += 1
            if (bookedLeadIds.has(lead.id)) acc[src].booked += 1
            return acc
        }, {} as Record<string, { total: number; booked: number }>)

        const sourcePerformance = Object.entries(sourceMap).map(([source, { total, booked }]) => ({
            source,
            total,
            booked,
            rate: total > 0 ? Math.round((booked / total) * 100).toString() : '0'
        })).sort((a, b) => b.total - a.total)

        return {
            totalMsgs,
            totalBookings,
            distribution,
            sourcePerformance
        }
    }, [states, messages, bookings, leads])

    const stats = [
    { label: 'Messages', value: analytics.totalMsgs, icon: 'solar:bolt-linear', color: 'bg-brand-muted text-brand' },
    { label: 'Conversations', value: states.length, icon: 'solar:chart-square-linear', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Bookings', value: analytics.totalBookings, icon: 'solar:target-linear', color: 'bg-amber-50 text-amber-600' },
    { label: 'Efficiency', value: '98.4%', icon: 'solar:medal-ribbons-star-linear', color: 'bg-brand-muted text-brand' },
    ]

    return (
        <div className="p-8 space-y-10 animate-fade-up h-full overflow-y-auto pb-20 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-sm font-semibold text-ink-soft flex items-center gap-2">
                        <Icon icon="solar:chart-square-linear" width={18} className="text-brand" /> Performance Overview
                    </h2>
                    <p className="text-xs text-ink-muted mt-1">Agent analytics and conversation telemetry</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-600">Core Synchronized</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <StatCard
                        key={i}
                        label={s.label}
                        value={s.value}
                        icon={s.icon}
                        accentColor={s.color}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card p-8 space-y-8">
                    <h2 className="text-sm font-semibold text-ink mb-2">State Distribution</h2>
                    <StateDistribution data={analytics.distribution} />
                </div>
                <div className="card p-8 space-y-8">
                    <h2 className="text-sm font-semibold text-ink mb-2">Source Performance</h2>
                    {analytics.sourcePerformance.length > 0 ? (
                        <SourcePerformance data={analytics.sourcePerformance} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <Icon icon="solar:chart-square-linear" width={28} />
                            </div>
                            <p className="text-xs text-ink-muted font-medium">Awaiting registry data</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AgentPerformance
