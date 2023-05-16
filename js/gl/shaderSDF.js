import {Shader} from "./shader.js";
import {ShaderJFA} from "./shaderJFA.js";
import {gl} from "./gl.js";

export class ShaderSDF extends Shader {
    // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        uniform highp usampler2D atlas;
        uniform sampler2D source;
        uniform sampler2D sourceColor;
        uniform uvec2 size;
        uniform float radius;
        
        in vec2 vUv;

        out vec4 color;

        void main() {
            uvec2 nearestIn, nearestOut;
            ivec2 atlasCoordinate = ivec2(vUv * vec2(size) + .5);
            uvec2 atlasPixels = texelFetch(atlas, atlasCoordinate, 0).rg;

            jfaUnpack(atlasPixels.x, nearestIn);
            jfaUnpack(atlasPixels.y, nearestOut);
            
            vec3 sourceColor = texture(sourceColor, vUv).rgb;
            
            if (texelFetch(source, atlasCoordinate, 0).a > .5)
                color = vec4(sourceColor, min(1., .5 + length(vec2(atlasCoordinate - ivec2(nearestIn))) / radius));
            else
                color = vec4(sourceColor, max(0., .5 - length(vec2(atlasCoordinate - ivec2(nearestOut))) / radius));
        }
    `;

    #uniformSize;
    #uniformRadius;

    constructor() {
        super(ShaderSDF.#SHADER_FRAGMENT);

        this.use();

        gl.uniform1i(this.uniformLocation("atlas"), 0);
        gl.uniform1i(this.uniformLocation("source"), 1);
        gl.uniform1i(this.uniformLocation("sourceColor"), 2);

        this.#uniformSize = this.uniformLocation("size");
        this.#uniformRadius = this.uniformLocation("radius");
    }

    setSize(width, height) {
        gl.uniform2ui(this.#uniformSize, width, height);
    }

    setRadius(radius) {
        gl.uniform1f(this.#uniformRadius, radius);
    }
}