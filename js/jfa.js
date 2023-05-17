import {Target} from "./gl/target.js";
import {gl} from "./gl/gl.js";
import {ShaderSeed} from "./gl/shaderSeed.js";
import {ShaderJFA} from "./gl/shaderJFA.js";

export class JFA {
    #shaderSeed = new ShaderSeed();
    #shaderJFA = new ShaderJFA();
    #atlas = [
        new Target(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT),
        new Target(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT)];
    #atlasIndex = 0;
    #input;

    constructor(input) {
        this.#input = input;
    }

    get #width() {
        return this.#atlas[0].width;
    }

    get #height() {
        return this.#atlas[0].height;
    }

    get atlas() {
        return this.#atlas[this.#atlasIndex].texture;
    }

    setSize(width, height) {
        for (let layer = 0; layer < 2; ++layer)
            this.#atlas[layer].setSize(width, height);
    }

    generate(threshold) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#input);

        this.#shaderSeed.use();
        this.#shaderSeed.setThreshold(threshold);

        this.#atlas[this.#atlasIndex].bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        const steps = [1];

        for (let step = Math.ceil(Math.log2(Math.max(this.#width, this.#height))); step-- > 0;)
            steps.push(1 << step);

        this.#shaderJFA.use();
        this.#shaderJFA.setSize(this.#width, this.#height);

        for (let step = 0, stepCount = steps.length; step < stepCount; ++step) {
            this.#shaderJFA.setStep(steps[step]);

            gl.bindTexture(gl.TEXTURE_2D, this.#atlas[this.#atlasIndex].texture);

            this.#atlas[this.#atlasIndex = 1 - this.#atlasIndex].bind();

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }
}