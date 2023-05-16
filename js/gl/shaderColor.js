import {Shader} from "./shader.js";
import {gl} from "./gl.js";
import {ShaderJFA} from "./shaderJFA.js";

export class ShaderColor extends Shader {
    // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        uniform highp usampler2D atlas;
        uniform sampler2D source;
        
        in vec2 vUv;
        
        out vec4 color;
        
        void main() {
            color = texture(source, vUv);
        }
        `;

    constructor() {
        super(ShaderColor.#SHADER_FRAGMENT);

        this.use();

        gl.uniform1i(this.uniformLocation("atlas"), 0);
        gl.uniform1i(this.uniformLocation("source"), 1);
    }
}