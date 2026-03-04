"use client";

import { useState } from "react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}

export function ImageWithFallback({ src, alt, className, fallback }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error) {
    return <>{fallback}</>;
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
    />
  );
}
