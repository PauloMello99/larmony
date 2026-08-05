/* eslint-disable react/no-unknown-property */
import * as React from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Center, Environment, Lightformer, useGLTF } from "@react-three/drei"
import { Bloom, EffectComposer } from "@react-three/postprocessing"
import * as THREE from "three"
import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion"

const MODEL_URL = "/models/orbiting_home.glb"

/**
 * Malha única com iluminação/emissão _baked_ (texturas Blender). `<Center>` normaliza
 * a origem; o grupo interno gira continuamente no eixo Y (respeitando
 * prefers-reduced-motion); o grupo externo posiciona/escala em função do viewport
 * (unidades de mundo no plano z=0) — assim a casa fica sempre grande e à direita da
 * section, com enquadramento estável em qualquer largura.
 */
function OrbitingHome({ reducedMotion }: { reducedMotion: boolean }) {
  const spin = React.useRef<THREE.Group>(null)
  const { scene } = useGLTF(MODEL_URL)
  const viewport = useThree((state) => state.viewport)

  // bbox nativa ~0.2 un → escala ~0.55 da altura visível; centro à direita (~78% da
  // largura) para não sobrepor o texto (alinhado à esquerda) mesmo no limite de lg.
  const scale = viewport.height * 3.0
  const position: [number, number, number] = [
    viewport.width * 0.28,
    -viewport.height * 0.03,
    0,
  ]

  React.useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as THREE.MeshStandardMaterial
      if (material?.emissiveMap) {
        material.emissive = new THREE.Color(0xffffff)
        material.emissiveIntensity = 1.0
        material.needsUpdate = true
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    if (!spin.current || reducedMotion) return
    spin.current.rotation.y += delta * 0.4
  })

  return (
    <group position={position} scale={scale} rotation={[0.4, 0, 0]}>
      <group ref={spin}>
        <Center>
          <primitive object={scene} />
        </Center>
      </group>
    </group>
  )
}

export default function HeroModelScene() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, toneMappingExposure: 0.85 }}
      camera={{ position: [0, 0.8, 5.5], fov: 38 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={0.7} />

      <React.Suspense fallback={null}>
        <OrbitingHome reducedMotion={reducedMotion} />
        {/* Ambiente em memória (sem HDRI via CDN) para reflexos nas partes metálicas. */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={1} position={[0, 3, 2]} scale={6} />
          <Lightformer form="rect" intensity={0.5} position={[-4, 1, 2]} scale={4} />
        </Environment>
      </React.Suspense>

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.7} intensity={0.5} />
      </EffectComposer>
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
