'use client';

import React from 'react';
import InteractiveAudioCutter from '../common/InteractiveAudioCutter';

export default function Mp3TrimmerTool() {
  return (
    <InteractiveAudioCutter
      toolTitle="MP3 Trimmer & Audio Cutter"
      defaultFormat="mp3"
      allowedFormats={['mp3', 'wav', 'ogg', 'm4a']}
    />
  );
}
