import {gl} from "./gl/gl.js";
import {JFA} from "./jfa.js";
import {Color} from "./color.js";
import {Composite} from "./composite.js";
import {ShaderPreview} from "./gl/shaderPreview.js";

export class SDFMaker {
    static #INPUT_TARGET_HOVER = "hover";
    static #SIZE = Number.parseInt(getComputedStyle(document.body).getPropertyValue("--size"));
    static #PREVIEW_RADIUS = SDFMaker.#SIZE * .2;
    static #PREVIEW_ZOOM = 2;
    static #SVG_UPSCALE = 2048;

    #inputTarget;
    #inputMessage;
    #inputInfo;
    #previewCanvas;
    #settingWidth;
    #settingHeight;
    #settingRadius;
    #settingThreshold;
    #outputContainer;
    #outputBlob = null;
    #outputImage = null;
    #aspect = 1;
    #radius = 1;
    #threshold = .5;
    #inputWidth = 1;
    #inputHeight = 1;
    #outputWidth = 1;
    #outputHeight = 1;
    #previewX = -1;
    #previewY = -1;
    #previewVisible = false;
    #previewZoom = false;

    #input = gl.createTexture();
    #jfa = new JFA(this.#input);
    #color = new Color(this.#input, this.#jfa);
    #composite = new Composite(this.#input, this.#jfa, this.#color);
    #loaded = false;
    #shaderPreview = new ShaderPreview();
    #updated = true;

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
                    this.#inputWidth,
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
                    this.#inputHeight,
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

        gl.bindTexture(gl.TEXTURE_2D, this.#input);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        this.#shaderPreview.use();
        this.#shaderPreview.setRadius(SDFMaker.#PREVIEW_RADIUS / SDFMaker.#SIZE);
        this.#shaderPreview.setRadiusPixels(SDFMaker.#SIZE);

        window.addEventListener("mousemove", event => {
            if (this.#outputImage) {
                const wasVisible = this.#previewVisible;
                const previewRect = previewCanvas.getBoundingClientRect();

                this.#previewX = event.clientX - previewRect.left;
                this.#previewY = event.clientY - previewRect.top;

                this.#previewVisible =
                    this.#previewX > -SDFMaker.#PREVIEW_RADIUS &&
                    this.#previewY > -SDFMaker.#PREVIEW_RADIUS &&
                    this.#previewX < SDFMaker.#SIZE + SDFMaker.#PREVIEW_RADIUS &&
                    this.#previewY < SDFMaker.#SIZE + SDFMaker.#PREVIEW_RADIUS;

                if (this.#previewVisible || this.#previewVisible !== wasVisible)
                    this.#updated = true;
            }
        });

        inputTarget.addEventListener("mousedown", () => {
            this.#previewZoom = true;
            this.#updated = true;
        });

        window.addEventListener("mouseup", () => {
            this.#previewZoom = false;
            this.#updated = true;
        });

        this.#render();
    }

    #resizePreview() {
        this.#previewCanvas.width = SDFMaker.#SIZE;
        this.#previewCanvas.height = Math.round(SDFMaker.#SIZE / this.#aspect);

        this.#shaderPreview.use();
        this.#shaderPreview.setAspect(this.#previewCanvas.width / this.#previewCanvas.height);
    }

    #loadImage(name, image, upscale) {
        const scale = upscale ? Math.min(
            SDFMaker.#SVG_UPSCALE / image.width,
            SDFMaker.#SVG_UPSCALE / image.height) : 1;

        this.#settingWidth.value = this.#outputWidth = image.width;
        this.#settingHeight.value = this.#outputHeight = image.height;

        this.#settingWidth.disabled = this.#settingHeight.disabled = this.#settingRadius.disabled = this.#settingThreshold.disabled = false;
        this.#inputMessage.style.display = "none";
        this.#inputInfo.innerText = `
            Name: ${name}
            Size: ${this.#outputWidth} x ${this.#outputHeight}
            `;

        this.#inputTarget.width = this.#inputWidth = Math.round(image.width * scale);
        this.#inputTarget.height = this.#inputHeight = Math.round(image.height * scale);

        this.#aspect = image.width / image.height;

        this.#resizePreview();

        this.#inputTarget.getContext("2d").drawImage(
            image,
            0,
            0,
            this.#inputWidth,
            this.#inputHeight);

        gl.bindTexture(gl.TEXTURE_2D, this.#input);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.#inputTarget);

        this.#clearOutputImage();

        this.#loaded = true;
    }

    #clearOutputImage() {
        if (this.#outputImage) {
            this.#outputContainer.removeChild(this.#outputImage);

            URL.revokeObjectURL(this.#outputImage.src);

            this.#outputImage = null;
            this.#updated = true;
        }
    }

    #onDrop(event) {
        if (!event.dataTransfer.items)
            return;

        const item = event.dataTransfer.items[0];

        if (item.kind === "file") {
            const file = item.getAsFile();
            let upscale = false;

            switch (file.type) {
                case "image/svg+xml":
                    upscale = true;

                case "image/png":
                    const reader = new FileReader();

                    reader.onload = () => {
                        const image = new Image();

                        image.onload = () => {
                            this.#loadImage(file.name, image, upscale);
                        };

                        image.src = reader.result;
                    };

                    reader.readAsDataURL(file);

                    break;
                default:
                    alert("Only .png files are supported");
            }
        }
    }

    #makeOutputImage(width, height, pixels) {
        const image = document.createElement("img");
        const url = URL.createObjectURL(this.#outputBlob = new Blob(
            [UPNG.encode([pixels], width, height)],
            { type: "image/png" }));

        image.src = url;

        return image;
    }

    #generate() {
        if (!this.#loaded)
            return;

        this.#jfa.setSize(this.#inputWidth, this.#inputHeight);
        this.#color.setSize(this.#inputWidth, this.#inputHeight);
        this.#composite.setSize(this.#outputWidth, this.#outputHeight);

        this.#jfa.generate(this.#threshold);
        this.#color.generate();
        this.#composite.generate(
            this.#inputWidth,
            this.#inputHeight,
            this.#radius,
            this.#threshold);

        this.#clearOutputImage();

        this.#outputContainer.appendChild(this.#outputImage = this.#makeOutputImage(
            this.#outputWidth,
            this.#outputHeight,
            this.#composite.pixels));

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.#updated = true;
    }

    #save() {
        if (this.#outputImage) {
            const link = document.createElement("a");

            link.href = this.#outputImage.src;
            link.download = "image.png";
            link.click();
        }
    }

    #render() {
        if (this.#updated) {
            gl.clear(gl.COLOR_BUFFER_BIT);

            if (this.#previewVisible && this.#outputImage) {
                this.#shaderPreview.use();
                this.#shaderPreview.setCenter(this.#previewX / SDFMaker.#SIZE, this.#previewY / SDFMaker.#SIZE);
                this.#shaderPreview.setZoom(this.#previewZoom ? SDFMaker.#PREVIEW_ZOOM : 1);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.#composite.texture);
                gl.viewport(0, 0, this.#previewCanvas.width, this.#previewCanvas.height);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            this.#updated = false;
        }

        requestAnimationFrame(this.#render.bind(this));
    }
}