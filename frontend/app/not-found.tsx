import Link from 'next/link';
import { ImageWithFallback } from '@/components/ImageWithFallback';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center space-y-8">
        {/* Pixel Bomb Icon */}
        <ImageWithFallback
          src="/bomb-pixel.png"
          alt="404 - Not Found"
          className="w-32 h-32 mx-auto animate-pulse"
          fallback={<div className="text-9xl animate-pulse">💣</div>}
        />
        
        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="font-display text-6xl md:text-8xl text-ember tracking-wider">
            404
          </h1>
          <h2 className="font-display text-3xl md:text-4xl text-cream">
            ROOM NOT FOUND
          </h2>
          <p className="font-body text-lg text-smoke max-w-md mx-auto">
            This room doesn't exist or has expired. Create a new room to start playing!
          </p>
        </div>

        {/* Back to Home Button */}
        <Link 
          href="/"
          className="inline-block px-8 py-4 bg-ember text-cream font-display text-2xl tracking-wider rounded-xl hover:bg-ember/90 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-ember/50"
        >
          GO HOME
        </Link>
      </div>
    </div>
  );
}
