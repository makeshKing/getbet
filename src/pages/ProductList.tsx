
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Product } from '../types'
import { useAuth } from '../context/AuthContext'

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    fetchProducts()
  }, [search])

  const fetchProducts = async () => {
    let query = supabase.from('products').select('*')
    if (search) query = query.ilike('name', `%${search}%`)
    const { data } = await query
    if (data) setProducts(data)
  }

  const addToCart = async (productId: number) => {
    if (!user) return alert('Please login first')

    // Upsert logic
    const { data: existing } = await supabase.from('cart_items').select('quantity').eq('user_id', user.id).eq('product_id', productId).single()
    
    const quantity = existing ? existing.quantity + 1 : 1
    
    const { error } = await supabase.from('cart_items').upsert({
      user_id: user.id,
      product_id: productId,
      quantity
    }, { onConflict: 'user_id,product_id' })

    if (error) alert(error.message)
    else alert('Added to cart!')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Search products..." 
          className="w-full p-2 border rounded shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <img src={product.image_url} alt={product.name} className="h-48 w-full object-cover" />
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">${product.price}</span>
                <div className="flex space-x-2">
                  <Link to={`/products/${product.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Details</Link>
                  <button onClick={() => addToCart(product.id)} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">Add</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
