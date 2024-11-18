'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import html2canvas from 'html2canvas';
import GIF from 'gif.js';

interface SceneProps {
  location: { lat: number; lng: number };
  dateTime: Date;
}

export default function Scene({ location, dateTime }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameCountRef = useRef(0);
  const gifRef = useRef<any>(null);

  const startRecording = () => {
    if (!containerRef.current) return;
    
    setIsRecording(true);
    frameCountRef.current = 0;
    
    gifRef.current = new GIF({
      workers: 2,
      quality: 10,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    gifRef.current.on('progress', (p: number) => {
      setProgress(Math.round(p * 100));
    });

    gifRef.current.on('finished', (blob: Blob) => {
      setIsRecording(false);
      setProgress(0);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nightsky-${new Date().toISOString()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const captureFrame = async () => {
    if (!containerRef.current) return;
    
    const canvas = await html2canvas(containerRef.current);
    gifRef.current.addFrame(canvas, { delay: 100 });
    frameCountRef.current += 1;

    if (frameCountRef.current >= 50) { // Capture 50 frames
      gifRef.current.render();
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Add stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.1,
    });

    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    camera.position.z = 5;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const animate = () => {
      requestAnimationFrame(animate);
      stars.rotation.y += 0.0002;
      controls.update();
      renderer.render(scene, camera);
      
      if (isRecording && gifRef.current && frameCountRef.current < 50) {
        captureFrame();
      }
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      scene.remove(stars);
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
    };
  }, [location, dateTime]);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 flex gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Record GIF
          </button>
        ) : (
          <div className="px-4 py-2 bg-gray-800 text-white rounded-lg">
            Recording... {progress}%
          </div>
        )}
      </div>
    </div>
  );
} 