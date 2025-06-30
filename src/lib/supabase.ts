import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'professional' | 'enterprise'
  github_username?: string
  github_access_token?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string
  description?: string
  code_snippet: string
  video_url?: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface Analytics {
  id: string
  project_id: string
  views: number
  shares: number
  completion_rate: number
  created_at: string
  updated_at: string
}

export interface Repository {
  id: string
  user_id: string
  github_id: number
  name: string
  full_name: string
  description?: string
  html_url: string
  clone_url: string
  language?: string
  stargazers_count: number
  forks_count: number
  is_private: boolean
  created_at: string
  updated_at: string
  synced_at: string
}