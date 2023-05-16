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
        
        void jfaUnpack(const uint packed, out uint x, out uint y) {
            const uint mask = (1u << 15u) - 1u;
        
            x = packed & mask;
            y = packed >> 15u & mask;
        }
        `;

        // language=GLSL
    static #SHADER_FRAGMENT = ShaderJFA.SHADER_PACK + `
        uniform highp usampler2D source;
        uniform uint step;
        uniform uvec2 size;

        in vec2 vUv;

        out highp uvec2 coordinates;

        void main() {
            uvec2 distances;
            uvec2 pixels;
            uvec4 pixelCoordinates;
            bool transparent;
            ivec4 deltas;
            ivec2 center = ivec2(gl_FragCoord.xy);
            uvec2 bestDistances = uvec2(0xFFFFFFFFu);
            uvec2 bestCoordinates = uvec2(0xFFFFFFFFu, 0u);

            for (int y = -1; y < 2; ++y) for (int x = -1; x < 2; ++x) {
                pixels = uvec2(texelFetch(source, clamp(center + ivec2(x, y) * int(step), ivec2(0), ivec2(size) - 1), 0).rg);

                jfaUnpack(pixels.x, pixelCoordinates.x, pixelCoordinates.y, transparent);
                jfaUnpack(pixels.y, pixelCoordinates.z, pixelCoordinates.w);

                deltas = ivec4(
                ivec2(pixelCoordinates.x, pixelCoordinates.y),
                ivec2(pixelCoordinates.z, pixelCoordinates.w)) - ivec4(center, center);
                distances = uvec2(
                deltas.x * deltas.x + deltas.y * deltas.y,
                deltas.z * deltas.z + deltas.w * deltas.w);

                if (transparent) {
                    if (distances.y < bestDistances.y) {
                        bestDistances.y = distances.y;
                        bestCoordinates.y = pixels.y;
                    }
                }
                else {
                    if (distances.x < bestDistances.x) {
                        bestDistances.x = distances.x;
                        bestCoordinates.x = pixels.x;
                    }
                }
            }

            coordinates = bestCoordinates;
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