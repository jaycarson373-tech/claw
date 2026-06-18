import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Claw Vault",
  description: "A giant provable-random claw machine for weighted holder rewards.",
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
