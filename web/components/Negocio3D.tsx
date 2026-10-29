"use client";

import { ACCENT_HEX, BODY_COLORS } from "@/lib/catalog";
import type { AccentColor, BodyColor } from "@/lib/types";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useState } from "react";
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
        Arrastra para girar · el logo va en el círculo de arriba
      </p>
    </div>
  );
}

function Piece({ bodyColor, accentColor, logoDataUrl }: Props) {
  const gltf = useGLTF(MODEL, true);
  const bodyHex = BODY_COLORS.find((c) => c.id === bodyColor)?.hex ?? "#141416";
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.blanco;
  const placeholder = usePlaceholderTexture();

  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);

    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const name = `${mesh.name} ${mesh.parent?.name ?? ""}`.toLowerCase();
      const matSrc = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = (matSrc as THREE.MeshStandardMaterial).clone();

      if (name.includes("logo_pad")) {
        ensureCircleUv(mesh.geometry);
        std.color = new THREE.Color("#ffffff");
        std.map = placeholder;
        std.metalness = 0.02;
        std.roughness = 0.65;
        std.needsUpdate = true;
        mesh.material = std;
        mesh.renderOrder = 5;
        return;
      }

      const accentMat = name.includes("blanco");
      std.color = new THREE.Color(accentMat ? accentHex : bodyHex);
      std.map = null;
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
    clone.scale.setScalar(0.22 / maxDim);
    return clone;
  }, [gltf.scene, bodyHex, accentHex, placeholder]);

  return (
    <group>
      <primitive object={scene} />
      {logoDataUrl ? (
        <Suspense fallback={null}>
          <ApplyLogo scene={scene} url={logoDataUrl} />
        </Suspense>
      ) : (
        <ApplyMap scene={scene} map={placeholder} />
      )}
    </group>
  );
}

function ApplyLogo({ scene, url }: { scene: THREE.Object3D; url: string }) {
  const loaded = useLoader(THREE.TextureLoader, url);
  const map = useMemo(() => {
    const t = loaded.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.flipY = true;
    t.needsUpdate = true;
    return t;
  }, [loaded]);
  return <ApplyMap scene={scene} map={map} />;
}

function ApplyMap({ scene, map }: { scene: THREE.Object3D; map: THREE.Texture }) {
  useLayoutEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = `${mesh.name} ${mesh.parent?.name ?? ""}`.toLowerCase();
      if (!name.includes("logo_pad")) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.map = map;
      mat.color = new THREE.Color("#ffffff");
      mat.needsUpdate = true;
    });
  }, [scene, map]);
  return null;
}

function ensureCircleUv(geometry: THREE.BufferGeometry) {
  if (geometry.getAttribute("uv")) return;
  const pos = geometry.getAttribute("position");
  const uvs = new Float32Array(pos.count * 2);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minX = Math.min(minX, pos.getX(i));
    maxX = Math.max(maxX, pos.getX(i));
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
  }
  const sx = maxX - minX || 1;
  const sy = maxY - minY || 1;
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) - minX) / sx;
    uvs[i * 2 + 1] = (pos.getY(i) - minY) / sy;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
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
    g.lineWidth = 8;
    g.beginPath();
    g.arc(256, 256, 230, 0, Math.PI * 2);
    g.stroke();
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
