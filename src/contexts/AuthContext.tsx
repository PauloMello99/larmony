import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/services/supabase'
import type { Tables } from '@/types/database.types'
import { useQueryClient } from '@tanstack/react-query'

type Profile = Tables<'profiles'>

interface Household {
  id: string
  name: string
  role: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** All households the user belongs to */
  households: Household[]
  /** The currently active household (persisted in localStorage) */
  activeHouseholdId: string | null
  /** Backward-compatible alias for activeHouseholdId */
  householdId: string | null
  setActiveHouseholdId: (id: string) => void
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  /** Persist locale to DB and update i18n */
  setLocale: (locale: string) => Promise<void>
}

const ACTIVE_HOUSEHOLD_KEY = 'hf:activeHouseholdId'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileData) {
        setProfile(profileData)
        if (profileData.locale) {
          i18n.changeLanguage(profileData.locale)
        }
      }

      const { data: memberships } = await supabase
        .from('household_memberships')
        .select('household_id, role, households(id, name)')
        .eq('user_id', userId)

      if (memberships && memberships.length > 0) {
        const householdList: Household[] = memberships
          .filter((m) => m.households)
          .map((m) => ({
            id: (m.households as { id: string; name: string }).id,
            name: (m.households as { id: string; name: string }).name,
            role: m.role,
          }))

        setHouseholds(householdList)

        // Restore active household from localStorage if still valid
        const stored = localStorage.getItem(ACTIVE_HOUSEHOLD_KEY)
        const isValidStored = stored && householdList.some((h) => h.id === stored)
        const resolved = isValidStored ? stored : (householdList[0]?.id ?? null)
        setActiveHouseholdIdState(resolved)
        if (resolved) localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, resolved)
      } else {
        setHouseholds([])
        setActiveHouseholdIdState(null)
      }
    },
    [i18n]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setHouseholds([])
        setActiveHouseholdIdState(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const setActiveHouseholdId = useCallback(
    (id: string) => {
      setActiveHouseholdIdState(id)
      localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, id)
      queryClient.invalidateQueries()
    },
    [queryClient]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setHouseholds([])
    setActiveHouseholdIdState(null)
    localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY)
    queryClient.clear()
  }, [queryClient])

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id)
  }, [session, loadProfile])

  const setLocale = useCallback(
    async (locale: string) => {
      if (!session?.user) return
      await supabase.from('profiles').update({ locale }).eq('id', session.user.id)
      setProfile((prev) => (prev ? { ...prev, locale } : prev))
      i18n.changeLanguage(locale)
    },
    [session, i18n]
  )

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        households,
        activeHouseholdId,
        householdId: activeHouseholdId,
        setActiveHouseholdId,
        isLoading,
        signOut,
        refreshProfile,
        setLocale,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
