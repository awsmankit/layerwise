import type { ReactNode } from 'react';

/**
 * The frame every diagram sits in: a hairline-ruled figure whose picture is one labelled image (the
 * full text alternative), then optional controls that stay outside the image so they remain usable.
 */
export default function Frame({ alt, caption, children, controls }: { alt: string; caption: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <figure className="viz ivd">
      <div className="ivd-art" role="img" aria-label={alt}>
        {children}
      </div>
      {controls}
      <figcaption className="viz-cap ivd-cap">{caption}</figcaption>
    </figure>
  );
}
