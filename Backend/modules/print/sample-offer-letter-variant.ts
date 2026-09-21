export type SampleOfferLetterVariant = "osl" | "pi";

const DOCUMENT_HEADING = "Sample Offer Letter for Inspection";

export function sampleOfferLetterLabels(variant: SampleOfferLetterVariant) {
  return {
    modalTitle: "Sample Requirements",
    documentHeading: DOCUMENT_HEADING,
    documentTitle: DOCUMENT_HEADING,
    iframeTitle:
      variant === "pi" ? "PI sample print preview" : "OSL sample print preview",
    qeSubtitle: "Sample Offer Letter · AI Powered",
  };
}
