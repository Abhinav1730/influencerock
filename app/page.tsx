import { Capabilities } from "@/components/Capabilities";
import { Consultation } from "@/components/Consultation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Method } from "@/components/Method";
import { NetworkHero } from "@/components/NetworkHero";
import { Responsibility } from "@/components/Responsibility";
import { ScenarioCarousel } from "@/components/ScenarioCarousel";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <NetworkHero />
        <Capabilities />
        <Method />
        <ScenarioCarousel />
        <Responsibility />
        <Consultation />
      </main>
      <Footer />
    </>
  );
}
