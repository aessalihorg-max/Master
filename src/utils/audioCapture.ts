/**
 * audioCapture.ts
 * WebRTC microphone access for voice quality testing
 */

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error: any) {
    console.warn('Microphone permission error:', error.name);
    return false;
  }
}

export function isRecordingSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    (window.AudioContext || (window as any).webkitAudioContext)
  );
}

export async function startRecording(durationMs: number = 5000): Promise<Float32Array> {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      const audioChunks: Float32Array[] = [];
      const startTime = Date.now();

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioChunks.push(new Float32Array(inputData));

        if (Date.now() - startTime > durationMs) {
          source.disconnect();
          processor.disconnect();
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();

          const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combinedAudio = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
          }

          resolve(combinedAudio);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      reject(error);
    }
  });
}
