/**
 * HubSpot integration service for Consultant Approval Dashboard
 * Handles communication with HubSpot CRM
 */

import { Consultant, EmailDraft } from '../types';

// HubSpot API configuration
const HUBSPOT_API_URL = process.env.HUBSPOT_API_URL || 'https://api.hubapi.com';
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

export class HubSpotService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || HUBSPOT_API_KEY || '';
  }

  /**
   * Fetch consultant details from HubSpot
   */
  async getConsultant(email: string): Promise<Consultant | null> {
    if (!this.apiKey) {
      console.warn('HubSpot API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `${HUBSPOT_API_URL}/contacts/v1/contact/email/${email}/profile`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: data.vid.toString(),
        name: `${data.properties?.firstname?.value || ''} ${data.properties?.lastname?.value || ''}`.trim(),
        email: email,
        company: data.properties?.company?.value || '',
        hubspotContactId: data.vid.toString(),
      };
    } catch (error) {
      console.error('Error fetching consultant from HubSpot:', error);
      return null;
    }
  }

  /**
   * Create or update contact in HubSpot when email is sent
   */
  async logEmailActivity(draft: EmailDraft): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('HubSpot API key not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${HUBSPOT_API_URL}/engagements/v1/engagements`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            engagement: {
              type: 'EMAIL',
              timestamp: new Date().getTime(),
            },
            associations: {
              contactIds: [], // Would be populated with actual contact ID
            },
            metadata: {
              subject: draft.subject,
              html: draft.body,
              from: { email: process.env.SENDER_EMAIL || '' },
              to: [{ email: draft.recipient }],
            },
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error logging email activity to HubSpot:', error);
      return false;
    }
  }
}

// Export singleton instance
export const hubspotService = new HubSpotService();
