'use client';

import React, { useEffect } from 'react';
import { TopToolbar } from '@/components/TopToolbar';
import { LeftSidebar } from '@/components/LeftSidebar';
import { PlotCanvas } from '@/components/PlotCanvas';
import { PlaybackBar } from '@/components/PlaybackBar';
import { PreflightModal } from '@/components/PreflightModal';
import { PrinterSettingsModal } from '@/components/PrinterSettingsModal';
import { GcodeDrawer } from '@/components/GcodeDrawer';
import { CommandPalette } from '@/components/CommandPalette';
import { ShareCardModal } from '@/components/ShareCardModal';
import { WebSerialModal } from '@/components/WebSerialModal';
import { GenerativeArtLab } from '@/components/GenerativeArtLab';
import { usePlotterStore } from '@/store/usePlotterStore';

export default function HomePage() {
  const {
    removeElement,
    selectedElementId,
    selectElement,
    togglePlay,
    isWebSerialOpen,
    setWebSerialOpen,
    activeStudioMode,
  } = usePlotterStore();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          removeElement(selectedElementId);
        }
      } else if (e.code === 'Escape') {
        selectElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, removeElement, selectedElementId, selectElement]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC] font-sans">
      <TopToolbar />
      {activeStudioMode === 'generator' ? (
        <GenerativeArtLab />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Creation Dock (280px) */}
          <LeftSidebar />

          {/* Central Canvas Studio */}
          <div className="flex flex-col flex-1 relative overflow-hidden">
            <PlotCanvas />
            <PlaybackBar />
          </div>
        </div>
      )}

      {/* Hardware Safety & Settings Modals */}
      <PreflightModal />
      <PrinterSettingsModal />

      {/* Auxiliary Tooling */}
      <GcodeDrawer />
      <CommandPalette />
      <ShareCardModal />
      <WebSerialModal isOpen={isWebSerialOpen} onClose={() => setWebSerialOpen(false)} />
    </div>
  );
}
