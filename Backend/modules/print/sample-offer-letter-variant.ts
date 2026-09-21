export type SampleOfferLetterVariant = "osl" | "pi";

export function sampleOfferLetterLabels(variant: SampleOfferLetterVariant) {
  if (variant === "pi") {
    return {
      modalTitle: "Sample Requirements",
      documentHeading: "Sample Offer Letter for Inspection",
      documentTitle: "Sample Offer Letter for Inspection",
      iframeTitle: "PI sample print preview",
      qeSubtitle: "Sample Offer Letter · AI Powered",
    };
  }
  return {
    modalTitle: "Sample Requirements",
    documentHeading: "Sample Offer Letter for Inspection",
    documentTitle: "Sample Offer Letter for Inspection",
    iframeTitle: "OSL sample print preview",
    qeSubtitle: "Sample Offer Letter · AI Powered",
  };
}
