import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-6">This page doesn't exist.</p>
      <Link href="/" className="text-primary hover:underline">Go home</Link>
    </div>
  )
}
