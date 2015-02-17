/*var ModelLoader = function(gl) {
    this.gl = gl;

    this.loadedModel = null;
}
ModelLoader.prototype.loadModel = function(model) {

}*/

var Model = function(name, vertices, normals, colors, textureCoords, indices){
	this.name 						= name;
	this.vertices 		= vertices;
    this.normals        = normals;
	this.colors 		= colors;
	this.textureCoords 	= textureCoords;
	this.indices 		= indices;

    this.vertexPositionBuffer       = null;
    this.vertexNormalBuffer         = null;
	this.vertexColorBuffer 			= null;
	this.vertexTextureCoordBuffer 	= null;
	this.vertexIndexBuffer 			= null;

    this.gl = null;
}

Model.prototype.init = function(gl) {
    this.gl = gl;
	this.vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    this.vertexPositionBuffer.itemSize = 3;
    this.vertexPositionBuffer.numItems = this.vertices.length/3;

    if(this.normals && this.normals.length > 0) {
        this.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        this.vertexNormalBuffer.itemSize = 3;
        this.vertexNormalBuffer.numItems = this.normals.length/3;
    }

    this.vertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
    this.vertexColorBuffer.itemSize = 4;
    this.vertexColorBuffer.numItems = this.colors.length/4;

    if(this.textureCoords && this.textureCoords.length > 0) {
        this.vertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureCoords), gl.STATIC_DRAW);
        this.vertexTextureCoordBuffer.itemSize = 2;
        this.vertexTextureCoordBuffer.numItems = this.textureCoords.length/2;
    }

    this.vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
    this.vertexIndexBuffer.itemSize = 1;
    this.vertexIndexBuffer.numItems = this.indices.length;
};