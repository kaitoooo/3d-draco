import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import throttle from 'lodash.throttle';
import { gsap } from 'gsap';

export default class WebGL {
    winSize: {
        [s: string]: number;
    };
    elms: {
        [s: string]: HTMLElement;
    };
    elmsAll: {
        [s: string]: NodeListOf<HTMLElement>;
    };
    dpr: number;
    three: {
        scene: THREE.Scene;
        renderer: THREE.WebGLRenderer | null;
        clock: THREE.Clock;
        redraw: any;
        camera: THREE.PerspectiveCamera | null;
        cameraFov: number;
        cameraAspect: number;
        cameraFar: number;
    };
    texture: {
        bakedMaterial: THREE.MeshBasicMaterial | null;
        map: null;
    };
    sp: boolean;
    ua: string;
    mq: MediaQueryList;
    srcObj: string;
    srcTexture: string;
    flg: {
        [s: string]: boolean;
    };
    constructor() {
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
        };
        this.elms = {
            canvas: document.querySelector('[data-canvas]'),
            mvTitle: document.querySelector('[data-mv="title"]'),
            mvHomeLink: document.querySelector('[data-mv="homeLink"]'),
            mvNoteLink: document.querySelector('[data-mv="noteLink"]'),
            mvGitLink: document.querySelector('[data-mv="gitLink"]'),
        };
        this.elmsAll = {
            buttons: document.querySelectorAll('[data-button]'),
            mvSubText: document.querySelectorAll('.mv__sub-text'),
        };
        // デバイスピクセル比(最大値=2)
        this.dpr = Math.min(window.devicePixelRatio, 2);
        this.three = {
            scene: null,
            renderer: null,
            clock: null,
            redraw: null,
            camera: null,
            cameraFov: 75,
            cameraAspect: window.innerWidth / window.innerHeight,
            cameraFar: 100,
        };
        this.texture = {
            bakedMaterial: null,
            map: null,
        };
        this.sp = null;
        this.ua = window.navigator.userAgent.toLowerCase();
        this.mq = window.matchMedia('(max-width: 768px)');
        this.srcObj = './obj/banana-d.glb';
        this.srcTexture = '/img/bake-banana.png';
        this.flg = {
            loaded: false,
        };
        this.init();
    }
    init(): void {
        this.getLayout();
        this.initScene();
        this.initCamera();
        this.initClock();
        this.initRenderer();
        this.setModels();
        this.handleEvents();

        if (this.ua.indexOf('msie') !== -1 || this.ua.indexOf('trident') !== -1) {
            return;
        } else {
            this.mq.addEventListener('change', this.getLayout.bind(this));
        }
    }
    getLayout(): void {
        this.sp = this.mq.matches ? true : false;
    }
    initScene(): void {
        // シーンを作成
        this.three.scene = new THREE.Scene();
    }
    initCamera(): void {
        // カメラを作成(視野角, スペクト比, near, far)
        this.three.camera = new THREE.PerspectiveCamera(this.three.cameraFov, this.winSize.wd / this.winSize.wh, this.three.cameraAspect, this.three.cameraFar);
        this.three.camera.position.set(0, 0, 9);
    }
    initClock(): void {
        // 時間計測用
        this.three.clock = new THREE.Clock();
    }
    initRenderer(): void {
        // レンダラーを作成
        this.three.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true, //背景色を設定しないとき、背景を透明にする
        });
        // this.three.renderer.setClearColor(0xffffff); //背景色
        this.three.renderer.setPixelRatio(this.dpr); // retina対応
        this.three.renderer.setSize(this.winSize.wd, this.winSize.wh); // 画面サイズをセット
        this.three.renderer.physicallyCorrectLights = true;
        this.elms.canvas.appendChild(this.three.renderer.domElement); // HTMLにcanvasを追加
        this.three.renderer.outputEncoding = THREE.GammaEncoding; // 出力エンコーディングを定義
    }
    loadTextures(): void {
        const objTextureLoader = new THREE.TextureLoader();
        const colorTexturePink = objTextureLoader.load(this.srcTexture);
        this.texture.bakedMaterial = new THREE.MeshBasicMaterial({ map: colorTexturePink });
        colorTexturePink.flipY = false;
    }
    setModels() {
        this.loadTextures();

        // glTF形式の3Dモデルを読み込む
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load(this.srcObj, (obj) => {
            const children = [...obj.scene.children];
            for (const child of children) {
                // 3Dモデルをredrawに入れる
                this.three.redraw = child;
                // 3Dのサイズ設定
                child.scale.set(this.sp ? 1 : 1, this.sp ? 1 : 1, this.sp ? 1 : 1);

                obj.scene.traverse((child: any) => {
                    // マテリアルを設定
                    child.material = this.texture.bakedMaterial;
                });

                // シーンに3Dモデルを追加
                this.three.scene.add(child);
            }
            this.flg.loaded = true;
            // レンダリングを開始する
            this.rendering();
            this.actionButtons();
        });
    }
    rendering(): void {
        // 経過時間取得
        const time = this.three.clock.getElapsedTime();
        this.three.redraw.position.y += Math.sin(time) * 0.0025;
        this.three.redraw.rotation.y += Math.cos(time) * 0.0015;

        // レンダリングを実行
        this.three.renderer.render(this.three.scene, this.three.camera);
        requestAnimationFrame(this.rendering.bind(this));
        this.animate(); // アニメーション開始
    }
    actionButtons(): void {
        if (this.sp !== true) {
            this.elmsAll.buttons.forEach((targets) => {
                targets.addEventListener(
                    'mouseover',
                    (i: any) => {
                        const buttonCategory = i.currentTarget.getAttribute('data-button-category');
                        if (buttonCategory) {
                            switch (buttonCategory) {
                                case 'red':
                                    this.actionRed();
                                    break;
                                case 'blue':
                                    this.actionBlue();
                                    break;
                                case 'yellow':
                                    this.actionYellow();
                                    break;
                                case 'green':
                                    this.actionGreen();
                                    break;
                                case 'pink':
                                    this.actionPink();
                                    break;
                                case 'orange':
                                    this.actionOrange();
                                    break;
                                case 'purple':
                                    this.actionPurple();
                                    break;
                                default:
                                    break;
                            }
                        }
                    },
                    false
                );
            });
        } else {
            this.elmsAll.buttons.forEach((targets) => {
                targets.addEventListener(
                    'click',
                    (i: any) => {
                        const buttonCategory = i.currentTarget.getAttribute('data-button-category');
                        if (buttonCategory) {
                            switch (buttonCategory) {
                                case 'red':
                                    this.actionRed();
                                    break;
                                case 'blue':
                                    this.actionBlue();
                                    break;
                                case 'yellow':
                                    this.actionYellow();
                                    break;
                                case 'green':
                                    this.actionGreen();
                                    break;
                                case 'pink':
                                    this.actionPink();
                                    break;
                                case 'orange':
                                    this.actionOrange();
                                    break;
                                case 'purple':
                                    this.actionPurple();
                                    break;
                                default:
                                    break;
                            }
                        }
                    },
                    false
                );
            });
        }
    }
    actionRed(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: Math.PI * 2,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#800000');
    }
    actionBlue(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: 0,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#000080');
    }
    actionYellow(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: Math.PI * 2,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#ffff00');
    }
    actionGreen(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: 0,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#008000');
    }
    actionPink(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: Math.PI * 2,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#ff00ff');
    }
    actionOrange(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: 0,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#ff8c00');
    }
    actionPurple(): void {
        gsap.to(this.three.redraw.rotation, {
            duration: 1,
            ease: 'power2.easeOut',
            y: Math.PI * 2,
        });
        this.texture.bakedMaterial.color = new THREE.Color('#4b0082');
    }
    animate() {
        gsap.config({
            force3D: true,
        });
        const tl = gsap.timeline({
            paused: true,
            defaults: {
                duration: 0.6,
                ease: 'power2.easeOut',
            },
        });
        tl.to(this.elms.canvas, {
            duration: 1,
            opacity: 1,
        });
        tl.to(
            this.elms.mvTitle,
            {
                opacity: 1,
                y: 0,
            },
            1
        );
        tl.to(
            this.elmsAll.mvSubText,
            {
                opacity: 1,
                stagger: 0.05,
                scale: 1,
            },
            1.5
        );
        tl.to(
            this.elmsAll.buttons,
            {
                y: 0,
            },
            2.5
        );
        tl.to(
            this.elms.mvHomeLink,
            {
                y: 0,
            },
            2.7
        );
        tl.to(
            this.elms.mvNoteLink,
            {
                y: 0,
            },
            2.7
        );
        tl.to(
            this.elms.mvGitLink,
            {
                y: 0,
            },
            2.7
        );
        tl.play();
    }
    handleEvents(): void {
        // リサイズイベント登録
        window.addEventListener(
            'resize',
            throttle(() => {
                this.handleResize();
            }, 100),
            false
        );
    }
    handleResize(): void {
        // リサイズ処理
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
        };
        this.dpr = Math.min(window.devicePixelRatio, 2);
        if (this.three.camera) {
            // カメラの位置更新
            this.three.camera.aspect = this.winSize.wd / this.winSize.wh;
            this.three.camera.updateProjectionMatrix();
        }
        if (this.three.renderer) {
            // レンダラーの大きさ更新
            this.three.renderer.setSize(this.winSize.wd, this.winSize.wh);
            this.three.renderer.setPixelRatio(this.dpr);
        }
    }
}
