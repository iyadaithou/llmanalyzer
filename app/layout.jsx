import "./globals.css";

export const metadata = {
  title: "LLM Analyzer",
  description:
    "Compare how different LLMs respond to the same prompt, side by side.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
