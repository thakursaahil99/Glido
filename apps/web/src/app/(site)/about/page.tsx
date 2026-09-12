import { InfoPage } from "@/components/info-page";

export default function AboutPage() {
  return (
    <InfoPage title="About Glido">
      <p>
        Glido is a local-commerce super app bringing food delivery, grocery delivery and ride
        booking into one place. This build is a demo/portfolio project showcasing a full-stack
        architecture — not a registered business.
      </p>
      <h2>What we&apos;re building</h2>
      <p>
        Glido Food is live in this demo: browse restaurants, order, pay, and track delivery in
        real time. Glido Grocery and Glido Cab share the same account, wallet and design system,
        and are the next modules planned on this platform.
      </p>
    </InfoPage>
  );
}
