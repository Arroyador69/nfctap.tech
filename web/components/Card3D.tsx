"use client";

import { CARD_H, CARD_W, drawCardFace } from "@/lib/draw-card";
import type { CardDesign } from "@/lib/types";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export function Card3D({ design, compact = false }: { design: CardDesign; compact?: boolean }) {
  return (
    <div
      className={compact ? "h-[300px] w-full sm:h-[360px] lg:h-[560px]" : "h-[360px] w-full sm:h-[520px] lg:h-[600px]"}
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0.85, 0.28, 2.85], fov: 34 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={0.85} />
        <spotLight position={[4, 6, 4]} intensity={1.4} angle={0.4} penumbra={0.8} />
        <directionalLight position={[-3, 2, 2]} intensity={0.35} />
        <Stand design={design} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.7}
          rotateSpeed={0.7}
          minPolarAngle={Math.PI / 2.55}
          maxPolarAngle={Math.PI / 2.05}
          minAzimuthAngle={-0.9}
          maxAzimuthAngle={0.9}
          target={[0, -0.05, 0]}
        />
        <ContactShadows position={[0, -1.18, 0]} opacity={0.28} scale={6} blur={2.4} />
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

    if (design.logoDataUrl && design.kind !== "generica") {
      const img = new Image();
      img.onload = () => apply(img);
      img.src = design.logoDataUrl;
    } else apply();
  }, [design, texture]);

  return (
    <group position={[0, -0.12, 0]} rotation={[0.1, 0.2, 0]}>
      <mesh position={[0, 0.08, 0]} rotation={[-0.06, 0, 0]} castShadow>
        <boxGeometry args={[1.12, 1.78, 0.058]} />
        <meshStandardMaterial map={texture} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.98, 0.2]} rotation={[1.08, 0, 0]}>
        <boxGeometry args={[1.16, 0.46, 0.055]} />
        <meshStandardMaterial color="#d8c9a6" roughness={0.7} />
      </mesh>
    </group>
  );
}
