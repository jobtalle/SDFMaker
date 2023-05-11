import {ShaderSDF} from "./gl/shaderSDF.js";
import {Target} from "./gl/target.js";
import {gl} from "./gl/gl.js";

export class SDFMaker {
    static #INPUT_TARGET_HOVER = "hover";

    #inputTarget;
    #inputMessage;
    #inputInfo;
    #previewCanvas;
    #settingWidth;
    #settingHeight;
    #settingRadius;
    #settingThreshold;
    #outputContainer;
    #outputCanvas = null;
    #aspect = 1;
    #radius = 1;
    #threshold = .5;
    #inputWidth = 1;
    #inputHeight = 1;
    #outputWidth = 1;
    #outputHeight = 1;
    #shader = null;
    #shaderRadius = -1;
    #shaderSamples = -1;
    #target = new Target();
    #inputTexture = gl.createTexture();
    #loaded = false;

    constructor(
        inputTarget,
        inputInfo,
        inputMessage,
        previewCanvas,
        settingWidth,
        settingHeight,
        settingRadius,
        settingThreshold,
        outputContainer,
        buttonGenerate,
        buttonSave) {
        inputTarget.ondrop = event => {
            event.preventDefault();

            this.#onDrop(event);

            inputTarget.classList.remove(SDFMaker.#INPUT_TARGET_HOVER);
        };

        inputTarget.ondragover = event => {
            event.preventDefault();

            inputTarget.classList.add(SDFMaker.#INPUT_TARGET_HOVER);
        };

        inputTarget.ondragleave = () => inputTarget.classList.remove(SDFMaker.#INPUT_TARGET_HOVER);

        settingWidth.disabled = settingHeight.disabled = settingRadius.disabled = settingThreshold.disabled = true;
        settingRadius.value = this.#radius;

        settingWidth.oninput = () => {
            if (isNaN(settingWidth.value) || !Number.isInteger(parseFloat(settingWidth.value)))
                this.#outputWidth = 1;
            else
                this.#outputWidth = Math.min(
                    settingWidth.max,
                    Math.max(settingWidth.min, parseInt(settingWidth.value)));

            this.#outputHeight = Math.min(
                settingHeight.max,
                Math.max(settingHeight.min, Math.round(this.#outputWidth / this.#aspect)));

            settingWidth.value = this.#outputWidth;
            settingHeight.value = this.#outputHeight;
        };

        settingHeight.oninput = () => {
            if (isNaN(settingHeight.value) || !Number.isInteger(parseFloat(settingHeight.value)))
                this.#outputHeight = 1;
            else
                this.#outputHeight = Math.min(
                    settingHeight.max,
                    Math.max(settingHeight.min, parseInt(settingHeight.value)));

            this.#outputWidth = Math.min(
                settingWidth.max,
                Math.max(settingWidth.min, Math.round(this.#outputHeight * this.#aspect)));

            settingWidth.value = this.#outputWidth;
            settingHeight.value = this.#outputHeight;
        };

        settingRadius.oninput = () => {
            if (isNaN(settingRadius.value) || !Number.isInteger(parseFloat(settingRadius.value)))
                this.#radius = 1;
            else
                this.#radius = Math.min(
                    settingRadius.max,
                    Math.max(settingRadius.min, parseInt(settingRadius.value)));

            settingRadius.value = this.#radius;
        };

        settingThreshold.oninput = () => {
            if (settingThreshold.value === "" || isNaN(settingThreshold.value))
                this.#threshold = .5;
            else
                this.#threshold = Math.min(
                    settingThreshold.max,
                    Math.max(settingThreshold.min, parseFloat(settingThreshold.value)));

            settingThreshold.value = this.#threshold;
        };

        buttonGenerate.onclick = this.#generate.bind(this);
        buttonSave.onclick = this.#save.bind(this);

        this.#inputTarget = inputTarget;
        this.#inputInfo = inputInfo;
        this.#inputMessage = inputMessage;
        this.#previewCanvas = previewCanvas;
        this.#settingWidth = settingWidth;
        this.#settingHeight = settingHeight;
        this.#settingRadius = settingRadius;
        this.#settingThreshold = settingThreshold;
        this.#outputContainer = outputContainer;

        gl.bindTexture(gl.TEXTURE_2D, this.#inputTexture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    #resizePreview() {
        this.#previewCanvas.width = 500;
        this.#previewCanvas.height = Math.round(500 / this.#aspect);
    }

    #loadImage(name, image) {
        this.#settingWidth.disabled = this.#settingHeight.disabled = this.#settingRadius.disabled = this.#settingThreshold.disabled = false;
        this.#inputMessage.style.display = "none";
        this.#inputInfo.innerText = `
            Name: ${name}
            Size: ${image.width} x ${image.height}
            `;

        this.#settingWidth.value = this.#inputTarget.width = this.#inputWidth = this.#outputWidth = image.width;
        this.#settingHeight.value = this.#inputTarget.height = this.#inputHeight = this.#outputHeight = image.height;
        this.#aspect = image.width / image.height;

        this.#resizePreview();

        this.#inputTarget.getContext("2d").drawImage(
            image,
            0,
            0);

        gl.bindTexture(gl.TEXTURE_2D, this.#inputTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        this.#loaded = true;
    }

    #onDrop(event) {
        if (!event.dataTransfer.items)
            return;

        const item = event.dataTransfer.items[0];

        if (item.kind === "file") {
            const file = item.getAsFile();

            if (file.type === "image/png") {
                const reader = new FileReader();

                reader.onload = () => {
                    const image = new Image();

                    image.onload = () => {
                        this.#loadImage(file.name, image);
                    };

                    image.src = reader.result;
                };

                reader.readAsDataURL(file);
            }
            else
                alert("Only .png files are supported");
        }
    }

    #updateShader() {
        this.#shader?.free();
        this.#shader = new ShaderSDF(this.#shaderRadius, this.#shaderSamples);
    }

    #makeCanvas(width, height, pixels) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const imageData = context.createImageData(width, height);

        imageData.data.set(pixels);

        canvas.width = width;
        canvas.height = height;

        context.putImageData(imageData, 0, 0);

        return canvas;
    }

    #generate() {
        if (!this.#loaded)
            return;

        const samples = Math.max(
            Math.ceil((this.#inputWidth / this.#outputWidth)),
            Math.ceil((this.#inputHeight / this.#outputHeight)));
        const kernelRadius = this.#radius * samples;

        if (this.#shaderRadius !== kernelRadius || this.#shaderSamples !== samples) {
            this.#shaderRadius = kernelRadius;
            this.#shaderSamples = samples;

            this.#updateShader();
        }

        this.#shader.use();
        this.#shader.setSize(this.#inputWidth, this.#inputHeight);
        this.#shader.setThreshold(this.#threshold);

        if (this.#outputWidth !== this.#target.width || this.#outputHeight !== this.#target.height) {
            this.#target.setSize(this.#outputWidth, this.#outputHeight);
        }

        this.#target.bind();

        gl.bindTexture(gl.TEXTURE_2D, this.#inputTexture);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        while (this.#outputContainer.firstChild)
            this.#outputContainer.removeChild(this.#outputContainer.firstChild);

        this.#outputContainer.appendChild(this.#outputCanvas = this.#makeCanvas(this.#outputWidth, this.#outputHeight, this.#target.getPixels()));

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    #save() {
        if (this.#outputCanvas) {
            const link = document.createElement("a");

            link.href = this.#outputCanvas.toDataURL("png");
            link.download = "image.png";
            link.click();
        }
    }
}