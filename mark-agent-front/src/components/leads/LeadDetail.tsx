import React, { useState } from 'react'
import type { Lead, ConversationState } from '../../types'
import { Badge } from '../ui/Badge'
import { SignalScore } from '../ui/SignalScore'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ConversationView } from './ConversationView'
import { IntelligenceView } from './IntelligenceView'
import { supabase } from '../../lib/supabase'
import { useMessages } from '../../hooks/useMessages'
import { Icon } from '@iconify/react'

interface LeadDetailProps {
    lead: Lead
    onClose: () => void
    refetch: () => void
}

export const LeadDetail: React.FC<LeadDetailProps> = ({ lead, onClose, refetch }) => {
    const [activeTab, setActiveTab] = useState('conversation')
    const { messages } = useMessages(lead.id)
    const [state, setState] = useState<ConversationState | null>(null)
    const [isResetting, setIsResetting] = useState(false)

    React.useEffect(() => {
        if (!lead.id) return

        const fetchState = async () => {
            const { data } = await supabase
                .from('conversation_state')
                .select('*')
                .eq('lead_id', lead.id)
                .single()
            if (data) setState(data)
        }

        fetchState()

        const channel = supabase
            .channel(`state-${lead.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversation_state',
                    filter: `lead_id=eq.${lead.id}`
                },
                (payload) => {
                    setState(payload.new as ConversationState)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [lead.id])


    const handleUpdate = () => {
        refetch()
    }

    const handleResetSession = async () => {
        if (!confirm("Are you sure you want to reset this lead's interaction history from AI memory?")) return

        setIsResetting(true)
        try {
            const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost'
            const defaultApiUrl = isProd ? 'https://after5-agent-production.up.railway.app' : 'http://localhost:8000'
            const apiUrl = import.meta.env.VITE_API_URL || defaultApiUrl
            
            const res = await fetch(`${apiUrl}/admin/reset-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: lead.phone })
            })
            const data = await res.json()
            if (data.status === 'ok') {
                alert('Session reset successfully! The agent will treat them as a new customer.')
                refetch()
            } else {

                alert(`Failed to reset session: ${data.reason || data.message}`)
            }
        } catch (error) {
            console.error('Reset failed:', error)
            alert('Failed to reset session. Ensure the backend API is reachable.')
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white relative custom-scrollbar overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between p-8 border-b border-border sticky top-0 z-20 bg-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shadow-card">
                        <Icon icon="solar:user-rounded-linear" width={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-ink">{lead.first_name} {lead.last_name || ''}</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                            <Badge variant="source" value={lead.lead_source} label="Source" />
                            <SignalScore score={lead.signal_score} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleResetSession}
                        disabled={isResetting}
                        className="btn-secondary group"
                        title="Reset Lead's Session History"
                    >
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:restart-linear" width={16} className={isResetting ? "animate-spin" : "group-hover:-rotate-180 transition-transform duration-500"} />
                            <span className="hidden sm:inline font-semibold">{isResetting ? 'Resetting...' : 'Reset Session'}</span>
                        </div>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center hover:bg-bg-elevated rounded-xl transition-all duration-200 text-ink-faint hover:text-ink border border-transparent hover:border-border"
                    >
                        <Icon icon="solar:close-circle-linear" width={24} />
                    </button>
                </div>
            </div>

            <div className="p-8 border-b border-border grid grid-cols-2 gap-5">
                <a href={`tel:${lead.phone}`} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:border-brand/30 hover:bg-brand-muted/40 transition-all duration-200 group">
                    <div className="w-11 h-11 rounded-xl bg-brand-muted text-brand flex items-center justify-center transition-colors duration-200">
                        <Icon icon="solar:phone-linear" width={20} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] font-medium text-ink-faint mb-0.5">Voice Line</p>
                        <p className="text-sm font-semibold text-ink tracking-tight">{lead.phone}</p>
                    </div>
                    <Icon icon="solar:arrow-right-up-linear" width={14} className="ml-auto text-ink-faint group-hover:text-brand transition-colors" />
                </a>
                <a href={`mailto:${lead.email}`} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:border-brand/30 hover:bg-brand-muted/40 transition-all duration-200 group">
                    <div className="w-11 h-11 rounded-xl bg-brand-muted text-brand flex items-center justify-center transition-colors duration-200">
                        <Icon icon="solar:letter-linear" width={20} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] font-medium text-ink-faint mb-0.5">Email</p>
                        <p className="text-sm font-semibold text-ink tracking-tight truncate max-w-[150px]">{lead.email || 'Not found'}</p>
                    </div>
                    <Icon icon="solar:arrow-right-up-linear" width={14} className="ml-auto text-ink-faint group-hover:text-brand transition-colors" />
                </a>
            </div>

            <div className="px-8 py-6">
                <SegmentedControl
                    options={[
                        { id: 'conversation', label: 'Conversation', icon: 'solar:chat-square-linear' },
                        { id: 'intelligence', label: 'Intelligence', icon: 'solar:brain-linear' },
                        { id: 'profile', label: 'Profile', icon: 'solar:user-linear' }
                    ]}
                    activeId={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            <div className="flex-1 overflow-hidden px-8 pb-8">
                {activeTab === 'conversation' && (
                    <ConversationView
                        lead={lead}
                        messages={messages}
                        state={state}
                    />
                )}
                {activeTab === 'intelligence' && (
                    <IntelligenceView
                        lead={lead}
                        state={state}
                        onUpdate={handleUpdate}
                    />
                )}
                {activeTab === 'profile' && (
                    <div className="space-y-8 animate-fade-up">
                        <section className="space-y-4">
                            <h3 className="text-xs font-semibold text-ink-muted flex items-center gap-2">
                                Core Details
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-border">
                                    <p className="text-[11px] text-ink-faint font-medium mb-1.5">Registry ID</p>
                                    <p className="text-xs font-semibold text-ink truncate">{lead.id}</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-border">
                                    <p className="text-[11px] text-ink-faint font-medium mb-1.5">Created</p>
                                    <p className="text-xs font-semibold text-ink">{new Date(lead.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xs font-semibold text-ink-muted flex items-center gap-2">
                                Scheduling
                            </h3>
                            <div className="bg-brand-muted rounded-2xl flex items-center justify-between p-6 border-l-4 border-l-brand">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand shadow-card">
                                        <Icon icon="solar:calendar-mark-linear" width={24} />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-ink tracking-tight">Awaiting scheduling</p>
                                        <p className="text-xs text-ink-muted mt-0.5">Optimizing for the best conversion window</p>
                                    </div>
                                </div>
                                <button className="btn-premium !py-2.5 !px-5 text-xs">
                                    Schedule Now
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    )
}
