import {gl} from "./gl.js";

export class Target {
    #texture = gl.createTexture();
    #fbo = gl.createFramebuffer();

    width = -1;
    height = -1;

    constructor() {
        gl.bindTexture(gl.TEXTURE_2D, this.#texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            this.#fbo);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this.#texture,
            0);
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;

        gl.texStorage2D(
            gl.TEXTURE_2D,
            1,
            gl.RGBA,
            width,
            height);
    }

    bind() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#fbo);
        gl.viewport(0, 0, this.width, this.height);
    }
}