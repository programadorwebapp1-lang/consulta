import { Schema, model, models, type InferSchemaType } from "mongoose";

const MedicalCertificateSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    medicalRecordId: { type: Schema.Types.ObjectId, ref: "MedicalRecord", required: true },
    daysOff: { type: Number, default: 0 },
    startDate: { type: String, default: "" },
    cid: { type: String, default: "" },
    observations: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type MedicalCertificate = InferSchemaType<typeof MedicalCertificateSchema>;

export default models.MedicalCertificate || model("MedicalCertificate", MedicalCertificateSchema);

