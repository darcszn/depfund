'use client';

import { useCallback, useRef, useState, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onFile: (content: string, filename: string) => void;
}

const ACCEPTED_FILES = ['package.json', 'requirements.txt', 'cargo.toml', 'pyproject.toml'];

const EXAMPLE_FILES: { label: string; filename: string; content: string }[] = [
  {
    label: 'npm (React app)',
    filename: 'package.json',
    content: JSON.stringify(
      {
        name: 'example-app',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          axios: '^1.6.0',
          lodash: '^4.17.21',
          chalk: '^5.3.0',
          express: '^4.18.0',
        },
        devDependencies: {
          typescript: '^5.4.5',
          jest: '^29.7.0',
          prettier: '^3.2.0',
        },
      },
      null,
      2
    ),
  },
  {
    label: 'Python (Flask app)',
    filename: 'requirements.txt',
    content: [
      'flask==3.0.0',
      'requests>=2.31.0',
      'sqlalchemy==2.0.0',
      'pydantic>=2.0.0',
      'click>=8.0.0',
      'rich>=13.0.0',
    ].join('\n'),
  },
  {
    label: 'Rust (CLI app)',
    filename: 'Cargo.toml',
    content: [
      '[package]',
      'name = "example-cli"',
      'version = "0.1.0"',
      '',
      '[dependencies]',
      'clap = "4.5.0"',
      'tokio = { version = "1.37.0", features = ["full"] }',
      'serde = { version = "1.0", features = ["derive"] }',
      'reqwest = "0.12.0"',
      'anyhow = "1.0"',
    ].join('\n'),
  },
];

export function FileUpload({ onFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndLoad = useCallback(
    (file: File) => {
      setFileError(null);
      const name = file.name.toLowerCase();

      if (!ACCEPTED_FILES.some((f) => name === f)) {
        setFileError(
          `Unsupported file: "${file.name}". Please upload package.json, requirements.txt, pyproject.toml, or Cargo.toml.`
        );
        return;
      }

      if (file.size > 500_000) {
        setFileError('File too large. Maximum size is 500KB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFile(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndLoad(file);
    },
    [validateAndLoad]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndLoad(file);
    },
    [validateAndLoad]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-slate-300 hover:border-green-400 hover:bg-green-50/30'
          }
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload dependency manifest file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,.txt,.toml"
          onChange={onInputChange}
          className="sr-only"
          aria-label="File input"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? 'bg-green-100' : 'bg-slate-100'
          }`}>
            <svg
              className={`w-7 h-7 transition-colors ${isDragging ? 'text-green-600' : 'text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-700 font-medium">
              Drop your manifest file here
            </p>
            <p className="text-slate-400 text-sm mt-1">
              or click to browse — package.json, requirements.txt, Cargo.toml
            </p>
          </div>
        </div>
      </div>

      {fileError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {fileError}
        </p>
      )}

      {/* Quick examples */}
      <div>
        <p className="text-xs text-slate-400 text-center mb-3">
          Or try a quick example:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_FILES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => onFile(ex.content, ex.filename)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600
                         hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
