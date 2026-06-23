import { Schema, model, models, type InferSchemaType } from "mongoose";

const MedicationSchema = new Schema(
  {
    medication: { type: String, default: "" },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "" },
    duration: { type: String, default: "" },
    observations: { type: String, default: "" },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    medicalRecordId: { type: Schema.Types.ObjectId, ref: "MedicalRecord", required: true },
    medications: { type: [MedicationSchema], default: [] },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Prescription = InferSchemaType<typeof PrescriptionSchema>;

export default models.Prescription || model("Prescription", PrescriptionSchema);

