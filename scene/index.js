import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const initScene = () => {
    let paint = false;

    const clock = new THREE.Clock()

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 0.15;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controls.enableDamping = true;
    controls.enabled = false;


    // Model
    const loader = new GLTFLoader();
    let model = null;
    let originalMap = null;
    let overlayMap = null;
    let textureCanvas = null;
    let drawingContext = null;
    let material = null;

    //'/model/lemon/lemon_1k.gltf'
    loader.load('/model/lemon/lemon_1k.gltf', function (gltf) {
        gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
                model = obj;
                model.geometry.center();

                // OG Texture
                originalMap = obj.material.map.clone();

                // Overlay canvas
                textureCanvas = document.createElement('canvas');
                textureCanvas.width = 1024;
                textureCanvas.height = 1024;
                drawingContext = textureCanvas.getContext('2d');

                // Transparent first render
                drawingContext.fillStyle = 'rgba(0, 0, 0, 0)';
                drawingContext.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

                overlayMap = new THREE.CanvasTexture(textureCanvas);
                overlayMap.needsUpdate = true;

                material = new THREE.MeshBasicMaterial({
                    map: originalMap,
                    transparent: true
                });

                // Add overlay as second map
                material.onBeforeCompile = (shader) => {
                    shader.uniforms.overlayMap = { value: overlayMap };

                    // Update verte with `vUv`
                    shader.vertexShader = `
                        varying vec2 vUv;
                        ${shader.vertexShader}
                    `.replace(
                        `#include <uv_vertex>`,
                        `
                        vUv = uv;
                        #include <uv_vertex>
                        `
                    );

                    // Update fragment shader to mix textures
                    shader.fragmentShader = `
                        uniform sampler2D overlayMap;
                        varying vec2 vUv;
                        ${shader.fragmentShader.replace(
                        `#include <map_fragment>`,
                        `
                            vec4 baseColor = texture2D(map, vUv);
                            vec4 overlayColor = texture2D(overlayMap, vUv);
                            diffuseColor = mix(baseColor, overlayColor, overlayColor.a);
                            `
                    )}
                    `;
                };

                model.material = material;

                scene.add(model);
            }
        });
    }, undefined, function (error) {
        console.error(error);
    });

    const drawOnOverlay = (uv) => {
        const x = uv.x * textureCanvas.width;
        const y = (1 - uv.y) * textureCanvas.height;

        drawingContext.beginPath();
        drawingContext.arc(x, y, 10, 0, 2 * Math.PI);
        drawingContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
        drawingContext.fill();

        overlayMap.needsUpdate = true;
    };

    const onMouseMove = (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (model) {
            const intersects = raycaster.intersectObject(model);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                const uv = intersect.uv;
                if (paint) {
                    drawOnOverlay(uv);
                }
            }
        }
    };

    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    function animate() {
        const elapsedTime = clock.getElapsedTime()

        if (model) {
            model.rotation.x = elapsedTime * 0.1;
            model.rotation.y = elapsedTime * 0.1;
        }


        raycaster.setFromCamera(pointer, camera);
        controls.update();
        renderer.render(scene, camera);
    }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointerdown', () => paint = true);
    window.addEventListener('pointermove', (e) => onMouseMove(e));
    window.addEventListener('pointerup', () => paint = false);

    requestAnimationFrame(animate);
};

