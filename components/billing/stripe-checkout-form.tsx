import { Button } from "@/components/ui/button";
import { createStripeCheckoutSession } from "@/lib/stripe/checkout-action";
import type { StripePlanCode } from "@/lib/stripe/plans";

export function StripeCheckoutForm({
  children,
  className,
  disabled,
  planCode,
}: {
  children: string;
  className?: string;
  disabled?: boolean;
  planCode: StripePlanCode;
}) {
  return (
    <form action={createStripeCheckoutSession.bind(null, planCode)}>
      <Button className={className} disabled={disabled} type="submit">
        {children}
      </Button>
    </form>
  );
}
