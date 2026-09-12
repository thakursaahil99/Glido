import { InfoPage } from "@/components/info-page";

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p>
        This demo stores the information you provide (name, email/phone, addresses, orders) in a
        local database for the purpose of demonstrating the Glido platform. No data is shared with
        third parties.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Account details you provide (name, email or phone)</li>
        <li>Delivery addresses you add</li>
        <li>Order and payment records</li>
      </ul>
    </InfoPage>
  );
}
