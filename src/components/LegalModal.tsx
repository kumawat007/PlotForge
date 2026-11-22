'use client';

import React, { useEffect } from 'react';
import { usePlotterStore } from '@/store/usePlotterStore';
import { ShieldCheck, FileText, X, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';

export const LegalModal: React.FC = () => {
  const { isLegalModalOpen, setLegalModalOpen } = usePlotterStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLegalModalOpen) {
        setLegalModalOpen(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLegalModalOpen, setLegalModalOpen]);

  if (!isLegalModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setLegalModalOpen(null)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            {isLegalModalOpen === 'privacy' ? (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                <ShieldCheck className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isLegalModalOpen === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                PlotForge Studio • Global Standard (US/EU & GDPR)
              </p>
            </div>
          </div>

          {/* Tab Switcher & Close Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setLegalModalOpen('privacy')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  isLegalModalOpen === 'privacy'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => setLegalModalOpen('terms')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  isLegalModalOpen === 'terms'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Terms
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLegalModalOpen(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto text-xs text-slate-600 leading-relaxed space-y-5 font-sans">
          {isLegalModalOpen === 'privacy' ? (
            <>
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900">
                  <span className="font-bold">100% Client-Side Privacy Guarantee:</span> PlotForge operates entirely inside your local web browser. Your artwork, photos, SVGs, and generated G-codes never leave your device and are never sent to external servers.
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  1. Zero Server Processing & Telemetry
                </h3>
                <p>
                  PlotForge does not operate remote backend databases or compute servers for vectorization or slicing. All path calculations, Hershey font rendering, 2-Opt TSP optimization, and machine kinematic translations execute locally within your device’s browser JavaScript and Web Worker sandbox.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  2. Local Storage Usage
                </h3>
                <p>
                  We store strictly functional configuration data inside your browser&apos;s local storage (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">localStorage</code>) to remember your preferences between sessions:
                </p>
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-600">
                  <li>Active machine profile and paper preset</li>
                  <li>Custom toolhead offsets and Z-travel/draw heights</li>
                  <li>Optional local printer Wi-Fi IP address and access credentials</li>
                </ul>
                <p className="mt-1">
                  You can purge this data at any moment simply by clearing your browser cookies and site data for this domain.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  3. Zero Tracking Cookies & Third-Party Analytics
                </h3>
                <p>
                  We do not use advertising trackers, profiling cookies, session recorders, or third-party behavioral analytics. No tracking scripts or Google Analytics are loaded on PlotForge.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  4. GDPR & CCPA/CPRA Compliance
                </h3>
                <p>
                  Under European Union General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA/CPRA), you have the right to privacy and non-collection. Because PlotForge collects zero Personal Identifiable Information (PII), your privacy is safeguarded by software architecture.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  5. Open Source Code Verification
                </h3>
                <p>
                  You are welcome to independently audit all source code, algorithms, and build scripts on our official GitHub repository:{' '}
                  <a
                    href="https://github.com/kumawat007/PlotForge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    github.com/kumawat007/PlotForge <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900">
                  <span className="font-bold">Hardware Safety Notice:</span> 3D printers and plotters are physical machines with moving motors and heated components. Always supervise plotting jobs and calibrate pen offsets before running G-code.
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  1. Open-Source MIT License
                </h3>
                <p>
                  PlotForge is provided as free, open-source software under the MIT License. You are permitted to use, modify, distribute, and integrate PlotForge for personal, educational, or commercial plotting workflows.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  2. Disclaimer of Warranties & Machine Safety
                </h3>
                <p>
                  THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
                </p>
                <p className="mt-1.5">
                  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR MACHINE DAMAGE (INCLUDING HOTEND NOZZLE STRIKES, PRINT BED SCRATCHES, STEPPER MOTOR OVER-TRAVEL, OR ELECTRICAL FAULTS) ARISING FROM G-CODE CREATED OR TRANSMITTED THROUGH THIS SOFTWARE.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  3. Operator Responsibility
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Verify that your 3D printed mount is securely fastened to the toolhead.</li>
                  <li>Ensure pen draw height does not press excessively against the print sheet (spring-loaded pens or adapters are strongly recommended).</li>
                  <li>Verify that travel coordinates remain inside your printer’s reachable kinematic envelope.</li>
                  <li>Always keep your printer&apos;s emergency stop button accessible during operation.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono mb-1">
                  4. Community & 3D Printable Mounts
                </h3>
                <p>
                  Physical mounts and print-in-place accessories designed for PlotForge can be downloaded directly from MakerWorld:{' '}
                  <a
                    href="https://makerworld.com/en/@kumawat007"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    makerworld.com/@kumawat007 <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-blue-600 transition underline underline-offset-2 flex items-center gap-0.5"
            >
              Standalone Privacy Page <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>•</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-blue-600 transition underline underline-offset-2 flex items-center gap-0.5"
            >
              Standalone Terms Page <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setLegalModalOpen(null)}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
