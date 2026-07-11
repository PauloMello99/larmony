import { Nav } from "./nav"
import { Hero } from "./hero"
import { FeaturesSection } from "./features-section"
import { Tour } from "./tour"
import { About } from "./about"
import { Pricing } from "./pricing"
import { Faq } from "./faq"
import { FinalCta } from "./final-cta"
import { Footer } from "./footer"

// Sora vem do wrapper global em `_app.tsx` (shared/lib/fonts) — sem override local.
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white antialiased">
      {/* Transições de reveal + fallbacks (reduced-motion via media query,
          no-JS via <noscript>). Escopadas à landing pelo prefixo `lp-`. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.lp-reveal{opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);}
.lp-reveal.in{opacity:1;transform:none;}
.lp-reveal.lp-d1{transition-delay:.1s;}.lp-reveal.lp-d2{transition-delay:.2s;}.lp-reveal.lp-d3{transition-delay:.3s;}
@media (prefers-reduced-motion: reduce){.lp-reveal{opacity:1 !important;transform:none !important;transition:none !important;}}
html{scroll-behavior:smooth;}
`,
        }}
      />
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: `.lp-reveal{opacity:1 !important;transform:none !important;}`,
          }}
        />
      </noscript>

      <Nav />
      <main>
        <Hero />
        <FeaturesSection />
        <Tour />
        <About />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
