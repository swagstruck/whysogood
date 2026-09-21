'use client';
import React from 'react';
import { ImageToPdfConverter } from './ImageToPdfConverter';

export default function JpgToPdfTool() {
  return (
    <ImageToPdfConverter
      acceptedFormats="image/jpeg,.jpg,.jpeg"
      title="Select JPG images to convert to PDF"
      description="or drop JPG files here • adjust orientation, margins, and page order"
      defaultOutputName="converted_from_jpg.pdf"
    />
  );
}
