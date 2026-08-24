"use client";

import { useState } from "react";
import type { CompanyTextTemplateRow } from "@backend/shared/types/company-text-template";

function useTemplatePick(
  active: boolean,
  isNew: boolean,
  defaultTemplate: CompanyTextTemplateRow | null,
) {
  const [picked, setPicked] = useState<CompanyTextTemplateRow | null>(null);
  const modeKey = active ? (isNew ? "new" : "edit") : "hidden";
  const [appliedMode, setAppliedMode] = useState(modeKey);

  if (modeKey !== appliedMode) {
    setAppliedMode(modeKey);
    setPicked(null);
  }

  const activeTemplate = picked ?? (active && isNew ? defaultTemplate : null);

  return {
    templateId: activeTemplate?.id ?? "",
    templateName: activeTemplate?.name ?? "",
    pickTemplate: setPicked,
    defaultTemplate,
  };
}

export function useFinanceTextTemplateSelection({
  visible,
  isNewParam,
  defaultNotesTemplate,
  defaultTermsTemplate,
  defaultScopeTemplate,
}: {
  visible: boolean;
  isNewParam: boolean;
  defaultNotesTemplate: CompanyTextTemplateRow | null;
  defaultTermsTemplate: CompanyTextTemplateRow | null;
  defaultScopeTemplate: CompanyTextTemplateRow | null;
}) {
  const notes = useTemplatePick(visible, isNewParam, defaultNotesTemplate);
  const terms = useTemplatePick(visible, isNewParam, defaultTermsTemplate);
  const scope = useTemplatePick(visible, isNewParam, defaultScopeTemplate);

  return { notes, terms, scope };
}
