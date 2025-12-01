'use client'

export function Hero() {
  return (
    <section className="gradient-bg py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-4 inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-sm">
          Enterprise WCAG Compliance
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
          AI-Powered <span className="text-blue-600">WCAG</span> Compliance
          <br />
          Intelligence Platform
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          Automatically scan any website for WCAG 2.2 compliance with enterprise-grade AI analysis,
          confidence scoring, and actionable remediation recommendations. Built for compliance teams
          who need accuracy at scale.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <button className="btn-primary text-lg px-8">
            Start Free Scan
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 h-10 px-8 text-lg">
            View Demo
          </button>
        </div>

        <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            99.9% Uptime
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            WCAG 2.2 AA Compliant
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            GDPR Ready
          </div>
        </div>
      </div>
    </section>
  )
}
