import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import Mountain from './scene/Mountain.jsx'
import './App.css'

function App() {
  return (
    <main className="app">
      {/* The 3D world fills the screen; the HTML overlay sits on top of it. */}
      <Canvas className="scene" camera={{ position: [24, 10, 24], fov: 40 }}>
        <color attach="background" args={['#1a2039']} />
        <fog attach="fog" args={['#1a2039', 30, 70]} />

        {/* Sky light from above, a cool bounce from the snow below. */}
        <hemisphereLight args={['#c9d4ff', '#2a3158', 0.9]} />
        {/* The low sun, warm and pink, makes the alpenglow. */}
        <directionalLight position={[-10, 6, 4]} intensity={2.2} color="#ffc2d4" />

        <Mountain />

        <CameraControls
          minDistance={10}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2.15}
        />
      </Canvas>

      <header className="overlay">
        <h1>Fraser Muller</h1>
        <p>Developer. Drag to look around the mountain.</p>
      </header>
    </main>
  )
}

export default App
