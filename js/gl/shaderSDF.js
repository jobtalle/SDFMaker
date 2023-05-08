import {Shader} from "./shader.js";
import {gl} from "./gl.js";

export class ShaderSDF extends Shader {
    static #SHADER_VERTEX = `
        uniform vec2 size;

        out vec2 vUv;
 
        void main() {
            vUv = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);   
            
            gl_Position = vec4(vUv * 2. - 1., 0., 1.);
        }
        `;

    static #SHADER_FRAGMENT = `
        uniform sampler2D source;

        in vec2 vUv;
        
        out vec4 color;

        void main() {
            color = vec4(1., 0., 1., 1.);
        }
        `;

    #uniformSize;

    constructor(radius) {
        super(ShaderSDF.#SHADER_VERTEX, ShaderSDF.#SHADER_FRAGMENT, [["RADIUS", radius.toString()]]);

        this.use();

        this.#uniformSize = this.uniformLocation("size");
    }

    setSize(width, height) {
        gl.uniform2f(this.#uniformSize, width, height);
    }
}