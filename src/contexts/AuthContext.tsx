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
    
    // Set a maximum loading timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('AuthProvider: Loading timeout reached, forcing loading to false')
      setLoading(false)
    }, 20000) // Increased to 20 seconds max loading time

    // Handle OAuth redirect by cleaning up the URL
    const handleOAuthRedirect = () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Clean up the URL by removing the hash
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    handleOAuthRedirect()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session check', { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        loading: true 
      })
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('AuthProvider: User found, fetching profile...')
        fetchOrCreateProfile(session.user).finally(() => {
          clearTimeout(loadingTimeout)
        })
      } else {
        console.log('AuthProvider: No user session, setting loading to false')
        setLoading(false)
        clearTimeout(loadingTimeout)
      }
    }).catch((error) => {
      console.error('AuthProvider: Error getting initial session:', error)
      setLoading(false)
      clearTimeout(loadingTimeout)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed', { 
        event, 
        userEmail: session?.user?.email,
        hasSession: !!session,
        loading: loading 
      })
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          console.log('AuthProvider: User signed in, will redirect to dashboard')
          // Give the trigger time to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Redirect to dashboard after successful sign in
          if (window.location.pathname === '/' || window.location.pathname === '/signin') {
            window.location.href = '/dashboard'
          }
        }
        console.log('AuthProvider: Fetching profile for authenticated user')
        await fetchOrCreateProfile(session.user)
      } else {
        console.log('AuthProvider: No user, clearing profile and setting loading to false')
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  const fetchOrCreateProfile = async (user: User) => {
    console.log('AuthProvider: fetchOrCreateProfile started for user:', user.email)
    
    try {
      setLoading(true)
      console.log('AuthProvider: Set loading to true, fetching profile...')
      
      // Add a timeout for the profile fetch operation
      const profilePromise = (async () => {
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
          setProfile({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            subscription_tier: 'free',
            github_username: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } else {
          console.log('AuthProvider: Profile fetched successfully')
          setProfile(profile)
        }
      })()

      // Race the profile fetch against a timeout - increased from 8 to 15 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 15000) // Increased to 15 second timeout
      })

      await Promise.race([profilePromise, timeoutPromise])

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
      
      // Try to create the profile in the background without blocking the user
      setTimeout(async () => {
        try {
          console.log('AuthProvider: Attempting background profile creation')
          const { data: backgroundProfile, error: backgroundError } = await supabase
            .from('profiles')
            .upsert([fallbackProfile])
            .select()
            .single()
          
          if (!backgroundError && backgroundProfile) {
            console.log('AuthProvider: Background profile creation successful')
            setProfile(backgroundProfile)
          }
        } catch (bgError) {
          console.error('AuthProvider: Background profile creation failed:', bgError)
        }
      }, 2000) // Try again after 2 seconds
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
    // Redirect to home page after sign out
    window.location.href = '/'
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

  // Log current state for debugging
  console.log('AuthProvider: Current state', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    loading,
    userEmail: user?.email 
  })

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