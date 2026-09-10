import React, { useState } from 'react'
import type { Lead, ConversationState } from '../../types'
import { SignalScore } from '../ui/SignalScore'
import { SegmentedControl } from '../ui/SegmentedControl'
import { supabase } from '../../lib/supabase'

interface IntelligenceViewProps {
    lead: Lead
    state: ConversationState | null
    onUpdate: () => void
}

export const IntelligenceView: React.FC<IntelligenceViewProps> = ({
    lead,
    state,
    onUpdate
}) => {
    const [isSaving, setIsSaving] = useState(false)
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const handleOverride = async (field: 'temperature' | 'outcome', value: string) => {
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('leads')
                .update({ [field]: value })
                .eq('id', lead.id)

            if (error) throw error
            setNotification({ message: `Successfully updated to ${value}`, type: 'success' })
            onUpdate()
        } catch (err) {
            console.error('Error updating lead:', err)
            setNotification({ message: 'Failed to update lead', type: 'error' })
        } finally {
            setIsSaving(false)
            setTimeout(() => setNotification(null), 3000)
        }
    }

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scoring & Controls */}
                <div className="space-y-6">
                    <section className="card p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Signal Score</h3>
                            <SignalScore score={lead.signal_score} size="md" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand rounded-full transition-all duration-1000"
                                    style={{ width: `${lead.signal_score * 10}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs mt-4">
                                <span className="text-ink-muted">Confidence Level</span>
                                <span className="font-semibold text-brand">{lead.signal_score * 10}%</span>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand"></span> Temperature Override
                            </h3>
                            <div className="card p-1.5 rounded-xl">
                                <SegmentedControl
                                    options={['Cold', 'Warm', 'Hot']}
                                    activeId={lead.temperature}
                                    onChange={(val) => handleOverride('temperature', val)}
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-500"></span> Disposition Control
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {['In Progress', 'Not Interested', 'Disqualified', 'Meeting Booked'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleOverride('outcome', opt)}
                                        disabled={isSaving}
                                        className={`px-5 py-3.5 text-sm font-medium rounded-xl border transition-colors ${lead.outcome === opt
                                                ? 'bg-brand-muted border-brand/30 text-brand'
                                                : 'bg-white border-border text-ink-muted hover:border-brand/40 hover:text-brand'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Signals & Facts */}
                <div className="space-y-6">
                    <section className="card p-8 relative overflow-hidden">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-6">BANT Signal Analysis</h3>
                        <div className="space-y-4">
                            {[
                                { k: 'Budget', v: state?.bant_budget },
                                { k: 'Authority', v: state?.bant_authority },
                                { k: 'Need', v: state?.bant_need },
                                { k: 'Timeline', v: state?.bant_timeline }
                            ].map((sig) => (
                                <div key={sig.k} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span className="text-sm font-medium text-ink">{sig.k}</span>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sig.v
                                        ? 'bg-bg-elevated border-border text-ink'
                                        : 'bg-gray-50 border-border text-ink-faint'}`}>
                                        {sig.v || 'Analyzing...'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card rounded-2xl p-6 bg-bg-elevated/60 text-sm text-ink-muted leading-relaxed">
                        &quot;Strong intent alignment detected, but price sensitivity remains a factor. The agent is addressing objections with an empathy-driven approach.&quot;
                    </section>

                </div>
            </div>

            {/* Status Notification */}
            {notification && (
                <div className={`fixed bottom-12 right-12 px-6 py-4 rounded-2xl shadow-lift border animate-in slide-in-from-bottom-8 duration-500 z-[100] bg-white ${notification.type === 'success' ? 'border-emerald-200 text-emerald-600' : 'border-red-200 text-red-600'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm font-medium">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
