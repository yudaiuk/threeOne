  const LABEL_TEXT = 'THREE.JS';

  const clock = new THREE.Clock();
  const scene = new THREE.Scene();

  // Create a new framebuffer we will use to render to the video card memory (ビデオカードメモリへのレンダリングに使用する新しいフレームバッファを作成します)
  // フレームバッファとは・・・コンピュータ内部で一画面分の表示内容を丸ごと記憶しておくことができるメモリ領域やメモリ装置の事
  let renderBufferA = new THREE.WebGLRenderTarget(
    innerWidth * devicePixelRatio,
    innerHeight * devicePixelRatio
  );

  // create a second framebuffer (2番目のフレームバッファを作成します)
  let renderBufferB = new THREE.WebGLRenderTarget(
    innerWidth * devicePixelRatio,
    innerHeight * devicePixelRatio
  )

  // Create a second scene that will hold our fullscreen plane (フルスクリーンのplaneを保持する2番目のシーンを作成する)
  const postFXScene = new THREE.Scene();

  // Create a plane geometry that covers the entire screen (画面全体をカバーする平面ジオメトリを作成します)
  const postFXGeometry = new THREE.PlaneBufferGeometry(innerWidth, innerHeight);

  // Create a plane material that expects a sampler texture input (サンプラーテクスチャ入力を期待する平面マテリアルを作成します)
  // We will pass our generated framebuffer texture to it (生成されたフレームバッファテクスチャをそれに渡します)
  const postFXMaterial = new THREE.ShaderMaterial({
    uniforms: {
      sampler: { value: null },
      time: { value: 0 },
      mousePos: { value: new THREE.Vector2(0, 0) }
    },
    // vertex shader will be in charge of positioning our plane correctly (頂点シェーダーは、平面を正しく配置する役割を果たします)
    vertexShader: `
      varying vec2 v_uv;
      
      void main () {
        // Set the correct position of each plane vertex (格平面頂点の正しい位置を設定します)
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

        // Pass in the correct UVs to the fragment shader (正しいuvをフラグメントシェーダーに渡します)
        v_uv = uv;
      }`,
      fragmentShader: `
        // Declare our texture input as a "sampler" variable (テクスチャ入力をサンプラー変数として宣言します)
        uniform float time;
        uniform vec2 mousePos;
        uniform sampler2D sampler;
        
        // Consume the correct UVs from the vertex shader to use (使用する頂点シェーダーから正しいUVを消費します)
        // When displaying the generated texture (生成されたテクスチャを表示する時)
        varying vec2 v_uv;

        //	Simplex 3D Noise 
        //	by Ian McEwan, Ashima Arts
        //
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  
        float snoise(vec3 v){ 
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  
        // First corner
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 =   v - i + dot(i, C.xxx) ;
  
        // Other corners
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
  
          //  x0 = x0 - 0. + 0.0 * C 
          vec3 x1 = x0 - i1 + 1.0 * C.xxx;
          vec3 x2 = x0 - i2 + 2.0 * C.xxx;
          vec3 x3 = x0 - 1. + 3.0 * C.xxx;
  
        // Permutations
          i = mod(i, 289.0 ); 
          vec4 p = permute( permute( permute( 
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  
        // Gradients
        // ( N*N points uniformly over a square, mapped onto an octahedron.)
          float n_ = 1.0/7.0; // N=7
          vec3  ns = n_ * D.wyz - D.xzx;
  
          vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)
  
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
  
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
  
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
  
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
  
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
  
        //Normalise gradients
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
  
        // Mix final noise value
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                        dot(p2,x2), dot(p3,x3) ) );
        }

        void main () {
          float a = snoise(vec3(v_uv * 1.0, time * 0.1)) * 0.0032;
          float b = snoise(vec3(v_uv * 1.0, time * 0.1 + 100.0)) * 0.0032;
          // Sample the correct color from the generated texture (生成されたテクスチャから正しい色をサンプリングします)
          vec4 inputColor = texture2D(sampler, v_uv + vec2(a, b) + mousePos * 0.005);

          // Set the correct color of each pixel that makes up the plane (平面を構成する各ピクセルの正しい色を設定します)
          gl_FragColor = vec4(inputColor * 0.975);
        }`
  })

  const postFXMesh = new THREE.Mesh(postFXGeometry, postFXMaterial);
  postFXScene.add(postFXMesh);

  // Create a threejs renderer
  // 1. Size it correctly (正しいサイズにする)
  // 2. Set default background color (デフォルトの背景色を設定する)
  // 3. Append it to the page (ページに追加する)
  const renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x222222);
  renderer.setClearAlpha(0);
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio || 1);
  document.body.appendChild(renderer.domElement);

  // Create an orthographic camera that covers the entire screen (画面全体をカバーする正投影カメラを作成します)
  // 正投影カメラとは (3次元物体をそのまま2次元に投影したもの)
  // 1. Position it correctly in the position z dimension (zの位置を正しく配置)
  // 2. Orient it towards the scene center (sceneの中心に向けます)
  const orthoCamera = new THREE.OrthographicCamera(
    -innerWidth / 2,
    innerWidth / 2,
    innerHeight / 2,
    -innerHeight / 2,
    0.1,
    10
  );
  orthoCamera.position.set(0, 0, 1);
  orthoCamera.lookAt(new THREE.Vector3(0, 0, 0));

  // Create a plane geometry that spawns either the entire (全体のいずれかを生成する平面ジオメトリを作成します)
  // viewport height or width depending on which one is bigger (viewportの高さまたは幅はどちらが大きいかによって異なります)
  const labelMeshSize = innerWidth > innerHeight ? innerHeight : innerWidth;
  const labelGeometry = new THREE.PlaneBufferGeometry(
    labelMeshSize,
    labelMeshSize
  );

  // Programmaticaly create a texture that will hold the text (プログラムでテキストを保持するテクスチャを作成します)
  let labelTextureCanvas
  {
    // Canvas and corresponding context2d to be used for drawing the text (テキストの描画に使用されるキャンバスと対応するcontext2d)
    labelTextureCanvas = document.createElement('canvas');
    const labelTextureCtx = labelTextureCanvas.getContext('2d');

    // Dynamic texture size based on the device capabilities (デバイスの機能に基づく動的テクスチャサイズ)
    const textureSize = Math.min(renderer.capabilities.maxTextureSize, 2048);
    const relativeFontSize = 20

    // Size out text canvas (テキストキャンバスのサイズを変更します)
    labelTextureCanvas.width = textureSize;
    labelTextureCanvas.height = textureSize;
    labelTextureCtx.textAlign = 'center';
    labelTextureCtx.textBaseline = 'middle';

    // Dynamic font size based on the texture size (テクスチャサイズに基づく動的フォントサイズ)
    // based on the device capabilities (デバイスの機能に基づく)
    labelTextureCtx.font = `${relativeFontSize}px Helvetica`
    const textWidth = labelTextureCtx.measureText(LABEL_TEXT).width;
    const widthDelta = labelTextureCanvas.width / textWidth;
    const fontSize = relativeFontSize * widthDelta;
    labelTextureCtx.font = `${fontSize}px Helvetica`;
    labelTextureCtx.fillStyle = 'white';
    labelTextureCtx.fillText(LABEL_TEXT, labelTextureCanvas.width / 2,
      labelTextureCanvas.height / 2);
  }

  // Create a material with our programmaticaly created text (プログラムで作成されたテキストを使用してマテリアルを作成する)
  // texture as input (入力としてのテクスチャ)
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(labelTextureCanvas),
    transparent: true,
  });

  // Create a plane mesh, add it to the scene (平面メッシュを作成し、シーンに追加します)
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
  scene.add(labelMesh);

  
  // Start out animation render loop (アニメーションレンダリンググループを開始します)
  renderer.setAnimationLoop(onAnimLoop);
  
  document.addEventListener('mousemove', onMouseMove);

  function onMouseMove (e) {
    const x = (e.pageX / innerWidth) * 2 - 1;
    const y = (1 - e.pageY / innerHeight) * 2 - 1;
    postFXMesh.material.uniforms.mousePos.value.set(x, y);
  }

  function onAnimLoop() {
    // Do not clear the contents of the canvas on each render (各レンダリングでキャンバスのコンテンツをクリアしないでください)
    // In order to achieve our ping-pong effect, we must draw the new frame on top of the previous one
    // ping-pong effect を実現するには、前のフレームの上に新しいフレームを描画する必要があります
    renderer.autoClearColor = false;

    // Explicitly set renderBufferA as the framebuffer to render to (レンダリング先のフレームバッファとしてrenderbufferaを明示的に設定します)
    renderer.setRenderTarget(renderBufferA);

    // Render the postFXScene to renderBufferA (postFXSceneをrenderBufferAにレンダリングします)
    // This will contain our ping-pong accumulated texture (これにはping-pongで蓄積されたテクスチャが含まれます)
    renderer.render(postFXScene, orthoCamera);

    // On each new frame, render the scene to the default framebuffer (新しいフレームごとに、シーンをデフォルトのフレームバッファにレンダリングします)
    renderer.render(scene, orthoCamera);

    // Set the device screen as the framebuffer to render to In WebGL (webglでレンダリングするフレームバッファとしてデバイス画面を設定します)
    // framebuffer "null" corresponds to the default (framebuffer "null"はデフォルトに対応します)
    renderer.setRenderTarget(null);

    // Assign the generated texture to the sampler variable used in the postFXMesh that covers the device screen
    // 生成されたテクスチャを、デバイス画面をカバーするpostFXMeshで使用されるサンプラー変数に割り当てます
    postFXMesh.material.uniforms.sampler.value = renderBufferA.texture;

    //render the postFX mesh to the default framebuffer (postFXメッシュをデフォルトのフレームバッファにレンダリングします)
    renderer.render(postFXScene, orthoCamera);

    // ping-pong our framebuffers by swapping them (framebufferを交換してping-pongします)
    // at the end of each frame render (各フレームの終わりにレンダリング)
    const temp = renderBufferA;
    renderBufferA = renderBufferB;
    renderBufferB = temp;
  }

  // 3時間15分(合計3時間15分)
  // 実行するとエラー (INVALID_OPERATION: useProgram: program not valid)
  // syntax errorと出ているのでコードを見直し
  // 30行目"vec2"が"vec"になっていたので"vec2"に書き直し実行
  // エラー解決 5分 (合計3時間20分)

  // 追加したタイミングで再びエラー
  // no valid shader program in use
  // 原因が分からず、一度コピーして貼り付けてみると動いた
  // 1時間15分(合計4時間35分)
  // よく見直してみるとinsert snoise funtion definition from the link above here
  // ここにリンクのものをはりつけてと書いてあった。
  // エラーにも定義されていないと書いてあったが、バージョン違いだと勘違いしていたので、遅れた。
  // 貼り付けると、ちゃんと動いた。
  // 6分(合計4時間41分)
  // githubにterminal使ってup(24分)
  // 合計(5時間5分)

  // それぞれのrender loopを画面に表示するのに必要なものを要約すると
  // 1. create renderTargetA framebuffer that will allow us to render to a separate texture in the users device video memory
  // ユーザーデバイスのビデオメモリ内の別のテクスチャにレンダリングできるようにするrenderTargetA framebufferを作成します。

  // 2.create our "ABC" plane mesh
  // ABCというプレーンメッシュを作成します

  // 3.render the "ABC" plane mesh to renderTargetA instead of the device screen
  // "ABC"plane meshをデバイス画面ではなく、renderTargetAにレンダリングします

  // 4.create a separate fullscreen plane mesh that expects a texture as an input to its material
  // マテリアルへの入力としてテクスチャを期待する別個のフルスクリーンplane meshを作成します

  // 5.render the fullscreen plane mesh back to the default framebuffer (device screen) using the generated texture created by rendering the "ABC" mesh to renderTargetA
  // "ABC"mesh をrenderTargetAにレンダリングすることによって作成されたテクスチャを使用して、フルスクリーンplane meshをデフォルトのframebufferにレンダリングします

  // 1. we render renderTargetB result to renderTargetA (renderTargetBの結果をrenderTargetAにレンダリングします)
  // 2. we render our "ABC" text to render targetA, compositing it on top of renderTargetB
  // result in step 1 (we do not clear the contents of the canvas on new renders, because we
  // set renderer.autoClearColor = false)
  // "ABC"テキストをレンダリングしてtargetAをレンダリングし、手順1でrenderTargetBの結果の上に合成します。
  // rendrer.autoClearColor = false, をしているので新しいレンダリングでキャンバスのコンテンツをクリアしません.

  // 3. we pass the generated renderTargetA texture to postFXMesh,apply a small offset
  // vec2(0.02) to its UVs when looking up the texture color and fade it out a bit by
  // multiplying the result by 0.975
  // 生成されたrenderTargetAテクスチャをpostFXMeshに渡し、テクスチャの色を検索するときにUVに
  // 小さなoffset vec2を適用し、結果に0.975を書けて少しフェードアウトします。

  // 4. we render postFXMesh to the device screen (postFXMeshをデバイス画面にレンダリングします)

  // 5. we swap renderTargetA with renderTargetB(ping-pong)
  // renderTargetAとrenderTargetBを交換します。