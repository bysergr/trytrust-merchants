export type ServiceType = 'ride' | 'package' | 'freight';

export type RequestStatus =
  | 'quoted'
  | 'requested'
  | 'matched'
  | 'en_route'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid';

export interface VehicleType {
  id: string;
  service: ServiceType;
  name: string;
  description: string;
  capacity_kg: number | null;
  passenger_capacity?: number | null;
  base_fare: number;
  per_km_rate: number;
  icon_url: string;
  eta_minutes_base?: number;
}

export interface AvailableVehicle {
  id: string;
  vehicle_type_id: string;
  count_available: number;
  version: number;
}

export interface ServiceRequest {
  id: string;
  session_id: string;
  service: ServiceType;
  vehicle_type_id: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_km: number;
  duration_minutes: number;
  scheduled_at: string | null;
  status: RequestStatus;
  price: number;
  estimated_arrival_at: string;
  package_description: string | null;
  package_weight_kg: number | null;
  cargo_description: string | null;
  cargo_weight_kg: number | null;
  driver_name: string | null;
  driver_plate: string | null;
  driver_rating: number | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  payment_confirmation: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for UI convenience
  vehicle_type_name?: string;
  vehicle_type_icon?: string;
}

export interface QuoteInput {
  service: ServiceType;
  vehicle_type_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  scheduled_at?: string | null;
  package_weight_kg?: number | null;
  cargo_weight_kg?: number | null;
}

export interface QuoteResult {
  service: ServiceType;
  vehicle_type: VehicleType;
  pickup_address: string;
  dropoff_address: string;
  pickup_coords?: { lat: number; lng: number };
  dropoff_coords?: { lat: number; lng: number };
  distance_km: number;
  duration_minutes: number;
  base_fare: number;
  distance_fare: number;
  weight_surcharge: number;
  total_price: number;
  estimated_arrival_at: string;
  estimated_duration_text: string;
  scheduled_at: string | null;
  is_available: boolean;
  vehicles_remaining: number;
}

export interface CreateRideInput {
  session_id?: string;
  vehicle_type_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  scheduled_at?: string | null;
}

export interface CreatePackageInput {
  session_id?: string;
  vehicle_type_id: string;
  pickup_address: string;
  dropoff_address: string;
  package_description: string;
  package_weight_kg: number;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  scheduled_at?: string | null;
}

export interface CreateFreightInput {
  session_id?: string;
  vehicle_type_id: string;
  pickup_address: string;
  dropoff_address: string;
  cargo_description: string;
  cargo_weight_kg: number;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  scheduled_at?: string | null;
}

export interface PayInput {
  session_id: string;
  request_id: string;
  payment_confirmation?: Record<string, unknown> | string;
}

export interface AdminUpdateRequestInput {
  price?: number;
  scheduled_at?: string | null;
  status?: RequestStatus;
}
