var gl;

function initGL(canvas) {
    try {
        console.log(canvas);
        gl = canvas.getContext("experimental-webgl");
        console.log(gl);
        gl.viewportWidth = canvas.width;
        console.log(canvas.width);
        gl.viewportHeight = canvas.height;

        gl.enable(gl.DEPTH_TEST);

        initShaders();

        initBuffers();
        initTexture();
    } catch (e) {}
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;
function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.camMatrixUniform = gl.getUniformLocation(shaderProgram, "uCamMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.nCamMatrixUniform = gl.getUniformLocation(shaderProgram, "uNCamMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
    shaderProgram.textureAlphaUniform = gl.getUniformLocation(shaderProgram, "uTextureAlpha");
    shaderProgram.useFlashlightUniform = gl.getUniformLocation(shaderProgram, "uUseFlashlight");
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");

    gl.uniform1i(shaderProgram.useFlashlightUniform, true);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var camMatrix = mat4.create();
var pMatrix = mat4.create();
function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    gl.useProgram(shaderProgram);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.camMatrixUniform, false, camMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);

    var normalCamMatrix = mat3.create();
    mat4.toInverseMat3(camMatrix, normalCamMatrix);
    mat3.transpose(normalCamMatrix);
    gl.uniformMatrix3fv(shaderProgram.nCamMatrixUniform, false, normalCamMatrix);

}

function loadModel(model) {
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, model.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, model.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    if(model.vertexTextureCoordBuffer) {
        //new
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, model.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    if(!model.vertexNormalBuffer) {
        model.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexNormalBuffer);
        
        
        model.normals = [];

        for(var i=0;i<model.indices.length;i+=3) {

            var verts = [];
            for(var j=0;j<3;j++) {
                verts[j] = vec3.create([ model.vertices[model.indices[i+j]*3], model.vertices[model.indices[i+j]*3+1], model.vertices[model.indices[i+j]*3+2]]);
            }
            vec3.negate(verts[0]);
            vec3.add(verts[1], verts[0]);
            vec3.add(verts[2], verts[0]);
            var normal = vec3.normalize(vec3.cross(verts[1], verts[2]));

            for(var j=0;j<3;j++) {
                model.normals[model.indices[i]*3+j] = model.normals[model.indices[i+1]*3+j] = model.normals[model.indices[i+2]*3+j] = normal[j];
            }
        }

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
        model.vertexNormalBuffer.itemSize = 3;
        model.vertexNormalBuffer.numItems = model.normals.length/3;

    }

    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, model.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    //let's load up the triangle's thinger
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.vertexIndexBuffer);

    //now let's compute a normal vector thinger

}

function renderModel(model) {

    //disable mouse rotation
    //mat4.rotateX(mvMatrix, mouseY * 3.14 * 3);
    //mat4.rotateY(mvMatrix, mouseX * 3.14 * 3);

    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, model.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}


var Pyramid;
var Cube;
var Floor;

var Skybox;

