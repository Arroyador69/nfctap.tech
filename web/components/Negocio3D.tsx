"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

const MODEL = "/models/markos-negocio.glb";
/** Draco CDN (mismo patrón que drei). */
useGLTF.preload(MODEL, true);

type Props = {
  bodyColor: BodyColor;
  accentColor: AccentColor;
};

export function Negocio3D({ bodyColor, accentColor }: Props) {
  return (
    <div
      className="relative h-[340px] w-full overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4] sm:h-[420px] lg:h-[480px]"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0.35, 0.22, 0.55], fov: 32 }}
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
          <Piece bodyColor={bodyColor} accentColor={accentColor} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          autoRotate
          autoRotateSpeed={0.55}
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
        Arrastra para girar · verás la aleta detrás
      </p>
    </div>
  );
}

function Piece({ bodyColor, accentColor }: Props) {
  const gltf = useGLTF(MODEL, true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;

  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const matSrc = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = (matSrc as THREE.MeshStandardMaterial).clone();
      const key = `${mesh.name} ${mesh.parent?.name ?? ""} ${std.name}`.toLowerCase();
      const isAccent = /blanco|acento|accent|white/.test(key) && !/negro|black|cuerpo|body/.test(key);
      // Materials in GLB: "negro" (cuerpo+aleta) · "blanco" (logos / nfctap / relieve)
      const accentMat = key.includes("blanco") || isAccent;
      std.color = new THREE.Color(accentMat ? accentHex : bodyHex);
      std.metalness = 0.04;
      std.roughness = 0.7;
      mesh.material = std;
    });
    // Centrar y orientar (cara al frente)
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 0.22 / maxDim;
    clone.scale.setScalar(s);
    return clone;
  }, [gltf.scene, bodyHex, accentHex]);

  return <primitive object={scene} />;
}
