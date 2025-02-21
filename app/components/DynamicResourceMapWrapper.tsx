'use client';

import { forwardRef, useEffect, useState, useRef, useImperativeHandle } from 'react';
import type { ResourceMapRef } from './ResourceMap';
import type { AWSResource } from '../types';
import DynamicResourceMapLoader from './DynamicResourceMapLoader';

interface Props {
  resources: AWSResource[];
  onLoad?: () => void;
}

const DynamicResourceMapWrapper = forwardRef<ResourceMapRef, Props>((props, ref) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasExportMethods, setHasExportMethods] = useState(false);
  const loaderRef = useRef<ResourceMapRef>(null);

  // Monitor loader ref for methods
  useEffect(() => {
    const hasRequiredMethods = !!(
      loaderRef.current?.exportToDrawio && 
      loaderRef.current?.exportToPng
    );

    console.log('[DynamicWrapper] Checking loader methods:', {
      hasRef: !!loaderRef.current,
      methods: loaderRef.current ? Object.keys(loaderRef.current) : [],
      hasRequiredMethods
    });

    setHasExportMethods(hasRequiredMethods);
  }, [loaderRef.current]);

  useImperativeHandle(ref, () => {
    const isReady = isMounted && isLoaded && hasExportMethods;
    console.log('[DynamicWrapper] Handling ref:', {
      isMounted,
      isLoaded,
      hasExportMethods,
      isReady,
      methods: loaderRef.current ? Object.keys(loaderRef.current) : []
    });

    if (!isReady) {
      return {
        exportToDrawio: () => {
          console.error('[DynamicWrapper] Not ready (ready:', isReady, ')');
        },
        exportToPng: async () => {
          console.error('[DynamicWrapper] Not ready (ready:', isReady, ')');
        }
      };
    }

    return {
      exportToDrawio: () => {
        console.log('[DynamicWrapper] Executing exportToDrawio');
        loaderRef.current?.exportToDrawio();
      },
      exportToPng: async () => {
        console.log('[DynamicWrapper] Executing exportToPng');
        await loaderRef.current?.exportToPng();
      }
    };
  }, [isMounted, isLoaded, hasExportMethods, loaderRef.current]);

  const handleLoad = () => {
    console.log('[DynamicWrapper] Map loaded. State:', {
      hasRef: !!loaderRef.current,
      methods: loaderRef.current ? Object.keys(loaderRef.current) : []
    });
    setIsLoaded(true);
    props.onLoad?.();
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <DynamicResourceMapLoader 
      {...props} 
      ref={loaderRef}
      onLoad={handleLoad}
    />
  );
});

DynamicResourceMapWrapper.displayName = 'DynamicResourceMapWrapper';

export default DynamicResourceMapWrapper; 