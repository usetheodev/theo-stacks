export const metadata = {
  title: "{{project-name}}",
  description: "Deployed with Theo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
