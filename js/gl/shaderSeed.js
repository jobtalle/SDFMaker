import {Shader} from "./shader.js";
import {ShaderJFA} from "./shaderJFA.js";
import {gl} from "./gl.js";

export class ShaderSeed extends Shader {
    // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        uniform sampler2D source;
        uniform float threshold;
        
        in vec2 vUv;
        
        out highp uvec2 coordinate;
        
        void main() {
            coordinate = uvec2(
                jfaPack(
                    uint(gl_FragCoord.x),
                    uint(gl_FragCoord.y),
                    texelFetch(source, ivec2(gl_FragCoord.xy), 0).a < threshold));
        }
        `;

    #uniformThreshold;

    constructor() {
        super(ShaderSeed.#SHADER_FRAGMENT);

        this.use();

        this.#uniformThreshold = this.uniformLocation("threshold");
    }

    setThreshold(threshold) {
        gl.uniform1f(this.#uniformThreshold, threshold);
    }
}