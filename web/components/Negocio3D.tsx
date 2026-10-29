"use client";

/**
 * Visor 3D completo: pieza + logo en el sello (sin círculo blanco).
 * Disco negro tapa Markos; el logo del cliente va encima, clip circular.
 */

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

const MODEL = "/models/markos-negocio.glb?v=7";
useGLTF.preload(MODEL, true);

/** Sello en espacio modelo (hijo del GLB). */
const SEAL = { x: 0, y: 0.152, z: -0.0592, r: 0.023 };

type Props = {
  bodyColor: BodyColor;
  accentColor: AccentColor;
  logoDataUrl?: string;
};

export function Negocio3D({ bodyColor, accentColor, logoDataUrl = "" }: Props) {
  return (
    <div
      className="relative h-[380px] w-full overflow-hidden rounded-[24px] border border-[#e6ddd0] bg-[#f3eee4] sm:h-[480px] lg:h-[560px]"
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
          <Piece bodyColor={bodyColor} accentColor={accentColor} logoDataUrl={logoDataUrl} />
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
        Arrastra para girar · aleta y volumen
      </p>
    </div>
  );
}

function Piece({ bodyColor, accentColor, logoDataUrl }: Props) {
  const gltf = useGLTF(MODEL, true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;
  const [logoReady, setLogoReady] = useState(0);
  const logoTex = useMemo(() => {
    if (!logoDataUrl) return null;
    const tex = new THREE.TextureLoader().load(logoDataUrl, () => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      setLogoReady((n) => n + 1);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [logoDataUrl]);

  useEffect(() => {
    return () => {
      logoTex?.dispose();
    };
  }, [logoTex]);

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

    // Disco negro (tapa Markos) — sin círculo blanco
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(SEAL.r * 1.08, 64),
      new THREE.MeshStandardMaterial({
        color: "#111113",
        roughness: 0.85,
        metalness: 0.02,
      }),
    );
    cap.position.set(SEAL.x, SEAL.y, SEAL.z + 0.0018);
    clone.add(cap);

    // Anillo fino de acento (borde de pieza, no disco blanco)
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(SEAL.r * 1.0, SEAL.r * 1.1, 64),
      new THREE.MeshStandardMaterial({
        color: accentHex,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    rim.position.set(SEAL.x, SEAL.y, SEAL.z + 0.0022);
    clone.add(rim);

    if (logoTex) {
      const logo = new THREE.Mesh(
        new THREE.CircleGeometry(SEAL.r * 0.94, 64),
        new THREE.MeshStandardMaterial({
          map: logoTex,
          roughness: 0.75,
          metalness: 0.02,
          transparent: true,
        }),
      );
      logo.position.set(SEAL.x, SEAL.y, SEAL.z + 0.0026);
      clone.add(logo);
    }

    wrap.add(clone);
    const box = new THREE.Box3().setFromObject(wrap);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    wrap.position.sub(center);
    wrap.scale.setScalar(0.22 / (Math.max(size.x, size.y, size.z) || 1));
    return wrap;
    // logoReady: rearmar cuando la textura termina de cargar
  }, [gltf.scene, bodyHex, accentHex, logoTex, logoReady]);

  return <primitive object={root} />;
}
