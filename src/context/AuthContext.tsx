
import React, { createContext, useContext, useEffect, useState } from 'react'
// Fixed: Removed explicit Session and User imports which were causing module export errors
import { supabase } from '../lib/supabaseClient'

interface AuthContextType {
  session: any | null
  user: any | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Changed to React.FC to explicitly support children in JSX and resolve potential typing issues in the component tree.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null)
  const [user, setUser] = useState<any | null>(null)

  useEffect(() => {
    // Fixed: Cast supabase.auth to any to access getSession() which may be missing from the provided type definition
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    // Fixed: Cast supabase.auth to any to access onAuthStateChange()
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    // Fixed: Cast supabase.auth to any to access signOut()
    await (supabase.auth as any).signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
