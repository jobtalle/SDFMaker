import {Shader} from "./shader.js";

export class ShaderJFA extends Shader {
    // language=GLSL
    static #SHADER_VERTEX = `
        void main() {
        
        }
        `;

    // language=GLSL
    static #SHADER_FRAGMENT = `
        void main() {
            
        }
        `;

    constructor() {
        super(ShaderJFA.#SHADER_VERTEX, ShaderJFA.#SHADER_FRAGMENT);
    }
}