'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';

const DEFAULT_FALLBACK = '/images/Img_home_01.png';

export default function SafeImage({ src, fallback = DEFAULT_FALLBACK, alt = '', ...props }) {
  const requestedSrc = src || fallback;
  const [failedSrc, setFailedSrc] = useState('');
  const currentSrc = failedSrc === requestedSrc ? fallback : requestedSrc;

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (requestedSrc !== fallback) setFailedSrc(requestedSrc);
      }}
    />
  );
}
