import React, { useState } from 'react'
import type { Lead } from '../types'
import { LeadsList } from '../components/leads/LeadsList'
import { LeadDetail } from '../components/leads/LeadDetail'
import { Icon } from '@iconify/react'

interface ConversationsProps {
    leads: Lead[]
    isLoading?: boolean
    refetch: () => void
}

const Conversations: React.FC<ConversationsProps> = ({ leads, isLoading, refetch }) => {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null)

    const selectedLead = leads.find(l => l.id === selectedLeadId)

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden lg:p-8 lg:gap-6 animate-fade-up">
            <div className="w-full lg:w-[450px] flex-shrink-0 card lg:rounded-2xl overflow-hidden flex flex-col">
                <div className="p-8 border-b border-border bg-bg-elevated/40">
                    <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center text-brand">
                            <Icon icon="solar:chat-round-dots-linear" width={22} />
                        </div>
                        Live <span className="text-brand">Conversations</span>
                    </h1>
                    <p className="text-xs text-ink-muted mt-2">
                        Monitor and manage active lead conversations
                    </p>
                    <div className="flex items-center gap-2 mt-4 px-3 py-1.5 bg-brand-muted border border-brand/20 rounded-xl w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-xs font-semibold text-brand">{leads.length} Active Threads</span>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <LeadsList
                        leads={leads}
                        selectedId={selectedLeadId}
                        onSelect={setSelectedLeadId}
                        isLoading={isLoading}
                        mode="conversations"
                    />
                </div>
            </div>

            <div className="hidden lg:flex flex-1 card rounded-2xl overflow-hidden relative">
                {selectedLead ? (
                    <div className="w-full h-full">
                        <LeadDetail
                            lead={selectedLead}
                            onClose={() => { }}
                            refetch={refetch}
                        />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center space-y-6">
                        <div className="w-20 h-20 card rounded-2xl flex items-center justify-center">
                            <Icon icon="solar:chat-round-dots-linear" width={32} className="text-ink-faint" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-ink tracking-tight">No Conversation Selected</h3>
                            <p className="text-sm text-ink-muted leading-relaxed max-w-[240px]">
                                Select an active conversation thread from the list to view details.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Conversations
