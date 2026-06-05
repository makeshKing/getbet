
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setCartCount(0)
      return
    }

    // Fetch initial count
    const fetchCount = async () => {
      const { count } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setCartCount(count || 0)
    }

    fetchCount()

    // Real-time subscription to cart changes
    const channel = supabase
      .channel('public:cart_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` }, 
        () => fetchCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-indigo-600">SupaStore</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-700 hover:text-indigo-600">Products</Link>
            
            {user ? (
              <>
                <Link to="/cart" className="text-gray-700 hover:text-indigo-600 relative">
                  Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <button onClick={() => signOut()} className="text-gray-700 hover:text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="text-indigo-600 font-medium">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
