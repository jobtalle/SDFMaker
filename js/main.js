import {SDFMaker} from "./sdfMaker.js";

new SDFMaker(
    document.getElementById("input-target"),
    document.getElementById("input-info"),
    document.getElementById("setting-width"),
    document.getElementById("setting-height"),
    document.getElementById("setting-radius"),
    document.getElementById("output"),
    document.getElementById("button-generate")
);