import { InfoPage } from "@/components/info-page";

export default function ContactPage() {
  return (
    <InfoPage title="Contact us">
      <p>
        For this demo, support requests are simulated. In production, this page would connect to
        Glido&apos;s support ticketing system.
      </p>
      <h2>Reach us</h2>
      <ul>
        <li>Email: support@glido.app (demo address)</li>
        <li>Help Center: see the Help Center link in the footer</li>
      </ul>
    </InfoPage>
  );
}
