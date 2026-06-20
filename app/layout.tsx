import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "$CLAW - Every Holder Is a Ball",
  description: "A photoreal claw machine with a real 3D claw reveal layer for holder rewards.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
