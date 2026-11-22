import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, ExternalLink, CheckCircle2, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — PlotForge Studio',
  description: 'PlotForge operates 100% client-side with zero server storage, zero telemetry, and complete GDPR compliance.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-2.5 h-2.5 rounded-sm bg-[#EA580C] shadow-[0_0_8px_rgba(234,88,12,0.4)] group-hover:scale-110 transition-transform" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-slate-900 text-xs tracking-wider font-mono">
                PLOTFORGE
              </span>
              <span className="text-[9px] text-blue-600 font-mono font-bold tracking-widest px-1 py-0.2 rounded bg-blue-50 border border-blue-200/60">
                STUDIO
              </span>
            </div>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-600">Privacy Policy</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/terms"
            className="text-xs font-medium text-slate-500 hover:text-slate-900 transition"
          >
            Terms of Service
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold bg-[#EA580C] hover:bg-[#C2410C] text-white px-3.5 py-1.5 rounded-xl transition shadow-[0_2px_8px_rgba(234,88,12,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-mono font-bold mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>GDPR & CCPA Compliant • 100% Client-Side</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Effective Date: November 2026 • Version 1.0.0
          </p>

          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            PlotForge Studio is built upon <strong>Privacy-by-Design</strong> principles. We believe creative software should never spy on you, harvest your vector artwork, or log personal telemetry. Everything in PlotForge executes locally inside your web browser.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                1. 100% Client-Side Processing Architecture
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When you upload images, vectorize photos, type Hershey text, import vector SVGs, or export G-code files, all calculations take place entirely within your browser&apos;s local memory and Web Worker threads. No image files, design geometry, coordinates, or generated machine code are ever transmitted to external web servers.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                2. Local Storage Usage
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              To provide a seamless experience, PlotForge stores user preferences strictly within your browser&apos;s <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">localStorage</code>:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
              <li>Active printer model (e.g., Bambu Lab A1 Mini, A1, Ender 3, or custom preset)</li>
              <li>Bed and paper dimensions, pen offsets (X/Y delta), and Z heights</li>
              <li>Optional local printer Wi-Fi IP and access code (stored only on your machine for FTPS/LAN connection)</li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              This data never leaves your browser. You can clear it at any time by clearing your browser data or clicking reset in settings.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              3. Zero Analytics, Tracking & Cookies
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              PlotForge does not use third-party analytics (no Google Analytics, no Mixpanel), no tracking pixels, and no advertising cookies. We do not track your IP address, device fingerprints, or behavioral usage.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              4. Global Privacy Compliance (GDPR & CCPA/CPRA)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Because PlotForge does not collect, sell, or share Personal Identifiable Information (PII), your statutory rights under the European Union&apos;s GDPR and California&apos;s CCPA/CPRA are satisfied by design. There is no personal data for us to delete, sell, or disclose.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              5. Open-Source Transparency
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              PlotForge is completely open source under the MIT License. You can inspect every line of code, our packaging dependencies, and build pipelines on GitHub:
            </p>
            <div className="mt-3">
              <a
                href="https://github.com/kumawat007/PlotForge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60"
              >
                github.com/kumawat007/PlotForge <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-400 font-mono">
          <p>© 2026 PlotForge Studio • Created by kumawat007 • Licensed under MIT</p>
        </footer>
      </main>
    </div>
  );
}
