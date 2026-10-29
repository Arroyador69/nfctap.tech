"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";

const MODEL = "/models/markos-negocio.glb";
useGLTF.preload(MODEL, true);

/**
 * Sello circular en el GLB (metros, espacio modelo sin transformar).
 * Cara del logo ≈ plano XY en z≈-0.061 · centro (0, 0.152).
 */
const SEAL = { x: 0, y: 0.152, z: -0.0608, r: 0.0215 };

type Props = {
  bodyColor: BodyColor;
  accentColor: AccentColor;
  logoDataUrl?: string;
};

export function Negocio3D({ bodyColor, accentColor, logoDataUrl = "" }: Props) {
  return (
    <div
      className="relative h-[340px] w-full overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4] sm:h-[420px] lg:h-[480px]"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0.28, 0.16, 0.48], fov: 30 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={1.05} />
        <spotLight position={[1.8, 3.2, 2.4]} intensity={1.15} angle={0.45} penumbra={0.9} />
        <directionalLight position={[-1.6, 2.0, 1.8]} intensity={0.45} />
        <directionalLight position={[0.4, 1.0, 2.2]} intensity={0.35} />
        <Suspense fallback={null}>
          <Piece bodyColor={bodyColor} accentColor={accentColor} logoDataUrl={logoDataUrl} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          autoRotate={!logoDataUrl}
          autoRotateSpeed={0.4}
          rotateSpeed={0.65}
          zoomSpeed={0.65}
          minDistance={0.26}
          maxDistance={1.0}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2 + 0.05}
          target={[0, 0.03, 0]}
        />
        <ContactShadows position={[0, -0.02, 0]} opacity={0.22} scale={0.9} blur={2.4} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-[#8a8173]">
        Arrastra para girar · sube el logo al círculo de arriba
      </p>
    </div>
  );
}

function Piece({ bodyColor, accentColor, logoDataUrl }: Props) {
  const gltf = useGLTF(MODEL, true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;

  const { scene, badge } = useMemo(() => {
    const clone = gltf.scene.clone(true);

    // Bounds ANTES de mover (espacio modelo)
    const rawBox = new THREE.Box3().setFromObject(clone);
    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const matSrc = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = (matSrc as THREE.MeshStandardMaterial).clone();
      const key = `${mesh.name} ${mesh.parent?.name ?? ""} ${std.name}`.toLowerCase();
      const accentMat = key.includes("blanco");
      std.color = new THREE.Color(accentMat ? accentHex : bodyHex);
      std.metalness = 0.04;
      std.roughness = 0.7;
      mesh.material = std;
    });

    clone.position.sub(rawCenter);
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
    const s = 0.22 / maxDim;
    clone.scale.setScalar(s);

    // Misma transformación para el sello (hacia la cámara = +Z tras centrar)
    const badgePos: [number, number, number] = [
      (SEAL.x - rawCenter.x) * s,
      (SEAL.y - rawCenter.y) * s,
      (SEAL.z - rawCenter.z) * s + 0.0008,
    ];
    const radius = SEAL.r * s;

    return { scene: clone, badge: { position: badgePos, radius } };
  }, [gltf.scene, bodyHex, accentHex]);

  return (
    <group>
      <primitive object={scene} />
      <LogoBadge
        key={logoDataUrl || "empty"}
        position={badge.position}
        radius={badge.radius}
        logoDataUrl={logoDataUrl || ""}
        rimHex={accentHex}
      />
    </group>
  );
}

function LogoBadge({
  position,
  radius,
  logoDataUrl,
  rimHex,
}: {
  position: [number, number, number];
  radius: number;
  logoDataUrl: string;
  rimHex: string;
}) {
  // Disco en el plano del sello Markos (lo tapa por completo).
  const r = radius * 1.12;
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} renderOrder={10}>
        <circleGeometry args={[r, 64]} />
        <meshStandardMaterial
          color="#0e0e10"
          roughness={0.88}
          metalness={0.02}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>
      <mesh position={[0, 0, 0.00015]} renderOrder={11}>
        <ringGeometry args={[r * 0.9, r, 64]} />
        <meshStandardMaterial
          color={rimHex}
          roughness={0.55}
          metalness={0.04}
          polygonOffset
          polygonOffsetFactor={-5}
          polygonOffsetUnits={-5}
        />
      </mesh>
      <Suspense fallback={<PlaceholderDisc radius={r * 0.9} />}>
        {logoDataUrl ? (
          <LogoDisc url={logoDataUrl} radius={r * 0.9} />
        ) : (
          <PlaceholderDisc radius={r * 0.9} />
        )}
      </Suspense>
    </group>
  );
}

function LogoDisc({ url, radius }: { url: string; radius: number }) {
  const loaded = useLoader(THREE.TextureLoader, url);
  const map = useMemo(() => {
    const t = loaded.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [loaded]);
  return (
    <mesh position={[0, 0, 0.00025]} renderOrder={12}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial
        map={map}
        roughness={0.6}
        metalness={0.02}
        polygonOffset
        polygonOffsetFactor={-6}
        polygonOffsetUnits={-6}
      />
    </mesh>
  );
}

function PlaceholderDisc({ radius }: { radius: number }) {
  const map = usePlaceholderTexture();
  return (
    <mesh position={[0, 0, 0.00025]} renderOrder={12}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial
        map={map}
        roughness={0.75}
        metalness={0.02}
        polygonOffset
        polygonOffsetFactor={-6}
        polygonOffsetUnits={-6}
      />
    </mesh>
  );
}

function usePlaceholderTexture() {
  const [tex] = useState(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#141416";
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#f4f1ea";
    g.font = "600 40px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Tu logo", 256, 248);
    g.font = "26px Georgia, serif";
    g.fillStyle = "#8a8173";
    g.fillText("súbelo abajo", 256, 300);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return tex;
}
