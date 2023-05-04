export class SDFMaker {
    static #INPUT_TARGET_HOVER = "hover";

    #inputTarget;
    #inputInfo;
    #settingWidth;
    #settingHeight;
    #settingRadius;
    #aspect = 1;
    #radius = 1;
    #inputWidth = 1;
    #inputHeight = 1;
    #outputWidth = 1;
    #outputHeight = 1;

    constructor(
        inputTarget,
        inputInfo,
        settingWidth,
        settingHeight,
        settingRadius) {
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

        settingWidth.disabled = settingHeight.disabled = settingRadius.disabled = true;
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

        this.#inputTarget = inputTarget;
        this.#inputInfo = inputInfo;
        this.#settingWidth = settingWidth;
        this.#settingHeight = settingHeight;
        this.#settingRadius = settingRadius;
    }

    #loadImage(name, image) {
        this.#settingWidth.disabled = this.#settingHeight.disabled = this.#settingRadius.disabled = false;
        this.#inputInfo.innerText = `
            Name: ${name}
            Size: ${image.width} x ${image.height}
            `;

        this.#settingWidth.value = image.width;
        this.#settingHeight.value = image.height;
        this.#aspect = image.width / image.height;
        this.#inputWidth = image.width;
        this.#inputHeight = image.height;

        const context = this.#inputTarget.getContext("2d");
        const scale = Math.min(
            this.#inputTarget.width / image.width,
            this.#inputTarget.height / image.height);

        context.clearRect(0, 0, this.#inputTarget.width, this.#inputTarget.height);
        context.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            .5 * (this.#inputTarget.width - image.width * scale),
            .5 * (this.#inputTarget.height - image.height * scale),
            image.width * scale,
            image.height * scale);
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
}