import { Schema, model, models, type InferSchemaType } from "mongoose";

const ReferralSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    medicalRecordId: { type: Schema.Types.ObjectId, ref: "MedicalRecord", required: true },
    destination: { type: String, default: "" },
    reason: { type: String, default: "" },
    observations: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Referral = InferSchemaType<typeof ReferralSchema>;

export default models.Referral || model("Referral", ReferralSchema);

