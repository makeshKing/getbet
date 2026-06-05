
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Profile } from '../types'

export default function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    
    // Fetch Profile
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { if (data) setAddress(data.address || '') })

    // Calculate Total
    supabase.from('cart_items').select('quantity, products(price)').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const sum = data.reduce((acc, item: any) => acc + (item.products.price * item.quantity), 0)
          setTotal(sum)
        }
      })
  }, [user])

  const handlePurchase = async () => {
    setLoading(true)
    
    // 1. Create Order
    const { error: orderError } = await supabase.from('orders').insert({
      user_id: user!.id,
      total: total,
      status: 'paid'
    })

    if (orderError) {
      alert(orderError.message)
      setLoading(false)
      return
    }

    // 2. Update Profile Address
    await supabase.from('profiles').update({ address }).eq('id', user!.id)

    // 3. Clear Cart
    await supabase.from('cart_items').delete().eq('user_id', user!.id)

    alert('Order placed successfully!')
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Information</h3>
          <textarea 
            required
            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500" 
            rows={4}
            placeholder="Enter your shipping address"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Order Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={handlePurchase}
          disabled={loading || total === 0}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Confirm Purchase'}
        </button>
      </div>
    </div>
  )
}
