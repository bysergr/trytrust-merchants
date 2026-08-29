export type CabinClass = 'economy' | 'business';

export type SeatStatus = 'available' | 'held' | 'booked';

export type BookingStatus = 'draft' | 'pending_payment' | 'confirmed' | 'expired' | 'failed';

export interface Airport {
  code: string;
  city: string;
  name: string;
  created_at: string;
}

export interface Flight {
  id: string;
  flight_number: string;
  origin_airport_code: string;
  destination_airport_code: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  base_price_economy: number;
  base_price_business: number;
  aircraft_type: string;
  created_at: string;
}

export interface FlightWithAirports extends Flight {
  origin_city: string;
  origin_name: string;
  destination_city: string;
  destination_name: string;
  available_seats_count?: number;
  economy_available_seats_count?: number;
  business_available_seats_count?: number;
  lowest_price?: number;
}

export interface Seat {
  id: string;
  flight_id: string;
  seat_number: string;
  cabin_class: CabinClass;
  status: SeatStatus;
  held_until: string | null;
  version: number;
  price: number;
}

export interface Booking {
  id: string;
  booking_session_id: string;
  flight_id: string;
  status: BookingStatus;
  passenger_name: string | null;
  passenger_document_id: string | null;
  contact_email: string | null;
  total_price: number;
  created_at: string;
  confirmed_at: string | null;
}

export interface BookingSeat {
  booking_id: string;
  seat_id: string;
}

export interface BookingDetail extends Booking {
  flight: FlightWithAirports;
  seats: Seat[];
}

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departure_date: string;
  passengers?: number;
  cabin_class?: CabinClass;
}

export interface FlightSearchResult {
  id: string;
  flight_number: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  price: number;
  base_price_economy: number;
  base_price_business: number;
  aircraft_type: string;
  seats_remaining: number;
  economy_seats_remaining: number;
  business_seats_remaining: number;
  cabin_classes: CabinClass[];
}

export interface CompareFlightsResult {
  flights: FlightSearchResult[];
}

export interface FlightDetailsResult {
  id: string;
  flight_number: string;
  origin: {
    code: string;
    city: string;
    name: string;
  };
  destination: {
    code: string;
    city: string;
    name: string;
  };
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  aircraft_type: string;
  base_price_economy: number;
  base_price_business: number;
  seat_availability: {
    total_seats: number;
    available_seats: number;
    economy: {
      total: number;
      available: number;
      price: number;
    };
    business: {
      total: number;
      available: number;
      price: number;
    };
  };
}

export interface SeatMapItem {
  id: string;
  seat_number: string;
  row: number;
  letter: string;
  cabin_class: CabinClass;
  status: SeatStatus;
  price: number;
  held_until: string | null;
  is_held_by_current_session?: boolean;
}

export interface SeatMapResult {
  flight_id: string;
  flight_number: string;
  aircraft_type: string;
  total_seats: number;
  available_seats: number;
  cabin_layout: {
    business: {
      rows: number[];
      seats_per_row: string[];
      layout: string;
    };
    economy: {
      rows: number[];
      seats_per_row: string[];
      layout: string;
    };
  };
  seats: SeatMapItem[];
}

export interface SelectSeatParams {
  booking_session_id?: string;
  flight_id: string;
  seat_number: string;
  passenger_name?: string;
}

export interface SelectSeatResult {
  booking_session_id: string;
  booking_id: string;
  flight_id: string;
  held_seat: Seat;
  all_held_seats: Seat[];
  held_until: string;
  total_price: number;
}

export interface ReleaseSeatParams {
  booking_session_id: string;
  seat_number: string;
}

export interface ReleaseSeatResult {
  booking_session_id: string;
  booking_id: string;
  released_seat_number: string;
  remaining_held_seats: Seat[];
  total_price: number;
}

export interface PayParams {
  booking_session_id: string;
  passenger_name: string;
  passenger_document_id: string;
  contact_email: string;
  payment_confirmation?: Record<string, unknown>;
}

export interface PayResult {
  success: boolean;
  booking_reference: string;
  booking_id: string;
  status: 'confirmed';
  flight: {
    id: string;
    flight_number: string;
    origin: string;
    origin_city: string;
    destination: string;
    destination_city: string;
    departure_at: string;
    arrival_at: string;
    aircraft_type: string;
  };
  passengers: {
    name: string;
    document_id: string;
    email: string;
  };
  seats: Array<{
    seat_number: string;
    cabin_class: CabinClass;
    price: number;
  }>;
  total_price: number;
  confirmed_at: string;
}
