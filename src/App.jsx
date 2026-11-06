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
import TopStation from './scene/TopStation.jsx'
import './App.css'

// The signpost. Each sign is a place on the mountain, marked the way real trail signs are.
const SIGNS = [
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
      <Canvas className="scene" camera={{ fov: 48, near: 0.1, far: 2600 }} dpr={[1, 2]} shadows>
        <Atmosphere />
        <Sky />
        <Backdrop />
        <Mountain />
        <Rocks />
        <Trees />
        <Clouds />
        <Snow />
        {/* The board and bench only respond once you're off the lift, so a click can't fight the intro. */}
        <TopStation onBoard={() => arrived && setShot('board')} onBench={() => arrived && setShot('view')} />
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
          </motion.header>
        )}
      </AnimatePresence>

      {/* Placeholder UI until the real board menu exists. These are real buttons, so keyboard and screen-reader
          users can go everywhere the 3D board and bench go. The first one takes focus when you arrive. */}
      {arrived && shot === 'top' && (
        <motion.div className="choices" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.6 }}>
          <button className="choice" onClick={() => setShot('view')} autoFocus>
            Sit on the bench
          </button>
          <span className="choice-note">or drag to look around</span>
          <button className="choice" onClick={() => setShot('board')}>
            Read the trail board
          </button>
        </motion.div>
      )}

      {arrived && shot !== 'top' && shot !== 'view' && (
        <nav className="signpost" aria-label="Sections">
          {SIGNS.map((sign, i) => (
            <motion.button
              key={sign.shot}
              className="sign"
              aria-current={shot === sign.shot}
              onClick={() => setShot(sign.shot)}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: 0.1 + i * 0.07 }}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={`symbol ${sign.symbol}`} aria-hidden="true" />
              {sign.name}
            </motion.button>
          ))}
        </nav>
      )}

      {arrived && shot !== 'top' && (
        <button className="corner" onClick={() => setShot('top')}>
          Back to the top
        </button>
      )}

      {!arrived && (
        <button className="corner" onClick={() => setSkip(true)}>
          Skip the ride
        </button>
      )}
    </main>
  )
}

export default App
