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
        uniform sampler2D source;

        in vec2 vUv;
        
        out vec4 outColor;

        void main() {
            ivec2 pixel = ivec2(vUv * (size + .5));
            vec4 baseTexel = texelFetch(source, pixel, 0);
            float base = round(baseTexel.a);
            vec3 color = baseTexel.rgb;
            int colorCount = 1;
            int nearest = RADIUS * RADIUS;
            
            for (int y = -RADIUS; y <= RADIUS; ++y) {
                for (int x = -RADIUS; x <= RADIUS; ++x) {
                    vec4 currentPixel = texelFetch(source, pixel + ivec2(x, y), 0);
                    
                    if (base != currentPixel.a)
                        nearest = min(nearest, x * x + y * y);
                    
                    if (currentPixel.a > .5) {
                        color += currentPixel.rgb;
                        
                        ++colorCount;
                    }
                }
            }

            outColor = vec4(
                color / float(colorCount),
                .5 * (base * 2. - 1.) * sqrt(float(nearest)) / float(RADIUS) + .5);
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