import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <style dangerouslySetInnerHTML={{
          __html: `
            *, *::before, *::after { box-sizing: border-box; }
            html, body { height: 100%; margin: 0; padding: 0; background: #0f0f0f; }
            #root { height: 100%; display: flex; flex-direction: column; }
          `,
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
