export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const bufferLength = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = bufferLength * blockAlign;
  const chunkSize = 36 + dataSize;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, chunkSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const offset = 44;
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let pos = offset;
  for (let i = 0; i < bufferLength; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function trimAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const startOffset = Math.max(0, Math.floor(startSec * buffer.sampleRate));
  const endOffset = Math.min(buffer.length, Math.ceil(endSec * buffer.sampleRate));
  const newLength = endOffset - startOffset;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const channelData = buffer.getChannelData(i);
    const newChannelData = newBuffer.getChannelData(i);
    newChannelData.set(channelData.subarray(startOffset, endOffset));
  }
  return newBuffer;
}

export function mergeAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) throw new Error("No buffers to merge");
  let totalLength = 0;
  for (const b of buffers) totalLength += b.length;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = buffers[0].sampleRate;
  const numChannels = buffers[0].numberOfChannels;
  const result = ctx.createBuffer(numChannels, totalLength, sampleRate);
  
  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.numberOfChannels > channel 
        ? buffer.getChannelData(channel)
        : buffer.getChannelData(0); // fallback to first channel if mono
      result.getChannelData(channel).set(channelData, offset);
    }
    offset += buffer.length;
  }
  return result;
}

export function changeVolume(buffer: AudioBuffer, gainMultiplier: number): AudioBuffer {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const data = buffer.getChannelData(i);
    const newData = newBuffer.getChannelData(i);
    for (let j = 0; j < data.length; j++) {
      newData[j] = data[j] * gainMultiplier;
    }
  }
  return newBuffer;
}

export function stripId3Tags(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  if (buffer.byteLength < 10) return buffer;
  
  if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
    const size = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9);
    const totalHeaderSize = size + 10;
    if (totalHeaderSize < buffer.byteLength) {
      return buffer.slice(totalHeaderSize);
    }
  }
  return buffer;
}

export async function decodeAudio(arrayBuffer: ArrayBuffer, ctx: AudioContext): Promise<AudioBuffer> {
  return await ctx.decodeAudioData(arrayBuffer);
}

export async function renderOffline(source: AudioBuffer): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(source.numberOfChannels, source.length, source.sampleRate);
  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = source;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);
  return await offlineCtx.startRendering();
}
