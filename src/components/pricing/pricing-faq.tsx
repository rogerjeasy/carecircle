import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "./data";

/** Frequently asked questions accordion. */
export function PricingFaq() {
  const t = useTranslations("pricing.faq.items");

  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.key} value={`item-${index}`}>
          <AccordionTrigger className="text-left">{t(`${faq.key}.question`)}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{t(`${faq.key}.answer`)}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
