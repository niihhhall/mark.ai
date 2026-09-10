import React, { useMemo, useState, useEffect } from 'react'
import type { Lead, LLMSession } from '../types'
import { StatCard } from '../components/ui/StatCard'
import { LeadCard } from '../components/leads/LeadCard'
import { ActivityFeed } from '../components/agent/ActivityFeed'
import { supabase, isDemoMode } from '../lib/supabase'

import { MOCK_LEADS, MOCK_SESSIONS } from '../lib/mockData'
import { Icon } from '@iconify/react'

import { SkeletonCard } from '../components/ui/SkeletonCard'
import { LeadDetail } from '../components/leads/LeadDetail'

interface OverviewProps {
    leads: Lead[]
    isLoading?: boolean
}

const Overview: React.FC<OverviewProps> = ({ leads: propLeads, isLoading: propLoading }) => {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const [sessions, setSessions] = useState<LLMSession[]>([])

    const leads = isDemoMode ? MOCK_LEADS : propLeads
    const isLoading = isDemoMode ? false : propLoading

    useEffect(() => {
        if (isDemoMode) {
            setSessions(MOCK_SESSIONS)
            return
        }

        const fetchSessions = async () => {
            const { data } = await supabase.from('llm_sessions').select('*').order('created_at', { ascending: false })
            if (data) setSessions(data)
        }
        fetchSessions()

        const channel = supabase
            .channel('llm_sessions_realtime')
            .on('postgres_changes' as any, { event: 'INSERT', table: 'llm_sessions' }, (payload: any) => {
                setSessions(prev => [payload.new as LLMSession, ...prev])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const stats = useMemo(() => {
        const total = leads.length
        const active = leads.filter(l => l.outcome === 'In Progress').length
        const booked = leads.filter(l => l.outcome === 'Meeting Booked').length
        const rate = total > 0 ? ((booked / total) * 100).toFixed(1) : '0.0'

        const totalCost = sessions.reduce((sum, s) => sum + (s.cost_usd || 0), 0)
        const avgLatency = sessions.length > 0
            ? Math.round(sessions.reduce((sum, s) => sum + (s.latency_ms || 0), 0) / sessions.length)
            : 0

        return [
            { label: 'Total Leads', value: total, icon: 'solar:users-group-rounded-linear', color: 'bg-brand-muted text-brand' },
            { label: 'Active Now', value: active, icon: 'solar:chat-round-dots-linear', color: 'bg-amber-50 text-amber-600', pulse: active > 0 },
            { label: 'Meetings Booked', value: booked, icon: 'solar:calendar-mark-linear', color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Conv. Rate', value: `${rate}%`, icon: 'solar:chart-square-linear', color: 'bg-violet-50 text-violet-600' },
            { label: 'AI Cost', value: `$${totalCost.toFixed(3)}`, icon: 'solar:dollar-minimalistic-linear', color: 'bg-sky-50 text-sky-600' },
            { label: 'AI Latency', value: `${avgLatency}ms`, icon: 'solar:bolt-linear', color: 'bg-rose-50 text-rose-600' },
        ]
    }, [leads, sessions])

    const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId])

    return (
        <div className="p-8 space-y-12 animate-fade-up max-w-[1750px] mx-auto">
            {/* Header Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : stats.map((s, i) => (
                        <StatCard
                            key={i}
                            label={s.label}
                            value={s.value}
                            icon={s.icon}
                            accentColor={s.color}
                            pulse={s.pulse}
                        />
                    ))
                }
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
                {/* Left: Lead Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-semibold tracking-tight text-ink inline-flex items-center gap-2.5 bg-white border border-border rounded-xl px-4 py-2 shadow-card">
                            <Icon icon="solar:graph-new-up-linear" width={18} className="text-brand" /> Live Registry
                        </h2>
                        <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 shadow-card">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-medium text-ink-muted">Active</span>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-[800px] overflow-y-auto pr-3 custom-scrollbar">
                        {isLoading
                            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={2} height="h-24" />)
                            : leads.map(lead => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    active={selectedLeadId === lead.id}
                                    onClick={() => setSelectedLeadId(lead.id)}
                                    variant="compact"
                                />
                                ))
                        }
                    </div>
                </div>

                {/* Right: Detailed View or Intelligence Placeholder */}
                <div className="lg:col-span-3 card overflow-hidden flex flex-col relative min-h-[600px]">
                    {selectedLead ? (
                        <LeadDetail
                            lead={selectedLead}
                            onClose={() => setSelectedLeadId(null)}
                            refetch={() => { }}
                        />
                    ) : (
                        <div className="m-auto flex flex-col items-center text-center p-12 max-w-xl">
                            <div className="relative mb-10">
                                <div className="relative w-24 h-24 bg-brand-muted border border-brand/20 flex items-center justify-center rotate-6 transform transition-all hover:rotate-0 hover:scale-105 duration-700 shadow-card rounded-2xl">
                                    <Icon icon="solar:cpu-bolt-linear" width={44} className="text-brand" />
                                </div>
                                <div className="absolute -bottom-3 -right-3 w-11 h-11 bg-white border border-border shadow-card flex items-center justify-center -rotate-12 rounded-xl">
                                    <Icon icon="solar:bolt-linear" width={20} className="text-violet-500" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-ink tracking-tight">
                                Agent <span className="text-brand">Observation</span>
                            </h3>
                            <p className="text-ink-muted text-sm mt-4 leading-relaxed max-w-md mx-auto font-medium">
                                Initialize Agent Monitoring by selecting a registry profile.
                                Gain real-time visibility into extracted signals and conversation telemetry.
                            </p>

                            <div className="grid grid-cols-2 gap-6 mt-10 w-full text-left">
                                <div className="p-5 bg-bg-elevated border border-border rounded-xl transition-all group hover:border-brand/30">
                                    <p className="text-xs font-semibold text-brand tracking-tight mb-2 flex items-center gap-2">
                                        <Icon icon="solar:bolt-linear" width={16} className="group-hover:rotate-12 transition-transform" /> Observability
                                    </p>
                                    <p className="text-xs text-ink-muted leading-relaxed">Quantify model precision, token throughput, and real-time operational costs.</p>
                                </div>
                                <div className="p-5 bg-bg-elevated border border-border rounded-xl transition-all group hover:border-brand/30">
                                    <p className="text-xs font-semibold text-violet-600 tracking-tight mb-2 flex items-center gap-2">
                                        <Icon icon="solar:trending-up-linear" width={16} className="group-hover:scale-110 transition-transform" /> Synthesis
                                    </p>
                                    <p className="text-xs text-ink-muted leading-relaxed">Autonomous extraction of BANT vectors and strategic sales psychological alignment.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row: System Pulse */}
            <div className="pt-8 border-t border-border">
                <div className="flex items-center justify-between mb-8 px-2">
                    <h2 className="text-sm font-semibold tracking-tight text-ink inline-flex items-center gap-2.5 bg-white border border-border rounded-xl px-4 py-2 shadow-card">
                        <Icon icon="solar:pulse-linear" width={18} className="text-brand" /> System Telemetry Feed
                    </h2>
                    <span className="text-xs text-ink-faint bg-white border border-border rounded-xl px-4 py-2 shadow-card">Real-time Stream / Node 01</span>
                </div>
                <ActivityFeed />
            </div>
        </div>
    )
}

export default Overview
