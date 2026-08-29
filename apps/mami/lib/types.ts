export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  properties: string;
  price: number; // in COP
  category: string;
  image_url: string;
  created_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  version: number;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  frozen_unit_price: number;
  product_name?: string;
  product_image_url?: string;
  product_properties?: string;
  product_category?: string;
  subtotal?: number;
}

export type CartStatus = 'open' | 'checked_out' | 'abandoned';

export interface Cart {
  id: string;
  session_id: string;
  status: CartStatus;
  created_at: string;
  updated_at: string;
}

export interface CartDetail {
  cart_id: string;
  session_id: string;
  status: CartStatus;
  items: Array<{
    product_id: string;
    sku: string;
    name: string;
    description: string;
    properties: string;
    category: string;
    image_url: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    available_stock: number;
  }>;
  item_count: number;
  total: number;
  currency: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface DeliveryAddress {
  street: string;
  city: string;
  postal_code?: string;
  recipient_name?: string;
  phone?: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_sku?: string;
}

export interface Order {
  id: string;
  cart_id: string;
  total: number;
  status: OrderStatus;
  delivery_address: string; // JSON or formatted string
  estimated_arrival_at: string; // ISO 8601 string
  created_at: string;
}

export interface OrderDetail extends Order {
  parsed_address: DeliveryAddress | string;
  items: Array<{
    product_id: string;
    sku: string;
    name: string;
    properties: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    image_url?: string;
  }>;
  currency: string;
  formatted_arrival: string;
}

export interface EstimatedArrival {
  iso: string;
  formatted: string;
  minutes_from_now: number;
}
