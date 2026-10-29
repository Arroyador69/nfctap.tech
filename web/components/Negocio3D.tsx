"use client";

/**
 * Visor 3D /negocio.
 * GLB sin sello Markos + nodo `logo_pad`. El logo subido va en un disco
 * alineado al asiento (círculo con UVs correctas, no Decal).
 */

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

const MODEL = "/models/negocio.glb?v=2";
useGLTF.preload(MODEL, true);

/** Coords de `disenos/generar_negocio_web.py` → negocio-seal.json */
const SEAL = { x: 0, y: 0.142946, z: -0.062308, r: 0.02784 };

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
        camera={{ position: [0.02, 0.1, 0.42], fov: 32 }}
        gl={{ antialias: true }}
        dpr={[1, 1.75]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#f3eee4"]} />
        <ambientLight intensity={1.25} />
        <spotLight position={[1.8, 3.2, 2.4]} intensity={1.35} angle={0.45} penumbra={0.9} />
        <directionalLight position={[-1.2, 2.2, 2.4]} intensity={0.7} />
        <directionalLight position={[0.4, 1.2, 2.8]} intensity={0.55} />
        <Suspense fallback={null}>
          <Piece bodyColor={bodyColor} accentColor={accentColor} logoDataUrl={logoDataUrl} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          autoRotate
          autoRotateSpeed={0.35}
          minDistance={0.26}
          maxDistance={1.0}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2 + 0.02}
          target={[0, 0.04, 0]}
        />
        <ContactShadows position={[0, -0.02, 0]} opacity={0.22} scale={0.9} blur={2.4} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-[#8a8173]">
        Arrastra para girar · tu logo en el círculo
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
    let seat = { ...SEAL };

    clone.updateMatrixWorld(true);

    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const matSrc = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = (matSrc as THREE.MeshStandardMaterial).clone();
      const key = `${mesh.name} ${mesh.parent?.name ?? ""} ${std.name}`.toLowerCase();

      if (mesh.name === "logo_pad" || key.includes("logo_pad")) {
        // Medir asiento real del GLB
        const bb = new THREE.Box3().setFromObject(mesh);
        const c = new THREE.Vector3();
        const s = new THREE.Vector3();
        bb.getCenter(c);
        bb.getSize(s);
        clone.worldToLocal(c);
        seat = {
          x: c.x,
          y: c.y,
          z: c.z,
          r: Math.max(s.x, s.y) * 0.5 * 0.98,
        };
        // Base negra bajo el logo (tapa cualquier resto)
        std.map = null;
        std.color = new THREE.Color("#111113");
        std.metalness = 0.02;
        std.roughness = 0.85;
        mesh.material = std;
        return;
      }

      const accentMat = key.includes("blanco");
      std.color = new THREE.Color(accentMat ? accentHex : bodyHex);
      std.map = null;
      std.metalness = 0.04;
      std.roughness = 0.7;
      mesh.material = std;
    });

    // Disco logo (CircleGeometry = UVs limpios). Cara del bloque ≈ +Z.
    const logoMat = new THREE.MeshStandardMaterial({
      color: logoTex ? "#ffffff" : "#111113",
      map: logoTex ?? null,
      roughness: 0.72,
      metalness: 0.02,
      transparent: Boolean(logoTex),
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const logoDisc = new THREE.Mesh(new THREE.CircleGeometry(Math.max(seat.r, 0.02), 64), logoMat);
    logoDisc.position.set(seat.x, seat.y, seat.z + 0.0012);
    logoDisc.renderOrder = 2;
    clone.add(logoDisc);

    wrap.add(clone);
    const box = new THREE.Box3().setFromObject(wrap);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    wrap.position.sub(center);
    wrap.scale.setScalar(0.22 / (Math.max(size.x, size.y, size.z) || 1));
    return wrap;
  }, [gltf.scene, bodyHex, accentHex, logoTex, logoReady]); // eslint-disable-line react-hooks/exhaustive-deps -- logoReady rearma al cargar textura

  return <primitive object={root} />;
}
