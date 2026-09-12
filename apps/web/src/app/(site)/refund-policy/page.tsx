import { InfoPage } from "@/components/info-page";

export default function RefundPolicyPage() {
  return (
    <InfoPage title="Refund & Cancellation Policy">
      <h2>Cancellation</h2>
      <p>
        Orders can be cancelled while in <strong>Order placed</strong> or <strong>Accepted by
        restaurant</strong> status. Once a restaurant starts preparing your order, cancellation is
        disabled to avoid food waste.
      </p>
      <h2>Refunds</h2>
      <p>
        If a cancelled order was paid online, the payment is marked refunded automatically. Cash on
        delivery orders have nothing to refund.
      </p>
    </InfoPage>
  );
}
