import type { PropsWithChildren } from "react";
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();
  return (
    <html {...htmlAttributes} lang="zh-CN">
      <head>
        {headNodes}
        <title>月相 Cycle</title>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F8F5F1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="月相" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="description"
          content="月相 Cycle：本地优先的经期记录与日历估计。"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/apple-touch-icon.png"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body,#root{height:100%;min-height:100%;background:#F8F5F1}body{overscroll-behavior-y:none}#root{padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);box-sizing:border-box}input,textarea{font-size:16px!important}*:focus-visible{outline:2px solid #925266;outline-offset:2px}@media(prefers-color-scheme:dark){html,body,#root{background:#1D191C}}",
          }}
        />
        <script defer src="/pwa-register.js" />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
