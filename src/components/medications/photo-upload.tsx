"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface PhotoUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Pill-photo uploader with an inline preview. Reads the file to a data URL; the medication server
 * action uploads it to the private S3 bucket (`uploadImageDataUrl`) and stores only the object key.
 */
export function PhotoUpload({ value, onChange }: PhotoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Medication preview" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
          <span className="ml-1">{value ? "Replace photo" : "Upload photo"}</span>
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="h-4 w-4" />
            <span className="ml-1">Remove</span>
          </Button>
        )}
      </div>
    </div>
  );
}
