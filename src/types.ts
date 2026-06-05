
export interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  image_url: string
  category_id: number
}

export interface CartItem {
  id: number
  user_id: string
  product_id: number
  quantity: number
  products: Product // Joined data
}

export interface Profile {
  id: string
  first_name: string
  last_name: string
  address: string
}
