import {Shader} from "./shader.js";

export class ShaderSDF extends Shader {
    static #SHADER_VERTEX = `
        uniform vec2 size;

        varying vec2 vUv;
 
        void main() {
            vUv = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);   
            
            gl_Position = vUv * 2. - 1.;
        }
        `;

    static #SHADER_FRAGMENT = `
        uniform sampler2D source;

        varying vec2 vUv;

        void main() {
            gl_FragColor = vec4(1., 0., 1., 1.);
        }
        `;

    #uniformSize;

    /**
     * Construct the SDF shader
     */
    constructor() {
        super(ShaderSDF.#SHADER_VERTEX, ShaderSDF.#SHADER_FRAGMENT);

        this.#uniformSize = this.uniformLocation("size");
    }
}