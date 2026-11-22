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

export function formatAudioTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const tenths = Math.floor((secs - wholeSecs) * 10);
  const mm = String(mins).padStart(2, '0');
  const ss = String(wholeSecs).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

export function parseAudioTimestamp(str: string): number {
  const parts = str.trim().split(':');
  if (parts.length === 1) return parseFloat(parts[0]) || 0;
  if (parts.length === 2) return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
  if (parts.length === 3) return (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
  return 0;
}

export function extractWaveformPeaks(
  buffer: AudioBuffer,
  numBuckets: number
): { min: Float32Array; max: Float32Array } {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const bucketSize = totalSamples / numBuckets;
  const minPeaks = new Float32Array(numBuckets);
  const maxPeaks = new Float32Array(numBuckets);

  for (let i = 0; i < numBuckets; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(totalSamples, Math.floor((i + 1) * bucketSize));
    let min = 0;
    let max = 0;

    for (let j = start; j < end; j++) {
      const val = channelData[j];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    minPeaks[i] = min;
    maxPeaks[i] = max;
  }

  return { min: minPeaks, max: maxPeaks };
}

export function applyFade(
  buffer: AudioBuffer,
  fadeInDurationSec: number,
  fadeOutDurationSec: number
): AudioBuffer {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const sampleRate = buffer.sampleRate;
  const fadeInSamples = Math.min(buffer.length, Math.floor(fadeInDurationSec * sampleRate));
  const fadeOutSamples = Math.min(buffer.length, Math.floor(fadeOutDurationSec * sampleRate));
  const fadeOutStart = buffer.length - fadeOutSamples;

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = newBuffer.getChannelData(c);
    dst.set(src);

    if (fadeInSamples > 0) {
      for (let i = 0; i < fadeInSamples; i++) {
        const factor = i / fadeInSamples;
        dst[i] *= factor;
      }
    }

    if (fadeOutSamples > 0) {
      for (let i = 0; i < fadeOutSamples; i++) {
        const idx = fadeOutStart + i;
        if (idx < buffer.length) {
          const factor = 1 - (i / fadeOutSamples);
          dst[idx] *= factor;
        }
      }
    }
  }

  return newBuffer;
}

export function cutOutAudioBuffer(
  buffer: AudioBuffer,
  cutStartSec: number,
  cutEndSec: number
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const cutStartOffset = Math.max(0, Math.floor(cutStartSec * sampleRate));
  const cutEndOffset = Math.min(buffer.length, Math.ceil(cutEndSec * sampleRate));

  const part1Length = cutStartOffset;
  const part2Length = Math.max(0, buffer.length - cutEndOffset);
  const newLength = part1Length + part2Length;

  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (newLength <= 0) {
    return ctx.createBuffer(buffer.numberOfChannels, 1, sampleRate);
  }

  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = newBuffer.getChannelData(c);

    if (part1Length > 0) {
      dst.set(src.subarray(0, part1Length), 0);
    }
    if (part2Length > 0) {
      dst.set(src.subarray(cutEndOffset, buffer.length), part1Length);
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

/**
 * Apply a 3-band equalizer (bass / mid / treble) to an AudioBuffer offline.
 * @param buffer    Input AudioBuffer
 * @param bassGainDb   -24 to +24 dB gain for low-shelf at 200 Hz
 * @param midGainDb    -24 to +24 dB gain for peaking EQ at 1 kHz
 * @param trebleGainDb -24 to +24 dB gain for high-shelf at 4 kHz
 */
export async function applyEqualizer(
  buffer: AudioBuffer,
  bassGainDb: number,
  midGainDb: number,
  trebleGainDb: number
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // Bass: low-shelf at 200 Hz
  const bassFilter = offlineCtx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 200;
  bassFilter.gain.value = bassGainDb;

  // Mid: peaking at 1 kHz
  const midFilter = offlineCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 1.0;
  midFilter.gain.value = midGainDb;

  // Treble: high-shelf at 4 kHz
  const trebleFilter = offlineCtx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 4000;
  trebleFilter.gain.value = trebleGainDb;

  // Chain: source → bass → mid → treble → destination
  source.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  trebleFilter.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
}
