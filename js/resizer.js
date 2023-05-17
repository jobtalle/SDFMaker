import {Target} from "./gl/target.js";
import {gl} from "./gl/gl.js";

export class Resizer {
    #color;
    #target = new Target(gl.RGB8, gl.RGB);

    constructor(color) {
        this.#color = color;
    }

    resize(width, height) {
        this.#target.setSize(width, height);

        return this.#target;
    }
}