export type SampleFailureDocKind =
  | "failure-letter"
  | "offer-letter"
  | "factory-test-report";

export function sampleFailureDocumentPath(
  userId: string,
  replyId: string,
  kind: SampleFailureDocKind,
  fileName: string,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${userId}/bis/sample-failure-reply/${replyId}/${kind}/${crypto.randomUUID()}_${safe}`;
}
