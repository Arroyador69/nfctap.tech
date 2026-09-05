"use client";

import { CARD_H, CARD_W, drawCardFace } from "@/lib/draw-card";
import type { CardDesign } from "@/lib/types";
import { ContactShadows, PresentationControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export function Card3D({ design }: { design: CardDesign }) {
  return (
    <div className="h-[560px] w-full sm:h-[640px]">
      <Canvas camera={{ position: [0, 0.15, 3.2], fov: 32 }} gl={{ antialias: true }}>
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={0.85} />
        <spotLight position={[4, 6, 4]} intensity={1.4} angle={0.4} penumbra={0.8} />
        <directionalLight position={[-3, 2, 2]} intensity={0.35} />
        <PresentationControls
          global
          polar={[-0.2, 0.35]}
          azimuth={[-0.7, 0.7]}
          snap
          speed={1.2}
        >
          <Stand design={design} />
        </PresentationControls>
        <ContactShadows position={[0, -1.15, 0]} opacity={0.28} scale={6} blur={2.4} />
      </Canvas>
    </div>
  );
}

function Stand({ design }: { design: CardDesign }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const apply = (logo?: HTMLImageElement) => {
      drawCardFace(ctx, design, logo);
      texture.needsUpdate = true;
    };

    if (design.logoDataUrl) {
      const img = new Image();
      img.onload = () => apply(img);
      img.src = design.logoDataUrl;
    } else apply();
  }, [design, texture]);

  return (
    <group position={[0, -0.15, 0]} rotation={[0.08, 0.18, 0]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[1.15, 1.84, 0.055]} />
        <meshStandardMaterial map={texture} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, -1.02, 0.18]} rotation={[1.15, 0, 0]}>
        <boxGeometry args={[1.2, 0.42, 0.05]} />
        <meshStandardMaterial color="#d8c9a6" roughness={0.7} />
      </mesh>
    </group>
  );
}
