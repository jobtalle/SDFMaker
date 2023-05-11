import {SDFMaker} from "./sdfMaker.js";

new SDFMaker(
    document.getElementById("input-target"),
    document.getElementById("input-info"),
    document.getElementById("input-message"),
    document.getElementById("preview-canvas"),
    document.getElementById("setting-width"),
    document.getElementById("setting-height"),
    document.getElementById("setting-radius"),
    document.getElementById("setting-threshold"),
    document.getElementById("output-container"),
    document.getElementById("button-generate"),
    document.getElementById("button-save")
);