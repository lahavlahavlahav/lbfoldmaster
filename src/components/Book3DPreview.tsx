import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { PatternResult } from '@/lib/pattern-engine';

interface Book3DPreviewProps {
  result: PatternResult;
}

const BOOK_WIDTH = 3;
const SPINE_THICKNESS = 0.8;

function FoldedPages({ result }: { result: PatternResult }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const { bookConfig, pages } = result;
  const totalPages = bookConfig.numberOfPages;
  const usableHeight = bookConfig.heightCm - bookConfig.topMarginCm - bookConfig.bottomMarginCm;
  const pageHeight = bookConfig.heightCm / 10; // convert to 3D units
  
  // Spread angle for the open book fan effect
  const totalAngle = Math.PI * 0.85; // ~153 degrees spread
  const startAngle = -totalAngle / 2;

  // Build page meshes
  const pageGeometries = useMemo(() => {
    const geos: Array<{
      pageNum: number;
      hasFold: boolean;
      foldDepths: number[]; // normalized 0-1 positions of folds
      angleY: number;
    }> = [];

    // Create a map for quick lookup
    const pageMap = new Map(pages.map(p => [p.pageNumber, p]));

    // Sample pages (show ~120 pages max for performance)
    const step = Math.max(1, Math.floor(totalPages / 120));
    
    for (let i = 0; i < totalPages; i += step) {
      const pageNum = i + 1;
      const ratio = i / (totalPages - 1);
      const angleY = startAngle + ratio * totalAngle;
      
      const pattern = pageMap.get(pageNum);
      const foldDepths: number[] = [];
      
      if (pattern && pattern.marks.length >= 2) {
        // Convert mark positions to normalized fold depths (0 = no fold, 1 = max fold)
        for (let m = 0; m < pattern.marks.length; m += 2) {
          if (m + 1 < pattern.marks.length) {
            const top = pattern.marks[m].positionCm;
            const bottom = pattern.marks[m + 1].positionCm;
            const centerNorm = ((top + bottom) / 2 - bookConfig.topMarginCm) / usableHeight;
            const widthNorm = (bottom - top) / usableHeight;
            foldDepths.push(centerNorm, widthNorm);
          }
        }
      }

      geos.push({
        pageNum,
        hasFold: foldDepths.length > 0,
        foldDepths,
        angleY,
      });
    }
    return geos;
  }, [pages, totalPages, startAngle, totalAngle, bookConfig, usableHeight]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Book spine */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[SPINE_THICKNESS * 0.3, pageHeight, SPINE_THICKNESS]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.8} />
      </mesh>

      {/* Pages */}
      {pageGeometries.map((pg) => (
        <FoldedPage
          key={pg.pageNum}
          angleY={pg.angleY}
          pageHeight={pageHeight}
          hasFold={pg.hasFold}
          foldDepths={pg.foldDepths}
          bookConfig={result.bookConfig}
          usableHeight={usableHeight}
        />
      ))}
    </group>
  );
}

function FoldedPage({
  angleY,
  pageHeight,
  hasFold,
  foldDepths,
  bookConfig,
  usableHeight,
}: {
  angleY: number;
  pageHeight: number;
  hasFold: boolean;
  foldDepths: number[];
  bookConfig: PatternResult['bookConfig'];
  usableHeight: number;
}) {
  const mesh = useMemo(() => {
    if (!hasFold || foldDepths.length === 0) {
      // Flat page - simple plane
      const geo = new THREE.PlaneGeometry(BOOK_WIDTH, pageHeight, 1, 1);
      return { geometry: geo, isFolded: false };
    }

    // Create a folded page shape using a custom geometry
    const segments = 32;
    const geo = new THREE.PlaneGeometry(BOOK_WIDTH, pageHeight, 1, segments);
    const posAttr = geo.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i); // -pageHeight/2 to pageHeight/2
      const yNorm = (y + pageHeight / 2) / pageHeight; // 0 to 1 (bottom to top)
      
      // Convert to cm position in the book
      const cmPos = bookConfig.topMarginCm + yNorm * usableHeight;
      
      // Check if this y position falls within any fold region
      let foldAmount = 0;
      for (let f = 0; f < foldDepths.length; f += 2) {
        const centerNorm = foldDepths[f];
        const widthNorm = foldDepths[f + 1];
        const foldTopCm = bookConfig.topMarginCm + (centerNorm - widthNorm / 2) * usableHeight;
        const foldBottomCm = bookConfig.topMarginCm + (centerNorm + widthNorm / 2) * usableHeight;
        
        if (cmPos >= foldTopCm && cmPos <= foldBottomCm) {
          // Inside fold region - compute fold depth using smooth curve
          const foldCenter = (foldTopCm + foldBottomCm) / 2;
          const foldHalf = (foldBottomCm - foldTopCm) / 2;
          const dist = Math.abs(cmPos - foldCenter) / foldHalf;
          foldAmount = Math.max(foldAmount, Math.cos(dist * Math.PI / 2) * 0.6);
        }
      }
      
      // Push the vertex inward (along x) to create fold effect
      if (foldAmount > 0) {
        const x = posAttr.getX(i);
        // Fold toward the spine (x toward 0)
        const foldedX = x * (1 - foldAmount * 0.7);
        posAttr.setX(i, foldedX);
        // Slight z offset for depth
        posAttr.setZ(i, posAttr.getZ(i) + foldAmount * 0.15);
      }
    }
    
    geo.computeVertexNormals();
    return { geometry: geo, isFolded: true };
  }, [hasFold, foldDepths, pageHeight, bookConfig, usableHeight]);

  return (
    <group rotation={[0, angleY, 0]}>
      <mesh
        position={[BOOK_WIDTH / 2, 0, 0]}
        geometry={mesh.geometry}
      >
        <meshStandardMaterial
          color={mesh.isFolded ? '#FFF8E7' : '#FFFDF5'}
          side={THREE.DoubleSide}
          roughness={0.7}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

const Book3DPreview: React.FC<Book3DPreviewProps> = ({ result }) => {
  return (
    <div className="w-full h-[400px] bg-muted/20 rounded-lg border border-border overflow-hidden">
      <Canvas
        camera={{ position: [0, 3, 6], fov: 45 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} />
        <FoldedPages result={result} />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={12}
          autoRotate={false}
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
};

export default Book3DPreview;
