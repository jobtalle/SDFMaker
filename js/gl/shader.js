import {gl} from "./gl.js";

export class Shader {
    static #PREFIX = "#version 300 es\n";

    #program;

    /**
     * Construct a shader
     * @param {String} vertex The vertex shader
     * @param {String} fragment The fragment shader
     */
    constructor(
        vertex,
        fragment) {
        const shaderVertex = gl.createShader(gl.VERTEX_SHADER);
        const shaderFragment = gl.createShader(gl.FRAGMENT_SHADER);
        const prefix = Shader.#PREFIX;

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

    /**
     * Get a uniform location
     * @param {string} name The name of the uniform
     * @returns {WebGLUniformLocation} The uniform location
     */
    uniformLocation(name) {
        return gl.getUniformLocation(this.#program, name);
    }

    /**
     * Bind a uniform block
     * @param {string} name The uniform block name
     * @param {number} binding The binding index
     */
    bindUniformBlock(name, binding) {
        gl.uniformBlockBinding(this.#program, gl.getUniformBlockIndex(this.#program, name), binding);
    }

    /**
     * Use this shader
     */
    use() {
        gl.useProgram(this.#program);
    }

    /**
     * Free resources allocated by this shaders
     */
    free() {
        gl.deleteProgram(this.#program);
    }
}