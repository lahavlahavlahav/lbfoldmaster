import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PatternResult } from '@/lib/pattern-engine';

interface Book3DPreviewProps {
  result: PatternResult;
}

const BOOK_WIDTH = 2.5;

function BookModel({ result }: { result: PatternResult }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  const { bookConfig, pages } = result;
  const totalPages = bookConfig.numberOfPages;
  const usableHeight = bookConfig.heightCm - bookConfig.topMarginCm - bookConfig.bottomMarginCm;
  const pageHeight = bookConfig.heightCm / 10;

  const totalAngle = Math.PI * 0.75;
  const startAngle = -totalAngle / 2;

  // Build a single merged geometry for performance
  const mergedGeo = useMemo(() => {
    const pageMap = new Map(pages.map(p => [p.pageNumber, p]));
    // Show max ~80 pages for performance
    const step = Math.max(1, Math.floor(totalPages / 80));
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertOffset = 0;

    const segments = 24;

    for (let i = 0; i < totalPages; i += step) {
      const pageNum = i + 1;
      const ratio = totalPages > 1 ? i / (totalPages - 1) : 0.5;
      const angleY = startAngle + ratio * totalAngle;

      const cosA = Math.cos(angleY);
      const sinA = Math.sin(angleY);

      const pattern = pageMap.get(pageNum);

      // Build fold regions for this page
      const foldRegions: Array<{ topNorm: number; bottomNorm: number }> = [];
      if (pattern && pattern.marks.length >= 2) {
        for (let m = 0; m < pattern.marks.length; m += 2) {
          if (m + 1 < pattern.marks.length) {
            const top = pattern.marks[m].positionCm;
            const bottom = pattern.marks[m + 1].positionCm;
            foldRegions.push({
              topNorm: (top - bookConfig.topMarginCm) / usableHeight,
              bottomNorm: (bottom - bookConfig.topMarginCm) / usableHeight,
            });
          }
        }
      }

      const hasFold = foldRegions.length > 0;

      // Create a strip of quads for this page
      for (let s = 0; s <= segments; s++) {
        const yNorm = s / segments; // 0 to 1
        const y = (yNorm - 0.5) * pageHeight;

        // Calculate fold amount at this y position
        let foldAmount = 0;
        for (const region of foldRegions) {
          if (yNorm >= region.topNorm && yNorm <= region.bottomNorm) {
            const center = (region.topNorm + region.bottomNorm) / 2;
            const half = (region.bottomNorm - region.topNorm) / 2;
            if (half > 0) {
              const dist = Math.abs(yNorm - center) / half;
              foldAmount = Math.max(foldAmount, Math.cos(dist * Math.PI / 2) * 0.55);
            }
          }
        }

        // Page extends from spine outward
        const localX = BOOK_WIDTH * (1 - foldAmount * 0.65);
        const localZ = foldAmount * 0.12;

        // Two vertices per row: at spine (x=0) and at edge
        // Spine vertex
        const sx = 0, sz = 0;
        const wx = sx * cosA - sz * sinA;
        const wz = sx * sinA + sz * cosA;
        positions.push(wx, y, wz);
        normals.push(-sinA, 0, cosA);
        // Color: spine area is slightly darker
        colors.push(0.95, 0.93, 0.88);

        // Edge vertex
        const ex = localX, ez = localZ;
        const ewx = ex * cosA - ez * sinA;
        const ewz = ex * sinA + ez * cosA;
        positions.push(ewx, y, ewz);
        normals.push(-sinA, 0, cosA);
        // Folded pages get a warmer tint
        if (hasFold && foldAmount > 0) {
          colors.push(1.0, 0.97, 0.90);
        } else {
          colors.push(1.0, 0.99, 0.96);
        }
      }

      // Build triangle indices for this page
      for (let s = 0; s < segments; s++) {
        const base = vertOffset + s * 2;
        // Two triangles per quad
        indices.push(base, base + 1, base + 3);
        indices.push(base, base + 3, base + 2);
      }

      vertOffset += (segments + 1) * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [pages, totalPages, startAngle, totalAngle, bookConfig, usableHeight, pageHeight]);

  // Spine geometry
  const spineHeight = pageHeight;

  return (
    <group ref={groupRef}>
      {/* Spine */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.15, spineHeight, 0.4]} />
        <meshStandardMaterial color="#6B3A2A" roughness={0.9} />
      </mesh>

      {/* All pages as one mesh */}
      <mesh geometry={mergedGeo}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.75}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

const Book3DPreview: React.FC<Book3DPreviewProps> = ({ result }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-[350px] bg-muted/20 rounded-lg border border-border flex items-center justify-center text-muted-foreground text-sm">
        3D preview unavailable — try refreshing
      </div>
    );
  }

  return (
    <div className="w-full h-[350px] bg-gradient-to-b from-muted/10 to-muted/30 rounded-lg border border-border overflow-hidden">
      <Canvas
        camera={{ position: [0, 2.5, 5], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', () => setError(true));
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 5, 4]} intensity={0.9} />
        <directionalLight position={[-3, 2, -3]} intensity={0.3} />
        <BookModel result={result} />
        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
};

export default Book3DPreview;
