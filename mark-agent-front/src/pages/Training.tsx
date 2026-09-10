import React, { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { supabase } from '../lib/supabase'

const Training: React.FC = () => {
    const [examples, setExamples] = useState<any[]>([])
    const [worthyPool, setWorthyPool] = useState<any[]>([])
    const [brainRules, setBrainRules] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [apiError, setApiError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'library' | 'pool' | 'brain'>('library')
    const [isReviewOpen, setIsReviewOpen] = useState(false)
    const [reviewItem, setReviewItem] = useState<any | null>(null)
    const [manualScore, setManualScore] = useState<number>(0)
    const [feedback, setFeedback] = useState("")
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newExampleTitle, setNewExampleTitle] = useState("")
    const [newExampleJSON, setNewExampleJSON] = useState("")

    // Brain Rule Form State
    const [isBrainAddOpen, setIsBrainAddOpen] = useState(false)
    const [brainForm, setBrainForm] = useState({
        category: 'sales',
        scenario: '',
        ideal_response: '',
        trigger_keywords: [] as string[],
        priority: 1
    })

    const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost'
    const defaultApiUrl = isProd ? 'https://markeye-agent-production.up.railway.app' : 'http://localhost:8000'
    const apiUrl = import.meta.env.VITE_API_URL || defaultApiUrl
    const API_BASE = `${apiUrl}/training`

    useEffect(() => {
        fetchData()

        const channel = supabase
            .channel('training-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'training_data' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dynamic_training' }, () => fetchData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])


    const fetchData = async () => {
        setIsLoading(true)
        setApiError(null)
        try {
            // Pool data always comes from Supabase — get it first
            const poolRes = await supabase.from('training_data').select('*, leads(first_name, last_name)').order('created_at', { ascending: false })
            if (poolRes.data) setWorthyPool(poolRes.data)

            // Library and Brain come from the Flask backend
            const [libRes, brainRes] = await Promise.all([
                fetch(`${API_BASE}/library`),
                fetch(`${API_BASE}/brain`)
            ])

            const libData = await libRes.json()
            const brainData = await brainRes.json()

            if (libData.status === 'ok') setExamples(libData.examples)
            if (brainData.status === 'ok') setBrainRules(brainData.data)
        } catch (error: any) {
            console.error('Error fetching training data:', error)
            setApiError(`Backend unreachable: ${API_BASE}. Check if the Agent API is running.`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteExample = async (filename: string) => {
        if (!confirm("Delete this pattern from Success Library?")) return
        try {
            await fetch(`${API_BASE}/library/${filename}`, { method: 'DELETE' })
            fetchData()
        } catch (error) {
            alert("Delete failed")
        }
    }

    const handleDeleteBrainRule = async (id: number) => {
        if (!confirm("Remove this rule from the Active Neuro-Core?")) return
        try {
            await fetch(`${API_BASE}/brain/${id}`, { method: 'DELETE' })
            fetchData()
        } catch (error) {
            alert("Delete failed")
        }
    }

    const handleAddBrainRule = async () => {
        try {
            const res = await fetch(`${API_BASE}/brain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...brainForm,
                    is_active: true
                })
            })
            if (res.ok) {
                setIsBrainAddOpen(false)
                setBrainForm({ category: 'sales', scenario: '', ideal_response: '', trigger_keywords: [], priority: 1 })
                fetchData()
            }
        } catch (error) {
            alert("Failed to inject into neural brain")
        }
    }

    const handleExport = async () => {
        try {
            await fetch(`${API_BASE}/export`, { method: 'POST' })
            alert("Export started in background!")
        } catch (error) {
            alert("Export failed")
        }
    }

    const handleAddExample = async () => {
        try {
            const parsed = JSON.parse(newExampleJSON)
            const res = await fetch(`${API_BASE}/library`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: newExampleTitle,
                    ...parsed
                })
            })
            if (res.ok) {
                setIsAddOpen(false)
                setNewExampleTitle("")
                setNewExampleJSON("")
                fetchData()
            }
        } catch (error) {
            alert("Invalid JSON or server error")
        }
    }

    const handleSaveReview = async () => {
        if (!reviewItem) return
        try {
            await fetch(`${API_BASE}/worthy/${reviewItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manual_score: manualScore,
                    feedback: feedback,
                    is_reviewed: true
                })
            })
            setIsReviewOpen(false)
            fetchData()
        } catch (error) {
            alert("Failed to save review")
        }
    }

    return (
        <div className="p-10 space-y-8 animate-fade-up max-w-[1600px] mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                <div>
                    <h1 className="text-3xl font-bold text-ink tracking-tight">
                        Training <span className="text-brand">Intelligence</span>
                    </h1>
                    <p className="text-sm text-ink-muted mt-2">Pattern refinement hub for your agent</p>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleExport}
                        className="btn-premium flex items-center gap-2 group"
                    >
                        <Icon icon="solar:download-minimalistic-linear" width={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        Export
                    </button>
                </div>
            </div>

            {apiError && (
                <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-medium text-red-600">
                    <Icon icon="solar:danger-triangle-linear" width={18} className="shrink-0" />
                    {apiError} — Pool data from Supabase still visible below
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 flex items-center gap-5 hover:shadow-lift transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-brand-muted flex items-center justify-center text-brand shrink-0">
                        <Icon icon="solar:document-text-linear" width={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-ink-muted">Library Examples</p>
                        <h3 className="text-2xl font-bold text-ink tracking-tight mt-0.5">{examples.length}</h3>
                    </div>
                </div>
                <div className="card p-6 flex items-center gap-5 hover:shadow-lift transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Icon icon="solar:brain-linear" width={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-ink-muted">Training Pool</p>
                        <h3 className="text-2xl font-bold text-ink tracking-tight mt-0.5">{worthyPool.length}</h3>
                    </div>
                </div>
                <div className="card p-6 flex items-center gap-5 hover:shadow-lift transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Icon icon="solar:graph-up-linear" width={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-ink-muted">Success Conversion</p>
                        <h3 className="text-2xl font-bold text-ink tracking-tight mt-0.5">{worthyPool.filter(p => p.outcome === 'booked').length}</h3>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="flex border-b border-border bg-bg-elevated p-1.5 gap-1.5">
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`flex-1 px-6 py-3 text-sm font-semibold transition-all rounded-xl ${activeTab === 'library' ? 'bg-white text-brand shadow-card border border-border' : 'text-ink-muted hover:text-ink'}`}
                    >
                        Success Library
                    </button>
                    <button 
                        onClick={() => setActiveTab('pool')}
                        className={`flex-1 px-6 py-3 text-sm font-semibold transition-all rounded-xl ${activeTab === 'pool' ? 'bg-white text-brand shadow-card border border-border' : 'text-ink-muted hover:text-ink'}`}
                    >
                        Real-time Pool
                    </button>
                    <button 
                        onClick={() => setActiveTab('brain')}
                        className={`flex-1 px-6 py-3 text-sm font-semibold transition-all rounded-xl ${activeTab === 'brain' ? 'bg-white text-brand shadow-card border border-border' : 'text-ink-muted hover:text-ink'}`}
                    >
                        Brain Rules
                    </button>
                </div>

                <div className="p-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <div className="w-14 h-14 border-4 border-gray-100 border-t-brand rounded-full animate-spin"></div>
                            <p className="text-ink-muted text-xs font-medium animate-pulse">Synchronizing training data...</p>
                        </div>
                    ) : activeTab === 'library' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button 
                                onClick={() => setIsAddOpen(true)}
                                className="flex flex-col items-center justify-center p-10 bg-white border-2 border-dashed border-border hover:border-brand/40 rounded-2xl transition-all group min-h-[220px]"
                            >
                                <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center text-ink-muted group-hover:bg-brand-muted group-hover:text-brand border border-border group-hover:border-brand/20 transition-all duration-300 mb-4">
                                    <Icon icon="solar:add-circle-linear" width={28} />
                                </div>
                                <span className="text-sm font-semibold text-ink-muted group-hover:text-brand transition-colors">Add New Pattern</span>
                            </button>
                            {examples.map((ex, i) => (
                                <div key={i} className="p-7 card hover:shadow-lift transition-all group relative animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleDeleteExample(ex.filename)} className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all flex items-center justify-center">
                                            <Icon icon="solar:trash-bin-trash-linear" width={18} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-11 h-11 bg-brand-muted rounded-xl text-brand flex items-center justify-center shrink-0">
                                            <Icon icon="solar:document-text-linear" width={22} />
                                        </div>
                                        <h3 className="font-semibold text-ink tracking-tight pr-10">{ex.title}</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(ex.tags || {}).map(([k, v]: [string, any]) => (
                                            <span key={k} className="text-[11px] font-medium px-2.5 py-1 bg-bg-elevated text-ink-soft rounded-lg border border-border">
                                                {v}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'brain' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <button 
                                onClick={() => setIsBrainAddOpen(true)}
                                className="flex flex-col items-center justify-center p-10 bg-white border-2 border-dashed border-border hover:border-brand/40 rounded-2xl transition-all group min-h-[240px] lg:col-span-2"
                            >
                                <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center text-ink-muted group-hover:bg-brand-muted group-hover:text-brand border border-border group-hover:border-brand/20 transition-all duration-300 mb-4">
                                    <Icon icon="solar:add-circle-linear" width={32} />
                                </div>
                                <span className="text-sm font-semibold text-ink-muted group-hover:text-brand transition-colors">Add New Brain Rule</span>
                                <p className="text-xs text-ink-faint mt-2">Directly augment the system logic</p>
                            </button>
                            {brainRules.map((rule, i) => (
                                <div key={i} className="p-8 card hover:shadow-lift transition-all group relative animate-fade-up">
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleDeleteBrainRule(rule.id)} className="w-10 h-10 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all flex items-center justify-center">
                                            <Icon icon="solar:trash-bin-trash-linear" width={18} />
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-4 mb-8 pr-12">
                                        <div className="w-12 h-12 bg-brand-muted rounded-xl text-brand flex items-center justify-center shrink-0">
                                            <Icon icon="solar:brain-linear" width={26} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-ink tracking-tight">{rule.category} : {rule.subcategory || "Pattern"}</h3>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {rule.trigger_keywords?.map((k: string) => (
                                                    <span key={k} className="text-[10px] font-medium px-2 py-0.5 bg-brand-muted text-brand rounded-md border border-brand/10">#{k}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-bg-elevated rounded-xl p-5 border border-border">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Detected Scenario</p>
                                            <p className="text-[13px] text-ink leading-relaxed">"{rule.scenario}"</p>
                                        </div>
                                        <div className="bg-brand-muted rounded-xl p-5 border border-brand/10">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand mb-2">Mapped Response Path</p>
                                            <p className="text-[13px] text-brand leading-relaxed">"{rule.ideal_response}"</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-2 custom-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                    <tr className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide">
                                        <th className="pb-4 px-6">Subject</th>
                                        <th className="pb-4 px-6">Accuracy</th>
                                        <th className="pb-4 px-6">Disposition</th>
                                        <th className="pb-4 px-6">Commentary</th>
                                        <th className="pb-4 px-6">Timestamp</th>
                                        <th className="pb-4 px-6 text-right">Protocol</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {worthyPool.map((p, i) => (
                                        <tr key={i} className="group animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                                            <td className="py-4 px-6 first:rounded-l-2xl bg-white border border-r-0 border-border group-hover:border-brand/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center text-sm font-bold text-brand shrink-0">
                                                        {(p.leads?.first_name?.[0] || 'U')}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-sm text-ink">
                                                            {p.leads?.first_name} {p.leads?.last_name || ""}
                                                        </span>
                                                        {p.is_reviewed && (
                                                            <div className="mt-1 py-0.5 px-2 bg-emerald-50 text-emerald-600 text-[10px] font-semibold rounded-md w-fit border border-emerald-100">
                                                                Validated
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 bg-white border border-r-0 border-border group-hover:border-brand/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-700 ${p.score > 85 ? 'bg-gradient-to-r from-brand to-brand-dark' : 'bg-amber-400'}`}
                                                            style={{ width: `${p.score}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`font-semibold text-xs ${p.score > 85 ? 'text-brand' : 'text-amber-600'}`}>
                                                        {p.score}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 bg-white border border-r-0 border-border group-hover:border-brand/20 transition-all">
                                                <span className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${p.outcome === 'booked' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    {p.outcome}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 bg-white border border-r-0 border-border group-hover:border-brand/20 transition-all">
                                                <p className="text-[12px] text-ink-muted max-w-[220px] truncate">
                                                    {p.feedback || "Awaiting human audit"}
                                                </p>
                                            </td>
                                            <td className="py-4 px-6 bg-white border border-r-0 border-border group-hover:border-brand/20 transition-all text-[12px] text-ink-muted">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6 text-right last:rounded-r-2xl bg-white border border-border group-hover:border-brand/20 transition-all">
                                                <button 
                                                    onClick={() => {
                                                        setReviewItem(p)
                                                        setManualScore(p.manual_score || p.score)
                                                        setFeedback(p.feedback || "")
                                                        setIsReviewOpen(true)
                                                    }}
                                                    className="btn-secondary"
                                                >
                                                    Audit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {isReviewOpen && reviewItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white border border-border w-full max-w-6xl max-h-[95vh] rounded-2xl overflow-hidden flex flex-col shadow-lift">
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shadow-card shrink-0">
                                    <Icon icon="solar:brain-linear" width={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-ink tracking-tight">Context Audit</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-xs font-semibold text-brand bg-brand-muted px-2.5 py-1 rounded-md">Session: {reviewItem.id.slice(0,12)}</p>
                                        <p className="text-xs text-ink-muted">Cognitive reconstruction</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsReviewOpen(false)} className="w-10 h-10 rounded-xl hover:bg-bg-elevated flex items-center justify-center text-ink-faint hover:text-ink transition-all active:scale-95">
                                <Icon icon="solar:close-circle-linear" width={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-bg-base custom-scrollbar">
                            {reviewItem.history?.map((msg: any, idx: number) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`} style={{ animationDelay: `${idx * 40}ms` }}>
                                    <div className={`max-w-[80%] px-6 py-4 rounded-2xl text-sm leading-relaxed transition-all duration-300 ${msg.role === 'user' 
                                        ? 'bg-brand text-white font-medium rounded-br-sm shadow-card' 
                                        : 'bg-white text-ink border border-border rounded-bl-sm shadow-card'}`}>
                                        <p className="whitespace-pre-wrap">{msg.content.replaceAll('|||', '\n')}</p>
                                        <div className={`text-[10px] mt-3 font-semibold flex items-center gap-2 ${msg.role === 'user' ? 'text-white/70' : 'text-ink-faint'}`}>
                                            <span>{msg.role === 'user' ? 'Direct Source' : 'Neural Agent'}</span>
                                            <span>· Record {String(idx + 1).padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-8 py-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-5">
                                <div className="flex items-end justify-between mb-1">
                                    <div>
                                        <label className="text-xs font-semibold text-brand">Calibrate Accuracy</label>
                                        <p className="text-xs text-ink-muted mt-0.5">Manual weight adjustment</p>
                                    </div>
                                    <span className="text-3xl font-bold text-brand tracking-tight">{manualScore}%</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={manualScore} 
                                    onChange={(e) => setManualScore(Number(e.target.value))}
                                    className="w-full accent-brand cursor-pointer"
                                />
                                <div className="flex justify-between text-[11px] text-ink-faint font-medium">
                                    <span>Sub-optimal</span>
                                    <span>Nominal</span>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-brand">Expert Feedback</label>
                                    <p className="text-xs text-ink-muted mt-0.5">Direct pattern guidance</p>
                                </div>
                                <textarea 
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Enter instructions for pattern adaptation..."
                                    className="input-modern w-full h-32 resize-none !text-[13px]"
                                />
                                <div className="flex gap-2">
                                    {[
                                        { label: "Tone", text: "Tone: " },
                                        { label: "Logic", text: "Logic: " },
                                        { label: "Sales", text: "Sales: " }
                                    ].map(btn => (
                                        <button 
                                            key={btn.label}
                                            onClick={() => setFeedback(prev => prev ? `${prev}\n${btn.text}` : btn.text)}
                                            className="text-xs font-medium px-3 py-1.5 bg-bg-elevated border border-border rounded-lg text-ink-soft hover:text-brand hover:border-brand/30 transition-all"
                                        >
                                            + {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-border flex flex-col md:flex-row justify-between md:items-center gap-4 bg-bg-elevated">
                            <button 
                                onClick={() => {
                                    setBrainForm({
                                        category: 'success',
                                        scenario: reviewItem.history.find((m:any) => m.role === 'user')?.content || 'Customer Inquiry',
                                        ideal_response: reviewItem.history.find((m:any) => m.role === 'assistant')?.content || '',
                                        trigger_keywords: [],
                                        priority: 2
                                    })
                                    setIsReviewOpen(false)
                                    setIsBrainAddOpen(true)
                                }}
                                className="group flex items-center gap-4 self-start"
                            >
                                <div className="w-11 h-11 rounded-xl bg-brand-muted flex items-center justify-center text-brand group-hover:scale-105 transition-transform duration-300 shrink-0">
                                    <Icon icon="solar:magic-stick-3-linear" width={22} />
                                </div>
                                <div className="text-left">
                                    <span className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">Convert to Brain Rule</span>
                                    <p className="text-xs text-ink-muted">Make this performance a permanent rule</p>
                                </div>
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setIsReviewOpen(false)} className="btn-ghost">Cancel</button>
                                <button onClick={handleSaveReview} className="btn-premium flex items-center gap-2">
                                    <Icon icon="solar:diskette-linear" width={18} />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isBrainAddOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white border border-border w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col shadow-lift max-h-[95vh]">
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-ink tracking-tight">Add Brain Rule</h2>
                                <p className="text-xs text-ink-muted mt-1.5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Direct logic augmentation
                                </p>
                            </div>
                            <button onClick={() => setIsBrainAddOpen(false)} className="w-10 h-10 rounded-xl hover:bg-bg-elevated flex items-center justify-center text-ink-faint hover:text-ink transition-all active:scale-95">
                                <Icon icon="solar:close-circle-linear" width={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 custom-scrollbar overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-ink-soft ml-1">Category</label>
                                    <select 
                                        value={brainForm.category}
                                        onChange={(e) => setBrainForm({...brainForm, category: e.target.value})}
                                        className="input-modern w-full cursor-pointer appearance-none"
                                    >
                                        <option value="sales">Sales Strategy</option>
                                        <option value="voice">Brand Voice</option>
                                        <option value="objection">Objection Handling</option>
                                        <option value="success">Success Path</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-ink-soft ml-1">Trigger Keywords</label>
                                    <input 
                                        type="text" 
                                        placeholder="Comma separated keywords..."
                                        value={brainForm.trigger_keywords.join(',')}
                                        onChange={(e) => setBrainForm({...brainForm, trigger_keywords: e.target.value.split(',').map(s => s.trim())})}
                                        className="input-modern w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-ink-soft ml-1">Stimulus Scenario</label>
                                <textarea 
                                    placeholder='Describe the exact customer situation...'
                                    value={brainForm.scenario}
                                    onChange={(e) => setBrainForm({...brainForm, scenario: e.target.value})}
                                    className="input-modern w-full h-28 resize-none !text-[13px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-ink-soft ml-1">Golden Response</label>
                                <textarea 
                                    placeholder='Define the perfect response for this situation...'
                                    value={brainForm.ideal_response}
                                    onChange={(e) => setBrainForm({...brainForm, ideal_response: e.target.value})}
                                    className="input-modern w-full h-36 resize-none !text-[13px]"
                                />
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-border flex justify-end gap-3 bg-bg-elevated">
                            <button onClick={() => setIsBrainAddOpen(false)} className="btn-ghost">Cancel</button>
                            <button 
                                onClick={handleAddBrainRule}
                                className="btn-premium flex items-center gap-2"
                            >
                                <Icon icon="solar:brain-linear" width={18} />
                                Create Rule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAddOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white border border-border w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col shadow-lift max-h-[95vh]">
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-ink tracking-tight">Add Pattern</h2>
                                <p className="text-xs text-ink-muted mt-1.5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Manual pattern mapping
                                </p>
                            </div>
                            <button onClick={() => setIsAddOpen(false)} className="w-10 h-10 rounded-xl hover:bg-bg-elevated flex items-center justify-center text-ink-faint hover:text-ink transition-all active:scale-95">
                                <Icon icon="solar:close-circle-linear" width={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 custom-scrollbar overflow-y-auto">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-ink-soft ml-1">Pattern Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Sales Psych Trigger v0.4"
                                    value={newExampleTitle}
                                    onChange={(e) => setNewExampleTitle(e.target.value)}
                                    className="input-modern w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-semibold text-ink-soft">Pattern JSON</label>
                                    <span className="text-[11px] font-medium text-brand bg-brand-muted px-2.5 py-1 rounded-md">Awaiting input</span>
                                </div>
                                <textarea 
                                    placeholder='Define the pattern JSON here...'
                                    value={newExampleJSON}
                                    onChange={(e) => setNewExampleJSON(e.target.value)}
                                    className="input-modern w-full h-64 font-mono !text-[12px] leading-relaxed resize-none scrollbar-hide"
                                />
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-border flex justify-end gap-3 bg-bg-elevated">
                            <button onClick={() => setIsAddOpen(false)} className="btn-ghost">Cancel</button>
                            <button 
                                onClick={handleAddExample}
                                className="btn-premium flex items-center gap-2"
                            >
                                <Icon icon="solar:diskette-linear" width={18} />
                                Save Pattern
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Training
