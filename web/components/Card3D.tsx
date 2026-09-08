"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import { ATRIL } from "@/lib/atril-geom";
import { buildAtrilMeshes, type Mesh } from "@/lib/atril-mesh";
import { paintAccentLogo } from "@/lib/logo";
import type { CardDesign } from "@/lib/types";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

const SCALE = 0.01;

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

export function Card3D({ design, compact = false }: { design: CardDesign; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "h-[240px] w-full sm:h-[360px] lg:h-[560px]"
          : "h-[320px] w-full sm:h-[500px] lg:h-[600px]"
      }
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0.18, 0.02, 3.55], fov: 28 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={0.9} />
        <spotLight position={[2.8, 4.6, 5]} intensity={1.15} angle={0.5} penumbra={0.85} />
        <directionalLight position={[-2.4, 2.6, 3.2]} intensity={0.35} />
        <directionalLight position={[0.4, 1.4, 3.6]} intensity={0.4} />
        <Atril design={design} />
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          autoRotate={false}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
          panSpeed={0.45}
          minDistance={2.4}
          maxDistance={7.5}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI - 0.2}
          target={[0, -0.04, 0.04]}
        />
        <ContactShadows position={[0, -0.72, 0.12]} opacity={0.18} scale={4.2} blur={2.8} />
      </Canvas>
    </div>
  );
}

function Atril({ design }: { design: CardDesign }) {
  const bodyHex = BODY_COLORS.find((c) => c.id === design.bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[design.accentColor] ?? ACCENT_HEX.amarillo;
  const personalized = design.kind !== "generica";

  const meshes = useMemo(
    () =>
      buildAtrilMeshes({
        kind: personalized ? "personalizada" : "generica",
        logoMask: undefined,
        line1: design.line1,
        shopView: true,
      }),
    [personalized, design.line1],
  );

  const bodyGeo = useMemo(() => toGeometry(meshes.cuerpo), [meshes]);
  const accentGeo = useMemo(() => toGeometry(meshes.acento), [meshes]);

  useEffect(() => {
    return () => {
      bodyGeo.dispose();
      accentGeo.dispose();
    };
  }, [bodyGeo, accentGeo]);

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.78, metalness: 0.03 }),
    [bodyHex],
  );
  const accentMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.48, metalness: 0.08 }),
    [accentHex],
  );

  return (
    <group scale={SCALE} position={[0, -0.62, -0.18]} rotation={[0.02, 0.06, 0]}>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow />
      <mesh geometry={accentGeo} material={accentMat} castShadow />
      {personalized && design.logoDataUrl ? (
        <LogoPlate dataUrl={design.logoDataUrl} accent={accentHex} />
      ) : null}
    </group>
  );
}

function LogoPlate({ dataUrl, accent }: { dataUrl: string; accent: string }) {
  const [map, setMap] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let dead = false;
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      const canvas = paintAccentLogo(img, 512, accent);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      setMap(tex);
    };
    img.onerror = () => {
      if (!dead) setMap(null);
    };
    img.src = dataUrl;
    return () => {
      dead = true;
    };
  }, [dataUrl, accent]);

  useEffect(() => {
    return () => {
      map?.dispose();
    };
  }, [map]);

  if (!map) return null;

  const size = ATRIL.MARK_R * 2;
  const z = ATRIL.FACE_T + ATRIL.RELIEF + 0.12;

  return (
    <mesh position={[0, ATRIL.MARK_Y, z]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={map}
        transparent
        roughness={0.5}
        metalness={0.06}
        depthWrite={false}
      />
    </mesh>
  );
}
