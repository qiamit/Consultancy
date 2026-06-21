"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNavbar } from "@/components/public/site-navbar";
import { SiteFooter } from "@/components/public/site-footer";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

interface ServiceData {
  slug: string;
  icon: string;
  title: string;
  tagline: string;
  tag: string;
  accentFrom: string;
  accentTo: string;
  intro: string;
  whyNeeded: string;
  scope: string[];
  process: { step: string; title: string; desc: string }[];
  deliverables: string[];
  faqs: { q: string; a: string }[];
  relatedSlugs: string[];
  stats: { value: string; label: string }[];
}

const SERVICES: Record<string, ServiceData> = {
  "product-certification": {
    slug: "product-certification",
    icon: "🏆",
    title: "BIS Product Certification (ISI Mark)",
    tagline: "Mandatory ISI Mark for 500+ products under Quality Control Orders",
    tag: "Core Service",
    accentFrom: "#0D47A1",
    accentTo: "#1976D2",
    stats: [
      { value: "500+", label: "IS Codes Covered" },
      { value: "6 Steps", label: "Structured Process" },
      { value: "3–6 Mo", label: "Typical Timeline" },
      { value: "95%", label: "First-Time Approval" },
    ],
    intro: "BIS Product Certification under Scheme-I allows manufacturers to use the Standard Mark (ISI Mark) on their products, certifying conformity to Indian Standards. This is mandatory for hundreds of products covered under Quality Control Orders (QCOs) issued by the Ministry of Commerce & Industry, Government of India.",
    whyNeeded: "If your product falls under a QCO, manufacturing or selling it without a BIS License and ISI Mark is a punishable offence under the BIS Act, 2016. Beyond compliance, the ISI Mark builds consumer trust, opens government tender eligibility, and enables market access across India.",
    scope: [
      "All products under Scheme-I Compulsory Certification (QCO products)",
      "Steel, cement, cables & wires, switches, LED lights, toys, fans, helmets",
      "Electronics, IT products under CRS (Compulsory Registration Scheme)",
      "Domestic appliances, pressure cookers, LPG fittings",
      "Chemical products including fertilizers and rubber goods",
      "Foreign manufacturers exporting to India (FMCS Scheme)",
    ],
    process: [
      { step: "01", title: "Initial Assessment", desc: "We identify the applicable IS code, check QCO status, and assess whether your product meets testing prerequisites before any investment." },
      { step: "02", title: "Testing at BIS-Approved Lab", desc: "We coordinate sample testing at a BIS-empanelled or NABL-accredited laboratory. We guide your team on correct sample preparation to avoid test failures." },
      { step: "03", title: "Documentation Preparation", desc: "We prepare the complete application package — plant layout, process flow, quality manual, testing equipment list, and all annexures required by BIS." },
      { step: "04", title: "Application Filing on Manak Online", desc: "We file the application on BIS Manak Online Portal and track acknowledgement. All queries from BIS are responded to promptly." },
      { step: "05", title: "Factory Inspection Support", desc: "We prepare your factory for the BIS inspection visit — ensuring production process, testing equipment, records, and marking process meet BIS requirements." },
      { step: "06", title: "License Grant & Marking", desc: "After successful inspection, BIS grants the license. We guide you on correct ISI Mark application on products, packaging, and ongoing compliance." },
    ],
    deliverables: [
      "BIS License under applicable IS code",
      "Complete documentation set for BIS records",
      "Factory readiness checklist and pre-inspection support",
      "Guidance on ISI Mark application and labeling requirements",
      "Support for license renewals and amendment applications",
      "Ongoing compliance monitoring and advisory",
    ],
    faqs: [
      { q: "How long does BIS product certification take?", a: "Typically 3–6 months from application acceptance, subject to successful testing and factory inspection. Complex products or additional test parameters may take longer." },
      { q: "What if my product fails the BIS test?", a: "We provide failure analysis support to identify what needs to be changed in the product formulation or manufacturing process, and guide retesting." },
      { q: "Can you help for products manufactured outside India?", a: "Yes. Foreign manufacturers need BIS certification under the FMCS (Foreign Manufacturer Certification Scheme). We handle the Indian liaison requirements." },
      { q: "What is the cost of BIS certification?", a: "Total cost includes BIS fees (₹1,000–₹25,000 depending on product), testing charges (variable), and our consultancy fee. We provide a complete estimate after product assessment." },
    ],
    relatedSlugs: ["lab-accreditation", "testing", "management-system"],
  },

  "lab-accreditation": {
    slug: "lab-accreditation",
    icon: "🔬",
    title: "Laboratory Accreditation",
    tagline: "NABL, QAI, IQAS & FDAS accreditation for testing and calibration labs",
    tag: "Accreditation",
    accentFrom: "#00695C",
    accentTo: "#00897B",
    stats: [
      { value: "ISO 17025", label: "Standard Applied" },
      { value: "4 Bodies", label: "NABL / QAI / IQAS / FDAS" },
      { value: "6–12 Mo", label: "Typical Timeline" },
      { value: "100%", label: "Document Coverage" },
    ],
    intro: "Laboratory accreditation is a formal recognition that a laboratory is technically competent to carry out specific tests and calibrations. Accreditation by NABL (National Accreditation Board for Testing & Calibration Laboratories) or QCI bodies (QAI, IQAS, FDAS) is internationally recognized and accepted by regulators, BIS, and export bodies.",
    whyNeeded: "NABL accreditation is required for laboratories wishing to become BIS-empanelled testing labs. It is also required for export testing, government contracts, and demonstrating competence to clients. Accreditation gives your lab a market advantage and increases client confidence in your results.",
    scope: [
      "Testing laboratories seeking NABL accreditation (IS/ISO 17025:2017)",
      "Calibration laboratories seeking NABL accreditation",
      "Medical testing labs seeking NABL (IS 15189:2022)",
      "QAI accreditation for inspection bodies",
      "IQAS accreditation under QCI",
      "FDAS accreditation",
    ],
    process: [
      { step: "01", title: "Gap Analysis", desc: "Comprehensive audit of your existing lab infrastructure, documentation, processes, and equipment against ISO/IEC 17025:2017 requirements." },
      { step: "02", title: "QMS Documentation", desc: "We develop your complete Quality Management System documentation — Quality Manual, Method SOPs, Equipment Calibration records, and all forms required by NABL." },
      { step: "03", title: "Staff Training", desc: "Training for lab personnel on ISO 17025 requirements, measurement uncertainty, method validation, proficiency testing, and internal audit procedures." },
      { step: "04", title: "Application & Scope Definition", desc: "We help define your accreditation scope, select appropriate test methods (IS / ASTM / ISO / IEC), and file the NABL online application." },
      { step: "05", title: "Mock Assessment", desc: "We conduct a mock assessment simulating the NABL assessor visit — identifying gaps and correcting non-conformities before the actual assessment." },
      { step: "06", title: "Assessment & Follow-up", desc: "We support your team during the NABL assessor visit and handle any post-assessment corrective actions to ensure accreditation is granted." },
    ],
    deliverables: [
      "Complete ISO/IEC 17025:2017 Quality Management System documentation",
      "NABL application and scope document",
      "Internal audit program and records",
      "Proficiency testing schedule and participation support",
      "Pre-assessment (mock audit) report",
      "Post-assessment corrective action support",
    ],
    faqs: [
      { q: "How long does NABL accreditation take?", a: "From documentation to accreditation typically takes 6–12 months. Timelines depend on NABL's assessment schedule and the number of test methods in scope." },
      { q: "What is NABL accreditation cost?", a: "NABL fees depend on the number of test methods and disciplines. Plus our consultancy fee. We provide a complete cost estimate after scope discussion." },
      { q: "Do we need to participate in proficiency testing before accreditation?", a: "Yes, NABL requires at least one successful proficiency testing (PT) or inter-laboratory comparison (ILC) participation before granting accreditation." },
      { q: "What is the difference between NABL, QAI and IQAS?", a: "NABL accredits testing and calibration labs under ISO 17025. QAI and IQAS (under QCI) accredit inspection bodies and management system certification bodies. We can guide you to the right one based on your activities." },
    ],
    relatedSlugs: ["product-certification", "calibration", "testing"],
  },

  "management-system": {
    slug: "management-system",
    icon: "📋",
    title: "Management System Certification",
    tagline: "ISO 9001, ISO 14001, ISO 45001 & ISO 50001 certification services",
    tag: "ISO Standards",
    accentFrom: "#283593",
    accentTo: "#3F51B5",
    stats: [
      { value: "4 Standards", label: "ISO 9001 / 14001 / 45001 / 50001" },
      { value: "IMS", label: "Integrated System Option" },
      { value: "3–5 Mo", label: "Typical Timeline" },
      { value: "NABCB", label: "Accredited CB Selection" },
    ],
    intro: "ISO Management System Certifications demonstrate your organization's commitment to quality, environmental responsibility, and occupational health & safety. Certification by an accredited certification body gives buyers, clients, and regulators confidence in your organization's processes and controls.",
    whyNeeded: "ISO 9001 is often mandatory for government contracts, large buyer vendor approval, and export documentation. ISO 14001 and ISO 45001 are required for factories under pollution control or labor safety audits, and increasingly demanded by global buyers for ethical sourcing compliance.",
    scope: [
      "ISO 9001:2015 — Quality Management System for all industry types",
      "ISO 14001:2015 — Environmental Management System",
      "ISO 45001:2018 — Occupational Health & Safety Management System",
      "ISO 50001:2018 — Energy Management System",
      "Integrated Management System (IMS) covering 9001+14001+45001",
      "Manufacturing, service, trading and process industries",
    ],
    process: [
      { step: "01", title: "Gap Analysis", desc: "Assessment of existing processes against ISO standard requirements — identifying what's in place and what needs to be developed or documented." },
      { step: "02", title: "Documentation Development", desc: "We create your Quality Manual, Procedures, Work Instructions, Risk Register, Objectives, and all required records aligned to the standard." },
      { step: "03", title: "Training & Awareness", desc: "Training for top management and all departments on their roles in the management system. Awareness sessions ensure system buy-in." },
      { step: "04", title: "Implementation Support", desc: "On-site guidance during the initial implementation phase to ensure processes are working as documented and records are being maintained correctly." },
      { step: "05", title: "Internal Audit", desc: "We conduct an independent internal audit to identify non-conformities before the certification body audit — ensuring you're ready." },
      { step: "06", title: "Certification Body Audit Support", desc: "We liaise with the NABCB-accredited certification body and support your team during Stage 1 (documentation review) and Stage 2 (on-site) audits." },
    ],
    deliverables: [
      "Complete ISO QMS/EMS/OHSMS documentation set",
      "Risk and opportunity register",
      "Internal audit program and report",
      "Management review meeting agenda and minutes",
      "Corrective action records and CAPA tracker",
      "Certification body selection and audit coordination",
    ],
    faqs: [
      { q: "How long does ISO certification take?", a: "From documentation to certification typically 3–5 months for a medium-sized organization. Larger organizations or integrated systems may take longer." },
      { q: "Which certification body should we use?", a: "We recommend NABCB-accredited certification bodies. We can help you select a reputed CB based on your industry, budget, and scope." },
      { q: "Is ISO 9001 mandatory?", a: "ISO 9001 itself is not legally mandatory but is often required by customers, government departments, or export buyers as a condition for business." },
      { q: "Can we get ISO 9001 + 14001 + 45001 together?", a: "Yes — this is called an Integrated Management System (IMS) audit. It's more cost-effective and reduces documentation overlap. We recommend it for factories." },
    ],
    relatedSlugs: ["product-certification", "lab-accreditation", "calibration"],
  },

  "calibration": {
    slug: "calibration",
    icon: "⚖️",
    title: "Calibration of Instruments",
    tagline: "Metrological traceability for measuring instruments across all disciplines",
    tag: "Metrology",
    accentFrom: "#E65100",
    accentTo: "#FB8C00",
    stats: [
      { value: "4 Types", label: "Mechanical / Electrical / Thermal / Mass" },
      { value: "NPLI", label: "National Traceability" },
      { value: "Annual", label: "Calibration Cycles" },
      { value: "ISO 9001", label: "Compliant Records" },
    ],
    intro: "Calibration is the process of comparing a measuring instrument against a traceable standard to determine its accuracy. Calibrated instruments produce reliable measurements, which are critical for quality control, product testing, BIS certification, ISO compliance, and regulatory audits.",
    whyNeeded: "ISO 9001, NABL accreditation (ISO 17025), and BIS factory assessments all require that measuring and test equipment used in production and testing be calibrated with valid, traceable calibration certificates. Using uncalibrated instruments leads to non-conformities, test failures, and product quality issues.",
    scope: [
      "Calibration consultancy for manufacturing QC departments",
      "Master equipment list creation and calibration frequency planning",
      "Connecting with NABL-accredited calibration laboratories",
      "Calibration certificate review for traceability and validity",
      "In-house calibration setup for simple instruments",
      "Measurement uncertainty evaluation support",
    ],
    process: [
      { step: "01", title: "Equipment Inventory", desc: "We help create a comprehensive master list of all measuring instruments in your facility — vernier calipers, micrometers, weighing scales, thermometers, pressure gauges, etc." },
      { step: "02", title: "Calibration Plan", desc: "Based on instrument criticality and usage, we define calibration frequencies and tolerance requirements for each instrument." },
      { step: "03", title: "Lab Selection", desc: "We identify and recommend NABL-accredited calibration labs for each instrument type, ensuring traceability to national standards (NPLI)." },
      { step: "04", title: "Calibration Coordination", desc: "We coordinate instrument dispatch, tracking, and receipt of calibration certificates. We maintain a calibration register on your behalf." },
      { step: "05", title: "Certificate Review", desc: "Each certificate is reviewed for validity, uncertainty, traceability statement, and compliance with your acceptable tolerance. Out-of-tolerance instruments are flagged." },
      { step: "06", title: "Records & Compliance", desc: "We maintain calibration records in a format compliant with ISO 9001 and NABL requirements, ready for any audit." },
    ],
    deliverables: [
      "Master Equipment List (MEL) with calibration schedule",
      "Calibration procedure documentation",
      "Calibration register and due-date tracker",
      "Review notes on received calibration certificates",
      "Non-conforming equipment handling procedure",
      "Audit-ready calibration records",
    ],
    faqs: [
      { q: "What is the difference between calibration and verification?", a: "Calibration compares an instrument against a traceable standard and records the deviation. Verification confirms the instrument meets a specific tolerance. Calibration is required by ISO 9001 and NABL." },
      { q: "Does every instrument need to be calibrated?", a: "Only instruments that affect product quality, test results, or compliance need calibration. We help you identify which instruments are 'critical' vs. 'reference' in your facility." },
      { q: "How often should instruments be calibrated?", a: "Calibration intervals depend on instrument type, stability, usage, and regulatory requirements. Typically annual for most instruments, quarterly for critical ones." },
      { q: "What does 'traceable to national standards' mean?", a: "It means the calibration standard used traces back through an unbroken chain to the national measurement standards maintained by NPLI (National Physical Laboratory of India)." },
    ],
    relatedSlugs: ["lab-accreditation", "testing", "management-system"],
  },

  "testing": {
    slug: "testing",
    icon: "🧪",
    title: "Testing of Products",
    tagline: "Product testing consultancy for BIS, export compliance and quality assurance",
    tag: "Testing",
    accentFrom: "#B71C1C",
    accentTo: "#D32F2F",
    stats: [
      { value: "IS / ASTM", label: "Indian & International Codes" },
      { value: "CE / FCC", label: "Export Market Testing" },
      { value: "15–90 Days", label: "Typical Test Duration" },
      { value: "NABL Labs", label: "Empanelled Network" },
    ],
    intro: "Product testing against Indian Standards (IS codes) or international standards is a mandatory prerequisite for BIS certification, export compliance, and quality assurance. We guide manufacturers to the correct accredited laboratories, help prepare test samples, and assist in interpreting test results.",
    whyNeeded: "BIS requires testing at BIS-approved or NABL-accredited labs before granting product certification. Incorrect lab selection, wrong test parameters, or poorly prepared samples result in wasted time and money. Our testing consultancy prevents these costly mistakes.",
    scope: [
      "BIS certification testing for all QCO-covered products",
      "Export compliance testing (CE, FCC, RoHS, REACH)",
      "Type testing for new product development",
      "Failure analysis and root cause investigation",
      "Routine / batch testing for quality control",
      "Government / DGQA testing for defence and public sector procurement",
    ],
    process: [
      { step: "01", title: "Test Parameter Identification", desc: "We study the applicable IS code and identify all mandatory test parameters your product must be tested for before submitting to BIS." },
      { step: "02", title: "Lab Selection", desc: "We identify a BIS-empanelled or NABL-accredited laboratory closest to you, with the right scope for your product's tests." },
      { step: "03", title: "Sample Preparation Guidance", desc: "We provide detailed instructions on how many samples to prepare, marking requirements, and what documentation to send with samples to the lab." },
      { step: "04", title: "Testing Coordination", desc: "We coordinate with the lab on testing timelines, ensure your application is tracked, and follow up on any clarifications the lab may need." },
      { step: "05", title: "Report Review", desc: "Once the test report is received, we review it against BIS requirements. We confirm pass/fail, identify if any retest is needed, and advise next steps." },
      { step: "06", title: "Corrective Action Support", desc: "If your product fails any test parameter, we guide you on what design or process changes are needed to pass in retesting." },
    ],
    deliverables: [
      "Test matrix document (parameters to be tested per IS code)",
      "Lab selection recommendation with accreditation verification",
      "Sample preparation instructions",
      "Test report review and interpretation",
      "Failure analysis report (if product fails any test)",
      "Retest coordination support",
    ],
    faqs: [
      { q: "Can we test at any NABL-accredited lab?", a: "For BIS certification, testing must be at a BIS-empanelled lab specifically, which is a subset of NABL labs. Not all NABL labs are empanelled for all IS codes." },
      { q: "How many samples does BIS require for testing?", a: "The number depends on the IS code and product type. Typically 3–10 samples. We provide the exact quantity required after reviewing your specific IS code." },
      { q: "How long does product testing take?", a: "Most routine IS code tests complete in 15–45 days. Complex tests with conditioning requirements (e.g., weathering, aging) may take 60–90 days." },
      { q: "What if I'm testing for export markets?", a: "Export testing depends on the target market — CE for EU, FCC for USA, UKCA for UK, etc. We guide you to the right testing body and standard for each market." },
    ],
    relatedSlugs: ["product-certification", "calibration", "lab-accreditation"],
  },

  "ce-certification": {
    slug: "ce-certification",
    icon: "🇪🇺",
    title: "CE Certification",
    tagline: "Export to European markets with full CE & UKCA marking compliance",
    tag: "Export",
    accentFrom: "#0D47A1",
    accentTo: "#1976D2",
    stats: [
      { value: "EU / UK", label: "CE & UKCA Markets" },
      { value: "7+ Directives", label: "LVD / EMC / PPE / MDR" },
      { value: "DoC", label: "Declaration of Conformity" },
      { value: "EU AR", label: "Authorized Rep Support" },
    ],
    intro: "The CE marking is a mandatory conformity marking for products sold in the European Economic Area (EEA). It indicates that a product meets EU safety, health, and environmental requirements. CE marking is not optional — products without it cannot legally be placed on the EU market.",
    whyNeeded: "If you manufacture in India and want to export to any EU country (or UK post-Brexit, which requires UKCA marking), your product must carry the CE mark. Without it, your shipment can be detained at customs, returned, or destroyed. European buyers and distributors will not accept products without CE marking.",
    scope: [
      "Electrical and Electronic Equipment (Low Voltage Directive, EMC Directive)",
      "Machinery and Industrial Equipment (Machinery Directive)",
      "Personal Protective Equipment (PPE Regulation)",
      "Toys (Toy Safety Directive)",
      "Construction Products (CPR)",
      "Medical Devices (MDR / IVDR)",
      "UKCA marking for UK market entry",
    ],
    process: [
      { step: "01", title: "Directive Identification", desc: "We identify which EU Directive(s) or Regulation(s) apply to your product. Most products fall under multiple directives simultaneously (e.g., LVD + EMC + RoHS)." },
      { step: "02", title: "Harmonized Standard Selection", desc: "We identify the applicable harmonized European standards (EN standards) for your product. Testing against these standards creates a presumption of conformity." },
      { step: "03", title: "Conformity Assessment", desc: "Depending on the product risk category, conformity can be assessed by self-declaration (manufacturer) or requires a Notified Body (third-party). We guide the correct route." },
      { step: "04", title: "Technical Documentation", desc: "We assist in preparing the Technical File — product description, drawings, test reports, risk assessment, and list of applicable standards." },
      { step: "05", title: "EU Representative Appointment", desc: "Non-EU manufacturers must appoint an Authorized Representative in the EU. We help you identify and appoint a suitable AR service." },
      { step: "06", title: "Declaration of Conformity", desc: "We draft the EU Declaration of Conformity (DoC) which you sign and keep on file. This completes CE marking compliance." },
    ],
    deliverables: [
      "Directive and standard mapping document",
      "Technical File (product documentation dossier)",
      "Risk assessment document",
      "EU Declaration of Conformity (DoC) draft",
      "CE marking label requirements and artwork",
      "EU Authorized Representative appointment support",
    ],
    faqs: [
      { q: "Does CE marking mean the product is certified by European authorities?", a: "No. CE marking is a self-declaration by the manufacturer (or Notified Body for high-risk products) that the product meets EU requirements. It is not a quality mark or third-party certification." },
      { q: "Do we need a Notified Body for CE marking?", a: "Depends on the product category and risk class. For low-risk products (many electrical goods), manufacturers can self-certify. High-risk products like PPE, machinery with safety functions, and medical devices require a Notified Body." },
      { q: "Is CE marking valid for UK market after Brexit?", a: "No. Post-Brexit, UK requires UKCA (UK Conformity Assessed) marking for most products. We provide UKCA support as well." },
      { q: "What is an EU Authorized Representative?", a: "Non-EU manufacturers must designate a company or individual established in the EU to act as their AR. The AR receives complaints, communicates with market surveillance, and holds the technical documentation." },
    ],
    relatedSlugs: ["product-certification", "testing", "management-system"],
  },
};

