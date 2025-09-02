"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";

export type RealtimeDC = RTCDataChannel | null | undefined;

interface RPMAvatarProps {
  character: string;
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  remoteAudioStream?: MediaStream;
  avatarUrl?: string;
  realtimeDC?: RealtimeDC;
  onPhonemeSink?: (e: { viseme: string; value: number }) => void;
}

interface RPMAvatar3DProps extends RPMAvatarProps {}

// Enhanced viseme mapping with perfect case handling
function toOVRViseme(label: string): string {
  const s = String(label || "").toUpperCase();
  
  if (s.startsWith("VISEME_")) {
    const visemeMap = {
      "VISEME_SIL": "viseme_sil",
      "VISEME_PP": "viseme_PP", 
      "VISEME_FF": "viseme_FF",
      "VISEME_TH": "viseme_TH",
      "VISEME_DD": "viseme_DD", 
      "VISEME_KK": "viseme_kk",
      "VISEME_CH": "viseme_CH",
      "VISEME_SS": "viseme_SS",
      "VISEME_NN": "viseme_nn",
      "VISEME_RR": "viseme_RR",
      "VISEME_AA": "viseme_aa",
      "VISEME_E": "viseme_E",
      "VISEME_I": "viseme_I", 
      "VISEME_O": "viseme_O",
      "VISEME_U": "viseme_U"
    };
    return visemeMap[s] || "viseme_sil";
  }
  
  // Phoneme to viseme mapping
  if (["AA","AE","AH","AO"].includes(s)) return "viseme_aa";
  if (["OW","OU","OH","UH","UW","OO","OY"].includes(s)) return "viseme_O";
  if (["IY","IH","EE"].includes(s)) return "viseme_I";
  if (["EH","EY","AY","E"].includes(s)) return "viseme_E";
  if (["S","Z","SH","ZH","TH","DH"].includes(s)) return "viseme_SS";
  if (["F","V"].includes(s)) return "viseme_FF";
  if (["CH","JH"].includes(s)) return "viseme_CH";
  if (["P","B","M"].includes(s)) return "viseme_PP";
  if (["T","D"].includes(s)) return "viseme_DD";
  if (["K","G"].includes(s)) return "viseme_kk";
  if (["N","NG"].includes(s)) return "viseme_nn";
  if (["R","ER"].includes(s)) return "viseme_RR";
  if (["SIL","PAUSE","SP"].includes(s)) return "viseme_sil";
  
  return "viseme_sil";
}

function EnvironmentMapping({ gltf }: { gltf: any }) {
  useEffect(() => {
    if (!gltf?.scene) return;
    
    // Create a simple environment map for reflections
    const envMap = new THREE.CubeTextureLoader().load([
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlOGY0ZmQiLz48L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlOGY0ZmQiLz48L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlOGY0ZmQiLz48L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlOGY0ZmQiLz48L3N2Zz4='
    ]);

    // Apply environment mapping to all materials
    gltf.scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            mat.envMap = envMap;
            mat.envMapIntensity = 0.2;
            mat.needsUpdate = true;
          });
        } else {
          child.material.envMap = envMap;
          child.material.envMapIntensity = 0.2;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [gltf]);

  return null;
}

function VisemeBadge({ lastAtRef }: { lastAtRef: React.MutableRefObject<number> }) {
  const [v, setV] = useState("—");
  const [s, setS] = useState(0);

  useEffect(() => {
    const h = (e: any) => {
      const d = e.detail ?? e;
      setV(String(d?.viseme ?? "sil"));
      setS(Number(d?.value ?? 0));
      lastAtRef.current = performance.now();
    };
    window.addEventListener("viseme", h as any);
    window.addEventListener("phoneme", h as any);
    return () => {
      window.removeEventListener("viseme", h as any);
      window.removeEventListener("phoneme", h as any);
    };
  }, [lastAtRef]);

  return (
    <div className="bg-black/60 text-white px-2 py-1 rounded text-xs">
      {v} {s.toFixed(2)}
    </div>
  );
}

