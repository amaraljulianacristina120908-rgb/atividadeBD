// Wrappers para APIs Nativas do Navegador (Câmera, Geolocalização, Áudio)

/**
 * Obtém a posição geográfica atual do dispositivo
 */
export function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      return reject(new Error('Geolocalização não é suportada neste navegador.'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let msg = 'Erro ao obter geolocalização.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Permissão de localização negada pelo usuário.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Informações de localização indisponíveis.';
            break;
          case error.TIMEOUT:
            msg = 'Tempo limite excedido ao obter localização.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Inicia a câmera e anexa o fluxo de vídeo ao elemento fornecido
 */
export async function startCameraStream(videoElement) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Acesso à câmera não é suportado neste navegador.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false
  });

  if (videoElement) {
    videoElement.srcObject = stream;
    await videoElement.play();
  }

  return stream;
}

/**
 * Captura uma foto a partir do elemento de vídeo
 */
export function captureCameraFrame(videoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

/**
 * Para a execução da câmera
 */
export function stopCameraStream(stream) {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Gravador de Áudio Nativo
 */
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Gravação de áudio não é suportada neste navegador.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Nenhuma gravação em andamento.'));
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Encerrar faixas do microfone
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        resolve({ blob: audioBlob, url: audioUrl });
      };

      this.mediaRecorder.stop();
    });
  }
}
