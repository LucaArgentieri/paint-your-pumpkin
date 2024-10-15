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
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
    import { FilmShader } from 'three/addons/shaders/FilmShader.js'

    const modelLoader = defineModel('loader')

    const modalIsOpen = ref(false)
    const canvasRef = ref(null)
    const color = ref('#000000')
    const size = ref(7)

    const initScene = () => {
        let paint = false;
        let model = null;
        let isAnimated = false;

        const clock = new THREE.Clock()

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setAnimationLoop(animate);
        renderer.setPixelRatio(1);
        canvasRef.value.appendChild(renderer.domElement);

        // Scene
        const scene = new THREE.Scene();
        const textureLoader = new THREE.TextureLoader();
        const backgroundTexture = textureLoader.load('./slide.jpg');
        const mobileBackgroundTexture = textureLoader.load('./mobileBg.jpg');
        scene.background = backgroundTexture;

        // Camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 1;
        camera.position.y = 0.3

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
        let originalMap = null;
        let overlayMap = null;
        let textureCanvas = null;
        let drawingContext = null;
        let material = null;

        loader.manager.onProgress = (url, loaded, total) => {
            modelLoader.value = Math.floor(loaded / total * 100)
        }

        loader.load('/model/pumpkin/pumpkin.gltf', function (gltf) {
            gltf.scene.traverse((obj) => {
                if (obj.isMesh) {
                    model = obj;
                    model.geometry.center();

                    // OG Texture
                    originalMap = obj.material.map.clone();

                    // Overlay canvas
                    textureCanvas = document.createElement('canvas');
                    textureCanvas.width = 2048;
                    textureCanvas.height = 2048;
                    drawingContext = textureCanvas.getContext('2d');

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
                            `
                            .replace(
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
        })

        //Postprocessing
        const renderPass = new RenderPass(scene, camera);

        const n8aopass = new N8AOPass(scene, camera, window.innerWidth, window.innerHeight, {
            intensity: 1.5,
            distance: 0.3,
            resolutionScale: 0.75,
            samples: 16,
        });
        n8aopass.configuration.gammaCorrection = true;

        const luminosityPass = new ShaderPass(ACESFilmicToneMappingShader);

        const taaPass = new TAARenderPass(scene, camera);
        taaPass.sampleLevel = 2;

        const filmPass = new ShaderPass(FilmShader);
        filmPass.uniforms['intensity'].value = 0.5;
        //Enable grayscale
        // filmPass.uniforms['grayscale'].value = false;

        const outputPass = new OutputPass();

        const composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(n8aopass);
        composer.addPass(luminosityPass);
        composer.addPass(taaPass);
        composer.addPass(filmPass);
        composer.addPass(outputPass);

        const drawOnOverlay = (uv) => {
            const x = uv.x * textureCanvas.width;
            const y = (1 - uv.y) * textureCanvas.height;


            const printColor = (colorValue) => {
                const color = colorValue
                const r = parseInt(color.substr(1, 2), 16)
                const g = parseInt(color.substr(3, 2), 16)
                const b = parseInt(color.substr(5, 2), 16)
                return [r, g, b]
            }

            drawingContext.beginPath();
            drawingContext.arc(x, y, size.value, 0, 2 * Math.PI);
            drawingContext.fillStyle = `rgba(${printColor(color.value)},0.5)`;

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

        const animateOnce = () => {
            if (!isAnimated) {
                isAnimated = true
                const tl = gsap.timeline()

                tl.from(model.scale, {
                    y: 0.5,
                    x: 0.5,
                    z: 0.5,
                    duration: 0.5,
                    delay: 0.8,
                    ease: "elastic.inOut(1,0.4)",
                })
                tl.to(model.rotation, {
                    y: Math.PI * 2,
                    duration: 1.5,
                    // delay: 0.6,
                    ease: 'Expo.easeInOut'
                })
                tl.from(document.querySelector('.ghost-svg'), {
                    opacity: 0,
                    duration: 1,
                    ease: "elastic.inOut(1,0.4)",
                    y: 10,
                })
            }

        }

        const setSceneBackground = () => {
            if (window.innerWidth < 640) {
                scene.background = mobileBackgroundTexture;
            } else {
                scene.background = backgroundTexture;
            }
        }

        const onWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            setSceneBackground()

            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
            n8aopass.setSize(window.innerWidth, window.innerHeight);
            taaPass.setSize(window.innerWidth, window.innerHeight);
        };

        function animate() {
            // const elapsedTime = clock.getElapsedTime()
            let delta = clock.getDelta();
            filmPass.uniforms['time'].value += delta * 1;

            if (model) {
                animateOnce()
            }

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

        setSceneBackground()
    };

    onMounted(() => {
        initScene()
    })

</script>

<template>
    <div class="absolute left-0 top-0 w-full h-full z-[2]" ref="canvasRef"></div>
    <div class="absolute left-[5%] bottom-[5%] bg-[transparent] border-none z-[3]">
        <GhostButton @click="modalIsOpen = !modalIsOpen" />
        <Tooltip :modalIsOpen v-model:color="color" v-model:size="size" />
    </div>
</template>
