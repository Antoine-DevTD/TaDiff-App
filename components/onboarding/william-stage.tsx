"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { Shape, type Group } from "three";

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
        camera={{ position: [0, 0.1, 6.8], fov: 42 }}
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
  const rig = useRef<Group>(null);
  const [reduceMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const feather = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0.2, -1.2);
    shape.bezierCurveTo(1.05, -0.75, 1.58, 0.02, 1.78, 1.3);
    shape.bezierCurveTo(1.12, 0.68, 0.58, 0.38, -0.02, 0.28);
    shape.bezierCurveTo(0.38, -0.18, 0.5, -0.75, 0.2, -1.2);
    return shape;
  }, []);

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
      <group position={[-0.25, 0, 0]}>
        <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.5, 0.38]} />
          <meshStandardMaterial color="#1d1d1f" metalness={0.28} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.64, 2.08, 0.38]} />
          <meshStandardMaterial color="#1d1d1f" metalness={0.28} roughness={0.3} />
        </mesh>
        <mesh position={[0.48, -0.14, 0.24]} castShadow receiveShadow>
          <extrudeGeometry args={[feather, {
            bevelEnabled: true,
            bevelSegments: 5,
            bevelSize: 0.06,
            bevelThickness: 0.06,
            curveSegments: 24,
            depth: 0.24,
            steps: 1,
          }]} />
          <meshStandardMaterial
            color="#087fe8"
            emissive="#035cad"
            emissiveIntensity={0.16}
            metalness={0.2}
            roughness={0.24}
          />
        </mesh>
      </group>
    </group>
  );
}
