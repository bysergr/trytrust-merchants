import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listAirports } from '../services/airports';
import { searchFlights, compareFlights, getFlightDetails } from '../services/flights';
import { getSeatMap, selectSeat, releaseSeat } from '../services/seats';
import { executePayment } from '../services/checkout';
import { CabinClass } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
function registerTool(
  server: any,
  name: string,
  description: string,
  schema: any,
  handler: (args: any) => Promise<any>
) {
  if (typeof server.tool === 'function') {
    server.tool(name, description, schema, handler);
  } else if (typeof server.registerTool === 'function') {
    server.registerTool(name, { description, inputSchema: schema }, handler);
  } else if (typeof server.addTool === 'function') {
    server.addTool(name, description, schema, handler);
  }
}

export function registerMcpTools(server: any): void {
  // 1. list_airports
  registerTool(
    server,
    'list_airports',
    'List all served domestic Colombian airports with their IATA codes, cities, and full airport names. Use this tool to get valid origin and destination codes before searching flights.',
    {
      query: z.string().optional().describe('Optional search query to filter airports by city name or IATA code substring (e.g., "Bogota" or "BOG")'),
    },
    async ({ query }: { query?: string }) => {
      try {
        const airports = listAirports(query);
        const formatted = {
          total: airports.length,
          airports: airports.map((a) => ({
            code: a.code,
            city: a.city,
            name: a.name,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error listing airports';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 2. search_flights
  registerTool(
    server,
    'search_flights',
    'Search scheduled domestic Colombian flights between two airports for a specific departure date. Returns matching flights with real-time seat availability and prices.',
    {
      origin: z.string().describe('3-letter IATA code of origin airport (e.g., "BOG", "MDE", "CTG") - must be a valid code from list_airports'),
      destination: z.string().describe('3-letter IATA code of destination airport (e.g., "CTG", "MDE", "CLO") - must be a valid code from list_airports'),
      departure_date: z.string().describe('Departure date in YYYY-MM-DD format (e.g., "2026-08-30")'),
      passengers: z.number().int().min(1).max(6).optional().describe('Number of passengers (default: 1)'),
      cabin_class: z.enum(['economy', 'business']).optional().describe('Filter by cabin class ("economy" or "business")'),
    },
    async ({
      origin,
      destination,
      departure_date,
      passengers,
      cabin_class,
    }: {
      origin: string;
      destination: string;
      departure_date: string;
      passengers?: number;
      cabin_class?: CabinClass;
    }) => {
      try {
        const flights = searchFlights({
          origin,
          destination,
          departure_date,
          passengers: passengers || 1,
          cabin_class,
        });

        const formatted = {
          total_results: flights.length,
          search_criteria: {
            origin,
            destination,
            departure_date,
            passengers: passengers || 1,
            cabin_class: cabin_class || 'all',
          },
          flights: flights.map((f) => ({
            id: f.id,
            flight_number: f.flight_number,
            origin: f.origin,
            origin_city: f.origin_city,
            destination: f.destination,
            destination_city: f.destination_city,
            departure_at: f.departure_at,
            arrival_at: f.arrival_at,
            duration_minutes: f.duration_minutes,
            price_cop: f.price,
            formatted_price: `$${f.price.toLocaleString('en-US')} COP`,
            base_price_economy_cop: f.base_price_economy,
            base_price_business_cop: f.base_price_business,
            aircraft_type: f.aircraft_type,
            seats_remaining: f.seats_remaining,
            economy_seats_remaining: f.economy_seats_remaining,
            business_seats_remaining: f.business_seats_remaining,
            cabin_classes: f.cabin_classes,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error searching flights';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 3. compare_flights
  registerTool(
    server,
    'compare_flights',
    'Compare 2 to 4 flights side-by-side, displaying schedules, durations, prices per cabin class, aircraft types, and live seat availability.',
    {
      flight_ids: z.array(z.string()).min(2).max(4).describe('Array of 2 to 4 flight IDs to compare side-by-side'),
    },
    async ({ flight_ids }: { flight_ids: string[] }) => {
      try {
        const flights = compareFlights(flight_ids);
        const formatted = {
          count: flights.length,
          flights: flights.map((f) => ({
            id: f.id,
            flight_number: f.flight_number,
            origin: `${f.origin_city} (${f.origin})`,
            destination: `${f.destination_city} (${f.destination})`,
            departure_at: f.departure_at,
            arrival_at: f.arrival_at,
            duration_minutes: f.duration_minutes,
            aircraft_type: f.aircraft_type,
            economy_price_cop: f.base_price_economy,
            economy_price_formatted: `$${f.base_price_economy.toLocaleString('en-US')} COP`,
            business_price_cop: f.base_price_business,
            business_price_formatted: `$${f.base_price_business.toLocaleString('en-US')} COP`,
            seats_remaining: f.seats_remaining,
            economy_seats_remaining: f.economy_seats_remaining,
            business_seats_remaining: f.business_seats_remaining,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error comparing flights';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 4. get_flight_details
  registerTool(
    server,
    'get_flight_details',
    'Retrieve full detailed information for a specific flight, including airport names, schedule, aircraft model, and seat availability breakdown by cabin class.',
    {
      flight_id: z.string().describe('The unique ID of the flight'),
    },
    async ({ flight_id }: { flight_id: string }) => {
      try {
        const details = getFlightDetails(flight_id);
        const formatted = {
          id: details.id,
          flight_number: details.flight_number,
          origin: details.origin,
          destination: details.destination,
          departure_at: details.departure_at,
          arrival_at: details.arrival_at,
          duration_minutes: details.duration_minutes,
          aircraft_type: details.aircraft_type,
          pricing: {
            economy_base_cop: details.base_price_economy,
            economy_base_formatted: `$${details.base_price_economy.toLocaleString('en-US')} COP`,
            business_base_cop: details.base_price_business,
            business_base_formatted: `$${details.base_price_business.toLocaleString('en-US')} COP`,
          },
          seat_availability: {
            total_seats: details.seat_availability.total_seats,
            available_seats: details.seat_availability.available_seats,
            economy: details.seat_availability.economy,
            business: details.seat_availability.business,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error getting flight details';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 5. get_seat_map
  registerTool(
    server,
    'get_seat_map',
    'Get the real-time seat map for a flight, showing all seat numbers, cabin classes (business/economy), prices, and live statuses (available, held, booked). Applies lazy hold expiration.',
    {
      flight_id: z.string().describe('The unique ID of the flight'),
      booking_session_id: z.string().optional().describe('Optional booking session ID to identify seats held by this session'),
    },
    async ({ flight_id, booking_session_id }: { flight_id: string; booking_session_id?: string }) => {
      try {
        const seatMap = getSeatMap(flight_id, booking_session_id);
        const formatted = {
          flight_id: seatMap.flight_id,
          flight_number: seatMap.flight_number,
          aircraft_type: seatMap.aircraft_type,
          summary: {
            total_seats: seatMap.total_seats,
            available_seats: seatMap.available_seats,
            held_or_booked_seats: seatMap.total_seats - seatMap.available_seats,
          },
          cabin_layout: seatMap.cabin_layout,
          seats: seatMap.seats.map((s) => ({
            seat_number: s.seat_number,
            row: s.row,
            letter: s.letter,
            cabin_class: s.cabin_class,
            status: s.status,
            price_cop: s.price,
            formatted_price: `$${s.price.toLocaleString('en-US')} COP`,
            held_until: s.held_until,
            is_held_by_you: Boolean(s.is_held_by_current_session),
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error getting seat map';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 6. select_seat
  registerTool(
    server,
    'select_seat',
    'Select and temporarily hold a seat on a flight for 10 minutes. If booking_session_id is not provided, the server generates a new one and returns it. Always retain and reuse this booking_session_id for subsequent seat selections, releases, or payment.',
    {
      booking_session_id: z.string().optional().describe('Active booking session ID. Omit on first call to generate a new session handle.'),
      flight_id: z.string().describe('The unique flight ID'),
      seat_number: z.string().describe('The seat number to select and hold (e.g., "1A", "12C")'),
      passenger_name: z.string().optional().describe('Optional passenger name for this seat'),
    },
    async ({
      booking_session_id,
      flight_id,
      seat_number,
      passenger_name,
    }: {
      booking_session_id?: string;
      flight_id: string;
      seat_number: string;
      passenger_name?: string;
    }) => {
      try {
        const result = selectSeat({
          booking_session_id,
          flight_id,
          seat_number,
          passenger_name,
        });

        const formatted = {
          message: `Seat ${result.held_seat.seat_number} held successfully for 10 minutes.`,
          booking_session_id: result.booking_session_id,
          flight_id: result.flight_id,
          held_seat: {
            seat_number: result.held_seat.seat_number,
            cabin_class: result.held_seat.cabin_class,
            price_cop: result.held_seat.price,
            formatted_price: `$${result.held_seat.price.toLocaleString('en-US')} COP`,
            held_until: result.held_until,
          },
          all_held_seats: result.all_held_seats.map((s) => ({
            seat_number: s.seat_number,
            cabin_class: s.cabin_class,
            price_cop: s.price,
          })),
          total_price_cop: result.total_price,
          formatted_total_price: `$${result.total_price.toLocaleString('en-US')} COP`,
          hold_expires_at: result.held_until,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error selecting seat';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 7. release_seat
  registerTool(
    server,
    'release_seat',
    'Release a seat currently held by your booking session, immediately returning it to available status.',
    {
      booking_session_id: z.string().describe('The active booking session ID'),
      seat_number: z.string().describe('The seat number to release (e.g., "1A", "12C")'),
    },
    async ({ booking_session_id, seat_number }: { booking_session_id: string; seat_number: string }) => {
      try {
        const result = releaseSeat({
          booking_session_id,
          seat_number,
        });

        const formatted = {
          message: `Seat ${result.released_seat_number} released successfully.`,
          booking_session_id: result.booking_session_id,
          released_seat_number: result.released_seat_number,
          remaining_held_seats: result.remaining_held_seats.map((s) => ({
            seat_number: s.seat_number,
            cabin_class: s.cabin_class,
            price_cop: s.price,
          })),
          total_price_cop: result.total_price,
          formatted_total_price: `$${result.total_price.toLocaleString('en-US')} COP`,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error releasing seat';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 8. pay
  registerTool(
    server,
    'pay',
    'Finalize and confirm the flight booking atomically for all seats held in the session. Converts held seats to booked status and returns the confirmed booking reference code.',
    {
      booking_session_id: z.string().describe('The active booking session ID with held seats'),
      passenger_name: z.string().describe('Full name of the primary passenger'),
      passenger_document_id: z.string().describe('Government ID or passport number of the passenger'),
      contact_email: z.string().email().describe('Contact email address for the booking confirmation and e-ticket'),
      payment_confirmation: z.record(z.string(), z.unknown()).optional().describe('Optional payment details / token simulation object'),
    },
    async ({
      booking_session_id,
      passenger_name,
      passenger_document_id,
      contact_email,
      payment_confirmation,
    }: {
      booking_session_id: string;
      passenger_name: string;
      passenger_document_id: string;
      contact_email: string;
      payment_confirmation?: Record<string, unknown>;
    }) => {
      try {
        const order = executePayment({
          booking_session_id,
          passenger_name,
          passenger_document_id,
          contact_email,
          payment_confirmation,
        });

        const formatted = {
          success: true,
          message: 'Payment processed successfully. Flight booking confirmed!',
          booking_reference: order.booking_reference,
          booking_id: order.booking_id,
          status: order.status,
          flight: {
            flight_number: order.flight.flight_number,
            route: `${order.flight.origin_city} (${order.flight.origin}) to ${order.flight.destination_city} (${order.flight.destination})`,
            departure_at: order.flight.departure_at,
            arrival_at: order.flight.arrival_at,
            aircraft_type: order.flight.aircraft_type,
          },
          passenger: {
            name: order.passengers.name,
            document_id: order.passengers.document_id,
            email: order.passengers.email,
          },
          confirmed_seats: order.seats.map((s) => ({
            seat_number: s.seat_number,
            cabin_class: s.cabin_class,
            price_cop: s.price,
            formatted_price: `$${s.price.toLocaleString('en-US')} COP`,
          })),
          total_price_cop: order.total_price,
          formatted_total_price: `$${order.total_price.toLocaleString('en-US')} COP`,
          confirmed_at: order.confirmed_at,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Payment and booking confirmation failed';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );
}

export function createVuelaYaMcpServer(): McpServer {
  const server = new McpServer({
    name: 'vuela-ya-mcp',
    version: '1.0.0',
  });

  registerMcpTools(server);
  return server;
}
