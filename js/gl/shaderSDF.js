import {Shader} from "./shader.js";
import {gl} from "./gl.js";

export class ShaderSDF extends Shader {
    // language=GLSL
    static #SHADER_VERTEX = `
        uniform vec2 size;

        out vec2 vPixel;
        out vec2 vUv;
 
        void main() {
            vPixel = 1. / size;
            vUv = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);   
            
            gl_Position = vec4(vUv * 2. - 1., 0., 1.);
        }
        `;

    // language=GLSL
    static #SHADER_FRAGMENT = `
        uniform sampler2D source;

        in vec2 vPixel;
        in vec2 vUv;
        
        out vec4 color;

        void main() {
            color = texture(source, vUv);
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