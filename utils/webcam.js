// utils/webcam.js
export class Webcam {
  stream = null;
  currentDeviceId = null;
  devices = []; // cached list of video input devices

  async _enumerateVideoInputs() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this.devices = all.filter((d) => d.kind === 'videoinput');
    } catch (e) {
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
    const keywordsRear = ['back', 'rear', 'environment', 'trás']; // add more locales if you need
    const keywordsFront = ['front', 'user', 'face', 'frontal'];

    const match = (dev, kws) =>
      kws.some((k) => dev.label.toLowerCase().includes(k));

    const rear = list.find((d) => match(d, keywordsRear));
    const front = list.find((d) => match(d, keywordsFront));

    if (preferRear && rear) return rear.deviceId;
    if (!preferRear && front) return front.deviceId;

    // Fallback: if single camera, return it; else return first/last by preference
    if (list.length === 1) return list[0].deviceId;
    return preferRear ? (rear?.deviceId || list[list.length - 1].deviceId)
                      : (front?.deviceId || list[0].deviceId);
  }

  _baseVideoConstraints() {
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      // advanced: [{ focusMode: 'continuous' }] // some browsers support this
    };
  }

  async _openWithConstraints(constraints) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: constraints,
    });
    return this.stream;
  }

  _applyStreamToVideo(video) {
    video.srcObject = this.stream;
    // iOS / mobile quirks
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.autoplay = true;
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
        await this._openWithConstraints({
          facingMode: { ideal: preferRear ? 'environment' : 'user' },
          ...this._baseVideoConstraints(),
        });
        // After permission, enumerate again to cache devices for switching
        await this._enumerateVideoInputs();
        this.currentDeviceId = this.devices[0]?.deviceId || null;
      }
    } catch (e1) {
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
    await new Promise((resolve) => {
      const onMeta = () => {
        video.removeEventListener('loadedmetadata', onMeta);
        resolve();
      };
      if (video.readyState >= 1) resolve();
      else video.addEventListener('loadedmetadata', onMeta, { once: true });
    });

    try {
      await video.play();
    } catch (err) {
      throw new Error('Autoplay blocked — tap the screen to start the camera.');
    }

    return this.stream;
  }

  /**
   * Switch between front/rear. If we know device list, we pick the other one.
   * If not, we use facingMode hint as a fallback.
   */
  async switchCamera(video) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera not supported in this browser');
    }
    const hadDeviceId = !!this.currentDeviceId;
    await this._enumerateVideoInputs();

    // If we have multiple devices, pick the "other" one
    if (this.devices.length > 1 && hadDeviceId) {
      const idx = this.devices.findIndex((d) => d.deviceId === this.currentDeviceId);
      const nextIdx = (idx + 1) % this.devices.length;
      const nextId = this.devices[nextIdx].deviceId;

      await this._stopTracks();
      await this._openWithConstraints({
        deviceId: { exact: nextId },
        ...this._baseVideoConstraints(),
      });
      this.currentDeviceId = nextId;
    } else {
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
    try { await video.play(); } catch {}
    return this.stream;
  }

  async _stopTracks() {
    try {
      this.stream?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    this.stream = null;
  }

  close(video) {
    try {
      if (video) {
        video.pause?.();
        // @ts-ignore
        video.srcObject = null;
      }
    } catch {}
    this._stopTracks();
  }
}
