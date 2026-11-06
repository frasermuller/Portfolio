import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import * as THREE from 'three'
import { liftLine, shots } from './terrain.js'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const RIDE_SECONDS = 11

// Where the camera is and what it's looking at. GSAP moves these; every frame the real camera copies them.
const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const ahead = new THREE.Vector3()
const sway = new THREE.Vector2()

export default function CameraRig({ shot, skip, onArrive }) {
  const ride = useRef()
  const flight = useRef()
  const current = useRef('top') // where the camera is now (the intro already ends at the top)

  // The intro: ride the chairlift up out of the whiteout. (The fog thins by itself as you climb, see Atmosphere.)
  useGSAP(() => {
    const progress = { t: 0 }
    const place = () => {
      liftLine.getPointAt(progress.t, pos)
      liftLine.getPointAt(Math.min(progress.t + 0.04, 1), ahead)
      // Eyes on the lift line at first, lifting up to the summit as you near the top.
      look.lerpVectors(ahead, shots.top.look, progress.t ** 2)
    }
    place()

    ride.current = gsap
      .timeline({ onComplete: onArrive })
      .to(progress, { t: 1, duration: RIDE_SECONDS, ease: 'sine.inOut', onUpdate: place })

    if (reducedMotion) ride.current.progress(1)
  }, [])

  useEffect(() => {
    if (skip) ride.current?.progress(1)
  }, [skip])

  // Flying between places: a straight line could cut through the mountain, so it arcs up and over.
  useGSAP(
    () => {
      // Already there? Do nothing. (Also stops React's double-run in dev from launching a stray flight.)
      if (shot === current.current) return
      current.current = shot
      flight.current?.kill()
      const from = pos.clone()
      const fromLook = look.clone()
      const { camera: to, look: toLook } = shots[shot]
      const hop = from.distanceTo(to) * 0.25 + 15
      const progress = { t: 0 }

      flight.current = gsap.to(progress, {
        t: 1,
        duration: reducedMotion ? 0.01 : 2.6,
        ease: 'power3.inOut',
        onUpdate: () => {
          pos.lerpVectors(from, to, progress.t)
          pos.y += Math.sin(progress.t * Math.PI) * hop
          look.lerpVectors(fromLook, toLook, progress.t)
        },
      })
    },
    { dependencies: [shot] },
  )

  useFrame((state, delta) => {
    // The camera leans a little toward the mouse, easing in so it feels alive rather than twitchy.
    sway.lerp(state.pointer, 1 - Math.exp(-delta * 3))
    state.camera.position.copy(pos)
    state.camera.lookAt(look)
    state.camera.translateX(sway.x * 2.5)
    state.camera.translateY(sway.y * 1.2)
    state.camera.lookAt(look)
  })

  return null
}
