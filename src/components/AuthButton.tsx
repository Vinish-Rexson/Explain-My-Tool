import React from 'react'
import { LogIn, LogOut, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AuthButton = () => {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <Link 
          to="/dashboard"
          className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name || 'User'} 
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User className="h-5 w-5 text-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {profile?.full_name || user.email}
          </span>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">Sign Out</span>
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/signin"
      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
    >
      <LogIn className="h-4 w-4" />
      <span>Sign In</span>
    </Link>
  )
}

export default AuthButton