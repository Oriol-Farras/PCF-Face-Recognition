import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { FaceDetection, Results } from "@mediapipe/face_detection";

export class FaceCameraControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private video!: HTMLVideoElement;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    private faceDetector!: FaceDetection;
    private isCameraRunning = false;
    private photoCaptured = false;
    
    private outputImage = "";
    private outputFaceDetected = false;
    private notifyOutputChanged!: () => void;

    constructor() {
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this.notifyOutputChanged = notifyOutputChanged;
        this.container = container;
        this.container.classList.add("face-camera-container");

        this.video = document.createElement("video");
        this.video.setAttribute("autoplay", "");
        this.video.setAttribute("playsinline", "");
        this.video.style.display = "none"; 

        this.canvas = document.createElement("canvas");
        this.container.appendChild(this.video);
        this.container.appendChild(this.canvas);

        this.faceDetector = new FaceDetection({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });
        
        this.faceDetector.setOptions({
            model: 'short',
            minDetectionConfidence: 0.7
        });

        this.faceDetector.onResults(this.onResults.bind(this));

        this.startCamera();
    }

    private startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
                .then((stream) => {
                    this.video.srcObject = stream;
                    this.video.onloadedmetadata = () => {
                        this.video.play();
                        this.isCameraRunning = true;
                        this.resizeCanvas();
                        this.processVideo();
                    };
                    return;
                })
                .catch((err) => console.error("Error cámara:", err));
        }
    }

    private resizeCanvas() {
        if(this.video.videoWidth > 0 && this.video.videoHeight > 0){
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx = this.canvas.getContext("2d")!;
        }
    }

    private async processVideo() {
        if (!this.isCameraRunning) return;

        if (this.video.readyState === 4) {
            try {
                await this.faceDetector.send({ image: this.video });
            } catch (error) {
                console.error(error);
            }
        }
        requestAnimationFrame(this.processVideo.bind(this));
    }

    private onResults(results: Results) {
        if(this.canvas.width !== this.video.videoWidth) this.resizeCanvas();

        const width = this.canvas.width;
        const height = this.canvas.height;


        this.ctx.drawImage(this.video, 0, 0, width, height);

        if (this.photoCaptured) return;

        if (results.detections.length > 0) {
            const detection = results.detections[0];
            const box = detection.boundingBox;


            const x = box.xCenter * width - (box.width * width) / 2;
            const y = box.yCenter * height - (box.height * height) / 2;
            const w = box.width * width;
            const h = box.height * height;

            const k = detection.landmarks;
            const eyeDiffY = Math.abs(k[0].y - k[1].y);
            const noseOffset = Math.abs(((k[0].x + k[1].x) / 2) - k[2].x);

            const isFrontal = eyeDiffY < 0.08 && noseOffset < 0.08;

            this.ctx.beginPath();
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = isFrontal ? "#00FF00" : "#FF0000";
            this.ctx.rect(x, y, w, h);
            this.ctx.stroke();

            if (isFrontal) {
                this.captureImage();
            }
        }
    }

    private captureImage() {
        this.photoCaptured = true;
        
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        
        if(tempCtx){
            tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
            this.outputImage = tempCanvas.toDataURL("image/jpeg", 0.9);
            this.outputFaceDetected = true;
            this.notifyOutputChanged();
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.container.style.height = context.mode.allocatedHeight !== -1 ? `${context.mode.allocatedHeight}px` : "100%";
    }

    public getOutputs(): IOutputs {
        return {
            ImageBase64: this.outputImage,
            FaceDetected: this.outputFaceDetected
        };
    }

    public destroy(): void {
        this.isCameraRunning = false;
        if(this.video && this.video.srcObject){
             const stream = this.video.srcObject as MediaStream;
             stream.getTracks().forEach(t => t.stop());
        }
    }
}