function RPMAvatar({ character, avatarUrl }: Pick<RPMAvatarProps, "character" | "avatarUrl">) {
  const groupRef = useRef<THREE.Group>(null);
  const avatarUrlToLoad = (avatarUrl || "/models/rpm_avatar.glb") + "?v=5";
  const gltf = useGLTF(avatarUrlToLoad);

  const blendRef = useRef<{
    meshes: THREE.SkinnedMesh[];
    available: Set<string>;
    current: Record<string, number>;
  } | null>(null);

  // Enhanced bone references for natural animation
  const bonesRef = useRef<{
    jaw: THREE.Bone | null;
    head: THREE.Bone | null;
    neck: THREE.Bone | null;
    spine1: THREE.Bone | null;
    spine2: THREE.Bone | null;
    leftShoulder: THREE.Bone | null;
    rightShoulder: THREE.Bone | null;
    leftArm: THREE.Bone | null;
    rightArm: THREE.Bone | null;
    leftForeArm: THREE.Bone | null;
    rightForeArm: THREE.Bone | null;
    leftHand: THREE.Bone | null;
    rightHand: THREE.Bone | null;
    hips: THREE.Bone | null;
  }>({
    jaw: null,
    head: null,
    neck: null,
    spine1: null,
    spine2: null,
    leftShoulder: null,
    rightShoulder: null,
    leftArm: null,
    rightArm: null,
    leftForeArm: null,
    rightForeArm: null,
    leftHand: null,
    rightHand: null,
    hips: null,
  });
  
  // Enhanced animation state with idle behaviors
  const animationStateRef = useRef({
    isTalking: false,
    startTime: 0,
    lastVisemeTime: 0,
    intensity: 0,
    idleStartTime: performance.now(),
    breathingPhase: 0,
    nextBreathTime: 0,
    nextLookTime: 0,
    nextGestureTime: 0,
    currentLookTarget: { x: 0, y: 0 },
    targetLookDirection: { x: 0, y: 0 },
    gestureState: 'idle' as 'idle' | 'gesture',
    gestureType: 'none' as 'none' | 'shift_weight' | 'adjust_arms' | 'head_tilt',
  });

  // Enhanced bone detection
  useEffect(() => {
    if (!gltf?.scene) return;

    const meshes: THREE.SkinnedMesh[] = [];
    const names = new Set<string>();

    gltf.scene.traverse((child) => {
      if ((child as any).isSkinnedMesh) {
        const m = child as THREE.SkinnedMesh;
        if (m.morphTargetDictionary && m.morphTargetInfluences) {
          meshes.push(m);
          Object.keys(m.morphTargetDictionary).forEach((n) => names.add(n));
        }
      }
      
      if ((child as any).isBone) {
        const bone = child as THREE.Bone;
        const boneName = child.name.toLowerCase();
        
        // Enhanced bone detection
        if (/jaw/i.test(boneName)) {
          bonesRef.current.jaw = bone;
        } else if (/^head$/i.test(boneName)) {
          bonesRef.current.head = bone;
        } else if (/neck/i.test(boneName)) {
          bonesRef.current.neck = bone;
        } else if (/spine.*1/i.test(boneName) || /chest/i.test(boneName)) {
          bonesRef.current.spine1 = bone;
        } else if (/spine.*2/i.test(boneName)) {
          bonesRef.current.spine2 = bone;
        } else if (/hips|pelvis|root/i.test(boneName)) {
          bonesRef.current.hips = bone;
        } else if (/left.*shoulder|shoulder.*left/i.test(boneName)) {
          bonesRef.current.leftShoulder = bone;
        } else if (/right.*shoulder|shoulder.*right/i.test(boneName)) {
          bonesRef.current.rightShoulder = bone;
        } else if (/left.*arm|arm.*left|left.*upper|upper.*left/i.test(boneName) && !/fore|lower|hand/i.test(boneName)) {
          bonesRef.current.leftArm = bone;
        } else if (/right.*arm|arm.*right|right.*upper|upper.*right/i.test(boneName) && !/fore|lower|hand/i.test(boneName)) {
          bonesRef.current.rightArm = bone;
        } else if (/left.*forearm|forearm.*left|left.*fore/i.test(boneName)) {
          bonesRef.current.leftForeArm = bone;
        } else if (/right.*forearm|forearm.*right|right.*fore/i.test(boneName)) {
          bonesRef.current.rightForeArm = bone;
        } else if (/^lefthand$/i.test(boneName)) {
          bonesRef.current.leftHand = bone;
        } else if (/^righthand$/i.test(boneName)) {
          bonesRef.current.rightHand = bone;
        }
      }
    });

    blendRef.current = { meshes, available: names, current: {} };
    console.log(`[RPM] Found ${meshes.length} meshes with ${names.size} morph targets`);
    console.log(`[RPM] Available visemes:`, Array.from(names).filter(n => n.startsWith('viseme_')));
  }, [gltf?.scene]);

  // Apply natural pose with elbow bends and relaxed hands
  useEffect(() => {
    if (!gltf?.scene) return;

    const setNaturalPose = () => {
      const bones = bonesRef.current;
      
      console.log("=== APPLYING NATURAL ARM POSE WITH ELBOW BENDS ===");
      
      // Upper arms - bring down from T-pose with more downward rotation
      if (bones.leftArm) {
        console.log("Adjusting left arm - increased downward rotation:");
        const naturalX = 0.082 + 1.6;    // Increase rotation to face more downward
        const naturalY = 0.076;          // Keep original Y
        const naturalZ = 0.201;          // Keep original Z
        
        bones.leftArm.rotation.set(naturalX, naturalY, naturalZ);
        console.log(`Left arm applied: x=${naturalX.toFixed(3)}, y=${naturalY.toFixed(3)}, z=${naturalZ.toFixed(3)}`);
      }
      
      if (bones.rightArm) {
        console.log("Adjusting right arm - increased downward rotation:");
        const naturalX = 0.082 + 1.6;    // Increase rotation to face more downward
        const naturalY = -0.076;         // Keep original Y  
        const naturalZ = -0.201;         // Keep original Z
        
        bones.rightArm.rotation.set(naturalX, naturalY, naturalZ);
        console.log(`Right arm applied: x=${naturalX.toFixed(3)}, y=${naturalY.toFixed(3)}, z=${naturalZ.toFixed(3)}`);
      }
      
      // Forearms - reduce elbow bend by half
      if (bones.leftForeArm) {
        console.log("Adding reduced left elbow bend:");
        console.log("Default forearm rotation:", bones.leftForeArm.rotation.x.toFixed(3), bones.leftForeArm.rotation.y.toFixed(3), bones.leftForeArm.rotation.z.toFixed(3));
        
        // Reduced elbow bend - half the previous rotation
        const originalX = bones.leftForeArm.rotation.x;
        const bendX = originalX + 0.2; // Reduced from 0.4 to 0.2
        
        bones.leftForeArm.rotation.set(bendX, bones.leftForeArm.rotation.y, bones.leftForeArm.rotation.z);
        console.log(`Left elbow bend applied: x=${bendX.toFixed(3)}`);
      }
      
      if (bones.rightForeArm) {
        console.log("Adding reduced right elbow bend:");
        console.log("Default forearm rotation:", bones.rightForeArm.rotation.x.toFixed(3), bones.rightForeArm.rotation.y.toFixed(3), bones.rightForeArm.rotation.z.toFixed(3));
        
        // Reduced elbow bend - half the previous rotation
        const originalX = bones.rightForeArm.rotation.x;
        const bendX = originalX + 0.2; // Reduced from 0.4 to 0.2
        
        bones.rightForeArm.rotation.set(bendX, bones.rightForeArm.rotation.y, bones.rightForeArm.rotation.z);
        console.log(`Right elbow bend applied: x=${bendX.toFixed(3)}`);
      }
      
      // Hands - relax hand position to look natural
      if (bones.leftHand) {
        console.log("Relaxing left hand position:");
        console.log("Default hand rotation:", bones.leftHand.rotation.x.toFixed(3), bones.leftHand.rotation.y.toFixed(3), bones.leftHand.rotation.z.toFixed(3));
        
        // Relax hand - slightly forward and inward
        const originalX = bones.leftHand.rotation.x;
        const originalY = bones.leftHand.rotation.y;  
        const originalZ = bones.leftHand.rotation.z;
        
        const relaxedX = originalX + 0.2;  // Slight forward tilt
        const relaxedY = originalY - 0.1;  // Slight inward turn
        const relaxedZ = originalZ + 0.1;  // Slight side tilt
        
        bones.leftHand.rotation.set(relaxedX, relaxedY, relaxedZ);
        console.log(`Left hand relaxed: x=${relaxedX.toFixed(3)}, y=${relaxedY.toFixed(3)}, z=${relaxedZ.toFixed(3)}`);
      }
      
      if (bones.rightHand) {
        console.log("Relaxing right hand position:");
        console.log("Default hand rotation:", bones.rightHand.rotation.x.toFixed(3), bones.rightHand.rotation.y.toFixed(3), bones.rightHand.rotation.z.toFixed(3));
        
        // Relax hand - slightly forward and inward (mirrored)
        const originalX = bones.rightHand.rotation.x;
        const originalY = bones.rightHand.rotation.y;
        const originalZ = bones.rightHand.rotation.z;
        
        const relaxedX = originalX + 0.2;  // Slight forward tilt
        const relaxedY = originalY + 0.1;  // Slight inward turn (opposite direction)
        const relaxedZ = originalZ - 0.1;  // Slight side tilt (opposite direction)
        
        bones.rightHand.rotation.set(relaxedX, relaxedY, relaxedZ);
        console.log(`Right hand relaxed: x=${relaxedX.toFixed(3)}, y=${relaxedY.toFixed(3)}, z=${relaxedZ.toFixed(3)}`);
      }
      
      console.log("Natural arm pose with elbow bends complete");
    };

    setTimeout(setNaturalPose, 500);
  }, [gltf?.scene]);

  // Enhanced idle animation system with more natural behaviors
  useEffect(() => {
    if (!gltf?.scene) return;

    let animationFrameId: number;
    
    // Store original bone rotations to animate from baseline
    const originalRotations = new Map();
    
    const animate = () => {
      const now = performance.now();
      const bones = bonesRef.current;
      
      // === BREATHING ANIMATION ===
      const breathingPhase = (now * 0.001) * Math.PI * 0.6; // 3.3 second cycle
      const breathingIntensity = Math.sin(breathingPhase) * 0.008; // More noticeable breathing
      
      // Breathing affects spine and chest
      if (bones.spine1) {
        if (!originalRotations.has('spine1')) {
          originalRotations.set('spine1', bones.spine1.rotation.x);
        }
        const originalX = originalRotations.get('spine1');
        bones.spine1.rotation.x = originalX + breathingIntensity;
      }
      
      // Subtle shoulder breathing
      if (bones.leftShoulder && bones.rightShoulder) {
        const shoulderBreathe = Math.sin(breathingPhase) * 0.004;
        
        if (!originalRotations.has('leftShoulder')) {
          originalRotations.set('leftShoulder', bones.leftShoulder.rotation.x);
          originalRotations.set('rightShoulder', bones.rightShoulder.rotation.x);
        }
        
        bones.leftShoulder.rotation.x = originalRotations.get('leftShoulder') + shoulderBreathe;
        bones.rightShoulder.rotation.x = originalRotations.get('rightShoulder') + shoulderBreathe;
      }
      
      // === NATURAL HEAD MOVEMENTS ===
      if (bones.head) {
        if (!originalRotations.has('head')) {
          originalRotations.set('head', {
            x: bones.head.rotation.x,
            y: bones.head.rotation.y,
            z: bones.head.rotation.z
          });
        }
        const original = originalRotations.get('head');
        
        // Gentle head breathing movement
        bones.head.rotation.x = original.x + breathingIntensity * 0.2;
        
        // Natural head turn cycle - slow and subtle
        const headTurnPhase = (now * 0.0003) * Math.PI; // Very slow head movement
        const headTurnIntensity = Math.sin(headTurnPhase) * 0.08; // Subtle but noticeable
        bones.head.rotation.y = original.y + headTurnIntensity;
        
        // Occasional head tilt
        const headTiltPhase = (now * 0.0002) * Math.PI; 
        const headTiltIntensity = Math.sin(headTiltPhase) * 0.02;
        bones.head.rotation.z = original.z + headTiltIntensity;
      }
      
      // === SUBTLE BODY SWAY ===
      if (bones.spine1) {
        const swayPhase = (now * 0.0004) * Math.PI; // Very slow body sway
        const swayIntensity = Math.sin(swayPhase) * 0.008;
        
        if (!originalRotations.has('spine1Y')) {
          originalRotations.set('spine1Y', bones.spine1.rotation.y);
        }
        bones.spine1.rotation.y = originalRotations.get('spine1Y') + swayIntensity;
      }
      
      // === SUBTLE HAND MOVEMENTS ===
      if (bones.leftHand && bones.rightHand) {
        if (!originalRotations.has('leftHand')) {
          originalRotations.set('leftHand', {
            x: bones.leftHand.rotation.x,
            y: bones.leftHand.rotation.y,
            z: bones.leftHand.rotation.z
          });
          originalRotations.set('rightHand', {
            x: bones.rightHand.rotation.x,
            y: bones.rightHand.rotation.y,
            z: bones.rightHand.rotation.z
          });
        }
        
        // Very subtle hand movements
        const handPhase = (now * 0.0005) * Math.PI;
        const handIntensity = Math.sin(handPhase) * 0.015;
        
        const leftOriginal = originalRotations.get('leftHand');
        const rightOriginal = originalRotations.get('rightHand');
        
        bones.leftHand.rotation.x = leftOriginal.x + handIntensity;
        bones.leftHand.rotation.z = leftOriginal.z + handIntensity * 0.5;
        
        bones.rightHand.rotation.x = rightOriginal.x + handIntensity;
        bones.rightHand.rotation.z = rightOriginal.z - handIntensity * 0.5; // Opposite direction
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // Wait for pose to settle before starting animations
    setTimeout(() => {
      animate();
    }, 1000);
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [gltf?.scene]);

  // Enhanced shape setter with better blending
  const setShape = useCallback((shapeName: string, targetValue: number, smooth = true) => {
    const mgr = blendRef.current;
    if (!mgr || !mgr.available.has(shapeName)) return;
    
    const val = Math.max(0, Math.min(1, targetValue));
    const currentVal = mgr.current[shapeName] || 0;
    
    const blendSpeed = targetValue > currentVal ? 0.12 : 0.08;
    const newVal = smooth ? currentVal + (val - currentVal) * blendSpeed : val;
    
    mgr.current[shapeName] = newVal;
    
    for (const mesh of mgr.meshes) {
      const idx = mesh.morphTargetDictionary![shapeName];
      if (idx !== undefined && mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[idx] = newVal;
      }
    }
  }, []);

  const ALL_VISEMES = useMemo(
    () => ["viseme_sil","viseme_PP","viseme_FF","viseme_TH","viseme_DD","viseme_kk","viseme_CH","viseme_SS","viseme_nn","viseme_RR","viseme_aa","viseme_E","viseme_I","viseme_O","viseme_U"],
    []
  );

  // Enhanced viseme application with better mouth shapes
  const applyViseme = useCallback((label: string, strength: number) => {
    const mgr = blendRef.current;
    if (!mgr) return;
    
    animationStateRef.current.lastVisemeTime = performance.now();
    animationStateRef.current.intensity = strength;
    
    const s = Math.max(0, Math.min(1, strength * 0.9));
    const targetViseme = toOVRViseme(label);
    
    for (const viseme of ALL_VISEMES) {
      if (mgr.available.has(viseme)) {
        const goal = viseme === targetViseme ? s : 0;
        setShape(viseme, goal, true);
      }
    }

    // Enhanced complementary shapes for better mouth movement
    switch (targetViseme) {
      case "viseme_aa":
        setShape("jawOpen", s * 0.55);
        setShape("mouthFunnel", s * 0.12);
        setShape("tongueOut", s * 0.05);
        break;
      case "viseme_O":
      case "viseme_U":
        setShape("mouthFunnel", s * 0.65);
        setShape("mouthPucker", s * 0.5);
        setShape("jawOpen", s * 0.2);
        setShape("mouthUpperUpLeft", s * 0.08);
        setShape("mouthUpperUpRight", s * 0.08);
        break;
      case "viseme_E":
      case "viseme_I":
        setShape("jawOpen", s * 0.15);
        setShape("mouthStretchLeft", s * 0.35);
        setShape("mouthStretchRight", s * 0.35);
        setShape("mouthSmileLeft", s * 0.2);
        setShape("mouthSmileRight", s * 0.2);
        setShape("mouthShrugUpper", s * 0.05);
        break;
      case "viseme_SS":
        setShape("mouthClose", s * 0.45);
        setShape("mouthStretchLeft", s * 0.18);
        setShape("mouthStretchRight", s * 0.18);
        setShape("mouthFunnel", s * 0.1);
        break;
      case "viseme_FF":
        setShape("mouthClose", s * 0.5);
        setShape("mouthLowerDownLeft", s * 0.3);
        setShape("mouthLowerDownRight", s * 0.3);
        setShape("mouthUpperUpLeft", s * 0.15);
        setShape("mouthUpperUpRight", s * 0.15);
        break;
      case "viseme_TH":
        setShape("tongueOut", s * 0.4);
        setShape("jawOpen", s * 0.15);
        setShape("mouthOpen", s * 0.1);
        break;
      case "viseme_PP":
        setShape("mouthClose", s * 0.8);
        setShape("mouthPucker", s * 0.15);
        break;
      case "viseme_DD":
        setShape("tongueOut", s * 0.15);
        setShape("jawOpen", s * 0.2);
        setShape("mouthOpen", s * 0.1);
        break;
      case "viseme_kk":
        setShape("jawOpen", s * 0.3);
        setShape("mouthOpen", s * 0.2);
        break;
      case "viseme_CH":
        setShape("mouthFunnel", s * 0.3);
        setShape("mouthPucker", s * 0.2);
        setShape("jawOpen", s * 0.1);
        break;
      case "viseme_RR":
        setShape("mouthFunnel", s * 0.25);
        setShape("jawOpen", s * 0.1);
        break;
      case "viseme_nn":
        setShape("tongueOut", s * 0.1);
        setShape("mouthClose", s * 0.2);
        break;
      default:
        break;
    }

    if (bonesRef.current.jaw) {
      const jawIntensity = Math.max(
        s * 0.12,
        (mgr.current["jawOpen"] || 0) * 0.08
      );
      
      const targetRotation = jawIntensity;
      bonesRef.current.jaw.rotation.x = THREE.MathUtils.lerp(
        bonesRef.current.jaw.rotation.x,
        targetRotation,
        0.08
      );
    }
  }, [ALL_VISEMES, setShape]);

  // Enhanced passive decay with smarter timing
  useEffect(() => {
    let raf = 0;
    
    const tick = () => {
      const mgr = blendRef.current;
      if (mgr) {
        const now = performance.now();
        const recentViseme = animationStateRef.current.lastVisemeTime && 
                           (now - animationStateRef.current.lastVisemeTime) < 120;
        
        const decayRate = recentViseme ? 0.94 : 0.88;
        
        for (const [shapeName, value] of Object.entries(mgr.current)) {
          if (value > 0.002) {
            const decayed = value * decayRate;
            setShape(shapeName, decayed, false);
          } else if (value > 0) {
            setShape(shapeName, 0, false);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setShape]);

  // Enhanced blinking with more natural timing
  useEffect(() => {
    let raf = 0;
    let lastBlink = 0;
    
    const blinkOnce = () => {
      if (!blendRef.current?.available.has("eyeBlinkLeft")) return;
      setShape("eyeBlinkLeft", 1, false);
      setShape("eyeBlinkRight", 1, false);
      setTimeout(() => {
        setShape("eyeBlinkLeft", 0, true);
        setShape("eyeBlinkRight", 0, true);
      }, 140);
    };
    
    const loop = () => {
      const now = performance.now();
      
      if (now - lastBlink > 3000 && Math.random() < 0.006) {
        blinkOnce();
        lastBlink = now;
      }
      
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [setShape]);

  // Listen for viseme events with enhanced processing
  useEffect(() => {
    const onViseme = (evt: any) => {
      const d = evt?.detail ?? evt;
      const label = d?.viseme ?? d?.phoneme ?? d?.label ?? d?.id ?? "viseme_sil";
      const value = typeof d?.value === "number" ? d.value : 1.0;
      
      console.log(`Avatar received viseme: ${label} (${value})`);
      applyViseme(String(label), Number(value));
    };
    
    window.addEventListener("viseme", onViseme as any);
    window.addEventListener("phoneme", onViseme as any);
    return () => {
      window.removeEventListener("viseme", onViseme as any);
      window.removeEventListener("phoneme", onViseme as any);
    };
  }, [applyViseme]);

  return (
    <group ref={groupRef}>
      {gltf?.scene ? (
        <>
          <primitive object={gltf.scene} scale={1} position={[0, -1.6, 0]} />
          <EnvironmentMapping gltf={gltf} />
        </>
      ) : (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1.2, 0.8]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      )}
    </group>
  );
}

export default function RPMAvatar3D({
  character,
  isListening,
  isSpeaking,
  audioLevel,
  remoteAudioStream,
  avatarUrl,
  realtimeDC,
  onPhonemeSink,
}: RPMAvatar3DProps) {
  const lastVisemeAtRef = useRef<number>(0);

  // Set up global viseme testing function
  useEffect(() => {
    (window as any).__vis = (v: string, val = 1) => {
      console.log(`Manual viseme test: ${v} = ${val}`);
      window.dispatchEvent(new CustomEvent("viseme", { detail: { viseme: v, value: val } }));
    };
  }, []);

  // Enhanced DataChannel viseme handling
  useEffect(() => {
    if (!realtimeDC) return;
    
    const handler = (e: MessageEvent) => {
      let msg: any = null;
      try { msg = JSON.parse(e.data); } catch { return; }

      const t = msg?.type;
      const isVis =
        t === "response.viseme" ||
        t === "response.phoneme" ||
        t === "phoneme" ||
        (t === "response.event" && (msg?.event === "phoneme" || msg?.event === "viseme"));

      if (!isVis) return;

      const raw = msg?.viseme ?? msg?.phoneme ?? msg?.label ?? msg?.id ?? "SIL";
      const viseme = toOVRViseme(String(raw));
      const value =
        typeof msg?.value === "number"
          ? msg.value
          : typeof msg?.confidence === "number"
          ? msg.confidence
          : 1.0;

      console.log(`Direct AI viseme: ${raw} → ${viseme} (${value})`);
      
      window.dispatchEvent(new CustomEvent("viseme", { detail: { viseme, value } }));
      lastVisemeAtRef.current = performance.now();
      onPhonemeSink?.({ viseme, value });
    };

    realtimeDC.addEventListener("message", handler);
    return () => realtimeDC.removeEventListener("message", handler);
  }, [realtimeDC, onPhonemeSink]);

  const noVisemes = performance.now() - (lastVisemeAtRef.current || 0) > 1000;

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-purple-100 to-white rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} shadows>
        {/* Professional lighting setup similar to Ready Player Me */}
        
        {/* Main key light - soft and directional */}
        <directionalLight 
          position={[2, 4, 4]} 
          intensity={1.2} 
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        
        {/* Fill light - softer, opposite side */}
        <directionalLight 
          position={[-2, 3, 2]} 
          intensity={0.6} 
          color="#e8f4fd"
        />
        
        {/* Rim light - behind and above for edge lighting */}
        <directionalLight 
          position={[0, 5, -3]} 
          intensity={0.4} 
          color="#fff8e1"
        />
        
        {/* Ambient light - very soft global illumination */}
        <ambientLight intensity={0.3} color="#f0f8ff" />
        
        {/* Point lights for facial lighting */}
        <pointLight position={[1, 1, 2]} intensity={0.5} color="#ffffff" />
        <pointLight position={[-1, 1, 2]} intensity={0.3} color="#e3f2fd" />

        <Suspense fallback={
          <mesh>
            <boxGeometry args={[0.5, 1, 0.5]} />
            <meshStandardMaterial color="purple" />
          </mesh>
        }>
          <RPMAvatar character={character} avatarUrl={avatarUrl} />
        </Suspense>

        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          maxDistance={6}
          minDistance={1.5}
        />
      </Canvas>

      {/* Enhanced test buttons */}
      <div className="absolute top-4 left-4 flex gap-1 flex-wrap max-w-md">
        {["aa","O","I","E","SS","PP","TH","FF","DD","kk","CH","RR","nn"].map(v => (
          <button
            key={v}
            onClick={() => (window as any).__vis?.(`viseme_${v}`, 1)}
            className="bg-black/60 text-white px-2 py-1 rounded text-xs hover:bg-black/80 transition-all"
          >
            {v}
          </button>
        ))}
        
        <button
          onClick={() => (window as any).__vis?.("viseme_sil", 1)}
          className="bg-red-500/80 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
        >
          SIL
        </button>
      </div>

      {/* Status indicators */}
      <div className="absolute top-4 right-4 flex gap-2 flex-col items-end">
        {isListening && (
          <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">
            Listening
          </div>
        )}
        {isSpeaking && (
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
            AI Speaking
          </div>
        )}
      </div>

      {/* Character and sync status */}
      <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm">
        Ready Player Me — {character}
      </div>

      <div className="absolute bottom-16 left-4">
        <VisemeBadge lastAtRef={lastVisemeAtRef} />
      </div>

      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded text-xs">
        {noVisemes ? "Natural idle animation active" : "Audio-synced lip sync active"}
      </div>
    </div>
  );
}

// Preload the avatar model
useGLTF.preload("/models/rpm_avatar.glb?v=5");