import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Salesforce Bulk Report Updater',
  description: 'Bulk update field references across Salesforce reports',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sf-neutral-20">
        {/* Top nav */}
        <header className="bg-sf-blue shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            {/* Salesforce cloud icon */}
            <svg
              className="w-8 h-8 text-white shrink-0"
              viewBox="0 0 52 35"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21.5 0C17.3 0 13.6 2.1 11.4 5.3A10.1 10.1 0 0 0 5.1 3.4C2.3 3.4 0 5.7 0 8.5c0 .5.1 1 .2 1.5A8.5 8.5 0 0 0 0 26.5C0 31.2 3.8 35 8.5 35h34c5.2 0 9.5-4.3 9.5-9.5 0-4.5-3.1-8.2-7.3-9.2.1-.6.2-1.2.2-1.8C44.9 6.9 38 0 29.5 0c-3 0-5.8.9-8 2.4A10.9 10.9 0 0 0 21.5 0z" />
            </svg>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Bulk Report Updater</h1>
              <p className="text-blue-200 text-xs">Salesforce field reference migration tool</p>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Suspense>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}
