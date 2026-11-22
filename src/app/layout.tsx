import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlotForge — Professional Pen Plotter CAM Studio',
  description:
    'Precision CAD/CAM Studio & Generative Plotter Art Engine for Bambu Lab, Prusa, Marlin, and GRBL 3D printers. 100% Client-Side.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#F8FAFC] text-[#0F172A] font-sans antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
