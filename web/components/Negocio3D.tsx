"use client";

/**
 * Visor 3D solo para volumen / aleta.
 * El logo del cliente va en NegocioMockup (canvas 2D): patrón estándar de
 * configuradores (más fiable que pelear coords del sello en el GLB).
 */

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

const MODEL = "/models/markos-negocio.glb?v=6";
useGLTF.preload(MODEL, true);

/** Tapa el sello Markos en espacio modelo (hijo del GLB). */
const SEAL = { x: 0, y: 0.152, z: -0.0592, r: 0.023 };

type Props = {
  bodyColor: BodyColor;
  accentColor: AccentColor;
};

export function Negocio3D({ bodyColor, accentColor }: Props) {
  return (
    <div
      className="relative h-[280px] w-full overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4] sm:h-[360px] lg:h-[420px]"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        camera={{ position: [0.28, 0.16, 0.48], fov: 30 }}
        gl={{ antialias: true }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={1.05} />
        <spotLight position={[1.8, 3.2, 2.4]} intensity={1.15} angle={0.45} penumbra={0.9} />
        <directionalLight position={[-1.6, 2.0, 1.8]} intensity={0.45} />
        <Suspense fallback={null}>
          <Piece bodyColor={bodyColor} accentColor={accentColor} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          autoRotate
          autoRotateSpeed={0.45}
          minDistance={0.26}
          maxDistance={1.0}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2 + 0.05}
          target={[0, 0.03, 0]}
        />
        <ContactShadows position={[0, -0.02, 0]} opacity={0.22} scale={0.9} blur={2.4} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-[#8a8173]">
        Arrastra · aleta y volumen · el logo se ve en el mockup de la izquierda
      </p>
    </div>
  );
}

function Piece({ bodyColor, accentColor }: Props) {
  const gltf = useGLTF(MODEL, true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;

  const root = useMemo(() => {
    const wrap = new THREE.Group();
    const clone = gltf.scene.clone(true);

    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const matSrc = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = (matSrc as THREE.MeshStandardMaterial).clone();
      const key = `${mesh.name} ${mesh.parent?.name ?? ""} ${std.name}`.toLowerCase();
      const accentMat = key.includes("blanco");
      std.color = new THREE.Color(accentMat ? accentHex : bodyHex);
      std.map = null;
      std.metalness = 0.04;
      std.roughness = 0.7;
      mesh.material = std;
    });

    // Círculo liso (sin Markos) — el logo real está en el mockup 2D
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(SEAL.r * 1.1, SEAL.r * 1.1, 0.005, 48),
      new THREE.MeshStandardMaterial({ color: "#111113", roughness: 0.85, metalness: 0.02 }),
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(SEAL.x, SEAL.y, SEAL.z + 0.0015);
    clone.add(cap);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(SEAL.r * 0.95, SEAL.r * 1.12, 48),
      new THREE.MeshStandardMaterial({
        color: accentHex,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    rim.position.set(SEAL.x, SEAL.y, SEAL.z + 0.004);
    clone.add(rim);

    wrap.add(clone);
    const box = new THREE.Box3().setFromObject(wrap);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    wrap.position.sub(center);
    wrap.scale.setScalar(0.22 / (Math.max(size.x, size.y, size.z) || 1));
    return wrap;
  }, [gltf.scene, bodyHex, accentHex]);

  return <primitive object={root} />;
}
