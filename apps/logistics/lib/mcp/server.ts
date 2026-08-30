import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listVehicleTypes } from '../services/vehicles';
import { calculateQuote } from '../services/geo-pricing';
import {
  createRideRequest,
  createPackageRequest,
  createFreightRequest,
  getRequestById,
  cancelRequest,
  payRequest,
} from '../services/requests';
import { generateSessionId } from '../session-cookie';
import { ServiceType } from '../types';

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
  // 1. list_vehicle_types
  registerTool(
    server,
    'list_vehicle_types',
    'List all available vehicle types and pricing rates for a given service (ride, package delivery, or freight cargo).',
    {
      service: z
        .enum(['ride', 'package', 'freight'])
        .describe('The service line to inspect: "ride" (passenger mobility), "package" (courier parcel delivery), or "freight" (cargo/truck transport)'),
    },
    async ({ service }: { service: ServiceType }) => {
      try {
        const vehicles = listVehicleTypes(service);
        const formatted = {
          service,
          total_options: vehicles.length,
          vehicle_types: vehicles.map((v) => ({
            id: v.id,
            name: v.name,
            description: v.description,
            base_fare_usd: v.base_fare,
            per_km_rate_usd: v.per_km_rate,
            passenger_capacity: v.passenger_capacity ?? 'N/A',
            capacity_kg: v.capacity_kg ? `${v.capacity_kg} kg` : 'N/A',
            current_available_count: v.count_available,
            is_available_now: v.count_available > 0,
            image_url: v.icon_url,
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
        const message = error instanceof Error ? error.message : 'Error listing vehicle types';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 2. get_quote
  registerTool(
    server,
    'get_quote',
    'Get an upfront fare estimate, estimated travel duration, and ETA for a ride, package, or freight request without creating an order.',
    {
      service: z.enum(['ride', 'package', 'freight']).describe('The service type ("ride", "package", or "freight")'),
      vehicle_type_id: z.string().describe('ID of the vehicle type (e.g., "ride-economy", "pkg-motorcycle", "freight-box-truck")'),
      pickup_address: z.string().describe('Full pickup street address or location landmark'),
      dropoff_address: z.string().describe('Full dropoff street address or destination landmark'),
      scheduled_at: z.string().optional().describe('Optional ISO-8601 datetime string for advance scheduled pickup (e.g., "2026-09-01T14:30:00Z"). Leave empty for immediate dispatch.'),
    },
    async ({
      service,
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      scheduled_at,
    }: {
      service: ServiceType;
      vehicle_type_id: string;
      pickup_address: string;
      dropoff_address: string;
      scheduled_at?: string;
    }) => {
      try {
        const quote = calculateQuote({
          service,
          vehicle_type_id,
          pickup_address,
          dropoff_address,
          scheduled_at: scheduled_at || null,
        });

        const formatted = {
          service: quote.service,
          vehicle: {
            id: quote.vehicle_type.id,
            name: quote.vehicle_type.name,
            base_fare_usd: quote.base_fare,
            per_km_rate_usd: quote.vehicle_type.per_km_rate,
          },
          route: {
            pickup: quote.pickup_address,
            dropoff: quote.dropoff_address,
            distance_km: quote.distance_km,
            estimated_duration_minutes: quote.duration_minutes,
            duration_summary: quote.estimated_duration_text,
          },
          pricing: {
            base_fare_usd: quote.base_fare,
            distance_fare_usd: quote.distance_fare,
            weight_surcharge_usd: quote.weight_surcharge,
            total_price_usd: quote.total_price,
            formatted_total: `$${quote.total_price.toFixed(2)} USD`,
          },
          estimated_arrival_at: quote.estimated_arrival_at,
          scheduled_at: quote.scheduled_at,
          available_now: quote.is_available,
          available_vehicles_count: quote.vehicles_remaining,
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
        const message = error instanceof Error ? error.message : 'Error calculating quote';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 3. request_ride
  registerTool(
    server,
    'request_ride',
    'Request and match an on-demand passenger ride. Atomically allocates an available vehicle and returns trip details with session tracking handle.',
    {
      session_id: z.string().optional().describe('Optional session handle. If not provided, a new session ID is created and returned.'),
      vehicle_type_id: z.string().describe('ID of the vehicle type (e.g., "ride-economy", "ride-comfort", "ride-xl")'),
      pickup_address: z.string().describe('Pickup location street address or landmark'),
      dropoff_address: z.string().describe('Destination street address or landmark'),
      scheduled_at: z.string().optional().describe('Optional ISO-8601 datetime for advance scheduled ride (or null for immediate)'),
    },
    async ({
      session_id,
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      scheduled_at,
    }: {
      session_id?: string;
      vehicle_type_id: string;
      pickup_address: string;
      dropoff_address: string;
      scheduled_at?: string;
    }) => {
      try {
        const effectiveSessionId = session_id && session_id.trim() ? session_id.trim() : generateSessionId();
        const request = createRideRequest(
          {
            vehicle_type_id,
            pickup_address,
            dropoff_address,
            scheduled_at,
          },
          effectiveSessionId
        );

        const formatted = {
          success: true,
          message: 'Ride request matched successfully!',
          session_id: effectiveSessionId,
          request_id: request.id,
          service: request.service,
          status: request.status,
          vehicle_type: request.vehicle_type_name,
          driver: {
            name: request.driver_name,
            vehicle_plate: request.driver_plate,
            rating: request.driver_rating,
          },
          price_usd: request.price,
          formatted_price: `$${request.price.toFixed(2)} USD`,
          estimated_arrival_at: request.estimated_arrival_at,
          pickup_address: request.pickup_address,
          dropoff_address: request.dropoff_address,
          distance_km: request.distance_km,
          duration_minutes: request.duration_minutes,
          payment_status: request.payment_status,
          created_at: request.created_at,
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
        const message = error instanceof Error ? error.message : 'Error requesting ride';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 4. request_package_delivery
  registerTool(
    server,
    'request_package_delivery',
    'Request a courier delivery for packages, documents, or parcels. Dispatches motorcycle or van courier.',
    {
      session_id: z.string().optional().describe('Optional session handle. If not provided, a new session ID is created and returned.'),
      vehicle_type_id: z.string().describe('ID of courier vehicle ("pkg-motorcycle" or "pkg-courier-van")'),
      pickup_address: z.string().describe('Origin pickup address for the package'),
      dropoff_address: z.string().describe('Destination dropoff address for the package'),
      package_description: z.string().describe('Description of the parcel/package contents (e.g., "Urgent contract documents", "Box of electronics")'),
      package_weight_kg: z.number().positive().describe('Weight of package in kilograms (e.g., 2.5)'),
      scheduled_at: z.string().optional().describe('Optional scheduled pickup ISO datetime'),
    },
    async ({
      session_id,
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      package_description,
      package_weight_kg,
      scheduled_at,
    }: {
      session_id?: string;
      vehicle_type_id: string;
      pickup_address: string;
      dropoff_address: string;
      package_description: string;
      package_weight_kg: number;
      scheduled_at?: string;
    }) => {
      try {
        const effectiveSessionId = session_id && session_id.trim() ? session_id.trim() : generateSessionId();
        const request = createPackageRequest(
          {
            vehicle_type_id,
            pickup_address,
            dropoff_address,
            package_description,
            package_weight_kg,
            scheduled_at,
          },
          effectiveSessionId
        );

        const formatted = {
          success: true,
          message: 'Package delivery courier dispatched successfully!',
          session_id: effectiveSessionId,
          request_id: request.id,
          service: request.service,
          status: request.status,
          vehicle_type: request.vehicle_type_name,
          courier: {
            name: request.driver_name,
            vehicle: request.driver_plate,
            rating: request.driver_rating,
          },
          package_details: {
            description: request.package_description,
            weight_kg: request.package_weight_kg,
          },
          price_usd: request.price,
          formatted_price: `$${request.price.toFixed(2)} USD`,
          estimated_arrival_at: request.estimated_arrival_at,
          pickup_address: request.pickup_address,
          dropoff_address: request.dropoff_address,
          distance_km: request.distance_km,
          payment_status: request.payment_status,
          created_at: request.created_at,
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
        const message = error instanceof Error ? error.message : 'Error requesting package delivery';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 5. request_freight
  registerTool(
    server,
    'request_freight',
    'Request commercial freight or bulk cargo transport using sprinter vans, box trucks, or heavy flatbeds.',
    {
      session_id: z.string().optional().describe('Optional session handle. If not provided, a new session ID is created and returned.'),
      vehicle_type_id: z.string().describe('Freight vehicle type ("freight-cargo-van", "freight-box-truck", or "freight-heavy-semi")'),
      pickup_address: z.string().describe('Loading dock or origin warehouse address'),
      dropoff_address: z.string().describe('Unloading facility or destination warehouse address'),
      cargo_description: z.string().describe('Description of commercial cargo/pallets/freight (e.g., "4 pallets industrial pumps")'),
      cargo_weight_kg: z.number().positive().describe('Total cargo weight in kilograms (e.g., 1850)'),
      scheduled_at: z.string().optional().describe('Optional scheduled freight loading ISO datetime'),
    },
    async ({
      session_id,
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      cargo_description,
      cargo_weight_kg,
      scheduled_at,
    }: {
      session_id?: string;
      vehicle_type_id: string;
      pickup_address: string;
      dropoff_address: string;
      cargo_description: string;
      cargo_weight_kg: number;
      scheduled_at?: string;
    }) => {
      try {
        const effectiveSessionId = session_id && session_id.trim() ? session_id.trim() : generateSessionId();
        const request = createFreightRequest(
          {
            vehicle_type_id,
            pickup_address,
            dropoff_address,
            cargo_description,
            cargo_weight_kg,
            scheduled_at,
          },
          effectiveSessionId
        );

        const formatted = {
          success: true,
          message: 'Freight transport carrier matched and scheduled!',
          session_id: effectiveSessionId,
          request_id: request.id,
          service: request.service,
          status: request.status,
          vehicle_type: request.vehicle_type_name,
          freight_carrier: {
            driver_name: request.driver_name,
            truck_plate: request.driver_plate,
            safety_rating: request.driver_rating,
          },
          cargo_manifest: {
            description: request.cargo_description,
            weight_kg: request.cargo_weight_kg,
          },
          price_usd: request.price,
          formatted_price: `$${request.price.toFixed(2)} USD`,
          estimated_arrival_at: request.estimated_arrival_at,
          pickup_address: request.pickup_address,
          dropoff_address: request.dropoff_address,
          distance_km: request.distance_km,
          payment_status: request.payment_status,
          created_at: request.created_at,
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
        const message = error instanceof Error ? error.message : 'Error requesting freight';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 6. track_request
  registerTool(
    server,
    'track_request',
    'Track the real-time status, ETA, and details of any active or past ride, package delivery, or freight shipment.',
    {
      session_id: z.string().describe('The session ID associated with the request'),
      request_id: z.string().describe('The unique request ID (e.g., "req_1234567890ab")'),
    },
    async ({ session_id, request_id }: { session_id: string; request_id: string }) => {
      try {
        const request = getRequestById(request_id, session_id);
        if (!request) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Error: Request "${request_id}" not found for session "${session_id}".` }],
          };
        }

        const formatted = {
          request_id: request.id,
          service: request.service,
          status: request.status,
          vehicle_type: request.vehicle_type_name,
          estimated_arrival_at: request.estimated_arrival_at,
          scheduled_at: request.scheduled_at,
          pickup_address: request.pickup_address,
          dropoff_address: request.dropoff_address,
          distance_km: request.distance_km,
          duration_minutes: request.duration_minutes,
          price_usd: request.price,
          formatted_price: `$${request.price.toFixed(2)} USD`,
          payment_status: request.payment_status,
          driver: request.driver_name
            ? {
                name: request.driver_name,
                vehicle_details: request.driver_plate,
                rating: request.driver_rating,
              }
            : null,
          package_info: request.package_description
            ? {
                description: request.package_description,
                weight_kg: request.package_weight_kg,
              }
            : null,
          cargo_info: request.cargo_description
            ? {
                description: request.cargo_description,
                weight_kg: request.cargo_weight_kg,
              }
            : null,
          created_at: request.created_at,
          updated_at: request.updated_at,
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
        const message = error instanceof Error ? error.message : 'Error tracking request';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );

  // 7. cancel_request
  registerTool(
    server,
    'cancel_request',
    'Cancel an active ride, delivery, or freight request and release the allocated vehicle back into the available fleet pool.',
    {
      session_id: z.string().describe('The session ID that owns the request'),
      request_id: z.string().describe('The request ID to cancel'),
    },
    async ({ session_id, request_id }: { session_id: string; request_id: string }) => {
      try {
        const updated = cancelRequest(request_id, session_id);
        const formatted = {
          success: true,
          message: `Request "${request_id}" was successfully cancelled. The vehicle has been returned to the fleet pool.`,
          request_id: updated.id,
          service: updated.service,
          status: updated.status,
          cancelled_at: updated.updated_at,
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
        const message = error instanceof Error ? error.message : 'Error cancelling request';
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
    'Finalize payment for a matched or completed request, recording the transaction and receipt confirmation code.',
    {
      session_id: z.string().describe('The session ID associated with the request'),
      request_id: z.string().describe('The request ID to pay for'),
      payment_confirmation: z
        .string()
        .optional()
        .describe('Optional external payment confirmation token or transaction reference'),
    },
    async ({
      session_id,
      request_id,
      payment_confirmation,
    }: {
      session_id: string;
      request_id: string;
      payment_confirmation?: string;
    }) => {
      try {
        const updated = payRequest({
          session_id,
          request_id,
          payment_confirmation,
        });

        const formatted = {
          success: true,
          message: `Payment of $${updated.price.toFixed(2)} USD successfully processed.`,
          request_id: updated.id,
          service: updated.service,
          status: updated.status,
          payment_status: updated.payment_status,
          paid_amount_usd: updated.price,
          formatted_amount: `$${updated.price.toFixed(2)} USD`,
          payment_confirmation: updated.payment_confirmation,
          paid_at: updated.paid_at,
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
        const message = error instanceof Error ? error.message : 'Error processing payment';
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${message}` }],
        };
      }
    }
  );
}

export function createLogisticsMcpServer(): McpServer {
  const server = new McpServer({
    name: 'logistics-mcp',
    version: '1.0.0',
  });

  registerMcpTools(server);
  return server;
}
