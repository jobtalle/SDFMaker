import {Shader} from "./shader.js";
import {gl} from "./gl.js";

export class ShaderSDF extends Shader {
    // language=GLSL
    static #SHADER_VERTEX = `
        out vec2 vUv;
 
        void main() {
            vUv = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);   
            
            gl_Position = vec4(vUv * 2. - 1., 0., 1.);
        }
        `;

    // language=GLSL
    static #SHADER_FRAGMENT = `
        uniform vec2 size;
        uniform float threshold;
        uniform sampler2D source;

        in vec2 vUv;

        out vec4 outColor;
        
        vec3 averageColor(const ivec2 pixel) {
            vec3 color = vec3(0.);
            int colors = 0;
            
            for (int y = 0; y < SAMPLES; ++y) {
                for (int x = 0; x < SAMPLES; ++x) {
                    vec4 fetched = texelFetch(source, pixel + ivec2(x, y), 0);
                    
                    if (fetched.a != 0.) {
                        color += fetched.rgb;
                        
                        ++colors;
                    }
                }
            }
            
            if (colors == 0)
                return vec3(0.);
            
            return color / float(colors);
        }

        void main() {
            ivec2 pixel = ivec2(vUv * size + .5);
            float base = step(threshold, texelFetch(source, pixel, 0).a);
            int nearest = RADIUS * RADIUS;
            ivec2 colorPixel = ivec2(0);

            for (int y = -RADIUS; y <= RADIUS; ++y) {
                for (int x = -RADIUS; x <= RADIUS; ++x) {
                    if (base != step(threshold, texelFetch(source, pixel + ivec2(x, y), 0).a)) {
                        nearest = min(nearest, x * x + y * y);
                        colorPixel = ivec2(x, y);
                    }
                }
            }

            if (base == 1.)
                colorPixel = ivec2(0);

            outColor = vec4(
                averageColor(ivec2(vUv * size)),
                .5 * (base * 2. - 1.) * sqrt(float(nearest)) / float(RADIUS) + .5);
        }
    `;

    #uniformSize;
    #uniformThreshold;

    constructor(radius, samples) {
        super(ShaderSDF.#SHADER_VERTEX, ShaderSDF.#SHADER_FRAGMENT, [
            ["RADIUS", radius.toString()],
            ["SAMPLES", samples.toString()]]);

        this.use();

        this.#uniformSize = this.uniformLocation("size");
        this.#uniformThreshold = this.uniformLocation("threshold");

        this.setThreshold(.5);
    }

    setSize(width, height) {
        gl.uniform2f(this.#uniformSize, width, height);
    }

    setThreshold(threshold) {
        gl.uniform1f(this.#uniformThreshold, threshold);
    }
}