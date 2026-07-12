"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group, Mesh } from "three";

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
        camera={{ position: [0, 0.25, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.8]}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.15} />
          <directionalLight color="#f8fbff" intensity={2.25} position={[3.5, 4, 4]} />
          <pointLight color="#f4b35d" intensity={8} position={[-3.5, -1.2, 3]} />
          <WilliamRig activeStep={activeStep} busy={busy} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-10 bottom-7 h-10 rounded-[50%] bg-accent/10 blur-2xl" />
    </div>
  );
}

function WilliamRig({ activeStep, busy }: { activeStep: number; busy: boolean }) {
  const rig = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const halo = useRef<Group>(null);
  const cue = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const pace = busy ? 1.45 : 0.8;

    if (rig.current) {
      rig.current.rotation.y = Math.sin(elapsed * 0.25) * 0.22;
      rig.current.position.y = Math.sin(elapsed * 0.9) * 0.08;
    }

    if (core.current) {
      const pulse = 1 + Math.sin(elapsed * 2.1 * pace) * 0.045;
      core.current.scale.setScalar(pulse);
    }

    if (halo.current) {
      halo.current.rotation.x = elapsed * 0.22 + activeStep * 0.08;
      halo.current.rotation.y = elapsed * 0.42;
      halo.current.rotation.z = elapsed * 0.18;
    }

    if (cue.current) {
      cue.current.rotation.z = elapsed * 0.75;
    }
  });

  return (
    <group ref={rig} position={[0, -0.2, 0]}>
      <mesh ref={cue} position={[0, -1.65, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.95, 0.018, 16, 128]} />
        <meshStandardMaterial color="#f4b35d" emissive="#f4b35d" emissiveIntensity={0.22} />
      </mesh>

      <group ref={halo}>
        <mesh rotation={[Math.PI / 2.7, 0, 0]}>
          <torusGeometry args={[1.44, 0.025, 16, 128]} />
          <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.22} />
        </mesh>
        <mesh rotation={[0.7, 0.1, Math.PI / 2.4]}>
          <torusGeometry args={[1.72, 0.018, 16, 128]} />
          <meshStandardMaterial color="#64748b" metalness={0.25} roughness={0.28} />
        </mesh>
        <mesh rotation={[1.18, Math.PI / 2, 0.3]}>
          <torusGeometry args={[1.14, 0.016, 16, 128]} />
          <meshStandardMaterial color="#f2a0b8" emissive="#f2a0b8" emissiveIntensity={0.18} />
        </mesh>
      </group>

      <mesh ref={core}>
        <sphereGeometry args={[0.82, 64, 64]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={busy ? 0.55 : 0.32}
          metalness={0.18}
          roughness={0.34}
        />
      </mesh>

      <mesh position={[-0.28, 0.14, 0.72]}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.28, 0.14, 0.72]}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, -0.1, 0.77]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.18, 0.012, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
