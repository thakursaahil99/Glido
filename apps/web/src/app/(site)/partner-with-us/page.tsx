import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export default function PartnerWithUsPage() {
  return (
    <InfoPage title="Partner with Glido">
      <p>
        Restaurant onboarding itself is still handled by the Glido Admin team — a new restaurant is
        created directly in the Admin Panel and starts in <strong>Pending</strong> status until an
        admin approves it.
      </p>
      <p>
        Once approved, an admin creates a partner login for the restaurant. From there, the owner
        manages everything themselves from the{" "}
        <Link href="/partner/login" className="text-[var(--glido-primary)] font-medium">
          Restaurant Partner Portal
        </Link>{" "}
        — opening/closing the restaurant, editing the menu, and updating live order status.
      </p>
    </InfoPage>
  );
}
