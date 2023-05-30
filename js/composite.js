import {ShaderSDF} from "./gl/shaderSDF.js";
import {Target} from "./gl/target.js";
import {gl} from "./gl/gl.js";

export class Composite {
    #input;
    #jfa;
    #color;
    #shaderSDF = new ShaderSDF();
    #target = new Target(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    #pixels = null;

    constructor(input, jfa, color) {
        this.#input = input;
        this.#jfa = jfa;
        this.#color = color;
    }

    get #width() {
        return this.#target.width;
    }

    get #height() {
        return this.#target.height;
    }

    get pixels() {
        return this.#pixels;
    }

    get texture() {
        return this.#target.texture;
    }

    setSize(width, height) {
        this.#target.setSize(width, height);
    }

    generate(width, height, radius, threshold) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#color.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.#input);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.#jfa.atlas);

        this.#shaderSDF.use();
        this.#shaderSDF.setSize(width, height);
        this.#shaderSDF.setRadius(2 * radius * width / this.#width);
        this.#shaderSDF.setThreshold(threshold);

        this.#target.bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.#pixels = new Uint8Array(this.#width * this.#height << 2);

        gl.readPixels(0, 0, this.#width, this.#height, gl.RGBA, gl.UNSIGNED_BYTE, this.#pixels);
    }
}