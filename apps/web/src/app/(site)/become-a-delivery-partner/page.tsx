import { Download } from "lucide-react";
import { APP_DOWNLOADS } from "@/lib/app-downloads";
import { InfoPage } from "@/components/info-page";

export default function BecomeDeliveryPartnerPage() {
  return (
    <InfoPage title="Become a Glido delivery partner">
      <p>
        Go online, accept nearby orders, and navigate to pickup/drop — all from the Glido Delivery
        Partner app. Partner accounts are approved and created by the Admin team; once you have a
        login, download the app below to get started.
      </p>
      <a
        href={APP_DOWNLOADS.delivery}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--glido-primary)] text-white font-semibold px-5 py-3 not-prose hover:opacity-90"
      >
        <Download size={18} /> Download the Delivery Partner app (Android)
      </a>
      <p>
        Don&apos;t have a login yet? Contact Glido support via the{" "}
        <a href="/contact" className="text-[var(--glido-primary)] font-medium">
          Contact page
        </a>{" "}
        to get set up.
      </p>
    </InfoPage>
  );
}
