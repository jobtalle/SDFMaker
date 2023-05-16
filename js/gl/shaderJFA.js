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

        out highp uvec2 coordinate;

        void main() {
            uvec2 distance;
            uvec2 pixel;
            uvec4 pixelCoordinate;
            bool transparent;
            ivec4 delta;
            ivec2 center = ivec2(gl_FragCoord.xy);
            uvec2 bestDistance = uvec2(0xFFFFFFFFu);
            uvec2 bestCoordinates = uvec2(0xFFFFFFFFu, 0u);

            for (int y = -1; y < 2; ++y) for (int x = -1; x < 2; ++x) {
                pixel = uvec2(texelFetch(source, clamp(center + ivec2(x, y) * int(step), ivec2(0), ivec2(size) - 1), 0).rg);

                jfaUnpack(pixel.x, pixelCoordinate.x, pixelCoordinate.y, transparent);
                jfaUnpack(pixel.y, pixelCoordinate.z, pixelCoordinate.w);

                delta = ivec4(
                    ivec2(pixelCoordinate.x, pixelCoordinate.y),
                    ivec2(pixelCoordinate.z, pixelCoordinate.w)) - ivec4(center, center);
                distance = uvec2(
                    delta.x * delta.x + delta.y * delta.y,
                    delta.z * delta.z + delta.w * delta.w);

                if (transparent) {
                    if (distance.y < bestDistance.y) {
                        bestDistance.y = distance.y;
                        bestCoordinates.y = pixel.y;
                    }
                }
                else {
                    if (distance.x < bestDistance.x) {
                        bestDistance.x = distance.x;
                        bestCoordinates.x = pixel.x;
                    }
                }
            }

            coordinate = bestCoordinates;
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