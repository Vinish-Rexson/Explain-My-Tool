import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state')

    // Handle OAuth redirect by cleaning up the URL
    const handleOAuthRedirect = () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    handleOAuthRedirect()

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: Error getting initial session:', error)
          setLoading(false)
          return
        }

        console.log('AuthProvider: Initial session check', { 
          hasSession: !!session, 
          userEmail: session?.user?.email
        })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('AuthProvider: User found, fetching profile...')
          await fetchOrCreateProfile(session.user)
        } else {
          console.log('AuthProvider: No user session')
          setLoading(false)
        }
      } catch (error) {
        console.error('AuthProvider: Error initializing auth:', error)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed', { 
        event, 
        userEmail: session?.user?.email,
        hasSession: !!session
      })
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('AuthProvider: Fetching profile for authenticated user')
        await fetchOrCreateProfile(session.user)
      } else {
        console.log('AuthProvider: No user, clearing profile')
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchOrCreateProfile = async (user: User) => {
    console.log('AuthProvider: fetchOrCreateProfile started for user:', user.email)
    
    try {
      setLoading(true)
      
      // First try to fetch existing profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        console.log('AuthProvider: Profile not found, creating new profile...')
        // Profile doesn't exist, create it
        const newProfile = {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          subscription_tier: 'free' as const,
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single()

        if (createError) {
          console.error('AuthProvider: Error creating profile:', createError)
          // Still set a basic profile to avoid blocking the user
          setProfile(newProfile)
        } else {
          console.log('AuthProvider: Profile created successfully')
          setProfile(createdProfile)
        }
      } else if (error) {
        console.error('AuthProvider: Error fetching profile:', error)
        // Create a basic profile object to avoid blocking the user
        const fallbackProfile = {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          subscription_tier: 'free' as const,
          github_username: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setProfile(fallbackProfile)
      } else {
        console.log('AuthProvider: Profile fetched successfully')
        setProfile(profile)
      }
    } catch (error) {
      console.error('AuthProvider: Error in fetchOrCreateProfile:', error)
      // Create a fallback profile to avoid blocking the user
      const fallbackProfile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        subscription_tier: 'free' as const,
        github_username: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      console.log('AuthProvider: Setting fallback profile due to error')
      setProfile(fallbackProfile)
    } finally {
      console.log('AuthProvider: Setting loading to false after profile operations')
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Let React Router handle the redirect
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}