import {gl} from "./gl.js";

export class Shader {
    static #PREFIX = "#version 300 es\nprecision highp float;\n";

    #program;

    static makeDefines(defines) {
        let glsl = "";

        for (const define of defines)
            glsl += "#define " + define[0] + " " + define[1] + "\n";

        return glsl;
    }

    constructor(vertex, fragment, defines = null) {
        const shaderVertex = gl.createShader(gl.VERTEX_SHADER);
        const shaderFragment = gl.createShader(gl.FRAGMENT_SHADER);
        let prefix = defines ? Shader.#PREFIX + Shader.makeDefines(defines) : Shader.#PREFIX;

        this.#program = gl.createProgram();

        gl.shaderSource(shaderVertex, prefix + vertex);
        gl.compileShader(shaderVertex);
        gl.shaderSource(shaderFragment, prefix + fragment);
        gl.compileShader(shaderFragment);

        gl.attachShader(this.#program, shaderVertex);
        gl.attachShader(this.#program, shaderFragment);

        gl.linkProgram(this.#program);
        gl.detachShader(this.#program, shaderVertex);
        gl.detachShader(this.#program, shaderFragment);

        if (!gl.getProgramParameter(this.#program, gl.LINK_STATUS)) {
            console.error(this.constructor.name + " couldn't compile: " + gl.getProgramInfoLog(this.#program));

            if (!gl.getShaderParameter(shaderVertex, gl.COMPILE_STATUS))
                console.error(gl.getShaderInfoLog(shaderVertex));

            if (!gl.getShaderParameter(shaderFragment, gl.COMPILE_STATUS))
                console.error(gl.getShaderInfoLog(shaderFragment));
        }

        gl.deleteShader(shaderVertex);
        gl.deleteShader(shaderFragment);
    }

    uniformLocation(name) {
        return gl.getUniformLocation(this.#program, name);
    }

    bindUniformBlock(name, binding) {
        gl.uniformBlockBinding(this.#program, gl.getUniformBlockIndex(this.#program, name), binding);
    }

    use() {
        gl.useProgram(this.#program);
    }

    free() {
        gl.deleteProgram(this.#program);
    }
}