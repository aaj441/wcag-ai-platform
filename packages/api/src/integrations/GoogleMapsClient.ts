/**
 * Google Maps Places API Client
 * Local business discovery
 * https://developers.google.com/maps/documentation/places/web-service
 */

import axios from 'axios';
import { log } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  business_status: string; // "OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"
}

export class GoogleMapsClient {
  private static apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  private static baseUrl = 'https://maps.googleapis.com/maps/api';

  /**
   * Search for businesses by type and location
   */
  static async searchPlaces(params: {
    query: string; // e.g., "dentist in Denver, CO"
    type?: string; // e.g., "dentist", "lawyer", "restaurant"
    location?: { lat: number; lng: number };
    radius?: number; // meters
    limit?: number;
  }): Promise<GooglePlace[]> {
    const startTime = Date.now();

    try {
      // Text search
      const response = await axios.get(`${this.baseUrl}/place/textsearch/json`, {
        params: {
          query: params.query,
          type: params.type,
          key: this.apiKey,
        },
      });

      await this.logApiCall('searchPlaces', params, response.data, 'success', Date.now() - startTime);

      return response.data.results || [];
    } catch (error) {
      log.error('Google Maps search failed', error as Error);
      await this.logApiCall('searchPlaces', params, null, 'failed', Date.now() - startTime, (error as Error).message);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  static async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,business_status,types,geometry',
          key: this.apiKey,
        },
      });

      await this.logApiCall('getPlaceDetails', { placeId }, response.data, 'success', Date.now() - startTime);

      return response.data.result || null;
    } catch (error) {
      log.error('Google Maps details failed', error as Error);
      await this.logApiCall('getPlaceDetails', { placeId }, null, 'failed', Date.now() - startTime, (error as Error).message);
      return null;
    }
  }

  /**
   * Geocode an address to lat/lng
   */
  static async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      await this.logApiCall('geocodeAddress', { address }, response.data, 'success', Date.now() - startTime);

      return response.data.results[0]?.geometry?.location || null;
    } catch (error) {
      log.error('Google Maps geocode failed', error as Error);
      await this.logApiCall('geocodeAddress', { address }, null, 'failed', Date.now() - startTime, (error as Error).message);
      return null;
    }
  }

  /**
   * Extract website from place
   */
  static extractWebsite(place: GooglePlace): string | null {
    if (place.website) {
      try {
        const url = new URL(place.website);
        return url.hostname.replace('www.', '');
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Log API call to database
   */
  private static async logApiCall(
    endpoint: string,
    requestData: any,
    responseData: any,
    status: 'success' | 'failed' | 'rate_limited',
    responseTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.aPIIntegrationLog.create({
        data: {
          provider: 'google_maps',
          endpoint,
          requestData,
          responseData,
          status,
          responseTimeMs,
          errorMessage,
          costUsd: this.calculateCost(endpoint),
        },
      });
    } catch (error) {
      log.error('Failed to log API call', error as Error);
    }
  }

  /**
   * Calculate cost per API call
   */
  private static calculateCost(endpoint: string): number {
    const costs: { [key: string]: number } = {
      searchPlaces: 0.032, // $32 per 1000 requests
      getPlaceDetails: 0.017, // $17 per 1000 requests
      geocodeAddress: 0.005, // $5 per 1000 requests
    };
    return costs[endpoint] || 0.0;
  }
}
