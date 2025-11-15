/**
 * OfferSheet Component
 * Displays AI-Powered Continuous Accessibility service tiers
 */

import React, { useEffect, useState } from 'react';
import { OfferSheet as OfferSheetType, ServiceTier } from '../types';
import { apiService } from '../services/api';

export const OfferSheet: React.FC = () => {
  const [offerSheet, setOfferSheet] = useState<OfferSheetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOfferSheet = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOfferSheet();
        
        if (response.success && response.data) {
          setOfferSheet(response.data);
          setError(null);
        } else {
          setError(response.error || 'Failed to load offer sheet');
        }
      } catch (err) {
        setError('Failed to load offer sheet data');
        console.error('Error loading offer sheet:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOfferSheet();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-xl">Loading offer sheet...</div>
      </div>
    );
  }

  if (error || !offerSheet) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <div className="text-red-400 text-xl font-semibold mb-2">Error</div>
          <div className="text-red-300">
            {error || 'Failed to load offer sheet'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-6">
            {offerSheet.title}
          </h1>
          
          {/* Problem Statement */}
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-red-400 mb-4">
              The Problem We Solve
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              {offerSheet.problemStatement}
            </p>
          </div>

          {/* Solution */}
          <div className="bg-gray-800 rounded-lg p-8 mb-12">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              Our Solution: The Cyborg Shield™
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              {offerSheet.solution}
            </p>
          </div>
        </div>

        {/* Service Tiers */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-white mb-8">
            Service Tiers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {offerSheet.tiers.map((tier) => (
              <ServiceTierCard 
                key={tier.id} 
                tier={tier} 
                featured={tier.id === 'continuous_compliance'}
              />
            ))}
          </div>
        </div>

        {/* Key Outcomes */}
        <div className="bg-gray-800 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold text-center text-white mb-6">
            Key Outcomes You Can Expect
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offerSheet.outcomes.map((outcome, index) => (
              <div 
                key={index}
                className="bg-gray-700 rounded-lg p-6 text-center"
              >
                <div className="text-blue-400 text-4xl mb-3">✓</div>
                <h3 className="text-lg font-semibold text-white">
                  {outcome}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8">
            <p className="text-xl text-white mb-6">
              {offerSheet.callToAction}
            </p>
            <button
              className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => window.open('https://calendly.com/your-link', '_blank')}
            >
              Schedule Your Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ServiceTierCardProps {
  tier: ServiceTier;
  featured?: boolean;
}

const ServiceTierCard: React.FC<ServiceTierCardProps> = ({ tier, featured = false }) => {
  const borderColor = featured ? 'border-blue-500' : 'border-gray-700';
  const bgColor = featured ? 'bg-gray-700' : 'bg-gray-800';
  
  return (
    <div 
      className={`${bgColor} border-2 ${borderColor} rounded-lg p-6 flex flex-col h-full relative`}
    >
      {featured && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white text-sm font-bold py-1 px-4 rounded-full">
            POPULAR
          </span>
        </div>
      )}
      
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">
          {tier.name}
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {tier.subtitle}
        </p>
        {tier.pricing && (
          <div className="text-gray-300">
            <p className="text-sm">{tier.pricing.description}</p>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="flex-grow mb-6">
        <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">
          Features
        </h4>
        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-400 mr-2 mt-1">✓</span>
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <button 
        onClick={() => {
          // Scroll to CTA section or open contact form
          const ctaSection = document.querySelector('.bg-gradient-to-r');
          if (ctaSection) {
            ctaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          featured 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
        }`}
      >
        Learn More
      </button>
    </div>
  );
};

export default OfferSheet;
