import { Buffer } from "node:buffer";
import { format } from "date-fns";
import { normalizeText } from "./medical-records";

type PdfFont = 1 | 2;

type PdfImage = {
  data: Buffer;
  width: number;
  height: number;
};

type ClinicInfo = {
  name: string;
  cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
};

type PersonInfo = {
  name: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
};

type DoctorInfo = {
  name: string;
  crm?: string;
  specialty?: string;
};

type PrescriptionMedication = {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  observations: string;
};

type MedicalDocumentPdfInput = {
  type: "prescription" | "certificate" | "examRequest" | "referral";
  title: string;
  issuedAt: string | Date;
  clinic: ClinicInfo;
  patient: PersonInfo;
  doctor: DoctorInfo;
  prescription?: { medications: PrescriptionMedication[] };
  certificate?: { daysOff: number; startDate?: string; cid?: string; observations?: string };
  examRequest?: { exams: string[]; justification?: string; observations?: string };
  referral?: { destination?: string; reason?: string; summary?: string; observations?: string };
  recordSummary?: {
    diagnosis?: string;
    assessment?: string;
    conduct?: string;
    notes?: string;
  };
};

type DrawState = {
  font: PdfFont;
  size: number;
  x: number;
  y: number;
  width: number;
  leading: number;
};

type Page = {
  ops: string[];
  bodyTop: number;
  y: number;
  firstBodyContent: boolean;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 34;
const RIGHT = 34;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;
const HEADER_HEIGHT = 122;
const FOOTER_HEIGHT = 50;
const BODY_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 26;
const BODY_BOTTOM = FOOTER_HEIGHT + 20;

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatDateOnly(value: string | Date | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd/MM/yyyy");
}

function formatDateTimeOnly(value: string | Date | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd/MM/yyyy HH:mm");
}

function isCloudinaryUrl(url: string) {
  return /cloudinary\.com/i.test(url);
}

function transformLogoUrl(url: string) {
  if (!isCloudinaryUrl(url)) return url;
  if (url.includes("/f_jpg") || url.includes("/f_auto")) return url;
  return url.replace("/upload/", "/upload/f_jpg,q_auto,w_240,h_120,c_fit/");
}

function parseJpegSize(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (offset + 1 >= buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2) break;

    const isSofMarker =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb;

    if (isSofMarker && offset + 5 < buffer.length) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return { width, height };
    }

    offset += length;
  }

  return null;
}

async function loadLogoImage(logoUrl?: string): Promise<PdfImage | null> {
  if (!logoUrl) return null;

  try {
    const url = transformLogoUrl(logoUrl);
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("jpeg") && !contentType.includes("jpg")) {
      return null;
    }

    const data = Buffer.from(await response.arrayBuffer());
    const size = parseJpegSize(data);
    if (!size) return null;

    return { data, width: size.width, height: size.height };
  } catch {
    return null;
  }
}

