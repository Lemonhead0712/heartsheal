import Link from "next/link"
import { Heart } from "lucide-react"
import { PageContainer } from "@/components/page-container"

export default function SubscriptionSuccessPage() {
  return (
    <PageContainer>
      <div className="min-h-screen bg-page-gradient flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary fill-primary/20" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-3">Welcome to HeartsHeal</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Everything is free and ready for you. Your healing journey starts now.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </PageContainer>
  )
}