const ALL_SERVICES = [
  { slug: "product-certification", icon: "🏆", title: "BIS Product Certification", color: "from-sky-600 to-indigo-600" },
  { slug: "lab-accreditation", icon: "🔬", title: "Laboratory Accreditation", color: "from-teal-500 to-emerald-600" },
  { slug: "management-system", icon: "📋", title: "Management System", color: "from-indigo-500 to-violet-600" },
  { slug: "calibration", icon: "⚖️", title: "Calibration", color: "from-amber-500 to-orange-600" },
  { slug: "testing", icon: "🧪", title: "Testing of Products", color: "from-red-500 to-rose-600" },
  { slug: "ce-certification", icon: "🇪🇺", title: "CE Certification", color: "from-blue-500 to-indigo-600" },
];

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const service = SERVICES[slug];
  if (!service) notFound();

  const waLink = `https://wa.me/919009413040?text=Hello%2C%20I%20need%20help%20with%20${encodeURIComponent(service.title)}`;

  return (
    <>
      <SiteNavbar />

      {/* ── HERO ── */}
      <section
        className="pt-[80px] pb-0 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, #0A1628 0%, #0D1F3C 50%, ${service.accentFrom}22 100%)` }}
      >
        {/* Decorative glow */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 60% at 70% 50%, ${service.accentTo}44 0%, transparent 70%)` }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/30 text-xs mb-8 flex-wrap">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-white/70 transition-colors">Services</Link>
            <span>/</span>
            <span className="text-white/60">{service.title}</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-start">
            <div>
              {/* Tag */}
              <div
                className="inline-flex items-center gap-1.5 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
                style={{ background: `linear-gradient(135deg, ${service.accentFrom}, ${service.accentTo})` }}
              >
                <span className="opacity-80">{service.icon}</span>
                {service.tag}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                {service.title}
              </h1>
              <p className="text-white/50 text-base sm:text-lg max-w-2xl leading-relaxed">
                {service.tagline}
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap gap-3 mt-8">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold text-sm rounded-xl transition-all hover:shadow-lg hover:shadow-green-900/40 hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  Get Free Consultation
                </a>
                <a
                  href="tel:+919009413040"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                  </svg>
                  +91 90094 13040
                </a>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5 lg:w-[280px]">
              {service.stats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-4 text-center border border-white/10"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="text-xl font-black text-white mb-0.5">{stat.value}</div>
                  <div className="text-white/40 text-[10px] leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom gradient fade to white */}
        <div className="h-8 bg-gradient-to-b from-transparent to-white" />
      </section>

      {/* ── MAIN BODY ── */}
      <main className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid lg:grid-cols-[1fr_300px] gap-10">

            {/* ── LEFT: Content ── */}
            <div className="space-y-10">

              {/* Overview */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: `linear-gradient(to bottom, ${service.accentFrom}, ${service.accentTo})` }}
                  />
                  <h2 className="text-xl font-black text-zinc-900">What is {service.title}?</h2>
                </div>
                <p className="text-zinc-600 leading-relaxed text-[15px]">{service.intro}</p>
              </section>

              {/* Why Needed */}
              <section
                className="rounded-2xl p-6 border-l-4"
                style={{
                  background: `linear-gradient(135deg, ${service.accentFrom}08, ${service.accentTo}08)`,
                  borderLeftColor: service.accentFrom,
                  borderTopColor: "transparent",
                  borderRightColor: "transparent",
                  borderBottomColor: "transparent",
                }}
              >
                <h2 className="text-sm font-black text-zinc-900 mb-2 flex items-center gap-2">
                  <span>💡</span> Why is This Required?
                </h2>
                <p className="text-zinc-600 text-sm leading-relaxed">{service.whyNeeded}</p>
              </section>

              {/* Scope */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: `linear-gradient(to bottom, ${service.accentFrom}, ${service.accentTo})` }}
                  />
                  <h2 className="text-xl font-black text-zinc-900">Scope of Service</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {service.scope.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `linear-gradient(135deg, ${service.accentFrom}, ${service.accentTo})` }}
                      >
                        <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-zinc-700 text-sm leading-relaxed">{s}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Process */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: `linear-gradient(to bottom, ${service.accentFrom}, ${service.accentTo})` }}
                  />
                  <h2 className="text-xl font-black text-zinc-900">Our Step-by-Step Process</h2>
                </div>
                <div className="space-y-3">
                  {service.process.map((p, i) => (
                    <div
                      key={p.step}
                      className="flex gap-4 p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                        style={{ background: `linear-gradient(135deg, ${service.accentFrom}, ${service.accentTo})` }}
                      >
                        {p.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-zinc-900 text-sm mb-1">{p.title}</div>
                        <div className="text-zinc-500 text-sm leading-relaxed">{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Deliverables */}
              <section
                className="rounded-2xl p-6"
                style={{ background: `linear-gradient(135deg, #0A1628, #0D1F3C)` }}
              >
                <h2 className="text-lg font-black text-white mb-5">What You Get</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {service.deliverables.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `linear-gradient(135deg, ${service.accentFrom}, ${service.accentTo})` }}
                      >
                        <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white/70 text-sm leading-relaxed">{d}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQs */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: `linear-gradient(to bottom, ${service.accentFrom}, ${service.accentTo})` }}
                  />
                  <h2 className="text-xl font-black text-zinc-900">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-3">
                  {service.faqs.map((f, i) => (
                    <div key={i} className="rounded-xl border border-zinc-100 p-5 hover:border-zinc-200 transition-colors">
                      <div className="font-bold text-zinc-900 text-sm mb-2 flex items-start gap-2">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-black flex-shrink-0 mt-0.5"
                          style={{ background: `linear-gradient(135deg, ${service.accentFrom}, ${service.accentTo})` }}
                        >Q</span>
                        {f.q}
                      </div>
                      <div className="text-zinc-500 text-sm leading-relaxed pl-7">{f.a}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── RIGHT: Sidebar ── */}
            <aside className="space-y-4">
              {/* Consultation CTA */}
              <div
                className="rounded-2xl p-6 text-white sticky top-24"
                style={{ background: `linear-gradient(135deg, #0A1628, #0D1F3C, ${service.accentFrom}66)` }}
              >
                <div className="text-4xl mb-3 text-center">{service.icon}</div>
                <h3 className="font-black text-base mb-1 text-center">Get Free Consultation</h3>
                <p className="text-white/40 text-xs mb-5 text-center leading-relaxed">Talk to our experts. No obligation, no cost.</p>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold rounded-xl transition-colors text-sm mb-2.5"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  WhatsApp Us
                </a>
                <a
                  href="tel:+919009413040"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-white/20 hover:border-white/50 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                  </svg>
                  +91 90094 13040
                </a>

                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-base font-black text-white">500+</div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider">Certifications</div>
                    </div>
                    <div>
                      <div className="text-base font-black text-white">10+</div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider">Years Experience</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Services */}
              <div className="rounded-2xl border border-zinc-100 p-4 bg-zinc-50/50">
                <h3 className="font-black text-zinc-900 text-xs uppercase tracking-wider mb-3 px-1">All Our Services</h3>
                <div className="space-y-1">
                  {ALL_SERVICES.map(s => (
                    <Link
                      key={s.slug}
                      href={`/services/${s.slug}`}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        s.slug === service.slug
                          ? "text-white font-bold shadow-sm"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                      style={s.slug === service.slug ? { background: `linear-gradient(135deg, ${service.accentFrom}, ${service.accentTo})` } : {}}
                    >
                      <span className="text-base">{s.icon}</span>
                      <span className="leading-tight">{s.title}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Related */}
              {service.relatedSlugs.length > 0 && (
                <div className="rounded-2xl border border-zinc-100 p-4">
                  <h3 className="font-black text-zinc-900 text-xs uppercase tracking-wider mb-3 px-1">Related Services</h3>
                  <div className="space-y-2">
                    {service.relatedSlugs.map(rs => {
                      const rel = ALL_SERVICES.find(s => s.slug === rs);
                      if (!rel) return null;
                      return (
                        <Link
                          key={rs}
                          href={`/services/${rs}`}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                        >
                          <span>{rel.icon}</span>
                          <span className="text-sm leading-tight">{rel.title}</span>
                          <svg className="w-3 h-3 ml-auto text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>

          </div>
        </div>
      </main>

      <SiteFooter />

      {/* WhatsApp FAB */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 hover:scale-110 transition-transform"
        aria-label="WhatsApp"
      >
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
      </a>

      <QEAssistantTrigger />
    </>
  );
}
