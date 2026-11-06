import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import * as THREE from 'three'
import { ground, liftLine, shots, smoothstep } from './terrain.js'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const RIDE_SECONDS = 26 // hold the button to go 5x faster

// Where the camera is and what it's looking at. GSAP moves these; every frame the real camera copies them.
const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const sway = new THREE.Vector2()
const gaze = new THREE.Vector3()
// Extra head turn from dragging, on top of wherever the shot is aimed.
const drag = { yaw: 0, pitch: 0 }
const lens = { fov: shots.top.fov }
// Dev only: poke the camera from the browser console (rig.pos.set(...), rig.look.set(...)) to check a view.
if (import.meta.env.DEV) window.rig = { pos, look, drag, lens }

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

export default function CameraRig({ shot, skip, speed, onArrive }) {
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

  // The intro: ride the chairlift up out of the whiteout, then get off at the top and turn to take in the view.
  // (The fog thins by itself as you climb, see Atmosphere.)
  useGSAP(() => {
    const progress = { t: 0 }
    const place = () => {
      liftLine.getPointAt(progress.t, pos)
      // Face up the lift line but keep your head fairly level: staring straight up the cable is mostly sky.
      const heading = liftLine.getTangentAt(progress.t)
      aim(Math.atan2(heading.x, heading.z), THREE.MathUtils.clamp(Math.asin(heading.y) * 0.4 - 0.1, -0.4, 0.12))
    }
    place()

    // Getting off: stand up as the chair reaches the top station, glide down the ramp, carve left and stop
    // facing the view. Your head follows the way you're sliding, then turns to the view as you slow down.
    // Blending left-right and up-down angles (not the look point) keeps a big turn from swinging through your feet.
    const top = liftLine.getPointAt(1)
    const ramp = new THREE.CatmullRomCurve3([
      top,
      ground(top.x - 0.4, top.z - 4.5, 0.88),
      ground(top.x - 3, top.z - 6.6, 0.86),
      shots.top.camera,
    ])
    const off = { t: 0 }
    let from
    let to
    ride.current = gsap
      .timeline({ paused: true, onComplete: onArrive })
      .to(progress, { t: 1, duration: RIDE_SECONDS, ease: 'sine.inOut', onUpdate: place })
      .to(off, {
        t: 1,
        duration: 3.6,
        ease: 'power2.out', // a push off the chair, then easing to a stop
        onStart: () => {
          from = headAngles(look)
          to = headAngles(shots.top.look, shots.top.camera)
        },
        onUpdate: () => {
          ramp.getPointAt(off.t, pos)
          // Knees bend as you push off the chair.
          pos.y -= Math.sin(Math.min(off.t / 0.2, 1) * Math.PI) * 0.15
          const tangent = ramp.getTangentAt(off.t)
          const sliding = Math.atan2(tangent.x, tangent.z)
          // Go the short way round from wherever you're sliding to the view.
          const view = sliding + Math.atan2(Math.sin(to.yaw - sliding), Math.cos(to.yaw - sliding))
          const turn = smoothstep(0.35, 1, off.t)
          const glance = Math.min(off.t / 0.2, 1) // look down at the ramp for a moment
          aim(
            THREE.MathUtils.lerp(sliding, view, turn),
            THREE.MathUtils.lerp(THREE.MathUtils.lerp(from.pitch, -0.12, glance), to.pitch, turn),
          )
        },
      })

    if (reducedMotion) ride.current.progress(1)
  }, [])

  // Start the ride once the scene is ready: the first second or so after loading stutters while everything
  // gets built and sent to the GPU, so wait for a handful of smooth frames rather than starting mid-stutter.
  const calm = useRef(0)
  useFrame((_, delta) => {
    if (ride.current?.paused() && ride.current.progress() === 0) {
      calm.current = delta < 0.05 ? calm.current + 1 : 0
      if (calm.current > 30) ride.current.play()
    }
  })

  useEffect(() => {
    if (skip) ride.current?.progress(1)
  }, [skip])

  useEffect(() => {
    ride.current?.timeScale(speed)
  }, [speed])

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
