import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'motion/react'
import Mountain from './scene/Mountain.jsx'
import Trees from './scene/Trees.jsx'
import Snow from './scene/Snow.jsx'
import CameraRig from './scene/CameraRig.jsx'
import Atmosphere from './scene/Atmosphere.jsx'
import Sky from './scene/Sky.jsx'
import Clouds from './scene/Clouds.jsx'
import Rocks from './scene/Rocks.jsx'
import Backdrop from './scene/Backdrop.jsx'
import './App.css'

// The signpost. Each sign is a place on the mountain, marked the way real trail signs are.
const SIGNS = [
  { shot: 'top', name: 'Summit', symbol: 'summit' },
  { shot: 'about', name: 'About me', symbol: 'green' },
  { shot: 'projects', name: 'Projects', symbol: 'blue' },
  { shot: 'experience', name: 'Experience', symbol: 'black' },
  { shot: 'contact', name: 'The lodge', symbol: 'lodge' },
]

// Snappy spring: quick to move, a tiny overshoot so it feels bouncy rather than mechanical.
const spring = { type: 'spring', stiffness: 420, damping: 26 }

function App() {
  const [shot, setShot] = useState('top')
  const [arrived, setArrived] = useState(false)
  const [skip, setSkip] = useState(false)

  return (
    <main className="app">
      <Canvas className="scene" camera={{ fov: 38, near: 0.5, far: 2600 }} dpr={[1, 2]} shadows>
        <Atmosphere />
        <Sky />
        <Backdrop />
        <Mountain />
        <Rocks />
        <Trees />
        <Clouds />
        <Snow />
        <CameraRig shot={shot} skip={skip} onArrive={() => setArrived(true)} />
      </Canvas>

      <AnimatePresence>
        {arrived && (
          <motion.header
            className="overlay"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <h1>Fraser Muller</h1>
            <p>Developer. Pick a run.</p>
          </motion.header>
        )}
      </AnimatePresence>

      {arrived && (
        <nav className="signpost" aria-label="Sections">
          {SIGNS.map((sign, i) => (
            <motion.button
              key={sign.shot}
              className="sign"
              aria-current={shot === sign.shot}
              onClick={() => setShot(sign.shot)}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: 0.3 + i * 0.07 }}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={`symbol ${sign.symbol}`} aria-hidden="true" />
              {sign.name}
            </motion.button>
          ))}
        </nav>
      )}

      {!arrived && (
        <button className="skip" onClick={() => setSkip(true)}>
          Skip the ride
        </button>
      )}
    </main>
  )
}

export default App
