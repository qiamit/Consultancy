import type { RegulatoryUpdateSource } from "./types";

export type UpdateSourceConfig = {
  id: RegulatoryUpdateSource;
  name: string;
  urls: string[];
  homepage: string;
};

export const UPDATE_SOURCES: UpdateSourceConfig[] = [
  {
    id: "BIS",
    name: "Bureau of Indian Standards",
    urls: ["https://www.bis.gov.in/index.php/news", "https://www.bis.gov.in/"],
    homepage: "https://www.bis.gov.in/",
  },
  {
    id: "ISO",
    name: "International Organization for Standardization",
    urls: ["https://www.iso.org/home.html", "https://www.iso.org/news"],
    homepage: "https://www.iso.org/",
  },
  {
    id: "NABL",
    name: "National Accreditation Board for Testing and Calibration Laboratories",
    urls: ["https://nabl-india.org/"],
    homepage: "https://nabl-india.org/",
  },
  {
    id: "QCI",
    name: "Quality Council of India",
    urls: ["https://qcin.org/index.php", "https://qcin.org/"],
    homepage: "https://qcin.org/",
  },
  {
    id: "QAI",
    name: "Quality and Accreditation Institute",
    urls: ["https://qai.org.in/"],
    homepage: "https://qai.org.in/",
  },
  {
    id: "IQAS",
    name: "International Quality and Accreditation Services",
    urls: ["https://www.iqas.co.in/"],
    homepage: "https://www.iqas.co.in/",
  },
];
