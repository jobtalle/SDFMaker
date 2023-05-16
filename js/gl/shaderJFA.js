import {Shader} from "./shader.js";

export class ShaderJFA extends Shader {
    static SHADER_PACK = `
        const uint transparentBit = 1u << 26u;

        uint jfaPack(const uint x, const uint y, const bool transparent) {
            return x | (y << 13u) | (transparent ? transparentBit : 0u);
        }
        
        void jfaUnpack(const uint packed, out uint x, out uint y, out bool transparent) {
            const uint maskX = (1u << 13u) - 1u;
            const uint maskY = maskX << 13u;
        
            x = packed & maskX;
            y = (packed & maskY) >> 13u;
            transparent = (packed & transparentBit) == transparentBit;
        }
        `;

        // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        varying vec2 vUv;
        
        void main() {
            
        }
        `;

    constructor() {
        super(ShaderJFA.#SHADER_FRAGMENT);
    }
}