// utils/webcam.js

export class Webcam {
    stream = null;
    currentDeviceId = null;
    devices = []; // cached list of video input devices

    async _enumerateVideoInputs() {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            this.devices = all.filter((d) => d.kind === 'videoinput');
            console.log("Available video devices:", this.devices.map(d => ({ label: d.label, id: d.deviceId.substring(0, 8) + '...' })));
        } catch (e) {
            console.warn("Failed to enumerate video devices:", e);
            this.devices = [];
        }
        return this.devices;
    }

    /**
     * Try to find a deviceId by preference (rear/front).
     * Returns null if we can't determine one (browser may hide labels until permission granted).
     */
    async _getPreferredDeviceId(preferRear = true) {
        const list = await this._enumerateVideoInputs();
        if (!list.length) return null;

        // Heuristics on labels (after permission is granted, labels are populated)
        const keywordsRear = ['back', 'rear', 'environment', 'trás', 'main', 'world'];
        const keywordsFront = ['front', 'user', 'face', 'frontal', 'selfie'];

        const match = (dev, kws) =>
            kws.some((k) => dev.label.toLowerCase().includes(k));

        const rear = list.find((d) => match(d, keywordsRear));
        const front = list.find((d) => match(d, keywordsFront));

        if (preferRear && rear) {
            console.log("Selected rear camera:", rear.label);
            return rear.deviceId;
        }
        if (!preferRear && front) {
            console.log("Selected front camera:", front.label);
            return front.deviceId;
        }

        // Fallback: if single camera, return it; else return first/last by preference
        if (list.length === 1) {
            console.log("Using single available camera:", list[0].label);
            return list[0].deviceId;
        }

        const selected = preferRear ? (rear?.deviceId || list[list.length - 1].deviceId)
            : (front?.deviceId || list[0].deviceId);
        
        const selectedDevice = list.find(d => d.deviceId === selected);
        console.log("Fallback camera selection:", selectedDevice?.label || "Unknown");
        return selected;
    }

    _baseVideoConstraints() {
        return {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, max: 60 }
            // advanced: [{ focusMode: 'continuous' }] // some browsers support this
        };
    }

    async _openWithConstraints(constraints) {
        console.log("Requesting camera with constraints:", constraints);
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: constraints,
        });
        
        const videoTrack = this.stream.getVideoTracks()[0];
        if (videoTrack) {
            const settings = videoTrack.getSettings();
            console.log("Camera stream settings:", {
                width: settings.width,
                height: settings.height,
                frameRate: settings.frameRate,
                deviceId: settings.deviceId?.substring(0, 8) + '...',
                facingMode: settings.facingMode
            });
        }
        
        return this.stream;
    }

    _applyStreamToVideo(video) {
        video.srcObject = this.stream;
        
        // iOS / mobile quirks
        video.setAttribute('playsinline', '');
        video.muted = true;
        video.autoplay = true;
        
        // Set video properties for better compatibility
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('muted', '');
    }

    /**
     * Open camera:
     * - tries deviceId for rear (or front) if available
     * - falls back to facingMode hint if deviceId isn't available yet
     * - then falls back to the opposite camera
     */
    async open(video, { preferRear = true } = {}) {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera not supported in this browser');
        }

        if (!video) throw new Error('Video element is not provided');

        console.log("=== CAMERA OPENING ===");
        console.log("Preferred camera:", preferRear ? "rear" : "front");

        try {
            // 1) Try deviceId (best)
            let deviceId = await this._getPreferredDeviceId(preferRear);
            
            try {
                if (deviceId) {
                    await this._openWithConstraints({
                        deviceId: { exact: deviceId },
                        ...this._baseVideoConstraints(),
                    });
                    this.currentDeviceId = deviceId;
                } else {
                    // 2) Try facingMode hint if we don't have deviceId yet (no labels until permission)
                    console.log("No specific device ID, trying facingMode constraint");
                    await this._openWithConstraints({
                        facingMode: { ideal: preferRear ? 'environment' : 'user' },
                        ...this._baseVideoConstraints(),
                    });
                    // After permission, enumerate again to cache devices for switching
                    await this._enumerateVideoInputs();
                    this.currentDeviceId = this.devices[0]?.deviceId || null;
                }

            } catch (e1) {
                console.log("Primary camera attempt failed, trying fallback:", e1.message);
                // 3) Fallback: opposite side
                await this._openWithConstraints({
                    facingMode: { ideal: preferRear ? 'user' : 'environment' },
                    ...this._baseVideoConstraints(),
                });
                await this._enumerateVideoInputs();
                this.currentDeviceId = this.devices[0]?.deviceId || null;
            }

            this._applyStreamToVideo(video);

            // Wait for metadata then play()
            await new Promise((resolve, reject) => {
                const onMeta = () => {
                    video.removeEventListener('loadedmetadata', onMeta);
                    console.log(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
                    resolve();
                };
                
                const onError = (error) => {
                    video.removeEventListener('error', onError);
                    reject(error);
                };

                if (video.readyState >= 1) {
                    console.log(`Video already has metadata: ${video.videoWidth}x${video.videoHeight}`);
                    resolve();
                } else {
                    video.addEventListener('loadedmetadata', onMeta, { once: true });
                    video.addEventListener('error', onError, { once: true });
                }
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    video.removeEventListener('loadedmetadata', onMeta);
                    video.removeEventListener('error', onError);
                    reject(new Error('Video metadata loading timeout'));
                }, 10000);
            });

            try {
                await video.play();
                console.log("✓ Video playback started successfully");
            } catch (err) {
                console.warn("Video autoplay blocked:", err.message);
                throw new Error('Autoplay blocked — tap the screen to start the camera.');
            }

            console.log("✓ Camera opened successfully");
            return this.stream;

        } catch (error) {
            console.error("Camera opening failed:", error);
            await this._stopTracks(); // Clean up on failure
            throw error;
        }
    }

    /**
     * Switch between front/rear. If we know device list, we pick the other one.
     * If not, we use facingMode hint as a fallback.
     */
    async switchCamera(video) {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera not supported in this browser');
        }

        console.log("=== SWITCHING CAMERA ===");
        
        const hadDeviceId = !!this.currentDeviceId;
        await this._enumerateVideoInputs();

        try {
            // If we have multiple devices, pick the "other" one
            if (this.devices.length > 1 && hadDeviceId) {
                const idx = this.devices.findIndex((d) => d.deviceId === this.currentDeviceId);
                const nextIdx = (idx + 1) % this.devices.length;
                const nextId = this.devices[nextIdx].deviceId;
                
                console.log(`Switching from device ${idx} to device ${nextIdx}`);
                
                await this._stopTracks();
                await this._openWithConstraints({
                    deviceId: { exact: nextId },
                    ...this._baseVideoConstraints(),
                });
                this.currentDeviceId = nextId;
                
            } else {
                console.log("Using facingMode fallback for camera switch");
                // Fallback: toggle facingMode hint
                const preferRear = true; // arbitrary; toggle behavior
                await this._stopTracks();
                await this._openWithConstraints({
                    facingMode: { ideal: preferRear ? 'environment' : 'user' },
                    ...this._baseVideoConstraints(),
                });
                await this._enumerateVideoInputs();
                this.currentDeviceId = this.devices[0]?.deviceId || null;
            }

            this._applyStreamToVideo(video);
            
            // Ensure playback resumes
            try { 
                await video.play(); 
                console.log("✓ Camera switch successful");
            } catch (err) {
                console.warn("Video play after switch failed:", err);
            }
            
            return this.stream;
            
        } catch (error) {
            console.error("Camera switch failed:", error);
            throw error;
        }
    }

    async _stopTracks() {
        try {
            if (this.stream) {
                console.log("Stopping camera tracks");
                this.stream.getTracks().forEach((track) => {
                    track.stop();
                    console.log(`Stopped track: ${track.kind} (${track.label})`);
                });
            }
        } catch (e) {
            console.warn("Error stopping tracks:", e);
        }
        this.stream = null;
    }

    close(video) {
        console.log("=== CLOSING CAMERA ===");
        try {
            if (video) {
                video.pause();
                video.srcObject = null;
                console.log("Video element cleaned up");
            }
        } catch (e) {
            console.warn("Error cleaning up video element:", e);
        }
        
        this._stopTracks();
        console.log("✓ Camera closed");
    }

    // FIXED: Add utility method to get current camera info
    getCurrentCameraInfo() {
        if (!this.stream) return null;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        if (!videoTrack) return null;
        
        const settings = videoTrack.getSettings();
        const constraints = videoTrack.getConstraints();
        
        return {
            label: videoTrack.label,
            deviceId: settings.deviceId,
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode,
            constraints: constraints
        };
    }
}