export const metadata = {
  title: 'Tiffany — Second Brain',
  description: 'Your personal second brain and operating system',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#F7F5F0' }}>
        {children}
      </body>
    </html>
  );
}
