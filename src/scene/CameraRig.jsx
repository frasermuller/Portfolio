import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import * as THREE from 'three'
import { liftLine, shots } from './terrain.js'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const RIDE_SECONDS = 11

// Where the camera is and what it's looking at. GSAP moves these; every frame the real camera copies them.
const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const sway = new THREE.Vector2()
const gaze = new THREE.Vector3()
// Extra head turn from dragging, on top of wherever the shot is aimed.
const drag = { yaw: 0, pitch: 0 }
const lens = { fov: shots.top.fov }

// Which way the camera faces to see a point: yaw is left-right, pitch is up-down.
function headAngles(target, from = pos) {
  const direction = target.clone().sub(from).normalize()
  return { yaw: Math.atan2(direction.x, direction.z), pitch: Math.asin(direction.y) }
}

// Point the camera by yaw and pitch (sets the look-at point 100 units out in that direction).
function aim(yaw, pitch) {
  look.set(
    pos.x + Math.sin(yaw) * Math.cos(pitch) * 100,
    pos.y + Math.sin(pitch) * 100,
    pos.z + Math.cos(yaw) * Math.cos(pitch) * 100,
  )
}

export default function CameraRig({ shot, skip, onArrive }) {
  const ride = useRef()
  const flight = useRef()
  const current = useRef('top') // where the camera is now (the intro already ends at the top)
  const canvas = useThree((state) => state.gl.domElement)

  const unturn = useRef() // the tween that eases the head back to straight ahead after a move

  // Drag anywhere to look around (like turning your head), within limits.
  useEffect(() => {
    const pointer = { last: null } // where the drag was last frame, or null when not dragging
    const down = (e) => {
      unturn.current?.kill() // grabbing the view takes over from any automatic head turn
      pointer.last = { x: e.clientX, y: e.clientY }
    }
    const up = () => (pointer.last = null)
    const move = (e) => {
      if (!pointer.last) return
      drag.yaw = THREE.MathUtils.clamp(drag.yaw + (e.clientX - pointer.last.x) * 0.004, -1.7, 1.7)
      drag.pitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - pointer.last.y) * 0.004, -0.7, 0.6)
      pointer.last = { x: e.clientX, y: e.clientY }
    }
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('pointermove', move)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('pointermove', move)
    }
  }, [canvas])

  // The intro: ride the chairlift up out of the whiteout, then turn around at the top to take in the view.
  // (The fog thins by itself as you climb, see Atmosphere.)
  useGSAP(() => {
    const progress = { t: 0 }
    const place = () => {
      liftLine.getPointAt(progress.t, pos)
      liftLine.getPointAt(Math.min(progress.t + 0.04, 1), look) // eyes up the lift line
    }
    place()

    // Getting off: glide off the chair onto the platform while turning your head to face the view.
    // The turn blends the left-right and up-down angles rather than the point you look at, so a big turn
    // sweeps around smoothly instead of swinging through your feet.
    const off = { t: 0 }
    let start
    let from
    let to
    ride.current = gsap
      .timeline({ onComplete: onArrive })
      .to(progress, { t: 1, duration: RIDE_SECONDS, ease: 'sine.inOut', onUpdate: place })
      .to(off, {
        t: 1,
        duration: 2.4,
        ease: 'power2.inOut',
        onStart: () => {
          start = pos.clone()
          from = headAngles(look)
          to = headAngles(shots.top.look, shots.top.camera)
          // Go the short way round.
          to.yaw = from.yaw + Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw))
        },
        onUpdate: () => {
          pos.lerpVectors(start, shots.top.camera, off.t)
          aim(THREE.MathUtils.lerp(from.yaw, to.yaw, off.t), THREE.MathUtils.lerp(from.pitch, to.pitch, off.t))
        },
      })

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
      const fromFov = lens.fov
      const { camera: to, look: toLook, fov } = shots[shot]
      const distance = from.distanceTo(to)
      const hop = distance * 0.25 // a big arc for long flights, barely any for a few steps across the platform
      const progress = { t: 0 }
      // Face where the new shot points.
      unturn.current?.kill()
      unturn.current = gsap.to(drag, { yaw: 0, pitch: 0, duration: reducedMotion ? 0 : 1.2, ease: 'power2.out' })

      flight.current = gsap.to(progress, {
        t: 1,
        duration: reducedMotion ? 0.01 : THREE.MathUtils.clamp(distance / 40, 1.2, 2.6),
        ease: 'power3.inOut',
        onUpdate: () => {
          pos.lerpVectors(from, to, progress.t)
          pos.y += Math.sin(progress.t * Math.PI) * hop
          look.lerpVectors(fromLook, toLook, progress.t)
          lens.fov = THREE.MathUtils.lerp(fromFov, fov, progress.t)
        },
      })
    },
    { dependencies: [shot] },
  )

  useFrame((state, delta) => {
    // The view drifts a touch toward the mouse, easing in so it feels alive rather than twitchy,
    // then the drag turn goes on top.
    sway.lerp(state.pointer, 1 - Math.exp(-delta * 3))
    const { yaw, pitch } = headAngles(look)
    const y = yaw + drag.yaw - sway.x * 0.03
    const p = THREE.MathUtils.clamp(pitch + drag.pitch + sway.y * 0.02, -1.3, 1.3)
    gaze.set(pos.x + Math.sin(y) * Math.cos(p), pos.y + Math.sin(p), pos.z + Math.cos(y) * Math.cos(p))
    state.camera.position.copy(pos)
    state.camera.lookAt(gaze)
    if (state.camera.fov !== lens.fov) {
      state.camera.fov = lens.fov
      state.camera.updateProjectionMatrix()
    }
  })

  return null
}
