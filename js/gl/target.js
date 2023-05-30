import {gl} from "./gl.js";

export class Target {
    #texture = gl.createTexture();
    #fbo = gl.createFramebuffer();
    #internalFormat;
    #format;
    #type;

    width = -1;
    height = -1;

    constructor(
        internalFormat = gl.RGBA8,
        format = gl.RGBA,
        type = gl.UNSIGNED_BYTE,
        filter = gl.NEAREST) {
        this.#internalFormat = internalFormat;
        this.#format = format;
        this.#type = type;

        gl.bindTexture(gl.TEXTURE_2D, this.#texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    }

    get texture() {
        return this.#texture;
    }

    setSize(width, height) {
        if (width === this.width && height === this.height)
            return;

        this.width = width;
        this.height = height;

        gl.bindTexture(gl.TEXTURE_2D, this.#texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            this.#internalFormat,
            width,
            height,
            0,
            this.#format,
            this.#type,
            null);
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

    bind() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#fbo);
        gl.viewport(0, 0, this.width, this.height);
    }

    generateMipmaps() {
        gl.bindTexture(gl.TEXTURE_2D, this.#texture);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
}