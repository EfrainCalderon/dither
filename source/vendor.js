import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
window.THREE = Object.assign({}, THREE, { MeshSurfaceSampler });
