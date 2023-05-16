import {Shader} from "./shader.js";
import {gl} from "./gl.js";

export class ShaderJFA extends Shader {
    static SHADER_PACK = `
        const uint transparentBit = 1u << 31u;

        uint jfaPack(const uint x, const uint y, const bool transparent) {
            uint coordinates = x | (y << 15u);
            
            if (transparent)
                return coordinates | transparentBit;
                
            return coordinates;
        }
        
        void jfaUnpack(const uint packed, out uint x, out uint y, out bool transparent) {
            const uint mask = (1u << 15u) - 1u;
        
            x = packed & mask;
            y = packed >> 15u & mask;
            transparent = (packed & transparentBit) == transparentBit;
        }
        `;

        // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        uniform highp usampler2D source;        
        uniform uint step;
        uniform uvec2 size;
        
        in vec2 vUv;

        out highp uint coordinate;
        
        void main() {
            uint pixel, pixelX, pixelY, distance;
            bool transparent;
            ivec2 delta;
            ivec2 center = ivec2(gl_FragCoord.xy);
            uint bestDistance = 0xFFFFFFFFu;
            uint bestCoordinate = 0xFFFFFFFFu;
            bool centerTransparent;
            
            jfaUnpack(uint(texelFetch(source, center, 0).r), pixelX, pixelY, centerTransparent);
            
            for (int y = -1; y < 2; ++y) for (int x = -1; x < 2; ++x) {
                pixel = uint(texelFetch(source, clamp(center + ivec2(x, y) * int(step), ivec2(0), ivec2(size) - 1), 0).r);

                jfaUnpack(pixel, pixelX, pixelY, transparent);

                delta = ivec2(pixelX, pixelY) - center;
                distance = uint(delta.x * delta.x + delta.y * delta.y);

                if (transparent) {
                    
                }
                else {
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestCoordinate = pixel;
                    }
                }
            }

            coordinate = bestCoordinate;
        }
        `;

    #uniformStep;
    #uniformSize;

    constructor() {
        super(ShaderJFA.#SHADER_FRAGMENT);

        this.use();

        this.#uniformStep = this.uniformLocation("step");
        this.#uniformSize = this.uniformLocation("size");
    }

    setStep(step) {
        gl.uniform1ui(this.#uniformStep, step);
    }

    setSize(width, height) {
        gl.uniform2ui(this.#uniformSize, width, height);
    }
}