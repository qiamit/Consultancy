export type SampleOfferLetterVariant = "osl" | "pi";

export function sampleOfferLetterLabels(variant: SampleOfferLetterVariant) {
  if (variant === "pi") {
    return {
      modalTitle: "Sample for PI",
      documentHeading: "Sample Offer Letter for Preliminary Inspection",
      documentTitle: "Sample Offer Letter for Preliminary Inspection",
      iframeTitle: "PI sample print preview",
      qeSubtitle: "Preliminary Inspection Sample Offer Letter · AI Powered",
    };
  }
  return {
    modalTitle: "Sample for OSL",
    documentHeading: "Sample Offer Letter for OSL",
    documentTitle: "Sample Offer Letter for OSL",
    iframeTitle: "OSL sample print preview",
    qeSubtitle: "OSL Sample Offer Letter · AI Powered",
  };
}
