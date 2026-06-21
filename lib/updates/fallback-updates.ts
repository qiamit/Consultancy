import type { RegulatoryUpdate } from "./types";
import { withTagColors } from "./types";

const RAW: Omit<RegulatoryUpdate, "tagColor">[] = [
  {
    tag: "QCO Alert",
    date: "Jun 2026",
    title: "Electronic Toys — BIS Mandatory from Oct 2025",
    desc: "Battery-operated electronic toys must obtain BIS certification under IS 9873-4.",
    source: "BIS",
    sourceUrl: "https://www.bis.gov.in/",
  },
  {
    tag: "BIS",
    date: "May 2026",
    title: "CRS Mandatory for LED Drivers — IS 16102 Part 2",
    desc: "LED drivers for luminaires must be registered on BIS CRS portal. Grace period ended.",
    source: "BIS",
    sourceUrl: "https://www.bis.gov.in/",
  },
  {
    tag: "NABL",
    date: "Jun 2026",
    title: "NABL Technical Training — Uncertainty of Measurement",
    desc: "Upcoming NABL training on estimating uncertainty in mechanical calibration (Dimension), 23 Jun 2026.",
    source: "NABL",
    sourceUrl: "https://nabl-india.org/",
  },
  {
    tag: "ISO",
    date: "Mar 2026",
    title: "ISO 9001:2025 Draft — Transition in 2026",
    desc: "New revision underway. Organizations should monitor CB transition timelines.",
    source: "ISO",
    sourceUrl: "https://www.iso.org/",
  },
  {
    tag: "QAI",
    date: "Jun 2026",
    title: "World Accreditation Day 2026 Webinar",
    desc: "QAI webinar for healthcare leaders and quality professionals on accreditation standards.",
    source: "QAI",
    sourceUrl: "https://qai.org.in/",
  },
  {
    tag: "IQAS",
    date: "Jun 2026",
    title: "IQAS Training — Stack Monitoring & Reporting",
    desc: "Knowledge centre training on stack monitoring, analysis and reporting of results.",
    source: "IQAS",
    sourceUrl: "https://www.iqas.co.in/",
  },
];

export const FALLBACK_UPDATES: RegulatoryUpdate[] = withTagColors(RAW);
