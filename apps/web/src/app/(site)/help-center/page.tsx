import { InfoPage } from "@/components/info-page";

export default function HelpCenterPage() {
  return (
    <InfoPage title="Help Center">
      <h2>Order issues</h2>
      <p>Go to Orders → select your order → Cancel (if still eligible), or contact support via the Contact page.</p>
      <h2>Payment issues</h2>
      <p>If a payment fails, the order remains unpaid — retry from the order detail page (production would offer a retry-payment action).</p>
      <h2>Account</h2>
      <p>Sign in with your email/phone and password from the Login page. Forgot-password self-service isn&apos;t built yet in this demo — contact support to reset an account.</p>
    </InfoPage>
  );
}
