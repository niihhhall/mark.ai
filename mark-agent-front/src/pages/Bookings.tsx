import React, { useState, useEffect, useMemo } from 'react'
import type { Lead, Booking } from '../types'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/ui/StatCard'
import { BookingsTable } from '../components/bookings/BookingsTable'
import { LeadDetail } from '../components/leads/LeadDetail'
import { Icon } from '@iconify/react'

interface BookingsProps {
    leads: Lead[]
    isLoading?: boolean
}

const Bookings: React.FC<BookingsProps> = ({ leads, isLoading: leadsLoading }) => {
    const [bookings, setBookings] = useState<(Booking & { lead?: Lead })[]>([])
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isBookingsLoading, setIsBookingsLoading] = useState(true)

    useEffect(() => {
        const fetchBookings = async () => {
            setIsBookingsLoading(true)
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .order('scheduled_at', { ascending: true })

                if (error) throw error

                // Link with leads
                const enriched = (data || []).map(b => ({
                    ...b,
                    lead: leads.find(l => l.id === b.lead_id)
                }))
                setBookings(enriched)
            } catch (err) {
                console.error('Error fetching bookings:', err)
            } finally {
                setIsBookingsLoading(false)
            }
        }

        if (leads.length > 0) {
            fetchBookings()
        } else if (!leadsLoading) {
            setIsBookingsLoading(false)
        }
    }, [leads, leadsLoading])

    const stats = useMemo(() => {
        const total = bookings.length
        const confirmed = bookings.filter(b => b.status === 'confirmed').length
        const pending = bookings.filter(b => b.status === 'pending').length
        const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0

        return [
            { label: 'Total Bookings', value: total, icon: 'solar:calendar-minimalistic-linear', color: 'accent' },
            { label: 'Confirmed', value: confirmed, icon: 'solar:check-circle-linear', color: 'blue-500' },
            { label: 'Pending', value: pending, icon: 'solar:clock-circle-linear', color: 'amber-500' },
            { label: 'Success Rate', value: `${rate}%`, icon: 'solar:users-group-rounded-linear', color: 'text-red-500' },
        ]
    }, [bookings])

    return (
        <div className="p-8 space-y-10 animate-fade-up h-full overflow-y-auto pb-20 max-w-[1700px] mx-auto">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-ink">
                        Meeting <span className="text-brand">Schedule</span>
                    </h1>
                    <p className="text-xs text-ink-muted mt-1">Your upcoming meetings and calendar activity</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 card rounded-full">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-semibold text-emerald-600">Sync Active</span>
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

            <div className="card overflow-hidden relative">
                <div className="p-8 border-b border-border flex items-center justify-between bg-bg-elevated/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center text-brand">
                            <Icon icon="solar:calendar-mark-linear" width={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-ink tracking-tight">Upcoming Events</h2>
                            <p className="text-xs text-ink-muted mt-0.5">Scheduling data synced from Calendly</p>
                        </div>
                    </div>
                </div>

                <div className="p-2">
                    <BookingsTable
                        bookings={bookings}
                        isLoading={isBookingsLoading}
                        onViewLead={setSelectedLead}
                    />
                </div>
            </div>

            {/* Lead Detail Drawer for Bookings */}
            {selectedLead && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div
                        className="absolute inset-0 bg-ink/20 backdrop-blur-sm animate-in fade-in duration-500"
                        onClick={() => setSelectedLead(null)}
                    />
                    <div className="relative w-full max-w-2xl bg-bg-card border-l border-border h-full animate-in slide-in-from-right duration-700 shadow-lift">
                        <div className="h-full overflow-hidden">
                            <LeadDetail
                                lead={selectedLead}
                                onClose={() => setSelectedLead(null)}
                                refetch={() => { }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Bookings