function initBuffers() {

    
    Pyramid.init(gl);

    
    Cube.init(gl);


    //Sphere.generate(32, 32);
    //console.log(JSON.stringify(Sphere));
    Sphere.init(gl);
    Sphere32x32.init(gl);

    Floor = new Model(
        "floor",
        [-100,0,-100, 100,0,-100, 100,0,100, -100,0,100],
        [0,1,0, 0,1,0, 0,1,0, 0,1,0],
        [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        [0,0, 0,10, 10,10, 10,0],
        [0,1,2, 0,2,3]
    );
    Floor.init(gl);

    Skybox = new Model(
        "skybox",
        [// Front face
-1.0, -1.0,  1.0,
1.0, -1.0,  1.0,
1.0,  1.0,  1.0,
-1.0,  1.0,  1.0,

// Back face
-1.0, -1.0, -1.0,
-1.0,  1.0, -1.0,
1.0,  1.0, -1.0,
1.0, -1.0, -1.0,

// Top face
-1.0,  1.0, -1.0,
-1.0,  1.0,  1.0,
1.0,  1.0,  1.0,
1.0,  1.0, -1.0,

// Bottom face
-1.0, -1.0, -1.0,
1.0, -1.0, -1.0,
1.0, -1.0,  1.0,
-1.0, -1.0,  1.0,

// Right face
1.0, -1.0, -1.0,
1.0,  1.0, -1.0,
1.0,  1.0,  1.0,
1.0, -1.0,  1.0,

// Left face
-1.0, -1.0, -1.0,
-1.0, -1.0,  1.0,
-1.0,  1.0,  1.0,
-1.0,  1.0, -1.0],
        //[0,0,1,0,0,1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,-1,0,0,-1,0,0],
        null,
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [
        // Front face
0.75, 0.25,
1.0, 0.25,
1.0, 0.5,
0.75, 0.5,

// Back face
0.5, 0.25,
0.5, 0.5,
0.25, 0.5,
0.25, 0.25,

// Top face
0.0, 0.5,
0.0, 1.0,
0.5, 1.0,
0.5, 0.5,

// Bottom face
1.0, 1.0,
0.0, 1.0,
0.0, 0.0,
1.0, 0.0,

// Right face
0.75, 0.25,
0.75, 0.5,
0.5, 0.5,
0.5, 0.25,

// Left face
0.0, 0.25,
0.25, 0.25,
0.25, 0.5,
0.0, 0.5
],
        [0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11, 12,13,14,12,14,15, 16,17,18,16,18,19, 20,21,22,20,22,23]
    );
    Skybox.init(gl);

}
var allImagesLoaded = false;
var imagesLoaded = 0;
var imagesTotal = 5;

var neheTexture;
var moonTexture;
var snowTexture;
var skyboxTexture;
var skybox2Texture;
function initTexture() {
    neheTexture = gl.createTexture();
    neheTexture.image = new Image();
    neheTexture.image.onload = function() {
        handleLoadedTexture(neheTexture);
    }
    neheTexture.image.src = "webgl_thingy/images/nehe.gif";

    moonTexture = gl.createTexture();
    moonTexture.image = new Image();
    moonTexture.image.onload = function() {
        handleLoadedTexture(moonTexture);
    }
    moonTexture.image.src = "webgl_thingy/images/moon.gif";

    snowTexture = gl.createTexture();
    snowTexture.image = new Image();
    snowTexture.image.onload = function() {
        handleLoadedTexture(snowTexture);
    }
    snowTexture.image.src = "webgl_thingy/images/snow.jpg";

    skyboxTexture = gl.createTexture();
    skyboxTexture.image = new Image();
    skyboxTexture.image.onload = function() {
        handleLoadedTexture(skyboxTexture);
    }
    skyboxTexture.image.src = "webgl_thingy/images/skybox.jpg";

    skybox2Texture = gl.createTexture();
    skybox2Texture.image = new Image();
    skybox2Texture.image.onload = function() {
        handleLoadedTexture(skybox2Texture);
    }
    skybox2Texture.image.src = "webgl_thingy/images/skybox2.jpg";
}
function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    imagesLoaded += 1;
    if(imagesLoaded >= imagesTotal) {
        allImagesLoaded = true;
    }
}

