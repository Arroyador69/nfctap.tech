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
      className={
        compact
          ? "h-[220px] w-full sm:h-[320px] lg:h-[520px]"
          : "h-[280px] w-full sm:h-[460px] lg:h-[560px]"
      }
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0.35, 0.12, 2.55], fov: 32 }}
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
          minPolarAngle={Math.PI / 2 - 0.18}
          maxPolarAngle={Math.PI / 2 + 0.08}
          minAzimuthAngle={-0.35}
          maxAzimuthAngle={0.35}
          target={[0, -0.08, 0]}
        />
        <ContactShadows position={[0, -1.08, 0]} opacity={0.18} scale={3.8} blur={2.8} />
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
    <group rotation={[0.04, 0.18, 0]} position={[0, 0.04, 0]}>
      <mesh castShadow material={[edge, edge, edge, edge, front, edge]} position={[0, 0.06, 0]}>
        <boxGeometry args={[1.08, 1.62, 0.09]} />
      </mesh>
      <mesh castShadow material={edge} position={[0, -0.82, 0.22]}>
        <boxGeometry args={[1.22, 0.12, 0.72]} />
      </mesh>
    </group>
  );
}
