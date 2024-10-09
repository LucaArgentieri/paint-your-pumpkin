<script setup>
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ACESFilmicToneMappingShader } from 'three/addons/shaders/ACESFilmicToneMappingShader.js';
import { N8AOPass } from "n8ao"
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const modalIsOpen = ref(false)

const canvasRef = ref(null)
const color = ref('#ffffff')
const size = ref(7)

const initScene = () => {
    let paint = false;

    const clock = new THREE.Clock()

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.setPixelRatio((window.devicePixelRatio) ? window.devicePixelRatio : 1);
    canvasRef.value.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.2);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enabled = true;
    controls.mouseButtons = {
        RIGHT: THREE.MOUSE.ROTATE,
    }
    controls.minDistance = 2
    controls.maxDistance = 5

    // Model
    const loader = new GLTFLoader();
    let model = null;
    let originalMap = null;
    let overlayMap = null;
    let textureCanvas = null;
    let drawingContext = null;
    let material = null;

    loader.load('/model/pumpkin/pumpkin.gltf', function (gltf) {
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
    },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error(error);
        });

    const drawOnOverlay = (uv) => {
        const x = uv.x * textureCanvas.width;
        const y = (1 - uv.y) * textureCanvas.height;

        drawingContext.beginPath();
        drawingContext.arc(x, y, size.value, 0, 2 * Math.PI);
        drawingContext.fillStyle = color.value;
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

    //Postprocessing
    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const n8aopass = new N8AOPass(scene, camera, window.innerWidth, window.innerHeight, {
        intensity: 1.5,
        distance: 0.3,
        resolutionScale: 0.75,
        samples: 16,
    });
    n8aopass.configuration.gammaCorrection = false;
    composer.addPass(n8aopass);

    const luminosityPass = new ShaderPass(ACESFilmicToneMappingShader);
    composer.addPass(luminosityPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,   // Bloom intensity
        0.4,   // Bloom radius
        0.85   // Threshold
    );
    composer.addPass(bloomPass);

    const taaPass = new TAARenderPass(scene, camera);
    taaPass.sampleLevel = 2;
    composer.addPass(taaPass);


    const outputPass = new OutputPass();
    composer.addPass(outputPass);


    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        n8aopass.setSize(window.innerWidth, window.innerHeight);
        taaPass.setSize(window.innerWidth, window.innerHeight);
    };

    function animate() {

        const elapsedTime = clock.getElapsedTime()

        // if (model) {
        //     model.rotation.x = elapsedTime * 0.1;
        //     model.rotation.y = elapsedTime * 0.1;
        // }

        raycaster.setFromCamera(pointer, camera);
        controls.update();
        // renderer.render(scene, camera);
        composer.render();

    }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button === 0) {
            paint = true
        }
    });
    window.addEventListener('pointermove', (e) => onMouseMove(e));
    window.addEventListener('pointerup', () => paint = false);


    requestAnimationFrame(animate);

};

onMounted(() => {
    initScene()
})

</script>

<template>
    <div class="absolute left-0 top-0 w-full h-full z-[2]" ref="canvasRef"></div>

    <div class="absolute left-[5%] bottom-[5%] bg-[transparent] border-none z-[3]">
        <button @click="modalIsOpen = !modalIsOpen">
            <GhostSvg :color="color" />
        </button>

        <Transition>
            <div v-if="modalIsOpen"
                class="tooltip absolute bottom-[40px] right-0 translate-x-full bg-white w-[60vw] lg:w-[25vw] rounded-lg p-s">
                <label class="button__color" for="color">
                    <input type="color" name="color" id="color" v-model="color" />
                </label>
                <label class="button__size" for="size">
                    <input type="range" name="size" id="size" min="1" max="15" v-model="size">
                </label>
            </div>
        </Transition>
    </div>

</template>

<style scoped>
input[type='color'] {
    appearance: none;
    background-color: transparent;
    width: 100px;
    height: 100px;
    border: none;
    cursor: pointer;
}

input[type='color']::-webkit-color-swatch {
    border-radius: 100%;
    border: 1px solid #000000;
}

.tooltip::after {
    content: " ";
    position: absolute;
    bottom: -20px;
    left: 20px;
    z-index: 5;
    margin-left: -10px;
    border-width: 10px;
    border-style: solid;
    border-color: white transparent transparent transparent;
}

.v-enter-active,
.v-leave-active {
    transition: opacity 0.3s ease-out;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}
</style>