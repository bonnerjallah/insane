import { useEffect } from "react"
import * as THREE from "three"
import * as CANNON from "cannon-es"
import CannonDebugger from "cannon-es-debugger"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"
import videoSrc from "../../videos.json"

import style from "../styles/style.module.css"



const Homepage = () => {

    useEffect(() => {
        const canvas = document.getElementById("myCanvas")
        const renderer = new THREE.WebGLRenderer({ canvas,  antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000);
        camera.position.set(5, 5, 10);



        //LIGHTS
        const ambientLights = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLights);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        scene.add(directionalLight)
        directionalLight.position.set(0, 10, 0)


        //CANNON WORLD
        const world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });

        // const cannonDebugger = new CannonDebugger(scene, world)

        /* groun body */
        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            material: new CANNON.Material("ground"),
            shape: new CANNON.Plane()
        });
        groundBody.material.restitution = 0.8
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(groundBody);


        /*sphere body */
        const sphereBody = new CANNON.Body({
            shape: new CANNON.Sphere(0.13),
            mass: 1,
            position: new CANNON.Vec3(0, 5, 2),
            material: new CANNON.Material(),
            angularVelocity: new CANNON.Vec3(10, 0, 0),
            linearDamping: 0.2,
            angularDamping: 0.5
        })
        sphereBody.material.restitution = 0.5
        world.addBody(sphereBody)


        //GLTF LOADERS

        const gltfLoader = new GLTFLoader();

        /* stadium */
        gltfLoader.load("stadium/scene.gltf", (gltf) => {
            const stadium = gltf.scene;
            const scale = 2;

            stadium.scale.set(scale, scale, scale);

            stadium.position.set(23.5, -1.1, 45)
            stadium.rotation.y = Math.PI / 2
            
            scene.add(stadium);
        });

        /* football */
        let football;
        gltfLoader.load("football/scene.gltf", (gltf) => {
            football = gltf.scene
            const scale = 0.003

            football.scale.set(scale, scale, scale)

            scene.add(football)
        })


        // Mouse Events for Velocity
        let x, y;
        document.addEventListener("mousedown", (e) => {
            x = e.clientX;
            y = e.clientY;
        });

        document.addEventListener("mouseup", (e) => {
            if (x !== null && y !== null) {
                const dx = (e.clientX - x) * 0.01; // Scaling factor to adjust speed
                const dy = (e.clientY - y) * 0.01; // Scaling factor to adjust speed
                
                
                const mag = Math.sqrt(dx * dx + dy*dy)

        
                sphereBody.velocity.set(dx, mag, dy);
        
                // Reset x and y
                x = null;
                y = null;
            }
        });

        

        //VIDEO SCREENS

        const screens = [];
        const rowSize = 4;
        const videoWidth = 1.778;
        const videoHeight = 1;
        const videoThickness = 0.05;

        const xOffset = -6;
        const zOffset = -3;
        const yOffset = videoHeight + 0.1

        const spacing = 0.15;
        const videoWidthThree = videoWidth * 2;
        const videoHeightThree = videoHeight * 2;


        const getVideoObject = (scene) => {
            let i = screens.length 

            const video = document.createElement("video")
            video.src = videoSrc[i].src
            video.dataset.title = videoSrc[i].title

            const videoTexture = new THREE.VideoTexture(video)
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.format = THREE.RGBAFormat

            const boxMesh = new THREE.Mesh(
                new THREE.BoxGeometry(
                    videoWidthThree,
                    videoHeightThree,
                    videoThickness * 2 
                ),
                new THREE.MeshBasicMaterial({
                    map: videoTexture
                })
            )

            addBorderBox(boxMesh)
            scene.add(boxMesh)

            return{
                video,
                boxMesh
            }
        }

        //add border around screen function
        const addBorderBox = (boxMesh) => {
            const borderMesh = new THREE.Mesh(
                new THREE.BoxGeometry(
                    videoWidthThree + 0.1,
                    videoHeightThree + 0.1,
                    videoThickness
                ),
                new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0
                })
            )
            boxMesh.add(borderMesh)
        }

        const updateBoxOpacity = (boxMesh, opacity) => {
            const material = boxMesh.children[0].material;
            material.opacity = opacity;
            material.needsUpdate = true;
        }





        const createScreen = ( world, scene ) => {
            for (let i = 0; i < 12; i++) {
                addScreen( world, scene )

            }
        }

        const addScreen = ( world, scene ) => {
            const rowPos = screens.length % rowSize;
            const colPos = Math.floor(screens.length / rowSize)

            const screenShape = new CANNON.Box(
                new CANNON.Vec3(videoWidth, videoHeight, videoThickness)
            )

            const screenBody = new CANNON.Body({
                mass: 0,
                shape: screenShape,
            })
            screenBody.position.set(
               xOffset + (videoWidthThree + spacing)  * rowPos, 
               yOffset + (videoHeightThree + spacing) * colPos, 
                zOffset
            )

            world.addBody(screenBody)

            const vidObj = getVideoObject(scene)
            vidObj.boxMesh.position.copy(screenBody.position) 

            screens.push({
                body: screenBody,
                ...vidObj
            })
        }

        createScreen(world, scene)

        
        //COLLISION FUNCTION
        let currentScreen;
        const setupCollisions = (sphereBody, screens) => {
            sphereBody.addEventListener("collide", (e) => {
                const {body} = e;
                const screen = screens.find(elem => elem.body === body)
                if(!screen) return

                if (currentScreen === screen) {
                    screen.video.pause ? screen.video.play() : screen.video.pause()
                } else {
                    if (currentScreen) {
                        const {video, boxMesh} = currentScreen
                        video.pause()
                        updateBoxOpacity(boxMesh, 0.0)
                    }
                    currentScreen = screen
                    const {video, boxMesh} = currentScreen;
                    video.play()
                    updateBoxOpacity(boxMesh, 0.5)
                }
            })
        }

        setupCollisions(sphereBody, screens)





        const timestep = 1 / 60


        const camereOffset = new THREE.Vector3(0, 0.5, 2)

        //ANIMATION FUNCTION

        const animate = () => {
            world.step(timestep)

            if(football) {
                football.position.copy(sphereBody.position)
                football.quaternion.copy(sphereBody.quaternion)

                camera.position.copy(sphereBody.position).add(camereOffset)
            }



            // cannonDebugger.update()
            renderer.render(scene, camera);
            window.requestAnimationFrame(animate);
        }





        const onWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        window.addEventListener("resize", onWindowResize, false);

        animate();


    }, []);



    return (
        <div>
            <canvas id="myCanvas" />
        </div>
    )
}

export default Homepage