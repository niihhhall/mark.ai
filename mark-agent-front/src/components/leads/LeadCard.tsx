import React from 'react'
import type { Lead, ConversationState } from '../../types'
import { Badge } from '../ui/Badge'
import { Icon } from '@iconify/react'

interface LeadCardProps {
    lead: Lead
    active?: boolean
    onClick: () => void
    variant?: 'compact' | 'full'
    state?: ConversationState
    showState?: boolean
}

export const LeadCard: React.FC<LeadCardProps> = ({
    lead,
    active,
    onClick,
    variant = 'full',
    state,
    showState
}) => {
    const isCompact = variant === 'compact'

    return (
        <button
            onClick={onClick}
            className={`
        w-full text-left p-5 rounded-xl border transition-all duration-200 relative overflow-hidden group
        ${active
                    ? 'bg-brand-muted border-brand/30 text-brand shadow-card'
                    : 'bg-white border-border hover:border-brand/30 hover:shadow-lift'}
      `}
        >
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-r-full"></div>}


            <div className="flex justify-between items-start mb-3">
                <div className="min-w-0">
                    <h4 className={`font-semibold tracking-tight text-ink truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                        {lead.first_name || lead.last_name ? `${lead.first_name} ${lead.last_name}` : 'New Lead'}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                        <Icon icon="solar:phone-linear" width={14} className="text-brand shrink-0" />
                        <p className="text-xs text-ink-muted font-medium">
                            {lead.phone}
                        </p>
                    </div>
                    {lead.company && (
                        <div className="flex items-center gap-2 mt-1.5">
                            <Icon icon="solar:buildings-2-linear" width={14} className="text-ink-faint shrink-0" />
                            <p className="text-xs text-ink-muted truncate">
                                {lead.company}
                            </p>
                        </div>
                    )}
                </div>
                {!isCompact && <Badge variant="temperature" value={lead.temperature} />}
            </div>

            {!isCompact && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Badge variant="outcome" value={lead.outcome} label="Outcome" />
                    {showState && state && <Badge variant="state" value={state.current_state} label="State" />}
                </div>
            )}

            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-ink-faint">
                        {Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / 60000)}m ago
                    </span>
                    {state && (
                        <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-bg-elevated border border-border">
                            <Icon icon="solar:wallet-linear" width={13} className={state.bant_budget ? 'text-brand' : 'text-ink-faint/50'} />
                            <Icon icon="solar:user-check-linear" width={13} className={state.bant_authority ? 'text-brand' : 'text-ink-faint/50'} />
                            <Icon icon="solar:target-linear" width={13} className={state.bant_need ? 'text-brand' : 'text-ink-faint/50'} />
                            <Icon icon="solar:clock-circle-linear" width={13} className={state.bant_timeline ? 'text-brand' : 'text-ink-faint/50'} />
                        </div>
                    )}
                </div>
                {lead.outcome === 'In Progress' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-brand pulse-dot"></div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/60">
                <div
                    className={`h-full transition-all duration-500 ${lead.signal_score >= 7 ? 'bg-brand' : lead.signal_score >= 4 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                    style={{ width: `${lead.signal_score * 10}%` }}
                ></div>
            </div>
        </button>
    )
}
