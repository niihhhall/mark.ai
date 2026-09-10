import React, { useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { useSessions } from '../hooks/useSessions'
import { StatCard } from '../components/ui/StatCard'

const Instances: React.FC = () => {
    const { clients, sessions, isLoading, restartSession, getQR } = useSessions()
    const [pairingId, setPairingId] = useState<string | null>(null)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [isLodingQR, setIsLoadingQR] = useState(false)

    const stats = useMemo(() => {
        const total = clients.length
        const online = sessions.filter(s => s.status === 'connected').length
        const offline = total - online
        const health = total > 0 ? Math.round((online / total) * 100) : 0

        return [
            { label: 'Total Nodes', value: total, icon: 'solar:server-square-linear', color: 'bg-brand-muted text-brand' },
            { label: 'Active Relays', value: online, icon: 'solar:wifi-router-minimalistic-linear', color: 'bg-emerald-50 text-emerald-600', pulse: online > 0 },
            { label: 'Offline Nodes', value: offline, icon: 'solar:wifi-router-minimalistic-outline', color: 'bg-gray-100 text-gray-500' },
            { label: 'Sync Health', value: `${health}%`, icon: 'solar:bolt-linear', color: 'bg-amber-50 text-amber-600' },
        ]
    }, [clients, sessions])

    const handlePair = async (clientId: string) => {
        setPairingId(clientId)
        setIsLoadingQR(true)
        setQrCode(null)

        // Initial start call
        await restartSession(clientId)

        // Poll for QR
        const poll = setInterval(async () => {
            const qr = await getQR(clientId)
            if (qr) {
                setQrCode(qr)
                setIsLoadingQR(false)
                clearInterval(poll)
            }
        }, 2000)

        // Auto-cleanup after 1 minute
        setTimeout(() => clearInterval(poll), 60000)
    }

    const getStatus = (clientId: string) => {
        const s = sessions.find(s => s.sessionId === clientId)
        return s?.status || 'offline'
    }

    return (
        <div className="p-8 space-y-10 animate-fade-up max-w-[1700px] mx-auto">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h1 className="text-3xl font-bold text-ink tracking-tight">
                        Node <span className="text-brand">Instances</span>
                    </h1>
                    <p className="text-sm text-ink-muted mt-2">WhatsApp relay management</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-600">Relay Active</span>
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
                        pulse={s.pulse}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center">
                        <Icon icon="solar:refresh-linear" width={32} className="text-brand animate-spin mx-auto mb-4" />
                        <p className="text-xs font-medium text-ink-muted">Synchronizing nodes...</p>
                    </div>
                ) : (
                    clients.map(client => {
                        const status = getStatus(client.id)
                        return (
                            <div key={client.id} className="card p-7 relative group hover:border-brand/30 hover:shadow-lift transition-all duration-300">
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="space-y-1.5">
                                        <h3 className="text-lg font-bold text-ink tracking-tight">{client.business_name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:smartphone-2-linear" width={14} className="text-ink-faint" />
                                            <p className="text-xs text-ink-muted">{client.whatsapp_number}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300 ${
                                        status === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        status === 'pairing' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                        {status}
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10 pb-6 border-b border-border">
                                    <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                                        <span>Node Address</span>
                                        <span className="text-ink font-medium bg-bg-elevated px-2 py-0.5 rounded-md">{client.id.slice(0, 8)}...</span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
                                        <span>Last Heartbeat</span>
                                        <span className="text-ink">Active Now</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
                                    <button
                                        onClick={() => handlePair(client.id)}
                                        disabled={status === 'connected'}
                                        className={`btn-premium flex items-center justify-center gap-2 ${
                                            status === 'connected'
                                            ? 'opacity-40 cursor-not-allowed'
                                            : ''
                                        }`}
                                    >
                                        <Icon icon="solar:qr-code-linear" width={16} /> Pair Node
                                    </button>
                                    <button
                                        onClick={() => restartSession(client.id)}
                                        className="btn-secondary flex items-center justify-center gap-2"
                                    >
                                        <Icon icon="solar:refresh-linear" width={16} /> Restart
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {pairingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setPairingId(null)}></div>
                    <div className="relative w-full max-w-md card p-8 shadow-lift animate-in zoom-in-95 duration-300 text-center">
                        <button onClick={() => setPairingId(null)} className="absolute top-5 right-5 text-ink-faint hover:text-ink transition-colors">
                            <Icon icon="solar:close-circle-linear" width={24} />
                        </button>

                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-muted text-brand mb-6">
                            <Icon icon="solar:qr-code-linear" width={28} />
                        </div>

                        <h2 className="text-2xl font-bold text-ink tracking-tight mb-2">Scan to <span className="text-brand">Pair</span></h2>
                        <p className="text-sm text-ink-muted mb-8">Scan the code with WhatsApp to link this device</p>

                        <div className="relative aspect-square w-full bg-white p-6 rounded-2xl border border-border overflow-hidden flex items-center justify-center">
                            {isLodingQR ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Icon icon="solar:refresh-linear" width={36} className="text-brand animate-spin" />
                                    <p className="text-xs font-medium text-ink-muted">Generating QR code...</p>
                                </div>
                            ) : (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode || '')}`}
                                    alt="QR Pair"
                                    className="w-full h-full object-contain mix-blend-multiply"
                                />
                            )}
                        </div>

                        <div className="mt-8 space-y-3">
                            <div className="flex items-center gap-2 justify-center text-xs font-medium text-ink-muted">
                                <Icon icon="solar:link-circle-linear" width={16} className="text-brand" />
                                Waiting for link stabilization...
                            </div>
                            <p className="text-[11px] text-ink-faint leading-relaxed">
                                Open WhatsApp &gt; Linked Devices &gt; Link a Device. <br/>
                                System will auto-close on successful connection.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Instances
