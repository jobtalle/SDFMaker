import {gl} from "./gl/gl.js";
import {JFA} from "./jfa.js";
import {Color} from "./color.js";
import {Composite} from "./composite.js";

export class SDFMaker {
    static #INPUT_TARGET_HOVER = "hover";
    static #SIZE = Number.parseInt(getComputedStyle(document.body).getPropertyValue("--size"));

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

    #input = gl.createTexture();
    #jfa = new JFA(this.#input);
    #color = new Color(this.#input, this.#jfa);
    #composite = new Composite(this.#input, this.#jfa, this.#color);
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
    }

    #resizePreview() {
        this.#previewCanvas.width = SDFMaker.#SIZE;
        this.#previewCanvas.height = Math.round(SDFMaker.#SIZE / this.#aspect);
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

        gl.bindTexture(gl.TEXTURE_2D, this.#input);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        this.#loaded = true;
    }

    #onDrop(event) {
        if (!event.dataTransfer.items)
            return;

        const item = event.dataTransfer.items[0];

        if (item.kind === "file") {
            const file = item.getAsFile();

            switch (file.type) {
                case "image/png":
                case "image/svg+xml":
                    const reader = new FileReader();

                    reader.onload = () => {
                        const image = new Image();

                        image.onload = () => {
                            this.#loadImage(file.name, image);
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

        const outputImagePrevious = this.#outputImage;

        this.#outputContainer.appendChild(this.#outputImage = this.#makeOutputImage(
            this.#outputWidth,
            this.#outputHeight,
            this.#composite.pixels));

        if (outputImagePrevious) {
            this.#outputContainer.removeChild(outputImagePrevious);

            URL.revokeObjectURL(outputImagePrevious.src);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    #save() {
        if (this.#outputImage) {
            const link = document.createElement("a");

            link.href = this.#outputImage.src;
            link.download = "image.png";
            link.click();
        }
    }
}