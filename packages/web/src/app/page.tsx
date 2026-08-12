'use client';

import { useState, useCallback } from 'react';
import type { ScanResult } from '@/types';
import { FileUpload } from '@/components/FileUpload';
import { ScanReport } from '@/components/ScanReport';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';

export default function Home() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);

  const handleFile = useCallback(async (content: string, name: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setFilename(name);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename: name }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setResult(data.result);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setFilename(null);
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {!result && !loading && (
          <>
            <Hero />
            <FileUpload onFile={handleFile} />
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">
              Fetching funding data for <strong>{filename}</strong>…
            </p>
            <p className="text-slate-400 text-xs">
              This may take a moment for large dependency lists
            </p>
          </div>
        )}

        {result && !loading && (
          <ScanReport result={result} onReset={handleReset} />
        )}
      </div>

      <footer className="border-t border-slate-200 py-6 mt-8">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-sm">
          <span>
            Built by{' '}
            <a
              href="https://github.com/darcszn"
              className="text-green-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              darcszn
            </a>
          </span>
          <a
            href="https://github.com/darcszn/depfund"
            className="text-green-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub →
          </a>
        </div>
      </footer>
    </main>
  );
}
