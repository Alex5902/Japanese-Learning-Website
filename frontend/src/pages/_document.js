import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        {/* The main Next.js app */}
        <Main />
        {/* Portal root for modals, dropdowns, etc. */}
        <div id="portal-root"></div>
        <NextScript />
      </body>
    </Html>
  );
}
