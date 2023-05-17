import {Target} from "./gl/target.js";
import {gl} from "./gl/gl.js";
import {ShaderColor} from "./gl/shaderColor.js";

export class Color {
    #input;
    #jfa;
    #target = new Target(gl.RGB8, gl.RGB);
    #shaderColor = new ShaderColor();

    constructor(input, jfa) {
        this.#input = input;
        this.#jfa = jfa;
    }

    get #width() {
        return this.#target.width;
    }

    get #height() {
        return this.#target.height;
    }

    setSize(width, height) {
        this.#target.setSize(width, height);
    }

    generate() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#jfa.atlas);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.#input);

        this.#shaderColor.use();
        this.#shaderColor.setSize(this.#width, this.#height);

        this.#target.bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.#target.generateMipmaps();
    }

    get texture() {
        return this.#target.texture;
    }
}