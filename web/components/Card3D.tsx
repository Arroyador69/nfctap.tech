"use client";

import { BODY_COLORS } from "@/lib/catalog";
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
        camera={{ position: [0, 0.02, 2.35], fov: 32 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={0.9} />
        <spotLight position={[3, 5, 5]} intensity={1.15} angle={0.45} penumbra={0.85} />
        <directionalLight position={[-2, 2, 3]} intensity={0.3} />
        <Plaque design={design} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={false}
          rotateSpeed={0.4}
          minPolarAngle={Math.PI / 2 - 0.1}
          maxPolarAngle={Math.PI / 2 + 0.05}
          minAzimuthAngle={-0.2}
          maxAzimuthAngle={0.2}
          target={[0, 0, 0]}
        />
        <ContactShadows position={[0, -0.96, 0]} opacity={0.16} scale={3.6} blur={2.8} />
      </Canvas>
    </div>
  );
}

function Plaque({ design }: { design: CardDesign }) {
  const bodyHex = BODY_COLORS.find((c) => c.id === design.bodyColor)?.hex ?? "#141416";

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

  const edge = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.72, metalness: 0.04 }),
    [bodyHex],
  );
  const front = useMemo(
    () => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.05 }),
    [texture],
  );

  return (
    <group rotation={[0.035, 0, 0]}>
      <mesh castShadow material={[edge, edge, edge, edge, front, edge]}>
        <boxGeometry args={[1.12, 1.78, 0.058]} />
      </mesh>
    </group>
  );
}
