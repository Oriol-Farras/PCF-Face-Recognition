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
    
  
    private detectionStartTime: number | null = null;
    private readonly REQUIRED_DURATION = 2000;
    
    private outputImage = "";
    private outputFaceDetected = false;
    private notifyOutputChanged!: () => void;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
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
            model: "short",
            minDetectionConfidence: 0.7
        });

        this.faceDetector.onResults(this.onResults.bind(this));

        this.startCamera();
    }

    private startCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
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
        if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
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
        if (this.canvas.width !== this.video.videoWidth) this.resizeCanvas();

        const width = this.canvas.width;
        const height = this.canvas.height;
        const timestamp = Date.now();

        this.ctx.drawImage(this.video, 0, 0, width, height);

        let progress = 0; 

        if (!this.photoCaptured && results.detections.length > 0) {
            const detection = results.detections[0];
            const keypoints = detection.landmarks;
            const box = detection.boundingBox;

      
            const eyeDiffY = Math.abs(keypoints[0].y - keypoints[1].y);
            const noseOffset = Math.abs(((keypoints[0].x + keypoints[1].x) / 2) - keypoints[2].x);
            const isFrontal = eyeDiffY < 0.08 && noseOffset < 0.08;

            const centerXDiff = Math.abs(box.xCenter - 0.5); 
            const centerYDiff = Math.abs(box.yCenter - 0.5);
            const isCentered = centerXDiff < 0.1 && centerYDiff < 0.15;

            if (isFrontal && isCentered) {
                if (this.detectionStartTime === null) {
                    this.detectionStartTime = timestamp;
                }
                const elapsed = timestamp - this.detectionStartTime;
                progress = Math.min(elapsed / this.REQUIRED_DURATION, 1.0);

                if (elapsed >= this.REQUIRED_DURATION) {
                    this.captureImage();
                }
            } else {
                this.detectionStartTime = null;
                progress = 0;
            }
        } else {
            this.detectionStartTime = null;
            progress = 0;
        }

        this.drawProgressFaceEllipse(width, height, progress);
    }

    private drawProgressFaceEllipse(width: number, height: number, progress: number) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        const minDim = Math.min(width, height);
      
        const radiusX = minDim * 0.22; 
        const radiusY = minDim * 0.33; 

   
        this.ctx.beginPath();
        this.ctx.rect(0, 0, width, height); 
        
      
        if (typeof this.ctx.ellipse === 'function') {
            this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        } else {
            this.ctx.arc(centerX, centerY, radiusX, 0, 2 * Math.PI);
        }
        
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; 
        this.ctx.fill("evenodd");

  
        this.ctx.beginPath();
        this.ctx.setLineDash([]); 
        if (typeof this.ctx.ellipse === 'function') {
            this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        } else {
            this.ctx.arc(centerX, centerY, radiusX, 0, 2 * Math.PI);
        }
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        this.ctx.stroke();

    
        if (progress > 0) {
            const a = radiusX;
            const b = radiusY;
            const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

            this.ctx.beginPath();
            
            if (typeof this.ctx.ellipse === 'function') {
                this.ctx.ellipse(centerX, centerY, radiusY, radiusX, -Math.PI/2, 0, 2 * Math.PI);
            } else {
                this.ctx.arc(centerX, centerY, radiusX, -Math.PI/2, 2 * Math.PI);
            }
            
            this.ctx.setLineDash([perimeter * progress, perimeter]);
            this.ctx.lineWidth = 6;
            this.ctx.lineCap = "round";
            this.ctx.strokeStyle = "#00FF00";
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    private captureImage() {
        this.photoCaptured = true;
        
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        
        if (tempCtx) {
            tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
            this.outputImage = tempCanvas.toDataURL("image/jpeg", 0.9);
            this.outputFaceDetected = true;
            this.notifyOutputChanged();
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.container.style.height =
            context.mode.allocatedHeight !== -1 ? `${context.mode.allocatedHeight}px` : "100%";
    }

    public getOutputs(): IOutputs {
        return {
            ImageBase64: this.outputImage,
            FaceDetected: this.outputFaceDetected
        };
    }

    public destroy(): void {
        this.isCameraRunning = false;
        if (this.video && this.video.srcObject) {
            const stream = this.video.srcObject as MediaStream;
            stream.getTracks().forEach((t) => t.stop());
        }
    }
}