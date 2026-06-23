import { Schema, model, models, type InferSchemaType } from "mongoose";

const AuditTrailSchema = new Schema(
  {
    action: { type: String, required: true },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    details: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MedicalRecordSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    chiefComplaint: { type: String, default: "" },
    historyOfPresentIllness: { type: String, default: "" },
    medicalHistory: {
      previousDiseases: { type: String, default: "" },
      surgeries: { type: String, default: "" },
      hospitalizations: { type: String, default: "" },
      previousTreatments: { type: String, default: "" },
    },
    allergies: { type: String, default: "" },
    currentMedications: [{ type: String, default: "" }],
    familyHistory: { type: String, default: "" },
    lifestyle: {
      smoker: { type: Boolean, default: false },
      exSmoker: { type: Boolean, default: false },
      alcohol: { type: Boolean, default: false },
      physicalActivity: { type: Boolean, default: false },
      notes: { type: String, default: "" },
    },
    physicalExam: { type: String, default: "" },
    assessment: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    conduct: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["ABERTO", "EM_ATENDIMENTO", "FINALIZADO"], default: "ABERTO" },
    returnDate: { type: String, default: "" },
    returnType: { type: String, default: "" },
    auditTrail: { type: [AuditTrailSchema], default: [] },
  },
  { timestamps: true }
);

export type MedicalRecord = InferSchemaType<typeof MedicalRecordSchema>;

export default models.MedicalRecord || model("MedicalRecord", MedicalRecordSchema);

