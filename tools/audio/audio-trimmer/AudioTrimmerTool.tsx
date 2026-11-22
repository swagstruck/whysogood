'use client';

import React from 'react';
import InteractiveAudioCutter from '../common/InteractiveAudioCutter';

export default function AudioTrimmerTool() {
  return (
    <InteractiveAudioCutter
      toolTitle="Audio Trimmer & Cutter"
      defaultFormat="wav"
      allowedFormats={['wav', 'mp3', 'ogg', 'm4a']}
    />
  );
}
