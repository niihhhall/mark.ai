import React, { useEffect, useState, useCallback } from 'react'
import { supabase, isDemoMode } from '../../lib/supabase'
import { MOCK_MESSAGES, MOCK_SESSIONS } from '../../lib/mockData'
import type { Message, LLMSession } from '../../types'
import { Icon } from '@iconify/react'

type FeedItem =
    | { type: 'message'; data: Message }
    | { type: 'ai'; data: LLMSession }

export const ActivityFeed: React.FC = () => {
    const [items, setItems] = useState<FeedItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchLatest = useCallback(async () => {
        if (isDemoMode) {
            const combined: FeedItem[] = [
                ...MOCK_MESSAGES.map(m => ({ type: 'message' as const, data: m })),
                ...MOCK_SESSIONS.map(a => ({ type: 'ai' as const, data: a }))
            ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())
            setItems(combined)
            setIsLoading(false)
            return
        }

        try {
            // Fetch messages
            const { data: msgData } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            // Fetch AI Sessions
            const { data: aiData } = await supabase
                .from('llm_sessions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            const combined: FeedItem[] = [
                ...(msgData || []).map(m => ({ type: 'message' as const, data: m })),
                ...(aiData || []).map(a => ({ type: 'ai' as const, data: a }))
            ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime())

            setItems(combined.slice(0, 15))
        } catch (err) {
            console.error('Error fetching activity:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLatest()
        if (isDemoMode) return

        const channel = supabase.channel('activity-feed-realtime')
            .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchLatest())
            .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'llm_sessions' }, () => fetchLatest())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchLatest])

    if (isLoading && items.length === 0) return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-bg-elevated rounded-2xl animate-pulse border border-border"></div>
            ))}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-bg-elevated flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-muted flex items-center justify-center text-brand">
                            <Icon icon="solar:activity-linear" width={16} />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-ink">Activity Telemetry</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                            <div className="w-2 h-2 rounded-full bg-brand" /> message
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                            <div className="w-2 h-2 rounded-full bg-violet-500" /> intelligence
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-border max-h-[600px] overflow-y-auto custom-scrollbar">
                    {items.map((item, idx) => {
                        const isAI = item.type === 'ai'
                        return (
                            <div key={idx} className="px-6 py-5 flex items-center justify-between group hover:bg-bg-elevated transition-colors animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105 ${isAI
                                        ? 'bg-violet-50 text-violet-600 border-violet-100'
                                        : item.data.direction === 'inbound'
                                            ? 'bg-gray-50 text-ink-muted border-gray-100'
                                            : 'bg-brand-muted text-brand border-brand/20'
                                        }`}>
                                        {isAI ? <Icon icon="solar:cpu-bolt-linear" width={20} /> : <Icon icon="solar:chat-round-dots-linear" width={20} />}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-semibold text-ink tracking-tight">
                                                {isAI
                                                    ? 'AI Context Update'
                                                    : item.data.direction === 'inbound' ? 'Customer Message' : 'Agent Response'
                                                }
                                            </p>
                                            <span className="text-xs text-ink-faint shrink-0 pt-0.5">
                                                / {new Date(item.data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>

                                        <p className="text-xs text-ink-muted truncate mt-1 max-w-[350px] md:max-w-[700px] leading-relaxed">
                                            {isAI
                                                ? `Synchronizing ${item.data.conversation_state} state mapping (${item.data.prompt_tokens} tokens committed)`
                                                : item.data.content
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 shrink-0 ml-6">
                                    {isAI && (
                                        <div className="flex items-center gap-5 p-2.5 rounded-xl bg-bg-elevated border border-border">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 text-violet-600">
                                                    <Icon icon="solar:bolt-linear" width={12} />
                                                    <span className="text-xs font-semibold">{item.data.latency_ms}ms</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-brand mt-1">
                                                    <Icon icon="solar:dollar-minimalistic-linear" width={12} />
                                                    <span className="text-xs font-semibold">${item.data.cost_usd.toFixed(4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {!isAI && (
                                        <div className={`px-3 py-1 rounded-full text-[11px] font-medium border ${item.data.direction === 'inbound' ? 'bg-gray-50 text-ink-muted border-gray-200' : 'bg-brand-muted text-brand border-brand/20'}`}>
                                            {item.data.direction}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

