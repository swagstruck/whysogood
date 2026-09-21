'use client';
import React from 'react';
import { ImageToPdfConverter } from './ImageToPdfConverter';

export default function PngToPdfTool() {
  return (
    <ImageToPdfConverter
      acceptedFormats="image/png,.png"
      title="Select PNG images to convert to PDF"
      description="or drop PNG files here • maintain crisp lines and lossless quality"
      defaultOutputName="converted_from_png.pdf"
    />
  );
}
