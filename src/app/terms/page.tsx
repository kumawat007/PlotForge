import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ExternalLink, AlertTriangle, Scale } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — PlotForge Studio',
  description: 'Terms of Service, MIT License terms, and hardware safety guidelines for PlotForge Pen Plotter CAM Studio.',
};

export default function TermsPage() {
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
          <span className="text-xs font-semibold text-slate-600">Terms of Service</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/privacy"
            className="text-xs font-medium text-slate-500 hover:text-slate-900 transition"
          >
            Privacy Policy
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-mono font-bold mb-4">
            <Scale className="w-4 h-4" />
            <span>MIT Open Source License • Hardware Safety Notice</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Effective Date: November 2026 • Version 1.0.0
          </p>

          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            By accessing or using PlotForge Studio (accessible via <a href="https://plotforge-studio.pages.dev" className="text-blue-600 underline font-mono">plotforge-studio.pages.dev</a> or locally), you agree to be bound by these Terms of Service.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {/* Section 1: MIT License */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              1. Open-Source License (MIT)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              PlotForge is released under the permissive <strong>MIT License</strong>. You are granted permission, free of charge, to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to the conditions outlined in our <a href="https://github.com/kumawat007/PlotForge/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">LICENSE</a>.
            </p>
          </section>

          {/* Section 2: Hardware Safety & Disclaimer */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                2. Disclaimer of Warranties & Machine Safety
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              <strong>Electromechanical Safety:</strong> 3D printers, CNC routers, and pen plotters are physical machines capable of rapid multi-axis motion and heating. While PlotForge incorporates collision detection envelopes and preflight safety verification, real-world machine setups can vary based on pen length, mount fabrication tolerances, and bed leveling.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, MACHINE DAMAGE (SUCH AS NOZZLE CRASHES, BED SURFACE GOUGES, OR STEPPER SKIPS), OR PERSONAL INJURY RESULTING DIRECTLY OR INDIRECTLY FROM G-CODE EXECUTED ON PHYSICAL HARDWARE.
            </p>
          </section>

          {/* Section 3: Operator Guidelines */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              3. Operator Best Practices
            </h2>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
              <li>Always dry-run new G-code files or test at high Z travel heights before lowering the pen to the print bed.</li>
              <li>Use spring-loaded pens or flexible mounts to absorb any mechanical irregularities in your build plate.</li>
              <li>Ensure your print plate is unheated or cooled to ambient room temperature before inserting pens to avoid melting plastic pen barrels.</li>
              <li>Keep fingers, cables, and loose clothing clear of moving belts and print heads during operation.</li>
            </ul>
          </section>

          {/* Section 4: 3D Mounts & Maker Community */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              4. 3D Printable Mounts & Maker Community
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              All physical pen mount designs and Print-in-Place (PIP) toolhead attachments are distributed through MakerWorld for community printing:
            </p>
            <div>
              <a
                href="https://makerworld.com/en/@kumawat007"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60"
              >
                makerworld.com/@kumawat007 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

          {/* Section 5: Modifications */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
              5. Governing Law & Updates
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              These terms are governed by standard open-source conventions. We reserve the right to modify these terms as PlotForge evolves. Continued use of PlotForge signifies acceptance of updated terms.
            </p>
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