function drawScene(snowmen) {

    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    if(!allImagesLoaded) {
        return;
    }

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 500.0, pMatrix);


    mat4.identity(camMatrix);
    mat4.rotateX(camMatrix, GLPlayer.rotation.vertical);
    mat4.rotateY(camMatrix, GLPlayer.rotation.horizontal);

    //disable cam movement
    mat4.translate(camMatrix, [-GLPlayer.position.x, -GLPlayer.position.z-4, -GLPlayer.position.y]);

    mat4.identity(mvMatrix);

    //so an identity rotated and translated makes up the camera's coordinate system
    //disable cam rotation

    //skybox?
    mvPushMatrix();

        //scale to 200x200x200
        mat4.scale(mvMatrix, [100, 100, 100]);
        mat4.translate(mvMatrix, [0, 0.5, 0]);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, skyboxTexture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.uniform1i(shaderProgram.useTexturesUniform, true);
        gl.uniform1f(shaderProgram.textureAlphaUniform, 1.0);
        gl.uniform1i(shaderProgram.useLightingUniform, false);
        loadModel(Skybox);

        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        renderModel(Skybox);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);

    mvPopMatrix();

    mvPushMatrix();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, snowTexture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.uniform1i(shaderProgram.useTexturesUniform, true);
        gl.uniform1f(shaderProgram.textureAlphaUniform, 1.0);
        gl.uniform1i(shaderProgram.useLightingUniform, true);


        loadModel(Floor);
        renderModel(Floor);
    mvPopMatrix();

    mat4.translate(mvMatrix, [0, 3, 0]);

    
    

    mvPushMatrix();

        mat4.translate(mvMatrix, [0.0, 0.0, -20.0]);


        mvPushMatrix();

            mat4.translate(mvMatrix, [4.0, Math.cos(thingerRotation+Math.PI/2.0)*1.0, 0.0]);

            //mat4.rotateX(mvMatrix, mouseY * 3.14 * 3);
            //mat4.rotateY(mvMatrix, mouseX * 3.14 * 3);

            //newly necessary for textures
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, neheTexture);
            gl.uniform1i(shaderProgram.samplerUniform, 0);
           
            loadModel(Cube);

            gl.uniform1i(shaderProgram.useTexturesUniform, true);
            gl.uniform1f(shaderProgram.textureAlphaUniform, 0.5);
            renderModel(Cube);

        mvPopMatrix();


        mvPushMatrix();

            mat4.translate(mvMatrix, [-4, 0, 0]);

            //mat4.rotateX(mvMatrix, mouseY * 3.14 * 3);
            //mat4.rotateY(mvMatrix, mouseX * 3.14 * 3);
            
            loadModel(Pyramid);
            gl.uniform1i(shaderProgram.useTexturesUniform, false);
            gl.uniform1f(shaderProgram.textureAlphaUniform, 1);
            renderModel(Pyramid);

        mvPopMatrix();

        mvPushMatrix();

            mat4.translate(mvMatrix, [-3, -2, 0]);

            //mat4.rotateX(mvMatrix, mouseY * 3.14 * 3);
            //mat4.rotateY(mvMatrix, mouseX * 3.14 * 3);
            
            loadModel(Pyramid);
            gl.uniform1i(shaderProgram.useTexturesUniform, true);
            gl.uniform1f(shaderProgram.textureAlphaUniform, 1);
            renderModel(Pyramid);

        mvPopMatrix();



        mvPushMatrix();


            gl.uniform1i(shaderProgram.useTexturesUniform, true);
            var alpha = 1.0;
            alpha = alpha * 0.95;
            gl.uniform1f(shaderProgram.textureAlphaUniform, alpha);
            //gl.uniform1f(shaderProgram.textureAlphaUniform, 0.5);

            mat4.translate(mvMatrix, [0, 0, 2.0]);

            //mat4.rotateX(mvMatrix, mouseY * 3.14 * 3);
            //mat4.rotateY(mvMatrix, mouseX * 3.14 * 3);

            loadModel(Sphere32x32);

            var fractal = function(i) {
                mvPushMatrix();

                renderModel(Sphere32x32);
                var scale = 0.6;
                var scales = [scale, scale, scale];
                if(i > 0) {
                    mvPushMatrix();
                    mat4.translate(mvMatrix, [0, 1, 0]);
                    mat4.scale(mvMatrix, scales);
                    mat4.rotateY(mvMatrix, Math.PI/2.0);
                    fractal(i-1);
                    mvPopMatrix();

                    mat4.rotateX(mvMatrix, Math.PI/2.0);

                    mvPushMatrix();
                    mat4.translate(mvMatrix, [0, 1, 0]);
                    mat4.scale(mvMatrix, scales);
                    mat4.rotateY(mvMatrix, Math.PI/2.0);
                    fractal(i-1);
                    mvPopMatrix();

                    mat4.rotateX(mvMatrix, Math.PI/2.0);

                    mvPushMatrix();
                    mat4.translate(mvMatrix, [0, 1, 0]);
                    mat4.scale(mvMatrix, scales);
                    mat4.rotateY(mvMatrix, Math.PI/2.0);
                    fractal(i-1);
                    mvPopMatrix();

                    mat4.rotateX(mvMatrix, Math.PI/2.0);

                    mvPushMatrix();
                    mat4.translate(mvMatrix, [0, 1, 0]);
                    mat4.scale(mvMatrix, scales);
                    mat4.rotateY(mvMatrix, Math.PI/2.0);
                    fractal(i-1);
                    mvPopMatrix();
                }

                mvPopMatrix();
            }

            var fractal2 = function(i) {
                mvPushMatrix();

                alpha = alpha * 0.97;
                gl.uniform1f(shaderProgram.textureAlphaUniform, alpha);

                renderModel(Sphere32x32);
                var scale = 0.97;
                var scales = [scale, scale, scale];
                var translate = 0.3;
                var rotate = Math.PI/24;
                if(i > 0) {
                    mvPushMatrix();
                    mat4.rotateZ(mvMatrix, rotate);
                    mat4.translate(mvMatrix, [0, translate, 0]);
                    mat4.scale(mvMatrix, scales);
                    fractal2(i-1);
                    mvPopMatrix();
                }

                mvPopMatrix();
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, moonTexture);
            gl.uniform1i(shaderProgram.samplerUniform, 0);
            
            mat4.rotateX(mvMatrix, thingerRotation);
            fractal(5);
            /*renderModel(Sphere32x32);

            mat4.translate(mvMatrix, [0, 1, 0]);
            mat4.scale(mvMatrix, [0.5, 0.5, 0.5]);
            renderModel(Sphere32x32);*/


        mvPopMatrix();


    mvPopMatrix();

    //for each snowman, draw him!

    if(snowmen) {
        mvPushMatrix();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, snowTexture);
            gl.uniform1i(shaderProgram.samplerUniform, 0);

            gl.uniform1i(shaderProgram.useTexturesUniform, true);
            gl.uniform1f(shaderProgram.textureAlphaUniform, 1);

            loadModel(Sphere32x32);


            for(key in snowmen) {
                mvPushMatrix();
                    var snowman = snowmen[key];
                    var position = snowman.position;
                    mat4.translate(mvMatrix, [position.x, -1+position.z, position.y]);
                    mat4.rotateY(mvMatrix, Math.PI-snowman.input.angle);
                    
                    //renderModel(Sphere32x32);

                    //mat4.translate(mvMatrix, [-8, 0, 0]);

                    mat4.scale(mvMatrix, [2, 2, 2]);
                    renderModel(Sphere32x32);

                    mat4.translate(mvMatrix, [0, 1.3, 0]);
                    mat4.scale(mvMatrix, [0.7, 0.7, 0.7]);


                    renderModel(Sphere32x32);

                    mat4.translate(mvMatrix, [0, 0.3, 0.9]);
                    mat4.scale(mvMatrix, [0.2, 0.2, 0.2]);

                    mvPushMatrix();
                        mat4.translate(mvMatrix, [2, 0, 0]);
                        renderModel(Sphere32x32);
                    mvPopMatrix();

                    mvPushMatrix();
                        mat4.translate(mvMatrix, [-2, 0, 0]);
                        renderModel(Sphere32x32);
                    mvPopMatrix();


                mvPopMatrix();
            }

        mvPopMatrix();
    }

    mvPushMatrix();

        var radius = 20;
        var pyramids = 16;
        loadModel(Pyramid);

        for(var i=0;i<pyramids;i++) {
            mvPushMatrix();
            var angle = Math.PI*2*i/pyramids;
            var posX = Math.cos(angle)*radius;
            var posY = Math.sin(angle)*radius;
            //console.log(posX+", "+posY);

            mat4.translate(mvMatrix, [posX, 0, posY]);
            mat4.rotateY(mvMatrix, -angle);
            renderModel(Pyramid);
            mvPopMatrix();
        }

    mvPopMatrix();
}

var thingerRotation = 0;


var GLPlayer = {
    velocity: {
        x: 0,
        y: 0,
        z: 0
    },
    position: {
        x: 0,
        y: 0,
        z: 0
    },
    rotation: {
        horizontal: 0,
        vertical: 0
    }//,
    //flashlight: false
}
