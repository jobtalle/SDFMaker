import {Shader} from "./shader.js";
import {gl} from "./gl.js";

export class ShaderPreview extends Shader {
    // language=GLSL
    static #SHADER_FRAMGENT = `
        uniform float radius;
        uniform vec2 center;
        uniform float aspect;
        uniform float zoom;
        uniform sampler2D source;
        
        in vec2 vUv;
        
        out vec4 color;
        
        void main() {
            const float epsilon = .000001;
            
            vec2 uv = vec2(vUv.x, 1. - vUv.y);
            vec2 delta = vec2(uv.x, uv.y / aspect) - center;
            
            if (dot(delta, delta) > radius * radius)
                discard;
            
            vec4 pixel = texture(source, center + (uv - center) / zoom);
            
            color = vec4(
                mix(
                    vec3(0.),
                    pixel.rgb,
                    clamp((pixel.a - .5) / max(fwidth(pixel.a) * .5, epsilon), 0., 1.)),
                1.);
        }
        `;

    #uniformRadius;
    #uniformCenter;
    #uniformAspect;
    #uniformZoom;

    constructor() {
        super(ShaderPreview.#SHADER_FRAMGENT);

        this.use();

        this.#uniformRadius = this.uniformLocation("radius");
        this.#uniformCenter = this.uniformLocation("center");
        this.#uniformAspect = this.uniformLocation("aspect");
        this.#uniformZoom = this.uniformLocation("zoom")
    }

    setRadius(radius) {
        gl.uniform1f(this.#uniformRadius, radius);
    }

    setCenter(x, y) {
        gl.uniform2f(this.#uniformCenter, x, y);
    }

    setAspect(aspect) {
        gl.uniform1f(this.#uniformAspect, aspect);
    }

    setZoom(zoom) {
        gl.uniform1f(this.#uniformZoom, zoom);
    }
}