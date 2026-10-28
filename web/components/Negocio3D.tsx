"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";

const MODEL = "/models/markos-negocio.glb";
useGLTF.preload(MODEL, true);

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
        camera={{ position: [0.32, 0.2, 0.52], fov: 32 }}
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
          autoRotateSpeed={0.45}
          rotateSpeed={0.65}
          zoomSpeed={0.65}
          minDistance={0.28}
          maxDistance={1.1}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2 + 0.15}
          target={[0, 0.02, 0]}
        />
        <ContactShadows position={[0, -0.02, 0]} opacity={0.22} scale={0.9} blur={2.4} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-[#8a8173]">
        Arrastra para girar · el logo va en el círculo de arriba
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

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 0.22 / maxDim;
    clone.scale.setScalar(s);

    const halfY = (size.y * s) / 2;
    const halfZ = (size.z * s) / 2;
    const halfX = (size.x * s) / 2;
    const radius = Math.min(halfX, halfY) * 0.42;

    return {
      scene: clone,
      badge: {
        position: [0, halfY * 0.78, halfZ + 0.0018] as [number, number, number],
        radius,
      },
    };
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
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.0005]} renderOrder={2}>
        <circleGeometry args={[radius * 1.12, 64]} />
        <meshStandardMaterial color="#0e0e10" roughness={0.85} metalness={0.02} depthWrite />
      </mesh>
      <mesh position={[0, 0, -0.0002]} renderOrder={3}>
        <ringGeometry args={[radius * 0.94, radius * 1.1, 64]} />
        <meshStandardMaterial color={rimHex} roughness={0.55} metalness={0.05} />
      </mesh>
      <Suspense fallback={<PlaceholderDisc radius={radius * 0.94} />}>
        {logoDataUrl ? (
          <LogoDisc url={logoDataUrl} radius={radius * 0.94} />
        ) : (
          <PlaceholderDisc radius={radius * 0.94} />
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
    <mesh position={[0, 0, 0]} renderOrder={4}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={map} roughness={0.62} metalness={0.02} />
    </mesh>
  );
}

function PlaceholderDisc({ radius }: { radius: number }) {
  const map = usePlaceholderTexture();
  return (
    <mesh position={[0, 0, 0]} renderOrder={4}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={map} roughness={0.75} metalness={0.02} />
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
    g.font = "600 42px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Tu logo", 256, 240);
    g.font = "28px Georgia, serif";
    g.fillStyle = "#8a8173";
    g.fillText("súbelo aquí", 256, 295);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return tex;
}
