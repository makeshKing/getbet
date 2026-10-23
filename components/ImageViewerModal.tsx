import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title = "Payment Proof" 
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `payment-proof-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!imageUrl) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Image Container */}
        <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px] max-h-[70vh]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}
          
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                <X className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to Load Image</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                The payment proof image could not be loaded. Please try again or contact support.
              </p>
              <button
                onClick={() => {
                  setIsLoading(true);
                  setHasError(false);
                  const img = new Image();
                  img.onload = handleImageLoad;
                  img.onerror = handleImageError;
                  img.src = imageUrl;
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <ZoomIn size={16} />
            <span>Zoom In</span>
          </button>
          
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <ZoomOut size={16} />
            <span>Zoom Out</span>
          </button>
          
          <button
            onClick={handleRotate}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm"
          >
            <RotateCw size={16} />
            <span>Rotate</span>
          </button>
          
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm"
          >
            <X size={16} />
            <span>Reset</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
        </div>

        {/* Image Info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          <p>Zoom: {Math.round(zoom * 100)}% | Rotation: {rotation}°</p>
          {imageUrl.startsWith('data:') && (
            <p className="mt-1">Base64 encoded image</p>
          )}
        </div>
      </div>
    </Dialog>
  );
};