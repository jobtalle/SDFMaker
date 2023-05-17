import {Shader} from "./shader.js";
import {gl} from "./gl.js";
import {ShaderJFA} from "./shaderJFA.js";

export class ShaderColor extends Shader {
    // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        uniform highp usampler2D atlas;
        uniform sampler2D source;
        uniform uvec2 size;
        
        in vec2 vUv;
        
        out vec3 color;
        
        void main() {
            uvec2 nearest;

            jfaUnpack(texelFetch(atlas, ivec2(gl_FragCoord.xy), 0).g, nearest);

            color = texelFetch(source, ivec2(nearest), 0).rgb;
        }
        `;

    #uniformSize;

    constructor() {
        super(ShaderColor.#SHADER_FRAGMENT);

        this.use();

        gl.uniform1i(this.uniformLocation("atlas"), 0);
        gl.uniform1i(this.uniformLocation("source"), 1);

        this.#uniformSize = this.uniformLocation("size");
    }

    setSize(width, height) {
        gl.uniform2ui(this.#uniformSize, width, height);
    }
}