import React, { useEffect, useRef, useState } from 'react'
import type { Lead, Message, ConversationState } from '../../types'
import { Badge } from '../ui/Badge'
import { Icon } from '@iconify/react'
import { supabase } from '../../lib/supabase'

interface ConversationViewProps {
    messages: Message[]
    isLoading?: boolean
    lead: Lead
    state: ConversationState | null
}

type ToastType = 'success' | 'error' | 'loading'
interface Toast {
    message: string
    type: ToastType
}

export const ConversationView: React.FC<ConversationViewProps> = ({
    messages,
    isLoading,
    lead,
    state
}) => {
    const leadName = lead.first_name || 'Lead'
    const currentState = state?.current_state || 'Opening'
    const scrollRef = useRef<HTMLDivElement>(null)
    const [toast, setToast] = useState<Toast | null>(null)
    const [isCollecting, setIsCollecting] = useState(false)
    const [activeFeedback, setActiveFeedback] = useState<string | null>(null)

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type })
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 3500)
        }
    }

    // Write directly to Supabase training_data table — using correct column names
    const handleCollect = async () => {
        if (messages.length === 0) {
            showToast('No messages to collect', 'error')
            return
        }
        setIsCollecting(true)
        showToast('Collecting for training pool...', 'loading')
        try {
            const { error } = await supabase.from('training_data').insert({
                lead_id: lead.id,
                history: messages.map(m => ({
                    role: m.direction === 'outbound' ? 'assistant' : 'user',
                    content: m.content
                })),
                outcome: lead.outcome || 'In Progress',
                is_reviewed: false,
                created_at: new Date().toISOString()
            })
            if (error) throw error
            showToast('Added to Training Pool ✓', 'success')
        } catch (error: any) {
            console.error('Collection failed:', error)
            showToast(error.message || 'Failed to collect', 'error')
        } finally {
            setIsCollecting(false)
        }
    }

    // Write feedback directly to Supabase — using correct column names
    const handleQuickFeedback = async (type: string) => {
        if (messages.length === 0) {
            showToast('No messages to evaluate', 'error')
            return
        }
        setActiveFeedback(type)
        showToast(`Saving ${type} feedback...`, 'loading')
        try {
            const { error } = await supabase.from('training_data').insert({
                lead_id: lead.id,
                history: messages.map(m => ({
                    role: m.direction === 'outbound' ? 'assistant' : 'user',
                    content: m.content
                })),
                outcome: lead.outcome || 'In Progress',
                feedback: `Feedback: ${type}`,
                is_reviewed: true,
                created_at: new Date().toISOString()
            })
            if (error) throw error
            showToast(`${type} feedback saved ✓`, 'success')
        } catch (error: any) {
            console.error('Feedback failed:', error)
            showToast(error.message || 'Failed to save feedback', 'error')
        } finally {
            setActiveFeedback(null)
        }
    }

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <div className="flex flex-col h-full animate-fade-up relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-0 right-0 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border text-xs font-medium shadow-card animate-fade-up transition-all
                    ${toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-600' :
                      toast.type === 'error'   ? 'bg-white border-red-200 text-red-600' :
                                                 'bg-white border-border text-ink-muted'}`}>
                    {toast.type === 'loading' && <Icon icon="solar:clock-circle-linear" width={14} className="animate-spin text-brand" />}
                    {toast.type === 'success' && <Icon icon="solar:check-circle-linear" width={14} />}
                    {toast.type === 'error'   && <Icon icon="solar:close-circle-linear" width={14} />}
                    {toast.message}
                </div>
            )}

            <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                    <Badge variant="state" value={currentState as any} />
                    <span className="text-xs text-ink-muted">
                        {messages.length} messages
                    </span>
                </div>
                <button
                    onClick={handleCollect}
                    disabled={isCollecting}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-muted border border-brand/20 rounded-xl hover:bg-brand/10 transition-colors disabled:opacity-40"
                >
                    {isCollecting
                        ? <Icon icon="solar:clock-circle-linear" width={16} className="text-brand animate-spin" />
                        : <Icon icon="solar:brain-linear" width={16} className="text-brand" />
                    }
                    <span className="text-xs font-semibold text-brand">
                        {isCollecting ? 'Collecting...' : 'Collect for Training'}
                    </span>
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar pb-8 bg-bg-elevated/40 rounded-2xl p-4"
            >
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse opacity-50`}>
                            <div className={`w-2/3 h-16 rounded-2xl ${i % 2 === 0 ? 'bg-brand/30' : 'bg-gray-100 border border-border'}`} />
                        </div>
                    ))
                ) : (
                    messages.map((msg, i) => {
                        const isAgent = msg.direction === 'outbound'
                        return (
                            <div key={msg.id || i} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-fade-up`} style={{ animationDelay: `${i * 30}ms` }}>
                                <div className={`max-w-[85%] px-5 py-3.5 text-sm leading-relaxed ${isAgent
                                    ? 'bg-brand text-white rounded-2xl rounded-br-md shadow-card'
                                    : 'bg-white border border-border text-ink rounded-2xl rounded-bl-md'
                                    }`}>
                                    {msg.content}
                                    <div className={`text-[10px] mt-2 flex items-center gap-2 ${isAgent ? 'text-white/70' : 'text-ink-faint'}`}>
                                        <span>{isAgent ? 'AI Agent' : leadName}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-current opacity-40"></span>
                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                {state?.is_typing && !isLoading && (
                    <div className="flex justify-end animate-fade-up">
                        <div className="bg-brand text-white px-5 py-3.5 rounded-2xl rounded-br-md shadow-card flex items-center gap-3">
                            <span className="text-xs font-medium">Typing</span>

                            <div className="flex gap-1 pt-0.5">
                                <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-32 text-center space-y-4">
                        <div className="w-20 h-20 bg-white border border-border rounded-full flex items-center justify-center">
                            <Icon icon="solar:chat-round-dots-linear" width={32} className="text-ink-faint" />
                        </div>
                        <p className="text-sm text-ink-muted">No messages yet in this conversation</p>
                    </div>
                )}
            </div>

            {/* Status Footer & Quick Feedback */}
            <div className="pt-6 border-t border-border mt-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted font-medium">Quick Feedback</span>
                    <div className="flex gap-2">
                        {(['TONE', 'LOGIC', 'SALES'] as const).map((type, idx) => {
                            const colors = [
                                'text-amber-600 hover:bg-amber-50 hover:border-amber-200',
                                'text-blue-600 hover:bg-blue-50 hover:border-blue-200',
                                'text-brand hover:bg-brand-muted hover:border-brand/20'
                            ]
                            const isActive = activeFeedback === type
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleQuickFeedback(type)}
                                    disabled={!!activeFeedback}
                                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-border bg-bg-elevated text-[11px] font-semibold transition-colors disabled:opacity-50 ${colors[idx]}`}
                                >
                                    {isActive && <Icon icon="solar:clock-circle-linear" width={12} className="animate-spin" />}
                                    {type}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="card rounded-xl px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-ink-muted">AI Agent Connected</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-brand-muted rounded-lg border border-brand/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div>
                            <span className="text-[11px] font-semibold text-brand">Autonomous Mode</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
