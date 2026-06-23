import { Schema, model, models, type InferSchemaType } from "mongoose";

const ExamSchema = new Schema(
  {
    name: { type: String, default: "" },
    custom: { type: Boolean, default: false },
  },
  { _id: false }
);

const ExamRequestSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    medicalRecordId: { type: Schema.Types.ObjectId, ref: "MedicalRecord", required: true },
    exams: { type: [ExamSchema], default: [] },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ExamRequest = InferSchemaType<typeof ExamRequestSchema>;

export default models.ExamRequest || model("ExamRequest", ExamRequestSchema);

