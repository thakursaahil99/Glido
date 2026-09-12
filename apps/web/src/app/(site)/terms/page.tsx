import { InfoPage } from "@/components/info-page";

export default function TermsPage() {
  return (
    <InfoPage title="Terms & Conditions">
      <p>
        By using Glido, you agree to these terms. Please read them carefully before placing an
        order or booking a ride.
      </p>
      <h2>Use of the platform</h2>
      <p>
        Orders and rides placed on Glido are recorded and processed in real time. Card and UPI
        payments are only charged when a payment gateway is actively configured for the account
        placing the order — otherwise the order proceeds as Cash on Delivery / pay-the-driver.
      </p>
      <h2>Accounts</h2>
      <p>Login uses your email/phone and password. Admin accounts are created and managed from the Admin panel by a Super Admin.</p>
    </InfoPage>
  );
}
