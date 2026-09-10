import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('markeye_supabase_url')
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('markeye_supabase_key')

export const isDemoMode = localStorage.getItem('markeye_demo_mode') === 'true'

const isValidUrl = (url: string) => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

// Check for placeholders in env
if (supabaseUrl === 'your_supabase_url_here') {
    supabaseUrl = localStorage.getItem('markeye_supabase_url') || null
}
if (supabaseAnonKey === 'your_supabase_anon_key_here') {
    supabaseAnonKey = localStorage.getItem('markeye_supabase_key') || null
}

export let supabase = createClient(
    isValidUrl(supabaseUrl || '') ? supabaseUrl! : 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)

export const updateSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('markeye_supabase_url', url)
    localStorage.setItem('markeye_supabase_key', key)
    localStorage.removeItem('markeye_demo_mode') // Disable demo mode if real config provided

    // Create new client instance
    supabase = createClient(url, key)

    // Force reload to pick up new client everywhere
    window.location.reload()
}

export const enableDemoMode = () => {
    localStorage.setItem('markeye_demo_mode', 'true')
    window.location.reload()
}

export const hasValidConfig = () => {
    if (isDemoMode) return true
    return isValidUrl(supabaseUrl || '') && !!supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here'
}

