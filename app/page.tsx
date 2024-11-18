'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import * as bodyPix from '@tensorflow-models/body-pix';
import '@tensorflow/tfjs';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<bodyPix.BodyPix | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2
        });
        setModel(loadedModel);
      } catch (err) {
        setError('Failed to load AI model');
      }
    };
    loadModel();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImage(reader.result as string);
        setProcessedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = async () => {
    if (!originalImage || !model || !imageRef.current || !canvasRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // Wait for image to load completely
      await new Promise((resolve) => {
        if (imageRef.current!.complete) resolve(true);
        imageRef.current!.onload = () => resolve(true);
      });

      // Create a temporary canvas for proper image processing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Could not get temp canvas context');

      // Set canvas dimensions to match the image
      const width = imageRef.current.naturalWidth;
      const height = imageRef.current.naturalHeight;
      tempCanvas.width = width;
      tempCanvas.height = height;
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      // Draw image to temp canvas
      tempCtx.drawImage(imageRef.current, 0, 0);

      // Segment the person
      const segmentation = await model.segmentPerson(tempCanvas, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.7,
      });

      // Get the canvas context for final output
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Draw the original image
      ctx.drawImage(imageRef.current, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      // Process the image data
      for (let i = 0; i < pixels.length; i += 4) {
        const segmentationIndex = Math.floor(i / 4);
        if (!segmentation.data[segmentationIndex]) {
          // If pixel is not part of person, make it transparent
          pixels[i + 3] = 0;
        }
      }

      // Put the processed image data back
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to data URL
      const processedDataUrl = canvasRef.current.toDataURL('image/png');
      setProcessedImage(processedDataUrl);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImage(reader.result as string);
        setProcessedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h1 className="text-6xl font-bold text-center mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Background Remover
        </h1>
        <p className="text-xl text-center text-gray-400 mb-16">
          Upload an image to remove its background
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-gray-600 rounded-3xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {originalImage ? (
                <div className="relative w-full aspect-square">
                  <Image
                    src={originalImage}
                    alt="Original"
                    fill
                    className="object-contain rounded-2xl"
                    unoptimized
                  />
                  <img
                    ref={imageRef}
                    src={originalImage}
                    alt="hidden"
                    className="hidden"
                    crossOrigin="anonymous"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="py-16">
                  <p className="text-gray-400">
                    Drag and drop an image here, or click to select
                  </p>
                </div>
              )}
            </div>

            {originalImage && (
              <button
                onClick={removeBackground}
                disabled={loading || !model}
                className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl text-lg font-medium hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!model ? 'Loading AI Model...' : loading ? 'Processing...' : 'Remove Background'}
              </button>
            )}
          </div>

          <div className="border-2 border-gray-600 rounded-3xl p-8">
            {processedImage ? (
              <div className="relative w-full aspect-square">
                <Image
                  src={processedImage}
                  alt="Processed"
                  fill
                  className="object-contain rounded-2xl"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">
                  {loading ? 'Processing image...' : 'Processed image will appear here'}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500 rounded-xl text-red-500">
            {error}
          </div>
        )}

        {processedImage && (
          <div className="mt-6 text-center">
            <a
              href={processedImage}
              download="processed-image.png"
              className="inline-block bg-green-500 text-white py-3 px-6 rounded-xl text-lg font-medium hover:bg-green-600 transition duration-300 ease-in-out"
            >
              Download Processed Image
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
