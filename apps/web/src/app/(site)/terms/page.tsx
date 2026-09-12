import { InfoPage } from "@/components/info-page";

export default function TermsPage() {
  return (
    <InfoPage title="Terms & Conditions">
      <p>
        These are demo terms for the Glido demo project. By using this demo, you acknowledge it is
        a portfolio/technical showcase and not a live commercial service.
      </p>
      <h2>Use of the platform</h2>
      <p>Orders placed in this demo are real database records but no real payment is charged unless a live payment gateway key is configured.</p>
      <h2>Accounts</h2>
      <p>Login uses your email/phone and password. Admin accounts are created and managed from the Admin panel by a Super Admin.</p>
    </InfoPage>
  );
}
