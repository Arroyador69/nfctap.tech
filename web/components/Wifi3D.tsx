"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

useGLTF.preload("/models/wifi-pared.glb");

type Props = {
  bodyColor: BodyColor;
  accentColor: AccentColor;
  compact?: boolean;
};

export function Wifi3D({ bodyColor, accentColor, compact = false }: Props) {
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
        camera={{ position: [0.22, 0.12, 2.15], fov: 28 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={0.95} />
        <spotLight position={[2.4, 4.2, 5]} intensity={1.1} angle={0.5} penumbra={0.85} />
        <directionalLight position={[-2.2, 2.4, 3]} intensity={0.4} />
        <directionalLight position={[0.6, 1.2, 3.4]} intensity={0.35} />
        <Plaque bodyColor={bodyColor} accentColor={accentColor} />
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          autoRotate={false}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
          panSpeed={0.45}
          minDistance={1.6}
          maxDistance={5.5}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI - 0.25}
          target={[0, 0, 0]}
        />
        <ContactShadows position={[0, -0.55, 0]} opacity={0.16} scale={3.6} blur={2.6} />
      </Canvas>
    </div>
  );
}

function Plaque({ bodyColor, accentColor }: { bodyColor: BodyColor; accentColor: AccentColor }) {
  const gltf = useGLTF("/models/wifi-pared.glb");
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = (mat as THREE.MeshStandardMaterial).clone();
      const key = `${mesh.name} ${mesh.parent?.name ?? ""} ${std.name}`;
      const accent = /acento/i.test(key);
      std.color = new THREE.Color(accent ? accentHex : bodyHex);
      std.metalness = 0.03;
      std.roughness = 0.72;
      mesh.material = std;
    });
    return clone;
  }, [gltf.scene, bodyHex, accentHex]);
  return <primitive object={scene} scale={10} />;
}
