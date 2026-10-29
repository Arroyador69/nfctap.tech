"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";

/** Cache-bust tras cada arreglo del logo. */
const MODEL = "/models/markos-negocio.glb?v=5";
useGLTF.preload(MODEL, true);

/**
 * Sello Markos en espacio del GLB (metros).
 * El cover se añade como HIJO del modelo (mismas coords) y luego se centra/escala juntos.
 */
const SEAL = { x: 0, y: 0.152, z: -0.0592, r: 0.023 };

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
        Arrastra para girar · sube tu logo al círculo
      </p>
    </div>
  );
}

function Piece({ bodyColor, accentColor, logoDataUrl }: Props) {
  const gltf = useGLTF(MODEL, true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;
  const placeholder = usePlaceholderTexture();

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

    // Tapa del sello Markos + superficie de logo (espacio MODELO, hijo del clone)
    const pad = buildLogoPad(placeholder, accentHex);
    pad.name = "client_logo_pad";
    pad.position.set(SEAL.x, SEAL.y, SEAL.z);
    clone.add(pad);

    wrap.add(clone);

    const box = new THREE.Box3().setFromObject(wrap);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    wrap.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    wrap.scale.setScalar(0.22 / maxDim);
    return wrap;
  }, [gltf.scene, bodyHex, accentHex, placeholder]);

  return (
    <group>
      <primitive object={root} />
      {logoDataUrl ? (
        <Suspense fallback={null}>
          <BindLogo root={root} url={logoDataUrl} />
        </Suspense>
      ) : (
        <BindMap root={root} map={placeholder} />
      )}
    </group>
  );
}

function buildLogoPad(placeholder: THREE.Texture, rimHex: string) {
  const g = new THREE.Group();

  // Base opaca gruesa que tapa tijeras/tipografía Markos
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(SEAL.r * 1.08, SEAL.r * 1.08, 0.004, 64),
    new THREE.MeshStandardMaterial({
      color: "#0e0e10",
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  // Cylinder Y-up → rotar para que el eje mire a +Z (cara al cliente)
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.001;
  g.add(base);

  // Aro acento
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(SEAL.r * 0.92, SEAL.r * 1.06, 64),
    new THREE.MeshStandardMaterial({
      color: rimHex,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  rim.position.z = 0.0032;
  g.add(rim);

  // Cara del logo
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(SEAL.r * 0.92, 64),
    new THREE.MeshStandardMaterial({
      map: placeholder,
      color: "#ffffff",
      roughness: 0.62,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  face.name = "logo_face";
  face.position.z = 0.0034;
  g.add(face);

  return g;
}

function BindLogo({ root, url }: { root: THREE.Object3D; url: string }) {
  const loaded = useLoader(THREE.TextureLoader, url);
  const map = useMemo(() => {
    const t = loaded.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.flipY = true;
    t.needsUpdate = true;
    return t;
  }, [loaded]);
  return <BindMap root={root} map={map} />;
}

function BindMap({ root, map }: { root: THREE.Object3D; map: THREE.Texture }) {
  useLayoutEffect(() => {
    root.traverse((obj) => {
      if (obj.name !== "logo_face" || !(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.map = map;
      mat.color = new THREE.Color("#ffffff");
      mat.needsUpdate = true;
    });
  }, [root, map]);
  return null;
}

function usePlaceholderTexture() {
  const [tex] = useState(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#141416";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#f4f1ea";
    g.lineWidth = 10;
    g.beginPath();
    g.arc(256, 256, 220, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#f4f1ea";
    g.font = "600 44px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Tu logo", 256, 245);
    g.font = "28px Georgia, serif";
    g.fillStyle = "#8a8173";
    g.fillText("súbelo abajo", 256, 300);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  return tex;
}
