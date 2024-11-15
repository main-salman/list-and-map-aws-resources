'use client'
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

function Box() {
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function Scene() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Suspense fallback={null}>
        <Canvas>
          <ambientLight />
          <Box />
        </Canvas>
      </Suspense>
    </div>
  );
} 