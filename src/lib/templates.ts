// Course templates for common industries and compliance domains.
// Each template appends domain-specific guidance to the base AI prompt,
// ensuring generated courses match professional expectations for that vertical.

export interface CourseTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji for simplicity in the UI
  systemPromptSuffix: string;
  sampleSourceText: string;
}

export const TEMPLATES: CourseTemplate[] = [
  {
    id: "custom",
    name: "Custom (no template)",
    description: "Standard course generation with no vertical-specific guidance.",
    icon: "✨",
    systemPromptSuffix: "",
    sampleSourceText: "",
  },
  {
    id: "aml",
    name: "AML/CFT Training",
    description: "Anti-Money Laundering and Counter-Financing of Terrorism (FATF, Egmont, ECOFEL).",
    icon: "🏦",
    systemPromptSuffix: `
DOMAIN GUIDANCE — AML/CFT COMPLIANCE:
- All content must align with FATF Recommendations. Cite them by number (e.g., "FATF Recommendation 1", "FATF Recommendation 20") where relevant.
- Use correct AML/CFT terminology: ML (Money Laundering), TF (Terrorist Financing), STR (Suspicious Transaction Report), SAR (Suspicious Activity Report), CDD (Customer Due Diligence), EDD (Enhanced Due Diligence), PEP (Politically Exposed Person), NRA (National Risk Assessment), RBA (Risk-Based Approach), FIU (Financial Intelligence Unit).
- Reference the Egmont Group Principles for Information Exchange and the ECOFEL Certification Program (ECP) where relevant.
- Scenarios must be operationally realistic for FIU analysts: reviewing STRs, coordinating with law enforcement, drafting NRA data requests, handling international FIU-to-FIU information exchange.
- Avoid country-specific legal references (e.g., do not cite the US Bank Secrecy Act or EU AMLD) — stick to international frameworks.
- Target audience: FIU analysts, compliance officers, and AML/CFT practitioners.`,
    sampleSourceText: `The Risk-Based Approach (RBA) is the foundational principle of any effective Anti-Money Laundering (AML) and Counter-Financing of Terrorism (CFT) regime. Under FATF Recommendation 1, countries, competent authorities, and financial institutions must identify, assess, and understand the money laundering (ML) and terrorist financing (TF) risks to which they are exposed, and take appropriate measures to mitigate those risks proportionate to the level of risk identified. National Risk Assessments (NRAs) are the primary mechanism through which countries systematically identify and evaluate ML/TF risks at a national level, involving coordinated data collection from a wide range of stakeholders, structured threat and vulnerability analysis, and inter-agency collaboration. Financial Intelligence Units (FIUs) serve as the national center for the receipt and analysis of Suspicious Transaction Reports (STRs), acting as the primary interface between the public and private sectors. Under the Egmont Group Principles for Information Exchange, FIUs are required to cooperate internationally, sharing information securely and respecting principles of confidentiality, reciprocity, and legitimate use.`,
  },
  {
    id: "gdpr",
    name: "GDPR Compliance",
    description: "EU General Data Protection Regulation training for employees and processors.",
    icon: "🇪🇺",
    systemPromptSuffix: `
DOMAIN GUIDANCE — GDPR COMPLIANCE:
- All content must align with the EU General Data Protection Regulation (GDPR, Regulation 2016/679). Cite specific Articles by number where relevant (e.g., "Article 5 — Principles", "Article 6 — Lawfulness of processing", "Article 17 — Right to erasure").
- Use correct GDPR terminology: Personal Data, Data Subject, Data Controller, Data Processor, Data Protection Officer (DPO), Data Protection Impact Assessment (DPIA), Supervisory Authority, Lawful Basis, Special Categories of Personal Data, Cross-Border Transfer, Adequacy Decision, Standard Contractual Clauses (SCCs).
- Reference the six lawful bases for processing, the seven data protection principles, data subject rights (access, rectification, erasure, portability, objection), breach notification requirements (72-hour rule), and international transfer mechanisms.
- Scenarios must be operationally realistic for DPOs, compliance officers, and employees handling personal data: responding to Subject Access Requests, assessing DPIA requirements, handling data breaches, evaluating cross-border transfers.
- Target audience: DPOs, compliance officers, HR professionals, IT teams, and employees handling EU personal data.`,
    sampleSourceText: `The General Data Protection Regulation (GDPR) is the EU's comprehensive data protection law that took effect in May 2018. It applies to any organization processing personal data of individuals located in the EU, regardless of where the organization is based. Under Article 5, GDPR establishes seven core principles: lawfulness, fairness, and transparency; purpose limitation; data minimization; accuracy; storage limitation; integrity and confidentiality; and accountability. Organizations must have a lawful basis for processing personal data under Article 6 — consent, contract, legal obligation, vital interests, public task, or legitimate interests. Data subjects have rights under Articles 15-22, including the right of access (Article 15), rectification (Article 16), erasure or the "right to be forgotten" (Article 17), restriction of processing (Article 18), and data portability (Article 20). Data breaches that risk the rights and freedoms of individuals must be reported to the relevant Supervisory Authority within 72 hours under Article 33. Cross-border transfers of personal data outside the EU require adequate safeguards such as adequacy decisions, Standard Contractual Clauses (SCCs), or Binding Corporate Rules (BCRs).`,
  },
  {
    id: "hipaa",
    name: "HIPAA Training",
    description: "US healthcare privacy and security compliance (HIPAA, HITECH).",
    icon: "🏥",
    systemPromptSuffix: `
DOMAIN GUIDANCE — HIPAA COMPLIANCE:
- All content must align with the US Health Insurance Portability and Accountability Act (HIPAA) of 1996 and the HITECH Act of 2009. Reference the Privacy Rule (45 CFR Part 160 and Subparts A and E of Part 164), the Security Rule (Subpart C), and the Breach Notification Rule.
- Use correct HIPAA terminology: Protected Health Information (PHI), Covered Entity, Business Associate, Business Associate Agreement (BAA), Minimum Necessary Standard, Notice of Privacy Practices, Administrative Safeguards, Physical Safeguards, Technical Safeguards, Breach Notification.
- Reference the 18 HIPAA identifiers, the permitted uses and disclosures of PHI, patient rights (access, amendment, accounting of disclosures), and the breach notification requirements (60-day rule for affected individuals, HHS, and media).
- Scenarios must be operationally realistic for healthcare providers, health plans, clearinghouses, and business associates: handling patient record requests, evaluating breach notification requirements, assessing Business Associate relationships, applying the Minimum Necessary Standard.
- Target audience: healthcare providers, hospital staff, health plan employees, medical billing teams, and business associates.`,
    sampleSourceText: `The Health Insurance Portability and Accountability Act (HIPAA) Privacy Rule establishes national standards for protecting individuals' medical records and other Personal Health Information (PHI). It applies to three types of covered entities: health plans, healthcare clearinghouses, and healthcare providers who conduct certain transactions electronically. PHI includes any information that identifies an individual and relates to their past, present, or future physical or mental health condition, treatment, or payment for care. The Privacy Rule establishes 18 identifiers, including names, dates, addresses, phone numbers, email addresses, Social Security numbers, medical record numbers, and biometric data. Covered entities may use or disclose PHI for treatment, payment, and health care operations (TPO) without authorization. The Minimum Necessary Standard requires covered entities to limit PHI use and disclosure to the minimum necessary to accomplish the intended purpose. The Breach Notification Rule requires covered entities to notify affected individuals, the Secretary of Health and Human Services (HHS), and sometimes the media when a breach of unsecured PHI occurs. Notifications must be made without unreasonable delay and no later than 60 days after discovery.`,
  },
  {
    id: "popia",
    name: "POPIA Compliance",
    description: "South Africa Protection of Personal Information Act training.",
    icon: "🇿🇦",
    systemPromptSuffix: `
DOMAIN GUIDANCE — POPIA COMPLIANCE (SOUTH AFRICA):
- All content must align with the Protection of Personal Information Act 4 of 2013 (POPIA) of South Africa, effective 1 July 2021. Reference specific Sections by number where relevant.
- Use correct POPIA terminology: Data Subject, Responsible Party, Operator, Information Officer, Personal Information, Special Personal Information, Processing, Consent, Data Subject Rights, Information Regulator, PAIA (Promotion of Access to Information Act).
- Reference POPIA's eight conditions for lawful processing: Accountability, Processing Limitation, Purpose Specification, Further Processing Limitation, Information Quality, Openness, Security Safeguards, and Data Subject Participation.
- Reference the Information Regulator of South Africa, data subject rights (access, correction, deletion, objection), prior authorization requirements for certain processing (e.g., credit reporting, unique identifiers), and cross-border transfer restrictions under Section 72.
- Scenarios must be operationally realistic for South African responsible parties and operators: handling PAIA/POPIA requests, responding to complaints, assessing cross-border transfers, managing Information Officer responsibilities.
- Target audience: South African compliance officers, HR professionals, IT teams, and business owners handling personal information.`,
    sampleSourceText: `The Protection of Personal Information Act 4 of 2013 (POPIA) is South Africa's comprehensive data protection law, which came into full effect on 1 July 2021. POPIA aims to give effect to the constitutional right to privacy by safeguarding personal information when processed by public and private bodies. POPIA applies to any Responsible Party (the entity determining the purpose and means of processing) that is domiciled in South Africa, or that processes personal information in South Africa via automated or non-automated means. The Act establishes eight conditions for lawful processing: (1) Accountability, (2) Processing Limitation, (3) Purpose Specification, (4) Further Processing Limitation, (5) Information Quality, (6) Openness, (7) Security Safeguards, and (8) Data Subject Participation. Data subjects have rights to access, correction, and deletion of their personal information, and the right to object to processing. The Information Regulator of South Africa enforces POPIA and may impose administrative fines of up to R10 million or criminal sanctions including imprisonment. Section 72 restricts the transfer of personal information outside South Africa unless the recipient is subject to a law, binding corporate rules, or agreement that provides an adequate level of protection substantially similar to POPIA.`,
  },
  {
    id: "hr-onboarding",
    name: "HR Onboarding",
    description: "New hire orientation and corporate onboarding training.",
    icon: "👥",
    systemPromptSuffix: `
DOMAIN GUIDANCE — HR ONBOARDING:
- All content must reflect best practices in employee onboarding and orientation. Reference company values, culture, policies, and role expectations.
- Use correct HR terminology: Onboarding, Orientation, Probation Period, Performance Review, Code of Conduct, Employee Handbook, Organisational Culture, Learning & Development, Employee Value Proposition (EVP).
- Focus on practical, actionable content: first-week checklists, meet-the-team introductions, IT setup, access provisioning, mandatory compliance training, performance expectations, and 30-60-90 day goals.
- Scenarios must be operationally realistic for new hires and their managers: navigating company systems, asking for help, understanding reporting lines, handling confidential information, escalating issues.
- Tone: welcoming, professional, and supportive. Avoid legal jargon — onboarding is about belonging and productivity, not compliance.
- Target audience: new employees, hiring managers, HR business partners, and onboarding coordinators.`,
    sampleSourceText: `Welcome to your new role! Onboarding is the process of integrating a new employee into the organisation, its culture, and their role. A well-designed onboarding programme typically spans the first 90 days and includes three key phases: pre-boarding (before day one), orientation (first week), and integration (first 30-90 days). Pre-boarding covers administrative tasks like paperwork, IT provisioning, and welcome communications. Orientation introduces new hires to the company's mission, values, structure, and key policies, including the Code of Conduct, Information Security Policy, Health & Safety Policy, and Diversity & Inclusion commitments. Integration focuses on role-specific learning, meeting key stakeholders, understanding performance expectations, and setting 30-60-90 day goals with the manager. Regular check-ins during the first three months help identify early roadblocks and ensure the new hire feels supported. Research shows that employees who experience a structured onboarding programme are 69% more likely to stay with the company for three years.`,
  },
  {
    id: "anti-bribery",
    name: "Anti-Bribery & FCPA",
    description: "Anti-corruption training aligned with the US FCPA and UK Bribery Act.",
    icon: "⚖️",
    systemPromptSuffix: `
DOMAIN GUIDANCE — ANTI-BRIBERY & CORRUPTION:
- All content must align with the US Foreign Corrupt Practices Act (FCPA) of 1977 and the UK Bribery Act 2010. Reference specific provisions where relevant.
- Use correct anti-corruption terminology: Bribery, Kickbacks, Facilitation Payments, Foreign Officials, Third-Party Intermediaries, Red Flags, Due Diligence, Books and Records Provisions, Internal Controls, Adequate Procedures, Gift & Hospitality Policies.
- Reference the FCPA's anti-bribery provisions (15 U.S.C. § 78dd-1 et seq.), accounting provisions, and the UK Bribery Act's four offences (bribing, being bribed, bribing a foreign public official, failure to prevent bribery).
- Include the concept of the "Adequate Procedures" defence (UK Bribery Act) and the FCPA's "reasonable and bona fide expenditure" exception.
- Scenarios must be operationally realistic for employees and compliance officers: evaluating gift and hospitality requests, managing third-party intermediaries, handling facilitation payment requests, identifying red flags in business relationships.
- Target audience: compliance officers, legal teams, sales and business development staff, procurement teams, and employees interacting with government officials.`,
    sampleSourceText: `The US Foreign Corrupt Practices Act (FCPA) of 1977 prohibits the bribery of foreign government officials to obtain or retain business. The FCPA has two main provisions: the anti-bribery provisions, which prohibit corrupt payments to foreign officials, and the accounting provisions, which require companies to maintain accurate books and records and adequate internal accounting controls. The FCPA applies to US companies, foreign companies listed on US stock exchanges, and foreign companies that take any act in furtherance of a bribery scheme while in US territory. Facilitation payments (small payments to low-level officials to expedite routine government actions) are technically permitted under the FCPA but prohibited under the UK Bribery Act 2010. The UK Bribery Act creates four offences: bribing another person, being bribed, bribing a foreign public official, and failure of a commercial organisation to prevent bribery. Companies can defend against the failure-to-prevent offence by demonstrating they had "adequate procedures" in place to prevent bribery. Red flags in third-party relationships include: unusual payment arrangements, missing due diligence documentation, unusually high commissions, payments to offshore accounts, and close relationships with government officials.`,
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity Awareness",
    description: "Employee cybersecurity training covering phishing, passwords, and data protection.",
    icon: "🔐",
    systemPromptSuffix: `
DOMAIN GUIDANCE — CYBERSECURITY AWARENESS:
- All content must align with common cybersecurity frameworks: NIST Cybersecurity Framework, ISO/IEC 27001, CIS Controls, and OWASP Top 10 where relevant.
- Use correct cybersecurity terminology: Phishing, Spear Phishing, Ransomware, Malware, Social Engineering, Multi-Factor Authentication (MFA), Password Manager, VPN, Zero Trust, Incident Response, Data Loss Prevention (DLP), Business Email Compromise (BEC), Man-in-the-Middle (MitM).
- Focus on practical, actionable guidance for non-technical employees: recognising phishing attempts, creating strong passwords, safe browsing habits, protecting mobile devices, reporting incidents, handling sensitive data.
- Scenarios must be operationally realistic for everyday employees: receiving a suspicious email, using public Wi-Fi, being asked for credentials, working from home, handling confidential client information.
- Tone: clear, practical, non-technical. Avoid deep technical jargon unless necessary.
- Target audience: all employees, remote workers, contractors, and executives who need baseline security awareness.`,
    sampleSourceText: `Cybersecurity is everyone's responsibility, not just the IT department's. The most common cyber-attack vector is phishing — fraudulent emails, messages, or websites designed to trick individuals into revealing sensitive information or installing malware. Phishing attempts often use urgency, authority, or fear to pressure the recipient into acting quickly. Common red flags include: unexpected emails, unusual sender addresses, spelling and grammar errors, requests for personal or financial information, links that don't match the visible text, and unexpected attachments. Multi-Factor Authentication (MFA) adds a second layer of security beyond passwords, typically a code sent to your phone or a hardware key. Strong passwords should be at least 12 characters, use a mix of letters, numbers, and symbols, and be unique to each account — a password manager helps manage this. Ransomware is a type of malware that encrypts files and demands payment for their release; the best defence is regular backups, keeping software updated, and never clicking on suspicious links. Employees should immediately report any suspected security incident to the IT or security team — quick reporting often prevents small incidents from becoming major breaches.`,
  },
  {
    id: "osha",
    name: "OSHA Workplace Safety",
    description: "US workplace health and safety training (OSHA-aligned).",
    icon: "🦺",
    systemPromptSuffix: `
DOMAIN GUIDANCE — OSHA WORKPLACE SAFETY:
- All content must align with US OSHA regulations (Occupational Safety and Health Act of 1970, 29 CFR Parts 1900-1999). Reference specific standards where relevant (e.g., 29 CFR 1910 for general industry, 29 CFR 1926 for construction).
- Use correct safety terminology: Hazard, Risk Assessment, Personal Protective Equipment (PPE), Lockout/Tagout (LOTO), Hazard Communication (HazCom), Material Safety Data Sheet (MSDS), Incident Report, Near Miss, Job Safety Analysis (JSA), Emergency Action Plan (EAP).
- Reference employee rights under OSHA: right to a safe workplace, right to receive training, right to report hazards without retaliation, right to review injury records (OSHA 300 logs).
- Scenarios must be operationally realistic for industrial, manufacturing, construction, and warehouse workers: identifying hazards, using PPE correctly, responding to emergencies, reporting near misses, participating in safety committees.
- Tone: direct, practical, safety-first. Use clear and unambiguous language.
- Target audience: frontline workers, supervisors, safety officers, and warehouse/construction/manufacturing personnel.`,
    sampleSourceText: `The Occupational Safety and Health Act of 1970 (OSHA) requires employers to provide a workplace free from recognised hazards that are causing or likely to cause death or serious physical harm. Employers must comply with OSHA standards, provide training in a language and vocabulary employees understand, keep accurate records of injuries and illnesses, and post OSHA citations and injury summaries. Employees have the right to: receive workplace safety training, receive required PPE at no cost, report workplace hazards to OSHA without retaliation, review records of work-related injuries and illnesses, and participate in OSHA inspections. Common workplace hazards include: slips, trips, and falls; electrical hazards; chemical exposures; confined spaces; machine guarding; and ergonomic risks. Personal Protective Equipment (PPE) — including hard hats, safety glasses, gloves, hearing protection, and high-visibility clothing — must be provided by the employer and used by the employee when required. Lockout/Tagout (LOTO) procedures are required for servicing and maintenance of machines to prevent the unexpected release of hazardous energy. Any workplace injury, illness, or near miss should be reported immediately to a supervisor, and an incident report should be completed within 24 hours.`,
  },
  {
    id: "customer-service",
    name: "Customer Service",
    description: "Retail, hospitality, and service industry customer experience training.",
    icon: "💬",
    systemPromptSuffix: `
DOMAIN GUIDANCE — CUSTOMER SERVICE:
- All content must reflect modern customer experience (CX) best practices.
- Use correct service terminology: Customer Journey, Net Promoter Score (NPS), Service Recovery, Active Listening, Empathy, Escalation Path, Voice of Customer (VoC), First Contact Resolution (FCR), Customer Lifetime Value (CLV).
- Focus on practical skills: greeting customers warmly, active listening, handling complaints, de-escalating conflict, building rapport, closing interactions positively.
- Scenarios must be operationally realistic for frontline staff: handling an angry customer, responding to an unreasonable demand, escalating to a manager, dealing with long wait times, recovering after a mistake.
- Tone: empathetic, professional, and empowering. Emphasise that every interaction shapes the customer's perception of the brand.
- Target audience: retail staff, hospitality workers, call centre agents, frontline support teams, and account managers.`,
    sampleSourceText: `Exceptional customer service is the foundation of any successful business. Every customer interaction — whether in person, on the phone, or online — is an opportunity to build loyalty and trust. Research shows that acquiring a new customer can cost 5-7 times more than retaining an existing one, making customer service a critical business investment. The four pillars of great customer service are: (1) Empathy — understanding and validating the customer's feelings, (2) Active Listening — giving full attention, asking clarifying questions, and confirming understanding, (3) Responsiveness — acknowledging concerns quickly and taking ownership of the resolution, and (4) Consistency — delivering the same high standard in every interaction. When a customer complains, service recovery follows the LEARN model: Listen, Empathise, Apologise, Resolve, Notify. Handled well, service recovery can actually strengthen the customer relationship — customers whose complaints are resolved quickly often become more loyal than those who never complained. Escalation should be handled transparently: inform the customer what will happen, who will handle it, and when to expect a response.`,
  },
];

export function getTemplate(id: string | undefined): CourseTemplate {
  if (!id) return TEMPLATES[0];
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
