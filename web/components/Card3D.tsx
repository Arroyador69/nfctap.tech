"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import { ATRIL } from "@/lib/atril-geom";
import { buildAtrilMeshes, type Mesh } from "@/lib/atril-mesh";
import type { CardDesign } from "@/lib/types";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

const SCALE = 0.0132;

function toGeometry(mesh: Mesh) {
  const pos = new Float32Array(mesh.tris.length * 9);
  let i = 0;
  for (const [a, b, c] of mesh.tris) {
    pos[i++] = a[0];
    pos[i++] = a[1];
    pos[i++] = a[2];
    pos[i++] = b[0];
    pos[i++] = b[1];
    pos[i++] = b[2];
    pos[i++] = c[0];
    pos[i++] = c[1];
    pos[i++] = c[2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function shade(hex: string, amount: number) {
  const n = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

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
        camera={{ position: [0.42, 0.28, 2.35], fov: 32 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={0.85} />
        <spotLight position={[2.4, 4.2, 4.2]} intensity={1.2} angle={0.5} penumbra={0.8} />
        <directionalLight position={[-2.2, 2.4, 2.8]} intensity={0.35} />
        <directionalLight position={[0.2, 1.6, 3.2]} intensity={0.45} />
        <Atril design={design} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={false}
          rotateSpeed={0.45}
          minPolarAngle={Math.PI / 2 - 0.55}
          maxPolarAngle={Math.PI / 2 + 0.12}
          minAzimuthAngle={-0.7}
          maxAzimuthAngle={0.7}
          target={[0, -0.02, 0.18]}
        />
        <ContactShadows position={[0, -0.86, 0.22]} opacity={0.2} scale={3.6} blur={2.6} />
      </Canvas>
    </div>
  );
}

function Atril({ design }: { design: CardDesign }) {
  const bodyHex = BODY_COLORS.find((c) => c.id === design.bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[design.accentColor] ?? ACCENT_HEX.amarillo;
  const wellHex = shade(bodyHex, design.bodyColor === "blanco" ? -28 : 18);

  const meshes = useMemo(
    () =>
      buildAtrilMeshes({
        kind: design.kind === "personalizada" ? "personalizada" : "generica",
        logoMask: design.logoMask,
        line1: design.line1,
      }),
    [design.kind, design.logoMask, design.line1],
  );

  const bodyGeo = useMemo(() => toGeometry(meshes.cuerpo), [meshes]);
  const accentGeo = useMemo(() => toGeometry(meshes.acento), [meshes]);

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.78, metalness: 0.03 }),
    [bodyHex],
  );
  const accentMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.48, metalness: 0.08 }),
    [accentHex],
  );
  const wellMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: wellHex, roughness: 0.9, metalness: 0 }),
    [wellHex],
  );

  return (
    <group scale={SCALE} position={[0, -0.78, -0.12]} rotation={[0.06, 0.2, 0]}>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow />
      <mesh geometry={accentGeo} material={accentMat} castShadow />
      <mesh position={[0, ATRIL.NFC_Y, ATRIL.Z_FLOOR + 0.04]} material={wellMat}>
        <circleGeometry args={[ATRIL.SEAT_D / 2 - 0.15, 48]} />
      </mesh>
    </group>
  );
}
