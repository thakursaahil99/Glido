import Link from "next/link";
import { Download } from "lucide-react";
import { APP_DOWNLOADS } from "@/lib/app-downloads";
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
        manages everything themselves — opening/closing the restaurant, editing the menu, and
        updating live order status — either from the{" "}
        <Link href="/partner/login" className="text-[var(--glido-primary)] font-medium">
          Restaurant Partner Portal
        </Link>{" "}
        on the web, or from the Restaurant Partner mobile app.
      </p>
      <a
        href={APP_DOWNLOADS.restaurantPartner}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--glido-primary)] text-white font-semibold px-5 py-3 not-prose hover:opacity-90"
      >
        <Download size={18} /> Download the Restaurant Partner app (Android)
      </a>
    </InfoPage>
  );
}
