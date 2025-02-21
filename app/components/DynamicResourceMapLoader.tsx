'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ResourceMapRef } from './ResourceMap';
import type { AWSResource } from '../types';

// Import the actual component type but don't use it directly
const ResourceMap = dynamic(() => import('./ResourceMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[1200px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
});

interface Props {
  resources: AWSResource[];
  onLoad?: () => void;
}

// This component handles the dynamic loading
const DynamicResourceMapLoader = forwardRef<ResourceMapRef, Props>((props, ref) => {
  const mapRef = useRef<ResourceMapRef>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Forward methods when map is ready
  useImperativeHandle(ref, () => {
    console.log('[DynamicLoader] Creating handle:', {
      isMapReady,
      hasRef: !!mapRef.current,
      methods: mapRef.current ? Object.keys(mapRef.current) : []
    });

    return {
      exportToDrawio: () => {
        console.log('[DynamicLoader] Forwarding exportToDrawio');
        if (!mapRef.current) {
          console.error('[DynamicLoader] Map ref not available');
          return;
        }
        mapRef.current.exportToDrawio();
      },
      exportToPng: async () => {
        console.log('[DynamicLoader] Forwarding exportToPng');
        if (!mapRef.current) {
          console.error('[DynamicLoader] Map ref not available');
          return;
        }
        await mapRef.current.exportToPng();
      }
    };
  }, [isMapReady, mapRef.current]);

  const handleMapLoad = () => {
    console.log('[DynamicLoader] Map loaded:', {
      hasRef: !!mapRef.current,
      methods: mapRef.current ? Object.keys(mapRef.current) : []
    });
    setIsMapReady(true);
    props.onLoad?.();
  };

  return (
    <div className="relative w-full">
      <ResourceMap 
        {...props} 
        ref={mapRef}
        onLoad={handleMapLoad}
      />
    </div>
  );
});

DynamicResourceMapLoader.displayName = 'DynamicResourceMapLoader';

export default DynamicResourceMapLoader; 