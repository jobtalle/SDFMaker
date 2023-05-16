import {ShaderSDF} from "./gl/shaderSDF.js";
import {Target} from "./gl/target.js";
import {gl} from "./gl/gl.js";
import {ShaderSeed} from "./gl/shaderSeed.js";
import {ShaderJFA} from "./gl/shaderJFA.js";
import {ShaderColor} from "./gl/shaderColor.js";

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
    #outputCanvas = null;
    #aspect = 1;
    #radius = 1;
    #threshold = .5;
    #inputWidth = 1;
    #inputHeight = 1;
    #outputWidth = 1;
    #outputHeight = 1;

    #shaderSeed = new ShaderSeed();
    #shaderJFA = new ShaderJFA();
    #shaderColor = new ShaderColor();
    #shaderSDF = new ShaderSDF();

    #targetColor = new Target();
    #targetComposite = new Target();
    #inputTexture = gl.createTexture();
    #atlas = [
        new Target(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT),
        new Target(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT)];
    #atlasIndex = 0;
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

        gl.bindTexture(gl.TEXTURE_2D, this.#inputTexture);

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

        // Update target sizes
        for (let layer = 0; layer < 2; ++layer)
            this.#atlas[layer].setSize(this.#inputWidth, this.#inputHeight);

        this.#targetColor.setSize(this.#inputWidth, this.#inputHeight);
        this.#targetComposite.setSize(this.#outputWidth, this.#outputHeight);

        // Bind source texture
        gl.bindTexture(gl.TEXTURE_2D, this.#inputTexture);

        // Seed JFA
        this.#shaderSeed.use();
        this.#shaderSeed.setThreshold(this.#threshold);

        this.#atlas[this.#atlasIndex].bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Apply JFA
        const steps = [1];

        for (let step = Math.ceil(Math.log2(Math.max(this.#inputWidth, this.#inputHeight))); step-- > 0;)
            steps.push(1 << step);

        this.#shaderJFA.use();
        this.#shaderJFA.setSize(this.#inputWidth, this.#inputHeight);

        for (let step = 0, stepCount = steps.length; step < stepCount; ++step) {
            this.#shaderJFA.setStep(steps[step]);

            gl.bindTexture(gl.TEXTURE_2D, this.#atlas[this.#atlasIndex].texture);

            this.#atlas[this.#atlasIndex = 1 - this.#atlasIndex].bind();

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Make color texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.#inputTexture);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#atlas[this.#atlasIndex].texture);

        this.#shaderColor.use();
        this.#shaderColor.setSize(this.#inputWidth, this.#inputHeight);

        this.#targetColor.bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Convert JFA to SDF
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.#targetColor.texture);
        gl.activeTexture(gl.TEXTURE0);

        this.#shaderSDF.use();
        this.#shaderSDF.setSize(this.#inputWidth, this.#inputHeight);
        this.#shaderSDF.setRadius(2 * this.#radius * this.#inputWidth / this.#outputWidth);

        this.#targetComposite.bind();

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Send output to HTML
        while (this.#outputContainer.firstChild)
            this.#outputContainer.removeChild(this.#outputContainer.firstChild);

        const pixels = new Uint8Array(this.#outputWidth * this.#outputHeight << 2);

        gl.readPixels(0, 0, this.#outputWidth, this.#outputHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        this.#outputContainer.appendChild(this.#outputCanvas = this.#makeCanvas(this.#outputWidth, this.#outputHeight, pixels));

        // Reset framebuffer binding
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