function wrapText(value: string, maxWidth: number, fontSize: number) {
  const text = normalizeText(value);
  if (!text) return [""];

  const approxCharWidth = Math.max(fontSize * 0.52, 4.5);
  const maxChars = Math.max(16, Math.floor(maxWidth / approxCharWidth));
  const words = text.split(/\s+/g);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

class PdfWriter {
  private readonly pages: Page[] = [];
  private currentPage!: Page;
  private readonly logo: PdfImage | null;

  constructor(private readonly input: MedicalDocumentPdfInput, logo: PdfImage | null) {
    this.logo = logo;
    this.startPage();
  }

  private startPage() {
    const page: Page = {
      ops: [],
      bodyTop: BODY_TOP,
      y: BODY_TOP,
      firstBodyContent: true,
    };
    this.pages.push(page);
    this.currentPage = page;
    this.drawPageChrome();
  }

  private current() {
    return this.currentPage;
  }

  private emit(op: string) {
    this.current().ops.push(op);
  }

  private drawText(x: number, y: number, text: string, size = 10, font: PdfFont = 1, options?: { color?: [number, number, number]; align?: "left" | "center" | "right" }) {
    const safe = escapePdfText(normalizeText(text));
    const color = options?.color || [0.11, 0.14, 0.2];
    const commands = [
      "BT",
      `/F${font} ${size} Tf`,
      `${color[0]} ${color[1]} ${color[2]} rg`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${safe}) Tj`,
      "ET",
    ];
    this.emit(commands.join("\n"));
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, gray = 0.82, width = 1) {
    this.emit(`${gray} G\n${width} w\n${x1} ${y1} m\n${x2} ${y2} l\nS`);
  }

  private drawRect(x: number, y: number, width: number, height: number, fill?: [number, number, number], stroke?: [number, number, number], strokeWidth = 1) {
    const cmds = [];
    if (fill) cmds.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
    if (stroke) cmds.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`, `${strokeWidth} w`);
    cmds.push(`${x} ${y} ${width} ${height} re`);
    cmds.push(fill && stroke ? "B" : fill ? "f" : "S");
    this.emit(cmds.join("\n"));
  }

  private drawImage(image: PdfImage, x: number, y: number, width: number, height: number) {
    this.emit(`q\n${width} 0 0 ${height} ${x} ${y} cm\n/Im0 Do\nQ`);
  }

  private availableHeight() {
    return this.current().y - BODY_BOTTOM;
  }

  private ensureSpace(height: number) {
    if (this.availableHeight() < height) {
      this.startPage();
    }
  }

  private consumeSpace(height: number) {
    this.current().y -= height;
  }

  private drawPageChrome() {
    const page = this.current();
    this.drawRect(0, PAGE_HEIGHT - 122, PAGE_WIDTH, 122, [0.96, 0.98, 1], [0.88, 0.92, 0.98], 0.6);
    this.drawLine(LEFT, PAGE_HEIGHT - 122, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 122, 0.82, 0.9);
    this.drawLine(LEFT, FOOTER_HEIGHT + 10, PAGE_WIDTH - RIGHT, FOOTER_HEIGHT + 10, 0.82, 0.9);

    const clinic = this.input.clinic;
    const logoHeight = 48;
    const logoWidth = 48;
    const logoX = LEFT;
    const logoY = PAGE_HEIGHT - 86;

    if (this.logo) {
      const ratio = Math.min(logoWidth / this.logo.width, logoHeight / this.logo.height);
      const w = Math.max(1, this.logo.width * ratio);
      const h = Math.max(1, this.logo.height * ratio);
      this.drawImage(this.logo, logoX, logoY, w, h);
    } else {
      this.drawRect(logoX, logoY, 48, 48, [0.11, 0.45, 0.87], [0.11, 0.45, 0.87], 0.8);
      this.drawText(logoX + 11, logoY + 16, clinic.name.slice(0, 2).toUpperCase(), 16, 2, { color: [1, 1, 1] });
    }

    const textX = LEFT + 62;
    const topY = PAGE_HEIGHT - 43;
    this.drawText(textX, topY, clinic.name || "Clinica", 16, 2, { color: [0.08, 0.22, 0.42] });
    const lines = [
      clinic.cnpj ? `CNPJ: ${clinic.cnpj}` : "",
      [clinic.phone ? `Tel: ${clinic.phone}` : "", clinic.whatsapp ? `WhatsApp: ${clinic.whatsapp}` : ""].filter(Boolean).join("   "),
      [clinic.email ? `E-mail: ${clinic.email}` : "", clinic.address ? `Endereco: ${clinic.address}` : ""].filter(Boolean).join("   "),
    ].filter(Boolean);

    let y = topY - 18;
    for (const line of lines) {
      this.drawText(textX, y, line, 8.7, 1, { color: [0.3, 0.36, 0.45] });
      y -= 12;
    }

    const title = this.input.title.toUpperCase();
    const titleBoxWidth = 186;
    const titleBoxX = PAGE_WIDTH - RIGHT - titleBoxWidth;
    const titleBoxY = PAGE_HEIGHT - 82;
    this.drawRect(titleBoxX, titleBoxY, titleBoxWidth, 46, [0.08, 0.22, 0.42], [0.08, 0.22, 0.42], 0.8);
    this.drawText(titleBoxX + 12, titleBoxY + 17, title, 14, 2, { color: [1, 1, 1] });
    this.drawText(titleBoxX + 12, titleBoxY + 5, `Emissao: ${formatDateTimeOnly(this.input.issuedAt)}`, 8.3, 1, { color: [0.9, 0.95, 1] });

    this.drawText(LEFT, FOOTER_HEIGHT - 6, clinic.name || "Clinica", 8.2, 2, { color: [0.45, 0.5, 0.58] });
    this.drawText(
      PAGE_WIDTH - RIGHT - 160,
      FOOTER_HEIGHT - 6,
      "Documento gerado eletronicamente",
      8.2,
      1,
      { color: [0.45, 0.5, 0.58] }
    );
  }

  private addTitleSection() {
    const height = 52;
    this.ensureSpace(height + 14);
    const y = this.current().y - height;
    this.drawRect(LEFT, y, CONTENT_WIDTH, height, [1, 1, 1], [0.84, 0.88, 0.93], 0.8);
    this.drawText(LEFT + 16, y + 28, this.input.title, 17, 2, { color: [0.08, 0.22, 0.42] });
    this.drawText(LEFT + 16, y + 12, `Emitido em ${formatDateTimeOnly(this.input.issuedAt)}`, 9, 1, { color: [0.41, 0.47, 0.56] });
    this.consumeSpace(height + 14);
  }

  private addInfoGrid() {
    const columns = [
      {
        title: "Paciente",
        lines: [
          this.input.patient.name,
          this.input.patient.cpf ? `CPF: ${this.input.patient.cpf}` : "",
          this.input.patient.birthDate ? `Nascimento: ${formatDateOnly(this.input.patient.birthDate)}` : "",
          this.input.patient.phone ? `Telefone: ${this.input.patient.phone}` : "",
          this.input.patient.email ? `E-mail: ${this.input.patient.email}` : "",
        ].filter(Boolean),
      },
      {
        title: "Medico",
        lines: [
          this.input.doctor.name,
          this.input.doctor.crm ? `CRM: ${this.input.doctor.crm}` : "",
          this.input.doctor.specialty ? `Especialidade: ${this.input.doctor.specialty}` : "",
        ].filter(Boolean),
      },
    ];

    const cardHeight = 76;
    this.ensureSpace(cardHeight + 10);
    const y = this.current().y - cardHeight;
    const gap = 14;
    const cardWidth = (CONTENT_WIDTH - gap) / 2;

    columns.forEach((column, index) => {
      const x = LEFT + index * (cardWidth + gap);
      this.drawRect(x, y, cardWidth, cardHeight, [1, 1, 1], [0.85, 0.88, 0.93], 0.8);
      this.drawText(x + 12, y + cardHeight - 18, column.title, 10.2, 2, { color: [0.08, 0.22, 0.42] });
      let textY = y + cardHeight - 34;
      for (const line of column.lines) {
        this.drawText(x + 12, textY, line, 9.2, 1, { color: [0.2, 0.26, 0.33] });
        textY -= 11;
      }
    });

    this.consumeSpace(cardHeight + 10);
  }

  private addSectionTitle(title: string) {
    const height = 26;
    this.ensureSpace(height + 8);
    const y = this.current().y - height;
    this.drawRect(LEFT, y, CONTENT_WIDTH, height, [0.94, 0.97, 1], [0.82, 0.88, 0.94], 0.7);
    this.drawText(LEFT + 12, y + 8, title, 10.5, 2, { color: [0.08, 0.22, 0.42] });
    this.consumeSpace(height + 8);
  }

  private addParagraph(text: string, size = 10, leading = 14) {
    const lines = wrapText(text, CONTENT_WIDTH, size);
    const height = lines.length * leading + 4;
    this.ensureSpace(height + 4);
    let y = this.current().y - leading;
    for (const line of lines) {
      this.drawText(LEFT, y, line, size, 1, { color: [0.18, 0.22, 0.28] });
      y -= leading;
    }
    this.consumeSpace(height);
  }

  private addBulletList(items: string[], size = 10) {
    const list = items.filter(Boolean);
    if (!list.length) return;
    for (const item of list) {
      const lines = wrapText(item, CONTENT_WIDTH - 16, size);
      const height = lines.length * 13 + 4;
      this.ensureSpace(height + 2);
      let y = this.current().y - 12;
      this.drawText(LEFT + 6, y, "•", size, 2, { color: [0.08, 0.22, 0.42] });
      for (const line of lines) {
        this.drawText(LEFT + 18, y, line, size, 1, { color: [0.18, 0.22, 0.28] });
        y -= 13;
      }
      this.consumeSpace(height);
    }
  }

  private addKeyValueRows(rows: Array<{ label: string; value: string }>) {
    const cleanRows = rows.filter((row) => row.value);
    if (!cleanRows.length) return;

    const rowHeight = 26;
    for (const row of cleanRows) {
      this.ensureSpace(rowHeight + 4);
      const y = this.current().y - rowHeight;
      this.drawRect(LEFT, y, CONTENT_WIDTH, rowHeight, [1, 1, 1], [0.87, 0.9, 0.94], 0.6);
      this.drawText(LEFT + 12, y + 8, `${row.label}:`, 9.2, 2, { color: [0.08, 0.22, 0.42] });
      this.drawText(LEFT + 108, y + 8, row.value, 9.2, 1, { color: [0.18, 0.22, 0.28] });
      this.consumeSpace(rowHeight + 4);
    }
  }

  private addTable(headers: string[], rows: string[][], widths?: number[]) {
    if (!rows.length) return;

    const columns = headers.length;
    const baseWidths = widths && widths.length === columns ? widths : Array.from({ length: columns }, () => CONTENT_WIDTH / columns);
    const headerHeight = 24;
    const minBody = 18;

    const renderHeader = (y: number) => {
      let x = LEFT;
      headers.forEach((header, idx) => {
        const width = baseWidths[idx];
        this.drawRect(x, y, width, headerHeight, [0.08, 0.22, 0.42], [0.08, 0.22, 0.42], 0.6);
        this.drawText(x + 8, y + 8, header, 8.8, 2, { color: [1, 1, 1] });
        x += width;
      });
    };

    renderHeader(this.current().y - headerHeight);
    this.consumeSpace(headerHeight);

    for (const row of rows) {
      const cellLines = row.map((cell, idx) => wrapText(cell || "", baseWidths[idx] - 14, 9));
      const rowHeight = Math.max(...cellLines.map((lines) => lines.length * 12 + 10), minBody);

      if (this.availableHeight() < rowHeight + 8) {
        this.startPage();
        this.addSectionTitle("Continua");
        renderHeader(this.current().y - headerHeight);
        this.consumeSpace(headerHeight);
      }

      const y = this.current().y - rowHeight;
      let x = LEFT;
      row.forEach((cell, idx) => {
        const width = baseWidths[idx];
        this.drawRect(x, y, width, rowHeight, [1, 1, 1], [0.88, 0.9, 0.94], 0.6);
        let textY = y + rowHeight - 14;
        const lines = cellLines[idx];
        for (const line of lines) {
          this.drawText(x + 7, textY, line, 8.9, 1, { color: [0.18, 0.22, 0.28] });
          textY -= 12;
        }
        x += width;
      });
      this.consumeSpace(rowHeight);
    }
  }

  private addSignatureBlock() {
    const height = 92;
    this.ensureSpace(height + 6);
    const y = this.current().y - height;
    this.drawRect(LEFT, y, CONTENT_WIDTH, height, [1, 1, 1], [0.87, 0.9, 0.94], 0.7);
    this.drawLine(LEFT + CONTENT_WIDTH - 250, y + 40, LEFT + CONTENT_WIDTH - 20, y + 40, 0.5, 0.9);
    this.drawText(LEFT + CONTENT_WIDTH - 232, y + 24, "Assinatura do medico", 9.5, 1, { color: [0.2, 0.26, 0.33] });
    this.drawText(LEFT + CONTENT_WIDTH - 232, y + 12, `CRM ${this.input.doctor.crm || "-"}`, 9.2, 2, { color: [0.08, 0.22, 0.42] });

    const leftLines = [
      `Local e data: ${this.input.clinic.address || this.input.clinic.name}, ${formatDateOnly(this.input.issuedAt)}`,
      this.input.doctor.name,
      this.input.doctor.specialty ? this.input.doctor.specialty : "",
    ].filter(Boolean);

    let textY = y + 58;
    for (const line of leftLines) {
      this.drawText(LEFT + 12, textY, line, 9.2, 1, { color: [0.18, 0.22, 0.28] });
      textY -= 12;
    }

    this.consumeSpace(height + 6);
  }

  private renderPrescription() {
    const medications = this.input.prescription?.medications || [];
    this.addSectionTitle("Receita medica");
    this.addParagraph("Medicamentos prescritos conforme orientacao clinica. Administrar conforme orientacao profissional e retornar em caso de duvidas ou reacoes adversas.", 9.6);
    this.addTable(
      ["Medicamento", "Dosagem", "Frequencia", "Duracao", "Observacoes"],
      medications.map((item) => [item.medication, item.dosage, item.frequency, item.duration, item.observations]),
      [150, 85, 95, 70, 115]
    );
  }

  private renderCertificate() {
    const certificate = this.input.certificate || { daysOff: 0 };
    this.addSectionTitle("Atestado medico");
    const body = [
      `Atestamos, para os devidos fins, que ${this.input.patient.name || "o paciente"} foi atendido(a) nesta consulta e necessita de afastamento por ${certificate.daysOff || 0} dia(s).`,
      certificate.startDate ? `Data inicial do afastamento: ${formatDateOnly(certificate.startDate)}.` : "",
      certificate.cid ? `CID informado: ${certificate.cid}.` : "",
      certificate.observations ? `Observacoes: ${certificate.observations}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    this.addParagraph(body, 10);
    this.addKeyValueRows([
      { label: "Paciente", value: this.input.patient.name || "-" },
      { label: "CPF", value: this.input.patient.cpf || "-" },
      { label: "Data de emissao", value: formatDateTimeOnly(this.input.issuedAt) },
    ]);
  }

  private renderExamRequest() {
    const examRequest = this.input.examRequest || { exams: [] };
    this.addSectionTitle("Solicitacao de exames");
    this.addParagraph(
      examRequest.justification || this.input.recordSummary?.assessment || this.input.recordSummary?.diagnosis || "Exames solicitados conforme avaliacao clinica.",
      9.8
    );
    this.addBulletList(examRequest.exams.length ? examRequest.exams : ["Sem exames cadastrados"]);
    if (examRequest.observations) {
      this.addSectionTitle("Observacoes");
      this.addParagraph(examRequest.observations, 9.6);
    }
  }

  private renderReferral() {
    const referral = this.input.referral || {};
    this.addSectionTitle("Encaminhamento");
    this.addKeyValueRows([
      { label: "Destino", value: referral.destination || "-" },
      { label: "Motivo", value: referral.reason || "-" },
    ]);
    this.addSectionTitle("Resumo clinico");
    this.addParagraph(referral.summary || this.input.recordSummary?.diagnosis || this.input.recordSummary?.assessment || "Resumo clinico nao informado.", 9.7);
    if (referral.observations) {
      this.addSectionTitle("Observacoes");
      this.addParagraph(referral.observations, 9.6);
    }
  }

  build() {
    this.addTitleSection();
    this.addInfoGrid();

    switch (this.input.type) {
      case "prescription":
        this.renderPrescription();
        break;
      case "certificate":
        this.renderCertificate();
        break;
      case "examRequest":
        this.renderExamRequest();
        break;
      case "referral":
        this.renderReferral();
        break;
      default:
        break;
    }

    this.addSignatureBlock();
    return this.composePdf();
  }

  private composePdf() {
    const logoNumber = this.logo ? 5 : null;
    const pageStart = this.logo ? 6 : 5;
    const pageCount = this.pages.length;
    const objectBuffers: Buffer[] = [];

    const addStringObject = (number: number, body: string) => {
      objectBuffers.push(Buffer.from(`${number} 0 obj\n${body}\nendobj\n`, "latin1"));
    };

    const addBinaryObject = (number: number, header: string, data: Buffer, footer: string) => {
      const prefix = Buffer.from(`${number} 0 obj\n${header}\nstream\n`, "latin1");
      const suffix = Buffer.from(`\nendstream\nendobj\n`, "latin1");
      objectBuffers.push(Buffer.concat([prefix, data, suffix]));
    };

    addStringObject(1, "<< /Type /Catalog /Pages 2 0 R >>");

    const pageKids = Array.from({ length: pageCount }, (_, index) => `${pageStart + index * 2} 0 R`).join(" ");
    addStringObject(2, `<< /Type /Pages /Kids [ ${pageKids} ] /Count ${pageCount} >>`);

    addStringObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addStringObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    if (this.logo && logoNumber) {
      addBinaryObject(
        logoNumber,
        `<< /Type /XObject /Subtype /Image /Width ${this.logo.width} /Height ${this.logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${this.logo.data.length} >>`,
        this.logo.data,
        ""
      );
    }

    this.pages.forEach((page, index) => {
      const pageNumber = pageStart + index * 2;
      const contentNumber = pageNumber + 1;
      const resources = [`/Font << /F1 3 0 R /F2 4 0 R >>`];
      if (logoNumber) resources.push(`/XObject << /Im0 ${logoNumber} 0 R >>`);

      const pageBody = [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${resources.join(" ")} >> /Contents ${contentNumber} 0 R >>`,
      ].join("\n");
      addStringObject(pageNumber, pageBody);

      const content = page.ops.join("\n");
      addStringObject(contentNumber, `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    });

    const header = Buffer.from("%PDF-1.4\n", "latin1");
    const xrefOffsets: number[] = [0];
    let cursor = header.length;
    for (const object of objectBuffers) {
      xrefOffsets.push(cursor);
      cursor += object.length;
    }

    const xrefLines = [`0000000000 65535 f `];
    for (let i = 1; i < xrefOffsets.length; i += 1) {
      xrefLines.push(`${String(xrefOffsets[i]).padStart(10, "0")} 00000 n `);
    }

    const xref = Buffer.from(`xref\n0 ${xrefOffsets.length}\n${xrefLines.join("\n")}\ntrailer\n<< /Size ${xrefOffsets.length} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF`, "latin1");
    return Buffer.concat([header, ...objectBuffers, xref]);
  }
}

export async function createMedicalDocumentPdf(input: MedicalDocumentPdfInput) {
  const logo = await loadLogoImage(input.clinic.logoUrl);
  const writer = new PdfWriter(input, logo);
  return writer.build();
}

export async function createTextPdf(title: string, blocks: Array<{ label?: string; value?: string; bold?: boolean; blank?: boolean }>) {
  const lines = blocks
    .map((block) => {
      if (block.blank) return "";
      if (block.label && block.value !== undefined) {
        return block.value ? `${block.label}: ${block.value}` : `${block.label}: -`;
      }
      return block.value || "";
    })
    .filter((line) => line !== "");

  return createMedicalDocumentPdf({
    type: "referral",
    title,
    issuedAt: new Date(),
    clinic: { name: "MediClinic" },
    patient: { name: "-" },
    doctor: { name: "-" },
    referral: {
      destination: "-",
      reason: "-",
      summary: lines.join("\n"),
      observations: "",
    },
  });
}

