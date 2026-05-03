import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createNoise2D, createNoise3D } from 'simplex-noise';

window.THREE = THREE;
window.PointerLockControls = PointerLockControls;
window.createNoise2D = createNoise2D;
window.createNoise3D = createNoise3D;
