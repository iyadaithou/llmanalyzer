"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Markdown({ children }) {
  return (
    <div className="prose-chat text-[13.5px] leading-[1.55]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ""}</ReactMarkdown>
    </div>
  );
}

// Memoized on shallow `children` equality. During streaming, this lets idle
// windows skip the (expensive) remark-gfm re-parse when other windows update.
export default memo(Markdown);
