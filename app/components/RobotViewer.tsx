"use client";

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const headNodeName = "Head_06";
const eyeNodeNames = ["Eye Control.L_010", "Eye Control.R_019"];

type RotationBase = {
  x: number;
  y: number;
  z: number;
};

export default function RobotViewer() {
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const scene = new Scene();
    scene.background = null;

    const camera = new PerspectiveCamera(26, 1, 0.01, 100);
    camera.position.set(0, 0.45, 4.75);
    camera.lookAt(0, 0.32, 0);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(new Color(0xffffff), 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.setAttribute("aria-label", "Interactive humanoid robot model");
    frame.appendChild(renderer.domElement);

    const ambient = new AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const keyLight = new DirectionalLight(0xffffff, 2.7);
    keyLight.position.set(2.8, 4, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new DirectionalLight(0x7fffd0, 1.5);
    fillLight.position.set(-3, 2, 2.5);
    scene.add(fillLight);

    const rimLight = new DirectionalLight(0xd9fff0, 2.1);
    rimLight.position.set(0, 3.2, -3);
    scene.add(rimLight);

    const robotRoot = new Group();
    const baseRootY = -0.52;
    robotRoot.position.y = baseRootY;
    scene.add(robotRoot);

    const pointer = new Vector2(0, 0);
    const targetHead = new Vector2(0, 0);
    const currentHead = new Vector2(0, 0);
    const baseRotations = new WeakMap<Object3D, RotationBase>();
    const activeHeadNodes: Object3D[] = [];
    const activeEyeNodes: Object3D[] = [];

    let rightShoulder: Object3D | null = null;
    let rightElbow: Object3D | null = null;
    let rightForearm: Object3D | null = null;

    let isWaving = false;
    let waveTime = 0;
    let waveTriggerTime = 3.2; // welcoming wave 3.2s after loading
    let lastTime = 0;

    let disposed = false;
    let dragging = false;
    let interactionEnergy = 0;
    let lastClientX = 0;
    let targetRootYaw = 0;
    let currentRootYaw = 0;
    let animationFrame = 0;

    const resize = () => {
      const width = frame.clientWidth || 1;
      const height = frame.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    resize();

    const saveBaseRotation = (node: Object3D) => {
      if (baseRotations.has(node)) return;
      baseRotations.set(node, {
        x: node.rotation.x,
        y: node.rotation.y,
        z: node.rotation.z
      });
    };

    const fitModelToStage = (model: Object3D) => {
      const box = new Box3().setFromObject(model);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);

      const scale = size.y > 0 ? 3.35 / size.y : 1;
      model.scale.setScalar(scale);

      const scaledCenter = center.multiplyScalar(scale);
      model.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);
    };

    const loader = new GLTFLoader();
    loader.load("/teal_v.2.glb", (gltf) => {
      if (disposed) return;

      const model = gltf.scene;
      model.traverse((child) => {
        child.frustumCulled = false;
        saveBaseRotation(child);

        if ((child as any).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }

        if (child.name === headNodeName) {
          activeHeadNodes.push(child);
        }

        if (eyeNodeNames.includes(child.name)) {
          activeEyeNodes.push(child);
        }

        if (child.name === "Arm.R_069") {
          rightShoulder = child;
        }
        if (child.name === "Arm.R.001_070") {
          rightElbow = child;
        }
        if (child.name === "Arm.R.002_071") {
          rightForearm = child;
        }
      });

      fitModelToStage(model);
      robotRoot.add(model);
    });

    const updatePointerTarget = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;

      const x = MathUtils.clamp(dx / (window.innerWidth / 2), -1, 1);
      const y = MathUtils.clamp(dy / (window.innerHeight / 2), -1, 1);

      pointer.set(x, y);
      targetHead.set(pointer.x * 0.45, pointer.y * 0.32);
      interactionEnergy = Math.max(interactionEnergy, 0.65);
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      interactionEnergy = 1;
      lastClientX = event.clientX;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(event.pointerId);
      updatePointerTarget(event);
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointerTarget(event);

      if (!dragging) return;
      const deltaX = event.clientX - lastClientX;
      lastClientX = event.clientX;
      targetRootYaw += deltaX * 0.008;
      interactionEnergy = 1;
    };

    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerLeave = () => {
      targetHead.set(0, 0);
      dragging = false;
      interactionEnergy = 0;
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("pointerleave", onPointerLeave);

    const clock = new Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const deltaTime = lastTime === 0 ? 0.016 : elapsed - lastTime;
      lastTime = elapsed;

      interactionEnergy = MathUtils.lerp(interactionEnergy, dragging ? 1 : 0, dragging ? 0.08 : 0.018);
      const idleEnergy = 1 - interactionEnergy;
      const idleScan = new Vector2(
        Math.sin(elapsed * 0.34) * 0.16 + Math.sin(elapsed * 0.13) * 0.08,
        Math.sin(elapsed * 0.27 + 1.2) * 0.07
      );
      const aliveTargetHead = new Vector2(
        targetHead.x * (0.9 + interactionEnergy * 0.35) + idleScan.x * idleEnergy,
        targetHead.y * (0.9 + interactionEnergy * 0.28) + idleScan.y * idleEnergy
      );
      const breath = Math.sin(elapsed * 1.55) * 0.018;
      const attentiveLean = MathUtils.clamp(currentHead.x, -0.35, 0.35);

      currentRootYaw += (targetRootYaw - currentRootYaw) * 0.12;
      currentHead.lerp(aliveTargetHead, 0.13 + interactionEnergy * 0.05);

      robotRoot.rotation.y = currentRootYaw;
      robotRoot.rotation.x = Math.sin(elapsed * 0.42) * 0.012 * idleEnergy - Math.abs(currentHead.y) * 0.035 * interactionEnergy;
      robotRoot.rotation.z = Math.sin(elapsed * 0.5 + 0.8) * 0.012 * idleEnergy - attentiveLean * 0.045 * interactionEnergy;
      robotRoot.position.y = baseRootY + breath + Math.sin(elapsed * 0.72) * 0.012 * idleEnergy;
      const breathScale = 1 + Math.sin(elapsed * 1.55 + 0.4) * 0.004;
      robotRoot.scale.setScalar(breathScale + interactionEnergy * 0.006);

      // Programmatic Waving Animation logic
      if (rightShoulder && rightElbow && rightForearm) {
        const baseShoulder = baseRotations.get(rightShoulder);
        const baseElbow = baseRotations.get(rightElbow);
        const baseForearm = baseRotations.get(rightForearm);

        if (baseShoulder && baseElbow && baseForearm) {
          if (!isWaving && elapsed > waveTriggerTime) {
            isWaving = true;
            waveTime = 0;
          }

          if (isWaving) {
            waveTime += deltaTime;
            let waveFactor = 0;

            if (waveTime < 0.5) {
              waveFactor = waveTime / 0.5; // Ease in / raise arm
            } else if (waveTime >= 0.5 && waveTime < 2.5) {
              waveFactor = 1.0; // Fully raised
            } else if (waveTime >= 2.5 && waveTime < 3.0) {
              waveFactor = (3.0 - waveTime) / 0.5; // Ease out / lower arm
            } else {
              waveFactor = 0;
              isWaving = false;
              waveTriggerTime = elapsed + 15 + Math.random() * 15; // Wave again in 15-30s
            }

            const waveOsc = Math.sin(waveTime * 14) * 0.32 * waveFactor;

            // Raise shoulder up (Z-rotation negative, X-rotation slightly negative for forward tilt)
            rightShoulder.rotation.z = baseShoulder.z - 1.25 * waveFactor;
            rightShoulder.rotation.x = baseShoulder.x - 0.35 * waveFactor;
            // Bend elbow forward (Y-rotation positive)
            rightElbow.rotation.y = baseElbow.y + 0.7 * waveFactor;
            // Wave forearm (Z-rotation oscillation)
            rightForearm.rotation.z = baseForearm.z + waveOsc;
          } else {
            // Smoothly return to rest base position
            rightShoulder.rotation.z += (baseShoulder.z - rightShoulder.rotation.z) * 0.1;
            rightShoulder.rotation.x += (baseShoulder.x - rightShoulder.rotation.x) * 0.1;
            rightElbow.rotation.y += (baseElbow.y - rightElbow.rotation.y) * 0.1;
            rightForearm.rotation.z += (baseForearm.z - rightForearm.rotation.z) * 0.1;
          }
        }
      }

      for (const node of activeHeadNodes) {
        const base = baseRotations.get(node);
        if (!base) continue;
        const curiousTilt = Math.sin(elapsed * 0.9) * 0.015 * idleEnergy;
        node.rotation.x = base.x + currentHead.y + curiousTilt;
        node.rotation.y = base.y + currentHead.x;
        node.rotation.z = base.z + Math.sin(elapsed * 1.2) * 0.012 + currentHead.x * 0.08;
      }

      for (const node of activeEyeNodes) {
        const base = baseRotations.get(node);
        if (!base) continue;
        const microSaccadeX = Math.sin(elapsed * 5.1) * 0.018 * idleEnergy;
        const microSaccadeY = Math.sin(elapsed * 4.4 + 0.6) * 0.012 * idleEnergy;
        node.rotation.x = base.x + currentHead.y * 0.45 + microSaccadeY;
        node.rotation.y = base.y + currentHead.x * 0.62 + microSaccadeX;
        node.rotation.z = base.z;
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("pointerleave", onPointerLeave);
      renderer.dispose();
      frame.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={frameRef} className="robot-viewer-frame" />;
}
