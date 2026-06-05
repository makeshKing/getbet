
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CartItem } from '../types'
import { useAuth } from '../context/AuthContext'

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    fetchCart()
  }, [user])

  const fetchCart = async () => {
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user!.id)
    setItems(data as any || [])
  }

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return
    await supabase.from('cart_items').update({ quantity }).eq('id', id)
    fetchCart()
  }

  const removeItem = async (id: number) => {
    await supabase.from('cart_items').delete().eq('id', id)
    fetchCart()
  }

  const total = items.reduce((sum, item) => sum + (item.products.price * item.quantity), 0)

  if (items.length === 0) return <div className="p-12 text-center text-gray-500">Your cart is empty. <Link to="/" className="text-indigo-600">Go shopping</Link></div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {items.map(item => (
            <li key={item.id} className="p-6 flex items-center">
              <img src={item.products.image_url} alt={item.products.name} className="h-20 w-20 object-cover rounded" />
              <div className="ml-6 flex-1">
                <h3 className="text-lg font-medium text-gray-900">{item.products.name}</h3>
                <p className="text-gray-500">${item.products.price}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border rounded">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 hover:bg-gray-100">-</button>
                  <span className="px-3">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 hover:bg-gray-100">+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-800">Remove</button>
              </div>
              <div className="ml-6 font-bold text-lg w-24 text-right">
                ${(item.products.price * item.quantity).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
        <div className="p-6 bg-gray-50 flex justify-end items-center border-t border-gray-200">
          <div className="mr-8">
            <span className="text-gray-600">Total:</span>
            <span className="ml-2 text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="bg-indigo-600 text-white px-6 py-3 rounded font-medium hover:bg-indigo-700">Checkout</button>
        </div>
      </div>
    </div>
  )
}
