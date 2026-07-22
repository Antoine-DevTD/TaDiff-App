"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const layerStyles = [
  { color: "#1d1d1f", depth: 72, z: 0, metalness: 0.34, roughness: 0.3 },
  { color: "#ffffff", depth: 34, z: 80, metalness: 0.08, roughness: 0.24 },
  { color: "#087fe8", depth: 34, z: 122, metalness: 0.22, roughness: 0.22 },
] as const;

export function WilliamStage({
  activeStep,
  busy,
}: {
  activeStep: number;
  busy: boolean;
}) {
  return (
    <div
      className="relative h-[280px] w-full overflow-hidden lg:h-[360px]"
      data-william-stage
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0.1, 6.4], fov: 39 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        dpr={[1, 1.8]}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.35} />
          <directionalLight color="#ffffff" intensity={3.2} position={[3.8, 4.8, 5]} />
          <directionalLight color="#7db9ff" intensity={1.8} position={[-4, 1, 3]} />
          <pointLight color="#f4b35d" intensity={4.5} position={[-2.8, -2.2, 2.5]} />
          <ExtrudedTadiffMark activeStep={activeStep} busy={busy} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-[22%] bottom-8 h-8 rounded-[50%] bg-ink/10 blur-2xl" />
    </div>
  );
}

function ExtrudedTadiffMark({ activeStep, busy }: { activeStep: number; busy: boolean }) {
  const svg = useLoader(SVGLoader, "/icons/tadiff-mark.svg");
  const rig = useRef<Group>(null);
  const [reduceMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const layers = useMemo(() => svg.paths.flatMap((path, pathIndex) =>
    SVGLoader.createShapes(path).map((shape, shapeIndex) => ({
      id: `${pathIndex}-${shapeIndex}`,
      pathIndex,
      shape,
    }))), [svg]);

  useFrame(({ clock }) => {
    if (!rig.current || reduceMotion) return;
    const elapsed = clock.getElapsedTime();
    const pulse = busy ? 1 + Math.sin(elapsed * 2.4) * 0.025 : 1;
    rig.current.position.y = 0.15 + Math.sin(elapsed * 0.72) * 0.07;
    rig.current.rotation.x = -0.08 + Math.sin(elapsed * 0.35) * 0.025;
    rig.current.rotation.y = -0.18 + Math.sin(elapsed * 0.42 + activeStep * 0.16) * 0.16;
    rig.current.rotation.z = Math.sin(elapsed * 0.3) * 0.025;
    rig.current.scale.setScalar(pulse);
  });

  return (
    <group ref={rig} position={[0, 0.15, 0]} rotation={[-0.08, -0.18, 0]}>
      <group position={[-2.048, 2.048, -0.24]} scale={[0.004, -0.004, 0.004]}>
        {layers.map(({ id, pathIndex, shape }) => {
          const style = layerStyles[Math.min(pathIndex, layerStyles.length - 1)];
          return (
            <mesh key={id} position={[0, 0, style.z]} castShadow receiveShadow>
              <extrudeGeometry args={[shape, {
                bevelEnabled: true,
                bevelSegments: 4,
                bevelSize: 9,
                bevelThickness: 9,
                curveSegments: 18,
                depth: style.depth,
                steps: 1,
              }]} />
              <meshStandardMaterial
                color={style.color}
                emissive={pathIndex === 2 ? "#035cad" : style.color}
                emissiveIntensity={pathIndex === 2 ? 0.16 : 0.02}
                metalness={style.metalness}
                roughness={style.roughness}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
