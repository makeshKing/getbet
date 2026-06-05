
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Product } from '../types'
import { useAuth } from '../context/AuthContext'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (id) {
      supabase.from('products').select('*').eq('id', id).single().then(({ data }) => setProduct(data))
    }
  }, [id])

  if (!product) return <div className="p-8 text-center">Loading...</div>

  const addToCart = async () => {
    if (!user) return alert('Please login first')
    const { data: existing } = await supabase.from('cart_items').select('quantity').eq('user_id', user.id).eq('product_id', product.id).single()
    const quantity = existing ? existing.quantity + 1 : 1
    const { error } = await supabase.from('cart_items').upsert({ user_id: user.id, product_id: product.id, quantity }, { onConflict: 'user_id,product_id' })
    if (error) alert(error.message)
    else alert('Added to cart!')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg overflow-hidden md:flex">
        <div className="md:w-1/2">
          <img src={product.image_url} alt={product.name} className="w-full h-96 object-cover" />
        </div>
        <div className="p-8 md:w-1/2 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          <p className="mt-4 text-gray-500 text-lg">{product.description}</p>
          <div className="mt-8 flex items-center justify-between">
             <div>
                <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                <h3 className="text-3xl font-bold text-gray-900">${product.price}</h3>
             </div>
             <button onClick={addToCart} className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  )
}
