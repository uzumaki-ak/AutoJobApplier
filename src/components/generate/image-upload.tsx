// [F50] src/components/generate/image-upload.tsx — Screenshot upload
// Drag-drop or click to upload, converts to base64 and calls extract API

"use client";

import { useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";

interface ImageUploadProps {
  onExtract: (base64: string, mimeType: string) => void;
  loading: boolean;
}

export function ImageUpload({ onExtract, loading }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(",")[1];
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      setPreview(result);
      onExtract(base64, mimeType);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Upload a screenshot of the job post. Gemini AI will extract all details.
      </p>

      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? "border-[var(--color-primary)] bg-[var(--color-accent)]"
            : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {loading ? (
          <div className="space-y-2">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--color-muted-foreground)]">Extracting job details...</p>
          </div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center text-[var(--color-muted-foreground)]">
              <ImageIcon size={36} />
            </div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Drop screenshot here</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">or click to browse • JPG, PNG, WebP</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Upload size={14} className="text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-primary)]">Upload screenshot</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {preview && !loading && (
        <button
          onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
          className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          Clear image
        </button>
      )}
    </div>
  );
}
