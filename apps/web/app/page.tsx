'use client'

import { Hero } from '@/components/hero'
import { ScanForm } from '@/components/scan-form'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />

      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            icon="🔍"
            title="AI-Powered WCAG Scanning"
            description="Automated accessibility testing with AI-enhanced analysis and confidence scoring across WCAG 2.2 guidelines."
          />
          <FeatureCard
            icon="📊"
            title="Compliance Intelligence"
            description="Real-time compliance scores, industry benchmarks, and actionable remediation recommendations for enterprise teams."
          />
          <FeatureCard
            icon="⚡"
            title="Enterprise Ready"
            description="Multi-tenant architecture, API integrations, audit logging, and seamless deployment on Vercel for maximum scalability."
          />
        </div>

        <div className="card max-w-4xl mx-auto p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Start Your Compliance Scan</h2>
            <p className="text-gray-600">
              Enter any URL to get a comprehensive WCAG 2.2 AA compliance analysis
            </p>
          </div>
          <ScanForm />
        </div>
      </section>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card text-center p-6 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
